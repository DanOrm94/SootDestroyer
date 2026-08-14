# Soot Destroyer — modern static website

A responsive, modern single-page website concept for Soot Destroyer.

## Files

- `index.html` — complete website structure and content
- `styles.css` — responsive visual design
- `script.js` — mobile navigation, reveal animations, FAQ accordion and demo enquiry form

## Run locally

No build step is required.

Open `index.html` directly in a browser, or serve the folder with any static web server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Before launch

Replace the placeholder phone number and email address in `index.html`.

The enquiry form currently demonstrates the UI only. Connect `#bookingForm` to Formspree, Resend, a server endpoint, CRM, or the preferred booking system.

Replace the CSS-generated artwork with real project photography in the `assets/` folder when available.
