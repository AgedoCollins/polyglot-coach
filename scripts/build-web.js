// Builds www/ for the APK from src/polyglot.html (the same file as the web version).
// - removes the Google Fonts link and bundles Nunito locally, so the app works offline
// - adds capacitor.js, which gives the page access to the native plugins
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const www = path.join(root, "www");
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(path.join(www, "fonts"), { recursive: true });

let html = fs.readFileSync(path.join(root, "src/polyglot.html"), "utf8");
html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, "");

// Local fonts (latin subset) for the weights the app uses
const faces = [];
for (const w of [400, 500, 700]) {
  const f = `nunito-latin-${w}-normal.woff2`;
  const src = path.join(root, "node_modules/@fontsource/nunito/files", f);
  if (!fs.existsSync(src)) continue;
  fs.copyFileSync(src, path.join(www, "fonts", f));
  faces.push(`@font-face{font-family:"Nunito";font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${f}) format("woff2")}`);
}
html = html.replace("<style>", `<script src="capacitor.js"></script>\n<style>${faces.join("")}\n`);

fs.copyFileSync(path.join(root, "node_modules/@capacitor/core/dist/capacitor.js"), path.join(www, "capacitor.js"));
// built-in lessons, vocabulary and exams
fs.cpSync(path.join(root, "src/content"), path.join(www, "content"), { recursive: true });
fs.writeFileSync(path.join(www, "index.html"), html);
console.log("www built:", faces.length, "font files,", Math.round(html.length / 1024), "KB");
