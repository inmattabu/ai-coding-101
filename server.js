const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 9009);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'analytics.json');
const MAX_ACTIVITY = 30;
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};
const PUBLIC_FILES = {
  '/': 'html/index.html',
  '/index.html': 'html/index.html',
  '/css/style.css': 'css/style.css',
  '/scripts/script.js': 'scripts/script.js',
};

function emptyAnalytics() {
  return { visitorIds: [], clicks: {}, activity: [] };
}

function loadAnalytics() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const initial = emptyAnalytics();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }

  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      visitorIds: Array.isArray(saved.visitorIds) ? saved.visitorIds : [],
      clicks: saved.clicks && typeof saved.clicks === 'object' ? saved.clicks : {},
      activity: Array.isArray(saved.activity) ? saved.activity.slice(0, MAX_ACTIVITY) : [],
    };
  } catch (error) {
    console.error('Could not read analytics data:', error.message);
    return emptyAnalytics();
  }
}

let analytics = loadAnalytics();

function saveAnalytics() {
  const temporaryFile = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(analytics, null, 2));
  fs.renameSync(temporaryFile, DATA_FILE);
}

function addActivity(type, label) {
  analytics.activity.unshift({
    id: crypto.randomUUID(),
    type,
    label,
    timestamp: new Date().toISOString(),
  });
  analytics.activity = analytics.activity.slice(0, MAX_ACTIVITY);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function sendError(response, status, message) {
  sendJson(response, status, { error: message });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10_000) {
        reject(new Error('Request body is too large'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });
    request.on('error', reject);
  });
}

function analyticsSummary() {
  return {
    visitors: analytics.visitorIds.length,
    totalClicks: Object.values(analytics.clicks).reduce((sum, count) => sum + count, 0),
    clicks: analytics.clicks,
    activity: analytics.activity,
  };
}

function serveStatic(request, response, pathname) {
  const publicFile = PUBLIC_FILES[pathname];
  if (!publicFile) {
    sendError(response, 404, 'Not found');
    return;
  }
  const filePath = path.join(ROOT, publicFile);

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendError(response, error.code === 'ENOENT' ? 404 : 500, 'Not found');
      return;
    }
    response.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream',
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/healthz' && request.method === 'GET') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (requestUrl.pathname === '/api/analytics' && request.method === 'GET') {
    sendJson(response, 200, analyticsSummary());
    return;
  }

  if (requestUrl.pathname === '/api/visit' && request.method === 'POST') {
    try {
      const body = await readJson(request);
      const visitorId = typeof body.visitorId === 'string' ? body.visitorId.trim() : '';
      if (!visitorId || visitorId.length > 100) {
        sendError(response, 400, 'A valid visitorId is required');
        return;
      }
      if (!analytics.visitorIds.includes(visitorId)) {
        analytics.visitorIds.push(visitorId);
        addActivity('visitor', 'New visitor joined');
        saveAnalytics();
      }
      sendJson(response, 200, analyticsSummary());
    } catch (error) {
      sendError(response, 400, error.message);
    }
    return;
  }

  if (requestUrl.pathname === '/api/click' && request.method === 'POST') {
    try {
      const body = await readJson(request);
      const label = typeof body.label === 'string' ? body.label.trim().slice(0, 80) : '';
      if (!label) {
        sendError(response, 400, 'A link label is required');
        return;
      }
      analytics.clicks[label] = (analytics.clicks[label] || 0) + 1;
      addActivity('click', `Clicked ${label}`);
      saveAnalytics();
      sendJson(response, 200, analyticsSummary());
    } catch (error) {
      sendError(response, 400, error.message);
    }
    return;
  }

  if (request.method === 'GET') {
    serveStatic(request, response, requestUrl.pathname);
    return;
  }

  sendError(response, 405, 'Method not allowed');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Analytics dashboard listening on http://localhost:${PORT}`);
});
