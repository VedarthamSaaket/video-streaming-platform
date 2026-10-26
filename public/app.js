const state = {
  videos: [],
  search: '',
};

const elements = {
  grid: document.getElementById('video-grid'),
  empty: document.getElementById('empty-state'),
  form: document.getElementById('upload-form'),
  fileInput: document.getElementById('file'),
  fileLabel: document.getElementById('file-label'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  button: document.getElementById('upload-button'),
  status: document.getElementById('upload-status'),
  dot: document.getElementById('health-dot'),
  instance: document.getElementById('instance-label'),
  footerInstance: document.getElementById('footer-instance'),
  videos: document.getElementById('stat-videos'),
  views: document.getElementById('stat-views'),
  size: document.getElementById('stat-size'),
  search: document.getElementById('search'),
  dropZone: document.getElementById('drop-zone'),
};

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

async function api(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

async function loadHealth() {
  try {
    const health = await api('/health');
    elements.dot.className = `dot ${health.status === 'ok' ? 'ok' : 'bad'}`;
    elements.instance.textContent = `served by ${health.instance}`;
    elements.footerInstance.textContent = `StreamVault ${health.version} · ${health.instance}`;
  } catch {
    elements.dot.className = 'dot bad';
    elements.instance.textContent = 'health unavailable';
  }
}

async function loadStats() {
  const stats = await api('/api/stats');
  elements.videos.textContent = stats.videoCount;
  elements.views.textContent = Number(stats.totalViews).toLocaleString('en-US');
  elements.size.textContent = formatBytes(stats.totalBytes);
}

function renderVideos() {
  elements.grid.replaceChildren();
  const visible = state.videos.filter((video) =>
    video.title.toLowerCase().includes(state.search.toLowerCase())
  );
  elements.empty.hidden = visible.length > 0;

  for (const video of visible) {
    const card = document.createElement('article');
    card.className = 'card';

    const player = document.createElement('video');
    player.controls = true;
    player.preload = 'metadata';
    player.src = `/api/videos/${video.id}/stream#t=0.5`;

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h3');
    title.textContent = video.title;

    const description = document.createElement('p');
    description.textContent = video.description || 'No description';

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span>${formatBytes(video.sizeBytes)}</span><span>${Number(video.views).toLocaleString('en-US')} views</span><span>${formatDate(video.createdAt)}</span>`;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const link = document.createElement('a');
    link.href = `/api/videos/${video.id}/download`;
    link.textContent = 'Download';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      if (!window.confirm(`Delete "${video.title}"?`)) return;
      await api(`/api/videos/${video.id}`, { method: 'DELETE' });
      await refresh();
    });

    actions.append(link, remove);
    body.append(title, description, meta, actions);
    card.append(player, body);
    elements.grid.append(card);
  }
}

async function loadVideos() {
  const data = await api('/api/videos?limit=100');
  state.videos = data.items;
  renderVideos();
}

async function refresh() {
  await Promise.all([loadHealth(), loadStats(), loadVideos()]);
}

elements.fileInput.addEventListener('change', () => {
  const file = elements.fileInput.files[0];
  elements.fileLabel.textContent = file ? file.name : 'Choose a video file or drop it here';
});

for (const eventName of ['dragenter', 'dragover']) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add('dragging');
  });
}

for (const eventName of ['dragleave', 'drop']) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove('dragging');
  });
}

elements.dropZone.addEventListener('drop', (event) => {
  if (event.dataTransfer?.files?.length) {
    elements.fileInput.files = event.dataTransfer.files;
    elements.fileLabel.textContent = event.dataTransfer.files[0].name;
  }
});

elements.search.addEventListener('input', () => {
  state.search = elements.search.value;
  renderVideos();
});

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const file = elements.fileInput.files[0];
  if (!file) {
    elements.status.textContent = 'Choose a video file first.';
    elements.status.className = 'status error';
    return;
  }

  const formData = new FormData();
  formData.append('title', elements.title.value);
  formData.append('description', elements.description.value);
  formData.append('file', file);

  const request = new XMLHttpRequest();
  request.open('POST', '/api/videos');

  elements.button.disabled = true;
  elements.status.className = 'status';
  elements.status.textContent = 'Uploading 0%';

  request.upload.addEventListener('progress', (progressEvent) => {
    if (!progressEvent.lengthComputable) return;
    const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
    elements.status.textContent = `Uploading ${percent}%`;
  });

  request.addEventListener('load', async () => {
    elements.button.disabled = false;
    if (request.status === 201) {
      elements.status.textContent = 'Uploaded. Streaming is ready.';
      elements.form.reset();
      elements.fileLabel.textContent = 'Choose a video file or drop it here';
      await refresh();
      return;
    }
    let message = `Upload failed with ${request.status}`;
    try {
      message = JSON.parse(request.responseText).error || message;
    } catch {
      // keep default message
    }
    elements.status.textContent = message;
    elements.status.className = 'status error';
  });

  request.addEventListener('error', () => {
    elements.button.disabled = false;
    elements.status.textContent = 'Upload failed. Check the network and try again.';
    elements.status.className = 'status error';
  });

  request.send(formData);
});

refresh().catch((error) => {
  elements.status.textContent = error.message;
  elements.status.className = 'status error';
});
