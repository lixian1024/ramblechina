import { safeDestination } from './navigation';

/** Keep PKCE cookies on the host where login started. Supabase must allow this URL. */
export function authCallbackUrl(origin: string, next: string, signup = false) {
  const site = new URL(origin);
  const local = site.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(site.hostname);
  if ((!local && site.origin !== 'https://www.ramblechina.com') || site.username || site.password || site.pathname !== '/' || site.search || site.hash) {
    throw new Error('Please sign in at www.ramblechina.com or your local development site.');
  }
  const callback = new URL('/auth/callback', site.origin);
  callback.searchParams.set('next', safeDestination(next));
  if (signup) callback.searchParams.set('signup', '1');
  return callback.href;
}

export function authErrorMessage(cause: unknown) {
  const error = cause as { code?: string; message?: string } | null;
  switch (error?.code) {
    case 'email_address_not_authorized':
      return 'Email registration is temporarily unavailable for this address. Try Google sign-in or contact support.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many verification requests. Please wait before trying again, or sign in with Google.';
    case 'email_send_failed':
    case 'unexpected_failure':
      return 'The account service could not complete this request. Please retry or contact support.';
    case 'otp_expired':
      return 'This verification code has expired or is invalid. Request a new code and use the latest email.';
    default:
      return error?.message || 'Account services could not be reached. Please retry.';
  }
}
