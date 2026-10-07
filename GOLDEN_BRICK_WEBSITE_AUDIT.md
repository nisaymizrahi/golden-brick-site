# Golden Brick Construction Website Audit

**Audit date:** August 11, 2026  
**Audit status:** Read-only audit of the current working tree; no website code or content was changed  
**Business reviewed:** Golden Brick Construction, serving Philadelphia, Bucks County, Montgomery County, Delaware County, and the Main Line  
**Primary objective:** Generate qualified local homeowner and investor inquiries while establishing Golden Brick as a dependable Philadelphia contractor with particular authority in row-home and complex renovation work

## Audit scope, evidence rules, and limitations

This report covers the complete current repository, including 46 public-facing HTML files, 42 indexable URLs, the custom 404 page, the noindex client/estimate/staff applications, shared navigation and footer code, all three public lead forms, Firebase Hosting and Functions configuration, analytics event code, schemas, images, dependencies, and major interactive components. The audit used the uncommitted working tree as found. Existing work was preserved.

Every finding uses one of these evidence classes:

- **Confirmed:** Directly observed in the current repository, generated Hosting file list, static route/link/asset scan, code, or local validation command.
- **Best-practice recommendation:** A strategic recommendation based on the confirmed site and the stated business goals; it is not presented as measured user behavior.
- **External verification required:** Requires production access, analytics, Search Console, Google Business Profile, CRM, real-device/browser testing, or business information that was not available.

Important testing limitations:

- The Firebase emulator and a simple local server could not bind a local port in the audit sandbox. The in-app browser also could not navigate to the production site after its permission request was denied. Local `file://` access was blocked by browser security. Accordingly, no current desktop/tablet/mobile screenshots, Lighthouse scores, Core Web Vitals, axe results, or screen-reader test results are claimed.
- Responsive CSS, source order, control sizes, image assets, and accessible-name semantics were inspected directly. These findings are useful, but current rendering still needs browser and real-device verification.
- No live form was submitted and no real lead was created.
- Google Analytics, Search Console, Google Business Profile, call-tracking, ad accounts, CRM conversion outcomes, rankings, backlink data, and production server logs were unavailable. No traffic, ranking, conversion-rate, or market-share claims are made.
- Live HTTP response codes, redirect behavior, security headers, HTTPS/HSTS, deployed-file exposure, and schema eligibility need production verification.
- `npm run check` passed. All 9 estimate-lifecycle tests passed. `npm audit --omit=dev` could not reach the package registry because network/DNS access was unavailable, so dependency vulnerability status is unknown.
- Competitor research reflects public pages inspected on August 11, 2026. Competitor claims were treated as self-reported unless an official source was also inspected; the competitors were not assumed to rank well.

---

## 1. Executive summary

Golden Brick has a substantially better technical and content foundation than many small-contractor websites. The current site is static and crawlable, has 42 indexable pages, clean self-canonicals, unique titles and H1s, a sitemap that exactly matches the indexable inventory, no missing local links/assets/fragments in the static scan, click-to-call on every indexable page, real project photography, detailed Philadelphia housing knowledge, visible contractor credentials, a clear process, and a notably honest Client Protections page.

It is not yet positioned or evidenced strongly enough to become the obvious Philadelphia choice described in the brief. The homepage's title and H1 say only “General Construction Company”; a visitor must read past the principal hero message to learn where the company works, and row-home expertise is not the central promise. The main navigation omits several services the business says are important—roofing, water-damage restoration, flooring, drywall, and painting—while giving considerable emphasis to new construction and multifamily work. This creates a five-second comprehension problem and a search-demand mismatch.

The largest credibility gap is not the absence of generic trust language; the site already has plenty of it. The gap is verifiable human and project proof. The site does not name leadership or field-team members, state a verified founding year, explain the company's story with identifiable people, or provide detailed homeowner case studies with size, schedule, budget band, permit path, hidden condition, resolution, and outcome. Several case studies are very short, and defensive phrases such as “no unverified budget” sound like internal audit instructions rather than customer-facing writing. Digitally enhanced project imagery is labeled, which is transparent, but should not substitute for genuine before, progress, and finished proof.

Conversion paths are visible and short, but not yet optimized for both volume and lead quality. The contact form requires only name and phone, explains the process, and has proper result roles. The two embedded service forms are inconsistent in fields, accessibility, attribution capture, and fallback behavior. The public lead endpoint validates only nonempty name and phone before creating CRM records and has no durable rate limit, bot protection, size limits, deduplication, or meaningful phone/email validation. That is a high-priority spam, cost, and data-quality risk.

The most urgent technical issue is deployment hygiene. Firebase Hosting publishes from the repository root, and the generated upload set includes debug logs, internal setup documentation, Firestore/Storage rules, index configuration, and an internal case-study data template. This does **not** prove those files are live today, but it proves the current configuration can upload them. The new audit report would also become deployable unless excluded. Hosting should use a dedicated public/build directory or a strict allowlist before another production deployment.

The strongest strategic opportunity is to own a position competitors do not clearly combine: **Philadelphia row-home expertise with investor-grade project management and homeowner-level reassurance**. Golden Brick can make that credible through factual case studies, named people, official credential links, dated and evidence-based cost guidance, clearly separated homeowner/investor paths, and a conversion flow that sets exact expectations.

### Bottom line

The site should be **revised, not rebuilt from zero**. Preserve the static crawlability, real photography, credential strip, process content, client-protection language, local technical detail, project inventory, and restrained black/gold design. First secure the deployment and lead endpoint. Then correct the homepage promise, align services to the actual business, strengthen proof, and consolidate overlapping search-intent pages before expanding content.

---

## 2. Overall website score: 68/100

This is a documented expert heuristic based on the current repository and the stated business goals. It is not a Lighthouse score, search ranking, user-test score, or measured conversion rate. The score is held down by two high-risk technical issues, an under-differentiated homepage, incomplete trust evidence, cost-guide intent mismatch, and the inability to validate current rendering and production behavior.

**Interpretation:** The site has a credible and unusually complete foundation, but it is not yet a top-tier local lead-generation site. Correcting the critical technical risks and the first-screen positioning would move it materially faster than a visual redesign alone.

---

## 3. Category scores

| Category | Score | Evidence-based rationale |
|---|---:|---|
| Client experience | 68/100 | Services, process, projects, phone, and CTAs are easy to find, but the first screen is generic, important services are absent from navigation, and several pages repeat abstract planning language instead of answering concrete homeowner questions. |
| Lead-generation ease | 67/100 | Every indexable page has click-to-call and the primary form is short, but the three forms are inconsistent, mobile contact presentation suppresses the hero phone CTA, next-response timing is vague, and no sticky mobile action exists. |
| Trust and credibility | 62/100 | Visible registrations/licenses, real images, reviews, process, and Client Protections are strong. Missing named people, verified history, detailed project outcomes, official credential links, and static review proof materially limit trust. |
| Technical SEO | 80/100 | Static HTML, complete canonicals, exact sitemap parity, index controls, unique metadata, valid JSON-LD syntax, and clean local links are strong. The 404, schema coverage, root-level hosting output, alias/status verification, and missing live validation keep this below excellent. |
| On-page SEO | 64/100 | All indexable pages have titles, descriptions, and one H1, but the homepage is not locally targeted, multiple broad-service pages overlap, cost/timeline pages under-answer intent, and two case-study descriptions are truncated. |
| Local SEO | 72/100 | County/service-area pages, neighborhood case studies, row-home details, and consistent public phone/service-area data create relevance. Proof is thin on location pages, official local sources are not cited consistently, and GBP alignment/rankings are unknown. |
| Content quality | 65/100 | The library is broad and often technically useful. Repetition of “scope,” “planning,” and “coordination,” defensive verification language, vague cost references, and thin cases make portions feel templated or AI-assisted. |
| Design and branding | 70/100 | Source inspection shows a controlled black/gold system, clear grids, consistent buttons, and strong real imagery. The brand lockup omits “Construction,” warm beige dominates instead of the requested white, all-uppercase editorial headings are overused, and the 404 is visually out of system. Current visual rendering was not available. |
| Mobile experience | 64/100 | CSS collapses grids cleanly and primary controls generally meet 44–50px touch targets. The menu lacks robust focus management, the contact hero hides its phone CTA at small widths, there is no sticky conversion bar, and current real-device rendering is unverified. |
| Accessibility | 69/100 | Language, skip links, main landmarks, labels, image alt text, explicit image dimensions, and contact status roles are good. Focus contrast is weak, navigation landmarks are inconsistently labeled, seven pages skip heading levels, two forms lack live-result semantics, and mobile-menu keyboard behavior needs work. |
| Performance | 62/100 | Responsive variants, WebP, dimensions, lazy loading, and a responsive homepage hero are strengths. The deploy set is roughly 220 MB, many unreferenced originals are 6–10 MB, several CSS heroes load originals, review placeholders can shift layout, and no current Lighthouse/CWV measurement was possible. |

---

## 4. The ten most important problems

1. **Critical — the Hosting output includes internal and debug artifacts.** `firebase.json` publishes from `.`; the generated upload set includes eight root debug logs, `staff-crm-setup.md`, rules/index files, and an internal data template. Live exposure is unverified, but another deploy can publish them.
2. **High — the public lead endpoint is readily spammed.** `functions/src/index.js` validates only nonempty name/phone, accepts essentially unbounded strings, and immediately creates lead/customer/activity records without durable throttling, bot resistance, deduplication, or proper field validation.
3. **High — the homepage fails the five-second local-positioning test.** `index.html` uses the title/H1 “General Construction Company.” Philadelphia, counties, row homes, and the strongest reason to choose Golden Brick are not in the core first-screen promise.
4. **High — the site does not represent the stated service mix.** Roofing and water-damage restoration have no dedicated service experience; flooring, drywall, and painting are subordinate mentions. The navigation emphasizes new construction/multifamily instead.
5. **High — trust language is ahead of trust evidence.** `about.html` lacks named leadership/team, verified company history, and human biographies. Case studies lack the project facts homeowners use to judge experience. Reviews depend on a JavaScript/API feed.
6. **High — cost and timeline guides do not satisfy their search intent.** The bathroom guide provides no numerical costs, the full-home page's meta promises square-foot pricing that the page does not supply, and the timeline guide lacks useful duration ranges. Vague “recent guides” claims are uncited.
7. **High — conversion flows are inconsistent and underspecified.** The three forms have different required fields, autofill support, result announcements, fallback behavior, and attribution capture. None gives a verified response window. The primary form favors volume but collects too little information to identify fit.
8. **High — project proof is too thin.** Six case studies have roughly 120–131 words of main content in the static inventory; three rely on CSS background imagery without inline project galleries. Budget, duration, square footage, permit path, challenge/resolution, and outcomes are absent.
9. **Medium — broad pages compete and the copy feels templated.** `/`, `/residential.html`, `/general-contractor-philadelphia/`, and `/philadelphia-home-remodeling-contractor/` overlap. Repeated phrases such as “scope,” “planning,” and “coordination,” plus “no unverified…” disclaimers, reduce distinctiveness.
10. **Medium — systemic accessibility and 404 issues interrupt otherwise strong fundamentals.** Focus indicators lack sufficient contrast, seven pages jump from H1 to H3, navigation labels and menu focus behavior are inconsistent, two forms lack live status roles, and nested 404 URLs resolve relative assets/CTA paths incorrectly.

---

## 5. The ten strongest parts of the current website

1. **Crawlable static architecture:** All 42 indexable pages expose meaningful HTML without requiring a SPA runtime.
2. **Clean inventory controls:** The sitemap contains exactly the 42 self-canonical indexable URLs; private client, estimate, and staff applications are noindex/noarchive and blocked from crawling.
3. **Complete basic metadata:** Every indexable page has a unique title, description, canonical, one H1, Open Graph title/description/URL/image, and the same GA4 property ID.
4. **No confirmed broken local navigation:** A static scan of 2,260 references found no missing local page, asset, or fragment after accounting for Firebase rewrites.
5. **Excellent click-to-call coverage:** Every indexable page includes the same phone number in a call link, and estimate CTAs are frequent without being excessively modal or interruptive.
6. **Genuine Philadelphia knowledge:** Row-home pages discuss party walls, narrow access, stacked utilities, uneven floors, older systems, permits, and occupied-home sequencing in useful language.
7. **Authentic photography:** The site-refresh assets show real kitchens, occupied-home protection, open construction conditions, and row-home exterior work. These are much more credible than generic stock rooms.
8. **Clear process and protections:** `/process/` and `/client-protections/` explain written scopes, allowances, exclusions, change orders, permits, site protection, punch lists, and closeout. The unwillingness to invent a warranty term is responsible.
9. **Good image/accessibility fundamentals:** Parsed content images have alt text, explicit width/height, lazy loading, and extensive responsive `srcset` use. Marketing pages generally have a skip link, `lang="en"`, and a `<main>` landmark.
10. **Thoughtful application safeguards:** Private application routes use no-store/noindex controls; Firestore and Storage rules are not globally open; Google Reviews has rate limiting and safe rendering; all 9 estimate lifecycle tests pass.

---

## 6. Full customer-journey analysis

### Journey summary

| Stage | What the visitor currently experiences | Likely hesitation or exit point | Recommendation | Evidence class |
|---|---|---|---|---|
| Search discovery | Many service, cost, location, investor, and guide pages can match specific searches. Titles are unique. | Homepage snippet is generic; cost/timeline pages may disappoint after the click; overlapping broad pages may dilute relevance. | Assign one intent to every page, repair intent mismatches, and decide broad-page consolidation using Search Console before redirecting. | Confirmed + external data required |
| First five seconds | Large “General Construction Company” hero, supporting service list, Estimate and Call actions; credential/service-area strip follows. | The business could be anywhere and do anything. Philadelphia, counties, row homes, and project-fit distinction are not part of the main promise. | Lead with “Philadelphia General Contractor for Row-Home & Whole-Home Renovations,” a precise scope/area line, and two actions: project review and call. | Confirmed + best practice |
| Orientation/navigation | Compact header, Services dropdown, Projects, Process, About, and CTAs. Footer gains many links through JavaScript. | Services menu omits several stated core services; investor and homeowner paths are not immediately separated; the brand reads only “Golden Brick.” | Use a concise service hub grouped by renovation, exterior/restoration, and investor work; show full company name; keep utility links secondary. | Confirmed + best practice |
| Service evaluation | Individual pages explain scope, constraints, process, FAQs, and calls to action. | Repeated abstract language, similar layouts, and missing roofing/restoration pages make it hard to tell what Golden Brick actually prioritizes or uniquely executes. | Give each page proof, scope boundaries, ideal-project fit, local conditions, real project links, FAQs, and a page-specific CTA. | Confirmed + best practice |
| Local-fit check | Service Areas names Philadelphia, Main Line, Bucks, Montgomery, and Delaware; county pages exist. | County pages are templated and lack local projects/reviews; Philadelphia neighborhoods are mostly demonstrated only through projects. | Enrich existing location pages with real proof before creating more. State municipalities/neighborhoods only when actually served. | Confirmed + best practice |
| Trust validation | Credentials, Google Reviews feed, project gallery, process, and protections are available. | No named owner/team, verified founding year, proof-of-insurance process, official lookup links, static review fallback, or detailed completed-project metrics. Enhanced images can be mistaken for evidence. | Build a human trust layer and factual case studies; link official credential lookup; keep enhanced imagery labeled and secondary. | Confirmed + external facts required |
| Risk/price research | Cost, permit, row-home, and timeline guides exist. | Cost and timeline answers are evasive; vague external references lack citations; no project minimum or typical fit is explained. | Publish verified, dated bands/ranges and methodology or retitle pages as “cost factors” until the data is approved. Cite official sources. | Confirmed + owner data required |
| Contact decision | Repeated Request an Estimate and call links; contact page explains call, walkthrough, and written estimate. | “Estimate” may imply instant pricing; no response-time promise; homeowner may wonder if project is too small/large or whether texting/photos are allowed. | Rename initial action “Request a Project Review,” state verified fit/minimums and response window, and offer call/text only where operationally supported. | Confirmed + business decision required |
| Form completion | Primary form needs name and phone; optional details are collapsed. Mobile source order puts form first. | Too little qualification in the required path; small-screen hero hides phone action; optional consent is confusing; embedded forms are inconsistent. | Require only the minimum fit fields, use progressive optional qualification, maintain a visible mobile call path, and harmonize all forms. | Confirmed + best practice |
| Submission/error | Fetch submission disables the button and shows generic success/error; contact roles are accessible. | Hung requests have no timeout; embedded result messages may not be announced; no reference number or verified follow-up window; no-JS fallback is poor. | Add timeout/retry, accessible summary focus, HTML fallback, idempotency, and a useful confirmation with next steps. | Confirmed + best practice |
| Internal lead handling | Backend creates a lead, links/creates a customer, and records activity; analytics emits `generate_lead`. | Spam can pollute the CRM; source attribution is incomplete; code presence does not prove GA key-event configuration or staff follow-up. | Secure intake, store structured attribution, test staging-to-CRM, and measure qualified lead/appointment/win outcomes—not form volume alone. | Confirmed + external verification required |

### Where a homeowner is most likely to hesitate

