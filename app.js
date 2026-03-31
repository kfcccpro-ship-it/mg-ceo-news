let data = [];
let quiz = [];
let currentScope = { part: "", chapter: "" };

function byId(id){ return document.getElementById(id); }
function esc(str){ return String(str ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

function setTab(tab, btn){
  byId("searchTab").classList.toggle("active", tab === "search");
  byId("quizTab").classList.toggle("active", tab === "quiz");
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  if(btn){ btn.classList.add("active"); }
}

function findPreview(text, keyword, size=170){
  const plain = String(text || "").replace(/\s+/g, " ").trim();
  if(!plain) return "";
  if(!keyword) return plain.slice(0, size) + (plain.length > size ? "..." : "");
  const idx = plain.toLowerCase().indexOf(keyword.toLowerCase());
  if(idx === -1) return plain.slice(0, size) + (plain.length > size ? "..." : "");
  const start = Math.max(0, idx - 50);
  const end = Math.min(plain.length, start + size);
  return (start > 0 ? "..." : "") + plain.slice(start, end) + (end < plain.length ? "..." : "");
}

function markText(text, keyword){
  const safe = esc(text);
  if(!keyword) return safe;
  const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp(`(${pattern})`, "gi"), "<mark>$1</mark>");
}

function groupedTOC(){
  const map = new Map();
  data.forEach(item => {
    const part = item.part || "기타";
    const chapter = item.chapter || "기타";
    if(!map.has(part)) map.set(part, new Map());
    const chMap = map.get(part);
    if(!chMap.has(chapter)) chMap.set(chapter, 0);
    chMap.set(chapter, chMap.get(chapter) + 1);
  });
  return map;
}

function renderTOC(){
  const map = groupedTOC();
  byId("tocList").innerHTML = [...map.entries()].map(([part, chMap]) => {
    const count = [...chMap.values()].reduce((a,b)=>a+b,0);
    return `<div class="toc-part">
      <button class="toc-part-head" onclick="toggleTocPart(this)">
        <span>${esc(part)}</span>
        <span><span>${count}조</span> <span class="toc-arrow">▶</span></span>
      </button>
      <div class="toc-chapters">
        ${[...chMap.entries()].map(([chapter, cnt]) => `
          <button class="toc-chapter" onclick="selectToc(${JSON.stringify(part)}, ${JSON.stringify(chapter)})">
            <span>${esc(chapter)}</span><span>${cnt}조</span>
          </button>
        `).join("")}
      </div>
    </div>`;
  }).join("");
}

function toggleTocPart(btn){ btn.parentElement.classList.toggle("open"); }
function openToc(){ byId("tocModal").classList.remove("hidden"); document.body.style.overflow = "hidden"; }
function closeToc(){ byId("tocModal").classList.add("hidden"); document.body.style.overflow = ""; }
function backdropClose(e){ if(e.target.id === "tocModal") closeToc(); }

function selectToc(part, chapter){
  currentScope = { part, chapter };
  closeToc();
  renderResults("", currentScope);
}

function renderResults(keyword="", scope=currentScope){
  const results = data.filter(item => {
    const scopeOk = (!scope.part || item.part === scope.part) && (!scope.chapter || item.chapter === scope.chapter);
    const keywordOk = !keyword || [item.full_title, item.full_text, item.part, item.chapter].join(" ").toLowerCase().includes(keyword.toLowerCase());
    return scopeOk && keywordOk;
  });

  byId("resultInfo").textContent = keyword
    ? `검색 결과 ${results.length.toLocaleString()}개 조문`
    : scope.chapter
      ? `${scope.part} · ${scope.chapter} · ${results.length.toLocaleString()}개 조문`
      : `전체 ${data.length.toLocaleString()}개 조문`;

  byId("results").innerHTML = results.length
    ? results.map(item => `
      <article class="card result-card">
        <div class="result-path">${esc([item.part, item.chapter, item.section].filter(Boolean).join(" · "))}</div>
        <h3 class="result-title">${markText(item.full_title, keyword)}</h3>
        <div class="result-preview">${markText(findPreview(item.full_text, keyword), keyword)}</div>
      </article>
    `).join("")
    : `<div class="card result-card"><div class="result-preview">조건에 맞는 조문이 없습니다.</div></div>`;
}

function runSearch(){
  const input = byId("searchInput");
  const keyword = input.value.trim();
  currentScope = { part: "", chapter: "" };
  renderResults(keyword, currentScope);
  input.blur();
}

function isBadQuiz(q){
  const text = [q.source_part, q.source_title, q.source_text, q.statement, q.prompt].join(" ");
  if(/부칙|시행일|경과조치/.test(text)) return true;
  if(q.type === "ox"){
    const s = String(q.statement || "");
    if(s.length < 12) return true;
    if(/본조신설|개정|별표|별지/.test(s)) return true;
  }
  if(q.type === "mcq"){
    if(!Array.isArray(q.choices) || q.choices.length !== 4) return true;
    if(q.choices.some(c => String(c).length < 12 || /본조신설|개정|별표|별지/.test(String(c)))) return true;
  }
  return false;
}

function startQuiz(){
  const pool = quiz.filter(q => !isBadQuiz(q));
  if(!pool.length){
    byId("quizArea").innerHTML = `<div class="quiz-box">출제 가능한 문제가 없습니다.</div>`;
    return;
  }
  const q = pool[Math.floor(Math.random() * pool.length)];
  let html = `<div class="quiz-box"><div class="quiz-meta">${esc(q.source_article_no)}${q.source_title ? `(${esc(q.source_title)})` : ""}</div>`;
  if(q.type === "ox"){
    html += `<div class="quiz-prompt">아래 문장이 맞는지 판단하세요.</div>
      <div class="quiz-statement">${esc(q.statement || "")}</div>
      <div class="quiz-options">
        <button class="secondary-btn" onclick="answerQuiz(${q.answer === true})">O</button>
        <button class="secondary-btn" onclick="answerQuiz(${q.answer === false})">X</button>
      </div>`;
  } else {
    html += `<div class="quiz-prompt">옳은 내용을 고르세요.</div>
      <div class="quiz-options">
        ${q.choices.map((c, i) => `<button class="secondary-btn" onclick="answerQuiz(${i === q.answer_index})">${i+1}. ${esc(c)}</button>`).join("")}
      </div>`;
  }
  html += `<div id="quizResult" class="quiz-result"></div>
    <div class="source-box"><strong>정확한 조문 보기</strong><div style="margin-top:8px">${esc(q.source_text || "")}</div></div></div>`;
  byId("quizArea").innerHTML = html;
}

function answerQuiz(correct){
  byId("quizResult").textContent = correct ? "정답입니다." : "오답입니다. 아래 조문을 확인하세요.";
}

Promise.all([
  fetch("data.json?v=8").then(r => r.json()),
  fetch("quiz.json?v=8").then(r => r.json())
]).then(([d, q]) => {
  data = d; quiz = q; renderTOC(); renderResults();
}).catch(() => {
  byId("resultInfo").textContent = "데이터를 불러오지 못했습니다.";
});
