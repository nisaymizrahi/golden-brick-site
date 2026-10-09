# Golden Brick media library

Reviewed October 8, 2026. This library organizes selected real project photographs and short construction films for the website. Original files remain in their supplied locations. Use the lowercase `images/` spelling in site URLs; `Images/` resolves to the same directory on this Mac.

## Inventory and review coverage

- `data/media-inventory.json` records every image and video path under `images/`, its source, disposition, dimensions where applicable, and duplicate family. It distinguishes original photos from their resized or recompressed copies.
- `data/media-curation.json` is the editorial selection: 47 original photographs, with descriptive names, visible-content alt text, and collection assignments.
- `data/media-library.json` records the generated image variants and their actual pixel dimensions and byte sizes.
- The review covered all 60 still-image paths in the root and `before&after1/` folders, including a private document classified for exclusion. The 59 public-content stills were visually inspected. An additional original in `projects/in-progress/IMG_6518.jpeg` is a showroom reference.
- All 64 older nonresponsive image paths in `site-refresh/`, `projects/site/`, and `projects/in-progress/` were visually checked. Their repeated source images are mapped in the inventory. The 174 legacy responsive variants were mapped to these parents rather than treated as new photographs.
- All three original videos were visually sampled at their beginning, middle, and end. The original audio remains in the MOV sources; website MP4 derivatives are silent. This record does not claim a complete audio review of the original recordings.
- `IMG_9703.jpeg` initially failed an iCloud read, then decoded successfully and was visually reviewed. There are no known unreadable media files remaining in this inventory.

## Collection guide

Collection names describe the imagery. They are not newly verified property addresses, project titles, completion dates, or promises about investment performance.

| Directory | Visible content | Relationship and appropriate use |
| --- | --- | --- |
| `wood-and-brass-interiors/` | Wood kitchen cabinetry, white counters, green and white tile bathrooms, rooms, and stairs | Matching cabinets, fixtures, and room features support a coherent interior collection. Use selected installation/finished kitchen and vanity views together. Use finished views for service introductions and investor-facing finish quality. |
| `wave-tile-bathroom/` | Existing bathroom and finished textured shower tile/glass enclosure | Supplied before-and-after material and matching room features support a focused bathroom comparison. |
| `marble-bathroom/` | Marble-pattern glass shower and double vanity | Matching fixtures and finishes support paired detail views. |
| `rear-addition/` | Excavation, concrete, framing preparation, timber walls, and two progress films | Repeated adjacent siding, rear opening, and site geometry support a visual construction sequence. Do not imply a completed addition; the latest imagery shows work in progress. |
| `occupied-home/` | Open ceiling, stone fireplace, screened furniture, and covered floors | Matching living-room features support a protection-and-process story. Do not label this collection a subfloor reset. |
| `gray-basement/` | Gray walls, recessed lighting, flooring installation, and crew | Visually matching room views support basement finishing and active-work context. |
| `sitework/` | Street excavation still and short film | Matching equipment and street frontage support a small sitework feature. Address and permit status are not asserted. |
| `west-philadelphia-mixed-use/` | Finished white-cabinet kitchen | Retains the existing site's named-project association; that association was not independently established from the photo. |
| `interior-buildback/` | Framing, drywall, protected floors, open structure, and ceiling work | A subject collection spanning potentially different jobs. Do not present all images as one project's timeline. |
| `exterior-work/` | Rowhome facade crew and courtyard work | Exterior-work subject collection. Common property identity is not established. |
| `bathroom-details/` | White tub, marble-pattern surround, black fixtures | Bathroom detail reference; no location claim. |
| `finished-details/` | Sunlit room and walk-in closet | Finish-quality subject collection. Common property identity is not established. |
| `tile-installation/` | Floor tile work with leveling clips | Active craftsmanship/process image. |

## Export conventions

New photographs use descriptive filenames with `-480`, `-800`, and a largest available width up to `-1600`, followed by `.webp`. A smaller source can produce a different largest width, such as `-1536`. The manifest is the source of truth; do not assume every export is 1600 pixels wide.

Use `srcset` and truthful `width`/`height` attributes. Lazy-load supporting photographs. The leading hero photograph should load promptly. Keep galleries selective, with captions describing what is visible and how it relates to the page. A full-size viewer should link to the optimized large derivative, not expose raw originals by default.

