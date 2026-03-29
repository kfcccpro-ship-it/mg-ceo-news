import fs from "fs/promises";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

const OUTPUT_PATH = "data/news.json";

const CATEGORIES = [
  {
    key: "saemaeul",
    name: "새마을금고",
    query: "새마을금고 OR MG새마을금고 OR 새마을금고중앙회",
    include: [
      "새마을금고",
      "mg새마을금고",
      "새마을금고중앙회",
      "mg손해보험"
    ],
    exclude: [
      "지역공공은행",
      "비상경제대응",
      "자족도시",
      "전담반",
      "서초구",
      "공공은행"
    ],
    strictTitle: true
  },
  {
    key: "nonghyup",
    name: "농협",
    query: "농협 OR NH농협 OR 농협은행 OR 농협중앙회",
    include: [
      "농협",
      "nh농협",
      "농협은행",
      "농협중앙회",
      "지역농협"
    ],
    exclude: [],
    strictTitle: true
  },
  {
    key: "bank",
    name: "은행권",
    query: "은행 OR 은행권 OR 시중은행 OR 인터넷은행",
    include: [
      "은행",
      "은행권",
      "시중은행",
      "인터넷은행",
      "국민은행",
      "신한은행",
      "하나은행",
      "우리은행",
      "기업은행",
      "농협은행",
      "부산은행",
      "대구은행",
      "광주은행",
      "전북은행",
      "경남은행",
      "카카오뱅크",
      "토스뱅크",
      "케이뱅크"
    ],
    exclude: [],
    strictTitle: false
  }
];

function stripHtml(text = "") {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(text = "") {
  return stripHtml(text).toLowerCase();
}

function isRelevant(item, category) {
  const title = normalize(item.title);
  const desc = normalize(item.description);
  const full = `${title} ${desc}`;

  const includes = category.include.map(k => k.toLowerCase());
  const excludes = category.exclude.map(k => k.toLowerCase());

  const included = category.strictTitle
    ? includes.some(k => title.includes(k))
    : includes.some(k => full.includes(k));

  const excluded = excludes.some(k => full.includes(k));

  return included && !excluded;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function extractSource(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

async function fetchNews(query) {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=40&sort=date`;

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
    }
  });

  const data = await res.json();
  return data.items || [];
}

async function collectCategory(category) {
  const raw = await fetchNews(category.query);

  const filtered = raw
    .map(item => ({
      title: stripHtml(item.title),
      description: stripHtml(item.description),
      link: item.originallink || item.link,
      pubDate: item.pubDate,
      displayDate: formatDate(item.pubDate),
      source: extractSource(item.originallink || item.link)
    }))
    .filter(item => isRelevant(item, category));

  const unique = [];
  const seen = new Set();

  for (const item of filtered) {
    if (!seen.has(item.link)) {
      seen.add(item.link);
      unique.push(item);
    }
  }

  return {
    key: category.key,
    name: category.name,
    items: unique.slice(0, 12)
  };
}

async function main() {
  const sections = [];

  for (const category of CATEGORIES) {
    const result = await collectCategory(category);
    sections.push(result);
  }

  const now = new Date();

  const output = {
    updatedAt: now.toISOString(),
    updatedLabel: now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    sections
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log("뉴스 데이터 업데이트 완료");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
