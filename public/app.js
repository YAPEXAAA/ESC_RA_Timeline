const els = {
  clock: document.getElementById('clock'),
  home: document.getElementById('screen-home'),
  board: document.getElementById('screen-board'),
  input: document.getElementById('search-input'),
  suggestions: document.getElementById('suggestions'),
  statsStrip: document.getElementById('stats-strip'),
  statPeople: document.getElementById('stat-people'),
  statRange: document.getElementById('stat-range'),
  statUpdated: document.getElementById('stat-updated'),
  backBtn: document.getElementById('back-btn'),
  boardName: document.getElementById('board-name'),
  boardSkill: document.getElementById('board-skill'),
  boardRows: document.getElementById('board-rows'),
  boardEmpty: document.getElementById('board-empty'),
};

// ---------- clock ----------
function tickClock() {
  const now = new Date();
  els.clock.textContent = now.toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
tickClock();
setInterval(tickClock, 30000);

// ---------- stats ----------
function formatDate(dateKey) {
  if (!dateKey) return '—';
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function timeAgo(iso) {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const s = await res.json();
    if (s.employeeCount === 0) return; // stay hidden — nothing to brag about yet
    els.statPeople.textContent = s.employeeCount;
    els.statRange.textContent = s.firstDate ? `${formatDate(s.firstDate)} – ${formatDate(s.lastDate)}` : '—';
    els.statUpdated.textContent = timeAgo(s.lastUpload);
    els.statsStrip.hidden = false;
  } catch (e) { /* stats are a nice-to-have, fail quietly */ }
}
loadStats();

// ---------- search ----------
let debounceTimer;
let activeIndex = -1;
let currentResults = [];

els.input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = els.input.value.trim();
  if (!q) { hideSuggestions(); return; }
  debounceTimer = setTimeout(() => runSearch(q), 150);
});

els.input.addEventListener('keydown', (e) => {
  if (els.suggestions.hidden) return;
  const items = [...els.suggestions.querySelectorAll('.suggestion')];
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex = Math.min(activeIndex + 1, items.length - 1);
    highlight(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    highlight(items);
  } else if (e.key === 'Enter') {
    if (activeIndex >= 0 && currentResults[activeIndex]) {
      selectEmployee(currentResults[activeIndex].id);
    }
  } else if (e.key === 'Escape') {
    hideSuggestions();
  }
});

function highlight(items) {
  items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
  if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
}

async function runSearch(q) {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const results = await res.json();
    currentResults = results;
    activeIndex = -1;
    renderSuggestions(results);
  } catch (e) {
    renderSuggestions([]);
  }
}

function renderSuggestions(results) {
  els.suggestions.innerHTML = '';
  if (results.length === 0) {
    els.suggestions.innerHTML = `<div class="suggestion-empty">No one matches that name yet</div>`;
    els.suggestions.hidden = false;
    return;
  }
  for (const emp of results) {
    const row = document.createElement('div');
    row.className = 'suggestion';
    row.innerHTML = `<span class="suggestion-name">${escapeHtml(emp.name)}</span><span class="suggestion-skill">${escapeHtml(emp.skill || '')}</span>`;
    row.addEventListener('click', () => selectEmployee(emp.id));
    els.suggestions.appendChild(row);
  }
  els.suggestions.hidden = false;
}

function hideSuggestions() {
  els.suggestions.hidden = true;
  els.suggestions.innerHTML = '';
  activeIndex = -1;
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.searchbox')) hideSuggestions();
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- employee board ----------
async function selectEmployee(id) {
  hideSuggestions();
  els.input.value = '';
  try {
    const res = await fetch(`/api/employee/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    renderBoard(data);
    showScreen('board');
    history.pushState({ id }, '', `?employee=${encodeURIComponent(id)}`);
  } catch (e) {
    // silently ignore — could show a toast, kept minimal on purpose
  }
}

function renderBoard(data) {
  els.boardName.textContent = data.employee.name;
  els.boardSkill.textContent = data.employee.skill || '';
  els.boardRows.innerHTML = '';

  if (data.days.length === 0) {
    els.boardEmpty.hidden = false;
    return;
  }
  els.boardEmpty.hidden = true;

  data.days.forEach((day, i) => {
    const row = document.createElement('div');
    row.className = 'board-row';
    row.style.animationDelay = `${i * 45}ms`;

    let barClass = 'bar-other';
    let valueHtml = '';

    if (day.type === 'shift') {
      barClass = 'bar-shift';
      const overnight = day.out <= day.in
        ? '<span class="overnight">next day</span>'
        : '';
      valueHtml = `<span class="time">${day.in}</span><span class="arrow">→</span><span class="time">${day.out}</span>${overnight}`;
    } else if (day.type === 'status') {
      barClass = day.code === 'R' ? 'bar-off' : day.code === 'CP' ? 'bar-leave' : 'bar-other';
      valueHtml = `<span class="status-label">${escapeHtml(day.label)}</span>`;
    } else {
      valueHtml = `<span class="status-label">${escapeHtml(day.in || '')} ${escapeHtml(day.out || '')}</span>`;
    }

    row.innerHTML = `
      <div class="row-date">
        <span class="row-day">${day.dayName}</span>
        <span>${formatDate(day.date)}</span>
      </div>
      <div class="row-bar ${barClass}"></div>
      <div class="row-value">${valueHtml}</div>
    `;
    els.boardRows.appendChild(row);
  });
}

function showScreen(name) {
  els.home.hidden = name !== 'home';
  els.board.hidden = name !== 'board';
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

els.backBtn.addEventListener('click', () => {
  showScreen('home');
  history.pushState({}, '', '/');
});

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('employee');
  if (id) selectEmployee(id); else showScreen('home');
});

// deep link on load
(() => {
  const params = new URLSearchParams(location.search);
  const id = params.get('employee');
  if (id) selectEmployee(id);
})();
