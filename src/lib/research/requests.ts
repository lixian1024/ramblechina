import {z} from 'zod';
import {sameOrigin} from '@/lib/account/origin';

export const researchRequestSchema = z.object({
  requestId: z.string().uuid(),
  email: z.string().trim().email().max(254),
  destination: z.string().trim().min(1).max(200),
  travelWindow: z.string().trim().max(200).default(''),
  question: z.string().trim().min(1).max(2000),
  language: z.enum(['en','zh']),
  consent: z.literal(true),
  website: z.string().max(0).default(''),
}).strict();
export type ResearchRequest = z.infer<typeof researchRequestSchema>;
export type ResearchReceipt = {status: 'created'|'duplicate'|'conflict'|'rate_limited'; requestId: string};
const headers = {'Cache-Control': 'private, no-store'};
const messages = {
  en: {origin: 'Please submit this request from the Ramble China website.', format: 'Invalid request format.',
    size: 'Please shorten your request.', unreadable: 'We could not read this request. Please try again.',
    fields: 'Please check the required fields and consent to contact.', conflict: 'This request changed during a retry. Please submit it again.',
    limited: 'Too many requests today. Please try another day.', storage: 'Your request could not be saved. Your details are still here; please try again.'},
  zh: {origin: '请从 Ramble China 网站提交申请。', format: '申请格式有误。', size: '申请内容过长，请精简后重试。',
    unreadable: '无法读取申请，请重试。', fields: '请检查必填内容，并同意我们就此申请联系你。',
    conflict: '重试期间申请内容发生变化，请重新提交。', limited: '今天提交次数已达上限，请改日重试。', storage: '申请暂未保存，已填写的内容仍在，请重试。'},
};

export async function receiveResearchRequest(request: Request, save: (input: ResearchRequest) => Promise<ResearchReceipt>): Promise<Response> {
  const locale = request.headers.get('accept-language')?.startsWith('zh') ? 'zh' : 'en';
  let text = messages[locale];
  const error = (message: string, status: number, extra: Record<string,unknown> = {}) => Response.json({error: message, ...extra}, {status, headers});
  if (!sameOrigin(request)) return error(text.origin, 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return error(text.format, 415);
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return error(text.unreadable, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const {value, done} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 12_000) {await reader.cancel(); return error(text.size, 413);}
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {return error(text.unreadable, 400);}
  if (body && typeof body === 'object' && 'language' in body && body.language === 'zh') text = messages.zh;
  const parsed = researchRequestSchema.safeParse(body);
  if (!parsed.success) return error(text.fields, 400);
  try {
    const receipt = await save(parsed.data);
    if (receipt.status === 'conflict') return error(text.conflict, 409, {retryWithNewId: true});
    if (receipt.status === 'rate_limited') return error(text.limited, 429);
    if (!['created','duplicate'].includes(receipt.status) || receipt.requestId !== parsed.data.requestId) return error(text.storage, 503);
    return Response.json({requestId: receipt.requestId}, {status: receipt.status === 'created' ? 201 : 200, headers});
  } catch {return error(text.storage, 503);}
}
