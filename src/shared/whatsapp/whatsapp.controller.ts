import { Router } from 'express';
import { whatsappService } from './whatsapp.service';
import QRCode from 'qrcode';

const router = Router();

router.get('/whatsapp/status', async (_req, res) => {
  const qr = whatsappService.getQr();
  const qrImage = qr ? await QRCode.toDataURL(qr) : null;

  res.render('whatsapp/status', {
    title: 'WhatsApp QR',
    connected: whatsappService.isConnected(),
    qrImage,
  });
});

export default router;
