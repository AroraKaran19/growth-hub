# Email templates

Each file here is the HTML for one MSG91 email template. The template IDs live in code, in `EMAIL_TEMPLATE_IDS` and `PASSWORD_RESET_TEMPLATE_ID` in `backend/src/constants/notifications.ts`.

To set one up, go to Email > Templates in MSG91 and create a template with exactly the ID below. Paste the file's HTML in, and use the file's `<title>` as the subject. To use a different ID, change it in that constants file.

Every email is on once MSG91 email is set up in `backend/.env`. Until its template exists in MSG91, a send fails and the error is logged. Nothing else breaks.

Every template gets `{{name}}` (the person's first name, or "there") and `{{link}}` (where its button goes). The other variables are listed below.

The header logo loads from `https://growthhubconnect.in/email/logo-white.png`, which is `frontend/public/email/logo-white.png` on the live site. If that file is renamed or the domain changes, update the `<img>` in every template. Where the image can't load, mail apps show the words "Growth Hub" in its place.

## Customers

| File | MSG91 template ID | Sent when | Variables |
| --- | --- | --- | --- |
| welcome.html | `growthhub_welcome` | A new customer saves their email for the first time, finishing sign-up | memberships_link, billing_link, help_link |
| booking-confirmed.html | `growthhub_booking_confirmed` | A day pass is paid | ref, venue, date, time, amount |
| membership-started.html | `growthhub_membership_started` | A membership is paid | ref, venue, plan, starts, amount |
| addon-order-confirmed.html | `growthhub_addon_order_confirmed` | An add-on order is paid | ref, venue, dates, amount |
| cancellation-decided.html | `growthhub_cancellation_decided` | The venue approves or declines a cancellation | ref, venue, outcome, refund, note |
| renewal-failed.html | `growthhub_renewal_failed` | An automatic renewal payment fails | ref, venue |
| membership-lapsed.html | `growthhub_membership_lapsed` | A membership ends unpaid | ref, venue, ends |
| late-payment-released.html | `growthhub_late_payment_released` | A payment arrives after the seat hold ran out | ref, venue, amount |
| venue-removed.html | `growthhub_venue_removed` | A venue is removed with bookings still ahead | ref, venue, reason, amount |
| invoice-ready.html | `growthhub_invoice_ready` | An invoice PDF is made (attached to the email) | invoice_number, description, amount, reference, download_url |
| support-updated.html | `growthhub_support_updated` | Growth Hub replies to a support request or changes its status | ref, subject, status, reply, action (button text), follow_up |

## Venue staff

These go to every active partner login of the venue.

| File | MSG91 template ID | Sent when | Variables |
| --- | --- | --- | --- |
| cancellation-request.html | `growthhub_cancellation_request` | A customer asks to cancel | ref, member, venue, starts, reason, details |
| statement-issued.html | `growthhub_statement_issued` | A monthly payout statement is issued | venue, month, total |
| statement-paid.html | `growthhub_statement_paid` | A statement is marked paid | venue, month, total, utr, paidOn |
| payout-account-changed.html | `growthhub_payout_account_changed` | The venue's payout bank account changes | venue, bank, last4 |

## Staff sign-in

| File | MSG91 template ID | Sent when | Variables |
| --- | --- | --- | --- |
| password-reset.html | `growthhub_password_reset` | An admin or partner asks for a reset link | name, reset_link, expiry_minutes |
