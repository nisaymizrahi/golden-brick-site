# Service and service-area audit

Reviewed and updated 15 service and location pages against the existing uncommitted working tree. Full files were read before editing. The work preserves current services, URLs, forms, responsive image sources, business identifiers, and the root agent’s later navigation/footer/version changes. No commit or deployment was performed.

## Findings that affected credibility and conversion

1. Much of the original copy described making a website instead of explaining construction: “Who This Page Is For,” “the site lists,” “service hub,” “proof across more than one stage,” and an explanation of why an unverified office address was not being published. This made the company sound assembled by a marketer rather than run by builders.
2. Repeated abstract phrases — “cleaner sequencing,” “stronger coordination,” “project path,” and “managed execution” — crowded out the work a buyer needs to understand. Some copy blamed inexpensive projects or owners with limited budgets.
3. Regional pages made unsupported generalizations about Main Line finish expectations and Delaware County value-conscious owners. Their long lists of imaginary example projects could be mistaken for local experience. They now describe available services, property considerations, and how to confirm availability.
4. Service photography was reused across location pages with alt descriptions implying a location or project type that was not established. One basement social image was actually an occupied-home renovation; new-construction photos were renovation images. Metadata is now neutral, and the new-construction gallery explicitly identifies the photos as renovation portfolio work.
5. A bathroom gallery claimed a verified before/after pair. The two local images were visually reviewed and appear consistent, but no project record or owner confirmation establishes the pairing. The gallery now uses “Existing Conditions & Finished Work,” “Existing Bathroom,” and “Completed Shower,” without asserting the same property.
6. The service directory repeated nearly the same service list and process promises in several sections. It now presents a clear service list, project photos, project planning, process, FAQ, and contact route. Main content was reduced from approximately 1,900 words to 714 while retaining all nine core construction service paths and investor access.
7. Estimate wording such as “Leave Your Info” and “Fast follow-up” did not explain the next step. Calls to action now identify an estimate request, the useful project details, and that the company will review and contact the owner. Unsupported insurance and speed claims were removed from the whole-home landing page; existing published credential numbers remain.
8. The whole-home form did not let visitors describe the property or work. Its existing notes field is now visible and an optional address field was added; lead field selectors and backend mapping names are preserved. Bathroom autocomplete, status roles, and privacy links improve form clarity and accessibility.
9. The Delaware County page linked a Philadelphia permit guide without clarifying jurisdiction. The rewritten area pages direct permit questions to the relevant local building department. The additions FAQ now links directly to the City’s official addition permit guidance.

## Implemented

- Rewrote headlines, service introductions, supporting descriptions, FAQ answers, photo captions, and contact prompts in natural construction language.
- Rewrote four area-page bodies with concise, distinct property-planning information and direct phone/project links.
- Kept homeowners and real-estate investors visible across services, with practical questions about rental/resale use, occupancy, timing, and materials; no ROI or resale guarantees were added.
- Updated 14 service-page titles and descriptions, with matching Open Graph/Twitter metadata and Service JSON-LD descriptions. The service-area directory’s already accurate title/description were retained.
- Added static BreadcrumbList data where the visible breadcrumb navigation existed and no static list was already present.
- Shortened forced multi-line H1s on general-contractor and rowhome pages, and replaced generic “service hub” destinations with clear service/project language.
- Changed incorrectly targeted “service areas” links to the actual service-area directory.
- Added portfolio links as secondary actions on key service pages.
- Kept existing new-construction and multifamily services; these were already present in the working tree and were not invented during this audit.
- Main content across the 15 pages fell from about 12,030 to 9,399 words (approximately 22%) without eliminating the main service topics.

## What the owner needs to do

### Highest priority: supply evidence customers can inspect

- Confirm PA HIC #PA212716 and Philadelphia GC #065157 are current and identify the exact registered business name. Supply current insurance documentation if the website is to say “insured.” The code alone cannot verify credential status or coverage.
- Match each published photo to a project record: town/neighborhood, project type, year, the work Golden Brick actually performed, and permission to publish. Confirm the bathroom photo pairing before restoring a before/after claim.
- Provide completed ground-up construction photos and a brief scope for any new-home, multifamily, or mixed-use new-build claims. Renovation photography should not be presented as proof of new construction.
- Provide an approved case study for each service area where work has actually been completed. One real local project with a scope and photographs is more convincing than additional city names or long location copy.
- Confirm the true service boundaries and availability for the towns currently named. Remove any areas the company does not want to serve.

### Sales and operations

- Confirm what an estimate request actually triggers: who responds, when a site visit is appropriate, whether estimating/design visits carry a fee, and what drawings are needed before pricing. Publish response times only if the team can meet them.
- Confirm the actual process for written scopes, permits, material selection, change approvals, worksite protection, progress updates, inspections, and final walkthroughs. The website should reflect the process the crew and office consistently deliver.
- Keep a set of genuine project examples with scope, dates, exclusions, and customer permission. If sharing actual cost or schedule data, qualify it to that project rather than treating it as a price promise.
- For investor enquiries, gather property condition, ownership/contract status, intended use, occupancy, deadline, and construction priorities. These are useful sales questions and do not require a promise about investment returns.

## Validation

- Current independent public-site checker `/tmp/gb-readonly-qa.py`: 43 public pages, 42 sitemap URLs, **zero structural issues** after the service changes and all seven independent editorial corrections.
- Own-file checks: one H1 per page, valid JSON-LD, unique IDs, no broken local href/src targets, and all original lead-field IDs/names preserved.
- Desktop browser review on `http://127.0.0.1:4173`: residential services layout, Main Line hero, and whole-home estimate section render correctly. Whole-home CTA reaches the estimate form; optional address and project details are visible.
- An initial faint hero-panel screenshot was the reveal animation in progress. The settled panel has opacity 1 and readable content. No horizontal overflow observed at the 1280px desktop viewport.
- No live leads were submitted. Static checks do not establish production form delivery, live search indexing, current credentials, photo ownership, or a conversion increase.

## Edited files

- residential.html
- kitchen-remodeling-philadelphia.html
- bathroom-remodeling-philadelphia.html
- full-renovation-philadelphia/index.html
- basement-finishing-philadelphia/index.html
- home-additions-philadelphia/index.html
- new-construction/index.html
- rowhome-renovation-philadelphia/index.html
- general-contractor-philadelphia/index.html
- philadelphia-home-remodeling-contractor/index.html
- main-line-home-renovation-contractor/index.html
- bucks-county-home-renovation-contractor/index.html
- montgomery-county-home-renovation-contractor/index.html
- delaware-county-home-renovation-contractor/index.html
- service-areas/index.html

## Source checked

City of Philadelphia, “Get a Zoning Permit for new construction or additions”: https://www.phila.gov/services/permits-violations-licenses/apply-for-a-permit/zoning-permits/get-a-zoning-permit-for-new-construction-or-additions/ . Checked September 28, 2026; the additions FAQ links to this primary source.
