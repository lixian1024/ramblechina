# Local guide requests

The header links to `/en/local-guide`. As of D-025, new submissions require sign-in and save to Supabase `ramble_guide_requests`, owned by the authenticated user; My account lists their submissions. No email is sent, guide is matched, booking is made or payment is collected. Requests need manual review. Setup and the outstanding live database gate are in [supabase-accounts.md](./supabase-accounts.md).

## Historical file storage (retained, no longer the production writer)

- Default directory: `.data/guide-requests` under the project root, excluded from Git and outside `public/`.
- For deployment, set `LOCAL_GUIDE_REQUESTS_DIR` to a private directory on a persistent disk. Keep it mounted across releases; a temporary or serverless filesystem is not suitable for this store.
- The application account needs write permission. New directories use mode `0700`, records `0600`.
- Keep historical file access and backups restricted to staff reviewing requests. These files have no public read endpoint; new database requests have an authenticated owner-filtered list API.
- Request IDs prevent duplicate records when a submission is retried. Changed form details receive a new ID.
- A save error returns failure; the browser keeps the entered form values for retry. Do not describe a failed request as received.

## Manual review

On the application server, open the configured directory with a trusted local editor. Each `<UUID>.json` contains the reference, received time, `status: new`, contact email, destinations, dates, party size, guide language, budget and notes. Confirm availability, scope and price with the traveler manually before agreeing to any booking. The user authorized server storage and manual review; this feature does not automatically forward contact details.

The form combines selected city buttons and additional typed places into `destinations`. Guide language is a preference, including an “Other” choice that asks for details in notes. Budget choices are USD per day for the whole group, not per-person prices or confirmed quotes; an empty budget means not decided. Contact consent is checked by default at the product owner's request and can be unchecked; submission still requires it to be checked.

## Verification

`npm run test:guide-requests` checks durable writes, private permissions, receipt consistency, invalid data/date conflicts, malformed or oversized requests, duplicate/concurrent retries and storage failure. It uses synthetic contacts in a temporary directory and removes its own fixtures afterwards.