- “Do they really specialize in Philadelphia row homes, or are they a generic contractor?”
- “Do they handle my actual project—especially roofing, water damage, drywall/painting, or flooring?”
- “Who owns or runs the company, and who will be in my home?”
- “Are these completed projects, current projects, or enhanced concepts?”
- “What size project is a fit, what might it cost, and how long could it take?”
- “Are the displayed credentials active, and does ‘licensed’ mean the same thing in Pennsylvania and Philadelphia?”
- “If I submit, when will someone respond and what happens before I receive pricing?”
- “Can I call or text easily from this mobile screen?”
- “Will my details be used only to answer this project inquiry?”

### Where an investor is most likely to hesitate

- “Can this contractor quantify budget, schedule, permit, occupancy, and unit-turn risk?”
- “Do the mixed-use/multifamily pages document completed outcomes or mainly planned work?”
- “Can Golden Brick perform pre-acquisition feasibility, draw documentation, scope comparison, and change-order control?”
- “What is the minimum project size, geographic operating limit, and typical response time?”

---

## 7. Lead form and conversion analysis

### Current conversion inventory

| Location | Current required fields | Optional fields | CTA/result behavior | Confirmed issues |
|---|---|---|---|---|
| `/contact.html` | Name, phone | Email, address, project type, desired start, property status, budget, description, referral, consent | “Request a Call”; explains phone review, possible walkthrough, and written estimate; success has `role=status`, error has `role=alert`. | Mobile CSS hides hero text and call actions; no verified response window; consent model conflicts with privacy copy; attribution is merged into notes instead of stored structurally. |
| `/bathroom-remodeling-philadelphia.html` | Name, phone | Email, address, notes | “Send Bathroom Estimate Request”; generic success/error. | Missing autofill/input-purpose hints; result nodes lack live roles; UTM fields are appended but not included in the payload; hidden-iframe no-JS fallback is obsolete; no privacy link near submit. |
| `/full-renovation-philadelphia/` | Name, phone, project type | Email | “Request an Estimate”; generic success/error. | Result nodes lack live roles; vague “shortly” follow-up; hidden-iframe fallback; field/qualification pattern differs from other forms. |
| Global header/footer/page CTAs | Not applicable | Not applicable | Click-to-call and Request an Estimate appear on all indexable pages. | No sticky mobile two-action bar; `site.js` injects/mutates some navigation/footer items, increasing drift and JavaScript dependence. |

### CTA assessment

- **Confirmed strength:** Calls and estimate actions are highly visible. All indexable pages have click-to-call. The contact page provides a direct phone alternative adjacent to the form.
- **Confirmed weakness:** “Request an Estimate” is used even though the process says pricing follows review and often a walkthrough. That wording can create a false expectation of immediate pricing.
- **Recommendation:** Use **Request a Project Review** for the first step, **Call (267) 715-5557** as the parallel action, and reserve **Review My Scope / Schedule a Walkthrough** for later funnel stages.
- **Recommendation:** Add a restrained mobile sticky bar with two equal actions—**Call** and **Project Review**—using safe-area padding and no overlap with content. Verify that it is keyboard reachable, does not obscure the consent/form footer, and is not shown inside authenticated portals.

### Ideal lead-capture model

Use one consistent component and one backend contract across the site. The form should be short enough to finish on a phone but collect enough information to identify service area and project fit.

#### Initial form fields, in order

| Order | Field | Requirement | Reason |
|---:|---|---|---|
| 1 | Full name | Required | Basic identification. |
| 2 | Mobile phone | Required | Fastest practical contractor follow-up; normalize and validate without rejecting common punctuation. |
| 3 | Email | Optional | Useful for documents and visitors who prefer email; required only if Email is selected as preferred contact method. |
| 4 | Project ZIP code or city | Required | Qualifies service area without demanding a full home address. |
| 5 | Project type | Required | Use an approved list aligned to actual services, plus “Not sure.” |
| 6 | Brief project description | Required, 30-character guidance rather than a hostile minimum | Produces far better fit information than name/phone alone. Prompt for property type, areas involved, and desired outcome. |

#### Progressive optional qualification

| Field | Requirement | Guidance |
|---|---|---|
| Full project address | Optional initially | Ask later if the prospect is not ready to disclose it. |
| Desired timing | Optional | “As soon as practical,” 1–3, 3–6, 6–12, 12+ months, planning only. |
| Property status | Optional | Owner occupied, vacant, investment property, under contract, other. |
| Budget range | Optional | Keep “Need help defining a budget” and “Prefer not to say.” Ranges must match actual project minimums before publication. |
| Preferred contact method/time | Optional | Call, text, or email only if the business operationally supports each channel. |
| Photos or plans | Optional | Up to a small verified file count/size; secure MIME/size rules and scanning are prerequisites. Never make uploads required. |
| Referral source | Optional | Better stored through analytics/CRM attribution; do not add friction above the submit button. |
| Marketing opt-in | Optional and separate | Keep transactional project-response disclosure separate from promotional consent; store purpose, timestamp, source, and disclosure version. |

### Recommended form copy

**Heading:** Tell Us About Your Project  
**Intro:** Share the basics below. Our team will review the location, project type, and scope before recommending the next step.  
**Project-description prompt:** “What are you hoping to change? Include the property type, rooms or systems involved, and any known damage, plans, or permit concerns.”  
**Button:** **Request a Project Review**  
**Under-button disclosure:** “Submitting this form asks Golden Brick Construction to respond about this project. It does not create a contract, final price, or construction start date. See our Privacy Policy.”

**Recommended confirmation message:**

> Thanks—your project details are in. A Golden Brick project coordinator will review the location and scope and contact you within **[insert the response window the company can consistently meet]**. If the project appears to be a fit, the next step is a phone review and, when appropriate, a walkthrough. Need a faster answer? Call (267) 715-5557.

Do not publish a response-time claim until operations confirms it.

### Recommended placement

- Header: persistent phone and Project Review action.
- Homepage: hero actions; after first proof/case-study block; compact form near the end.
- Service pages: page-specific call/project-review pair after scope/fit content and again after proof/FAQ.
- Case studies: one low-pressure action after the outcome, tied to the same project type.
- Guides: contextual CTA after the visitor receives the answer, not before it.
- Mobile: sticky Call/Project Review bar after runtime testing.
- Footer: phone, service area, credentials, and one clear project-review action.

### Conversion tracking assessment

`site.js` emits `form_start`, `generate_lead`, phone, email, CTA, estimate, social, review, and project interactions. This is a useful foundation. Confirmed weaknesses are incomplete source/medium/campaign-only attribution, loss of UTM data on the bathroom form, no structured UTM storage in the backend, no validation/server-error event, and a possible future double-dispatch risk if Google Tag Manager listeners are added beside the current `gtag` path. GA4 receipt and key-event configuration are externally unverified.

Measure a funnel of **qualified inquiry → reached lead → walkthrough → estimate sent → won project**, segmented by page/service/area. Raw `generate_lead` volume alone can reward spam or poor-fit inquiries.

---

## 8. Complete SEO report

### 8.1 Technical SEO: confirmed findings

| Area | Finding | Assessment and action | Evidence class |
|---|---|---|---|
| Indexability | `sitemap.xml` is valid and its 42 URLs exactly equal the 42 indexable self-canonicals. All use `index, follow, max-image-preview:large`. | Strong. Preserve. Add accurate `lastmod` only when a build process can maintain it truthfully. | Confirmed |
| Private routes | `/client/`, `/estimate/`, and `/staff/` are noindex/nofollow/noarchive and omitted from the sitemap; `/404.html` is `noindex, follow`. | Strong. Authentication remains the security boundary; robots/noindex is only search control. | Confirmed |
| robots.txt | Valid, points to the correct sitemap, and disallows private/data paths. | Strong. Note that blocking a URL can prevent crawlers from seeing its page-level noindex; continue using auth and response headers for private content. | Confirmed |
| Static rendering | Core page content is server-readable static HTML. Projects have six static fallback cards before Firestore enhancement. | Strong. Reviews are the important exception because review text is fetched after load. Add a crawlable last-known review snapshot and always-visible source link. | Confirmed |
| Status codes | Code/config cannot prove live HTTP responses. Twenty explicit directory-`index.html` 301s exist with no configured chains. Several other exact-file aliases have no explicit rule. | Crawl production for HTTP→HTTPS, non-www→www, slash/`index.html`, canonical, arbitrary 404, and redirect chains. Do not add redirects based only on assumption. | Confirmed config + external verification |
| Canonicals | Every indexable page has a self-canonical using the public hostname. | Strong. Verify Google's selected canonical in Search Console. | Confirmed + external verification |
| Metadata | All 42 pages have unique titles/H1s and descriptions. Homepage/About share the only duplicate description. Two case-study descriptions looked truncated to simple parsers because of apostrophes but are complete in source. | Rewrite homepage/About and use consistent quote-safe markup. Apply the page matrix below. | Confirmed |
| Headings | One unique H1 per indexable page. Seven pages jump from H1 to H3. | Add an actual H2 or promote the card group heading; do not choose heading levels for visual size. | Confirmed |
| Internal links | A scan of 2,260 references found no missing local page, asset, form-action target, or fragment after accounting for rewrites. No indexable page is orphaned in raw HTML. | Strong. Improve contextual case-study linking; three project pages have only one source inlink. | Confirmed |
| URL structure | Current URLs mix root `.html` and slash directories. | Not a ranking defect by itself. Keep stable unless a controlled migration has a clear benefit and complete redirect/canonical/internal-link plan. | Best practice |
| Image SEO | All 53 parsed content images have nonempty alt, lazy loading, and explicit dimensions. Many pages use CSS-only hero backgrounds. | Preserve the fundamentals. Use `<picture>/<img>` for meaningful hero/project imagery so it has responsive source selection and semantic alt; keep decorative images empty-alt. | Confirmed + best practice |
| Image weight/cache | Responsive assets exist, but several CSS heroes load originals. One-year `immutable` caching is applied to descriptive filenames that can be overwritten. | Use responsive `image-set()` or `<picture>`; content-hash immutable files or shorten cache for mutable media. Measure LCP before and after. | Confirmed |
| JavaScript SEO | Navigation/footer are altered by `site.js`; runtime menu omits rowhome, full-gut, and basement and removes Reviews links. Review copy is API-only. | Generate shared navigation at build time and preserve relevant static links. Keep dynamic reviews but provide a static accessible fallback. | Confirmed |
| Structured data | All JSON-LD parses. Types include Organization, GeneralContractor/HomeAndConstructionBusiness, Service, Article, WebPage, BreadcrumbList, AboutPage, ContactPage, and CollectionPage. | Standardize one stable organization/contractor entity graph, add page-level Service/Breadcrumb nodes where appropriate, and validate after edits. | Confirmed + best practice |
| Breadcrumb schema | Twenty-three pages show breadcrumbs but omit `BreadcrumbList`. | Add markup matching the visible trail. | Confirmed |
| FAQ schema | Twenty pages show FAQs without FAQPage JSON-LD because `site.js` exits when static schema exists. | Optional semantic improvement only; Google generally restricts FAQ rich results, so do not forecast snippets. Schema must match visible copy exactly. | Confirmed + best practice |
| Article/schema images | Six guide Articles omit `image`; publisher lacks a useful logo reference. County Service nodes repeat the full service area. | Add relevant guide images and a corrected logo asset; narrow page-level Service area while keeping full area on the business entity. | Confirmed |
| Reviews schema | No self-serving aggregate-rating recommendation is made. | Keep externally sourced reviews transparent. Do not add review markup solely to chase stars; validate policy eligibility first. | Best practice |
| Social metadata | All indexable pages have base Open Graph metadata. Twitter card is absent on ten pages; `og:image:alt` and dimensions are inconsistent. | Add complete image metadata to shared templates. | Confirmed |
| Logo/favicon/manifest | SVG and ICO favicons exist. `images/logo.jpg` contains PNG data. There is no manifest/Apple touch icon. | Correct logo extension/MIME and provide clean square/wordmark assets. Manifest/touch icon are low priority for this brochure site. | Confirmed |
| 404 | `404.html` uses relative favicon, stylesheet, and contact paths, which resolve incorrectly on nested unknown URLs. Copy says the page is not in the “current build,” and its rounded/pill look is out of system. | Use root-relative URLs, homeowner-friendly copy, normal site header/footer, search/helpful destinations, and confirm production returns HTTP 404. | Confirmed + external status verification |
| HTTPS/mixed content | No insecure `http://` fetch/source was found in the current public source. Firebase normally serves HTTPS. | Verify production HTTPS, HSTS, mixed content, response headers, and hostname canonicalization. | Confirmed source + external verification |

### 8.2 Complete on-page SEO inventory and recommendations

The following inventory covers every indexable page. “Keep current” means the current metadata remains the exact recommendation; content changes in the last column still apply. Keyword choices are intent assignments, not ranking claims.

#### Core, trust, and hub pages

| URL | Purpose, search intent, and keywords | Current → recommended title | Current → recommended meta description | H1, depth, links, and disposition |
|---|---|---|---|---|
| `/` | Brand/conversion. Primary: **Philadelphia general contractor**. Secondary: Philadelphia construction company, home renovation contractor, row-home contractor. | `General Construction Company \| Golden Brick Construction` → `Golden Brick Construction \| Philadelphia General Contractor` | Current: “Golden Brick is a general construction company specializing in full-home renovations, kitchens, bathrooms, additions, new construction, and multifamily projects.”<br>Recommended: “Golden Brick manages row-home renovations, kitchens, bathrooms, additions, full-home remodels, and select new construction across Philadelphia and nearby counties.” | Current H1: “General Construction Company.” Change to “Philadelphia General Contractor for Renovations and Construction,” with row-home expertise in the support line. 645 main words and good service/process/project links. **Retain route; major revision.** |
| `/residential.html` | Residential service hub. Primary: **home renovation services Philadelphia**. Secondary: kitchen, bathroom, additions, full-home renovation. | `General Construction Services \| Golden Brick` → `Home Renovation Services in Philadelphia \| Golden Brick` | Current: “Golden Brick provides full-home renovations, kitchens, bathrooms, additions, custom homes, new construction, multifamily buildings, and mixed-use construction.”<br>Recommended: “Explore Golden Brick’s Philadelphia-area renovation services, from kitchens and bathrooms to row homes, full-home projects, additions, basements, and new construction.” | H1 “General Construction Services” should become “Philadelphia Home Renovation Services.” Strong 845-word hub. Make its hub role explicit and link every verified core service. **Retain/revise.** |
| `/projects.html` | Portfolio/project discovery. Primary: **Philadelphia renovation projects**. Secondary: contractor portfolio, row-home renovation examples. | `Construction Projects \| Golden Brick` → `Philadelphia Renovation Projects \| Golden Brick Construction` | Current: “View selected Golden Brick construction projects, including finished homes, full-property renovations, multifamily buildings, and mixed-use work.”<br>Recommended: “See Golden Brick renovation and construction projects across Philadelphia and nearby suburbs, including row homes, whole-home, multifamily, and mixed-use work.” | H1 capitalization should become “Philadelphia Renovation Projects.” Static fallback cards are strong. Add service/location filters and factual project summaries. **Retain/revise.** |
| `/process/` | Trust/process. Primary: **renovation process Philadelphia**. Secondary: contractor estimate process, construction change orders. | `Our Renovation Process \| Golden Brick Construction` → `Philadelphia Renovation Process \| Golden Brick Construction` | Keep current: “See how Golden Brick handles project inquiry, phone review, walkthrough, written estimate, contract, permits, construction updates, change orders, and closeout.” | H1 is accurate. Link steps to estimate, protections, permits, and representative projects. Add verified response/decision timelines. **Retain/expand.** |
| `/reviews/` | Branded trust. Primary: **Golden Brick Construction reviews**. Secondary: Philadelphia contractor reviews. | Keep `Google Reviews \| Golden Brick Construction Philadelphia` | Keep current: “Read recent, unedited Google reviews for Golden Brick Construction and see the current rating reported by the company’s verified Google Business Profile.” | Strong H1; only ~142 static words. Add a server-rendered/static snapshot, dates/source disclosure, and hard-coded verified Google link. Restore Reviews navigation visibility. **Retain/strengthen.** |
| `/about.html` | Brand/company evaluation. Primary: **Golden Brick Construction**. Secondary: Philadelphia contractor, licensed contractor. | `About Golden Brick \| General Construction Company` → `About Golden Brick Construction \| Philadelphia Contractor` | Current: “Golden Brick is a general construction company specializing in full-home renovations, kitchens, bathrooms, additions, new construction, and multifamily projects.”<br>Recommended: “Learn how Golden Brick Construction manages renovations, additions, new construction, and multifamily projects across Philadelphia and nearby Pennsylvania suburbs.” | H1 “About Our Company” → “About Golden Brick Construction.” Add named people, roles, verified history, affiliations, credentials, and authentic portraits/jobsite images. **Retain/major revision.** |
| `/guides/` | Information hub. Primary: **Philadelphia renovation guides**. Secondary: remodeling costs, permits, row homes. | Keep `Philadelphia Renovation Guides \| Golden Brick Construction` | Keep current: “Golden Brick Construction guides to Philadelphia renovation costs, permits, rowhome planning, and realistic remodeling timelines.” | H1 is strong; 205 words. Add useful summaries, reviewed/updated dates, and service/case-study links. **Retain/expand.** |
| `/client-protections/` | Contract/trust education. Primary: **construction contract protections**. Secondary: change orders, allowances, scope. | Keep `Client Protections \| Golden Brick Construction` | Current: “Golden Brick client protections include contractor credentials, written scope, allowances, exclusions, permits, change orders, site protection, cleanup, punch list, and closeout.”<br>Recommended: “See how Golden Brick handles written scope, allowances, exclusions, permits, change orders, site protection, cleanup, punch list, and project closeout.” | H1 is clear. Link from every form and high-risk service page. Keep the honest warranty language until a real commitment is approved. **Retain/light revision.** |
| `/service-areas/` | Local hub. Primary: **Philadelphia-area renovation contractor**. Secondary: Bucks, Montgomery, Delaware, Main Line contractor. | `Areas We Serve \| Golden Brick Construction` → `Philadelphia-Area Service Areas \| Golden Brick Construction` | Keep current: “Golden Brick Construction serves renovation clients in Philadelphia, the Main Line, Bucks County, Montgomery County, and Delaware County.” | H1 is generic but acceptable. Only 187 words. Replace internal-sounding address disclaimer; add real projects/reviews under each area. **Retain/expand.** |
| `/contact.html` | Conversion. Primary: **renovation estimate Philadelphia**. Secondary: contractor quote, project consultation. | `Request a Construction Estimate \| Golden Brick` → `Request a Renovation Estimate in Philadelphia \| Golden Brick` | Keep current: “Tell Golden Brick about your renovation, custom home, new house, multifamily building, or mixed-use construction project—or call the project team directly.” | H1 “Tell Us About Your Project” is strong. Keep process explanation; align CTA with “Project Review,” response window, service-area qualifier, and privacy copy. **Retain/revise.** |
| `/investors.html` | Investor hub. Primary: **investor renovation contractor Philadelphia**. Secondary: rehab contractor, fix and flip, rental renovation. | `Investor Renovation Contractor in Philadelphia \| Golden Brick` → `Philadelphia Investor Renovation Contractor \| Golden Brick` | Keep current: “Investor renovation contractor in Philadelphia for flips, rentals, multifamily rehabs, full guts, due diligence, and managed construction.” | H1 is clear. At 1,725 words, this is the deepest page. Add case links, sample deliverables, project-fit criteria, and verified outcomes. **Retain/clarify hub role.** |
| `/privacy-policy.html` | Legal/branded; not an acquisition target. Primary: **Golden Brick Construction privacy policy**. Secondary: project inquiry privacy. | Keep `Privacy Policy \| Golden Brick Construction` | Keep current: “Privacy Policy for Golden Brick Construction, including how project inquiry information and communication preferences are handled.” | Update substance for GA/session storage/processors and separate marketing consent; legal review required. **Retain/revise policy.** |

