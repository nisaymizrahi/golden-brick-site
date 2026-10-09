# Homepage Google review excerpts

The public website shows a static review section in `index.html` at `/#reviews`.
It does not fetch reviews from Google or from the Firebase review endpoint.
The standalone Reviews page has been removed; its three former URLs permanently
redirect to the homepage section.

## Source checked October 9, 2026

The public Google Maps listing for Golden Brick Construction at 5635 Chester
Ave, Philadelphia matched the business website and phone number. It showed a
5.0 average from 9 reviews; all 9 were five-star reviews.

[Verified Google Business Profile](https://www.google.com/maps/place/Golden+Brick+Construction/@39.9371213,-75.2269775,17z/data=!3m1!4b1!4m6!3m5!1s0x89c6c73ec06d7949:0xf54eda4ae7912891!8m2!3d39.9371213!4d-75.2269775!16s%2Fg%2F11z2x74q8m)

The section includes short, attributed excerpts from Angie Flynn, Ron Sailer,
and Evan Klein, each with a separately written summary. Each displayed review
was confirmed to have five stars. Quotes retain
the reviewers’ wording; leading ellipses indicate that earlier words were omitted.
No reviewer photos, owner responses, or account information are copied.

## Updating the section

1. Read the public Google profile and confirm the business identity.
2. Edit the static text in `index.html`, preserving attribution and the
   distinction between direct quotations and editorial summaries.
3. If the aggregate rating or review count changes, update the visible values,
   accessible label, and checked date together.
4. Keep the link to the complete reviews on Google.
5. Check the desktop and mobile layout in `home-reviews.css` and run the public
   site checker before publishing Hosting.

The public pages no longer load `google-reviews.js`. The unused legacy review
module and backend integration remain separate from this static section;
no Google Business API credentials or backend deployment are needed for
homepage review updates. Do not reconnect the feed unless explicitly requested.
