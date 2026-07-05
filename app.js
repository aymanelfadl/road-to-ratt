// DBA2 Drill — infinite adaptive QCM loop.
// No backend: question bank ships in data/questions.json, progress lives in localStorage.
// Rule: wrong answer -> never reveal the correct choice, just re-ask the same concept.

const STORAGE_KEY = "dba2drill_v1";
const LANG_KEY = "dba2drill_lang";
const MASTERY_STREAK = 3; // consecutive correct answers to consider a concept "mastered"
const STREAK_CAP = 5;

let DATA = null;               // { concepts: [...], questions: [...] }
let questionsByConcept = {};   // conceptId -> [question, ...]
let conceptNameById = {};      // conceptId -> {en, fr}
let state = null;              // { streaks: {id:n}, lastShown: {id:qid} }
let LANG = "en";

let current = { conceptId: null, question: null };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore corrupt state */ }
  return null;
}

function defaultState() {
  const streaks = {};
  DATA.concepts.forEach(c => { streaks[c.id] = 0; });
  return { streaks, lastShown: {} };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function weightForConcept(conceptId) {
  const streak = state.streaks[conceptId] || 0;
  if (streak >= MASTERY_STREAK) return 1;      // mastered: still occasionally revisited
  return MASTERY_STREAK - streak + 1;          // 0 correct -> weight 4, 1 -> 3, 2 -> 2
}

function pickConceptWeighted() {
  const ids = DATA.concepts.map(c => c.id);
  const weights = ids.map(weightForConcept);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < ids.length; i++) {
    r -= weights[i];
    if (r <= 0) return ids[i];
  }
  return ids[ids.length - 1];
}

function pickQuestion(conceptId) {
  const pool = questionsByConcept[conceptId];
  const last = state.lastShown[conceptId];
  let candidates = pool.filter(q => q.id !== last);
  if (candidates.length === 0) candidates = pool;
  const q = candidates[Math.floor(Math.random() * candidates.length)];
  state.lastShown[conceptId] = q.id;
  return q;
}

function shuffledIndices(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function nextQuestion(forceConceptId) {
  const conceptId = forceConceptId || pickConceptWeighted();
  const q = pickQuestion(conceptId);
  current = { conceptId, question: q };
  render();
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  });
  children.forEach(c => node.appendChild(c));
  return node;
}

function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const q = current.question;
  const conceptId = current.conceptId;
  const streak = state.streaks[conceptId] || 0;
  const conceptLabel = `${LANG === "fr" ? "Concept" : "Concept"} ${conceptId} · ${conceptNameById[conceptId][LANG]}`;
  const streakLabel = LANG === "fr" ? `série ${streak}/${MASTERY_STREAK}` : `streak ${streak}/${MASTERY_STREAK}`;

  const card = el("div", { class: "qcard" });

  const meta = el("div", { class: "qmeta" }, [
    el("span", { text: conceptLabel }),
    el("span", { class: "streak-flame", text: streakLabel })
  ]);
  card.appendChild(meta);
  card.appendChild(el("div", { class: "qprompt", text: q.prompt[LANG] }));

  const feedback = el("div", { class: "feedback" });

  if (q.type === "single" || q.type === "tf") {
    card.appendChild(renderSingle(q, feedback));
  } else if (q.type === "multi") {
    card.appendChild(renderMulti(q, feedback));
  } else if (q.type === "order") {
    card.appendChild(renderOrder(q, feedback));
  }

  card.appendChild(feedback);
  app.appendChild(card);
}

function lockButtons(container) {
  container.querySelectorAll("button").forEach(b => { b.disabled = true; });
}

function nextLabel() {
  return LANG === "fr" ? "Question suivante →" : "Next question →";
}

function showFeedback(feedback, ok, sameConceptId) {
  feedback.innerHTML = "";
  feedback.classList.add("show");
  feedback.appendChild(el("div", { class: `verdict ${ok ? "ok" : "no"}` }));
  const nextBtn = el("button", {
    class: "primary-btn",
    text: nextLabel(),
    onclick: () => nextQuestion(ok ? null : sameConceptId)
  });
  feedback.appendChild(el("div", { class: "actions" }, [nextBtn]));
}

function recordResult(ok) {
  const conceptId = current.conceptId;
  if (ok) {
    state.streaks[conceptId] = Math.min(STREAK_CAP, (state.streaks[conceptId] || 0) + 1);
  } else {
    state.streaks[conceptId] = 0;
  }
  saveState();
  renderProgress();
}

// ---------- single choice / true-false ----------

function renderSingle(q, feedback) {
  const wrap = el("div");
  const list = el("ul", { class: "options" });
  const opts = q.options[LANG];

  const order = shuffledIndices(opts.length);

  order.forEach(idx => {
    const btn = el("button", {
      class: "opt-btn",
      text: opts[idx],
      onclick: () => {
        const ok = q.correct.includes(idx);
        btn.classList.add(ok ? "locked-correct" : "locked-wrong");
        lockButtons(list);
        recordResult(ok);
        showFeedback(feedback, ok, current.conceptId);
      }
    });
    list.appendChild(btn);
  });

  wrap.appendChild(list);
  return wrap;
}

// ---------- multi-select ----------

