import { Router } from 'express';
import { whatsappService } from './whatsapp.service';
import QRCode from 'qrcode';
import { authorize } from '../../middleware/authorize.middleware';
import { AUTHR } from '../constants';

const router = Router();

router.get('/whatsapp/status', authorize(AUTHR.SUPERADMIN), async (_req, res) => {
  const qr = whatsappService.getQr();
  const qrImage = qr ? await QRCode.toDataURL(qr) : null;

  res.render('whatsapp/status', {
    title: 'WhatsApp QR',
    connected: whatsappService.isConnected(),
    qrImage,
    pageScripts: ['/js/whatsapp-status.js'],
  });
});

export default router;
