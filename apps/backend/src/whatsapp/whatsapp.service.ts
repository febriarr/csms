import type { Env } from '@/config/env.validation';
import { Boom } from '@hapi/boom';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    type WASocket,
} from '@whiskeysockets/baileys';
import path from 'node:path';
import { rm } from 'node:fs/promises';
import pino from 'pino';

const RECONNECT_DELAY_MS = 5_000;

const baileysLogger = pino({ level: 'silent' });

export type WhatsappStatus = {
    enabled: boolean;
    connected: boolean;
    /** The raw pairing code while the account is not linked yet; render it as a QR image. */
    qr: string | null;
};

/**
 * The connection to WhatsApp (Baileys). It owns the socket and nothing else: who gets which message is decided
 * elsewhere, and delivery goes through WhatsappSender.
 */
@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(WhatsappService.name);
    private socket: WASocket | null = null;
    private ready = false;
    private latestQr: string | null = null;
    private stopped = false;
    private reconnectTimer: NodeJS.Timeout | null = null;

    constructor(private readonly config: ConfigService<Env, true>) {}

    private get enabled(): boolean {
        return this.config.get('WHATSAPP_ENABLED', { infer: true });
    }

    private get authDir(): string {
        return path.join(process.cwd(), this.config.get('WHATSAPP_AUTH_DIR', { infer: true }));
    }

    onModuleInit(): void {
        if (!this.enabled) {
            this.logger.log('WhatsApp is disabled (WHATSAPP_ENABLED=false)');

            return;
        }

        // not awaited: a slow or failing connection must not keep the API from starting
        void this.connect();
    }

    onModuleDestroy(): void {
        this.stopped = true;

        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        void this.socket?.end(undefined);
    }

    getStatus(): WhatsappStatus {
        return { enabled: this.enabled, connected: this.ready, qr: this.latestQr };
    }

    /** Throws when the socket is not connected, so the dispatcher counts the attempt and retries later. */
    async sendText(jid: string, text: string): Promise<void> {
        if (!this.socket || !this.ready) throw new Error('WhatsApp belum terhubung');

        await this.socket.sendMessage(jid, { text });
    }

    private async connect(): Promise<void> {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
            const { version } = await fetchLatestBaileysVersion();

            const socket = makeWASocket({
                version,
                auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, baileysLogger) },
                logger: baileysLogger,
                printQRInTerminal: false,
            });

            this.socket = socket;
            socket.ev.on('creds.update', () => {
                saveCreds().catch((error: unknown) => {
                    this.logger.error(
                        'Could not save WhatsApp credentials',
                        error instanceof Error ? error.stack : String(error),
                    );
                });
            });

            socket.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) this.latestQr = qr;

                if (connection === 'open') {
                    this.ready = true;
                    this.latestQr = null;
                    this.logger.log('Connected');
                }

                if (connection === 'close') {
                    this.ready = false;
                    // the pairing code of the dead socket is useless; the next socket emits a fresh one
                    this.latestQr = null;

                    const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;

                    if (statusCode === DisconnectReason.loggedOut) {
                        void this.resetAuthAndReconnect();

                        return;
                    }

                    this.logger.warn('Connection closed, reconnecting');
                    this.scheduleReconnect();
                }
            });
        } catch (error) {
            this.logger.error('Could not connect to WhatsApp', error instanceof Error ? error.stack : String(error));
            this.scheduleReconnect();
        }
    }

    /** The phone unlinked this device: the saved session is dead, so drop it and reconnect to get a fresh QR code. */
    private async resetAuthAndReconnect(): Promise<void> {
        const dir = this.authDir;
        const relative = path.relative(process.cwd(), dir);

        // never delete the project root or anything outside it (e.g. an empty WHATSAPP_AUTH_DIR)
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
            this.logger.error(`Logged out, but ${dir} is not a safe folder to delete: remove the session manually`);

            return;
        }

        this.logger.warn(`Logged out: removing ${relative} and requesting a new QR code`);

        try {
            await rm(dir, { recursive: true, force: true });
        } catch (error) {
            this.logger.error(
                'Could not remove the WhatsApp session',
                error instanceof Error ? error.stack : String(error),
            );

            return;
        }

        this.scheduleReconnect();
    }

    /** A pause between attempts: reconnecting in a tight loop while offline would flood the log and the CPU. */
    private scheduleReconnect(): void {
        if (this.stopped || this.reconnectTimer) return;

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.connect();
        }, RECONNECT_DELAY_MS);
    }
}
