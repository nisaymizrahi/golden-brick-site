# Golden Brick Construction — website audit and completed improvements

**September 28, 2026 · Public website, credibility, conversion, SEO, and a limited review of connected intake/access code**

The revised public website is **deployed at https://www.goldenbrickc.com/**. After the audit, a second editorial pass reviewed all 43 public pages and standardized “full-home renovation” throughout visible copy, metadata, forms, and project summaries. All 43 live pages match the reviewed source files. Existing staff/client/estimate assets and API rewrites match the previous live release; functions and database rules were not deployed. The older `GOLDEN_BRICK_WEBSITE_AUDIT.md` was not overwritten.

Release: `1f70e6cfcbd5d44d`, September 28, 2026 at 05:16:33 UTC. Detailed release checks are in `output/audit-2026-09-28/RELEASE_NOTES.md`.

The biggest problem was the gap between the company’s actual construction work and the way the website described it. Much of the copy sounded like instructions for building a website: “published project record,” “Homeowner-Facing Work First,” “no unverified public office address,” and repeated lists of “scope, trades, inspections, finishes, and closeout.” That language made the company feel less personal and less credible.

The revised site explains what you build, where you work, what each project involved, and how someone can speak with you. Real people, verified project evidence, and a functioning Google profile are the most important remaining trust improvements. Copy alone cannot replace them.

## 1. What is finished

| Area | What changed | Why it matters |
|---|---|---|
| Homepage | Philadelphia appears in the main headline and search title; clearer homeowner/investor introduction; shorter service descriptions; concrete project summaries; a dedicated investor section | Visitors can identify the company’s work and location immediately |
| Company identity | “Construction” added to the visible brand lockup; consistent navigation/footer copy; Investors added to primary navigation; Reviews restored in the footer | The company and relevant next steps are easier to recognize |
| About | Removed the unsupported founding narrative and impersonal corporate language; described existing projects and team responsibilities in plain language | Replaces a generic company description with the work already documented |
| Service pages | Revised 16 service/area pages; clearer scopes, FAQs, links, and estimate prompts | Buyers can understand the work without decoding construction-management jargon |
| Investor pages | Rewrote the hub and supporting rehab/due-diligence pages around construction decisions, existing conditions, budgets, occupancy, and handoff | Makes the offer useful to rental owners, flippers, and small multifamily investors |
| Financial claims | Removed unsupported sourcing, financing, comps, and report-package promises from the investor hub | These should return only when you confirm the actual offer and supply evidence/deliverables |
| Guides | Rewrote cost, timing, rowhome, and permit guidance; removed unsupported price ranges and unnamed “recent guides”; added practical estimate-comparison questions | Gives readers useful information without inventing prices or authority |
| Portfolio | Revised all six case studies; distinguished completed, planned, and ongoing projects; added estimate links | Shows the actual work without presenting plans as finished construction |
| Photography labels | Corrected unsupported location/room descriptions; retained clear labels on enhanced images; removed an unverified bathroom before/after pairing claim | Avoids implying proof the available records do not establish |
| Reviews | Fixed loading, missing-rating, failure, retry, and pagination behavior; homepage review section appears only when actual reviews load | No misleading star score, endless loading state, or prominent broken widget |
| Contact form | Kept only name and phone required; clearer optional details and privacy text; specific validation; input preserved on failure; timeout and response checks; focused error/success states | Less friction, clearer recovery, and no false success for an HTML/error response |
| Other forms | Added useful existing notes/address fields to full-home renovation intake; improved labels, autocomplete, privacy links, and status announcements | Visitors can explain a project before a call without breaking existing data mappings |
| Visual design | Calmer headings, less all-caps text, simpler service/project layouts, stronger focus states, improved spacing and mobile gutters | Easier to scan and more professional on phones and desktops |
| Navigation | Fixed the mobile menu icon; improved keyboard dismissal/focus handling; kept desktop dropdown state in sync; expanded service access | Navigation works more consistently by mouse, touch, and keyboard |
| Performance/accessibility | Homepage uses a responsive image that matches its preload; native hidden attributes respected; reduced motion honored; important form/hero panels no longer fade from invisibility | Avoids duplicate hero-image downloads and hides fewer essential controls during loading |
| SEO | Unique page metadata, canonical alignment, relevant headings, social metadata, schema updates, and missing index.html redirects | Search engines and shared links describe the actual page more consistently |
| 404 page | Fixed relative asset/contact links and replaced “current build” wording | A missing nested URL still offers usable recovery links |
| Hosting | Excluded audit documents, logs, rules, internal templates, scripts, and configuration from future Hosting uploads; added referrer/MIME headers | Reduces accidental publication of internal project files |
| Privacy/measurement | Added an analytics disclosure grounded in the current implementation; improved form-error events and removed duplicate explicit event emission | Better transparency and clearer diagnostic signals |

