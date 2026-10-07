# Golden Brick Google Reviews setup

The website and Firebase Functions are ready for live Google Business Profile reviews. No review content is hard-coded. Until the Google Business Profile API configuration below is completed and the first refresh succeeds, the public components show a safe unavailable state.

## 1. Use the correct Google Cloud project

1. Sign in with a Google account that is an owner or manager of the verified Golden Brick Construction Business Profile.
2. Open the [Google Cloud Console](https://console.cloud.google.com/).
3. Select the Firebase project `golden-brick-construction`, or create a dedicated Google Cloud project if Google requires a separate approved project.
4. Record the numeric **Project number** from the project dashboard.
5. Confirm the Golden Brick Construction Business Profile has been verified and active for at least 60 days and that `https://www.goldenbrickc.com/` is listed as its website.

## 2. Apply for Business Profile API access

1. Open Google’s [Business Profile API prerequisites](https://developers.google.com/my-business/content/prereqs).
2. Open the linked GBP API contact form.
3. Choose **Application for Basic API Access**.
4. Submit the numeric Google Cloud project number.
5. Apply with an email address that is already an owner or manager of the Golden Brick Construction profile.
6. Wait for Google’s approval email.
7. In Google Cloud, confirm the Business Profile API quota is no longer `0 QPM`. Google’s current documentation identifies `300 QPM` as the approved standard quota.

## 3. Enable the Business Profile APIs

After approval, enable the APIs Google currently lists for Business Profile projects:

1. Google My Business API
2. My Business Account Management API
3. My Business Lodging API
4. My Business Place Actions API
5. My Business Notifications API
6. My Business Verifications API
7. My Business Business Information API
8. My Business Q&A API

The reviews integration directly calls the Google My Business reviews endpoint. Account discovery uses Account Management, and location discovery uses Business Information.

Also confirm these Firebase services are enabled:

1. Cloud Functions
2. Cloud Scheduler
3. Firestore
4. Secret Manager

## 4. Configure OAuth consent and create a client

1. In Google Cloud, open **Google Auth Platform**.
2. Configure the consent screen using Golden Brick Construction company information only.
3. Add the application name, support email, company website, privacy policy, and authorized domain `goldenbrickc.com`.
4. Add the scope:

   `https://www.googleapis.com/auth/business.manage`

5. Create a dedicated **Web application** OAuth client.
6. For the one-time OAuth Playground authorization, add this authorized redirect URI:

   `https://developers.google.com/oauthplayground`

7. Keep the client ID and client secret out of frontend files, Git, screenshots, issue trackers, and chat messages.

## 5. Authorize the managing Google account

1. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Open the settings panel.
3. Enable **Use your own OAuth credentials**.
4. Enter the dedicated OAuth client ID and client secret.
5. In Step 1, enter:

   `https://www.googleapis.com/auth/business.manage`

6. Click **Authorize APIs**.
7. Sign in with the Google account that owns or manages the verified Golden Brick Construction profile.
8. Approve the consent screen.
9. Exchange the authorization code for tokens.
10. Copy the refresh token once and store it directly in Secret Manager in the next step. Do not add it to a local `.env` file.

If Google does not return a refresh token, revoke the test grant from the Google Account’s connected-app settings, then authorize again with offline access and a fresh consent prompt.

## 6. Store the OAuth credentials in Firebase Secret Manager

From the repository root:

```bash
cd /path/to/golden-brick-site
firebase functions:secrets:set GOOGLE_BUSINESS_OAUTH
```

When prompted, paste a single-line JSON object:

```json
{"clientId":"YOUR_OAUTH_CLIENT_ID","clientSecret":"YOUR_OAUTH_CLIENT_SECRET","refreshToken":"YOUR_OAUTH_REFRESH_TOKEN"}
```

The secret is bound only to the scheduled `refreshGoogleReviews` Function. The public endpoint cannot read it.

## 7. Find the account ID and location ID

Use the OAuth Playground access token from Step 5.

List accessible accounts:

```text
GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts
```

Find the account resource that manages Golden Brick Construction. Its `name` has this form:

```text
accounts/ACCOUNT_ID
```

List that account’s locations:

```text
GET https://mybusinessbusinessinformation.googleapis.com/v1/accounts/ACCOUNT_ID/locations?readMask=name,title,metadata&pageSize=100
```

Find the location whose title is Golden Brick Construction. Its `name` contains the location ID.

## 8. Add the non-secret Function parameters

Edit `functions/.env.golden-brick-construction` and add:

```dotenv
GOOGLE_BUSINESS_ACCOUNT_ID=ACCOUNT_ID
GOOGLE_BUSINESS_LOCATION_ID=LOCATION_ID
GOOGLE_BUSINESS_PROFILE_URL=https://VERIFIED_PUBLIC_GOOGLE_PROFILE_URL
```

For the profile URL:

1. Open the Golden Brick Construction profile in Google Search or Maps.
2. Use the profile’s public **Share** action.
3. Copy the public profile URL, not an admin URL and not a guessed URL.
4. Open it in a signed-out browser and confirm it resolves to the correct Golden Brick Construction listing.

These three values are identifiers or a public URL; the OAuth values remain in Secret Manager.

## 9. Deploy the two Functions and Hosting

```bash
firebase deploy --only functions:refreshGoogleReviews,functions:publicGoogleReviews
firebase deploy --only hosting
```

The scheduled Function runs daily at 4:17 AM in `America/New_York`.

## 10. Run and verify the first refresh

1. Open Google Cloud Console → **Cloud Scheduler**.
2. Find `firebase-schedule-refreshGoogleReviews-us-central1`.
3. Use **Force run** without editing or deleting the scheduler job.
4. Open the `refreshGoogleReviews` Function logs.
5. Confirm the log reports a successful refresh and counts only. It must not print tokens or credentials.
6. Open:

   `https://www.goldenbrickc.com/api/public/google-reviews?limit=6`

7. Confirm the JSON contains:
   - `"available": true`
   - `"source": "google_business_profile"`
   - the current Google-reported `averageRating`
   - the current Google-reported `totalReviewCount`
   - exact review text, reviewer display name, rating, and timestamps
   - the verified `profileUrl`
8. Compare the newest items with the Golden Brick Construction Business Profile while signed out of the managing Google account.
9. Open the homepage and `/reviews/` on desktop and mobile.
10. Confirm low-rated reviews are not filtered and the order follows `updateTime desc`.

## 11. Security and retention checks

1. Confirm `GOOGLE_BUSINESS_OAUTH` exists in Firebase Secret Manager.
2. Confirm only `refreshGoogleReviews` has access to the secret.
3. Confirm no real OAuth values exist in HTML, frontend JavaScript, `.env.example`, Git commits, deployment logs, screenshots, or support messages.
4. Run the repository’s secret scanner with redaction enabled before pushing.
5. Confirm Firestore contains only the current temporary Google review snapshot under:

   `googleReviewSnapshots/{snapshotId}/items`

6. Confirm `publicIntegrations/googleBusinessReviews` records `fetchedAt`, `expiresAt`, and the active snapshot ID.
7. Confirm refresh runs daily. The implementation replaces the snapshot on success, deletes inactive snapshots, and purges an expired snapshot before Google’s 30-day content-storage limit.

## Fallback if Business Profile API access is unavailable

If Google rejects or does not make Business Profile API access available, use the official Google Places API only after confirming the fallback. Places returns a maximum of five Google-selected reviews; Google controls which reviews are returned. The fallback requires a properly restricted API key, server-side requests, and Google Maps attribution. Do not scrape Google and do not install a paid review widget without approval.
