import { randomUUID } from 'node:crypto';
import { link, mkdir, open, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { guideRequestSchema, type GuideReceipt, type GuideRequest } from './guide-request';

export class GuideRequestConflict extends Error {}
export function guideRequestDirectory() {
  return process.env.LOCAL_GUIDE_REQUESTS_DIR?.trim() || path.join(process.cwd(), '.data', 'guide-requests');
}

// Publish only fully written files. Retries with the same submission ID reuse its receipt.
export async function saveGuideRequest(input: GuideRequest, directory = guideRequestDirectory()): Promise<GuideReceipt> {
  const request = guideRequestSchema.parse(input);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const reference = `RG-${request.requestId}`;
  const receivedAt = new Date().toISOString();
  const record = { reference, receivedAt, status: 'new', request };
  const destination = path.join(directory, `${request.requestId}.json`);
  const temporary = path.join(directory, `.${randomUUID()}.tmp`);
  try {
    const file = await open(temporary, 'wx', 0o600);
    try { await file.writeFile(JSON.stringify(record, null, 2)); await file.sync(); }
    finally { await file.close(); }
    try { await link(temporary, destination); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = JSON.parse(await readFile(destination, 'utf8')) as typeof record;
      if (JSON.stringify(existing.request) !== JSON.stringify(request)) throw new GuideRequestConflict();
      return { reference: existing.reference, receivedAt: existing.receivedAt };
    }
    return { reference, receivedAt };
  } finally { await unlink(temporary).catch(() => undefined); }
}
