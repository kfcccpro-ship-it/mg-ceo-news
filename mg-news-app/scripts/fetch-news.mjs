import fs from 'node:fs/promises';
import path from 'node:path';

const NEWS_API_URL = 'https://openapi.naver.com/v1/search/news.json';
const OUTPUT_PATH = path.resolve(process.cwd(), 'data/news.json');
const DISPLAY_COUNT = 8;
const CATEGORY_CONFIG = [
  { key: 'saemaeul', label: '새마을금고', query: '새마을금고' },
  { key: 'nonghyup', label: '농협', query: '농협' },
  { key: 'bank', label: '은행권', query: '은행권' }
];

const clientId = process.env.NAVER_CLIENT_ID;
const clientSecret = process.env.NAVER_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 이 설정되지 않았습니다.');
  process.exit(1);
}

const stripHtml = (text = '') => text.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const toIso = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.title}|${item.link}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
}

function scoreItem(item, label) {
  const title = item.title || '';
  let score = 0;
  if (title.includes(label)) score += 5;
  if (/속보|단독|긴급|점검|강화|개선|확대|경쟁|건전성|금리/.test(title)) score += 3;
  const ageHours = item.pubDate ? Math.max(0, (Date.now() - new Date(item.pubDate).getTime()) / 36e5) : 100;
  score += Math.max(0, 10 - ageHours / 3);
  return score;
}

async function fetchCategory(config) {
  const url = new URL(NEWS_API_URL);
  url.searchParams.set('query', config.query);
  url.searchParams.set('display', String(DISPLAY_COUNT));
  url.searchParams.set('sort', 'date');

  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret
    }
  });

  if (!response.ok) {
    throw new Error(`${config.label} 호출 실패: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const items = (data.items || []).map((item) => ({
    title: stripHtml(item.title),
    link: item.originallink || item.link,
    source: stripHtml(item.publisher || extractSourceFromLink(item.link) || '네이버 뉴스'),
    pubDate: toIso(item.pubDate)
  }));

  return sortByDateDesc(dedupeItems(items));
}

function extractSourceFromLink(link = '') {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '');
    return host;
  } catch {
    return '';
  }
}

async function main() {
  const categories = {};
  for (const config of CATEGORY_CONFIG) {
    categories[config.key] = await fetchCategory(config);
  }

  const topStories = dedupeItems(
    CATEGORY_CONFIG.flatMap((config) => categories[config.key].map((item) => ({ ...item, categoryLabel: config.label, score: scoreItem(item, config.label) })))
  )
    .sort((a, b) => b.score - a.score || new Date(b.pubDate || 0) - new Date(a.pubDate || 0))
    .slice(0, 3)
    .map(({ score, categoryLabel, ...rest }) => rest);

  const totalCount = Object.values(categories).reduce((sum, items) => sum + items.length, 0);

  const payload = {
    updatedAt: new Date().toISOString(),
    totalCount,
    topStories,
    categories
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[OK] wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
