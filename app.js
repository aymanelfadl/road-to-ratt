(function () {
  "use strict";

  const STORAGE_KEY = "ws-exos-progress-v1";

  const state = {
    all: [],
    queue: [],
    pos: 0,
    revealed: false,
    progress: loadProgress(),
    topics: [],
  };

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  }

  function el(id) { return document.getElementById(id); }

  function buildTopicFilters() {
    const seen = [];
    const labels = {};
    state.all.forEach((q) => {
      if (!labels[q.topic]) { seen.push(q.topic); labels[q.topic] = q.topicLabel; }
    });
    state.topics = seen;
    const list = el("topicList");
    list.innerHTML = "";
    seen.forEach((t) => {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = true;
      cb.className = "topic-filter";
      cb.value = t;
      cb.addEventListener("change", () => rebuildQueue(false));
      label.appendChild(cb);
      label.appendChild(document.createTextNode(" " + labels[t]));
      list.appendChild(label);
    });
  }

  function activeTopics() {
    return Array.from(document.querySelectorAll(".topic-filter:checked")).map((c) => c.value);
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function rebuildQueue(keepPosition) {
    const topics = new Set(activeTopics());
    const hideMastered = el("hideMastered").checked;

    let filtered = state.all.filter((q) => {
      if (!topics.has(q.topic)) return false;
      if (hideMastered && state.progress[q.id] === "mastered") return false;
      return true;
    });

    if (el("shuffleMode").checked) {
      filtered = shuffle(filtered);
    }

    state.queue = filtered;
    state.pos = keepPosition && state.pos < filtered.length ? state.pos : 0;
    render();
  }

  function updateProgressBar() {
    const total = state.all.length;
    const mastered = Object.values(state.progress).filter((v) => v === "mastered").length;
    el("progressText").textContent = mastered + " / " + total + " maîtrisées";
    el("progressFill").style.width = total ? (100 * mastered / total) + "%" : "0%";
  }

  function render() {
    updateProgressBar();
    const card = el("card");
    const empty = el("emptyState");

    if (state.queue.length === 0) {
      card.hidden = true;
      empty.hidden = false;
      return;
    }
    card.hidden = false;
    empty.hidden = true;

    const q = state.queue[state.pos];
    el("qTopic").textContent = q.topicLabel;
    const levelEl = el("qLevel");
    levelEl.textContent = { "warm-up": "Warm-up", "medium": "Medium", "hard": "Hard" }[q.level] || q.level;
    levelEl.dataset.level = q.level;
    el("qType").textContent = q.type === "write" ? "à écrire" : "à prédire";
    el("qIndex").textContent = (state.pos + 1) + " / " + state.queue.length;
    el("qTitle").textContent = q.title;
    el("qPrompt").innerHTML = window.marked.parse(q.prompt || "");
    el("qCorrection").innerHTML = window.marked.parse(q.correction || "");

    state.revealed = false;
    el("answerBox").value = "";
    el("correctionBlock").hidden = true;
    el("revealBtn").hidden = false;
    el("gradeButtons").hidden = true;

    el("prevBtn").disabled = state.pos === 0;
  }

  function next() {
    if (state.pos < state.queue.length - 1) {
      state.pos++;
    } else {
      state.pos = 0;
    }
    render();
  }

  function grade(status) {
    const q = state.queue[state.pos];
    state.progress[q.id] = status;
    saveProgress();
    if (el("hideMastered").checked && status === "mastered") {
      rebuildQueue(true);
      if (state.queue.length > 0) render();
    } else {
      next();
    }
  }

  function wire() {
    el("revealBtn").addEventListener("click", () => {
      state.revealed = true;
      el("correctionBlock").hidden = false;
      el("revealBtn").hidden = true;
      el("gradeButtons").hidden = false;
    });
    el("masteredBtn").addEventListener("click", () => grade("mastered"));
    el("reviewBtn").addEventListener("click", () => grade("review"));
    el("skipBtn").addEventListener("click", next);
    el("prevBtn").addEventListener("click", () => {
      if (state.pos > 0) { state.pos--; render(); }
    });
    el("hideMastered").addEventListener("change", () => rebuildQueue(false));
    el("shuffleMode").addEventListener("change", () => rebuildQueue(false));
    el("resetBtn").addEventListener("click", () => {
      if (confirm("Réinitialiser toute la progression enregistrée sur cet appareil ?")) {
        state.progress = {};
        saveProgress();
        rebuildQueue(true);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); if (!state.revealed) el("revealBtn").click(); }
      if (e.key === "1") { if (state.revealed) el("reviewBtn").click(); }
      if (e.key === "2") { if (state.revealed) el("masteredBtn").click(); }
      if (e.key === "ArrowRight") { el("skipBtn").click(); }
      if (e.key === "ArrowLeft") { el("prevBtn").click(); }
    });
  }

  fetch("data/exercises.json")
    .then((r) => r.json())
    .then((data) => {
      state.all = data;
      buildTopicFilters();
      wire();
      rebuildQueue(false);
    })
    .catch((err) => {
      el("card").hidden = true;
      const empty = el("emptyState");
      empty.hidden = false;
      empty.querySelector("p").textContent = "Erreur de chargement des questions : " + err;
    });
})();
