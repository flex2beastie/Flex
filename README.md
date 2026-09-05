# We The People Library

A branded media library where community members can create an account, upload
books and videos, and download what others have shared. Every item tracks a
running download count.

Built to match the "We The People" podcast branding: dark background, red
accents, bold poster-style headings, and the show's circular microphone logo.

## Features

- **Accounts** — email/password registration and login (passwords hashed with bcrypt).
- **Uploads** — signed-in users can upload books (PDF/EPUB/MOBI/TXT) or videos
  (MP4/WebM/MOV/MKV) up to 2GB, tagged with a type and category.
- **Rights confirmation** — every upload requires the uploader to confirm they
  own the content or otherwise have the right to share it, before the file is
  accepted.
- **Browsing** — search by title/author/description, filter by type and
  category, sort by newest, oldest, or most downloaded.
- **Download counter** — every download increments a per-item counter shown
  on the catalog and detail pages.

## Stack

- Node.js + Express
- SQLite (`better-sqlite3`) for both the catalog and session storage — no
  external database to stand up
- EJS templates, hand-written CSS (no frontend build step)
- `multer` for file uploads, `bcryptjs` for password hashing

## Getting started

```bash
npm install
cp .env.example .env   # edit SESSION_SECRET before deploying anywhere real
npm start
```

Visit `http://localhost:3000`.

Uploaded files are stored on disk in `uploads/`, and the SQLite database
lives in `data/library.db` — both are gitignored and created automatically
on first run.

## Notes

- `npm audit` currently reports one moderate advisory in `qs`, pulled in
  transitively through Express 4's `body-parser`. It's the latest patched
  release on the Express 4.x line at time of writing; there is no newer 4.x
  release that resolves it, and moving to Express 5 would be a breaking
  change out of scope here.
- This app does not police the legality of what members upload beyond the
  required rights-confirmation checkbox. If you deploy this publicly, put a
  real moderation and takedown process behind it.