The service/area content was reduced by approximately **22%**. The services directory went from approximately **1,900 words to 714**, while retaining its nine service paths. This is an editorial improvement, not a measured conversion result.

## 2. What you physically need to do

The order below puts evidence and lead handling ahead of more pages or advertising.

### First: identify the people and confirm the company details

- [ ] Provide the owner’s approved public name, role, and a short factual biography. Include real construction experience and company history only where accurate. No founder identity or years-in-business claim was invented.
- [ ] Provide the names/roles of the people a client actually deals with: first contact, estimator, project manager, and jobsite supervisor. One person can hold several roles.
- [ ] Take a good owner portrait and a real team/jobsite photograph. Wear the clothing you actually work in; avoid stock or generated team photographs.
- [ ] Confirm the legal business name matches your contracts, insurance, PA registration, Philadelphia license, and Google Business Profile.
- [ ] Verify **PA HIC #PA212716** and **Philadelphia GC #065157** against current records. These were already on the site; this audit did not independently establish current status.
- [ ] Ask your insurance agent for a current certificate and agree on how prospective clients can request it. Confirm existing “licensed and insured” wording and supply updated details if anything has changed.
- [ ] Confirm the real service boundaries. Supply a public business address only if appropriate for the actual business; do not invent an office to fill a schema field.

### Second: create a usable project evidence library

Choose three flagship completed projects: one home renovation, one rental/resale project, and one multifamily/mixed-use job. For each, collect:

| Needed | What to provide |
|---|---|
| Identity | Neighborhood/town, building type, and what Golden Brick actually performed |
| Status | Completed/in progress/planned, and the date the status was checked |
| Photos | 6–10 approved photographs: before, work in progress, finished wide views, and details |
| Specific work | A short list of rooms, systems, structural work, and finishes included |
| One useful story | A real issue found, what the team did, and the result |
| Timing | Actual start/completion months if you want to publish them |
| Cost | Optional actual approved budget band, with scope/date/exclusions; never an invented average |
| Permission | Client/property and photographer permission to publish |

Take before/after photographs from the same position. Photograph finished rooms without tools, debris, personal documents, or avoidable clutter. Keep original photos with their project records.

**Specific gaps:** confirm all six current project statuses; replace enhanced Germantown/bank imagery with actual progress photos when available; verify the source of the triplex and mixed-use covers; confirm rights to listing/MLS-watermarked photographs. New-construction pages currently identify their supporting gallery as renovation work. Add actual completed ground-up work before relying on that gallery to sell new-build capability.

### Third: repair Google reviews and company profiles

- [ ] Confirm ownership/access to the correct Google Business Profile.
- [ ] Supply its permanent public share URL and complete the existing review integration setup in `GOOGLE_REVIEWS_SETUP.md`.
- [ ] Verify a successful refresh and that displayed names, dates, ratings, and wording match Google exactly.
- [ ] Ask completed clients for an honest review after handoff. Use the same request process for all clients; do not offer incentives or write reviews for them.
- [ ] Replace the Facebook share-style URL with the company’s permanent page URL when available.
- [ ] Keep name, phone, services, photos, and service area consistent across profiles.

A read-only request to the production reviews endpoint returned **HTTP 503** during this audit. The frontend now handles that state cleanly. The underlying account/API setup is not repaired by a frontend change.

### Fourth: make the real sales process match the site

