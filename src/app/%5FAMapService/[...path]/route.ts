export const runtime = 'nodejs';

// AMap JS API 2.0 sends its security checks through serviceHost. Keep the
// security code on the server; the browser receives only the domain-bound JS key.
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const secret = process.env.AMAP_JS_API_SECRET?.trim();
  if (!secret) return new Response('Amap JS security code is not configured.', { status: 503 });
  const segments = (await params).path;
  if (!segments?.length || segments.some(segment => !/^[A-Za-z0-9._-]+$/.test(segment) || segment === '..')) {
    return new Response('Invalid Amap service path.', { status: 400 });
  }
  const path = segments.join('/');
  if (!/^(?:v3|v4|v5)\//.test(path)) return new Response('Unsupported Amap service path.', { status: 404 });
  const upstream = new URL(`https://${path.startsWith('v4/map/styles') ? 'webapi.amap.com' : 'restapi.amap.com'}/${path}`);
  const query = new URL(request.url).searchParams;
  query.forEach((value, name) => { if (name !== 'jscode') upstream.searchParams.append(name, value); });
  upstream.searchParams.set('jscode', secret);
  try {
    const response = await fetch(upstream, { cache: 'no-store', signal: AbortSignal.timeout(12_000) });
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'private, max-age=60',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch { return new Response('Amap service temporarily unavailable.', { status: 502 }); }
}
