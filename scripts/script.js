const visitorKey = 'signal-room-visitor-id';
const visitorId = localStorage.getItem(visitorKey) || crypto.randomUUID();
localStorage.setItem(visitorKey, visitorId);

const sessionStarted = Date.now();
const visitorCount = document.querySelector('#visitor-count');
const clickCount = document.querySelector('#click-count');
const activityList = document.querySelector('#activity-list');
const lastUpdated = document.querySelector('#last-updated');
const sessionTime = document.querySelector('#session-time');

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function relativeTime(timestamp) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp)) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

function renderActivity(items) {
  if (!items.length) {
    activityList.replaceChildren();
    const emptyState = document.createElement('p');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'Waiting for the first signal...';
    activityList.append(emptyState);
    return;
  }
  const activityEntries = items.slice(0, 8).map((item) => {
    const entry = document.createElement('div');
    entry.className = 'activity-item';

    const marker = document.createElement('span');
    marker.className = 'activity-marker';
    marker.textContent = item.type === 'visitor' ? '✦' : '↗';

    const label = document.createElement('span');
    label.className = 'activity-label';
    label.textContent = item.label;

    const time = document.createElement('time');
    time.className = 'activity-time';
    time.dateTime = item.timestamp;
    time.textContent = relativeTime(item.timestamp);

    entry.append(marker, label, time);
    return entry;
  });
  activityList.replaceChildren(...activityEntries);
}

function renderAnalytics(data) {
  visitorCount.textContent = data.visitors.toLocaleString();
  clickCount.textContent = data.totalClicks.toLocaleString();
  renderActivity(data.activity);
  lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

async function request(path, options) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function syncAnalytics() {
  try {
    renderAnalytics(await request('/api/analytics'));
  } catch {
    lastUpdated.textContent = 'Connection lost';
  }
}

document.querySelectorAll('[data-track]').forEach((link) => {
  link.addEventListener('click', () => {
    request('/api/click', {
      method: 'POST',
      body: JSON.stringify({ label: link.dataset.track }),
      keepalive: true,
    }).catch(() => {});
  });
});

request('/api/visit', { method: 'POST', body: JSON.stringify({ visitorId }) })
  .then(renderAnalytics)
  .catch(() => { lastUpdated.textContent = 'Connection lost'; });

setInterval(syncAnalytics, 5000);
setInterval(() => {
  sessionTime.textContent = formatTime(Math.floor((Date.now() - sessionStarted) / 1000));
}, 1000);