#### Residential and construction service pages

| URL | Purpose, search intent, and keywords | Current → recommended title | Current → recommended meta description | H1, depth, links, and disposition |
|---|---|---|---|---|
| `/general-contractor-philadelphia/` | Transactional. Primary: **general contractor Philadelphia**. Secondary: renovation general contractor, licensed contractor, permit coordination. | `General Contractor for Home Renovations in Philadelphia` → `Philadelphia Home Renovation General Contractor \| Golden Brick` | Keep current: “General contractor for Philadelphia home renovations involving kitchens, bathrooms, rowhomes, additions, basements, permits, and trade coordination.” | Strong 730-word page/H1. Keep focused on contractor selection, licensing, permits, and multi-trade coordination to distinguish it from the remodeling overview. **Retain/revise.** |
| `/philadelphia-home-remodeling-contractor/` | Transactional homeowner overview. Primary: **home remodeling contractor Philadelphia**. Secondary: residential remodeling company, home renovation. | Keep `Home Remodeling Contractor in Philadelphia \| Golden Brick` | Keep current: “Home remodeling contractor in Philadelphia for kitchens, bathrooms, basements, additions, rowhome updates, and full-home renovations.” | Useful 899-word page. Keep as homeowner project overview only if Search Console shows distinct intent; otherwise it is a merge candidate with the general-contractor page. **Retain pending data.** |
| `/full-renovation-philadelphia/` | Transactional. Primary: **full-home renovation contractor Philadelphia**. Secondary: whole-house remodel, complete renovation. | `Full Home Renovation Contractor in Philadelphia` → `Philadelphia Full-Home Renovation Contractor \| Golden Brick` | Keep current: “Full home renovation contractor in Philadelphia for whole-house remodels, rowhomes, kitchens, baths, additions, permits, and sequencing.” | H1 is strong. Add full-home vs. full-gut comparison, detailed completed case, and accessible consistent form. **Retain/strengthen.** |
| `/rowhome-renovation-philadelphia/` | High-value local transactional. Primary: **rowhome renovation contractor Philadelphia**. Secondary: Philadelphia row house remodel, old-home renovation. | Keep `Rowhome Renovation Contractor in Philadelphia \| Golden Brick` | Keep current: “Rowhome renovation contractor in Philadelphia for older homes, party walls, tight access, old plumbing and electrical, uneven floors, and phased work.” | Strong 723-word local-condition coverage. Add multiple real cases and move this service into the main menu/homepage promise. **Retain/strengthen.** |
| `/kitchen-remodeling-philadelphia.html` | Transactional. Primary: **kitchen remodeling Philadelphia**. Secondary: kitchen renovation contractor, row-home kitchen remodel. | Keep `Kitchen Remodeling Contractor in Philadelphia \| Golden Brick` | Keep current: “Kitchen remodeling contractor in Philadelphia for layout changes, cabinets, counters, flooring, lighting, finishes, and coordinated construction.” | Detailed 973-word page with useful FAQ/photos. Add one named completed case and verified budget examples. **Retain.** |
| `/bathroom-remodeling-philadelphia.html` | Transactional. Primary: **bathroom remodeling Philadelphia**. Secondary: bathroom renovation contractor, shower remodeling. | `Bathroom Remodeling Contractor in Philadelphia \| Golden Brick` → `Philadelphia Bathroom Remodeling Contractor \| Golden Brick` | Keep current: “Bathroom remodeling contractor in Philadelphia for tile, showers, tubs, vanities, plumbing coordination, finishes, and cleaner closeout.” | At 1,165 words, strongest homeowner service page. Fix embedded form semantics/autofill/attribution; add case and budget proof. **Retain.** |
| `/full-gut-rehab-philadelphia.html` | Transactional homeowner/investor. Primary: **full gut rehab contractor Philadelphia**. Secondary: gut renovation, row-home gut rehab. | Keep `Full Gut Rehab Contractor in Philadelphia \| Golden Brick` | Keep current: “Full gut rehab contractor in Philadelphia for major home renovations, investor rehabs, scope planning, permits, sequencing, and execution.” | Strong 1,069-word depth. Add scope/timeline/permit proof and differentiate from full-home renovation. **Retain.** |
| `/home-additions-philadelphia/` | Transactional. Primary: **home additions contractor Philadelphia**. Secondary: rear addition, first-floor addition, row-home addition. | Keep `Home Additions Contractor in Philadelphia \| Golden Brick` | Keep current: “Home additions contractor in Philadelphia for rear additions, first-floor expansions, structural tie-ins, permits, and finish integration.” | Useful 872 words. Add a verified addition case, planning/structural partners, and official zoning/permit links. **Retain.** |
| `/new-construction/` | Transactional, mixed homeowner/developer intent. Primary: **new construction contractor Philadelphia**. Secondary: custom home builder, multifamily construction. | `New Construction & Custom Homes \| Golden Brick` → `Philadelphia New Construction & Custom Homes \| Golden Brick` | Current: “Golden Brick builds custom homes, new construction houses, multifamily buildings, and mixed-use projects with coordinated plans, permits, trades, and closeout.”<br>Recommended: “Golden Brick manages Philadelphia-area custom homes, new houses, multifamily, and mixed-use construction from plans and permits through trades and closeout.” | Combined H1 is broad. Split custom-home and multifamily only when each can carry real proof and a distinct lead flow. **Retain/revise.** |
| `/basement-finishing-philadelphia/` | Transactional. Primary: **basement finishing Philadelphia**. Secondary: basement remodeling contractor, row-home basement. | Keep `Basement Finishing Contractor in Philadelphia \| Golden Brick` | Keep current: “Basement finishing contractor in Philadelphia for family rooms, offices, guest space, lower-level bathrooms, utilities, and older-home planning.” | Good 846-word scope. Add actual project, water/moisture boundary, egress/ceiling-height considerations, and relevant permit link. **Retain.** |

#### Cost, planning, location, and investor pages

| URL | Purpose, search intent, and keywords | Current → recommended title | Current → recommended meta description | H1, depth, links, and disposition |
|---|---|---|---|---|
| `/kitchen-remodel-cost-philadelphia/` | Informational/commercial. Primary: **kitchen remodel cost Philadelphia**. Secondary: kitchen renovation price, row-home kitchen budget. | Keep `Kitchen Remodel Cost Philadelphia \| Golden Brick` | Current: “Philadelphia kitchen remodel cost guide covering cabinetry, layouts, finishes, permits, older-home conditions, and budget drivers.”<br>Recommended after verified data is added: “See dated Philadelphia kitchen-remodel cost ranges, scope assumptions, older-home factors, and real examples to plan a realistic renovation budget.” | H1 is appropriate. Current 843 words provide only “mid-five figures” and uncited tiers. Add approved numbers/inclusions or retitle as cost factors. **Retain route; major content revision.** |
| `/bathroom-remodel-cost-philadelphia/` | Informational/commercial. Primary: **bathroom remodel cost Philadelphia**. Secondary: shower remodel cost, bathroom renovation pricing. | Keep `Bathroom Remodel Cost Philadelphia \| Golden Brick` | Current: “Philadelphia bathroom remodel cost guide covering tile, plumbing, layout changes, fixtures, and budget factors in older homes.”<br>Recommended after verified data: “See dated Philadelphia bathroom-remodel cost ranges, tile and plumbing assumptions, older-home variables, and real scope examples from Golden Brick.” | H1 is appropriate. No dollar figures despite “budget bands.” Add verified ranges or change the intent/title. **Retain route; major revision.** |
| `/full-home-renovation-cost-philadelphia/` | Informational/commercial. Primary: **full home renovation cost Philadelphia**. Secondary: whole-house remodel price, cost per square foot. | Keep `Full Home Renovation Cost Philadelphia \| Golden Brick` | Current: “Philadelphia full home renovation cost guide covering square-foot pricing, systems upgrades, permits, rowhomes, and budget planning.”<br>Recommended after verified data: “See dated Philadelphia full-home renovation cost ranges, per-square-foot caveats, systems and permit factors, and real scope examples.” | H1 is appropriate. Page deliberately provides no per-square-foot number. Fix content before using the proposed meta; otherwise retitle “Budget Factors.” **Retain route; major revision.** |
| `/philadelphia-rowhome-renovation-guide/` | Informational authority. Primary: **Philadelphia rowhome renovation guide**. Secondary: party walls, old systems, row-home planning. | Keep `Philadelphia Rowhome Renovation Guide \| Golden Brick` | Keep current: “Philadelphia rowhome renovation guide covering party walls, narrow access, old systems, layouts, budgets, and project planning.” | Useful local content but only 541 words and H1→H3 jump. Add source/reviewer, real cases, official links, and stronger service links. **Retain/expand.** |
| `/permits-for-philadelphia-home-renovations/` | Informational authority. Primary: **Philadelphia renovation permits**. Secondary: L&I remodeling permits, EZ permits, eCLIPSE. | Keep `Philadelphia Renovation Permits Guide \| Golden Brick` | Keep current: “Philadelphia renovation permit guide covering zoning, building permits, EZ permits, eCLIPSE, additions, historic review, and planning.” | Good official links and 659 words; H1→H3 jump. Add named reviewer only if truthful and a scheduled review date. **Retain/maintain.** |
| `/how-long-does-a-philadelphia-remodel-take/` | Informational/commercial. Primary: **how long does a Philadelphia remodel take**. Secondary: remodel timeline, permit schedule. | Keep `Philadelphia Remodel Timeline \| Golden Brick` | Current: “Philadelphia remodeling timeline guide for planning, permits, kitchens, bathrooms, basements, additions, and common schedule delays.”<br>Recommended after verified ranges: “See realistic Philadelphia remodel timeline ranges for planning, permits, kitchens, bathrooms, basements, additions, and common delays.” | H1 is strong but the 478-word page gives no durations and jumps H1→H3. Remove “Authority Guide” unless a real expert/source trail supports it. **Retain route; major revision.** |
| `/bucks-county-home-renovation-contractor/` | Local transactional. Primary: **Bucks County renovation contractor**. Secondary: Doylestown, Newtown, Yardley remodeling. | Keep `Bucks County Renovation Contractor \| Golden Brick` | Keep current: “Bucks County renovation contractor for kitchens, baths, basements, additions, and full-home remodeling with organized project management.” | Formulaic 566 words; H1→H3. Add actual county project/review/municipal experience before more town targeting. **Retain/expand.** |
| `/montgomery-county-home-renovation-contractor/` | Local transactional. Primary: **Montgomery County renovation contractor**. Secondary: Abington, Cheltenham, Conshohocken remodeling. | Keep `Montgomery County Renovation Contractor \| Golden Brick` | Keep current: “Montgomery County renovation contractor for kitchens, baths, additions, basements, and full-home remodeling with planning-first support.” | Formulaic 565 words; H1→H3 and one awkward sentence. Add Cheltenham case/review and specific local process. **Retain/expand.** |
| `/delaware-county-home-renovation-contractor/` | Local transactional. Primary: **Delaware County renovation contractor**. Secondary: Media, Havertown, Upper Darby remodeling. | Keep `Delaware County Renovation Contractor \| Golden Brick` | Keep current: “Delaware County renovation contractor for kitchens, baths, additions, basements, and full-home remodeling with planning-led execution.” | Formulaic 571 words; H1→H3. Add real local proof and county/municipality process detail. **Retain/expand.** |
| `/main-line-home-renovation-contractor/` | Local transactional. Primary: **Main Line home renovation contractor**. Secondary: Ardmore, Bryn Mawr, Wayne remodeling. | `Main Line Renovation Contractor \| Golden Brick` → `Main Line Home Renovation Contractor \| Golden Brick` | Keep current: “Main Line renovation contractor for kitchens, baths, additions, basements, and full-home remodels with organized project management.” | Formulaic 583 words; H1→H3. Clarify overlap with Montgomery/Delaware counties and add genuine Main Line proof. **Retain/expand.** |
| `/fix-and-flip-contractor-philadelphia/` | Investor transactional. Primary: **fix and flip contractor Philadelphia**. Secondary: house-flip rehab, resale renovation. | Keep `Fix and Flip Contractor Philadelphia \| Golden Brick` | Keep current: “Philadelphia fix and flip contractor support for investors needing scope review, renovation estimates, budgeting, and managed execution.” | 573 useful words. Add completed resale case, fit/minimum, permit and carrying-cost risk examples. **Retain/expand proof.** |
| `/rental-rehab-contractor-philadelphia/` | Investor transactional. Primary: **rental rehab contractor Philadelphia**. Secondary: rent-ready contractor, buy-and-hold renovation. | Keep `Rental Rehab Contractor Philadelphia \| Golden Brick` | Keep current: “Philadelphia rental rehab contractor for buy-and-hold investors preparing single-family, duplex, multifamily, and rent-ready properties.” | 555 words. Add rental-specific case, durable finish standard, occupancy/turnover boundaries. **Retain/expand proof.** |
| `/multifamily-renovation-contractor-philadelphia/` | Investor transactional. Primary: **multifamily renovation contractor Philadelphia**. Secondary: duplex rehab, apartment renovation. | `Multifamily Renovation Philadelphia \| Golden Brick` → `Multifamily Renovation Contractor Philadelphia \| Golden Brick` | Keep current: “Philadelphia multifamily renovation contractor for duplexes, small apartment buildings, value-add rehabs, unit turns, and repositioning.” | 554 words. Add strong links to triplex/mixed-use cases and state actual unit/property fit. **Retain/revise.** |
| `/investment-property-construction-due-diligence/` | Investor commercial/informational. Primary: **construction due diligence Philadelphia**. Secondary: pre-purchase rehab estimate, renovation feasibility. | Keep `Construction Due Diligence Philadelphia \| Golden Brick` | Keep current: “Construction due diligence for Philadelphia investors reviewing renovation scope, budget risk, permits, and deal feasibility before buying.” | Differentiated 573-word offer. Keep clear that it is not an inspection; show a redacted/sample deliverable only after legal and operational approval. **Retain/strengthen.** |

#### Project case studies

All six routes should remain initially, but each needs materially more verified content. The static main-content scan found only about 120–131 words per case. Planned/in-progress pages must not imply completed outcomes; if substantive evidence cannot be published, temporary `noindex` is better than a thin proof page.