- [ ] Name the person responsible for each new inquiry and missed call.
- [ ] Decide the response window your team can actually meet, including weekends. Publish it only after confirming staffing.
- [ ] Decide whether a site visit, design consultation, or detailed estimate has a fee and explain that before booking.
- [ ] Confirm practical project minimums and the jobs you do not want. The website does not invent minimum budgets.
- [ ] Document what a written estimate contains: included work, exclusions, allowances, permits, payment milestones, and changes.
- [ ] Set a realistic client-update routine and material-selection deadlines.
- [ ] Confirm written workmanship/warranty terms with the actual agreement. No warranty duration was invented.
- [ ] Decide whether you truly offer sourcing, financing referrals, comps, or investor reports. Supply the provider, sample deliverable, fee, and boundaries before restoring those promises.
- [ ] Have the company’s privacy/communications reviewer check actual retention, inquiry contact permissions, marketing practices, and analytics settings. The updated policy describes observed tooling; it is not a legal compliance certification.

## 3. Technical findings that still need attention

These are separate from the completed public copy/design changes. They were identified by source review, not by exploiting production. **Private portal, staff, rules, and backend files were not changed in this pass.**

### High priority: prove mailbox ownership before granting access

The client app supports email/password registration, while email-based client and staff provisioning does not visibly enforce `email_verified` in the reviewed paths. Signature verification alone proves that Firebase issued a token; it does not establish that the account controls the email address it registered.

Relevant locations: `functions/src/clientPortal.js` (`verifyBearerToken`, `autoProvisionClientAccess`, `verifyClientRequest`, `claimPortalAccess`), `functions/src/index.js` (`verifyStaffIdToken`, `syncStaffSession`), and the allowlisted-email paths in `firestore.rules`.

**Required engineering work:** enforce verified mailbox ownership before every email-based provisioning path; require the intended trusted staff provider; add a working verification/resend flow for password-based clients; test legitimate, unverified, disabled, and mismatched identities in an emulator. Review the deployed authentication-provider settings. The source finding depends on those settings and account-registration conditions; it is not a confirmed live compromise.

### High priority: harden public lead intake

`publicLeadIntake` in `functions/src/index.js` checks only that name and phone are present. The reviewed path has no endpoint-specific size/format limits, server rate controls, or idempotency. It scans customer records, links/updates customer information from unverified public details, and returns customer-match information.

**Required engineering work:** bounded server validation, abuse/rate controls, retry-safe intake, a generic public response without customer-match details, and separation of unverified inquiries from trusted customer identity/access changes. Replace full-collection matching with appropriate indexed lookup. Test failures after initial lead creation so retries do not create duplicates. The new frontend validation improves usability; it is not a server security control.

### Additional authorization review

The non-admin `recordDocuments` update rule should verify access to both the existing record and the proposed replacement association. Test attempts to move a document from another inaccessible record to one the staff user controls. Keep this review separate from cosmetic changes and use emulator regression tests.

### Resolved on deployment: internal files were reachable on production

Header-only production checks returned **HTTP 200** for `/staff-crm-setup.md` and `/firestore.rules`, with their expected content types and file sizes. The audit Markdown path returned 404. No file bodies or credentials were retrieved in this check. Internal setup documents and database rules should not be served as website assets.

The deployed exclusions removed these internal file categories from Hosting. Post-release checks return **404** for `/staff-crm-setup.md`, `/firestore.rules`, a previously published debug-log path, and the internal project template. The release manifest contains no Markdown, logs, rules, Python, ZIP, or data-directory files. Review formerly exposed documents/logs privately for sensitive contents; rotate any credential whose exposure is confirmed. All 17 staff/client/estimate assets match the previous live release byte-for-byte by Hosting content hash.

### Hosting maintainability

 A dedicated, allowlisted build output remains preferable to publishing from the repository root. Shared navigation is still duplicated across HTML and JavaScript; the revised versions are consistent now, but a small build-time template system would reduce future drift.

Full evidence, preconditions, and suggested regression cases are included in `output/audit-2026-09-28/TECHNICAL_FINDINGS.md`. Do not publish that internal appendix.

## 4. SEO: what is stronger and what still depends on evidence

All **42 indexable URLs** remain in the sitemap. No page URLs were removed. Their titles, descriptions, canonicals, and headings pass the current static checks. The homepage now says Philadelphia directly, internal paths are clearer, and missing social metadata and duplicate index-file redirects have been addressed.

