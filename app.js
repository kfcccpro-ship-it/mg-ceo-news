const CATEGORY_META = {
  saemaeul: { label: '새마을금고', icon: '🏦' },
  nonghyup: { label: '농협', icon: '🌾' },
  bank: { label: '은행', icon: '💳' }
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function renderTopStories(items) {
  const container = document.getElementById('topStories');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        표시할 주요 기사가 없습니다.
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item, index) => {
    const category = CATEGORY_META[item.category] || { label: '기타', icon: '📰' };
    return `
      <article class="top-story-card">
        <div class="top-story-rank">${index + 1}</div>
        <div class="top-story-content">
          <div class="top-story-meta">
            <span class="badge">${category.icon} ${escapeHtml(category.label)}</span>
            <span class="source">${escapeHtml(item.source || '출처 미상')}</span>
          </div>
          <h3 class="top-story-title">
            <a href="${escapeHtml(item.link || '#')}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(item.title || '제목 없음')}
            </a>
          </h3>
          <p class="top-story-desc">${escapeHtml(item.description || '')}</p>
          <div class="top-story-date">${escapeHtml(item.pubDate || '')}</div>
        </div>
      </article>
    `;
  }).join('');
}

function renderList(elementId, items) {
  const container = document.getElementById(elementId);
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        기사 없음
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="news-item">
      <h4 class="news-title">
        <a href="${escapeHtml(item.link || '#')}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(item.title || '제목 없음')}
        </a>
      </h4>
      <p class="news-desc">${escapeHtml(item.description || '')}</p>
      <div class="news-meta">
        <span>${escapeHtml(item.source || '출처 미상')}</span>
        <span>${escapeHtml(item.pubDate || '')}</span>
      </div>
    </article>
  `).join('');
}

function renderCounts(categories) {
  const setCount = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${count}건`;
  };

  setCount('count-saemaeul', categories.saemaeul?.length || 0);
  setCount('count-nonghyup', categories.nonghyup?.length || 0);
  setCount('count-bank', categories.bank?.length || 0);
}

function normalizeData(data) {
  const sections = Array.isArray(data.sections) ? data.sections : [];

  const categories = {
    saemaeul: sections.find((s) => s.key === 'saemaeul')?.items || [],
    nonghyup: sections.find((s) => s.key === 'nonghyup')?.items || [],
    bank: sections.find((s) => s.key === 'bank')?.items || []
  };

  categories.saemaeul = categories.saemaeul.map((item) => ({ ...item, category: 'saemaeul' }));
  categories.nonghyup = categories.nonghyup.map((item) => ({ ...item, category: 'nonghyup' }));
  categories.bank = categories.bank.map((item) => ({ ...item, category: 'bank' }));

  const allItems = [
    ...categories.saemaeul,
    ...categories.nonghyup,
    ...categories.bank
  ];

  return {
    updatedAt: data.updatedAt,
    categories,
    totalCount: allItems.length,
    topStories: allItems.slice(0, 3)
  };
}

async function loadNews() {
  try {
    const response = await fetch('./data/news.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rawData = await response.json();
    const data = normalizeData(rawData);

    const updatedAtEl = document.getElementById('updatedAt');
    const articleCountEl = document.getElementById('articleCount');

    if (updatedAtEl) {
      updatedAtEl.textContent = formatDateTime(data.updatedAt);
    }

    if (articleCountEl) {
      articleCountEl.textContent = `${data.totalCount}건`;
    }

    renderTopStories(data.topStories);
    renderList('list-saemaeul', data.categories.saemaeul);
    renderList('list-nonghyup', data.categories.nonghyup);
    renderList('list-bank', data.categories.bank);
    renderCounts(data.categories);
  } catch (error) {
    console.error('뉴스 로드 실패:', error);

    const updatedAtEl = document.getElementById('updatedAt');
    const articleCountEl = document.getElementById('articleCount');

    if (updatedAtEl) {
      updatedAtEl.textContent = '불러오기 실패';
    }

    if (articleCountEl) {
      articleCountEl.textContent = '0건';
    }

    renderTopStories([]);
    renderList('list-saemaeul', []);
    renderList('list-nonghyup', []);
    renderList('list-bank', []);
    renderCounts({
      saemaeul: [],
      nonghyup: [],
      bank: []
    });
  }
}

document.addEventListener('DOMContentLoaded', loadNews);
