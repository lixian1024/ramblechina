import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { authCallbackUrl, authErrorMessage } from '../src/lib/account/auth-flow';

async function main() {
  for (const origin of ['http://localhost:3001', 'http://127.0.0.1:3001', 'https://www.ramblechina.com']) {
    const captured: { url: URL; body: Record<string, unknown> }[] = [];
    const client = createClient('https://auth-fixture.test', 'controlled-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce' },
      global: { fetch: async (input, init) => {
        captured.push({ url: new URL(String(input)), body: JSON.parse(String(init?.body || '{}')) });
        return Response.json({ id: 'controlled-user', email: 'qa@example.invalid', identities: [] });
      } },
    });
    const next = '/en/plan?trip=controlled-return';
    const callback = authCallbackUrl(origin, next, true);
    const signup = await client.auth.signUp({ email: 'qa@example.invalid', password: 'controlled-password', options: { emailRedirectTo: callback } });
    assert.equal(signup.error, null);
    const resend = await client.auth.resend({ type: 'signup', email: 'qa@example.invalid', options: { emailRedirectTo: callback } });
    assert.equal(resend.error, null);
    assert.deepEqual(captured.map(item => item.url.pathname), ['/auth/v1/signup', '/auth/v1/resend']);
    for (const item of captured) {
      const target = new URL(item.url.searchParams.get('redirect_to')!);
      assert.equal(target.origin, origin, 'Do not switch hosts and lose the PKCE cookie');
      assert.equal(target.pathname, '/auth/callback');
      assert.equal(target.searchParams.get('next'), next);
      assert.equal(target.searchParams.get('signup'), '1');
    }
    assert.equal(captured[0].body.code_challenge_method, 's256');
    const oauth = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: authCallbackUrl(origin, next), skipBrowserRedirect: true } });
    assert.equal(oauth.error, null);
    const authorize = new URL(oauth.data.url!);
    assert.equal(authorize.searchParams.get('redirect_to'), authCallbackUrl(origin, next));
    assert.equal(authorize.searchParams.get('code_challenge_method'), 's256');
    assert(!new URL(authorize.searchParams.get('redirect_to')!).searchParams.has('signup'));
  }
  for (const origin of ['https://www.chinatravelagent.cc', 'https://www.ramblechina.com.evil.test', 'https://user:secret@www.ramblechina.com', 'http://www.ramblechina.com']) {
    assert.throws(() => authCallbackUrl(origin, '/en/account'));
  }
  assert.equal(new URL(authCallbackUrl('http://localhost:3001', '//evil.test')).searchParams.get('next'), '/en/account');
  assert.match(authErrorMessage({ code: 'over_email_send_rate_limit' }), /wait/);
  assert.match(authErrorMessage({ code: 'email_address_not_authorized' }), /temporarily unavailable/);
  assert.match(authErrorMessage({ code: 'otp_expired' }), /latest email/);
  console.log('PASS: real Supabase SDK signup/resend/OAuth payloads preserve localhost/IP/production callbacks, PKCE, protected return paths, old-host rejection and actionable email errors. Controlled transport does not verify live delivery.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
