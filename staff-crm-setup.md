# Golden Brick Staff CRM Setup

This repo now includes a protected `/staff` portal, Firebase Functions for CRM actions, Firestore rules, and public website lead intake that writes into the CRM instead of Google Forms.

## What Is Included

- Public forms on:
  - `/contact.html`
  - `/bathroom-remodeling-philadelphia.html`
  - `/full-renovation-philadelphia/`
- Staff portal on:
  - `/staff`
- Firebase backend:
  - `publicLeadIntake`
  - `syncStaffSession`
  - `generateEstimateDraft`
  - `sendEstimateEmail`
  - `sendDueReminders`
  - project finance recalculation triggers

## Firebase Project Setup

Install function dependencies:

```bash
cd functions
npm install
```

Set the bootstrap admin email list so the first admin can sign in:

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase deploy --only firestore,functions,hosting
```

Set the string parameters when prompted during deploy, or preconfigure them with your preferred Firebase parameter workflow:

- `CRM_ADMIN_EMAILS`
  - Comma-separated Google emails allowed to bootstrap as admins
  - Example: `owner@goldenbrickc.com,office@goldenbrickc.com`
- `CRM_EMAIL_FROM`
  - Example: `Golden Brick Construction <info@goldenbrickc.com>`
- `OPENAI_MODEL`
  - Default in code: `gpt-4.1-mini`
- `SITE_BASE_URL`
  - Example: `https://www.goldenbrickc.com`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_FROM_NUMBER`

## Provider Notes

- Google sign-in:
  - Enable Google provider in Firebase Authentication.
- Firestore:
  - Firestore database must be created in the Firebase project.
- Twilio:
  - Needed for live staff SMS alerts and follow-up reminders.
  - Without it, reminder and lead SMS flows run in simulation mode.
- Resend:
  - Needed for live estimate email delivery.
  - Without it, estimate sending is marked as simulation mode.
- OpenAI:
  - Needed for live AI estimate drafting.
  - Without it, the system falls back to template-based draft estimates.

## Staff Access Workflow

1. Add your own Google email to `CRM_ADMIN_EMAILS`.
2. Deploy.
3. Sign into `/staff` with that Google account.
4. Open the `Staff` view and add employees by Google email.
5. Set SMS numbers and default lead assignee from the staff view.
6. Have each employee sign into `/staff` once before you try assigning them to leads or projects, so Firebase can attach a real UID to their record.

Staff records are stored in `allowedStaff`. Once a person signs in with the approved Google email, the backend creates or updates their `users/{uid}` profile automatically.

## Operational Notes

- Website leads are created with status `new_lead`.
- If a default lead assignee is set and has an SMS number, new lead SMS alerts are sent automatically.
- Follow-up reminders are stored in Firestore and sent by the scheduled function every 15 minutes.
- When a lead is converted to a project, the project uses the same document id as the lead for easier linking.
- Project profit is recalculated automatically from payments and expenses.
- Profit display assumes commissions only come from positive profit. Negative jobs still show raw profit, but worker pool does not go below zero.
