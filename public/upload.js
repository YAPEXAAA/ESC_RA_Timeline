const form = document.getElementById('upload-form');
const msg = document.getElementById('msg');
const btn = document.getElementById('submit-btn');
const historyBox = document.getElementById('history');
const historyList = document.getElementById('history-list');

const MAX_FILE_BYTES = 3 * 1024 * 1024; // keep in sync with api/upload.js

function formatDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// Chunked, since spreading a huge byte array into String.fromCharCode can blow the call stack.
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.innerHTML = '';

  const password = document.getElementById('password').value;
  const file = document.getElementById('file').files[0];

  if (file && file.size > MAX_FILE_BYTES) {
    msg.innerHTML = `<div class="upload-msg error">File too large (max ${MAX_FILE_BYTES / (1024 * 1024)}MB).</div>`;
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Uploading…';

  try {
    const buffer = await file.arrayBuffer();
    const fileBase64 = arrayBufferToBase64(buffer);

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-upload-password': password,
      },
      body: JSON.stringify({ filename: file.name, fileBase64 }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Upload failed');

    const dates = data.datesAffected.map(formatDate).join(', ');
    msg.innerHTML = `<div class="upload-msg success">Published. ${data.employeeCount} people tracked now. Dates updated: ${dates}.</div>`;
    form.reset();
    loadHistory(password);
  } catch (err) {
    msg.innerHTML = `<div class="upload-msg error">${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Upload & publish';
  }
});

async function loadHistory(password) {
  try {
    const res = await fetch('/api/history', { headers: { 'x-upload-password': password } });
    if (!res.ok) return;
    const items = await res.json();
    if (items.length === 0) return;
    historyList.innerHTML = items.map(it => `
      <div class="upload-history-item">
        <span class="fn">${it.filename}</span> — ${it.datesAffected.length} dates
        (${it.datesAffected.map(formatDate).join(', ')}) · ${new Date(it.uploadedAt).toLocaleString('en-GB')}
      </div>
    `).join('');
    historyBox.hidden = false;
  } catch (e) { /* quiet */ }
}
