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

## Running with Docker

```bash
cp .env.docker.example .env
# edit .env and set SESSION_SECRET to a real random value, e.g.:
#   openssl rand -hex 32
docker compose up -d --build
```

This builds the image (compiling `better-sqlite3` in a build stage, then
copying into a slim runtime image), starts the container, and persists the
database and uploaded files to `./data` and `./uploads` on the host via bind
mounts. Visit `http://<host>:3000`.

## Deploying on ZimaOS

ZimaOS (CasaOS-based) runs apps as Docker containers, so this deploys the
same way as any other self-hosted CasaOS/ZimaOS app:

1. **Get the code onto the device.** Either `git clone` this repo directly on
   the ZimaOS box (SSH in, or use its built-in terminal/File Manager), or
   copy the project folder over via the ZimaOS File Manager / SMB share.
2. **Set the session secret.**
   ```bash
   cp .env.docker.example .env
   openssl rand -hex 32   # paste the output as SESSION_SECRET in .env
   ```
3. **Build and start it** from the project folder over SSH:
   ```bash
   docker compose up -d --build
   ```
   ZimaOS will show it under Docker/Container management, and it'll survive
   reboots (`restart: unless-stopped`).
4. **Or install via the ZimaOS/CasaOS App Store's "Install a customized app"**
   option instead of the CLI: point it at this repo's `docker-compose.yml`,
   map port `3000`, and mount `/app/data` and `/app/uploads` to two folders
   on your storage pool so the library and uploaded files survive container
   updates.
5. Open `http://<your-zimaos-ip>:3000` once the container is running.

To update later: pull the latest code and run `docker compose up -d --build`
again — the bind-mounted `data/` and `uploads/` folders keep your library
intact across rebuilds.

## Notes

- `npm audit` currently reports one moderate advisory in `qs`, pulled in
  transitively through Express 4's `body-parser`. It's the latest patched
  release on the Express 4.x line at time of writing; there is no newer 4.x
  release that resolves it, and moving to Express 5 would be a breaking
  change out of scope here.
- This app does not police the legality of what members upload beyond the
  required rights-confirmation checkbox. If you deploy this publicly, put a
  real moderation and takedown process behind it.
