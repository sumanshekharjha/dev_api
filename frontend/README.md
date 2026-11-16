# dev 404 — Homepage

This is the homepage / landing page only. The dashboard, API Vault
application, login, signup, backend, authentication and database are not
part of this deliverable.

## Setup

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

To build for production:

```bash
npm run build
```

## Hero background image

The hero section expects a real photograph at:

```
public/images/hero-developer-room.jpg
```

Concept: a developer at a desk in a lived-in home study, surrounded by
books, cables and electronics, with an old, cobweb-covered storage vault
somewhere in the room (symbolic of the API Vault feature). Shot like an
editorial product photograph, not an illustration.

Until that file is added, the hero section falls back to a solid dark
background (`#111111`) so the layout still renders correctly.

## Structure

```
src/
  components/    Navbar, Hero, ApiFlow, CodeBlock, ProductPreview, Footer
  sections/      One file per homepage section, in reading order
  pages/         Home.jsx composes the full page
```

`/login`, `/signup` and the dashboard are referenced as navigation
targets (`Get Started`, `Sign in`) but are intentionally not implemented
in this deliverable.
