# Final portfolio, process and review wording pass

All 12 owned public files were read in full before edits, including the latest shared navigation changes. Full-file backups for this pass are in `/tmp/gb-proof-wording-before`. No backend, remote database, shared stylesheet, unrelated file or deployment changes were made.

## Files completed

- `projects.html`
- `projects/italian-market-whole-home-renovation/index.html`
- `projects/cheltenham-whole-home-renovation/index.html`
- `projects/germantown-mixed-use-renovation/index.html`
- `projects/west-philadelphia-former-bank-redevelopment/index.html`
- `projects/west-philadelphia-mixed-use-building-renovation/index.html`
- `projects/west-philadelphia-triplex-renovation/index.html`
- `process/index.html`
- `client-protections/index.html`
- `reviews/index.html`
- `projects.js`
- `google-reviews.js`

Also read the full `scripts/check-projects-reviews.cjs` after root assigned it, updated its retry wording expectation, and added seven display-normalization/URL-preservation assertions.

## Language changes

- Standardized every customer-visible and metadata reference to **Full-Home Renovation** in titles and **full-home renovation** in prose. Italian Market and Cheltenham project card headings, case study headings, titles, social cards, structured-data names, service links and alt text now agree.
- Preserved the existing `whole-home-renovation` URLs exactly, including canonical, breadcrumb, social and navigation URLs. These paths are existing SEO addresses, not visible wording.
- Removed the remaining “published” wording from the Italian Market SEO description and triplex alt text.
- Shortened portfolio blurbs so each explains the actual project rather than listing every trade in one long sentence.
- Reworked awkward counts: “two two-bedroom, two-bath units and one one-bedroom…” now reads “two with two bedrooms and two bathrooms each, plus a one-bedroom, one-bath apartment” on the card. The case study splits the unit mix into two clear sentences.
- Replaced process headings such as “Initial Project Inquiry,” “Phone Review,” and “Punch List and Closeout” with “Tell Us About Your Project,” “Talk With Our Team,” and “Final Walkthrough.”
- Rewrote the process/protections metadata and card text in plain customer language. “Scope, Allowances, and Exclusions” became “What Your Estimate Includes,” followed by an explanation of allowances for materials not yet chosen.
- Removed redundant image-disclaimer paragraphs while retaining clear altered-image labels and planned/in-progress project status. The disclosure is now “Digitally enhanced image. Project not complete.”
- Simplified review fallback language and the awkward pagination error button “Try loading more again” to “Try again.” Genuine reviewer wording is untouched.

## Dynamic text

`projects.js` now applies display-only `projectText()` normalization to live Firestore project titles, descriptions, scope/details, service labels, project types and image alt/caption text. It handles title, sentence and uppercase variants of “whole-home” / “whole home,” and removes the exact internal label “published projects.” URL handling stays separate. No remote records are edited, and the underlying publication/status behavior remains intact.

Google review text remains verbatim, including any customer's own wording. Terminology normalization is intentionally limited to company-authored project copy.

## Validation

- `node --check projects.js` — passed.
- `node --check google-reviews.js` — passed.
- `node scripts/check-projects-reviews.cjs` — **31 behavior checks passed**, including seven new assertions for display normalization and preserved legacy URL destinations.
- All 10 owned HTML pages passed one-H1, one-canonical and parseable JSON-LD checks.
- Compared all `href`, `src`, canonical and social URL attributes against this pass's backups: **no URL changed**.
- Parsed visible text, metadata and alt/ARIA attributes: no remaining “whole-home,” “published project,” “approved record,” “unverified,” or “curated” wording. Remaining `whole-home` occurrences are existing URL slugs or normalization tests; remaining `published` code occurrences are database flags/queries or the normalizer itself.
- Root remains responsible for the final global asset-version bump, browser check and requested Hosting deployment.