The next SEO work should come from actual company experience: dated project examples, useful construction observations, named author review, real cost examples, and credible local projects. More near-identical town pages are unlikely to solve the current evidence gap. This follows Google’s emphasis on useful, original, people-first information. [Google Search Central](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

The site retains accurate available business identifiers without inventing an office address, awards, review scores, or operating history. LocalBusiness rich-result eligibility requires Google’s documented fields; an incomplete address should not be “fixed” with fabricated information. [Local business structured-data guidance](https://developers.google.com/search/docs/appearance/structured-data/local-business)

Owner/account tasks:

- Verify the domain in Search Console and submit the sitemap after deployment.
- Review indexing and queries for the homepage, main services, investor page, and three flagship projects.
- In GA4, confirm how `generate_lead`, phone clicks, and inquiry errors are recorded and which events count as conversions.
- Connect website inquiries to qualified leads, walkthroughs, estimates, and won work in the CRM.
- Compare equivalent periods before/after launch, accounting for traffic sources and seasonality. Calls and qualified projects matter more than raw visits.

This audit did not access Search Console, GA4 reporting, Business Profile administration, or CRM performance reports. It cannot establish rankings, attribution quality, conversion lift, or production Core Web Vitals. No numeric improvement is promised.

## 5. Validation completed

| Check | Result |
|---|---|
| Public HTML inventory | 43 pages: 42 indexable pages plus the 404 page |
| Sitemap and canonicals | 42 matching destinations; no broken local destinations |
| Metadata and headings | Unique titles/descriptions/canonicals; one H1 per page; no duplicate IDs |
| Links and assets | No missing local HTML-linked images/scripts/styles/srcsets or fragment targets |
| Structured data | All static JSON-LD parses; service descriptions match page metadata |
| JavaScript | Syntax checks passed for the four shared scripts and all 44 inline JavaScript blocks |
| Project/review behavior | 39 isolated assertions passed, including status, unsafe URLs, gallery state, draft filtering, review failure/retry, and hidden-homepage behavior |
| Form behavior | Browser-tested required fields, invalid phone, failed request, HTTP 200 with invalid JSON, and successful response; fields retained on failure and cleared only after simulated success |
| Mobile | Key page types checked at 390px with no horizontal overflow; homepage also checked at 320px; menu open/Escape behavior verified |
| Desktop | Homepage, services, Main Line, portfolio, and full-home renovation form visually reviewed at desktop sizes |
| Hosting exclusions | 13 representative internal paths excluded; 13 required public/app assets preserved; production checks confirmed the internal files now return 404 |
| Patch hygiene | `git diff --check` passed |

Form success was tested against a **local simulated endpoint that discarded the request**. No real inquiry, customer record, email, text, appointment, or production login was created. Production end-to-end delivery remains unverified. Local preview does not run Firebase initialization or the live review API; the static gallery/review fallback was checked instead.

Run the reusable source check with `python3 scripts/check-public-site.py` and the project/review behavior checks with `node scripts/check-projects-reviews.cjs`. It checks source structure and local paths; it does not replace browser testing, a production crawl, external-link verification, or an accessibility conformance audit.

## 6. Suggested order of work

1. **Remaining engineering and owner follow-up:** review the access-control/intake findings; confirm credentials, service claims, image rights, and operating commitments. Public-site deployment did not change the backend or resolve the separately documented access-control findings.
2. **This week:** owner/team photos and biography, three complete project evidence packets, Google profile/review setup, and a clear lead-response owner.
3. **After deployment:** redirects, headers, all public pages, private asset preservation, and internal-file removal have been verified. Google reviews still return 503. Complete one controlled end-to-end inquiry, inspect Search Console, and confirm analytics events.
4. **Over the next month:** add approved project cost/timeline examples and evaluate qualified inquiry-to-estimate-to-job results. Improve the pages based on real questions and objections from callers.

## Deliverables

- This complete report: `WEBSITE_AUDIT_2026-09-28.md`.
- Full updated public source files in the workspace, plus a ZIP of those complete files for review.
- Internal technical findings and validation details in `output/audit-2026-09-28/`.
- Desktop/mobile homepage screenshots in the same folder.

The final website copy uses existing company/project facts. The remaining owner checklist identifies the material that cannot responsibly be supplied by rewriting text.
