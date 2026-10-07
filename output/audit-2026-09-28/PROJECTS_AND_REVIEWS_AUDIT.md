# Golden Brick proof, portfolio, reviews and process audit

Reviewed September 28, 2026. Scope: public portfolio, six project pages, reviews, process, client protections; additional read-only lead/portal code review requested by root. All original owned files were fully read before edits. Working copies were preserved under `/tmp/gb-proof-before`. No deployment, real lead submission, production authentication test, review fabrication, or portal/backend edit was performed.

## Implemented

- Rewrote portfolio headings, introductions, sections and CTAs in normal customer language. Removed internal editorial phrases such as “Homeowner-Facing Work First,” “approved published projects,” “published project record,” and “No unverified ... is published.”
- Rewrote all six case studies using existing scope, location, unit-count and status facts. Did not invent budgets, timelines, permit approvals, investment returns, owner identity, testimonials or completion claims. Added a relevant estimate CTA and return-to-projects link to each project page.
- Made finished versus planned/in-progress work clear. Retained and strengthened the existing enhanced-image labels: “Digitally enhanced image; not a completed-project photograph.” Altered-image labels appear on Germantown and former-bank project cards and pages.
- Rewrote process steps to describe what a customer does and receives. Removed defensive explanation and vague corporate wording. Rewrote client protections, including the damaging sentence saying no verified warranty had been supplied for publication. Warranty content now asks customers to review applicable workmanship/product terms without inventing coverage.
- Removed “Verified credentials” and a blanket “Licensed and insured” badge from the protections panel; preserved the existing registration/license numbers and gave a concrete way to request current credential and insurance documents. Current validity remains an owner verification task.
- Changed portfolio title/meta to Philadelphia renovation projects, retained canonical URLs and structured data, added missing Twitter metadata to all six case studies, added accessible breadcrumb names, and used the existing 1200px responsive portfolio hero image. Reduced the portfolio hero height so work is reached sooner.
- Fixed `projects.js`: completed work no longer disappears after 365 days; planned bank redevelopment is no longer mislabeled as underway; explicit status values are supported; unknown “upcoming” projects do not assert construction has started. The current staff editor only stores finished/upcoming, so the known bank's planned label is preserved until that data model is improved.
- Removed the generic unrelated photo used when a project has no cover; a missing photo now gets an honest placeholder. Project URLs are validated and text is escaped. Draft-only records do not render publicly in this UI (public Firestore rules still depend on published).
- Improved gallery buttons with original-photo return, accurate per-image alt descriptions when available, selected state, `aria-controls`, labeled groups, visible focus and 44px targets.
- Fixed reviews UI: no fabricated one-star score for malformed rating; average stars reflect the rating rather than always five stars; zero/no reviews does not display a fake numeric score; first-load failure clears loading state and hides the score; fallback links to work if no verified Google listing URL is known; retry works; pagination failure preserves previously loaded reviews; raw server error messages are not shown; fetch has a 10-second timeout. Added a no-JavaScript fallback to the reviews page.
- Added `.is-unavailable` for root's compact review fallback CSS. Browser QA also found CSS overriding the native `[hidden]` attribute, making a profile link without an href and the hidden score visible. Root is fixing the shared hidden rule. Root is also normalizing shared navigation and bumping static asset query versions; without that version change, browser QA initially loaded stale July-version JavaScript despite new HTML.

## Files changed

`projects.html`, `projects.js`, `google-reviews.js`, `reviews/index.html`, `process/index.html`, `client-protections/index.html`, and every `projects/*/index.html` (6 files).

## Checks completed

