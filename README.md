# Soot Destroyer

Soot Destroyer is a flat-file marketing site with a Cloudflare Worker + D1 booking backend.

## Booking system

The live booking flow is now designed around Cloudflare rather than a third-party booking form:

- `booking.html` — customer booking page
- `booking.js` / `booking.css` — live service, date and time selection
- `admin.html` — protected admin control panel
- `admin.js` / `admin.css` — calendar, bookings, services, hours and blocked dates
- `worker/index.js` — Cloudflare Worker API
- `migrations/0001_booking_system.sql` — D1 schema and starter services
- `wrangler.jsonc` — Worker, D1 and session-KV bindings
- `.assetsignore` — prevents server-side source/config files being published as assets

### What the booking system does

Customers can:

1. Choose a service.
2. Choose a date.
3. See only available start times.
4. Enter contact/address details and notes.
5. Confirm the booking.

The booking is written to D1. Availability is backed by 30-minute booking slots, with a unique database key preventing two customers from claiming the same slot. D1 batches the booking write and slot reservations atomically, so a race for the same appointment fails cleanly. Cloudflare documents D1 batches as transactional and sequential. citeturn1search6

Admins can:

- Sign in at `/admin.html`.
- View a week calendar.
- View all bookings and customer details.
- Mark bookings confirmed, completed or cancelled.
- Change bookable services and prices shown to customers.
- Change service durations in 30-minute increments.
- Change working hours.
- Block/unblock dates.

Admin sessions use an HttpOnly, Secure, SameSite=Lax cookie and Cloudflare KV. Cloudflare specifically documents KV as suitable for authentication details/tokens. citeturn4search0turn3search1

## Cloudflare setup

The repository contains the application code, but the Cloudflare resource IDs and admin password must stay outside GitHub.

1. Create the production D1 database:

```bash
npx wrangler d1 create sootdestroyer-bookings
```

2. Create the session KV namespace:

```bash
npx wrangler kv namespace create SESSIONS
```

3. Put the returned D1 `database_id` and KV `id` into `wrangler.jsonc`, replacing the two `REPLACE_WITH_...` values. Cloudflare requires both IDs for bindings. citeturn2search1turn4search2

4. Apply the booking schema to production D1:

```bash
npx wrangler d1 migrations apply sootdestroyer-bookings --remote
```

5. Set the admin credentials as Worker secrets:

```bash
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
```

6. Deploy the Worker:

```bash
npx wrangler deploy
```

Cloudflare Workers can serve the existing static assets and run the `/api/*` Worker routes as one deployment. citeturn1search4turn1search1

### Important

The starter service durations are deliberately editable in the admin panel. The existing site gives prices but does not provide verified appointment durations, so durations should be confirmed with Liam before opening online booking to customers.

The same applies to working hours: the migration seeds Monday–Saturday 09:00–17:00 and Sunday closed as a starting configuration; update this in the admin panel to the real business hours before launch.

## Existing site

All existing marketing pages and assets remain at repository root, including:

- `index.html`
- `services.html`
- `chimney-sweeping.html`
- `stove-installation.html`
- `stove-packages.html`
- `pricing.html`
- `gallery.html`
- `show-room.html`
- `reviews.html`
- `areas.html`
- `about.html`
- `contact.html`
- `faqs.html`
- `quote.html`
- `privacy.html`
- `terms.html`
- shared CSS/JavaScript and image/video assets
