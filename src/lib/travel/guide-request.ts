import { z } from 'zod';

const date = z.string().refine(value => {
  if (value === '') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Enter a valid date.').default('');
export const guideRequestSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  destinations: z.string().trim().min(1, 'Tell us which cities you are visiting.').max(300),
  startDate: date,
  endDate: date,
  travelers: z.number().int().min(1).max(99),
  guideLanguage: z.string().trim().min(1, 'Tell us your preferred guide language.').max(80),
  budget: z.string().trim().max(150).default(''),
  notes: z.string().trim().max(2000).default(''),
  consent: z.literal(true, { error: 'Please agree to be contacted about this request.' }),
  website: z.string().max(0).default(''),
}).superRefine((value, context) => {
  if (value.endDate && !value.startDate) context.addIssue({ code: 'custom', path: ['startDate'], message: 'Add a start date, or leave both dates blank.' });
  if (value.startDate && value.endDate && value.endDate < value.startDate) context.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be on or after the start date.' });
});

export type GuideRequest = z.infer<typeof guideRequestSchema>;
export type GuideReceipt = { reference: string; receivedAt: string };
