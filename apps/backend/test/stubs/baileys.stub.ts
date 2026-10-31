/**
 * Baileys is an ES module that Jest cannot load, and the end-to-end tests run with WHATSAPP_ENABLED=false, so the
 * socket is never opened. This stub only has to export the names `whatsapp.service.ts` imports.
 */
export default function makeWASocket(): never {
    throw new Error('WhatsApp must stay disabled in the end-to-end tests');
}

export const DisconnectReason = { loggedOut: 401 };
export const fetchLatestBaileysVersion = () => Promise.resolve({ version: [0, 0, 0] });
export const makeCacheableSignalKeyStore = (keys: unknown) => keys;
export const useMultiFileAuthState = () => Promise.resolve({ state: {}, saveCreds: () => Promise.resolve() });
