import { z } from 'zod';

const temperatureThresholdShape = {
  defrostThreshold: z.number({ error: 'Defrost threshold must be a number' }),
  warningThreshold: z.number({ error: 'Warning threshold must be a number' }),
  criticalThreshold: z.number({ error: 'Critical threshold must be a number' }),
};

function validateThresholdOrder(
  data: { defrostThreshold: number; warningThreshold: number; criticalThreshold: number },
  ctx: z.RefinementCtx
) {
  if (data.defrostThreshold >= data.warningThreshold) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['warningThreshold'],
      message: 'warningThreshold must be greater than defrostThreshold',
    });
  }

  if (data.warningThreshold >= data.criticalThreshold) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['criticalThreshold'],
      message: 'criticalThreshold must be greater than warningThreshold',
    });
  }
}

export const createDeviceSchema = z
  .object({
    code: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    location: z.string().max(150).optional(),
    ...temperatureThresholdShape,
  })
  .superRefine(validateThresholdOrder);

export const updateDeviceSchema = z
  .object({
    code: z.string().min(1).max(50).optional(),
    name: z.string().min(1).max(100).optional(),
    location: z.string().max(150).optional(),
    defrostThreshold: z.number().optional(),
    warningThreshold: z.number().optional(),
    criticalThreshold: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    const keys = ['defrostThreshold', 'warningThreshold', 'criticalThreshold'] as const;

    const allPresent = keys.every(k => data[k] !== undefined);
    if (allPresent) {
      validateThresholdOrder(data as Required<Pick<typeof data, (typeof keys)[number]>>, ctx);
    }
  });

export const searchQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
