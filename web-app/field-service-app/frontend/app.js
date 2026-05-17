const API_URL = 'http://localhost:3000/api/requests';
const LS_KEY = 'fieldservice_requests';
const LS_QUEUE_KEY = 'fieldservice_sync_queue';

let allRequests = [];
let isOnline = false;
let currentCardId = null;

// --- Service Worker ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('Service Worker зарегистрирован'))
    .catch(err => console.warn('SW ошибка:', err));
}

async function checkServer() {
  const was = isOnline;
  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(2000) });
    isOnline = res.ok;
  } catch {
    isOnline = false;
  }
  updateIndicator();

  if (!was && isOnline) {
    await syncQueue();
    await loadRequests();
  }
}

function updateIndicator() {
  const indicator = document.getElementById('statusIndicator');
  if (isOnline) {
    indicator.textContent = '● Онлайн';
    indicator.className = 'status-indicator online';
  } else {
    indicator.textContent = '● Офлайн';
    indicator.className = 'status-indicator offline';
  }
}

checkServer();
setInterval(checkServer, 5000);

// --- LocalStorage ---
function saveToLS(requests) {
  localStorage.setItem(LS_KEY, JSON.stringify(requests));
}

function loadFromLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}

function getQueue() {
  try { return JSON.parse(localStorage.getItem(LS_QUEUE_KEY)) || []; }
  catch { return []; }
}

function saveQueue(queue) {
  localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(queue));
}

function addToQueue(action) {
  const queue = getQueue();
  const isDup = queue.some(q =>
    q.type === action.type &&
    ((q.data && action.data && q.data.id === action.data.id) || q.id === action.id)
  );
  if (!isDup) {
    queue.push(action);
    saveQueue(queue);
  }
  updateUnsyncedBadge();
}

async function syncQueue() {
  if (!isOnline) return;
  const queue = getQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const action of queue) {
    try {
      if (action.type === 'CREATE') {
        const body = { ...action.data };
        delete body.id;
        delete body._unsynced;
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) remaining.push(action);
        else allRequests = allRequests.filter(r => r.id !== action.data.id);
      } else if (action.type === 'PATCH') {
        const res = await fetch(`${API_URL}/${action.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        if (!res.ok) remaining.push(action);
      } else if (action.type === 'DELETE') {
        const res = await fetch(`${API_URL}/${action.id}`, { method: 'DELETE' });
        if (!res.ok) remaining.push(action);
      }
    } catch {
      remaining.push(action);
    }
  }

  saveQueue(remaining);
  saveToLS(allRequests);
}

async function loadRequests() {
  if (isOnline) {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error();
      const serverData = await res.json();
      const unsyncedLocal = allRequests.filter(r =>
        r._unsynced && !serverData.find(s => s.id === r.id)
      );
      allRequests = [...serverData, ...unsyncedLocal];
      saveToLS(allRequests);
    } catch {
      allRequests = loadFromLS();
    }
  } else {
    allRequests = loadFromLS();
  }
  renderList();
  updateUnsyncedBadge();
}

const statusLabel = { new: 'Новая', 'in-progress': 'В работе', done: 'Выполнена' };
const priorityLabel = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };

function renderList() {
  const container = document.getElementById('requestsList');
  const filterStatus = document.getElementById('filterStatus').value;
  const filterPriority = document.getElementById('filterPriority').value;

  let filtered = allRequests.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterPriority && r.priority !== filterPriority) return false;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state">Заявок нет. Создайте первую!</div>';
    return;
  }

  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  container.innerHTML = filtered.map(r => `
    <div class="request-card priority-${r.priority}" data-id="${r.id}">
      <div class="card-header">
        <span class="card-title">${escapeHtml(r.title)}</span>
        <div class="card-badges">
          <span class="badge badge-status-${r.status}">${statusLabel[r.status] || r.status}</span>
          <span class="badge badge-priority-${r.priority}">${priorityLabel[r.priority] || r.priority}</span>
        </div>
      </div>
      ${r.description ? `<div class="card-desc">${escapeHtml(r.description)}</div>` : ''}
      <div class="card-meta">
        ${r.location ? `<span> ${escapeHtml(r.location)}</span>` : ''}
        <span>${formatDate(r.createdAt)}</span>
        ${r._unsynced ? '<span class="card-unsynced">⚠ Не синхр.</span>' : ''}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.request-card').forEach(card => {
    card.addEventListener('click', () => openCard(card.dataset.id));
  });
}