- `node --check projects.js` and `node --check google-reviews.js` passed.
- 24 isolated behavior assertions passed in `/tmp/gb-proof-test.cjs`: planned/completed/unknown statuses, unsafe URL rejection, no unrelated photo fallback, escaped content, gallery selected/alt/original behavior, old completed projects retained, drafts suppressed, invalid/zero rating handling, summary-star display, unavailable/retry state, reviews retained after a failed “load more,” and homepage review widget visibility before/after failure/success.
- All 10 owned HTML pages passed one-H1, one-canonical and parseable JSON-LD checks.
- CUA local browser verification at `http://127.0.0.1:4173`: reviews unavailable state showed the new fallback and retry; retry returned to a usable state; portfolio retained all six static project cards with Firebase initialization unavailable; Italian Market project link opened the correct page with revised content and estimate CTA. Desktop portfolio screenshot was visually inspected: headings, body and both CTAs fit without overlap.
- Expected local-only console error: Firebase `/__/firebase/init.json` is absent from the Python preview, so live project data cannot load; static project cards remain usable. The Python server also has no reviews API. Successful live review retrieval, live project database rendering, mobile screenshots and production Web Vitals still require root/live validation.

## Physical/business tasks for owner

1. **Get real project evidence together.** For the three completed cases, provide 6–10 approved photos each: before, demolition/rough work, finished wide rooms, and close details. Photograph the same views before/after. Supply plain captions naming the room, stage and work. Current gallery captions are necessarily generic.
2. **Replace enhanced portfolio imagery with actual progress photos.** Keep concepts/altered images secondary and clearly labeled. Confirm provenance of the remote PNG covers for the triplex and completed mixed-use case as well; filenames and appearance alone are not proof. The former-bank cover filename explicitly references image generation, and Germantown is named as a rendering. No original file was deleted or silently swapped.
3. **Confirm all six project statuses and Golden Brick's role.** Supply a “status checked” date, start/completion month if factual, building size, actual scope performed, permit milestones and one real construction challenge/resolution per case. The planned bank should not become evidence of completed capability. Add approved budget bands only if clients permit and records support them.
4. **Make company credentials independently checkable.** Confirm current Pennsylvania registration, Philadelphia contractor license and current insurance certificate; publish appropriate official verification links and a straightforward document-request contact. Do not use self-labeled “verified” as proof.
5. **Confirm the real operating process.** Decide the named contact for each job, normal update frequency, estimate/site-visit fee policy, change-order approval procedure, cleanup standard, payment milestones and written warranty terms. Make these match contracts and operations before claiming specifics.
6. **Finish Google Business Profile integration.** The existing `GOOGLE_REVIEWS_SETUP.md` says configuration/first successful refresh are owner-dependent. Supply the actual public profile share URL, grant the required account/API authorization, complete configuration and verify `available:true` with exact unedited text. Do not invent a fallback listing or reviews. Ask completed clients for honest reviews and permission to use case photos; do not filter requests to only happy clients or offer incentives.
7. **Obtain image/client permission and human proof.** Owner/team names, short factual bios, real portrait/jobsite photos and identifiable roles cannot be produced by copywriting. Collect them to make About and contact paths credible.

## Read-only backend/portal findings: not changed

These are **code-reviewed risks, not live exploit confirmations**. No production probes were run. Existing uncommitted portal/CRM work is untouched.

### High: mailbox ownership is not enforced before email-based portal/staff provisioning

Evidence:
- `functions/src/clientPortal.js:1122` (`verifyBearerToken`) verifies Firebase signature, but does not enforce `decoded.email_verified`.
- `functions/src/clientPortal.js:1191` (`autoProvisionClientAccess`) finds an invited/claimed contact by decoded email and provisions access; it can replace a prior contact `authUid`.
- `functions/src/clientPortal.js:1297` (`verifyClientRequest`) calls that auto-provision path for an account without a client mapping.
- `functions/src/clientPortal.js:2160` (`claimPortalAccess`) validates invitation token and matching email string, not mailbox verification.
- `client/client.js:3212` supports `createUserWithEmailAndPassword`; no email verification flow was found by targeted search.
- `functions/src/index.js:288` (`verifyStaffIdToken`) verifies signature only; `functions/src/index.js:6280` (`syncStaffSession`) matches `decoded.email` to `allowedStaff` or bootstrap admin list and creates staff profile/custom claims.
- `firestore.rules:31`–`38` (`requestEmail` / `isApprovedStaffEmail`) trusts the email claim without `email_verified`, then `/users` create grants allowlisted roles.

