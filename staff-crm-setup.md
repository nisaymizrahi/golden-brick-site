# Golden Brick Staff CRM Setup

This repo includes a protected `/staff` CRM, Firebase Functions for lead intake, Firestore rules, and public website forms that write directly into the CRM.

## What Is Included

- Public forms on:
  - `/contact.html`
  - `/bathroom-remodeling-philadelphia.html`
  - `/full-renovation-philadelphia/`
- Staff CRM on:
  - `/staff`
- Main CRM sections:
  - `Today`
  - `Tasks`
  - `Leads`
  - `Customers`
  - `Jobs`
  - `Staff`
- Firebase backend:
  - `publicLeadIntake`
  - `syncStaffSession`
  - `generateEstimateDraft`
  - project finance recalculation triggers
  - customer summary sync from linked leads and jobs

## Firebase Project Setup

Install function dependencies:

```bash
cd functions
npm install
```

Deploy the backend:

```bash
firebase deploy --only firestore,functions,hosting
```

Set the string parameters when prompted during deploy, or preconfigure them with your preferred Firebase parameter workflow:

- `CRM_ADMIN_EMAILS`
  - Comma-separated Google emails allowed to bootstrap as admins
  - Example: `owner@goldenbrickc.com,office@goldenbrickc.com`

## Firebase Console Steps

- Authentication:
  - Enable Google sign-in in Firebase Authentication.
- Firestore:
  - Create the Firestore database.
- Hosting / Functions:
  - Use a paid Firebase plan if your current setup requires Cloud Functions in production.

## Staff Access Workflow

1. Add your own Google email to `CRM_ADMIN_EMAILS`.
2. Deploy.
3. Sign into `/staff` with that Google account.
4. Open the `Staff` view and add employees by Google email.
5. Set the default lead assignee if you want one staff member to own new website leads first.
6. Have each employee sign into `/staff` once before you try assigning them to leads, tasks, or jobs, so Firebase can attach a real UID to their record.

Staff approval records are stored in `allowedStaff`. Once a person signs in with the approved Google email, the backend creates or updates their `users/{uid}` profile automatically.

## CRM Workflow Notes

- Website leads are created with status `new_lead`.
- Admins can create manual leads from the `Leads` section and link them to existing customers.
- Each lead can keep one current estimate.
- When a lead is marked won, the CRM creates a linked job record.
- If the lead was not already linked to a customer, the CRM creates a customer card automatically during the win-to-job conversion.
- Customer cards aggregate linked leads, linked jobs, total won sales, and total payments received.
- Tasks can be linked to a lead, customer, or job.
- Employees only see tasks assigned to them, leads assigned to them, and jobs/customers connected to their allowed work.

## Estimate Notes

- Estimate drafting is internal-only in this version.
- `Create Draft` builds a conservative planning estimate from the internal template.
- Staff reviews and edits the estimate in-app.
- Staff can use the print view or copy tools for manual sending outside the CRM.

## Finance Notes

- Winning a lead creates a job record that keeps project staffing, expenses, payments, and commission math.
- Project profit is recalculated automatically from payments and expenses.
- Company share is fixed at 50% of positive profit.
- The remaining 50% becomes the worker pool and follows the saved worker percentages on the job.
