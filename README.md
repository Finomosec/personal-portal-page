# Personal Portal Page

A small self-hosted landing page for the services running on your home/office network. Renders configurable service cards, with category sections, host/location filters, search, on-demand health checks, and a single-password gate. Matrix-green theme.

![Screenshot](docs/screenshot.png?v2)

## Features

- **YAML-driven configuration** — services, hosts, locations, title all in `systems.yaml`
- **Categories**: General (always visible), Management, Internal, AI/MCP — last three only in "Admin" mode (toggle persists in `localStorage`)
- **Filter chips** for hosts, locations, and health status (single-select, click again to clear)
- **Free-text search** over name, description, URL, host
- **On-demand health checks** — parallel HTTP probes with timeout and self-signed-cert support, results visualized as a status dot per card
- **Single-password auth** — HTTP-only, HMAC-signed session cookie (30 day TTL), via SvelteKit hooks
- **Theme-adaptive favicon** that follows the browser's `prefers-color-scheme`
- **Hot-reload of `systems.yaml`** — mtime-cached, no rebuild needed
- **Optional health-check toggle** — set `healthCheck: false` in `systems.yaml` to hide the button entirely

## Tech stack

SvelteKit 2 / Svelte 5, TypeScript, `@sveltejs/adapter-node`, `js-yaml`, `undici` for the probes.

## Quick start

```bash
cp .env.example .env       # set PORTAL_PASSWORD + PORTAL_SECRET (≥ 32 chars)
npm install
npm run dev                # http://localhost:1234
```

## Production build

```bash
npm run build
PORTAL_PASSWORD=… PORTAL_SECRET=… ORIGIN=http://your.host:1234 node build
```

The `ORIGIN` env var must match the URL the browser sees — otherwise SvelteKit's CSRF and the session cookie's `Secure` flag misbehave on plain HTTP.

## Configuration

Edit `systems.yaml`:

```yaml
title: My Portal
healthCheck: true            # optional, default true

hosts:
  myhost: { name: My Host, shortName: MyHost }
  # optional: hidden: true  → host excluded from filter chips

locations:
  home: { name: Home, shortName: Home }

services:
  - id: example
    name: Example
    host: myhost
    location: home              # optional, drives badge + filter
    url: https://example.com
    category: general           # general | management | intern | ai
    icon: gear.svg              # optional, file in static/icons/
    description: Demo entry
    disabled: false             # optional, hide entry entirely
    healthcheck:
      url: https://example.com  # falls back to `url` when omitted
      insecure: true            # optional, skip TLS verification
```

### Icons

Drop SVG/PNG/WebP files into `static/icons/` and reference them by filename. Two generic icons ship out of the box: `gear.svg` (line-art cog) and `camera.svg` (CCTV camera). For service-specific logos, [dashboardicons.com](https://dashboardicons.com/icons) is a good source.

### Auth gate

The `hooks.server.ts` redirects every unauthenticated request to `/login`. The `PUBLIC_PATHS` set lists the few paths that bypass the gate (favicon, login). The session cookie is signed with HMAC-SHA256 against `PORTAL_SECRET`.

## Deployment

The project is small enough that a single `node build` behind a reverse proxy is sufficient. A minimal `systemd --user` unit:

```ini
[Unit]
Description=Personal Portal Page
After=network.target

[Service]
Type=simple
WorkingDirectory=%h/Projects/personal-portal-page
EnvironmentFile=%h/Projects/personal-portal-page/.env
Environment=HOST=0.0.0.0
Environment=PORT=1234
Environment=ORIGIN=http://your.host:1234
ExecStart=/usr/bin/node build
Restart=on-failure

[Install]
WantedBy=default.target
```

Don't forget `loginctl enable-linger USER` if you want the service to survive logout/reboots.

## License

MIT — see [LICENSE](LICENSE).