Preconditions: email/password registration is enabled in the deployed Firebase project (supported by client source, actual console setting not inspected); target contact email is invited/claimed or staff-allowlisted; an attacker can obtain a valid token for that address without mailbox control, typically where the real user has not already registered that email. Source does not demonstrate that a configured identity-provider policy blocks this.

Safest necessary remediation: require verified mailbox ownership on every backend and Firestore-rule path that provisions by email. Require trusted intended provider for staff. Add email verification/resend/reload flow for password-based client registration so legitimate clients are not stranded. Deny mismatched and unverified tokens; test new client, existing client, reissued invite, disabled contact, multi-customer contact, normal Google staff and unauthorized users in an emulator before deployment. Do not treat noindex or UI-only checks as authorization.

### High: public lead intake permits unbounded spam and reveals customer-match information

Evidence:
- `functions/src/index.js:6144`–`6265`: public intake checks only truthy name/phone. `safeString` at `240` only coerces/trims; no field length, format, consent, rate-limit, deduplication or abuse-token check appears in the handler.
- `functions/src/index.js:398` (`findMatchingCustomers`) loads the full customers collection and matches on email OR phone per submission, making per-request cost grow with the business.
- `functions/src/index.js:486` (`ensureLeadCustomerLink`) links/creates customers from unverified public identity details. `buildCustomerPayloadFromLead` at `428` fills absent identity/address fields and adds the lead assignee to customer access.
- Public success at `6252` returns `customerId` and `customerMatchResult`, allowing a caller to infer whether supplied contact information matched an existing customer.
- `PUBLIC_CORS_HTTP_OPTIONS` at `65` and `applyCors` at `211` are broad public CORS. Restricting CORS alone would not prevent scripts or direct HTTP clients from posting.
- Lead creation, customer linking and activity logging are separate operations; a later failure can return 500 after a lead has already been saved, so a retry can create duplicates.

Preconditions: deployed endpoint accepts public requests as configured; no external gateway/rate policy was inspected. Membership inference requires submissions, which were not performed. Anonymous data does not prove actual customer identity.

Safest remediation: small endpoint-specific validation schema with byte/field limits; server-side abuse/rate controls; idempotency key; generic public success response without customer-match details. Keep intake creation separate from customer identity/access changes until staff review or a trusted verified workflow. Replace full-collection reads with normalized indexed lookup where appropriate. Test duplicate/retry behavior and failure after lead creation. Frontend honeypot/validation is helpful UX but not a server security boundary.

### Portal indexing and access observations

- Client, estimate and staff HTML include `noindex,nofollow`; Firebase headers include `noindex,nofollow,noarchive` and `no-store`; robots excludes portal subpaths. These are useful indexing/cache controls, not authentication.
- Firestore and Storage rules generally restrict private projects/leads/customers to authorized staff, while published site projects are deliberately public. Client portal uses server-verified bearer tokens/contact mappings. The verification gap above needs focused review.
- `firestore.rules:389`–`392` (`recordDocuments`) uses access to `request.resource.data` for non-admin update without also checking access to the existing document. A staff user who knows another document ID may be able to reassign it to a record they control and overwrite it. Preconditions: active non-admin staff account and known document ID. Fix by requiring access to both existing and proposed document records and preventing unauthorized association changes; test in emulator. This is an internal authorization review item, outside the marketing change.
- Hosting exclusions being handled by root should keep audit Markdown, logs, rules, internal templates and configuration out of the public upload. A root-level public directory is still a maintainability risk; future dedicated build output is recommended.


## Final review-feed adjustment

Root's read-only production request to `/api/public/google-reviews` returned HTTP 503 on September 28, 2026. This confirms feed unavailability at the test time only; it does not establish the API's configuration history. Added opt-in `data-hide-unavailable="true"` support so the homepage's entire reviews section stays hidden until genuine reviews load and remains hidden on unavailable/empty responses. The dedicated Reviews page retains the honest fallback and retry. No reviews or ratings were invented. Shared `[hidden]` CSS is necessary for this behavior and is owned by root.
