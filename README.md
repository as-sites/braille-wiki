# braille-mkdocs

A minimal, production-ready documentation site for braille reference material,
built with [MkDocs](https://www.mkdocs.org/) + [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/).

---

## What is this?

This repo contains:

- A static documentation site covering UEB and Nemeth braille.
- A [Decap CMS](https://decapcms.org/) editor UI at `/admin/` for browser-based content editing.
- A Docker-based local development setup.
- A production Dockerfile for deployment to [Railway](https://railway.app/).

---

## Already set up

| What | Where |
|------|-------|
| MkDocs + Material config | `mkdocs.yml` |
| Python dependencies | `requirements.txt` |
| Local dev (Docker Compose) | `docker-compose.yml` |
| Production build + nginx | `Dockerfile` + `nginx.conf` |
| Extra CSS (braille styles) | `docs/stylesheets/extra.css` |
| Decap CMS entry page | `docs/admin/index.html` |
| Decap CMS config (placeholder) | `docs/admin/config.yml` |
| Sample content pages | `docs/index.md`, `docs/ueb/`, `docs/nemeth/`, `docs/reference/` |
| Font placeholder directory | `docs/assets/fonts/` |

---

## Local development

Requires: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (no Python install needed).

```bash
docker compose up
```

The docs site is served with live-reload at <http://localhost:8000>.

To stop: `Ctrl-C`, then `docker compose down`.

---

## Build the static site

```bash
docker compose run --rm docs build
```

The built site is written to `site/` (excluded from git via `.gitignore`).

---

## Files you will edit most often

| File | Purpose |
|------|---------|
| `mkdocs.yml` | Site title, nav, theme options |
| `docs/index.md` | Home page |
| `docs/ueb/introduction.md` | UEB content |
| `docs/nemeth/overview.md` | Nemeth content |
| `docs/reference/ascii-braille-table.md` | Reference table |
| `docs/stylesheets/extra.css` | Custom CSS / braille font |
| `docs/admin/config.yml` | Decap CMS backend + collections |

---

## Adding content

1. Create a new `.md` file under `docs/`.
2. Add it to the `nav:` section in `mkdocs.yml`.
3. Run `docker compose up` and verify it appears in the sidebar.

---

## Decap CMS

The editor UI lives at `/admin/` on the deployed site.

The CMS config is at `docs/admin/config.yml`. It currently has **TODO** placeholders
for the DecapBridge backend values. See the next section for what you need to do manually.

---

## Manual follow-up steps

### 1 · DecapBridge (editor login)

1. Create an account at <https://decapbridge.com>.
2. Register your GitHub repo and this site's URL.
3. DecapBridge will generate a `backend:` block (with `base_url` and `auth_endpoint`).
4. Paste that block into `docs/admin/config.yml`, replacing the `# TODO` lines.
5. Follow DecapBridge's instructions to register an OAuth app in GitHub and store the
   client secret in DecapBridge — do **not** put secrets in this repo.

### 2 · Railway deployment

1. Push this repo to GitHub (if not already done).
2. Create a new project on <https://railway.app/> and select **Deploy from GitHub repo**.
3. Railway will detect the `Dockerfile` automatically.
4. Set the **Start command** if needed (Railway usually infers it from the Dockerfile).
5. Railway will assign a public URL (e.g. `https://YOUR-APP.up.railway.app`).
6. Update `site_url` in `mkdocs.yml` with that URL.

#### Custom domain in Railway

1. In your Railway project, go to **Settings → Networking → Custom Domain**.
2. Enter your domain (e.g. `docs.yourdomain.com`).
3. Railway will show you a CNAME record to add in your DNS provider.
4. Add the CNAME, wait for propagation, and Railway will issue a TLS certificate automatically.

### 3 · Braille font files

1. Obtain a braille font (e.g. `SimBraille.ttf` or a WOFF2 variant).
2. Place the file in `docs/assets/fonts/`.
3. Uncomment and update the `@font-face` block in `docs/stylesheets/extra.css`
   (instructions are inline in that file).

---

## Project structure

```
braille-mkdocs/
├── mkdocs.yml               # MkDocs + Material config
├── requirements.txt         # Python dependencies
├── Dockerfile               # Production build (nginx)
├── nginx.conf               # nginx config template (Railway $PORT aware)
├── docker-compose.yml       # Local dev server
├── .gitignore
├── README.md
└── docs/
    ├── index.md             # Home page
    ├── ueb/
    │   └── introduction.md
    ├── nemeth/
    │   └── overview.md
    ├── reference/
    │   └── ascii-braille-table.md
    ├── admin/
    │   ├── index.html       # Decap CMS loader
    │   └── config.yml       # Decap CMS config (fill in DecapBridge values)
    ├── assets/
    │   └── fonts/           # Drop braille font files here
    └── stylesheets/
        └── extra.css        # Custom CSS
```