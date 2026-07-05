# DBA2 Drill

An infinite, adaptive QCM (multiple-choice quiz) practice loop for the Oracle DBA2 exam
(EMSI — Administration Oracle II). Static site, no backend, no accounts.

**[Live demo →](https://aymanelfadl.github.io/road-to-ratt/)** *(once GitHub Pages is enabled — see below)*

## How it works

- 93 questions across 19 Oracle DBA concepts (architecture, memory, background processes,
  instance states, privileges, RMAN backup/recovery, Flashback, and more) — including 5 real
  ordering questions transcribed from the June 2024 exam, decoy options included.
- Question types: single-choice, multi-select, and click-to-build step-ordering.
- Get a question wrong and the app **never reveals the correct answer** — it just serves you
  another question on the same concept until you get one right.
- A per-concept "streak" is tracked in your browser's `localStorage`. Concepts you keep missing
  are weighted higher in the random draw; concepts you've nailed 3 times in a row still show up
  occasionally, just less often.
- Toggle between English and French with the button in the header.
- Progress lives only in your own browser (`localStorage`) — nothing is sent anywhere.

## Running it locally

No build step. Any static file server works:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

(Opening `index.html` directly as a `file://` URL won't work — the browser blocks the
`fetch()` call that loads `data/questions.json` under the `file://` protocol.)

## Project structure

```
index.html        page shell
style.css         all styling (monochrome, black background / white text)
app.js            question engine: picking, rendering, scoring, localStorage state
data/
  questions.json  the question bank (bilingual: prompt/options in en + fr)
```

## Adding or editing questions

Edit `data/questions.json`. Each question looks like:

```json
{
  "id": "c1q1",
  "concept": 1,
  "type": "single",
  "correct": [2],
  "prompt": { "en": "...", "fr": "..." },
  "options": { "en": ["...", "...", "...", "..."], "fr": ["...", "...", "...", "..."] }
}
```

- `type`: `"single"`, `"multi"`, `"tf"` (true/false), or `"order"`.
- `correct`: array of option indices (0-based). For `"order"`, it's the correct sequence of
  indices — it doesn't have to use every option, so you can include decoy/irrelevant steps.
- Concept names live in the `concepts` array at the top of the same file.

## Note on answer privacy

This is a fully static site — there's no server to hide anything from a curious friend who
opens their browser's dev tools. The question bank (including correct answers) ships in
`data/questions.json`. Fine for casual peer study, not tamper-proof.