Videos should have native controls, `preload="none"`, `playsinline`, a poster, and no autoplay. Retain the portrait composition. Place construction films near a relevant process, addition, or sitework explanation, rather than repeating every film on every page.

| Original | Website film | Poster |
| --- | --- | --- |
| `images/IMG_8834.MOV` | `rear-addition/foundation-formwork-progress.mp4` | `rear-addition/foundation-formwork-progress-poster.webp` |
| `images/IMG_9729.MOV` | `rear-addition/framing-crew-progress.mp4` | `rear-addition/framing-crew-progress-poster.webp` |
| `images/IMG_9578.MOV` | `sitework/street-excavation-progress.mp4` | `sitework/street-excavation-progress-poster.webp` |

## Preserved but intentionally not selected

The library avoids counting duplicate exports or alternate camera angles as additional projects. These source files remain available without adding repetition to the public galleries.

| Source filename | Decision |
| --- | --- |
| `18b9bb75-0f70-4191-b063-b4d54f822070.jpg` | Alternate phone view of the white-tile bathroom; selected wider photography is clearer. |
| `1F224BA6-68B0-4305-8978-EB03D70E30CB.png` | Tighter tub view; reserve for a future detail need. |
| `43523bce-3771-49eb-be7c-cf6caff19b1e.jpg` | Alternate green-tile shower view. |
| `630146CD-A6D5-4C00-A49C-2D72D226274C.png` | Additional green-bathroom composition; visible in some preserved legacy exports. |
| `714dbde2-5c95-417e-87d0-1b4f022fa3c8.jpg` | Tight elevated kitchen angle; selected wide views explain the layout better. |
| `9AE32B3A-F905-4F44-B631-A5885E8ADEF1.png` | Alternate wave-tile bathroom view; the copy in `before&after1/` is byte-identical. |
| `IMG_9537.jpeg` | Additional occupied-home protection angle; selected views already tell that story. |
| `IMG_9703.jpeg` | Site drawing review/materials staging; readable plan annotations and a dense foreground make cleaner construction views preferable. |
| `projects/in-progress/IMG_6518.jpeg` | Retail showroom vanity display. Appropriate only as finish-selection reference, never as a completed company project. |
| `5F2DF305-0B89-4B8A-ABEC-0EE4771EA9B0.png` | Review graphic; use attributable reviews rather than a second image-based review presentation. |
| `constructionphoto.jpg` | Generic tools-and-plans still life. Authentic project imagery is available; stock provenance is not asserted. |
| `logo.jpg` | Brand asset, not project evidence. |
| Private identity-document image in `before&after1/` | Excluded from every gallery and public derivative. The deployment configuration must also exclude the private original; merely omitting an `<img>` reference does not prevent direct access. |

## Prepared variants held in reserve

The final page pass uses 42 of the 47 prepared photo sources across 34 public pages, plus all three films. Five optimized sources are retained for future relevant placements: `bedroom-lower`, `stair-light`, `vanity-install`, `marble-shower`, and `addition-prep`. They add alternate views or intermediate stages already explained on the current pages; keeping them in the library avoids making the galleries unnecessarily long.

Raw root-level camera files and the entire `before&after1/` directory are excluded by `firebase.json`. This preserves local originals while publishing the selected metadata-free library exports. Existing case-study images and live project records retain their established project associations.

## Legacy filenames and trust

Legacy paths are preserved to avoid breaking existing references. They can describe a photo inaccurately. In particular, `projects/site/portfolio/rowhome-subfloor-structural-reset.jpg` is a derivative of `IMG_9537.jpeg` and shows an occupied living area with protected furnishings and open ceiling work. Use the reviewed image content and manifest when writing captions.

Other historical names also simplify room descriptions: `site-refresh/golden-brick-bedroom-suite-view.webp` derives from `25_dsc02269.jpg`, and `site-refresh/golden-brick-living-room-finished.webp` derives from `12_dsc02189.jpg`. Filenames alone do not prove room function or property identity.

Do not infer cost, return, completion date, inspections, permits, client identity, or location from these images. Keep named case-study claims tied to the existing verified project information. Show progress as progress, finished work as finished work, and unrelated subject examples without an implied before-and-after relationship.
