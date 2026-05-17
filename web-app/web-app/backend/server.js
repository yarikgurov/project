const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'requests.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function validateRequest(body) {
  const errors = [];
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    errors.push('Поле "title" обязательно и должно быть строкой');
  }
  const validStatuses = ['new', 'in-progress', 'done'];
  if (body.status && !validStatuses.includes(body.status)) {
    errors.push(`Поле "status" должно быть одним из: ${validStatuses.join(', ')}`);
  }
  const validPriorities = ['low', 'medium', 'high'];
  if (body.priority && !validPriorities.includes(body.priority)) {
    errors.push(`Поле "priority" должно быть одним из: ${validPriorities.join(', ')}`);
  }
  return errors;
}

// --- Маршруты ---

// GET /api/requests — получить все заявки
app.get('/api/requests', (req, res) => {
  try {
    const requests = readData();
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка чтения данных', details: err.message });
  }
});

// GET /api/requests/:id — получить одну заявку
app.get('/api/requests/:id', (req, res) => {
  try {
    const requests = readData();
    const request = requests.find(r => r.id === req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }
    res.status(200).json(request);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка чтения данных', details: err.message });
  }
});

// POST 
app.post('/api/requests', (req, res) => {
  try {
    const errors = validateRequest(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Ошибка валидации', details: errors });
    }

    const requests = readData();
    const newRequest = {
      id: Date.now().toString(),
      title: req.body.title.trim(),
      description: req.body.description ? req.body.description.trim() : '',
      status: req.body.status || 'new',
      priority: req.body.priority || 'medium',
      location: req.body.location ? req.body.location.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    requests.push(newRequest);
    writeData(requests);
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания заявки', details: err.message });
  }
});

// PATCH 
app.patch('/api/requests/:id', (req, res) => {
  try {
    const requests = readData();
    const index = requests.findIndex(r => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    const errors = validateRequest({ ...requests[index], ...req.body });
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Ошибка валидации', details: errors });
    }

    const updated = {
      ...requests[index],
      ...req.body,
      id: requests[index].id,
      createdAt: requests[index].createdAt,
      updatedAt: new Date().toISOString()
    };

    requests[index] = updated;
    writeData(requests);
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления заявки', details: err.message });
  }
});

// DELETE 
app.delete('/api/requests/:id', (req, res) => {
  try {
    const requests = readData();
    const index = requests.findIndex(r => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    requests.splice(index, 1);
    writeData(requests);
    res.status(200).json({ message: 'Заявка удалена' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления заявки', details: err.message });
  }
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
