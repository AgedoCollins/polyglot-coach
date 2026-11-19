// Builds src/content/vocab-<lang>-<level>.json from scripts/vocab/<level>.txt
// Each source line: English | French | Dutch | English example | French example | Dutch example
// Output per theme: [[word, meaning, example], ...]
//   English words → meaning in French · French words → meaning in English · Dutch words → meaning in French
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "vocab"), out = path.join(__dirname, "../src/content");
const dict = []; // every concept, for the in-app dictionary and the word of the day
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".txt"))) {
  const lv = f.replace(".txt", ""), themes = [];
  let cur = null;
  for (const raw of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("# ")) continue;
    const h = line.match(/^## (\d+)/);
    if (h) { cur = themes[+h[1]] = []; continue; }
    const p = line.split("|").map(s => s.trim());
    if (p.length !== 6) { console.error(`${f}: bad line → ${line}`); process.exitCode = 1; continue; }
    cur.push(p);
    dict.push([...p, lv]);
  }
  const make = (wi, mi, xi) => themes.map(t => (t || []).map(p => [p[wi], p[mi], p[xi]]));
  fs.writeFileSync(path.join(out, `vocab-en-${lv}.json`), JSON.stringify(make(0, 1, 3)));
  fs.writeFileSync(path.join(out, `vocab-fr-${lv}.json`), JSON.stringify(make(1, 0, 4)));
  fs.writeFileSync(path.join(out, `vocab-nl-${lv}.json`), JSON.stringify(make(2, 1, 5)));
  console.log(lv, themes.map(t => (t || []).length).join(","));
}

fs.writeFileSync(path.join(out, "dictionary.json"), JSON.stringify(dict));
console.log("dictionary:", dict.length, "words");
