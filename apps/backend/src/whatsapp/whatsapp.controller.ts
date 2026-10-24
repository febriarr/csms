import { Controller, Get } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { toDataURL } from 'qrcode';
import { WhatsappService } from './whatsapp.service';

export type WhatsappStatusResponse = {
    enabled: boolean;
    connected: boolean;
    /** A data URL of the pairing QR code, present only while the account is not linked. */
    qrImage: string | null;
};

@Controller('whatsapp')
@Roles(['super_admin'])
export class WhatsappController {
    constructor(private readonly whatsapp: WhatsappService) {}

    @Get('status')
    async status(): Promise<WhatsappStatusResponse> {
        const { enabled, connected, qr } = this.whatsapp.getStatus();

        return { enabled, connected, qrImage: qr ? await toDataURL(qr) : null };
    }
}