| URL | Intent and keywords | Current → recommended title | Current → recommended meta description | H1, links, missing proof, and disposition |
|---|---|---|---|---|
| `/projects/italian-market-whole-home-renovation/` | Finished local proof. Primary: **Italian Market whole-home renovation**. Secondary: Philadelphia renovation case study. | Keep `Italian Market Whole-Home Renovation \| Golden Brick` | Keep current: “See Golden Brick Construction’s published Italian Market whole-home renovation: a finished two-bedroom, two-and-a-half-bath Philadelphia home.” | H1 is specific. Add existing-condition challenge, verified scope, size, schedule/budget band with permission, permits, finish decisions, result, and row-home/full-home links. **Retain/expand.** |
| `/projects/cheltenham-whole-home-renovation/` | Finished investor resale proof. Primary: **Cheltenham home renovation**. Secondary: investor resale remodel. | Keep `Cheltenham Whole-Home Renovation \| Golden Brick` | Current: “See the published Golden Brick Construction Cheltenham whole-home renovation completed for an investor resale project.”<br>Recommended: “See how Golden Brick renovated a Cheltenham home for investor resale, including drywall, electrical improvements, flooring, paint, kitchen, bath, and repairs.” | Add starting condition, actual work, constraints, outcome, and links from Montgomery/investor/full-home pages. **Retain/expand.** |
| `/projects/west-philadelphia-mixed-use-building-renovation/` | Finished multifamily/local proof. Primary: **West Philadelphia mixed-use renovation**. Secondary: multifamily rehab case study. | Keep `West Philadelphia Mixed-Use Renovation \| Golden Brick` | Keep current: “Published Golden Brick case study for a finished West Philadelphia mixed-use building with one commercial space and two residential units.” | Add systems, unit/commercial scope, approvals, schedule/budget band, complication and outcome. Link from investor, multifamily, full-gut. **Retain/expand.** |
| `/projects/west-philadelphia-triplex-renovation/` | In-progress conversion. Primary: **West Philadelphia triplex renovation**. Secondary: duplex conversion contractor. | Keep `West Philadelphia Triplex Renovation \| Golden Brick` | Current: “Published case study for Golden Brick’s West Philadelphia duplex-to-triplex conversion near University City.”<br>Recommended: “Explore Golden Brick’s West Philadelphia duplex-to-triplex conversion near University City, including three planned units, building systems, and interior scope.” | Only one current source inlink. Label status/date prominently and add approvals, existing condition, unit plan, progress photos, and next milestone. **Retain/expand or temporary noindex.** |
| `/projects/germantown-mixed-use-renovation/` | In-progress mixed-use. Primary: **Germantown mixed-use renovation**. Secondary: mixed-use rehab contractor. | Keep `Germantown Mixed-Use Renovation \| Golden Brick` | Keep current: “Published case study for a Golden Brick mixed-use renovation in Germantown planned for five residential units and one commercial space.” | Only one source inlink; preserve enhanced-image disclosure. Add factual status, approvals, existing conditions, progress photos, scope, and links from relevant services. **Retain/expand or noindex.** |
| `/projects/west-philadelphia-former-bank-redevelopment/` | Planned adaptive reuse. Primary: **West Philadelphia adaptive reuse contractor**. Secondary: former bank redevelopment. | Keep `West Philadelphia Former Bank Redevelopment \| Golden Brick` | Current: “Published case study for a planned Golden Brick full-gut redevelopment of a former West Philadelphia bank building.”<br>Recommended: “Explore Golden Brick’s planned full-gut redevelopment of a former West Philadelphia bank into five homes, two commercial spaces, and a roof deck.” | Only one source inlink. Clearly separate approved facts from concept, show status/date/constraints, and add substantive proof; otherwise noindex until work advances. **Retain conditionally.** |

#### Complete H1 inventory

Every indexable page has exactly one H1. The exact values and decisions are below; “keep” refers to the H1 itself, not the rest of the page's heading hierarchy.

| Page | Current H1 | Assessment |
|---|---|---|
| `/` | General Construction Company | **Revise:** add Philadelphia and renovation positioning. |
| `/about.html` | About Our Company | **Revise:** “About Golden Brick Construction.” |
| `/basement-finishing-philadelphia/` | Basement Finishing Contractor in Philadelphia | Keep. |
| `/bathroom-remodel-cost-philadelphia/` | Bathroom Remodel Cost in Philadelphia | Keep; content must supply the promised answer. |
| `/bathroom-remodeling-philadelphia.html` | Bathroom Remodeling Contractor in Philadelphia | Keep. |
| `/bucks-county-home-renovation-contractor/` | Bucks County Home Renovation Contractor | Keep; add an H2 before current H3 group. |
| `/client-protections/` | Client Protections | Keep. |
| `/contact.html` | Tell Us About Your Project | Keep. |
| `/delaware-county-home-renovation-contractor/` | Delaware County Home Renovation Contractor | Keep; add an H2 before current H3 group. |
| `/fix-and-flip-contractor-philadelphia/` | Fix and Flip Contractor Philadelphia | Keep. |
| `/full-gut-rehab-philadelphia.html` | Full Gut Rehab Contractor in Philadelphia | Keep. |
| `/full-home-renovation-cost-philadelphia/` | Full Home Renovation Cost in Philadelphia | Keep only after content satisfies cost intent. |
| `/full-renovation-philadelphia/` | Full Home Renovation Contractor in Philadelphia | Keep. |
| `/general-contractor-philadelphia/` | General Contractor for Home Renovations in Philadelphia | Keep. |
| `/guides/` | Philadelphia Renovation Guides | Keep. |
| `/home-additions-philadelphia/` | Home Additions Contractor in Philadelphia | Keep. |
| `/how-long-does-a-philadelphia-remodel-take/` | How Long Does a Philadelphia Remodel Take? | Keep; add actual ranges and correct H2/H3 structure. |
| `/investment-property-construction-due-diligence/` | Investment Property Construction Due Diligence | Keep; location is adequately handled in support/title. |
| `/investors.html` | Investor Renovation Services | Consider “Philadelphia Investor Renovation Services” for local clarity; current is acceptable. |
| `/kitchen-remodel-cost-philadelphia/` | Kitchen Remodel Cost in Philadelphia | Keep; add verified cost data. |
| `/kitchen-remodeling-philadelphia.html` | Kitchen Remodeling Contractor in Philadelphia | Keep. |
| `/main-line-home-renovation-contractor/` | Main Line Home Renovation Contractor | Keep; add an H2 before current H3 group. |
| `/montgomery-county-home-renovation-contractor/` | Montgomery County Home Renovation Contractor | Keep; add an H2 before current H3 group. |
| `/multifamily-renovation-contractor-philadelphia/` | Multifamily Renovation Contractor Philadelphia | Keep. |
| `/new-construction/` | New Construction Homes, Multifamily & Mixed Use | Keep while the combined page remains; split if future page intents separate. |
| `/permits-for-philadelphia-home-renovations/` | Permits for Philadelphia Home Renovations | Keep; add an H2 before current H3 group. |
| `/philadelphia-home-remodeling-contractor/` | Home Remodeling Contractor in Philadelphia | Keep pending cannibalization review. |
| `/philadelphia-rowhome-renovation-guide/` | Philadelphia Rowhome Renovation Guide | Keep; add an H2 before current H3 group. |
| `/privacy-policy.html` | How We Handle Project Inquiry Information | Keep; descriptive and human-readable. |
| `/process/` | The Golden Brick Renovation Process | Keep. |
| `/projects.html` | Construction projects | **Revise:** “Philadelphia Renovation Projects” and normalize capitalization. |
| `/projects/cheltenham-whole-home-renovation/` | Cheltenham Whole-Home Renovation | Keep. |
| `/projects/germantown-mixed-use-renovation/` | Germantown Mixed-Use Renovation | Keep; surface status. |
| `/projects/italian-market-whole-home-renovation/` | Italian Market Whole-Home Renovation | Keep. |
| `/projects/west-philadelphia-former-bank-redevelopment/` | West Philadelphia Former Bank Redevelopment | Keep; surface planned status. |
| `/projects/west-philadelphia-mixed-use-building-renovation/` | West Philadelphia Mixed-Use Building Renovation | Keep. |
| `/projects/west-philadelphia-triplex-renovation/` | West Philadelphia Triplex Renovation | Keep; surface in-progress status. |
| `/rental-rehab-contractor-philadelphia/` | Rental Rehab Contractor Philadelphia | Keep. |
| `/residential.html` | General Construction Services | **Revise:** “Philadelphia Home Renovation Services.” |
| `/reviews/` | What Philadelphia Homeowners Say About Golden Brick Construction | Keep. |
| `/rowhome-renovation-philadelphia/` | Rowhome Renovation Contractor in Philadelphia | Keep. |
| `/service-areas/` | Areas We Serve | Consider “Philadelphia-Area Service Areas”; current is acceptable. |

### 8.3 Content overlap and internal-link architecture

The following is **confirmed intent overlap**, not proof of a duplicate-content penalty:

- `/` should own brand + broad Philadelphia general-contractor intent.
- `/residential.html` should be the service hub.
- `/general-contractor-philadelphia/` should own licensing, hiring, permit, and multi-trade coordination intent.
- `/philadelphia-home-remodeling-contractor/` should own the homeowner remodeling overview—or be merged into the general-contractor page if Search Console shows the same queries and weak distinct performance.
- `/full-renovation-philadelphia/` should own whole-home scope short of full gut.
- `/full-gut-rehab-philadelphia.html` should own stripped-to-structure/systems replacement and investor-heavy scope.
- `/rowhome-renovation-philadelphia/` should own Philadelphia housing-type expertise and become a flagship page.

Do not redirect any of these until Search Console, backlinks, conversions, and current indexed canonical/query data are reviewed. First revise titles, headings, copy, links, and page roles; measure; then merge only where overlap remains.

Recommended contextual linking pattern:

`Service page → relevant cost/permit/row-home guide → completed case study → process/protections → project review`

`Location page → local case/review → relevant service → project review`

`Case study → service + location + challenge-specific guide → related case → project review`

Avoid solving discoverability by adding dozens of global footer links. Contextual links communicate intent more clearly and are more useful to visitors.

### 8.4 Local SEO assessment

#### Confirmed strengths

- Public business name and phone are consistent across shared page data and click-to-call links.
- Service areas are repeatedly stated as Philadelphia, Bucks, Montgomery, Delaware, and the Main Line.
- The site has dedicated county/Main Line pages and neighborhood-specific project routes.
- Philadelphia row-home content uses real local constraints rather than merely inserting place names.
- Public credentials distinguish PA HIC registration from a Philadelphia GC license number.
- GeneralContractor/HomeAndConstructionBusiness, Service, and area-served schema are already present.

#### Confirmed weaknesses

- Public copy contains internal defensive language about not publishing an “unverified” address. A separate backend configuration contains an address while the public business object is service-area-only. Do not expose or change either until GBP/legal business details are reconciled.
- County pages are locally named but lack local project photos, customer proof, named municipalities tied to actual work, and area-specific approval/stock insight.
- Critical stated services lack landing pages and local proof.
- Review content depends on an API/JavaScript path, and runtime code removes Reviews navigation links.
- Credentials are not linked to official verification pages.
- Permit/cost/authority content lacks enough dated source/reviewer detail.

#### Recommendations

