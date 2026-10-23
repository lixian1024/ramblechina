import {z} from 'zod';
const uncertainty=z.array(z.string().max(1000)).max(100);
const stop=z.object({name:z.string().max(240),durationMinutes:z.number().min(0).max(1440),uncertainty}).strict();
export const sharedSnapshotSchema=z.object({schemaVersion:z.literal(1),days:z.array(z.object({city:z.string().max(160),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),stops:z.array(stop).max(30),uncertainty}).strict()).min(1).max(10),uncertainty}).strict();
export const publishedShareSchema=z.object({snapshot:sharedSnapshotSchema,publishedAt:z.string().datetime({offset:true})}).strict();
export type SharedSnapshot=z.infer<typeof sharedSnapshotSchema>;
export type PublishedShare=z.infer<typeof publishedShareSchema>;
