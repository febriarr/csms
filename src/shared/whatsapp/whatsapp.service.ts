import makeWASocket, {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';

const baileysLogger = pino({ level: 'silent' });

class WhatsAppService {
  private socket: WASocket | null = null;
  private isReady = false;
  private latestQr: string | null = null;

  async connect() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(process.cwd(), '.baileys_auth'));
    const { version } = await fetchLatestBaileysVersion();

    this.socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      logger: baileysLogger,
      printQRInTerminal: false,
    });

    this.socket.ev.on('creds.update', saveCreds);

    this.socket.ev.on('connection.update', update => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) this.latestQr = qr;

      if (connection === 'open') {
        this.isReady = true;
        this.latestQr = null;
        console.log('[WhatsApp] Connected');
      }

      if (connection === 'close') {
        this.isReady = false;
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log('[WhatsApp] Connection closed. Reconnect:', shouldReconnect);
        if (shouldReconnect) this.connect();
        else console.log('[WhatsApp] logged out, hapus .baileys_auth lalu scan ulang');
      }
    });
  }

  getQr() {
    return this.latestQr;
  }

  isConnected() {
    return this.isReady;
  }

  async sendMessage(jid: string, text: string) {
    if (!this.socket || !this.isReady) {
      throw new Error('WhatsApp socket belum siap');
    }
    await this.socket.sendMessage(jid, { text });
  }
}

export const whatsappService = new WhatsAppService();
