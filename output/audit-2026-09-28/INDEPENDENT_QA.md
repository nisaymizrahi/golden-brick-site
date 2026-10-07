# Independent read-only public-site QA

September 28, 2026. Inspected the current local working tree; no website files were edited during this QA pass. Scope: all 43 public HTML pages (42 indexable pages plus 404), sitemap.xml, robots.txt, local linked files and assets, and the public review renderer. Excluded client/staff/estimate internals, functions configuration, credentials, and private data. Root was concurrently editing some shared files, so rerun the supplied checker after the final changes.

## Result

**No structural failures found in the snapshot.**

- All 42 sitemap URLs resolve to existing public HTML files and match the respective canonical URL.
- Every indexable public page has one canonical URL, a title, a description, and one H1 element.
- No duplicated page titles, meta descriptions, canonical URLs, or IDs within pages.
- No broken local anchor links or local fragment targets.
- No missing HTML-linked stylesheet/script/image files, srcset assets, inline CSS image files, or social preview images.
- Every static JSON-LD block parses. No duplicate top-level schema ID declarations within a page. Service descriptions match each page’s meta description.
- 404.html intentionally has no canonical, contains noindex, and is correctly absent from the sitemap.
- robots.txt excludes /staff/, /client/, /estimate/, and /data/ and points to the canonical sitemap.
- The earlier parser's split-H1 warnings for projects.html and new-construction/index.html were false positives caused by spans inside a single H1; direct element counting confirms one H1 each.

The checker is `/tmp/gb-readonly-qa.py`; detailed machine-readable output is `/tmp/gb-independent-qa-data.json`. It reads only public site files and tests local existence, not remote link status or backend behavior.

## Remaining concrete body-copy issues

These are editorial fixes, not broken code. Locations refer to the current snapshot.

| Priority | File and line | Current copy | Reason and suggested revision |
|---|---|---|---|
| P2 | bathroom-remodeling-philadelphia.html:659 | “The existing portfolio pairs these photos to show the bathroom before work and the finished tile and glass enclosure.” | This sounds like an internal content note. After confirming both photographs are the same project, use “The bathroom before renovation and after the new tile and glass enclosure were installed.” If the pairing cannot be confirmed, remove the before/after assertion. |
| P3 | bathroom-remodeling-philadelphia.html:752 | “Scope, fixtures, tile direction, layout changes, and project constraints are clarified before execution begins.” | Abstract/passive wording remains. Use “We confirm the layout, tile, fixtures, and access arrangements before construction starts.” |
| P3 | bathroom-remodeling-philadelphia.html:728 | “…need stronger overall coordination.” | Vague comparison with no useful detail. Use “We plan the bathroom work alongside the other rooms and shared plumbing or electrical work.” |
| P3 | bathroom-remodeling-philadelphia.html:832 | “…finish details are not aligned early…before they create avoidable delays.” | Still reads like templated process language. Use “Yes. We review the tile, vanity, fixtures, lighting, and delivery dates with you before installation.” |
| P3 | kitchen-remodeling-philadelphia.html:595 | “That gives us a stronger starting point for review.” | Filler sentence; delete it. The preceding list already tells the visitor what to send. |
| P3 | general-contractor-philadelphia/index.html:250 | “Occupied-home work should be planned honestly before construction starts.” | Moralizing/abstract phrasing. Use “We discuss those conditions before deciding whether the home can remain occupied.” |
| P3 | general-contractor-philadelphia/index.html:242 | “The right next step should be discussed once the project details are clearer.” | An indirect answer to a permit question. Point to the existing permit guide and say “Share the proposed work so we can identify which requirements need to be checked.” |

## Repetition worth improving with real business evidence

Four county service pages share the same rental/resale paragraph. Three cost guides share the allowance explanation, and four investor pages share the final CTA. Those short repeated supporting sections are reasonable, and the pages have distinct titles/descriptions/body introductions. The next meaningful improvement is genuine local evidence: an approved project example for each county, and actual project cost examples with date, scope, and exclusions. Do not create fictional neighborhoods, jobs, prices, clients, or outcomes simply to vary the wording.

## Limits / owner verification

- This pass checks static source and local paths; it does not establish live deployment, visual behavior, form delivery, Google review API configuration, official credential status, or conversion rate improvement.
- Some template claims are now specific operational statements (written contracts, change approval, insurance documentation, permit coordination). The owner should verify the actual process matches them.
- New-construction photographs are explicitly labeled as renovation portfolio photos; this is honest. Completed ground-up project evidence should replace them when the owner supplies it.
- Any “before and after” pairing requires the owner’s confirmation that the images depict the same property and scope. Matching filenames or the prior portfolio is not proof.
- Existing review-source and display language should be checked against the deployed feed when operational QA is completed. The public renderer preserves fetched text and offers a useful failure state; this audit did not claim successful retrieval of live reviews.
