const els = {
  empty: document.getElementById('screen-empty'),
  pick: document.getElementById('screen-pick'),
  partners: document.getElementById('screen-partners'),
  compare: document.getElementById('screen-compare'),
  weekRange: document.getElementById('week-range'),
  pickInput: document.getElementById('pick-input'),
  pickSuggestions: document.getElementById('pick-suggestions'),
  agentName: document.getElementById('agent-name'),
  agentSkill: document.getElementById('agent-skill'),
  agentExcluded: document.getElementById('agent-excluded'),
  agentWeek: document.getElementById('agent-week'),
  partnerList: document.getElementById('partner-list'),
  partnerEmpty: document.getElementById('partner-empty'),
  backToPick: document.getElementById('back-to-pick'),
  backToPartners: document.getElementById('back-to-partners'),
  compareNameA: document.getElementById('compare-name-a'),
  compareSkillA: document.getElementById('compare-skill-a'),
  compareWeekA: document.getElementById('compare-week-a'),
  compareNameB: document.getElementById('compare-name-b'),
  compareSkillB: document.getElementById('compare-skill-b'),
  compareWeekB: document.getElementById('compare-week-b'),
};

let DATA = { draftDates: [], employees: [], pairs: [] };
let byId = {};
let partnersOf = {}; // empId -> Set of empIds it can legally swap with

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
  els.empty.hidden = name !== 'empty';
  els.pick.hidden = name !== 'pick';
  els.partners.hidden = name !== 'partners';
  els.compare.hidden = name !== 'compare';
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function renderWeek(container, week) {
  container.innerHTML = '';
  week.forEach((day, i) => {
    const row = document.createElement('div');
    row.className = 'board-row';
    row.style.animationDelay = `${i * 30}ms`;

    let barClass = 'bar-other';
    let valueHtml = '';
    if (day.type === 'shift') {
      barClass = 'bar-shift';
      const overnight = day.out <= day.in ? '<span class="overnight">next day</span>' : '';
      valueHtml = `<span class="time">${day.in}</span><span class="arrow">→</span><span class="time">${day.out}</span>${overnight}`;
    } else if (day.type === 'status') {
      barClass = day.code === 'R' ? 'bar-off' : day.code === 'CP' ? 'bar-leave' : 'bar-other';
      valueHtml = `<span class="status-label">${escapeHtml(day.label || day.code)}</span>`;
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
    container.appendChild(row);
  });
}

// ---------- pick-agent search ----------
let activeIndex = -1;
let currentResults = [];

els.pickInput.addEventListener('input', () => {
  const q = els.pickInput.value.trim().toLowerCase();
  if (!q) { hideSuggestions(); return; }
  currentResults = DATA.employees
    .filter((e) => e.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 20);
  activeIndex = -1;
  renderSuggestions(currentResults);
});

els.pickInput.addEventListener('keydown', (e) => {
  if (els.pickSuggestions.hidden) return;
  const items = [...els.pickSuggestions.querySelectorAll('.suggestion')];
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex = Math.min(activeIndex + 1, items.length - 1);
    highlight(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    highlight(items);
  } else if (e.key === 'Enter') {
    if (activeIndex >= 0 && currentResults[activeIndex]) selectAgent(currentResults[activeIndex].id);
  } else if (e.key === 'Escape') {
    hideSuggestions();
  }
});

function highlight(items) {
  items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
  if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
}

function renderSuggestions(results) {
  els.pickSuggestions.innerHTML = '';
  if (results.length === 0) {
    els.pickSuggestions.innerHTML = `<div class="suggestion-empty">No one matches that name</div>`;
    els.pickSuggestions.hidden = false;
    return;
  }
  for (const emp of results) {
    const row = document.createElement('div');
    row.className = 'suggestion';
    row.innerHTML = `<span class="suggestion-name">${escapeHtml(emp.name)}</span><span class="suggestion-skill">${escapeHtml(emp.skill || '')}</span>`;
    row.addEventListener('click', () => selectAgent(emp.id));
    els.pickSuggestions.appendChild(row);
  }
  els.pickSuggestions.hidden = false;
}

function hideSuggestions() {
  els.pickSuggestions.hidden = true;
  els.pickSuggestions.innerHTML = '';
  activeIndex = -1;
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.searchbox')) hideSuggestions();
});

