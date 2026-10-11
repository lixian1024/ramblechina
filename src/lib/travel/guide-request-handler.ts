import { guideRequestSchema, type GuideReceipt, type GuideRequest } from '@/lib/travel/guide-request';
import { GuideRequestConflict } from '@/lib/travel/guide-request-store';
import {sameOrigin} from '@/lib/account/origin';

const headers = { 'Cache-Control': 'private, no-store' };

export async function receiveGuideRequest(request: Request, save: (input: GuideRequest) => Promise<GuideReceipt>) {
  if (!sameOrigin(request)) return Response.json({ error: 'Please submit this form from the Ramble China website.' }, { status: 403, headers });
  if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({ error: 'Invalid request format.' }, { status: 415, headers });
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Missing body');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 12_000) { await reader.cancel(); return Response.json({ error: 'Your request is too long. Please shorten the notes.' }, { status: 413, headers }); }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return Response.json({ error: 'We could not read this request. Please try again.' }, { status: 400, headers }); }
  const result = guideRequestSchema.safeParse(body);
  if (!result.success) return Response.json({ error: 'Please check the highlighted fields.', fields: result.error.flatten().fieldErrors }, { status: 400, headers });
  try { return Response.json(await save(result.data), { status: 201, headers }); }
  catch (error) {
    if (error instanceof GuideRequestConflict) return Response.json({ error: 'The request changed during a retry. Please submit it again.', retryWithNewId: true }, { status: 409, headers });
    return Response.json({ error: 'Your request could not be saved. Your details are still here; please try again.' }, { status: 503, headers });
  }
}

