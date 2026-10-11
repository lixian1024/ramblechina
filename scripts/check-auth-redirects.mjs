// An invalid, non-user token diagnoses redirect allow-list behavior without sending email.
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!base) throw new Error('Load .env.local with node --env-file=.env.local');
let passed = true;
for (const [label, origin] of [
  ['default', null],
  ['localhost', 'http://localhost:3001'],
  ['local-ip', 'http://127.0.0.1:3001'],
  ['production', 'https://www.ramblechina.com'],
]) {
  const request = new URL('/auth/v1/verify', base);
  request.searchParams.set('type', 'signup');
  request.searchParams.set('token', 'ramble-invalid-diagnostic-token');
  if (origin) request.searchParams.set('redirect_to', `${origin}/auth/callback?next=%2Fen%2Faccount&signup=1`);
  try {
    const response = await fetch(request, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    const location = response.headers.get('location');
    const destination = location ? new URL(location) : null;
    const ok = response.status === 303 && destination?.origin === (origin || 'https://www.ramblechina.com') && (!origin || destination?.pathname === '/auth/callback');
    if (!ok) passed = false;
    console.log(JSON.stringify({ label, status: response.status, redirectOrigin: destination?.origin, redirectPath: destination?.pathname, passed: ok }));
  } catch (error) {
    passed = false;
    console.log(JSON.stringify({ label, passed: false, error: error instanceof Error ? error.message : 'Request failed' }));
  }
}
if (!passed) process.exitCode = 1;