// ---------- agent + partner list ----------
function selectAgent(id) {
  hideSuggestions();
  els.pickInput.value = '';
  const emp = byId[id];
  if (!emp) return;

  els.agentName.textContent = emp.name;
  els.agentSkill.textContent = emp.skill || '';
  renderWeek(els.agentWeek, emp.week);

  if (emp.excluded) {
    els.agentExcluded.hidden = false;
    els.agentExcluded.innerHTML = `<span>${escapeHtml(emp.excludeReason)}</span> — this agent can't swap or be swapped.`;
    els.partnerList.innerHTML = '';
    els.partnerEmpty.hidden = false;
    els.partnerEmpty.textContent = 'Not eligible for swaps this week.';
  } else {
    els.agentExcluded.hidden = true;
    const partnerIds = [...(partnersOf[id] || [])].sort((a, b) => byId[a].name.localeCompare(byId[b].name));
    els.partnerList.innerHTML = '';
    if (partnerIds.length === 0) {
      els.partnerEmpty.hidden = false;
      els.partnerEmpty.textContent = "No one else's draft week can be swapped with this agent's without breaking the 7-day or 12h-rest rules.";
    } else {
      els.partnerEmpty.hidden = true;
      for (const pid of partnerIds) {
        const p = byId[pid];
        const row = document.createElement('div');
        row.className = 'partner-item';
        row.innerHTML = `<span class="suggestion-name">${escapeHtml(p.name)}</span><span class="suggestion-skill">${escapeHtml(p.skill || '')}</span>`;
        row.addEventListener('click', () => selectCompare(id, pid));
        els.partnerList.appendChild(row);
      }
    }
  }

  showScreen('partners');
}

function selectCompare(idA, idB) {
  const a = byId[idA];
  const b = byId[idB];
  els.compareNameA.textContent = a.name;
  els.compareSkillA.textContent = a.skill || '';
  renderWeek(els.compareWeekA, a.week);

  els.compareNameB.textContent = b.name;
  els.compareSkillB.textContent = b.skill || '';
  renderWeek(els.compareWeekB, b.week);

  showScreen('compare');
}

els.backToPick.addEventListener('click', () => showScreen('pick'));
els.backToPartners.addEventListener('click', () => showScreen('partners'));

// ---------- load ----------
async function init() {
  // Get current user from localStorage
  const currentEmpId = localStorage.getItem('esc_ra_employee_id');
  
  if (!currentEmpId) {
    els.empty.innerHTML = `
      <h1 class="hero-title">Not logged in.</h1>
      <p class="hero-sub">Please go to <a href="/profile.html">Profile</a> and select your name first.</p>
    `;
    showScreen('empty');
    return;
  }

  try {
    const res = await fetch(`/api/swap-candidates?empId=${encodeURIComponent(currentEmpId)}`);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    DATA = await res.json();
  } catch (e) {
    console.error('Failed to load swap candidates:', e);
    els.empty.innerHTML = `
      <h1 class="hero-title">Error loading swap data.</h1>
      <p class="hero-sub">${escapeHtml(e.message)}</p>
    `;
    showScreen('empty');
    return;
  }

  if (!DATA.draftDates || DATA.draftDates.length === 0) {
    showScreen('empty');
    return;
  }

  byId = {};
  for (const e of DATA.employees) byId[e.id] = e;

  partnersOf = {};
  for (const [a, b] of DATA.pairs) {
    (partnersOf[a] ||= new Set()).add(b);
    (partnersOf[b] ||= new Set()).add(a);
  }

  const first = DATA.draftDates[0];
  const last = DATA.draftDates[DATA.draftDates.length - 1];
  els.weekRange.textContent = `Draft week: ${formatDate(first)} – ${formatDate(last)}`;

  showScreen('pick');
  
  // Auto-load current user if they're in the data
  if (byId[currentEmpId]) {
    selectAgent(currentEmpId);
  }
}
init();

// ---------- animated navbar (shared) ----------
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