function updateUnsyncedBadge() {
  const unsynced = allRequests.filter(r => r._unsynced);
  const badge = document.getElementById('unsyncedBadge');
  const count = document.getElementById('unsyncedCount');
  if (unsynced.length > 0) {
    badge.classList.remove('hidden');
    count.textContent = unsynced.length;
  } else {
    badge.classList.add('hidden');
  }
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openModal(request = null) {
  document.getElementById('errorTitle').textContent = '';
  document.getElementById('requestForm').reset();

  if (request) {
    document.getElementById('modalTitle').textContent = 'Редактировать заявку';
    document.getElementById('editId').value = request.id;
    document.getElementById('inputTitle').value = request.title || '';
    document.getElementById('inputDescription').value = request.description || '';
    document.getElementById('inputLocation').value = request.location || '';
    document.getElementById('inputStatus').value = request.status || 'new';
    document.getElementById('inputPriority').value = request.priority || 'medium';
  } else {
    document.getElementById('modalTitle').textContent = 'Новая заявка';
    document.getElementById('editId').value = '';
  }
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

document.getElementById('addBtn').addEventListener('click', () => openModal());
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', closeModal);

document.getElementById('requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('inputTitle').value.trim();
  if (!title) {
    document.getElementById('errorTitle').textContent = 'Название обязательно';
    return;
  }
  document.getElementById('errorTitle').textContent = '';

  const editId = document.getElementById('editId').value;
  const data = {
    title,
    description: document.getElementById('inputDescription').value.trim(),
    location: document.getElementById('inputLocation').value.trim(),
    status: document.getElementById('inputStatus').value,
    priority: document.getElementById('inputPriority').value
  };

  if (editId) await updateRequest(editId, data);
  else await createRequest(data);
  closeModal();
});

async function createRequest(data) {
  if (isOnline) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error();
      await loadRequests();
      return;
    } catch {}
  }

  const localItem = {
    ...data,
    id: 'local_' + Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _unsynced: true
  };
  allRequests.push(localItem);
  saveToLS(allRequests);
  addToQueue({ type: 'CREATE', data: localItem });
  renderList();
}

async function updateRequest(id, data) {
  if (isOnline) {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error();
      await loadRequests();
      return;
    } catch {}
  }

  const idx = allRequests.findIndex(r => r.id === id);
  if (idx !== -1) {
    allRequests[idx] = { ...allRequests[idx], ...data, _unsynced: true };
    saveToLS(allRequests);
    addToQueue({ type: 'PATCH', id, data });
    renderList();
  }
}

async function deleteRequest(id) {
  if (isOnline) {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    } catch {}
  } else {
    addToQueue({ type: 'DELETE', id });
  }
  allRequests = allRequests.filter(r => r.id !== id);
  saveToLS(allRequests);
  renderList();
  updateUnsyncedBadge();
}

function openCard(id) {
  const r = allRequests.find(req => req.id === id);
  if (!r) return;
  currentCardId = id;

  document.getElementById('cardContent').innerHTML = `
    <div class="card-detail">
      <div class="card-detail-row">
        <span class="badge badge-status-${r.status}">${statusLabel[r.status] || r.status}</span>
        <span class="badge badge-priority-${r.priority}">${priorityLabel[r.priority] || r.priority}</span>
        ${r._unsynced ? '<span class="card-unsynced">⚠ Не синхронизировано</span>' : ''}
      </div>
      <div class="card-detail-field"><label>Название</label><p>${escapeHtml(r.title)}</p></div>
      ${r.description ? `<div class="card-detail-field"><label>Описание</label><p>${escapeHtml(r.description)}</p></div>` : ''}
      ${r.location ? `<div class="card-detail-field"><label>Место</label><p> ${escapeHtml(r.location)}</p></div>` : ''}
      <div class="card-detail-field"><label>Создана</label><p>${formatDate(r.createdAt)}</p></div>
    </div>
  `;
  document.getElementById('cardModal').classList.remove('hidden');
}

function closeCard() {
  document.getElementById('cardModal').classList.add('hidden');
  currentCardId = null;
}

document.getElementById('cardClose').addEventListener('click', closeCard);
document.getElementById('cardOverlay').addEventListener('click', closeCard);

document.getElementById('cardDeleteBtn').addEventListener('click', async () => {
  if (!currentCardId || !confirm('Удалить заявку?')) return;
  await deleteRequest(currentCardId);
  closeCard();
});

document.getElementById('cardEditBtn').addEventListener('click', () => {
  if (!currentCardId) return;
  const r = allRequests.find(req => req.id === currentCardId);
  closeCard();
  openModal(r);
});

document.getElementById('filterStatus').addEventListener('change', renderList);
document.getElementById('filterPriority').addEventListener('change', renderList);

document.getElementById('syncBtn').addEventListener('click', async () => {
  await checkServer();
  if (isOnline) {
    await syncQueue();
    await loadRequests();
  } else {
    alert('Сервер недоступен. Запустите его: cd backend, npm start');
  }
});

loadRequests();
