# Ramble China: Google login, domains and signup email

Project: `hhjalaigivnepmtmoixs`. Website: `https://www.ramblechina.com`. Local testing: `http://localhost:3001` (the existing `127.0.0.1:3001` also remains supported). Start and finish each flow on the same host/browser so the PKCE cookie remains available. Registering a domain does not deploy this Next.js app or its callback route.

## Confirmed issue on 2026-10-11

An invalid, non-user confirmation token, with redirects disabled, verified these live results without sending email or creating a user:

| Requested callback | Returned origin | Result |
| --- | --- | --- |
| Default | `https://www.chinatravelagent.cc` | Old Site URL still active |
| `http://localhost:3001/auth/callback?...` | `https://www.chinatravelagent.cc` | Localhost callback rejected/fallback |
| `http://127.0.0.1:3001/auth/callback?...` | `http://127.0.0.1:3001` | Allowed |
| `https://www.ramblechina.com/auth/callback?...` | `https://www.chinatravelagent.cc` | New callback rejected/fallback |

Evidence: `output/auth-checks/redirects-before-config.jsonl`. The website already sent the current browser origin; this fallback comes from project configuration. The control panel was signed out, and the suggested Supabase connection was not connected. No project setting was changed.

## 1. Supabase URL Configuration

Open [Authentication → URL Configuration](https://supabase.com/dashboard/project/hhjalaigivnepmtmoixs/auth/url-configuration).

Set Site URL to:

```text
https://www.ramblechina.com
```

Add these Redirect URLs, preserving existing entries needed by other applications:

```text
http://localhost:3001/auth/callback
http://localhost:3001/auth/callback?**
http://127.0.0.1:3001/auth/callback
http://127.0.0.1:3001/auth/callback?**
https://www.ramblechina.com/auth/callback
https://www.ramblechina.com/auth/callback?**
```

The query patterns cover the app's restricted `next` and `signup=1` parameters without opening every production path. Site URL is the fallback; do not switch it to localhost for local testing. If travelagent still shares this project, its login and email flows must pass their own allowed redirect explicitly; changing the shared default can affect flows that omit it. Do not blindly delete travelagent's old whitelist entries.

## 2. Google Auth Platform

Use the **OAuth 2.0 Web application client** whose Client ID is already configured in Supabase → Authentication → Sign In / Providers → Google. Google Maps API Keys are separate credentials.

In Google Cloud → Google Auth Platform → Clients, add Authorized JavaScript origins:

```text
http://localhost:3001
http://127.0.0.1:3001
https://www.ramblechina.com
```

The Authorized redirect URI is the hosted Supabase project's callback, for both local and production website testing:

```text
https://hhjalaigivnepmtmoixs.supabase.co/auth/v1/callback
```

Google returns to Supabase; Supabase returns to the website's `/auth/callback`; the website returns to the requested internal account/plan page. Google redirect URIs must exactly match. Do not substitute the website callback or the self-hosted Supabase local port 54321 when this app uses the hosted project.

In Branding, use Ramble China, update the application homepage to `https://www.ramblechina.com`, and configure authorized domain `ramblechina.com` and actual required published policy URLs. In Audience, if the application is in Testing, the Google account used must be listed as a test user. Production publishing/verification requirements depend on the client scopes and Google review. Keep the existing client ID/secret matched to Supabase; enter secrets only in the provider settings, not a frontend env variable or chat.

## 3. Supabase signup email

Keep Email provider and Confirm email enabled. Under Authentication → Email → Templates (or Email Templates), choose **Confirm sign up**, not Magic link. This app calls `signUp` and verifies a signup OTP.

Subject example: `Your Ramble China verification code`.

Paste the repository's `supabase/templates/confirm-signup.html` into that template. It includes `{{ .Token }}` (the numeric code) and `{{ .ConfirmationURL }}` (the optional same-browser confirmation link). A template that only contains a confirmation link will not show a numeric code. Remove any hand-written links pointing to the old domain or using `.SiteURL` to force all local requests to production. Changing templates/config does not repair already-sent emails; request a new email after the resend wait.

Supabase's default mail sender currently only sends to project organization team-member addresses and is limited to 2 messages/hour. It does not support public-user registration. For real users, configure custom SMTP under Authentication → Email → SMTP Settings / Custom SMTP:

- Host, port, username and password from the selected SMTP provider.
- A sender address on a domain verified with that provider, e.g. `no-reply@ramblechina.com` **only after the provider verifies that domain**.
- Sender name: Ramble China.
- Add the provider's required SPF/DKIM and any required DNS records; disable confirmation-link tracking if the provider rewrites links.
- Keep the secret in Supabase's SMTP configuration. Do not add it to `NEXT_PUBLIC_*` or send it in chat.

The frontend's success response cannot prove delivery. It now requests verification without claiming an email arrived, distinguishes authorization/rate-limit/expired-code errors and waits 60 seconds before resending.

## 4. Find why a particular email is missing

Check Authentication logs around the request time and the mail provider's send/delivery/bounce/suppression logs. Then check the recipient's spam folder. Typical evidence:

- `email_address_not_authorized`: default sender disallows this recipient.
- `over_email_send_rate_limit` / HTTP 429: sending quota or retry interval.
- SMTP rejection / `unexpected_failure`: verify SMTP credentials, sender domain and provider logs.
- Auth request succeeds but no mail: delivery/bounce/spam or an existing confirmed account. Supabase may deliberately return an indistinguishable signup response for an existing account; do not call this confirmed delivery.
- Email contains only a link: add `.Token` to **Confirm sign up**.

Exact missing-email cause remains unverified until SMTP configuration and a real request's logs are available. Do not disable confirmation or use an administrator password to bypass verification.

Follow-up on 2026-10-11: the user confirms custom SMTP is configured with host `smtp.share-email.com`, port `465` and sender `service@ramblechina.com`. Treat this as user-reported setup, not evidence of successful authentication or delivery; do not assume the default sender restrictions caused this incident. Saved/enabled status, SMTP credentials and actual Auth/mail delivery logs remain unverified. No provider-specific port requirement was established from an authoritative source. A repeated live redirect probe still returned the old Site URL for default, localhost and production; the IP callback remains accepted. No project configuration or test email was changed/sent in this follow-up.

The current dashboard exposes Auth service events under [project Logs](https://supabase.com/dashboard/project/hhjalaigivnepmtmoixs/logs), not necessarily in Authentication's menu. Set Time Range around a recent signup/resend, explicitly select Log Type **Auth**, then inspect the matching `/signup` or `/resend` row and its Raw JSON. Start with all levels; use Error if too many results. Do not select only API Gateway → Auth: that shows gateway requests rather than Auth service errors. Search event messages for `smtp`, `gomail` or the reported error if helpful. Hide addresses, IPs, tokens and other personal data before sharing an error. An empty result does not prove success; check retention/time range and provider delivery logs. See [Logs in Studio](https://supabase.com/docs/guides/observability/logs).

2026-10-11 incident follow-up: the user now reports `Error sending confirmation email` during signup. The signup client calls Supabase Auth directly; the local Next.js server cannot expose the private Auth/SMTP root error. A credential-free local probe of smtp.share-email.com:465 verified TLSv1.3 and the server certificate, received SMTP220 and AUTH LOGIN/PLAIN capabilities, then quit without login or sending a message. Public DNS returned MX `5 mail.emaildee.com.` and SPF `v=spf1 include:spf.emaildee.com ~all`. Evidence: output/auth-checks/smtp-public-check.json. This does not prove Supabase's SMTP connectivity, correct credentials/from permissions, existence of service@ramblechina.com, DKIM or successful delivery. Do not blindly switch to 587 or conclude that public DNS is the cause. Inspect the exact Auth error and saved SMTP settings/template, or have the user supply a redacted error. Confirm the sender mailbox/authorized From with the mail provider. No signup was replayed, mailbox logged into, credentials read or settings changed.

## 5. Verify after saving configuration

```sh
NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://127.0.0.1:7897 node --env-file=.env.local scripts/check-auth-redirects.mjs
npm run test:accounts
```

The redirect diagnostic must show four `passed:true` results. It does not verify a real user or mail delivery. Then start at `http://localhost:3001/en/login`, have the user complete Google login or registration/OTP/password entry in the browser, and verify landing in `/en/account` or the chosen `/en/plan`. Repeat on the deployed HTTPS www domain; check profile/trip/guide saves separately. No real signup email was sent during this diagnosis.

After the user reported saving Supabase URL Configuration and Google Clients settings on 2026-10-11, live probes returned four `passed:true` results: default now uses www.ramblechina.com; localhost/IP/production preserve their requested callback hosts and paths. A public Google authorize request returned HTTP302 to accounts.google.com with redirect_uri=https://hhjalaigivnepmtmoixs.supabase.co/auth/v1/callback and no error parameter. Evidence: output/auth-checks/redirects-after-config.json. This confirms the observed old-domain fallback is resolved and the provider entry targets the right project. It does not verify Google's acceptance after account selection, a successful code exchange/session, production deployment, SMTP delivery or account data saves.

Sources checked 2026-10-11: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Google through Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [email template variables](https://supabase.com/docs/guides/auth/auth-email-templates), [Google OAuth Web flow](https://developers.google.com/identity/protocols/oauth2/web-server).


2026-10-11 exact Auth error follow-up: the user supplied redacted `/signup` error `535 "Authentication Failed"`, with `error_code: unexpected_failure`. SMTP rejected the AUTH step; mail delivery has not started. [RFC 4954 section 6](https://www.rfc-editor.org/rfc/rfc4954.html#section-6) defines 535 as invalid or insufficient authentication credentials. This establishes the failure stage, not which credential or account policy is wrong. In Supabase SMTP Settings, verify Username is the provider's actual SMTP account (often the full mailbox address); Sender email is a separate field. Enter the correct SMTP password or provider-required app password/authentication code directly in Supabase, and verify that the account exists and permits SMTP access. Keep the reported host/465 while correcting authentication; changing Google credentials, callback URLs, frontend env variables or confirmation templates does not repair SMTP AUTH. Save, wait at least 60 seconds, and retry signup; if 535 persists, inspect the provider's authentication logs/account policy. No credentials were read or changed and no email was sent by this diagnostic. Corrected configuration, SMTP success and actual delivery remain unverified.


2026-10-11 after-password authenticated dashboard review: the user reports replacing the SMTP password, after which signup no longer errors but the code is still missing. Read-only inspection confirms custom SMTP enabled, smtp.share-email.com:465, minimum interval 60 seconds, and stored password hidden (not read). Confirm sign up subject is `your verification code`; body contains `{{ .Token }}` and legacy china travel agent branding, so missing numeric-token markup is not this incident's cause. Latest /signup at 19:54:35 Asia/Shanghai is status 200 with user_confirmation_requested; preceding 19:54:28 is also 200. Corresponding new unconfirmed account has confirmation_sent_at 2026-10-11 11:54:35.089656+00 and no confirmed timestamp. Evidence: output/auth-checks/smtp-dashboard-after-password.json, redacted to omit recipient/user/IP identifiers. Supabase recorded sending; inbox delivery remains unverified. The next required evidence is the SMTP provider's send/delivery/bounce/suppression record around 19:54 local (11:54 UTC), and recipient spam/quarantine status. Do not infer a DNS failure, clear users, disable confirmation, or send repeated codes from HTTP 200 alone. No account/settings were changed, credential revealed or test email sent during this review. The legacy template branding can be updated separately after checking the shared-project impact; it does not explain missing delivery. See [Supabase delivery troubleshooting](https://supabase.com/docs/guides/troubleshooting/not-receiving-auth-emails-from-the-supabase-project-OFSNzw).


2026-10-11 receipt follow-up: user found the verification email in the spam folder. This confirms that particular message arrived; OTP verification/login and general inbox placement remain unverified. Fresh public DNS shows SPF `v=spf1 include:spf.emaildee.com ~all`; `_dmarc.ramblechina.com` TXT query is NOERROR with zero answers. DKIM requires the provider's actual selector or received signature and has not been verified. Evidence output/auth-checks/signup-spam-delivery.json. Priorities: check received Authentication-Results for SPF/DKIM/DMARC passing and From alignment; enable provider DKIM and publish its exact supplied record; add DMARC initially with p=none while checking legitimate sending sources (do not duplicate SPF records); use consistent Ramble China sender/template branding and focused OTP-only content. A p=none policy or template rewrite alone cannot guarantee inbox delivery or explain the filter decision. If authenticated messages still go to spam across providers, review actual outbound IP/domain reputation and provider logs before considering a dedicated transactional mail service. No DNS or external settings changed. References: Supabase custom SMTP additional best practices and Google email sender guidelines.
