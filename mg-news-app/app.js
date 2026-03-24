const CATEGORY_ORDER = [
  { key: 'saemaeul', label: '새마을금고' },
  { key: 'nonghyup', label: '농협' },
  { key: 'bank', label: '은행권' }
];

const FONT_STORAGE_KEY = 'mg-news-font-size';
const READ_STORAGE_KEY = 'mg-news-read-links';

function formatDateTime(value) {
  if (!value) return '업데이트 정보 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function escapeText(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

function getReadLinks() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveReadLink(url) {
  const current = getReadLinks();
  current.add(url);
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...current]));
}

function applyFontSize(size) {
  document.documentElement.setAttribute('data-font-size', size);
  localStorage.setItem(FONT_STORAGE_KEY, size);
  document.querySelectorAll('.size-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.size === size);
  });
}

function renderList(containerId, items) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (!items?.length) {
    const empty = document.createElement('li');
    empty.innerHTML = '<div class="empty-state">현재 표시할 뉴스가 없습니다.</div>';
    container.appendChild(empty);
    return;
  }

  const template = document.getElementById('storyTemplate');
  const readLinks = getReadLinks();

  items.forEach((item) => {
    const clone = template.content.firstElementChild.cloneNode(true);
    const link = clone.querySelector('.story-link');
    const title = clone.querySelector('.story-title');
    const meta = clone.querySelector('.story-meta');

    link.href = item.link;
    title.textContent = escapeText(item.title);
    meta.textContent = [item.source, item.pubDate ? formatDateTime(item.pubDate) : null].filter(Boolean).join(' · ');

    if (readLinks.has(item.link)) {
      link.classList.add('read');
    }

    link.addEventListener('click', () => {
      saveReadLink(item.link);
      link.classList.add('read');
    });

    container.appendChild(clone);
  });
}

function renderCounts(categories) {
  document.getElementById('count-saemaeul').textContent = `${categories.saemaeul?.length || 0}건`;
  document.getElementById('count-nonghyup').textContent = `${categories.nonghyup?.length || 0}건`;
  document.getElementById('count-bank').textContent = `${categories.bank?.length || 0}건`;
}

function renderTopStories(items) {
  renderList('topStories', items?.slice(0, 3) || []);
}

async function loadNews() {
  try {
    const response = await fetch('./data/news.json', { cache: 'no-store' });
    const data = await response.json();

    document.getElementById('updatedAt').textContent = formatDateTime(data.updatedAt);
    document.getElementById('articleCount').textContent = `${data.totalCount || 0}건`;

    renderTopStories(data.topStories || []);
    renderList('list-saemaeul', data.categories?.saemaeul || []);
    renderList('list-nonghyup', data.categories?.nonghyup || []);
    renderList('list-bank', data.categories?.bank || []);
    renderCounts(data.categories || {});
  } catch (error) {
    console.error(error);
    ['topStories', 'list-saemaeul', 'list-nonghyup', 'list-bank'].forEach((id) => renderList(id, []));
    document.getElementById('updatedAt').textContent = '불러오기 실패';
    document.getElementById('articleCount').textContent = '0건';
  }
}

function initFontControls() {
  const saved = localStorage.getItem(FONT_STORAGE_KEY) || 'medium';
  applyFontSize(saved);
  document.querySelectorAll('.size-btn').forEach((button) => {
    button.addEventListener('click', () => applyFontSize(button.dataset.size));
  });
}

initFontControls();
loadNews();
