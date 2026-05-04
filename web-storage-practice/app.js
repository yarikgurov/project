const KEY = 'my-note';

const noteEl = document.getElementById('note');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const statusText = document.querySelector('#status');
const checkBtn = document.querySelector('#checkBtn');

window.addEventListener('load', () => {
  const saved = localStorage.getItem(KEY);
  if (saved) {
    noteEl.value = saved;
  }
});

saveBtn.addEventListener('click', () => {
  localStorage.setItem(KEY, noteEl.value);
});

clearBtn.addEventListener('click', () => {
  localStorage.removeItem(KEY);
  noteEl.value = '';
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw.js')
    .then(reg => {
      statusText.textContent = 'SW зарегистрирован';
    })
    .catch(err => {
      statusText.textContent = 'Запустите через localhost!';
    });
}

checkBtn.addEventListener('click', () => {
  statusText.textContent =
    navigator.onLine ? 'Сеть есть' : 'Офлайн!';
});