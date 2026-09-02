const STORAGE_KEY = 'esc_ra_employee_id';

const els = {
  setup: document.getElementById('screen-setup'),
  board: document.getElementById('screen-board'),
  searchInput: document.getElementById('search-input'),
  suggestionsEl: document.getElementById('suggestions'),
  logoutBtn: document.getElementById('logout-btn'),
  boardName: document.getElementById('board-name'),
  boardSkill: document.getElementById('board-skill'),
  boardRows: document.getElementById('board-rows'),
  boardEmpty: document.getElementById('board-empty'),
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateKey) {
  if (!dateKey) return '—';
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function showScreen(name) {
  els.setup.hidden = name !== 'setup';
  els.board.hidden = name !== 'board';
}

// ---------- board rendering (same shape as app.js renderBoard) ----------
function renderBoard(data) {
  els.boardName.textContent = data.employee.name;
  els.boardSkill.textContent = data.employee.skill || '';
  els.boardRows.innerHTML = '';

  if (data.days.length === 0) {
    els.boardEmpty.hidden = false;
    return;
  }
  els.boardEmpty.hidden = true;

  function localDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const todayKey = localDateKey(new Date());
  const tomorrowKey = localDateKey(new Date(Date.now() + 86400000));

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

    let badgeHtml = '';
    if (day.date === todayKey) {
      row.classList.add('is-today');
      badgeHtml = `<span class="row-badge badge-today">Today</span>`;
    } else if (day.date === tomorrowKey) {
      row.classList.add('is-tomorrow');
      badgeHtml = `<span class="row-badge badge-tomorrow">Tomorrow</span>`;
    }

    row.innerHTML = `
      <div class="row-date">
        <span class="row-day">${day.dayName}</span>
        <span>${formatDate(day.date)}</span>
      </div>
      <div class="row-bar ${barClass}"></div>
      <div class="row-value">${valueHtml}${badgeHtml}</div>
    `;

    els.boardRows.appendChild(row);
  });
}

// ---------- load saved profile ----------
async function loadSavedProfile(id) {
  try {
    const res = await fetch(`/api/employee/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    renderBoard(data);
    showScreen('board');
  } catch (e) {
    // saved id no longer resolves (e.g. dataset changed) — forget it, fall back to setup
    localStorage.removeItem(STORAGE_KEY);
    showScreen('setup');
  }
}

// ---------- setup / search-to-save ----------
let debounceTimer;
let activeIndex = -1;
let currentResults = [];

els.searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = els.searchInput.value.trim();
  if (!q) { hideSuggestions(); return; }
  debounceTimer = setTimeout(() => runSearch(q), 150);
});

els.searchInput.addEventListener('keydown', (e) => {
  if (els.suggestionsEl.hidden) return;
  const items = [...els.suggestionsEl.querySelectorAll('.suggestion')];
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
      saveAndLoad(currentResults[activeIndex].id);
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
  els.suggestionsEl.innerHTML = '';
  if (results.length === 0) {
    els.suggestionsEl.innerHTML = `<div class="suggestion-empty">No one matches that name yet</div>`;
    els.suggestionsEl.hidden = false;
    return;
  }
  for (const emp of results) {
    const row = document.createElement('div');
    row.className = 'suggestion';
    row.innerHTML = `<span class="suggestion-name">${escapeHtml(emp.name)}</span><span class="suggestion-skill">${escapeHtml(emp.skill || '')}</span>`;
    row.addEventListener('click', () => saveAndLoad(emp.id));
    els.suggestionsEl.appendChild(row);
  }
  els.suggestionsEl.hidden = false;
}

function hideSuggestions() {
  els.suggestionsEl.hidden = true;
  els.suggestionsEl.innerHTML = '';
  activeIndex = -1;
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.searchbox')) hideSuggestions();
});

function saveAndLoad(id) {
  localStorage.setItem(STORAGE_KEY, id);
  hideSuggestions();
  els.searchInput.value = '';
  loadSavedProfile(id);
}

// ---------- logout ----------
els.logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  showScreen('setup');
});

// ---------- init ----------
(() => {
  const savedId = localStorage.getItem(STORAGE_KEY);
  if (savedId) {
    loadSavedProfile(savedId);
  } else {
    showScreen('setup');
  }
})();

// ---------- animated navbar (shared with app.js) ----------
(() => {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('navlinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });

  const here = location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.navlink').forEach((a) => {
    const path = new URL(a.href).pathname.replace(/\/$/, '') || '/';
    if (path === here) a.classList.add('active');
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();