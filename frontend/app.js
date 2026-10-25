const API = "http://localhost:8000";

// ── Theme Toggle ──────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-btn');
  btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

initTheme();

// ── Page Navigation ───────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  document.querySelector(`[onclick="showPage('${name}')"]`).classList.add('active');
  if (name === 'blog') loadPosts('all');
  if (name === 'calendar') { renderCalendar(); loadEvents(); }
}

// ════════════════════════════════════════════════════
//  BLOG
// ════════════════════════════════════════════════════
let editingPostId = null;

async function loadPosts(filter = 'all', tabEl = null) {
  if (tabEl) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
  }
  const url = filter === 'all' ? `${API}/posts` : `${API}/posts?status=${filter}`;
  const posts = await fetch(url).then(r => r.json());
  const container = document.getElementById('posts-list');

  if (!posts.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">✏️</div>No posts yet. Click <strong>+ New Post</strong> to get started.</div>`;
    return;
  }

  container.innerHTML = posts.map(p => `
    <div class="post-card">
      <div class="post-body">
        <div class="post-title">${esc(p.title)}</div>
        <div class="post-excerpt">${esc(p.content)}</div>
        <div class="post-meta">
          <span class="badge badge-${p.status}">${p.status}</span>
          <span class="post-date">${p.created_at}</span>
        </div>
      </div>
      <div class="post-actions">
        <button class="icon-btn" onclick="editPost(${p.id})">Edit</button>
        <button class="icon-btn danger" onclick="deletePost(${p.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function openPostModal(post = null) {
  editingPostId = post ? post.id : null;
  document.getElementById('post-modal-title').textContent = post ? 'Edit Post' : 'New Post';
  document.getElementById('post-title').value = post ? post.title : '';
  document.getElementById('post-content').value = post ? post.content : '';
  document.getElementById('post-status').value = post ? post.status : 'draft';
  document.getElementById('post-modal').classList.remove('hidden');
  document.getElementById('post-title').focus();
}

function closePostModal() {
  document.getElementById('post-modal').classList.add('hidden');
}

async function editPost(id) {
  const post = await fetch(`${API}/posts/${id}`).then(r => r.json());
  openPostModal(post);
}

async function savePost() {
  const title   = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  const status  = document.getElementById('post-status').value;
  if (!title || !content) { alert('Please fill in both title and content.'); return; }

  const body = { title, content, status };
  if (editingPostId) {
    await fetch(`${API}/posts/${editingPostId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } else {
    await fetch(`${API}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }
  closePostModal();
  loadPosts('all');
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  await fetch(`${API}/posts/${id}`, { method: 'DELETE' });
  loadPosts('all');
}

// ════════════════════════════════════════════════════
//  CALENDAR
// ════════════════════════════════════════════════════
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
let calYear, calMonth;
let eventDates = new Set();
let editingEventId = null;

function initCalendar() {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

function renderCalendar() {
  document.getElementById('cal-title').textContent = `${MONTHS[calMonth]} ${calYear}`;
  const grid = document.getElementById('cal-grid');
  const today = new Date();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrev  = new Date(calYear, calMonth, 0).getDate();

  let html = DAYS.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  // Prev month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-cell other-month">${daysInPrev - i}</div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const hasEv   = eventDates.has(dateStr);
    html += `<div class="cal-cell ${isToday?'today':''} ${hasEv?'has-event':''}" onclick="openEventModal('${dateStr}')">${d}</div>`;
  }

  // Next month padding
  const total = firstDay + daysInMonth;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-cell other-month">${d}</div>`;
  }

  grid.innerHTML = html;
}

async function loadEvents() {
  const events = await fetch(`${API}/events`).then(r => r.json());
  eventDates = new Set(events.map(e => e.event_date));
  renderCalendar();

  const container = document.getElementById('events-list');
  if (!events.length) {
    container.innerHTML = `<div class="empty-state" style="padding:30px 0"><div class="empty-icon">📅</div>No events yet.</div>`;
    return;
  }

  container.innerHTML = events.map(e => {
    const d = e.days_until;
    let countdownClass, countdownText;
    if (d > 0)       { countdownClass = 'future'; countdownText = `In ${d} day${d !== 1 ? 's' : ''}`; }
    else if (d === 0) { countdownClass = 'today';  countdownText = 'Today!'; }
    else              { countdownClass = 'past';   countdownText = `${Math.abs(d)} days ago`; }

    return `
    <div class="event-card">
      <div class="event-name">${esc(e.name)}</div>
      <div class="event-date">📅 ${formatDate(e.event_date)}</div>
      <span class="countdown ${countdownClass}">${countdownText}</span>
      ${e.note ? `<div class="event-note">${esc(e.note)}</div>` : ''}
      <div class="event-card-footer">
        <button class="icon-btn" onclick="editEvent(${e.id})">Edit</button>
        <button class="icon-btn danger" onclick="deleteEvent(${e.id})">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function openEventModal(dateStr = '') {
  editingEventId = null;
  document.getElementById('event-modal-title').textContent = 'New Event';
  document.getElementById('event-name').value = '';
  document.getElementById('event-date').value = dateStr;
  document.getElementById('event-note').value = '';
  document.getElementById('event-modal').classList.remove('hidden');
  document.getElementById('event-name').focus();
}

function closeEventModal() {
  document.getElementById('event-modal').classList.add('hidden');
}

async function editEvent(id) {
  const events = await fetch(`${API}/events`).then(r => r.json());
  const ev = events.find(e => e.id === id);
  if (!ev) return;
  editingEventId = id;
  document.getElementById('event-modal-title').textContent = 'Edit Event';
  document.getElementById('event-name').value = ev.name;
  document.getElementById('event-date').value = ev.event_date;
  document.getElementById('event-note').value = ev.note || '';
  document.getElementById('event-modal').classList.remove('hidden');
}

async function saveEvent() {
  const name = document.getElementById('event-name').value.trim();
  const date = document.getElementById('event-date').value;
  const note = document.getElementById('event-note').value.trim();
  if (!name || !date) { alert('Please fill in event name and date.'); return; }

  const body = { name, event_date: date, note };
  if (editingEventId) {
    await fetch(`${API}/events/${editingEventId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } else {
    await fetch(`${API}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }
  closeEventModal();
  loadEvents();
}

async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  await fetch(`${API}/events/${id}`, { method: 'DELETE' });
  loadEvents();
}

// ── Helpers ───────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
}

// ── Init ──────────────────────────────────────────
initCalendar();
loadPosts('all');