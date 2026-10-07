# Service and location wording pass

Completed 28 September 2026. Full-file edits saved in the shared checkout. This supplements `/tmp/gb-service-audit.md`; no deployment performed by this agent.

## Completed

- Reviewed all visible copy, navigation and footer wording, page titles, descriptions, social metadata, schema names/descriptions, image alt text, form labels, placeholders, and feedback messages in all 16 assigned files.
- Replaced whole-home/whole-house language with Full-Home Renovation in service titles and full-home renovation in prose. Rewrote plural whole-homes sentences. Preserved existing public URLs.
- Replaced abstract construction and marketing phrases with the actual work: cabinet installation, plumbing and electrical work, site access, material selections, and final walkthroughs.
- Improved service-area headings, grammar, and location descriptions. Removed FAQ introduction text that merely repeated what the section already said.
- Kept homeowner and investor concerns concrete: property condition, occupied/vacant status, scope, budget, closing and move-in dates, materials, and site access.
- Removed an unsupported implication that the linked budget guide supplies price ranges.
- Updated titles, descriptions, and matching service-schema descriptions where needed. Full-gut copy now explains the work without implying that hidden conditions can be confirmed before demolition.
- Full-home form/select display now says Full-Home Renovation; its original submitted value is preserved. The full-home page uses Plan Your Renovation and the direct prompt: “Tell us which rooms need work and what you want to change.”

## Examples

| Previous wording | Updated wording |
|---|---|
| “Flooring, drywall, paint, and finish integration” | “Flooring, drywall, paint, and trim” |
| “Do you serve kitchens outside Philadelphia too?” | “Do you remodel kitchens outside Philadelphia?” |
| “Trade Sequencing” | “Scheduling the Work” |
| “Closeout & Final Review” | “Final Walkthrough” |
| “Estimate Review” | “Plan Your Renovation” |
| “whole-home scopes” | Concrete descriptions of the rooms, systems, and repairs involved |

## Validation

- All 16 assigned pages retain their link/image URLs, form names/IDs/values/data attributes, embedded styles, and executable JavaScript compared with the beginning of this pass. Whitespace normalization excluded from comparison.
- One H1 per page and valid JSON-LD on all 16.
- No remaining whole-home, whole-house, whole homes, whole houses, or unhyphenated full home wording in assigned source files.
- `git diff --check`: passed.
- Independent public-page audit: 43 HTML pages, 42 sitemap URLs, zero technical issues. Keyword scan matches are benign words such as waterproofing and literal “more than” explanations.
- No HTML edits after ownership handoff to root. Root is responsible for the final shared navigation/cache update and deployment verification.

## Owner follow-up

No new company claims, reviews, years in business, timing guarantees, prices, or project-attribution claims were introduced. Earlier real-world verification tasks in `/tmp/gb-service-audit.md` still apply: verify licenses and service territory, supply approved case-study facts and permission-cleared photography, confirm the gallery ownership/location claims, and test real lead delivery with the business team.

## Files changed

- `residential.html`
- `kitchen-remodeling-philadelphia.html`
- `bathroom-remodeling-philadelphia.html`
- `full-gut-rehab-philadelphia.html`
- `basement-finishing-philadelphia/index.html`
- `bucks-county-home-renovation-contractor/index.html`
- `delaware-county-home-renovation-contractor/index.html`
- `full-renovation-philadelphia/index.html`
- `general-contractor-philadelphia/index.html`
- `home-additions-philadelphia/index.html`
- `main-line-home-renovation-contractor/index.html`
- `montgomery-county-home-renovation-contractor/index.html`
- `new-construction/index.html`
- `philadelphia-home-remodeling-contractor/index.html`
- `rowhome-renovation-philadelphia/index.html`
- `service-areas/index.html`
