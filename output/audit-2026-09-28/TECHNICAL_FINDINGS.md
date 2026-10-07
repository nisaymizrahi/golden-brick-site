# Internal technical findings — September 28, 2026

Do not publish. Source review only; no production exploitation or backend changes.

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

## Production hosting verification

September 28, 2026, header-only requests:

- `/staff-crm-setup.md`: HTTP 200, text/markdown, Content-Length 3316.
- `/firestore.rules`: HTTP 200, text/plain, Content-Length 18333.
- `/GOLDEN_BRICK_WEBSITE_AUDIT.md`: HTTP 404.

No response bodies or credentials were retrieved. The new local hosting ignore rules exclude these internal files on the next deployment; production has not been updated. Privately review any exposed setup text and rotate only credentials actually shown to have been exposed. Preserve unrelated uncommitted portal work during a targeted release.
