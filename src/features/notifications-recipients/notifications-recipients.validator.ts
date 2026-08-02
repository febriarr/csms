import z from 'zod';

const whatsappRegex = /^62\d{8,15}$/;

const notificationRecipientsObjectSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).max(100, { message: 'Name must be at most 100 characters' }),

  channel: z.enum(['email', 'whatsapp'], {
    message: 'Invalid notification channel',
  }),

  target: z
    .string()
    .min(1, { message: 'Target is required' })
    .max(150, { message: 'Target must be at most 150 characters' }),

  isActive: z.boolean().optional(),
});

export const notificationRecipientsSchema = notificationRecipientsObjectSchema.superRefine(
  ({ channel, target }, ctx) => {
    if (channel === 'email') {
      if (!z.string().email().safeParse(target).success) {
        ctx.addIssue({
          code: 'custom',
          path: ['target'],
          message: 'Target must be a valid email address',
        });
      }
    }

    if (channel === 'whatsapp') {
      if (!whatsappRegex.test(target)) {
        ctx.addIssue({
          code: 'custom',
          path: ['target'],
          message: 'Target must be a valid WhatsApp number (e.g. 628123456789)',
        });
      }
    }
  }
);

export const notificationRecipientsUpdateSchema = notificationRecipientsObjectSchema
  .partial()
  .superRefine(({ channel, target }, ctx) => {
    // Field boleh tidak dikirim saat update
    if (channel == null || target == null) {
      return;
    }

    if (channel === 'email') {
      if (!z.string().email().safeParse(target).success) {
        ctx.addIssue({
          code: 'custom',
          path: ['target'],
          message: 'Target must be a valid email address',
        });
      }
    }

    if (channel === 'whatsapp') {
      if (!whatsappRegex.test(target)) {
        ctx.addIssue({
          code: 'custom',
          path: ['target'],
          message: 'Target must be a valid WhatsApp number (e.g. 628123456789)',
        });
      }
    }
  });

export const notificationRecipientsQuerySchema = z.object({
  name: z.string().optional(),
  channel: z.enum(['email', 'whatsapp']).optional(),
});

export type NotificationRecipientsInput = z.infer<typeof notificationRecipientsSchema>;

export type NotificationRecipientsUpdateInput = z.infer<typeof notificationRecipientsUpdateSchema>;

export type NotificationsRecipientsQuery = z.infer<typeof notificationRecipientsQuerySchema>;
