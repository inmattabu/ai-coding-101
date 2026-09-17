# Demo Server-Backed Analytics Dashboard

This repository contains a small web application with a Node.js analytics API
that can be served in a container and deployed through a Jenkins pipeline. The
current application code is on the `isaac_dynamic` branch.

The app is an analytics dashboard that demonstrates:

- A global unique visitor counter stored on the server
- A timer showing how long the visitor has stayed on the page
- Global link click tracking for demo navigation links
- A live activity log synchronized from the server

## Repository layout

The `isaac_dynamic` branch contains the following project files:

```text
.
|-- Dockerfile
|-- Jenkinsfile
|-- README.md
|-- css/
|   `-- style.css
|-- docs/
|   `-- ContainerDeploymentManualSteps.pdf
|-- html/
|   `-- index.html
|-- server.js
`-- scripts/
    |-- ascii.sh
    `-- script.js
```

Important files:

- `html/index.html` - dashboard markup served by the Node.js server.
- `css/style.css` - responsive dashboard styling.
- `scripts/script.js` - client-side timer and analytics API integration.
- `server.js` - Node.js static file server and analytics API using
  `/data/analytics.json` for server-side storage.
- `Dockerfile` - builds an Alpine Node.js image and copies the application into
  `/app`.
- `Jenkinsfile` - automates Podman build, cleanup, deployment, and basic
  availability checks for the `isaac_dynamic` branch.

## Prerequisites

For local development:

- Git
- A web browser
- Node.js 22 or later

For container deployment:

- Docker or Podman
- Access to port `9009` on the host machine

For Jenkins deployment:

- A Jenkins agent with Podman and curl installed
- Permission to publish port `9009`

## Run locally

```sh
npm start
```

Open http://localhost:9009. The server stores analytics in
`data/analytics.json`, so visitor and click totals survive restarts. A stable
browser ID in local storage prevents page refreshes from inflating unique
visitors.

## API

- `GET /healthz` - container availability check
- `GET /api/analytics` - current totals and recent activity
- `POST /api/visit` - register a visitor ID
- `POST /api/click` - record a tracked link click

## Container deployment

```sh
podman build -t analytics-dashboard .
podman run --rm -p 9009:9009 -v "${PWD}/data:/app/data:Z" analytics-dashboard
```

The `Jenkinsfile` builds an image tagged with the Jenkins build number,
replaces the running container, mounts the workspace data directory, and polls
`/healthz` before completing.