- Align the public legal name, phone, website, primary GBP category, secondary categories, service areas, and address visibility only after GBP access confirms the official record.
- Display **PA Home Improvement Contractor Registration** and **Philadelphia contractor license** as separate items. Pennsylvania generally registers rather than licenses home-improvement contractors; registration is not an endorsement of skill. Link to the [PA HIC search](https://hicsearch.attorneygeneral.gov/) and [Philadelphia contractor lookup](https://li.phila.gov/contractor-lookup) after confirming the exact legal entity and active records.
- Enrich current location pages before adding more. A useful page needs a real project/review, homes/project types actually handled, municipalities actually served, travel/scheduling expectations, and locally relevant planning notes. Do not mass-produce neighborhood doorway pages.
- Use project case studies as the main neighborhood/local content engine. Named neighborhoods plus factual property type, scope, permit path, and outcome are stronger than a templated “contractor in [place]” page.
- Cite primary sources where facts can change: [Philadelphia building permits](https://www.phila.gov/services/permits-violations-licenses/apply-for-a-permit/building-and-repair-permits/get-a-building-permit/), [zoning permits](https://www.phila.gov/services/permits-violations-licenses/apply-for-a-permit/zoning-permits/get-a-zoning-permit/), [eCLIPSE public search](https://eclipse.phila.gov/phillylmsprod/pub/lms/Default.aspx?PosseMenuName=PC_Search), [L&I Property History](https://li.phila.gov/Property-History), [Atlas](https://atlas.phila.gov/), [Historical Commission](https://www.phila.gov/departments/philadelphia-historical-commission/), the [Philadelphia Rowhouse Manual](https://www.phila.gov/documents/philadelphia-rowhouse-manual-a-practical-guide-for-homeowners/), and [EPA RRP requirements](https://www.epa.gov/lead/renovation-repair-and-painting-program-contractors).
- Add Service and Breadcrumb schema that matches each visible page. Add FAQ schema only when it exactly matches on-page questions; do not promise rich results.
- Pursue citations/links through legitimate relationships: architects/engineers/designers, suppliers, neighborhood/community organizations, chambers, trade associations, project partners, local press, and permitted project/award coverage. Do not buy directory links or create fabricated partnerships.
- If there is no client-facing office, do not add a map/directions block or public address merely for SEO. A service-area statement is appropriate. If there is a staffed public location, verify it and align the website/GBP/citations before publishing.

### 8.5 Philadelphia competitor benchmark

These are pattern benchmarks, not confirmed ranking leaders.

| Competitor | Strong pattern | Golden Brick opportunity |
|---|---|---|
| [Match Remodeling](https://www.matchremodeling.com/) ([process](https://www.matchremodeling.com/process), [portfolio](https://www.matchremodeling.com/featuredwork)) | Immediate row-home positioning, named people, process depth, and neighborhood project narratives. | Match the local specificity while adding budget bands, duration, permit path, investor outcomes, and clearer availability/fit. |
| [Buckminster Green](https://www.buckminstergreen.com/) ([cost guidance](https://www.buckminstergreen.com/what-s-this-going-to-cost), [studio/process](https://www.buckminstergreen.com/the-studio)) | Memorable “Philadelphia's Rowhouse Remodeler” niche, deep neighborhood cases, published minimum/pricing guidance, and visible certifications. | Publish Golden Brick's own verified and caveated price data; combine row-home authority with investor-grade management without copying wording or premium-luxury styling. |
| [Bellweather Design-Build](https://bellweatherdesignbuild.com/) ([process](https://bellweatherdesignbuild.com/approach/our-process/), [FAQ](https://bellweatherdesignbuild.com/contact/faqs/), [portfolio](https://bellweatherdesignbuild.com/portfolio/)) | Named team, detailed process/FAQ, outside review sources, neighborhood portfolio, and a stated limited warranty. | Add people and an evidence-rich trust stack; publish an exact workmanship commitment only if operations/legal can support it. |
| [Myers Constructs](https://myersconstructs.com/) ([buyer's guide](https://myersconstructs.com/about/buyers-guide/), [pre-buy consultation](https://myersconstructs.com/consulting/home-buyers-pre-buy-inspection/)) | Strong contractor-selection education and pre-purchase consulting. | Productize investor pre-acquisition feasibility with clear limits, deliverable, price, and next step. |
| [Wayne Construction Group](https://www.wayneconstructiongroup.com/) ([services](https://www.wayneconstructiongroup.com/services), [story](https://www.wayneconstructiongroup.com/ourstory)) | Direct investor language around capital, pro formas, scheduling, and compliance. | Keep the investor clarity but surpass it with licenses, reviews, actual case-study metrics, homeowner reassurance, and proof. |

The defensible market position is: **Philadelphia row-home and complex renovation expertise, managed with investor-grade scope, schedule, documentation, and communication.** Generic claims about transparency, quality, or “on time and on budget” are not differentiators and should never be used without evidence.

### 8.6 Practical content strategy for qualified leads

1. **Proof before volume:** Complete three flagship cases first—one homeowner row home, one whole-home/suburban project, one investor/multifamily project.
2. **Repair existing high-intent pages:** Add verified cost and schedule ranges, scope assumptions, exclusions, and update dates before writing new blog posts.
3. **Align services:** Publish roofing, water-damage restoration, and finishes pages only after scope, credentials, response model, photos, and lead routing are confirmed.
4. **Human authority:** Add named author/reviewer boxes to permit/row-home/cost guides only when those people truly reviewed the material.
5. **Question-led FAQs:** Answer project minimum, estimate process, insurance, permits, occupied-home protection, lead-safe work, changes, payment schedule, schedule risks, material procurement, warranty, and service-area fit.
6. **Investor qualification:** Explain due diligence boundaries, unit/use assumptions, draw documentation, schedule/carrying-cost risk, rental-grade specifications, and change control.
7. **Editorial standard:** Replace abstract “scope/planning/coordination” sentences with a specific condition, decision, action, and consequence. Remove internal verification disclaimers from customer-facing copy.
8. **Update discipline:** Put “Reviewed/updated [date]” only where a named owner has a recurring review process. Cost/permit claims age quickly.

---

## 9. Design and branding report

Because current browser rendering was unavailable, this section distinguishes **source/CSS/image findings** from items needing visual confirmation.

### Overall first impression

The source defines a restrained and credible contractor system: near-black text, gold accents, warm surfaces, serif display headings, sans-serif body copy, square buttons, fine borders, real project imagery, and structured grids/timelines. It is substantially more professional than a typical template contractor site. The principal weakness is generic identity: the wordmark reads “Golden Brick,” the mark is a simple gold square, and the largest headline says “General Construction Company.” The system looks composed, but the brand does not yet communicate Philadelphia, construction, row homes, or proven people.

### Specific visual recommendations

| Element | Confirmed observation | Exact recommendation | Why it matters | Verification |
|---|---|---|---|---|
| Background palette | `style.css` uses `#faf7f1` canvas plus several sand/concrete surfaces; the intended direction calls for white. | Make white the default content/background surface. Use one warm sand tone only for alternating proof/process sections; retain charcoal and gold for anchors. | More architectural, cleaner, and closer to premium-but-approachable than a uniformly beige site. | Compare full-page desktop/mobile screenshots and test text/border contrast. |
| Gold use | Gold/deep gold is controlled and text contrast on white is generally strong. | Keep gold for rules, active states, small credentials, and primary actions. Avoid large gold panels, metallic gradients, and excessive icons. | Preserves trust and avoids “luxury template” styling. | Visual QA plus contrast tests. |
| Typography | Montserrat + Playfair Display provides clear contrast, but H1–H3 are broadly uppercase/letter-spaced. | Keep Playfair for H1 and selected section statements. Use sentence case for most H2/H3, reduce letter spacing on long headings, and keep body measure near 60–75 characters. | Improves scan speed and reduces the editorial/AI-template feel. | Compare reading flow at 320, 390, 768, 1024, and 1440px. |
| Brand lockup | Header/footer display “Golden Brick,” not “Golden Brick Construction.” | Create a restrained full-name lockup: small mark + “Golden Brick Construction,” with an optional “Philadelphia General Contractor” subline on desktop. Do not use a roofline/hammer cliché. | Establishes exact business identity and local category immediately. | Check header width, small-screen truncation, favicon, OG logo, and schema image. |
| Header | Fixed header and compact navigation are strong; menu changes at 1120px. | Keep fixed behavior, simplify menu groups, show phone and Project Review as distinct actions, and make mobile menu a true controlled disclosure with focus return. | Maintains conversion access without visual clutter. | Keyboard and touch testing at all breakpoints. |
| Homepage hero | Large photo-led hero, but generic headline and broad service copy. | Use an authentic Philadelphia row-home/whole-home image with a readable dark overlay; place local H1, one concise supporting sentence, service area, Project Review and Call actions, then credential/review proof. | Makes the five-second message concrete. | Real-device screenshots, contrast, LCP, and comprehension testing. |
| Photography | Several genuine jobsite/finish images are persuasive. Some digitally enhanced assets are transparently labeled; a remote filename references image generation. | Prioritize real before/progress/after sets with factual captions. Treat enhanced images as “concept rendering” and never as project proof; rename published assets neutrally. | Construction buyers judge organization and workmanship visually. | Asset inventory and project-page source labels. |
| Cards/borders/shadows | Main system is mostly consistent and square; the 404 uses rounded/pill styling. | Standardize one border, one subtle shadow, square/2–4px corners, and consistent card padding. Rebuild 404 within the same system. | Prevents template drift. | Component screenshot sheet. |
| Buttons | Primary gold/black and secondary treatments are clear, generally 50px+ tall. | Standardize labels and hierarchy: Project Review (primary), Call (secondary), View Project (text/tertiary). Keep one primary per section. | Reduces decision ambiguity. | CTA inventory plus keyboard/focus testing. |
| Forms | Contact form is visually structured and labels are visible; embedded forms differ. | Build one shared form component with consistent field spacing, states, help text, disclosure, live result panel, and optional-details pattern. | Consistency increases confidence and maintainability. | Empty/error/loading/success screenshots at phone and desktop sizes. |
| Service pages | Layouts are orderly but repeat the same hero/grid/FAQ rhythm and limited photo pool. | Give each service one unique proof sequence: finished result, work-in-progress detail, local constraint, related case, and scope table. | Distinguishes genuine expertise from programmatic copy. | Cross-page visual audit. |
| Projects | Hub and some cases have good imagery; cases lack consistent facts and galleries. | Use a project cover plus fact rail (location, type, status, scope, units/size, permit path, schedule/budget band if approved), before/progress/after gallery, challenge/decision/result narrative. | Converts pictures into credible evidence. | Confirm every fact against project records and image consent. |
| About | Real work photos exist, but no person-led brand story. | Lead with a named principal/team photo, short factual story, roles, how the company works, credential verification, and jobsite standards. | Homeowners hire people, not an abstract process. | Owner fact approval and portrait/jobsite QA. |
| Footer | Contains useful phone, credentials, services, and portal links; some links are injected/removed by JS. | Build a static footer with full name, phone, service area, verified credentials, major service links, privacy, social/review sources, and one CTA. Avoid an address unless GBP/business policy supports it. | Reinforces NAP and trust on every page. | No-JS render and link crawler. |

### Mobile-specific design findings

- **Confirmed source strength:** Hamburger is 44×44px, navigation rows are at least 50px, form fields use 16px input text, and major grids collapse to one column.
- **Confirmed source issue:** At 620px and below, `contact.html` hides breadcrumbs, kicker, hero paragraph, and hero actions. The form moves first at 860px, so the direct phone option is no longer available above it.
- **Confirmed source issue:** The menu opens/closes visually but does not move focus, trap it when appropriate, make background content inert, or reliably return focus on Escape/close.
- **Recommendation:** Preserve the form-first mobile flow but keep a compact `Call (267) 715-5557` action above the form and use a tested sticky two-action bar.
- **External verification required:** Text wrapping, image crop, fixed-header overlap, horizontal overflow, menu scrolling, virtual-keyboard behavior, upload controls, and thumb reach at 320/375/390/430px; tablet at 768/820/1024px; desktop at 1280/1440/1920px.

---

## 10. Page-by-page audit

The SEO metadata details are in Section 8. This inventory adds visitor, conversion, trust, and disposition decisions. “Revise” does not authorize implementation; all routes remain untouched pending approval.

### Core, trust, and utility pages

| Page | Purpose / intended visitor / primary CTA / SEO target | Strengths | Problems and missing information | Recommended disposition |
|---|---|---|---|---|
| `/` | Company overview for homeowners/investors. CTA: Project Review + Call. SEO: Philadelphia general contractor. | Real projects, credential strip, reviews, service/process/area coverage. | Generic first screen; row-home/local promise is delayed; stated service mix is incomplete; defensive address copy. | **Remain; major revision.** |
| `/about.html` | Establish people, history, and operating approach. CTA: Meet the team / Discuss a project. SEO: branded. | Real work photos, credentials, process orientation. | No named owner/team, verified history, roles, portraits, affiliations, or human story; duplicates homepage description. | **Remain; major revision.** |
| `/contact.html` | Convert qualified visitors. CTA: Request a Project Review / Call. SEO: Philadelphia renovation estimate. | Short form, clear four-step expectation, direct phone, accessible labels and result roles. | Mobile phone action hidden above form; weak qualification; no response window; consent mismatch; no upload; backend abuse risk. | **Remain; revise form and mobile flow.** |
| `/process/` | Reduce uncertainty after evaluation. CTA: Start project review. SEO: renovation process Philadelphia. | Written estimate, contract, permits, updates, change orders, closeout are explained. | Needs verified timing, example deliverables, links to protections/permit/cases, and named responsibility. | **Remain; expand.** |
| `/client-protections/` | Show contract/site protections. CTA: Review a project / Contact. SEO: contract protections. | Specific, unusually honest, does not invent warranty terms. | Internal-sounding language in places; no official credential links; exact insurance/warranty process requires approval. | **Remain; light revision.** |
| `/reviews/` | Validate reputation. CTA: View Google source / Contact. SEO: branded reviews. | Transparent live Google feed and source framing. | Only ~142 crawlable words; API/JS failure can remove proof; Reviews links removed at runtime; no static fallback. | **Remain; strengthen and restore discoverability.** |
| `/projects.html` | Portfolio discovery. CTA: View project / Discuss similar work. SEO: Philadelphia renovation projects. | Six static fallback cards; real finished and complex-property range. | Sparse filters/facts; dynamic cover sizes unknown; enhanced/project status distinctions need stronger visual hierarchy. | **Remain; revise hub.** |
| `/guides/` | Authority/content hub. CTA: Read guide, then relevant service/project review. SEO: Philadelphia renovation guides. | Useful cost, permit, row-home, timeline cluster. | Thin hub copy; no author/reviewer/update system; linked guides under-answer price/time intent. | **Remain; expand.** |
| `/service-areas/` | Confirm fit by geography. CTA: Check project fit. SEO: Philadelphia-area contractor. | Names all stated counties/Main Line and links area pages. | Only 187 words; no per-area proof; internal “unverified address” language; GBP alignment unknown. | **Remain; expand with evidence.** |
| `/privacy-policy.html` | Explain information handling. CTA: none beyond contact choices. SEO: branded/legal. | Covers inquiry information and marketing distinction in principle. | Omits GA/device/session storage/processors/choices; conflicts with optional form consent; retention is vague. | **Remain; legal/privacy revision.** |

### Homeowner and general-construction service pages

| Page | Purpose / intended visitor / primary CTA / SEO target | Strengths | Problems and missing information | Recommended disposition |
|---|---|---|---|---|
| `/residential.html` | Complete homeowner service hub. CTA: choose service / Project Review. SEO: home renovation services Philadelphia. | Broad 845-word inventory, proof, FAQs, links. | Overlaps homepage/general contractor/home remodeling; omits clear flagship row-home position and stated restoration/exterior services. | **Remain as service hub; revise.** |
| `/general-contractor-philadelphia/` | Explain hiring/coordination value. CTA: Request project review. SEO: general contractor Philadelphia. | Good licensing, permit, and trade-coordination relevance. | Broad overlap; no project/team proof directly tied to claims. | **Remain with narrow intent; evaluate merge after GSC.** |
| `/philadelphia-home-remodeling-contractor/` | Homeowner remodeling overview. CTA: Explore services / Request review. SEO: home remodeling contractor Philadelphia. | Detailed 899-word local overview. | Highest cannibalization risk with general-contractor and residential hub. | **Remain/reposition now; merge/redirect only if GSC supports it.** |
| `/full-renovation-philadelphia/` | Whole-home renovation lead generation. CTA: Project Review. SEO: full-home renovation contractor. | Clear scope/sequencing, embedded form. | Needs full-home vs full-gut boundary, detailed case, schedule/budget proof; form result accessibility inconsistent. | **Remain; strengthen.** |
| `/rowhome-renovation-philadelphia/` | Flagship Philadelphia housing-type service. CTA: Discuss a row-home project. SEO: rowhome renovation contractor Philadelphia. | Strong party-wall/access/older-system detail. | Buried in navigation; insufficient linked project proof; “rowhome” spelling should be editorially consistent while still covering “row house” naturally. | **Remain; promote as flagship.** |
| `/full-gut-rehab-philadelphia.html` | Major gut-renovation/investor scope. CTA: Scope review. SEO: full gut rehab contractor. | Deep content and appropriate complex-project intent. | Needs facts from a completed gut case, permit/system replacement examples, full-home comparison. | **Remain; strengthen.** |
| `/kitchen-remodeling-philadelphia.html` | Kitchen lead generation. CTA: Kitchen project review. SEO: kitchen remodeling Philadelphia. | Depth, FAQ, process, real photos, local conditions. | No dedicated finished kitchen case with facts; verified range/minimum absent. | **Remain; add proof.** |
| `/bathroom-remodeling-philadelphia.html` | Bathroom lead generation. CTA: Bathroom project review. SEO: bathroom remodeling Philadelphia. | Deepest homeowner page, embedded conversion, good scope coverage. | Form lacks autofill hints/live roles/privacy link and loses UTM data; no factual case/budget example. | **Remain; fix form and add proof.** |
| `/home-additions-philadelphia/` | Addition lead generation. CTA: Feasibility/project review. SEO: home additions contractor Philadelphia. | Structural tie-in, permits, and finish integration discussed. | No addition case; zoning/design/engineering relationship and realistic schedule/budget fit unclear. | **Remain; add proof.** |
| `/basement-finishing-philadelphia/` | Basement lead generation. CTA: Basement project review. SEO: basement finishing Philadelphia. | Good family/office/bath/utilities/older-home coverage. | No completed case; water intrusion/egress/ceiling-height boundaries need clarity. | **Remain; add proof and boundaries.** |
| `/new-construction/` | Custom home, multifamily, mixed-use leads. CTA: Discuss plans/site. SEO: new construction contractor Philadelphia. | Plans-to-closeout flow and varied project types. | Combines divergent homeowner/developer intents; proof is lighter than scope breadth; user-stated core services are less visible than this category. | **Remain; narrow or split only when proof supports it.** |

### Cost, permit, and planning guides

| Page | Purpose / intended visitor / primary CTA / SEO target | Strengths | Problems and missing information | Recommended disposition |
|---|---|---|---|---|
| `/kitchen-remodel-cost-philadelphia/` | Help budget-qualified kitchen prospects. CTA: Review scope. SEO: kitchen remodel cost. | Explains cabinetry/layout/finish/permit drivers. | Only “mid-five figures”; no verified bands, scope examples, citations, or date. | **Remain; add real ranges or retitle to cost factors.** |
| `/bathroom-remodel-cost-philadelphia/` | Help budget-qualified bathroom prospects. CTA: Review scope. SEO: bathroom remodel cost. | Explains tile/plumbing/layout variables. | No dollar figures despite “budget bands”; uncited vague external claim. | **Remain; add real ranges or retitle.** |
| `/full-home-renovation-cost-philadelphia/` | Qualify whole-home prospects. CTA: Scope review. SEO: full-home renovation cost. | Good systems/permit/row-home drivers. | Meta promises square-foot pricing; body supplies none. | **Remain; fix content/metadata together.** |
| `/how-long-does-a-philadelphia-remodel-take/` | Set schedule expectations. CTA: Plan project. SEO: remodel timeline. | Explains phases/delay causes. | No duration ranges; “Authority Guide” unsupported; H1→H3. | **Remain; add verified ranges and reviewer.** |
| `/permits-for-philadelphia-home-renovations/` | Explain local approvals. CTA: Discuss permit-sensitive project. SEO: Philadelphia renovation permits. | Links official resources and covers zoning/EZ/historic review. | H1→H3; needs maintained review date and named reviewer if truthful. | **Remain; maintain as authority page.** |
| `/philadelphia-rowhome-renovation-guide/` | Educate row-home owners and support flagship service. CTA: View row-home work / Project Review. SEO: rowhome renovation guide. | Valuable party-wall/access/system content. | Only 541 words, H1→H3, too little case/source depth for “guide” leadership. | **Remain; substantially expand.** |

### Service-area pages

| Page | Purpose / visitor / CTA / SEO target | Strengths | Problems and missing information | Recommended disposition |
|---|---|---|---|---|
| `/bucks-county-home-renovation-contractor/` | Bucks homeowners. CTA: Check fit. SEO: Bucks County renovation contractor. | Clear service coverage and municipality references. | Templated, no real Bucks proof, H1→H3. | **Remain; enrich before adding more Bucks pages.** |
| `/montgomery-county-home-renovation-contractor/` | Montgomery homeowners. CTA: Check fit. SEO: Montgomery County contractor. | Cheltenham project can support relevance. | Project not strongly integrated; templated; awkward sentence; H1→H3. | **Remain; enrich and edit.** |
| `/delaware-county-home-renovation-contractor/` | Delaware County homeowners. CTA: Check fit. SEO: Delaware County contractor. | Clear geographic offer. | No local case/review/municipal expertise; H1→H3. | **Remain; enrich.** |
| `/main-line-home-renovation-contractor/` | Main Line homeowners. CTA: Check fit. SEO: Main Line renovation contractor. | Distinct audience and service framing. | Geographic overlap with Montgomery/Delaware; no real project proof; H1→H3. | **Remain; clarify/enrich.** |

### Investor-service pages

| Page | Purpose / visitor / CTA / SEO target | Strengths | Problems and missing information | Recommended disposition |
|---|---|---|---|---|
| `/investors.html` | Investor service hub. CTA: Investor scope review. SEO: investor renovation contractor. | Deepest page; separates flips, rentals, multifamily, full guts, diligence. | Claims need cases/deliverables/outcomes; project minimum and process fit missing. | **Remain; strengthen proof.** |
| `/fix-and-flip-contractor-philadelphia/` | Flip/resale leads. CTA: Scope/deal review. SEO: fix and flip contractor. | Speaks to budget/managed execution. | No clear resale case facts, minimum, or carrying-cost/schedule example. | **Remain; add proof.** |
| `/rental-rehab-contractor-philadelphia/` | Buy-and-hold/rent-ready leads. CTA: Rehab review. SEO: rental rehab contractor. | Relevant property types and investor language. | No durability standard, occupied/vacant boundary, or rental case outcome. | **Remain; add proof.** |
| `/multifamily-renovation-contractor-philadelphia/` | Duplex/small multifamily leads. CTA: Building scope review. SEO: multifamily renovation contractor. | Clear small-building/value-add intent. | Cases are not integrated strongly; unit range, occupancy, permits, and outcomes unclear. | **Remain; add proof.** |
| `/investment-property-construction-due-diligence/` | Pre-acquisition investor evaluation. CTA: Book/Request diligence review. SEO: construction due diligence. | Most differentiated offer; explicitly considers scope, budget risk, permits, deal feasibility. | Deliverable, price, turnaround, legal/inspection boundary, and sample are not sufficiently concrete. | **Remain; productize after operational approval.** |

### Project case studies

| Page | Purpose / visitor / CTA / SEO target | Strengths | Problems and missing information | Recommended disposition |
|---|---|---|---|---|
| `/projects/italian-market-whole-home-renovation/` | Finished homeowner/local proof. CTA: Discuss similar home. SEO: Italian Market renovation. | Finished status, location, bed/bath outcome, photos. | ~120–131 main words; no starting condition, schedule/budget/permit/challenge narrative. | **Remain; expand as flagship row-home case.** |
| `/projects/cheltenham-whole-home-renovation/` | Finished investor resale proof. CTA: Discuss resale rehab. SEO: Cheltenham renovation. | Finished investor-use case and real gallery. | Thin facts; no measured outcome, verified duration/budget, complication, or client quote. | **Remain; expand.** |
| `/projects/west-philadelphia-mixed-use-building-renovation/` | Finished mixed-use proof. CTA: Discuss multifamily/mixed-use. SEO: West Philadelphia mixed-use renovation. | Finished status, one commercial/two residential units, gallery. | Thin systems/permit/schedule/budget/outcome detail. | **Remain; expand.** |
| `/projects/west-philadelphia-triplex-renovation/` | In-progress conversion proof. CTA: Discuss conversion. SEO: triplex renovation. | Specific duplex-to-triplex concept/location. | Only one inlink, no inline gallery, thin status/approval/progress facts. | **Remain and expand; noindex temporarily if proof cannot be added.** |
| `/projects/germantown-mixed-use-renovation/` | In-progress mixed-use proof. CTA: Discuss building rehab. SEO: Germantown mixed-use renovation. | Specific planned unit/commercial count; transparent enhanced-image label. | Only one inlink, no inline gallery, planned work may be read as proof, thin details. | **Remain and expand; consider temporary noindex.** |
| `/projects/west-philadelphia-former-bank-redevelopment/` | Planned adaptive-reuse proof. CTA: Discuss complex redevelopment. SEO: West Philadelphia adaptive reuse. | Distinctive property/use concept. | Only one inlink, no inline gallery, plan is not completed experience, few verified facts. | **Remain conditionally; noindex until substantive if needed.** |

### Non-indexable public routes and error state

| Page | Purpose / intended visitor | Strengths | Problems and missing information | Recommended disposition |
|---|---|---|---|---|
| `/404.html` | Recover visitors from missing URL. | Correct noindex directive and clear home action. | Relative assets/contact link break on nested paths; internal “current build” copy; design drift; live 404 status unverified. | **Remain; rebuild and verify true 404.** |
| `/client/` | Existing-client authenticated portal. | Noindex/no-store, no-referrer meta, security/access states, auto-signout. | No skip link; two DOM H1s across states; 30-minute timeout lacks warning/extend action; runtime AT behavior unverified. | **Remain; accessibility/security hardening.** |
| `/estimate/` | Tokenized estimate viewing/signing. | Noindex/no-store; typed-name alternative; live status and validation. | No no-referrer meta; token expiry/rate/payload hardening needed; no skip link; response cache headers need verification. | **Remain; security/accessibility hardening.** |
| `/staff/` | Internal staff CRM exposed through authenticated web route. | Noindex/no-store; multiple useful accessible dialog patterns; protected backend. | Many unlabeled filter/search controls, no skip link, dialog focus-trap inconsistency, huge JS, permission/rule tests missing. | **Remain; internal UX/security refactor.** |

---

## 11. Technical, performance, accessibility, and security findings

### 11.1 Confirmed security and privacy findings

| Severity | Component/file | Confirmed evidence | Required remediation | Verification |
|---|---|---|---|---|
| Critical | `firebase.json`, Hosting public root/cache | Hosting publishes from repository root. The generated upload set is 361 files/~219.6 MB and includes eight debug logs, internal setup Markdown, rules/index configuration, and an internal data template. This report is also root-level and would be eligible unless ignored. | Prefer a dedicated generated `public/` or `dist/` containing only intended files. At minimum add strict exclusions for logs, internal Markdown/audits, rules/indexes, source/config/data, original assets, and private development artifacts. Privately inspect logs and rotate/revoke anything sensitive if warranted. | Inspect Firebase's prepared upload manifest/dry run; deploy to staging; request every excluded path and confirm 404; then confirm CDN purge. Live exposure is currently unverified. |
| High | `functions/src/index.js` `publicLeadIntake`; `site.js` | Endpoint accepts unauthenticated POST/CORS, only requires nonempty name/phone, trims rather than bounds input, creates CRM records immediately, and returns internal identifiers. No rate limit, bot check, honeypot, timing check, dedupe/idempotency, length limits, enum allowlist, or real phone/email validation was found. | Add durable rate limiting, honeypot/minimum-time signal, body/field limits, normalization/validation, allowed enums, idempotency/dedupe, generic response, abuse monitoring, and App Check/reCAPTCHA/Turnstile if risk warrants. Remove internal IDs from public response. | Emulator/staging only: burst returns 429; invalid/oversize returns 400; bad bot signal rejected; one valid request creates one record; response has no IDs. Never test by submitting the live form. |
| High | `functions/.env.golden-brick-construction`, `.gitignore` | Environment-specific file is tracked; `.gitignore` ignores exact `.env` but not all `.env.*`. Values were not reproduced. Hosting excludes `functions/**`, so this is repository/CI risk rather than static Hosting exposure. | Stop tracking environment-specific env files; ignore `.env*` except example; move sensitive/config values to Firebase params/Secret Manager; rotate any secret ever committed; evaluate history cleanup privately. | `git ls-files` excludes live env files; emulator/deploy works from managed configuration; secret scan passes without printing values. |
| High | `contact.html`, `privacy-policy.html`, backend consent field | Form checkbox says contact about the inquiry is optional, while policy says submission itself permits inquiry follow-up; backend stores one undifferentiated boolean. | State that submission permits transactional inquiry response; make marketing opt-in separate, optional, and channel-specific as needed; store purpose/time/version/source. Obtain legal review. | Approved copy matches form/backend/CRM; test consent states; legal owner signs off. |
| High | GA4 tags, `site.js`, privacy policy | GA4 loads unconditionally on 43/46 HTML files; source/medium/campaign is stored in `sessionStorage`. Policy does not disclose analytics/device/storage/processor/choice details. | Accurately disclose GA/storage/processors/retention/choices; implement consent/opt-out behavior where legally required; exclude private/token routes by design. | Legal review; browser storage/network test by consent state and geography. |
| Medium | Firebase Functions shared CORS | Wildcard CORS is broadly applied to public/staff/client APIs. Bearer auth limits some risk, but arbitrary-origin readability is unnecessary. | Allowlist canonical origins and set `Vary: Origin`; do not treat CORS as bot/spam protection. | Cross-origin staging tests: allowed origins succeed, others fail; authenticated clients still work. |
| Medium | `firebase.json`/Functions responses | No repository-defined sitewide CSP, `nosniff`, Referrer-Policy, Permissions-Policy, or `frame-ancestors`; sensitive JSON/PDF responses do not consistently set explicit no-store. | Add `nosniff`, appropriate Referrer-Policy, Permissions-Policy, no-store for sensitive responses, and CSP report-only before enforcement. Inline code requires hashes/nonces or externalization. Verify platform HSTS first. | Inspect actual production headers; CSP report queue is clean; frame and cache tests pass. |
| Medium | Estimate/client token routes | Estimate token can be in URL; estimate page lacks `no-referrer`; no explicit share expiry/TTL was found; signature payload and sign endpoint lack explicit size/rate limits. | Add no-referrer/no-store, payload cap, signing throttle, optional expiry/rotation/revocation UX, and token redaction in logs. | Expired/revoked links fail safely; no token in third-party requests/logs; oversize/rate tests fail predictably. |
| Medium | `storage.rules`, staff upload UI | Paths are permission-gated, but rules impose no size/content-type constraints; client file inputs/upload functions do not consistently constrain type/size. | Enforce category-specific bytes/MIME/path rules server-side, add client hints, and quarantine/scan shared uploads. | Firebase rules tests for invalid MIME/size/path; approved uploads succeed; malware test process documented. |
| Medium | `firestore.rules` record documents | Update authorization checks proposed record linkage but not clearly both old and new association, potentially allowing rebind by a staff user with partial access. | Authorize against both `resource.data` and `request.resource.data`; make ownership/link fields immutable except admin. | Emulator rules tests cover cross-record reassignment, role boundaries, and published/private assets. |

### 11.2 Confirmed performance and reliability findings

| Severity | Finding | Exact recommendation | Verification |
|---|---|---|---|
| High | The current Hosting file-set algorithm includes ~281 image files/~216.9 MB; total upload set is ~219.6 MB. Public pages reference only about 67 local assets totaling ~4.7 MB across the whole site. Large unreferenced source originals are deployment bloat, not necessarily page-transfer cost. | Move source originals outside the deployed directory; deploy only referenced responsive derivatives. Preserve originals until owner approval rather than deleting them. | Compare upload manifest count/bytes and staging page images before/after. |
| Medium | Several 6–10 MB root originals and metadata-bearing source photos are upload-eligible. | Archive privately; strip unnecessary metadata from published derivatives; use neutral descriptive filenames and consent controls. | Deployment manifest excludes originals; EXIF scan of public derivatives is clean. |
| Medium | Several CSS heroes use original WebPs even though much smaller responsive variants exist; `projects.html` preloads a larger original. | Use responsive `<picture>` for semantic heroes or CSS `image-set()`; preload only the selected responsive LCP candidate. | Lighthouse/DevTools at mobile/desktop: transferred bytes and LCP improve without poor crop. |
| Medium | Google review sections initially render three skeleton cards, then may replace them with 6/12 reviews. | Reserve accurate height/count, server-render/cache a stable subset, or paginate/lazy-load below the fold. | Measure CLS in Lighthouse/RUM and simulate slow/error/API-empty states. |
| Medium | All images receive one-year immutable cache despite replaceable descriptive filenames. | Content-hash filenames or reduce cache duration for mutable project/review images. | Replace test asset in staging and confirm new/returning sessions see correct version. |
| Medium | Form fetch has no explicit timeout and no meaningful no-JS fallback; hidden iframe targets can swallow JSON. | Add abort timeout, recoverable retry/call path, server HTML redirect/fallback, and idempotency. | Test offline, 30-second delay, 4xx, 5xx, JS disabled, repeat submit. |
| Medium | Fonts load from Google; exact current waterfall was not measurable. | Self-host only the required weights or optimize preconnect/preload while respecting privacy; avoid extra display weights. | Network waterfall, font swap/CLS, and privacy test. |
| Medium | Shared `site.js` is ~1,379 lines, `style.css` ~2,677 lines, Functions main ~8.3k lines, staff JS ~27.3k lines; navigation/footer and inline styles are duplicated. | Adopt build-time templates/partials, split domains, centralize asset fingerprinting, add ESLint/formatting and focused tests. Retain crawlable static output. | Bundle/file-size and duplicated-markup checks; regression tests and no-JS crawl. |

No page-speed score is assigned. Current Lighthouse, field CWV (LCP/CLS/INP), remote Firebase image weights, third-party waterfall, and mobile CPU cost require production or a functioning local server.

### 11.3 Confirmed accessibility findings

| Severity | Component/pages | Confirmed issue | Exact recommendation | Verification |
|---|---|---|---|---|
| Medium | Global focus CSS | The 2px translucent gold focus outline composites to roughly 1.45–2.14:1 depending on background, below the 3:1 focus appearance benchmark. | Use an opaque dark-gold/black dual ring with at least 3:1 against adjacent colors, plus high-contrast-mode support. | Automated contrast calculation and keyboard review across light/dark controls. |
| Medium | Main navigation | Only 3 of 42 marketing navs label the primary landmark; several breadcrumb navs are unlabeled. | Add `aria-label="Primary navigation"` consistently and `aria-label="Breadcrumb"`; make decorative separators hidden. | Accessibility tree shows uniquely named nav landmarks. |
| Medium | Seven content pages | Bucks, Delaware, Main Line, Montgomery, timeline, permit, and row-home guide pages jump H1→H3. | Add a meaningful H2 for the group or promote headings based on document structure. | Heading outline has no skipped organizational level. |
| Medium | Bathroom/full-renovation forms | Result nodes lack `role=status`/`role=alert`; JS scrolls but does not focus summaries or associate field errors. | Persistent live regions with `aria-atomic`; focus result/error summary; add `aria-invalid` and linked messages; retain native validation where useful. | Keyboard + VoiceOver/NVDA tests for empty, invalid, slow, error, success. |
| Medium | Mobile/desktop menu | Escape removes state but focus can keep `:focus-within` dropdown visible; mobile close can hide a focused descendant; no focus return/management. | Implement controlled disclosures: focus first item when useful, Escape closes and returns to trigger, close restores toggle focus, background state is handled. | Tab/Shift+Tab/Escape at desktop and ≤1120px. |
| Medium | Bathroom form | Name/email/phone/address fields lack consistent `autocomplete`; phone lacks `inputmode=tel`. | Match the contact form's field-purpose metadata. | Mobile autofill/keyboard and accessibility inspector. |
| Low/Medium | Reduced motion | Reveal logic and review animation respect reduced motion, but global smooth scrolling does not. | Under `prefers-reduced-motion: reduce`, set `html { scroll-behavior: auto; }` and audit remaining transitions. | OS reduced-motion testing. |
| Medium | Staff/client/estimate | Staff has multiple unlabeled search/filter controls; private apps lack skip links; multiple state H1s need runtime checking; one staff modal lacks trap/inert; client auto-timeout lacks warning/extension. | Add visible/screen-reader labels, skip links, single exposed H1 per state, reuse focus-trap component, and warn/allow extension where policy permits. | State-by-state accessibility tree and keyboard/AT testing. |

### Accessibility strengths to preserve

- All parsed public content images have nonempty alt text and dimensions; decorative dynamic images generally use empty alt.
- Marketing pages generally have `lang="en"`, one H1, a skip link, and main landmark.
- Contact fields have visible labels, 16px text, helpful autofill attributes, and status/error roles.
- Major navigation/form/button controls are generally 44–54px tall.
- Estimate signing provides a keyboard-usable typed-name alternative and targeted validation.
- Google Reviews rendering uses safe text handling and accessible busy/status patterns.

Static inspection cannot establish WCAG conformance. Automated axe, keyboard, zoom/reflow, Windows High Contrast, VoiceOver, and NVDA tests remain required.

### 11.4 Code-quality and operational findings

- **Confirmed:** Syntax check and all 9 estimate lifecycle tests pass.
- **Confirmed:** No true lint rule set exists; the lint command reports that none is configured.
- **Confirmed:** Navigation/footer duplication plus runtime mutation has already created drift: priority service links are removed/replaced, Reviews links disappear, metadata features vary, and some compact one-line pages are hard to maintain.
- **Confirmed:** Firestore/Storage rules are restrictive by default, but no rules emulator tests were found.
- **Confirmed:** Review and project rendering use escaping/safe DOM patterns in the inspected paths; preserve this.
- **External verification required:** Dependency vulnerabilities because the registry was unreachable; deployed Functions versions, logs, quotas, error rates, uptime, backups, CRM follow-up reliability, and analytics receipt.

---

## 12. Missing pages and content opportunities

New pages should be created only when Golden Brick can supply real scope, proof, and operational answers. A smaller set of credible pages is more valuable than thin location/service pages.

| Opportunity | Need/intent | What the page or expansion must contain | Prerequisites and risk | Recommendation |
|---|---|---|---|---|
| Roofing service | High-intent repair/replacement leads in Philadelphia area. | Exact residential/commercial scope; repair vs replacement; roof types; inspection/estimate process; permit/code boundaries; weather response; real roof photos/case; service area; CTA. | Confirm offered roof types, crew/insurance/license coverage, emergency response, warranties, and photos. Do not imply every roof system. | **High priority after verification.** Dedicated page if this is genuinely a primary service. |
| Water-damage restoration | Urgent high-intent damage leads. | Response hours; stabilization/dry-out/demolition/rebuild boundaries; moisture testing; mold/lead/asbestos boundaries; insurance documentation; licensed specialist relationships; occupied-home safety; urgent call path. | Highest factual/legal risk. Confirm whether Golden Brick performs emergency mitigation, only reconstruction, insurance-claim coordination, and any IICRC/mold credentials. Never claim 24/7 or certified remediation without proof. | **High priority only after operational verification.** A “Water-Damage Repair & Reconstruction” page may be more accurate than “restoration.” |
| Flooring, drywall, and painting | Mid-size interior renovation/repair intent. | Standalone vs bundled scope, occupied-home protection, dust/cleanup, repair/finish standards, materials, photos, minimum project size, CTA. | Determine whether small single-trade jobs are accepted. Avoid attracting low-fit leads if these are only part of larger renovations. | **Medium/high.** One consolidated “Interior Finishes & Repairs” page may be better than three thin pages. |
| FAQ hub | High-intent questions and trust. | Project fit/minimum, estimate process, response time, service area, permits, insurance, occupied homes, lead-safe work, schedule, selections, payments, changes, cleanup, warranty, financing, emergency work. | Answers require owner/legal/operations approval. | **High.** Create a hub and reuse only relevant excerpts on services; avoid identical FAQ blocks everywhere. |
| Team/leadership | Human trust and branded search. | Named principal/leadership, real roles, factual experience, why the company exists, field/project-management responsibilities, portraits/jobsite photography, credentials. | Need names, bios, consent, verified dates/claims. | **High.** Prefer a strong About expansion; add separate Team page only if there are enough people/content. |
| Licensing/insurance verification | Risk reduction near conversion. | Correct PA registration wording, Philadelphia license, official lookup links, “proof of insurance available during qualification/contracting” process, subcontractor/permit explanation. | Verify legal entity, active status, and approved insurance language. Do not publish policy identifiers. | **High.** Integrate into Client Protections and form trust panel; a separate page is optional. |
| Flagship row-home cases | Local differentiation. | Before/progress/after, neighborhood/property type, existing condition, size, scope, permits/approvals, hidden issue, decision, schedule/budget band if permitted, outcome, quote. | Project record accuracy and homeowner consent. | **Highest content priority.** Create at least two complete homeowner row-home cases. |
| Investor proof cases | Qualified investor leads. | Acquisition/start condition, units/square feet, compliance/permit path, planned vs final scope, schedule, budget band, change, draw/reporting, rent/resale outcome where permitted. | Financial facts and client permission. | **High.** Upgrade existing mixed-use/triplex cases before adding more investor landing pages. |
| Before-and-after gallery | Rapid visual trust. | Paired same-angle images, service/location caption, status, link to complete case. | Genuine images and consent; exact pairing. | **Medium.** Use as a homepage/projects module rather than a thin standalone gallery initially. |
| Financing information | Handle a common objection. | Whether financing exists, provider, eligibility/terms disclaimer, or an honest “we do not currently provide financing” answer. | Verified provider/legal disclosures. | **Low/conditional.** Do not create a financing page without a real program. |
| Workmanship commitment | Trust and post-project expectations. | Exact duration, covered work, exclusions, manufacturer vs contractor warranty, claim process, response expectations. | Contract/legal/operations approval. | **High value but conditional.** Keep current honest language until the commitment is supportable. |
| Philadelphia neighborhood pages | Hyperlocal intent. | Unique case, housing stock, approvals, access/parking/logistics, review, service fit, original photos. | Real proof for each area. | **Do not mass-create.** Let case studies carry neighborhood relevance; create a location page only after enough unique evidence exists. |
| Home-addition and full-gut cost guides | High-value qualification. | Dated ranges, scope assumptions, design/engineering/permit allowances, contingency, examples. | Approved historical estimates and careful framing. | **Medium after repairing the three existing cost guides.** |
| Row-home technical education | Authority and qualified organic traffic. | Party walls, joist/masonry conditions, roof decks/pilot houses, rear shed additions, stacked utilities, lead-safe work, historic review, narrow-access logistics. | Named reviewer, official citations, project examples. | **High ongoing cluster.** Every article must link to a relevant service and case, not exist for traffic alone. |

### Content that should be consolidated or expanded before anything new

- Consolidate the role of homepage/residential/general-contractor/home-remodeling pages through intent and internal links. Do not redirect until GSC supports it.
- Expand the six project pages into genuine case studies before publishing more thin project routes.
- Repair the kitchen, bathroom, full-home cost, and timeline guides before adding more “cost” content.
- Expand Service Areas and existing county pages with proof before creating city/neighborhood variants.
- Replace defensive/internal language (“unverified,” “current build,” and repeated proof disclaimers) with customer-centered facts or omit the claim.

---

## 13. Recommended website structure and navigation

Keep the current URLs during the first implementation phase. The hierarchy below is an information architecture, not a recommendation to change every slug.

### Primary navigation

1. **Services**
   - Row-Home & Whole-Home Renovations
   - Kitchen Remodeling
   - Bathroom Remodeling
   - Additions
   - Basements
   - Roofing *(after verification)*
   - Water-Damage Repair/Reconstruction *(after verification)*
   - Interior Finishes: Flooring, Drywall & Painting *(after fit verification)*
   - New Construction
2. **Projects**
3. **Process**
4. **Service Areas**
5. **About**
6. **Guides**
7. **Investor Services** *(top-level if investor work remains a core growth goal; otherwise a clearly separated Services group)*

Persistent actions: **Call (267) 715-5557** and **Request a Project Review**. Keep Client Portal as a utility link, not a primary prospect action.

### Recommended service grouping

| Group | Pages | Purpose |
|---|---|---|
| Renovations | Whole-home, row-home, full-gut, kitchen, bathroom, basement, additions | Core homeowner journey and high-value renovation intent. |
| Exterior & restoration | Roofing, water-damage repair/reconstruction, interior repair finishes | Damage/repair path, only after actual scope and response model are verified. |
| Ground-up | Custom homes/new construction; multifamily/mixed-use | Separate design/permit/developer journey from remodeling. Split only when proof supports it. |
| Investor | Investor hub, fix-and-flip, rental rehab, multifamily renovation, due diligence | Clear capital/schedule/compliance path with case-study proof. |

### Footer structure

- Full “Golden Brick Construction” lockup.
- Phone and verified service-area statement.
- PA Home Improvement Contractor Registration and Philadelphia contractor license with official verification links.
- Core services, Projects, Process, About, Service Areas, Guides, Reviews, Privacy.
- Investor Services and Client Portal in a secondary group.
- Social links and a hard-coded verified Google review/profile link.
- One Project Review button.
- No public street address/map unless GBP/business policy confirms a staffed client-facing location.

### Recommended route decisions

| Current route(s) | Decision |
|---|---|
| `/`, `/residential.html`, `/general-contractor-philadelphia/`, `/philadelphia-home-remodeling-contractor/` | Keep initially with distinct roles. Evaluate merging the last two only after GSC/conversion/backlink review. |
| `/full-renovation-philadelphia/`, `/full-gut-rehab-philadelphia.html`, `/rowhome-renovation-philadelphia/` | Keep all three; add a comparison and cross-links so users understand the boundaries. |
| Cost/timeline guides | Keep routes; repair intent. If verified figures cannot be published, retitle and rewrite around cost/schedule factors rather than leaving a promise gap. |
| County/Main Line pages | Keep and enrich; do not add more locations until proof exists. |
| Planned/in-progress cases | Keep only with substantive status/proof; otherwise temporary noindex until enough evidence exists. Do not redirect away if the project will soon support a full case. |
| Mixed `.html`/directory URLs | Keep stable. A cosmetic URL migration is not worth risk now. |

---

## 14. Prioritized improvement table

This table is the implementation backlog. Every row includes evidence, exact action, rationale, and verification. “Effort” is relative and excludes owner/legal review time.

| # | Priority | Impact | Effort | Affected page/component | Evidence of issue / class | Exact recommended improvement | Why it matters | How to verify after implementation |
|---:|---|---|---|---|---|---|---|---|
| 1 | Critical | High | Medium | `firebase.json`, Hosting output | **Confirmed:** repository root is public; prepared upload set includes debug/internal/rules/data artifacts and would include this report. | Deploy from a dedicated allowlisted build directory; exclude logs, Markdown/audits, source/config/rules/data/original assets; privately review and purge/rotate if needed. | Prevents unintended disclosure and reduces deployment surface. | Inspect dry-run manifest; staging/live excluded URLs return 404; CDN purge and private secret review complete. |
| 2 | Critical | High | Medium | `publicLeadIntake`, `site.js`, CRM | **Confirmed:** only nonempty name/phone required; no durable abuse controls, bounds, validation, idempotency; response exposes IDs. | Add rate limiting, honeypot/time signal, request/field caps, field normalization, enum allowlists, bot/App Check layer as warranted, dedupe/idempotency, generic response, monitoring. | Protects CRM quality, cloud cost, staff time, and visitor data. | Staging abuse suite returns 400/429; one valid submission creates one record; no IDs/PII in response/logs. |
| 3 | High | High | Small | Homepage title, H1, hero/support copy | **Confirmed:** “General Construction Company” omits Philadelphia/row homes on first screen. | Use local H1 and precise support line: Philadelphia general contractor; row-home/whole-home/kitchen/bath/additions; named service area; Project Review + Call. | Improves comprehension, differentiation, and primary-query alignment. | Five-second comprehension test; title/H1/meta crawl; desktop/mobile visual QA. |
| 4 | High | High | Large | Services hub, navigation, new service pages | **Confirmed:** stated roofing/water restoration/flooring/drywall/painting services are absent or subordinate. | Verify operating scope, then update IA/homepage and build evidence-backed pages or a consolidated finishes page. | Aligns the website with real revenue services and high-intent searches. | Owner scope sign-off; nav/page crawl; each page has proof, boundaries, local relevance, CTA, schema. |
| 5 | High | High | Medium | About, header/footer trust, forms | **Confirmed:** no named team/history/roles; credentials lack official links. | Add approved people/story/roles/photos; exact credential wording and lookup links; approved insurance-proof process. | Homeowners need to know who enters/manages their home. | Owner fact check; official record check; image consent; moderated user trust review. |
| 6 | High | High | Large | Six case studies, Projects hub | **Confirmed:** cases contain roughly 120–131 main words and omit core project facts; three lack inline galleries. | Create one factual template and upgrade at least three flagship cases with status, condition, scope, size/units, permits, hidden issue, decision, schedule/budget band if approved, outcome, real images. | Converts claims into proof and builds local/service authority. | Project-record/owner/client approval; no unsupported facts; contextual links and image consent pass. |
| 7 | High | High | Medium | Three cost guides + timeline guide | **Confirmed:** no usable bathroom/full-home numbers; meta/content mismatch; no timeline ranges; vague citations. | Add dated verified ranges with assumptions/examples and named review, or retitle/rewrite as factors. Cite primary sources for external facts. | Meets intent, pre-qualifies budget, and reduces distrust/bounce risk. | Content fact-check; metadata matches page; GSC engagement/query review after recrawl. |
| 8 | High | High | Medium | All three public forms + backend | **Confirmed:** inconsistent fields, states, attribution, autofill, no-JS fallback, and follow-up copy. | Build one shared progressive form and backend schema; harmonize labels/states/consent; add ZIP/project type/brief description; optional budget/timing/photos after security; HTML fallback and timeout. | Raises qualified-lead quality without excessive friction. | Phone/desktop, keyboard/AT, slow/error/no-JS tests; staging CRM payload; abandonment/qualification monitoring. |
| 9 | High | High | Small | Mobile header/contact/form | **Confirmed source:** contact mobile CSS hides call action; no sticky CTA. Runtime still unverified. | Keep compact call above mobile form and test sticky Call + Project Review bar with safe-area spacing. | Makes the fastest contact path thumb-accessible. | 320–430px real-device QA; no content overlap; phone event fires once. |
| 10 | High | High | Medium | Privacy policy, consent, analytics | **Confirmed:** optional consent conflicts with transactional response; GA/session storage is undisclosed. | Separate transactional response from optional marketing consent; store purpose/version/time; disclose analytics/processors/storage/choices; legal review. | Reduces compliance and trust risk. | Approved policy/form/backend matrix; consent-state network/storage testing. |
| 11 | High | Medium | Small | `404.html` | **Confirmed:** relative assets/CTA break on nested paths; internal copy/design drift. | Use root-relative assets/links, main-site styling, helpful destinations, homeowner copy. | Prevents a broken recovery experience and crawl waste. | Test multiple nested missing URLs; assets work; response is HTTP 404. |
| 12 | High | Medium | Medium | Global a11y/navigation/forms | **Confirmed:** weak focus contrast, unlabeled nav landmarks, 7 heading skips, two form status gaps, incomplete menu focus. | Implement opaque/dual focus ring, landmark labels, corrected headings, live/focused result summaries, controlled menu focus/escape, reduced-motion scroll override. | Removes keyboard/screen-reader barriers and improves clarity for all users. | axe + keyboard + zoom + High Contrast + VoiceOver/NVDA matrix. |
| 13 | High | Medium | Medium | Hosting/Functions response headers | **Confirmed repo gap:** no sitewide CSP/nosniff/referrer/permissions/frame policy; sensitive responses lack explicit no-store in code. | Add baseline headers; CSP report-only then enforce; no-store/no-referrer on token/private responses; verify HSTS externally. | Reduces XSS/clickjacking/referrer/cache exposure. | Production header scan, CSP reporting, frame/referrer/cache tests. |
| 14 | High | Medium | Small | `.gitignore`, tracked environment file | **Confirmed:** environment-specific `.env.*` file is tracked; values not disclosed. | Stop tracking live env files, ignore `.env*` except example, migrate sensitive values, rotate anything historically exposed. | Reduces repository/CI secret risk. | `git ls-files` and private secret scan clean; deploy still works. |
| 15 | High | Medium | Medium | Images/Hosting/performance | **Confirmed:** ~216.9 MB of upload-eligible images, including large unreferenced originals; some CSS heroes use larger originals. | Exclude/archive source originals; strip public metadata; use responsive hero variants and content-hashed media. | Faster safer deploys and likely lower LCP transfer. | Manifest bytes fall; no missing images; Lighthouse/network compares LCP bytes. |
| 16 | High | Medium | Medium | Reviews page/module/navigation | **Confirmed:** review text API-only; Reviews links removed; skeleton count can shift layout. | Keep static/source link visible; server-render/cache a last-known subset; reserve layout; display failure state without hiding Google link. | Maintains trust when API/JS fails and improves crawlability/CLS. | JS-off/API-error/slow tests; source link works; CLS measured. |
| 17 | High | Medium | Medium | Broad-page IA/copy | **Confirmed:** four broad pages overlap; frequent abstract and defensive phrasing. | Assign page intents; rewrite with concrete facts; remove customer-facing “unverified/current build” language; evaluate merges only with GSC. | Reduces cannibalization risk and AI/template tone. | Content/intent matrix, internal-link crawl, GSC page-query comparison after recrawl. |
| 18 | Medium | Medium | Small | Schema/social/logo | **Confirmed:** 23 breadcrumb gaps, 20 visible FAQs without FAQ schema, guide images/publisher logo gaps, logo MIME mismatch, social metadata gaps. | Standardize entity graph, Breadcrumb/Service/Article images, optional matching FAQPage, correct logo asset/MIME, full OG/Twitter image metadata. | Improves semantic consistency and share presentation. | Schema Validator/Rich Results Test, social debuggers, crawler. |
| 19 | Medium | Medium | Medium | GA4/CRM attribution | **Confirmed:** only source/medium/campaign; bathroom loses UTM; backend ignores source URL/structured UTM; GA receipt unknown. | Store privacy-conscious first/last touch, landing/referrer/click IDs where appropriate; consistent payload; validation/error events without PII; one event dispatch architecture. | Connects leads and wins to pages/channels rather than vanity form counts. | GA DebugView, CRM field check, duplicate event test, key-event audit. |
| 20 | Medium | Medium | Medium | County/Main Line pages | **Confirmed:** formulaic pages lack local cases/reviews; heading skips. | Add real local proof, actual communities, local planning context, corrected headings; do not add new areas yet. | Builds useful local relevance and avoids doorway-page risk. | Content uniqueness/proof review, local internal links, GSC by area after indexing. |
| 21 | Medium | Medium | Medium | Storage/Firestore rules + tests | **Confirmed:** no MIME/size constraints; record-document association update needs hardening; no rules tests found. | Enforce size/MIME/path and old+new association authorization; make ownership fields immutable; add emulator tests and upload scanning. | Protects authenticated data and uploaded documents. | Rules emulator suite across roles, rebinds, size/type, published/private paths. |
| 22 | Medium | Medium | Large | Shared templates/large source files | **Confirmed:** duplicate HTML plus runtime nav mutation and very large monolithic JS/Functions files create drift. | Introduce build-time partials/static generation, domain modules, lint/format, focused tests, centralized asset fingerprinting. | Improves consistency, security review, and change reliability without sacrificing static SEO. | No-JS crawl, snapshot/regression tests, smaller modules, lint/check/test pass. |
| 23 | Medium | Medium | Small | Production validation | **External:** no current browser, Lighthouse, CWV, live headers/status, GSC/GBP/GA access. | Run production desktop/tablet/mobile, Lighthouse, axe/AT, redirect/header crawl, Search Console/GBP/GA audits after critical fixes. | Prevents source assumptions from being mistaken for user outcomes. | Evidence pack with dated screenshots, scores, field data, crawl export, and access-based findings. |
| 24 | Low | Low | Small | Manifest/icons/share metadata | **Confirmed:** no manifest/Apple touch icon; some image alt/dimensions missing in social tags. | Add only after core issues; supply proper app icon/share dimensions. | Polishes saved/share experience but does not drive the main conversion problem. | Device bookmark/share tests and metadata validator. |

---

## 15. Quick wins that can be completed in one day

These are implementation candidates after approval. Several require owner-provided facts or staging verification even if code effort is small.

1. Expand Hosting ignores immediately so logs, internal Markdown—including this audit—rules/indexes, internal data, and source originals cannot enter the next upload. A dedicated build directory is the stronger follow-up.
2. Rewrite homepage title, H1, support line, and service-area sentence around Philadelphia, row homes, renovations, and counties—after approving exact positioning.
3. Fix `404.html` root-relative favicon/CSS/contact links and replace “current build” language.
4. Replace the translucent focus outline with a tested opaque/dual ring and disable smooth scroll for reduced-motion users.
5. Add consistent Primary navigation and Breadcrumb landmark labels; correct the seven H1→H3 sequences.
6. Add `role=status`/`role=alert`, `aria-atomic`, and appropriate focus behavior to bathroom/full-renovation form results; add bathroom autofill/inputmode attributes.
7. Fix bathroom form attribution so the same structured source data reaches the backend—or temporarily remove misleading hidden attribution until the schema is ready.
8. Keep a verified Google profile/review link visible even if the reviews API fails, and stop removing Reviews links at runtime.
9. Correct the logo file extension/MIME mismatch and add missing Twitter/OG image-alt metadata through the shared template/build process.
10. Remove or rephrase customer-facing “unverified address,” “unverified budget,” and “current build” text without adding unsupported claims.
11. Change full-home cost metadata so it does not promise square-foot pricing until the page contains verified data.
12. Add exact official credential lookup links after the legal entity/active numbers are reconfirmed.

---

## 16. High-impact improvements requiring more work

### 1. Secure the public delivery and intake architecture

Move Hosting to an allowlisted build output, remove root/internal artifacts from deploy, harden the anonymous intake endpoint, add rules tests and upload limits, and establish a real header/privacy baseline. This work is largely invisible to visitors but should precede lead-generation promotion.

### 2. Reposition the homepage and navigation

Build the brand around a locally precise promise, represent the actual service mix, put row-home/complex-renovation authority first, and create distinct homeowner/investor routes. This is a messaging and IA project, not merely a headline swap.

### 3. Build the human and project proof system

Gather approved team/history facts and project records; photograph or organize real before/progress/after work; create a repeatable case-study template; link official credentials and external review sources. Three excellent cases will outperform ten thin ones.

### 4. Replace three separate forms with one conversion system

Create one progressive component, consistent backend contract, bot/validation controls, structured attribution, accessible states, secure optional uploads, transactional/marketing consent separation, and staging QA. Connect analytics to qualified outcomes.

### 5. Repair high-intent cost/timeline content

Analyze approved estimates and completed projects to establish publishable ranges and assumptions. Add dated reviewer-approved guidance, not internet averages. If data cannot be disclosed, reposition the pages honestly as factors and planning checklists.

### 6. Build verified roofing/restoration/finishes content

This requires operational definition, credential/insurance review, lead-routing decisions, project proof, availability boundaries, and potentially separate urgent-contact UX. Do not let SEO precede the actual service model.

### 7. Refactor shared presentation and validate real rendering

Generate shared header/footer/schema/forms through build-time templates; reduce duplicated inline code; optimize hero media; then perform Lighthouse, real-device, keyboard, screen-reader, zoom, high-contrast, error-state, and no-JS testing.

---

## 17. Recommended 30-day improvement roadmap

This sequence assumes prompt owner review. It intentionally starts with risk and evidence rather than a cosmetic redesign.

### Days 1–3: containment and baseline

- Freeze production deploy until the Hosting manifest is reviewed.
- Move toward a dedicated build output or implement a strict temporary ignore set.
- Privately inspect potentially deployable logs/artifacts; rotate/revoke only if the private review finds a reason.
- Stop tracking environment-specific configuration; establish managed secrets/params.
- Create staging for intake and response-header testing.
- Capture baseline production crawl, redirects, headers, Lighthouse, mobile screenshots, and accessibility results once browser access is available.

**Exit criteria:** No unintended file is deployable; known sensitive routes have no-store/no-referrer; baseline evidence is stored; no live lead was created during testing.

### Days 4–7: security, message, and measurement

- Harden the lead endpoint with bounds, validation, rate control, dedupe/idempotency, generic response, and monitoring.
- Approve homepage positioning, actual services, project-fit language, response-time promise, and CTA terminology.
- Correct 404, focus, landmarks, headings, reduced motion, and embedded form status basics.
- Define the analytics/CRM field dictionary and qualified-lead funnel.
- Reconcile privacy/consent wording with legal review.

**Exit criteria:** Staging abuse tests pass; homepage copy facts are approved; core keyboard issues fixed; measurement plan has owners and no PII leakage.

### Week 2: proof and conversion

- Conduct owner/team fact interview and select real portraits/jobsite images.
- Collect records/photos for three flagship cases.
- Build one reusable case-study template and one shared progressive form.
- Add verified external review fallback and credential links.
- Update About, Process, Client Protections, contact flow, and homepage proof order.

**Exit criteria:** At least one homeowner row-home and one investor case are complete and fact-approved; form works in staging across phone/desktop/error/AT scenarios.

### Week 3: service and local content

- Repair kitchen/bath/full-home cost and timeline pages using approved data or honest factor-based positioning.
- Strengthen row-home flagship service/guide and cross-link cases.
- Enrich existing county/Main Line pages with real proof.
- Confirm roofing, water-damage, flooring/drywall/painting scope; create only pages that can be supported credibly.
- Standardize titles, descriptions, schema, social metadata, and static navigation/footer.

**Exit criteria:** Every indexable page has one defined intent; cost/time metadata matches content; no new thin location/service pages; structured data validates.

### Week 4: performance, QA, launch, and monitoring

- Remove source originals from public build; optimize responsive hero/media and review layout stability.
- Complete automated and manual accessibility matrix.
- Crawl staging for links, canonicals, robots, sitemap, schema, redirects, 404, headers, and noindex routes.
- Test forms without creating live leads; use emulator/staging and then one explicitly authorized controlled production test if the owner approves.
- Deploy, request recrawl where appropriate, and monitor errors, spam, qualified leads, calls, and search queries.

**Exit criteria:** Staging/production evidence pack passes; excluded URLs return 404; key events are observed once; mobile CWV and accessibility baselines are recorded; rollback plan exists.

### 30-day success measures

Do not judge the work by sessions alone. Track:

- Percentage of target visitors who correctly identify service and area in a five-second test.
- Phone clicks and project-review starts/completions by landing page.
- Spam rejection rate and valid CRM record quality.
- Reached leads, qualified leads, walkthroughs, estimates, and won projects by page/channel.
- Search Console impressions/clicks/query-to-page alignment for core services and areas.
- Mobile LCP/CLS/INP, error rate, and form completion time.
- Accessibility regression results and unresolved critical/serious issues.

---

## 18. Proposed homepage structure, section by section

### 1. Utility/header

- Full “Golden Brick Construction” lockup.
- Services, Projects, Process, Service Areas, About, Guides, Investor Services.
- Visible phone and **Request a Project Review**.
- Client Portal as a secondary utility item.

### 2. Hero: immediate answer

**Recommended H1:** Philadelphia General Contractor for Row-Home & Whole-Home Renovations

**Supporting copy:** Golden Brick manages kitchens, bathrooms, full-home renovations, additions, and complex multi-trade work across Philadelphia and nearby Bucks, Montgomery, and Delaware Counties.

Use only services/geography the owner approves. Pair **Request a Project Review** with **Call (267) 715-5557** over a genuine, well-composed project photo.

### 3. Proof strip

- PA Home Improvement Contractor Registration.
- Philadelphia contractor license.
- “Licensed and insured” only with approved wording.
- Current Google rating/review count only from a reliable verified feed, with timestamp/source and fallback link.
- Philadelphia + counties service area.

Do not use awards, years, “best,” or guarantees without evidence.

### 4. Real work immediately

Show three real projects: homeowner row home, whole-home/suburban renovation, and investor/mixed-use. Each card should state location, property type, status, one scope fact, and link to a complete case. Avoid enhanced renders in this first proof block.

### 5. Core services

Use a clean table/grid with one-sentence scope and proof link—not decorative icons alone:

- Row-Home & Whole-Home Renovations
- Kitchens
- Bathrooms
- Additions
- Basements
- Roofing *(verified)*
- Water-Damage Repair/Reconstruction *(verified)*
- Flooring, Drywall & Painting *(verified fit)*
- New Construction / Investor & Multifamily paths

### 6. Why Philadelphia row homes are different

Brief factual section on party walls, narrow access, old systems, uneven structure, occupied-home protection, permitting/historic review, and sequencing. Link to the row-home guide and a completed row-home case.

### 7. Two audience paths

- **For homeowners:** livability, protection, decision guidance, communication, clean closeout.
- **For investors/property owners:** scope, capital, schedule, permits, unit/compliance risk, documentation.

This allows one brand without forcing both audiences through identical copy.

### 8. How the process works

Five concise steps: Project Review → Phone Review → Walkthrough/Feasibility → Written Scope & Agreement → Construction Updates & Closeout. Link to Process and Client Protections. Include a response window only after approval.

### 9. Featured case study

Use one factual narrative with before/progress/after, hidden condition, Golden Brick decision, and outcome. A compact fact table is more credible than another testimonial slogan.

### 10. Reviews and human trust

Show a stable verified review subset with external source, plus named team/field photo and a short About link. Never rely solely on an animated/API carousel.

### 11. Service areas

Philadelphia, Bucks, Montgomery, Delaware, and Main Line. Link to actual area proof. State that project fit is confirmed during review; do not publish an address/map unless verified and appropriate.

### 12. Frequently asked questions

Answer project fit/minimum, estimates, permits, occupied homes, insurance, schedule, changes, cleanup, and warranty honestly. Link deep questions to maintained guides.

### 13. Project-review form

Use the compact consistent form from Section 19 with a visible call alternative, privacy disclosure, and exact next step.

### 14. Footer

Full identity, phone, service area, verified credentials/official links, key pages, Reviews, Privacy, Investor Services, Client Portal, social profiles, and one CTA. Keep it static and crawlable.

---

## 19. Suggested lead-form structure and wording

### Recommended single-form pattern

Use the same form on Contact and embedded service contexts. The selected project type and source page can be prefilled invisibly, but the user must be able to review/change the project type. Keep qualification in one page with optional progressive details rather than a fragile multi-step wizard.

#### Field order and requirement

| Order | Exact label | Required? | Control and choices |
|---:|---|---|---|
| 1 | Full Name | Yes | Text; `autocomplete="name"`. |
| 2 | Mobile Phone | Yes | Tel; `autocomplete="tel"`, `inputmode="tel"`. Explain that it is used to respond about the project. Normalize rather than demanding one punctuation format. |
| 3 | Email | No | Email; `autocomplete="email"`. Conditionally require only if the user chooses email as preferred contact. |
| 4 | Project ZIP Code or City | Yes | Postal/address-level-2 autocomplete. ZIP is preferable to a full address for initial fit. |
| 5 | Project Type | Yes | Whole-home/row-home renovation; kitchen; bathroom; addition; basement; full gut; roofing; water-damage repair/reconstruction; flooring/drywall/painting; new construction/custom home; multifamily/mixed-use; investor rehab/due diligence; not sure/other. Include only approved services. |
| 6 | Brief Project Description | Yes | Textarea. Guidance, not keyword-style validation: “Tell us the property type, areas involved, desired result, and any known damage, plans, or permit concerns.” |
| 7 | Add Project Details | No | Accessible `<details>` or well-labeled expandable region; must remain usable with keyboard and assistive technology. |
| 8 | Project Address | No | `autocomplete="street-address"`. |
| 9 | Desired Start Period | No | As soon as practical; 1–3; 3–6; 6–12; 12+ months; planning only. |
| 10 | Property Status | No | Owner occupied; vacant; investment; under contract; other. |
| 11 | Budget Range | No | Approved ranges, plus “Need help defining budget” and “Prefer not to say.” Do not publish current bands until they match actual project fit. |
| 12 | Preferred Contact Method and Best Time | No | Call/text/email and morning/afternoon/evening only if operations supports them. |
| 13 | Photos or Plans | No | Add only after secure upload controls. State accepted types, count, and size; make removal/retry accessible. |
| 14 | Marketing Updates | No | Separate optional checkbox. Do not combine this with project-response permission. |

### Exact visible copy

**Form heading:** Tell Us About Your Project

**Intro:** Share the location, project type, and a short description. Our team will review the details before recommending the next step.

**Submit button:** Request a Project Review

**Loading state:** Sending Your Project Details…

**Transactional disclosure:** By submitting, you are asking Golden Brick Construction to contact you about this project. This does not create a contract, final price, or construction start date. See the Privacy Policy.

**Optional marketing label:** Yes, Golden Brick may send me occasional company or project updates. I can unsubscribe at any time.

Marketing language requires legal approval and should be omitted entirely if no marketing program exists.

### Validation and error wording

- Empty field: “Enter your full name.” / “Enter a phone number where we can reach you.” / “Enter the project ZIP code or city.” / “Choose a project type.” / “Briefly describe the project.”
- Invalid phone: “Check the phone number and try again.” Accept common punctuation and extensions; validate normalized length server-side.
- Invalid email: “Enter an email address in the format name@example.com, or leave this optional field blank.”
- File issue: “That file could not be added. Use [approved formats] under [approved size], or submit without photos.”
- Server error: “We could not send your project details right now. Your form is still here. Try again, or call (267) 715-5557.” Do not erase fields on failure.
- Rate limit: “We could not accept another request right now. If this is a real project inquiry, call (267) 715-5557.” Avoid revealing security thresholds.

All errors should be summarized, focused, linked to fields, and announced; fields should receive `aria-invalid` and `aria-describedby`. Preserve user input. Never send field contents/PII to analytics.

### Exact confirmation wording

> Thanks—your project details are in. A Golden Brick project coordinator will review the location and scope and contact you within **[verified response window]**. If the project appears to be a fit, the next step is a phone review and, when appropriate, a walkthrough. Need a faster answer? Call (267) 715-5557.

Show a non-sensitive reference code only if it genuinely helps support; never expose internal lead/customer IDs. Offer “View Our Process,” “See Similar Projects,” and Call as secondary actions. Do not immediately replace the confirmation with another sales pop-up.

### Form security and tracking requirements

- Server-side request/field caps, validation, allowed values, normalization, dedupe/idempotency, throttling, and bot resistance.
- Optional uploads require authenticated/signed intake design or tightly controlled public upload tokens, Storage MIME/size rules, scanning/quarantine, and retention policy.
- Store source page/path, first/last landing, referrer, UTMs/click IDs as structured privacy-approved fields; do not append machine data into homeowner notes.
- Track form view/start/validation error/server error/success and qualified downstream stages without PII.
- Use staging/emulator for all failure and abuse tests. A production lead test requires explicit owner approval.

---

## 20. Questions or information needed before implementation

### Business identity and trust

1. What is the exact legal business name used on the PA HIC registration, Philadelphia contractor license, insurance, contracts, Google Business Profile, and invoices?
2. Are the displayed PA registration and Philadelphia license active for the same legal entity and current project types? May the site link directly to the official records?
3. Who owns/leads Golden Brick, what are their roles, and what verified experience/company-history dates may be published?
4. Which team members can be named/photographed, and who manages the client relationship and jobsite day to day?
5. What exact “licensed and insured” statement and proof-of-insurance process has the insurer/legal advisor approved? No policy identifier should be published casually.
6. Is there an approved written workmanship commitment/warranty? What is covered, for how long, with what exclusions and claim process?
7. Are there genuine affiliations, certifications, OSHA/EPA lead-safe qualifications, awards, or press references that can be verified?

### Service scope and qualification

8. Does Golden Brick actively want leads for standalone roofing, water-damage work, flooring, drywall, and painting, or only when bundled into larger projects?
9. For roofing, which roof systems, repairs/replacements, property types, warranties, and geographies are accepted?
10. For water damage, does Golden Brick perform emergency mitigation/drying, reconstruction only, mold work, insurance-claim coordination, and after-hours response? What certifications/partners exist?
11. What is the minimum practical project size or budget by service? Are there jobs the website should clearly decline or route elsewhere?
12. What response window can the team meet consistently on business days? Are calls, text messages, email, or scheduling links all actively monitored?
13. Does Golden Brick offer financing or work with an approved financing partner? If not, should the FAQ state that plainly?
14. What counties/municipalities/neighborhoods are truly served, and are there travel/project-size constraints outside Philadelphia?
15. Is there a staffed client-facing address? How is the Google Business Profile configured—as a service-area business or public storefront?

### Project evidence and content

16. Which completed homeowner row-home, kitchen, bathroom, addition, basement, roofing, or restoration projects can be published with client/address privacy protected?
17. For each current case, can the team verify property type, status, size/units, scope, permit path, planned/actual duration, budget band, major change, and outcome?
18. Which images are real before/progress/finished photos, which are digitally enhanced or concepts, and what client/photo permissions exist?
19. Can Golden Brick publish anonymized historical budget ranges, project minimums, schedule ranges, and per-square-foot caveats from actual estimates/projects?
20. Can any client provide an approved quote tied to a specific project, with a link to the external review source where applicable?
21. Who will own quarterly review of permit, cost, timeline, licensing, and service-area facts?

### Investor offer

22. What exactly is included in construction due diligence: site visit, permit/violation history, rough scope, pricing bands, schedule, unit/use review, lender documentation, or written deliverable?
23. What are its price, turnaround, geographic limit, and explicit boundary from a home inspection, engineering opinion, appraisal, legal/zoning opinion, or environmental assessment?
24. Which investor outcomes may be disclosed—units delivered, rent-ready date, resale, budget variance, schedule variance, or none?

### Data, legal, and operations

25. May the auditor/developer receive read-only access to GA4, Search Console, Google Business Profile, CRM reports, call tracking, and hosting deployment history for the verification phase?
26. Which GA4 events are currently marked as key events, and how are qualified lead, walkthrough, estimate, and won-project stages recorded?
27. Has a privacy professional approved transactional project-response language, marketing text/email consent, analytics disclosure/consent, retention, and upload handling?
28. Should public review copy be cached/server-rendered, and what is the verified permanent Google profile/review URL?
29. Are any root debug/internal files currently deployed? A private direct-path/header audit is required before the next deploy; results should not expose sensitive contents.
30. What deployment workflow/branch is production, and can Hosting move to a generated allowlisted directory without disrupting the private portals/functions?

### Brand and design

31. Is there an approved vector logo/full-name lockup, or should one be designed within the restrained black/white/gold system?
32. Which real project image should become the homepage hero, and are high-resolution/crop-safe versions available?
33. Should homeowner renovation or investor/developer work be the primary homepage path if one must take visual priority?
34. Are there contractor sites or visual references the owner considers appropriately professional—not for copying, but to calibrate tone and density?

---

## Audit completion note

This audit made no website, application, configuration, content, or deployment changes. The only new file is this report. Implementation should begin only after owner approval, starting with Hosting/intake risk containment and fact gathering.
