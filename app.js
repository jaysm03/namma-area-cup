// Bracket logic: picks[m] = area index winning match m (0..62), or null
const KEY = "namma-area-cup-v1";
let picks = Array(63).fill(null);
let viewOnly = false;
let round = 0;

function roundOf(m){ return ROUNDS.findIndex(r => m >= r.start && m < r.start + r.count); }
function entrants(m){
  const r = roundOf(m);
  if (r === 0) return [2*m, 2*m+1];
  const prev = ROUNDS[r-1], i = m - ROUNDS[r].start;
  return [picks[prev.start + 2*i], picks[prev.start + 2*i + 1]];
}
function childOf(m){
  const r = roundOf(m); if (r === 5) return null;
  return ROUNDS[r+1].start + Math.floor((m - ROUNDS[r].start)/2);
}
function pick(m, a){
  if (viewOnly || a === null) return;
  const old = picks[m]; picks[m] = a;
  // clear the old winner from all later rounds
  let c = childOf(m);
  while (c !== null && old !== null && old !== a){
    if (picks[c] === old){ picks[c] = null; c = childOf(c); } else break;
  }
  save(); render();
}
function encode(){ return picks.map(p => p === null ? "zz" : p.toString(36).padStart(2,"0")).join(""); }
function decode(s){
  if (!s || s.length !== 126) return null;
  const out = [];
  for (let i=0;i<126;i+=2){ const t=s.slice(i,i+2); out.push(t==="zz"?null:parseInt(t,36)); }
  if (!out.every(v => v===null || (v>=0 && v<64))) return null;
  const prev = picks; picks = out;
  let ok = true;
  for (let m=0;m<63;m++){ if (out[m]!==null && !entrants(m).includes(out[m])) { ok=false; break; } }
  picks = prev; return ok ? out : null;
}
function save(){ localStorage.setItem(KEY, encode()); }
function load(){
  const h = new URLSearchParams(location.hash.slice(1)).get("b");
  const shared = decode(h);
  if (shared){ picks = shared; viewOnly = true; return; }
  const mine = decode(localStorage.getItem(KEY)); if (mine) picks = mine;
}
function done(){ return picks.filter(p => p !== null).length; }
function shareUrl(){ return location.origin + location.pathname + "#b=" + encode(); }

function render(){
  const champ = picks[62];
  document.getElementById("banner").hidden = !viewOnly;
  document.getElementById("progress").textContent = done() + " of 63 picks made";
  document.getElementById("bar").style.width = (done()/63*100) + "%";
  document.getElementById("champ").innerHTML = champ === null
    ? (viewOnly?"Their":"Your")+" champion: <em>not picked yet</em>"
    : (viewOnly?"Their":"Your")+" champion: <strong>" + AREAS[champ] + "</strong>";
  document.getElementById("tabs").innerHTML = ROUNDS.map((r,i) => {
    let n = 0; for (let m=r.start;m<r.start+r.count;m++) if (picks[m]!==null) n++;
    return `<button class="tab ${i===round?"on":""}" onclick="round=${i};render()">${r.name}<small>${n}/${r.count}</small></button>`;
  }).join("");
  const R = ROUNDS[round]; let html = "";
  for (let m=R.start;m<R.start+R.count;m++){
    const [a,b] = entrants(m);
    const btn = x => x===null
      ? `<button class="side tbd" disabled>Waiting for earlier pick</button>`
      : `<button class="side ${picks[m]===x?"win":""} ${picks[m]!==null&&picks[m]!==x?"lose":""}" onclick="pick(${m},${x})" ${viewOnly?"disabled":""}>${AREAS[x]}</button>`;
    html += `<div class="match"><span class="mno">Match ${m-R.start+1}</span>${btn(a)}<span class="vs">vs</span>${btn(b)}</div>`;
  }
  document.getElementById("matches").innerHTML = html;
  document.getElementById("next").hidden = round === 5;
  document.getElementById("share").hidden = champ === null;
}

function whatsapp(){
  const c = picks[62]===null ? "" : `My Namma Area Cup champion: ${AREAS[picks[62]]}. `;
  window.open("https://wa.me/?text=" + encodeURIComponent(c + "Which Bangalore area wins? Make your bracket: " + shareUrl()), "_blank");
}
async function copyLink(){
  try { await navigator.clipboard.writeText(shareUrl()); toast("Link copied"); }
  catch { prompt("Copy this link", shareUrl()); }
}
function toast(t){ const el=document.getElementById("toast"); el.textContent=t; el.hidden=false; setTimeout(()=>el.hidden=true,1800); }

async function card(){
  if (document.fonts) await document.fonts.ready;
  const c = document.createElement("canvas"); c.width=1080; c.height=1080;
  const x = c.getContext("2d");
  x.fillStyle="#f4df4b"; x.fillRect(0,0,1080,1080);
  x.fillStyle="#111"; x.font="bold 64px Space Grotesk, sans-serif"; x.fillText("NAMMA AREA CUP",70,140);
  x.font="32px DM Sans, sans-serif"; x.fillText("64 Bangalore areas. One champion.",70,195);
  x.font="bold 30px DM Sans, sans-serif"; x.fillText("MY CHAMPION",70,330);
  x.font="bold 92px Space Grotesk, sans-serif"; x.fillText(picks[62]===null?"TBD":AREAS[picks[62]],70,430);
  x.font="bold 30px DM Sans, sans-serif"; x.fillText("FINALISTS",70,560);
  x.font="44px DM Sans, sans-serif";
  [60,61].forEach((m,i)=>x.fillText(picks[m]===null?"TBD":AREAS[picks[m]],70,625+i*60));
  x.font="bold 30px DM Sans, sans-serif"; x.fillText("SEMIFINALISTS",70,820);
  x.font="36px DM Sans, sans-serif";
  [56,57,58,59].forEach((m,i)=>x.fillText(picks[m]===null?"TBD":AREAS[picks[m]],70+(i%2)*480,880+Math.floor(i/2)*55));
  x.font="26px DM Sans, sans-serif"; x.fillText(location.host+location.pathname,70,1040);
  const a=document.createElement("a"); a.download="my-namma-area-cup.png"; a.href=c.toDataURL("image/png"); a.click();
}
function makeOwn(){ history.replaceState(null,"",location.pathname); viewOnly=false; picks=Array(63).fill(null); load(); round=0; render(); }
function reset(){ if (confirm("Clear all your picks?")){ picks=Array(63).fill(null); save(); round=0; history.replaceState(null,"",location.pathname); viewOnly=false; render(); } }

load(); render();