function renderMulti(q, feedback) {
  const wrap = el("div");
  const need = q.correct.length;
  wrap.appendChild(el("div", {
    class: "qhint",
    text: LANG === "fr" ? `Choisissez ${need} réponses` : `Pick ${need} answers`
  }));

  const list = el("ul", { class: "options" });
  const opts = q.options[LANG];
  const selected = new Set();
  let locked = false;

  const order = shuffledIndices(opts.length);
  const buttons = {};

  function evaluate() {
    locked = true;
    const chosen = Array.from(selected).sort((a, b) => a - b);
    const correct = [...q.correct].sort((a, b) => a - b);
    const ok = chosen.length === correct.length && chosen.every((v, i) => v === correct[i]);
    order.forEach(idx => {
      buttons[idx].disabled = true;
      if (selected.has(idx)) buttons[idx].classList.add(ok ? "locked-correct" : "locked-wrong");
    });
    recordResult(ok);
    showFeedback(feedback, ok, current.conceptId);
  }

  order.forEach(idx => {
    const btn = el("button", {
      class: "opt-btn",
      text: opts[idx],
      onclick: () => {
        if (locked) return;
        if (selected.has(idx)) { selected.delete(idx); btn.classList.remove("selected"); }
        else { selected.add(idx); btn.classList.add("selected"); }
        if (selected.size === need) evaluate();
      }
    });
    buttons[idx] = btn;
    list.appendChild(btn);
  });

  wrap.appendChild(list);
  return wrap;
}

// ---------- ordering (supports decoy options not required in the sequence) ----------

function renderOrder(q, feedback) {
  const wrap = el("div");
  const need = q.correct.length;
  wrap.appendChild(el("div", {
    class: "qhint",
    text: LANG === "fr" ? `Ordonnez ${need} étapes` : `Arrange ${need} steps`
  }));

  const opts = q.options[LANG];
  const seqBox = el("div", { class: "order-your-seq" });
  const placeholder = el("span", {
    class: "placeholder",
    text: LANG === "fr"
      ? "Cliquez les étapes ci-dessous dans l'ordre qui vous semble correct…"
      : "Click the steps below in what you think is the right order…"
  });
  seqBox.appendChild(placeholder);

  const pool = el("div", { class: "order-pool" });
  const order = shuffledIndices(opts.length);
  const sequence = []; // holds original indices in chosen order
  const chipRefs = {};
  let locked = false;

  function refreshPlaceholder() {
    placeholder.style.display = sequence.length === 0 ? "inline" : "none";
  }

  function renumberChips() {
    sequence.forEach((idx, i) => { chipRefs[idx].textContent = `${i + 1}. ${opts[idx]}`; });
  }

  function evaluate() {
    locked = true;
    const ok = sequence.length === q.correct.length && sequence.every((v, i) => v === q.correct[i]);
    pool.querySelectorAll("button").forEach(b => b.disabled = true);
    recordResult(ok);
    showFeedback(feedback, ok, current.conceptId);
  }

  order.forEach(idx => {
    const poolBtn = el("button", {
      class: "opt-btn",
      text: opts[idx],
      onclick: () => {
        if (poolBtn.disabled || locked) return;
        poolBtn.disabled = true;
        poolBtn.style.display = "none";
        sequence.push(idx);
        const chip = el("span", {
          class: "order-chip",
          text: `${sequence.length}. ${opts[idx]}`,
          onclick: () => {
            if (locked) return;
            const pos = sequence.indexOf(idx);
            if (pos !== -1) sequence.splice(pos, 1);
            chip.remove();
            renumberChips();
            poolBtn.disabled = false;
            poolBtn.style.display = "block";
            refreshPlaceholder();
          }
        });
        chipRefs[idx] = chip;
        seqBox.appendChild(chip);
        refreshPlaceholder();
        if (sequence.length === need) evaluate();
      }
    });
    pool.appendChild(poolBtn);
  });

  wrap.appendChild(seqBox);
  wrap.appendChild(pool);
  refreshPlaceholder();
  return wrap;
}

// ---------- progress strip ----------

function renderProgress() {
  const bar = document.getElementById("progress");
  bar.innerHTML = "";
  DATA.concepts.forEach(c => {
    const streak = state.streaks[c.id] || 0;
    const level = streak >= MASTERY_STREAK ? 2 : streak > 0 ? 1 : 0;
    const label = LANG === "fr"
      ? `${c.id}. ${c.name.fr} — série ${streak}/${MASTERY_STREAK}`
      : `${c.id}. ${c.name.en} — streak ${streak}/${MASTERY_STREAK}`;
    bar.appendChild(el("div", {
      class: "dot",
      "data-level": String(level),
      title: label
    }));
  });
}

function updateLangButton() {
  const btn = document.getElementById("lang-btn");
  btn.textContent = LANG === "en" ? "FR" : "EN";
  document.getElementById("reset-btn").textContent =
    LANG === "fr" ? "Réinitialiser ma progression" : "Reset my progress";
}

// ---------- boot ----------

async function boot() {
  const res = await fetch("data/questions.json");
  DATA = await res.json();

  DATA.concepts.forEach(c => { conceptNameById[c.id] = c.name; questionsByConcept[c.id] = []; });
  DATA.questions.forEach(q => { questionsByConcept[q.concept].push(q); });

  state = loadState() || defaultState();
  DATA.concepts.forEach(c => { if (!(c.id in state.streaks)) state.streaks[c.id] = 0; });

  LANG = localStorage.getItem(LANG_KEY) || "en";
  updateLangButton();

  renderProgress();
  nextQuestion(null);

  document.getElementById("reset-btn").addEventListener("click", () => {
    if (!confirm(LANG === "fr" ? "Réinitialiser toute la progression sur cet appareil ?" : "Reset all progress on this device?")) return;
    state = defaultState();
    saveState();
    renderProgress();
    nextQuestion(null);
  });

  document.getElementById("lang-btn").addEventListener("click", () => {
    LANG = LANG === "en" ? "fr" : "en";
    localStorage.setItem(LANG_KEY, LANG);
    updateLangButton();
    renderProgress();
    render(); // re-render the SAME current question in the new language
  });
}

boot();
