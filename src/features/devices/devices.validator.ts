import { z } from 'zod';

const temperatureThresholdShape = {
  normalMinTemperature: z.number({ error: 'Normal min temperature must be a number' }),
  normalMaxTemperature: z.number({ error: 'Normal max temperature must be a number' }),
  defrostMinTemperature: z.number({ error: 'Defrost min temperature must be a number' }),
  defrostMaxTemperature: z.number({ error: 'Defrost max temperature must be a number' }),
  warningMinTemperature: z.number({ error: 'Warning min temperature must be a number' }),
  warningMaxTemperature: z.number({ error: 'Warning max temperature must be a number' }),
  criticalMinTemperature: z.number({ error: 'Critical min temperature must be a number' }),
};

function validateThresholdOrder(
  data: {
    normalMinTemperature: number;
    normalMaxTemperature: number;
    defrostMinTemperature: number;
    defrostMaxTemperature: number;
    warningMinTemperature: number;
    warningMaxTemperature: number;
    criticalMinTemperature: number;
  },
  ctx: z.RefinementCtx
) {
  const pairs: Array<[keyof typeof data, keyof typeof data]> = [
    ['normalMinTemperature', 'normalMaxTemperature'],
    ['defrostMinTemperature', 'defrostMaxTemperature'],
    ['warningMinTemperature', 'warningMaxTemperature'],
  ];

  for (const [minKey, maxKey] of pairs) {
    if (data[minKey] >= data[maxKey]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [maxKey],
        message: `${maxKey} must be greater than ${minKey}`,
      });
    }
  }

  const sequence: Array<[keyof typeof data, keyof typeof data]> = [
    ['normalMaxTemperature', 'defrostMinTemperature'],
    ['defrostMaxTemperature', 'warningMinTemperature'],
    ['warningMaxTemperature', 'criticalMinTemperature'],
  ];

  for (const [prevMax, nextMin] of sequence) {
    if (data[prevMax] > data[nextMin]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [nextMin],
        message: `${nextMin} must be greater than or equal to ${prevMax} (ranges must not overlap)`,
      });
    }
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
    normalMinTemperature: z.number().optional(),
    normalMaxTemperature: z.number().optional(),
    defrostMinTemperature: z.number().optional(),
    defrostMaxTemperature: z.number().optional(),
    warningMinTemperature: z.number().optional(),
    warningMaxTemperature: z.number().optional(),
    criticalMinTemperature: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    const keys = [
      'normalMinTemperature',
      'normalMaxTemperature',
      'defrostMinTemperature',
      'defrostMaxTemperature',
      'warningMinTemperature',
      'warningMaxTemperature',
      'criticalMinTemperature',
    ] as const;

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
