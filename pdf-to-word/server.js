const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const cors = require('cors');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ILOVEPDF_BASE = 'https://api.ilovepdf.com/v1';

// Step 1: Auth
app.post('/api/auth', async (req, res) => {
  const { public_key } = req.body;
  if (!public_key) return res.status(400).json({ error: 'public_key is required' });

  try {
    const r = await fetch(`${ILOVEPDF_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || 'Auth failed' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Step 2: Start task
app.post('/api/start', async (req, res) => {
  const { token } = req.body;
  try {
    const r = await fetch(`${ILOVEPDF_BASE}/start/pdfword`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || 'Start failed' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Step 3: Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const { token, task, server } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  try {
    const form = new FormData();
    form.append('task', task);
    form.append('file', req.file.buffer, { filename: req.file.originalname, contentType: 'application/pdf' });

    const r = await fetch(`https://${server}/v1/upload`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, ...form.getHeaders() },
      body: form
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || 'Upload failed' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Step 4: Process
app.post('/api/process', async (req, res) => {
  const { token, task, server, server_filename, filename } = req.body;
  try {
    const r = await fetch(`https://${server}/v1/process`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, tool: 'pdfword', files: [{ server_filename, filename }] })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || 'Process failed' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Step 5: Download and stream back
app.post('/api/download', async (req, res) => {
  const { token, task, server, filename } = req.body;
  try {
    const r = await fetch(`https://${server}/v1/download/${task}`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!r.ok) return res.status(r.status).json({ error: 'Download failed' });

    const baseName = (filename || 'converted').replace(/\.pdf$/i, '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.docx"`);
    r