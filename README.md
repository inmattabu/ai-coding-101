# Signal Room

Server-backed analytics dashboard on the [`isaac-ai-101`](https://github.com/inmattabu/ai-coding-101/tree/isaac-ai-101) branch of [inmattabu/ai-coding-101](https://github.com/inmattabu/ai-coding-101).

A Node.js server serves the dashboard and keeps shared analytics in `data/analytics.json`. The page shows:

- A global unique visitor count. A browser id in `localStorage` keeps refreshes from counting as new visitors.
- A session timer for how long the current tab has been open.
- Click totals for links marked with `data-track`.
- A live activity log, refreshed from the server every 5 seconds.

## Repository layout

```text
.
|-- Dockerfile
|-- Jenkinsfile
|-- README.md
|-- package.json
|-- server.js
|-- css/
|   `-- style.css
|-- data/
|   `-- analytics.json
|-- html/
|   `-- index.html
`-- scripts/
    `-- script.js
```

- `html/index.html` is the Signal Room dashboard.
- `css/style.css` is the dashboard styling.
- `scripts/script.js` registers the visitor, tracks clicks, and polls analytics.
- `server.js` serves those files and the analytics API.
- `data/analytics.json` stores visitor ids, click counts, and recent activity.
- `Dockerfile` builds a Node.js 22 Alpine image and runs the server as the `node` user.
- `Jenkinsfile` builds the image with Podman, replaces the running container, checks `/healthz`, and tags a successful image as `last-successful`.

## Prerequisites

Local development:

- Git
- Node.js 22 or later
- A web browser

Container deployment:

- Docker or Podman

Jenkins deployment:

- A Jenkins agent with Podman and curl
- Permission to publish port `9009`

## Run locally

```sh
npm start
```

The server listens on `PORT`, which defaults to `9009`. Open http://localhost:9009.

Visitor and click totals are written to `data/analytics.json` and survive restarts.

## API

- `GET /healthz` returns `{ "status": "ok" }`.
- `GET /api/analytics` returns visitor and click totals plus recent activity.
- `POST /api/visit` with `{ "visitorId": "..." }` records a visitor id once.
- `POST /api/click` with `{ "label": "..." }` increments that link's click count.

## Container

The image sets `PORT=9009`, so the process listens on `9009` inside the container.

```sh
podman build -t analytics-dashboard .
podman run --rm -p 9009:9009 -v "${PWD}/data:/app/data:Z" analytics-dashboard
```

The `Jenkinsfile` builds `analytics-dashboard:${BUILD_NUMBER}`, replaces the `analytics-dashboard` container, mounts `${WORKSPACE}/data` at `/app/data`, and polls `http://127.0.0.1:9009/healthz`. That pipeline publishes host port `9009` to container port `80`. The server still listens on `9009` unless `PORT` is changed, so a manual run should publish `9009:9009` as shown above.
