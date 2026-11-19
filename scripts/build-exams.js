// Builds src/content/exam-<lang>-<level>.json from the built-in lessons and vocabulary of that level.
// 20 questions: 12 grammar (from the level's lessons), 4 vocabulary (word → meaning), 4 listening (which sentence did you hear?).
// Format: [question, [options], correctIndex, audioText?]
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "../src/content");
let seed = 42; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ask = { en: "Which sentence do you hear?", fr: "Quelle phrase entends-tu ?", nl: "Welke zin hoor je?" };
for (const l of ["en", "fr", "nl"]) for (const lv of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
  const read = f => { const p = path.join(dir, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
  const g = read(`grammar-${l}-${lv}.json`) || {}, v = (read(`vocab-${l}-${lv}.json`) || []).flat();
  const gq = shuffle(Object.values(g).flatMap(L => L.q)).slice(0, 12);
  const words = shuffle(v);
  const vq = words.slice(0, 4).map(w => {
    const opts = shuffle([w[1], ...shuffle(v.filter(x => x[1] !== w[1])).slice(0, 2).map(x => x[1])]);
    return [w[0], opts, opts.indexOf(w[1])];
  });
  const lq = words.slice(4, 8).map(w => {
    const opts = shuffle([w[2], ...shuffle(v.filter(x => x[2] !== w[2])).slice(0, 2).map(x => x[2])]);
    return [ask[l], opts, opts.indexOf(w[2]), w[2]];
  });
  const exam = shuffle([...gq, ...vq]).concat(lq);
  fs.writeFileSync(path.join(dir, `exam-${l}-${lv}.json`), JSON.stringify(exam));
  console.log(l, lv, exam.length);
}
