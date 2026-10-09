# Estimate-form human verification

The public estimate endpoint now verifies Cloudflare Turnstile before writing
rate counters, leads, customers, or activity records. Name, phone, project type,
and project address are required on the server. The browser loads the public
widget key through `GET /api/public/lead-intake` and sends its token with the form.

## Configure real credentials before deployment

1. In [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile),
   create a **Managed** widget for Golden Brick. Add the hostnames actually used
   by the website: `goldenbrickc.com`, `www.goldenbrickc.com`,
   `golden-brick-construction.web.app`, and
   `golden-brick-construction.firebaseapp.com`. Keep the widget hostname list
   and the server allowlist consistent. Turnstile does not require moving DNS.
2. Add the public settings to the existing ignored local file
   `functions/.env.golden-brick-construction`, preserving its other entries:

   ```dotenv
   TURNSTILE_SITE_KEY=YOUR_REAL_WIDGET_SITE_KEY
   TURNSTILE_ALLOWED_HOSTNAMES=goldenbrickc.com,www.goldenbrickc.com,golden-brick-construction.web.app,golden-brick-construction.firebaseapp.com
   ```

3. The Firebase credentials stored on this machine were expired during the
   October 9, 2026 implementation check. Authenticate in your own browser:

   ```sh
   firebase login --reauth
   ```

4. From the repository root, store the matching private widget key using the
   interactive Secret Manager prompt:

   ```sh
   firebase functions:secrets:set TURNSTILE_SECRET_KEY --project golden-brick-construction
   ```

   Paste the secret only into that prompt. Do not put it in source files, chat,
   shell arguments, or the public site configuration. The function explicitly
   binds this secret; the configuration endpoint never returns it.

5. Run local checks:

   ```sh
   npm --prefix functions run check
   npm --prefix functions test
   ```

6. Once deployment is requested, deploy the function and updated Hosting files
   together, using the repository's normal release workflow. The relevant
   Firebase targets are:

   ```sh
   firebase deploy --only functions:publicLeadIntake,hosting --project golden-brick-construction
   ```

   Review the current Hosting changes first: this working tree already contained
   unrelated edits before the estimate-form work. This implementation has not
   deployed any files or created live test leads.

## Expected behavior and verification

- A missing key, invalid key, provider timeout, or provider outage blocks
  submission with a retry/call message. There is no unchecked fallback.
- Published Cloudflare bypass keys are rejected outside the Functions emulator.
  Local unit tests use an injected Siteverify response and never contact the
  provider or the live CRM. Hostname and action validation remain enabled in
  the emulator; use the unit-test fixtures for deterministic offline checks.
- The token must pass server Siteverify, belong to an allowed hostname, and use
  the action `estimate_request`. Tokens expire after five minutes and are
  single-use. The browser must reset verification after each attempted POST.
- Blank project type/address, a filled hidden `website` field, and invalid
  contact fields are rejected without CRM writes. A successful response is
  simply `{ "ok": true }`, with no customer-match or record identifiers.
- Five verified requests per phone number are allowed per hour. This permits
  investors to submit several properties while limiting repeated spam. The
  durable `publicLeadRateLimits` collection stores a keyed phone hash, count,
  reset time, and expiration time; it contains no raw phone number. Existing
  Firestore rules deny client access to this unlisted collection. A sixth
  verified request receives HTTP 429 and `Retry-After`.
- To automatically remove old rate documents, optionally enable a Firestore TTL
  policy for the `expiresAt` field in the `publicLeadRateLimits` collection
  group. Expiration of the hourly limit works independently of TTL deletion.

After configuration, verify the real widget and one authorized submission in a
staging Firebase project before release. Browser screenshots and mocked local
tests do not establish that production keys are configured correctly.

References: [Cloudflare widget setup](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/),
[server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[testing guidance](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
