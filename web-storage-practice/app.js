const KEY = 'my-note'; 

const noteEl = document.getElementById('note');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');

window.addEventListener('load', () => {
  const saved = localStorage.getItem(KEY);
  if (saved) {
    noteEl.value = saved;
    showStatus('Заметка восстановлена ✅');
  }
});

saveBtn.addEventListener('click', () => {
  localStorage.setItem(KEY, noteEl.value);
  showStatus('Сохранено ✅');
});

clearBtn.addEventListener('click', () => {
  localStorage.removeItem(KEY);
  noteEl.value = '';
  showStatus('Заметка удалена 🗑️');
});

function showStatus(msg) {
  statusEl.textContent = msg;
  setTimeout(() => statusEl.textContent = '', 2000);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('Service Worker зарегистрирован'))
    .catch(err => console.error('Ошибка SW:', err));
}
