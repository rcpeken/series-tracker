let series = [];
let currentFilter = 'all';
let searchQuery = '';
const STORAGE_KEY = 'dizi_takipci_data';

function load(cb) {
  chrome.storage.local.get([STORAGE_KEY], result => {
    series = result[STORAGE_KEY] || [];
    cb();
  });
}
function save() {
  chrome.storage.local.set({ [STORAGE_KEY]: series });
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function statusLabel(s) { return { watching: 'İzliyorum', paused: 'Beklemede', done: 'Bitti' }[s] || s; }
function epLabel(s, e) { return `S${String(s).padStart(2,'0')}E${String(e).padStart(2,'0')}`; }
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function checkActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return;
    const url = tabs[0].url || '';
    const match = url.match(/\/dizi\/([^/]+)\/sezon-(\d+)\/bolum-(\d+)/i);
    if (!match) {
      document.getElementById('autoBanner').style.display = 'none';
      return;
    }

    const slug = match[1];
    const season = parseInt(match[2]);
    const episode = parseInt(match[3]);

    const found = series.find(s => s.slug === slug);
    const name = found ? found.name : slug.replace(/-\d+$/, '').split('-').map(w => w[0].toUpperCase()+w.slice(1)).join(' ');

    const banner = document.getElementById('autoBanner');
    const text = document.getElementById('autoText');
    banner.style.display = 'flex';
    text.textContent = `${name} · ${epLabel(season, episode)} izleniyor`;
  });
}

function render() {
  const list = document.getElementById('seriesList');
  const empty = document.getElementById('emptyState');
  Array.from(list.querySelectorAll('.card')).forEach(el => el.remove());

  const filtered = series.filter(s => {
    const mf = currentFilter === 'all' || s.status === currentFilter;
    const ms = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return mf && ms;
  });

  if (filtered.length === 0) { empty.classList.add('visible'); return; }
  empty.classList.remove('visible');

  const order = { watching: 0, paused: 1, done: 2 };
  const sorted = [...filtered].sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return a.name.localeCompare(b.name, 'tr');
  });
  sorted.forEach(item => list.appendChild(createCard(item)));
}

function createCard(item) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = item.id;

  const autoTag = item.autoAdded ? `<span class="auto-tag" title="Otomatik algılandı">AUTO</span>` : '';

  card.innerHTML = `
    <div class="card-status ${item.status}"></div>
    <div class="card-info">
      <div class="card-name" title="${escHtml(item.name)}">
        ${escHtml(item.name)} ${autoTag}
      </div>
      <div class="card-progress">
        <span class="card-ep">${epLabel(item.season, item.episode)}</span>
        <span class="card-badge ${item.status}">${statusLabel(item.status)}</span>
      </div>
      ${item.note ? `<div class="card-note" title="${escHtml(item.note)}">💬 ${escHtml(item.note)}</div>` : ''}
    </div>
    <div class="card-actions">
      <button class="btn-icon next" title="Sonraki bölüm">▶</button>
      <button class="btn-icon edit" title="Düzenle">✏</button>
      <button class="btn-icon danger delete" title="Sil">🗑</button>
    </div>
  `;

  card.querySelector('.next').addEventListener('click', () => nextEpisode(item.id));
  card.querySelector('.edit').addEventListener('click', () => openEditForm(item.id));
  card.querySelector('.delete').addEventListener('click', () => deleteSeries(item.id));
  return card;
}

function nextEpisode(id) {
  const item = series.find(s => s.id === id);
  if (!item) return;
  item.episode++;
  item.updatedAt = Date.now();
  save(); render();
}

function deleteSeries(id) {
  series = series.filter(s => s.id !== id);
  save(); render();
}

function openEditForm(id) {
  const item = series.find(s => s.id === id);
  if (!item) return;
  document.getElementById('formTitle').textContent = 'Düzenle';
  document.getElementById('editingId').value = id;
  document.getElementById('inputName').value = item.name;
  document.getElementById('inputSeason').value = item.season;
  document.getElementById('inputEpisode').value = item.episode;
  document.getElementById('inputNote').value = item.note || '';
  setStatus(item.status);
  openForm();
}

let selectedStatus = 'watching';
function setStatus(val) {
  selectedStatus = val;
  document.querySelectorAll('.status-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.value === val));
}
function openForm() {
  document.getElementById('formOverlay').classList.add('open');
  setTimeout(() => document.getElementById('inputName').focus(), 50);
}
function closeForm() {
  document.getElementById('formOverlay').classList.remove('open');
  resetForm();
}
function resetForm() {
  document.getElementById('formTitle').textContent = 'Dizi Ekle';
  document.getElementById('editingId').value = '';
  document.getElementById('inputName').value = '';
  document.getElementById('inputSeason').value = '1';
  document.getElementById('inputEpisode').value = '1';
  document.getElementById('inputNote').value = '';
  setStatus('watching');
}
function saveSeries() {
  const name = document.getElementById('inputName').value.trim();
  const season = parseInt(document.getElementById('inputSeason').value) || 1;
  const episode = parseInt(document.getElementById('inputEpisode').value) || 1;
  const note = document.getElementById('inputNote').value.trim();
  const editingId = document.getElementById('editingId').value;

  if (!name) {
    const inp = document.getElementById('inputName');
    inp.focus(); inp.style.borderColor = '#ff5555';
    setTimeout(() => inp.style.borderColor = '', 1200);
    return;
  }

  if (editingId) {
    const item = series.find(s => s.id === editingId);
    if (item) Object.assign(item, { name, season, episode, status: selectedStatus, note, updatedAt: Date.now() });
  } else {
    series.push({ id: uid(), slug: null, name, season, episode, status: selectedStatus, note, autoAdded: false, createdAt: Date.now(), updatedAt: Date.now() });
  }

  save(); closeForm(); render();
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    series = changes[STORAGE_KEY].newValue || [];
    render();
    checkActiveTab();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  load(() => { render(); checkActiveTab(); });

  document.getElementById('btnShowForm').addEventListener('click', () => { resetForm(); openForm(); });
  document.getElementById('btnCloseForm').addEventListener('click', closeForm);
  document.getElementById('formOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeForm(); });
  document.getElementById('btnSave').addEventListener('click', saveSeries);
  document.getElementById('inputName').addEventListener('keydown', e => { if (e.key === 'Enter') saveSeries(); });
  document.querySelectorAll('.status-btn').forEach(btn => btn.addEventListener('click', () => setStatus(btn.dataset.value)));

  document.getElementById('filterTabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    render();
  });

  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value;
    render();
  });
});
