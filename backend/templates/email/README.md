# Email templates

Each file here is the HTML for one MSG91 email template. The template IDs live in code, in `EMAIL_TEMPLATE_IDS` and `PASSWORD_RESET_TEMPLATE_ID` in `backend/src/constants/notifications.ts`.

To set one up, go to Email > Templates in MSG91 and create a template with exactly the ID below. Paste the file's HTML in, and use the file's `<title>` as the subject. To use a different ID, change it in that constants file.

Every email is on once MSG91 email is set up in `backend/.env`. Until its template exists in MSG91, a send fails and the error is logged. Nothing else breaks.

MSG91 email templates use Handlebars: the booking and add-on emails list each add-on with `{{#each}}`, and hide the booking's add-ons block with `{{#if addons}}` when there are none. Use the code view when pasting so the editor keeps these lines as they are.

Every template gets `{{name}}` (the person's first name, or "there") and `{{link}}` (where its button goes). The other variables are listed below.

Purchase confirmations (booking, membership start, add-on order) and renewal notices carry their invoice PDF. The invoice worker sends them once the PDF is stored in S3, usually within a minute of payment. If the PDF is still not ready after 15 minutes, the scheduled job sends the confirmation without it, and `{{invoice_note}}` says the invoice will appear in the account instead.

The header logo loads from `https://growthhubconnect.in/email/logo-white.png`, which is `frontend/public/email/logo-white.png` on the live site. If that file is renamed or the domain changes, update the `<img>` in every template. Where the image can't load, mail apps show the words "Growth Hub" in its place.

## Customers

| File | MSG91 template ID | Sent when | Variables |
| --- | --- | --- | --- |
| welcome.html | `growthhub_welcome` | A new customer finishes sign-up (account confirmation) | email, phone, help_link |
| booking-confirmed.html | `growthhub_booking_confirmed` | A booking (desk, room or pass) is paid, with its invoice attached. Its button opens the booking with the check-in QR | booking_id, venue, date, time, addons (list of label, amount; the block hides when empty), amount, invoice_number, invoice_note |
| membership-started.html | `growthhub_membership_started` | A membership is paid, with its first invoice attached | membership_id, venue, plan, starts, amount, invoice_number, invoice_note |
| addon-order-confirmed.html | `growthhub_addon_order_confirmed` | Add-ons bought later for a booking or membership are paid, with the invoice attached | order_id, added_to, venue, items (list of label, amount), dates, amount, invoice_number, invoice_note |
| cancellation-decided.html | `growthhub_cancellation_decided` | The venue approves or declines a cancellation | ref, venue, outcome, refund, note |
| renewal-failed.html | `growthhub_renewal_failed` | An automatic renewal payment fails | membership_id, venue |
| membership-lapsed.html | `growthhub_membership_lapsed` | A membership ends unpaid | membership_id, venue, ends |
| venue-removed.html | `growthhub_venue_removed` | A venue is removed with bookings still ahead | ref, venue, reason, amount |
| membership-renewed.html | `growthhub_membership_renewed` | A membership renewal is charged, with its invoice attached | membership_id, venue, plan, period, renewed_until, amount, invoice_number, invoice_note |
| seat-changed.html | `growthhub_seat_changed` | The venue or Growth Hub moves a booking or membership to another seat | kind, id_label, ref, venue, old_seat, new_seat, effective, note (block hides when empty), action (button text) |
| support-updated.html | `growthhub_support_updated` | Growth Hub replies to a support request or changes its status | request_id, subject, status, reply, action (button text), follow_up |

## Venue staff

These go to every active partner login of the venue.

| File | MSG91 template ID | Sent when | Variables |
| --- | --- | --- | --- |
| cancellation-request.html | `growthhub_cancellation_request` | A customer asks to cancel | ref, member, venue, starts, reason, details |
| statement-issued.html | `growthhub_statement_issued_2` | A monthly payout statement is issued | venue, month, total |
| statement-paid.html | `growthhub_statement_paid` | A statement is marked paid | venue, month, total, utr, paidOn |
| payout-account-changed.html | `growthhub_payout_account_changed` | The venue's payout bank account changes | venue, bank, last4 |

## Staff sign-in

| File | MSG91 template ID | Sent when | Variables |
| --- | --- | --- | --- |
| password-reset.html | `growthhub_password_reset` | An admin or partner asks for a reset link | name, reset_link, expiry_minutes |
