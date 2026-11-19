// Checks src/content against the syllabus in src/polyglot.html: missing lessons, bad exercises.
const fs=require("fs"),path=require("path");
const html=fs.readFileSync(path.join(__dirname,"../src/polyglot.html"),"utf8");
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const SYLL=new Function(js.slice(js.indexOf("const SYLL="),js.indexOf("const NOUNS="))+";return {SYLL,VTH};")();
const dir=path.join(__dirname,"../src/content");let miss=[],bad=[],n=0;
for(const l in SYLL.SYLL)for(const lv in SYLL.SYLL[l]){
  const f=path.join(dir,`grammar-${l}-${lv}.json`),d=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,"utf8")):{};
  SYLL.SYLL[l][lv].forEach((x,i)=>{if(x[0]==="@")return;const id=`${l}-${lv}-${i}`,L=d[id];
    if(!L){miss.push(id);return}n++;
    if(!L.b||!L.t||!Array.isArray(L.e)||L.e.length<3)bad.push(id+" fields");
    (L.q||[]).forEach((q,k)=>{if(!Array.isArray(q[1])||q[1][q[2]]===undefined)bad.push(id+" q"+k)});
    if((L.q||[]).length<6)bad.push(id+" few q");});
  Object.keys(d).forEach(k=>{if(!k.startsWith(`${l}-${lv}-`))bad.push("stray "+k)});
}
const vm=[],xm=[];
for(const l of ["en","fr","nl"])for(const lv in SYLL.VTH){const f=path.join(dir,`vocab-${l}-${lv}.json`);const d=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,"utf8")):[];
  SYLL.VTH[lv].forEach((_,i)=>{if(!d[i]||d[i].length<20)vm.push(`${l}-${lv}-${i}`)});
  const e=path.join(dir,`exam-${l}-${lv}.json`);if(!fs.existsSync(e))xm.push(`${l}-${lv}`);else JSON.parse(fs.readFileSync(e,"utf8")).forEach((q,k)=>{if(q[1][q[2]]===undefined)bad.push(`exam ${l}-${lv} q${k}`)});}
console.log(`grammar ok: ${n}, missing: ${miss.length}`);if(process.argv[2]==="-v")console.log(miss.join(" "));
console.log(`vocab missing: ${vm.length}, exams missing: ${xm.length}`);if(bad.length)console.log("BAD:",bad.join(", "));
