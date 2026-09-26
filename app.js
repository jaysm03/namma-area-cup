// Namma Area Cup SPA. Routes: #/ , #/picks , #/predictions , #/leaderboard , #/b/<code> (shared bracket)
const KEY = "namma-area-cup-v1", META = "namma-area-cup-me";
let picks = Array(63).fill(null);
let view = "cards", round = 0, sharedPicks = null;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// ---------- bracket logic ----------
function roundOf(m){ return ROUNDS.findIndex(r => m >= r.start && m < r.start + r.count); }
function entrantsOf(p, m){
  const r = roundOf(m);
  if (r === 0) return [2*m, 2*m+1];
  const prev = ROUNDS[r-1], i = m - ROUNDS[r].start;
  return [p[prev.start + 2*i], p[prev.start + 2*i + 1]];
}
const entrants = m => entrantsOf(picks, m);
function childOf(m){ const r = roundOf(m); return r === 5 ? null : ROUNDS[r+1].start + Math.floor((m - ROUNDS[r].start)/2); }
function pick(m, a){
  if (a === null || a === undefined) return;
  const old = picks[m]; picks[m] = a;
  let c = childOf(m);
  while (c !== null && old !== null && old !== a && picks[c] === old){ picks[c] = null; c = childOf(c); }
  save(); renderPicks();
  // auto-advance: when a round is complete, nudge to next
  const R = ROUNDS[round];
  if (view === "cards" && round < 5 && picks.slice(R.start, R.start+R.count).every(x => x !== null) && roundOf(m) === round){
    setTimeout(() => { round++; renderPicks(); scrollToEl("picktop"); toast(ROUNDS[round].name + " unlocked"); }, 350);
  }
}
function encode(p=picks){ return p.map(x => x === null ? "zz" : x.toString(36).padStart(2,"0")).join(""); }
function decode(s){
  if (!s || s.length !== 126) return null;
  const out = [];
  for (let i=0;i<126;i+=2){ const t=s.slice(i,i+2); out.push(t==="zz"?null:parseInt(t,36)); }
  if (!out.every(v => v===null || (v>=0 && v<64))) return null;
  for (let m=0;m<63;m++) if (out[m]!==null && !entrantsOf(out,m).includes(out[m])) return null;
  return out;
}
function save(){ try { localStorage.setItem(KEY, encode()); } catch {} }
function me(){ try { return JSON.parse(localStorage.getItem(META)) || {}; } catch { return {}; } }
function setMe(o){ try { localStorage.setItem(META, JSON.stringify({...me(), ...o})); } catch {} }
const champ = () => picks[62];
const done = (p=picks) => p.filter(x => x !== null).length;
const shareUrl = (p=picks) => location.origin + location.pathname + "#/b/" + encode(p);
function nextOpen(){ for (let m=0;m<63;m++){ const [a,b]=entrants(m); if (picks[m]===null && a!==null && b!==null) return m; } return null; }

// ---------- api ----------
async function api(path, opts){
  const r = await fetch(path, opts); let j = {};
  try { j = await r.json(); } catch {}
  if (!r.ok) throw new Error(j.error || "Something went wrong. Try again.");
  return j;
}

// ---------- router ----------
function route(){
  const h = location.hash.replace(/^#\/?/, "");
  const [r, arg] = h.split("/");
  document.querySelectorAll("[data-r]").forEach(a => a.classList.toggle("on", a.dataset.r === (r || "home")));
  if (r === "picks") return pagePicks();
  if (r === "predictions") return pagePredictions();
  if (r === "leaderboard") return pageLeaderboard();
  if (r === "b") return pageShared(arg);
  return pageHome();
}
window.addEventListener("hashchange", () => { route(); scrollTo(0,0); });

// ---------- home ----------
async function pageHome(){
  $("view").innerHTML = `
  <section class="hero">
    <h1>64 areas.<br>One champion.</h1>
    <p>Indiranagar or Koramangala? Jayanagar or JP Nagar? Pick your winners across six rounds, make your case, and see who Bangalore is backing.</p>
    <div class="row">
      <a class="btn dark big" href="#/picks">MAKE YOUR PREDICTIONS</a>
      <a class="btn outline" href="#/predictions" id="homecount">VIEW PREDICTIONS</a>
      <a class="btn outline" href="#/leaderboard">LEADERBOARD</a>
    </div>
    <a class="contender" id="contender" href="#/leaderboard" hidden></a>
    <div class="facts"><span><b>64</b> AREAS</span><span><b>6</b> ROUNDS</span><span><b>1</b> CHAMPION</span></div>
  </section>
  <section class="how">
    <h2>How it works</h2>
    <ol>
      <li><b>Pick.</b> Choose a winner in all 63 matchups, from the Round of 64 to the Final.</li>
      <li><b>Submit.</b> Add your Instagram or X username and one line on why your champion deserves it.</li>
      <li><b>Score.</b> As rounds are decided, correct picks earn points: 1, 2, 4, 8, 16, then 32 for the champion.</li>
    </ol>
  </section>`;
  try {
    const s = await api("/api/stats");
    if (s.total) $("homecount").textContent = `VIEW ${s.total.toLocaleString("en-IN")} PREDICTIONS`;
    if (s.champions.length){
      const c = s.champions[0], pct = Math.round(c.n / s.total * 100);
      const el = $("contender"); el.hidden = false;
      el.innerHTML = `<small>#1 CONTENDER</small><strong>${esc(AREAS[c.area])}</strong><span>${c.n} of ${s.total} predictions · ${pct}%</span>`;
    }
  } catch {}
}

// ---------- picks ----------
function pagePicks(){
  try { const s = decode(localStorage.getItem(KEY)); if (s) picks = s; } catch {}
  $("view").innerHTML = `
  <div class="pagehead" id="picktop"><a href="#/">BACK TO HOME</a><h1>Your bracket</h1></div>
  <div class="seg"><button id="vcards" onclick="setView('cards')">MATCHUPS</button><button id="vtree" onclick="setView('tree')">BRACKET</button></div>
  <section class="status">
    <div id="champ"></div>
    <div class="statusrow"><span id="progress"></span>
      <span class="links"><a href="javascript:void 0" onclick="goNextOpen()">NEXT OPEN MATCH</a><a href="javascript:void 0" onclick="resetPicks()">CLEAR PICKS</a></span></div>
    <div class="track"><div id="bar"></div></div>
  </section>
  <div id="pickbody"></div>
  <section id="submitbox"></section>`;
  const n = nextOpen(); if (n !== null) round = roundOf(n);
  renderPicks();
}
function setView(v){ view = v; treeCentered = false; renderPicks(); }
function goNextOpen(){
  const n = nextOpen(); if (n === null) { scrollToEl("submitbox"); return; }
  round = roundOf(n); view = "cards"; renderPicks();
  setTimeout(() => scrollToEl("m" + n), 50);
}
function scrollToEl(id){ const el = $(id); if (el) el.scrollIntoView({behavior:"smooth", block:"center"}); }
function resetPicks(){ if (confirm("Clear all your picks?")){ picks = Array(63).fill(null); save(); round = 0; renderPicks(); } }

function sideCard(m, x, p, readonly){
  if (x === null) return `<div class="side tbd"><span class="nm">To be decided</span><span class="hk">Pick the earlier match first</span></div>`;
  const cls = p[m]===x ? "win" : (p[m]!==null ? "lose" : "");
  const tag = readonly ? "div" : "button";
  return `<${tag} class="side ${cls}" ${readonly?"":`onclick="pick(${m},${x})"`}><span class="nm">${esc(AREAS[x])}</span><span class="hk">${esc(AREAS_META[x][1])}</span></${tag}>`;
}
function cardsHTML(p, r, readonly){
  const R = ROUNDS[r]; let h = "";
  for (let m=R.start;m<R.start+R.count;m++){
    const [a,b] = entrantsOf(p, m);
    h += `<div class="match" id="m${m}"><span class="mno">MATCH ${String(m-R.start+1).padStart(2,"0")}</span>
      <div class="pair">${sideCard(m,a,p,readonly)}<span class="vs">VS</span>${sideCard(m,b,p,readonly)}</div>
      <span class="hint">${p[m]===null ? (readonly?"No pick":"PICK A WINNER") : "PICKED: " + esc(AREAS[p[m]])}</span></div>`;
  }
  return h;
}
function tabsHTML(p, active, fn){
  return `<nav class="tabs">` + ROUNDS.map((r,i) => {
    let n=0; for (let m=r.start;m<r.start+r.count;m++) if (p[m]!==null) n++;
    return `<button class="tab ${i===active?"on":""}" onclick="${fn}(${i})">${r.name}<small>${n}/${r.count}</small></button>`;
  }).join("") + `</nav>`;
}
function setRound(i){ round = i; renderPicks(); }

// two-sided tree: left half = matches feeding SF 60, right half = SF 61
function treeHTML(p, readonly){
  const col = (r, half) => {
    const R = ROUNDS[r], per = R.count/2, s = R.start + (half ? per : 0);
    let h = `<div class="tcol r${r}"><div class="thead">${R.name}</div><div class="tbody">`;
    for (let m=s;m<s+per;m++){
      const [a,b] = entrantsOf(p,m);
      const slot = x => x===null ? `<div class="tslot tbd">TBD</div>` :
        `<div class="tslot ${p[m]===x?"win":p[m]!==null?"lose":""}" ${readonly?"":`onclick="pick(${m},${x})"`}>${esc(AREAS[x])}</div>`;
      h += `<div class="tcell"><div class="tmatch">${slot(a)}${slot(b)}</div></div>`;
    }
    return h + `</div></div>`;
  };
  const champ = p[62];
  let left = "", right = "";
  for (let r=0;r<5;r++) left += col(r,0);
  for (let r=4;r>=0;r--) right += col(r,1);
  const [fa, fb] = entrantsOf(p, 62);
  const fslot = x => x===null ? `<div class="tslot tbd">TBD</div>` :
    `<div class="tslot ${champ===x?"win":champ!==null?"lose":""}" ${readonly?"":`onclick="pick(62,${x})"`}>${esc(AREAS[x])}</div>`;
  return `<div class="treewrap"><div class="tree">${left}
    <div class="tcol center"><div class="thead">FINAL</div><div class="tbody"><div class="tcell"><div class="tmatch final">${fslot(fa)}<span class="vs">VS</span>${fslot(fb)}</div>
    <div class="champbox"><small>CHAMPION</small><b>${champ===null?"To be decided":esc(AREAS[champ])}</b></div></div></div></div>
    ${right}</div></div>`;
}

let treeCentered = false;
function centerTree(){
  const w = document.querySelector(".treewrap"); if (!w || treeCentered) return;
  treeCentered = true; w.scrollLeft = (w.scrollWidth - w.clientWidth) / 2;
}
function renderPicks(){
  if (!$("pickbody")) return;
  const champ = picks[62];
  $("vcards").classList.toggle("on", view==="cards"); $("vtree").classList.toggle("on", view==="tree");
  $("champ").innerHTML = champ===null ? `Your champion: <em>not picked yet</em>` : `Your champion: <strong>${esc(AREAS[champ])}</strong>`;
  $("progress").textContent = `${done()} of 63 picked`;
  $("bar").style.width = (done()/63*100) + "%";
  $("pickbody").innerHTML = view === "cards"
    ? tabsHTML(picks, round, "setRound") + `<section class="matches">${cardsHTML(picks, round, false)}</section>` +
      (round < 5 ? `<div class="row"><button class="btn dark" onclick="setRound(${round+1});scrollToEl('picktop')">NEXT: ${ROUNDS[round+1].name.toUpperCase()}</button></div>` : "")
    : `<p class="note">Tap a name to advance it. Scroll sideways to see the whole bracket.</p>` + treeHTML(picks, false);
  centerTree();
  renderSubmit();
}

function renderSubmit(){
  const box = $("submitbox"); if (!box) return;
  const m = me(), complete = done() === 63;
  const submittedSame = m.submitted && m.submittedPicks === encode();
  box.innerHTML = `
  <div class="submit ${complete?"":"locked"}">
    <h2>${m.submitted ? "Your prediction is on the board" : "Submit your prediction"}</h2>
    ${complete ? "" : `<p class="note">Finish all 63 picks to submit. ${63-done()} to go.</p>`}
    ${m.submitted && !submittedSame && complete ? `<p class="note warn">You changed picks since submitting. Submit again to update your bracket.</p>` : ""}
    <form id="predform" onsubmit="submitPrediction(event)">
      <label class="field-label" for="handle">Instagram or X username</label>
      <div class="handle-field">
        <select id="platform" aria-label="Platform"><option value="instagram">Instagram</option><option value="x">X</option></select>
        <span>@</span><input id="handle" maxlength="30" autocomplete="off" placeholder="yourusername" required ${m.submitted?"readonly":""}>
      </div>
      <label class="field-label" for="note">Why does your champion deserve it?</label>
      <textarea id="note" maxlength="280" rows="3" placeholder="Make your case"></textarea>
      <div class="note-count"><span id="ncount">0</span> / 280</div>
      <p class="note">Your username, all 63 picks and your note go on the public predictions board.</p>
      <p id="formerr" class="err" hidden></p>
      <button class="btn dark big" type="submit" ${complete?"":"disabled"}>${m.submitted ? "UPDATE MY PREDICTION" : "SUBMIT PREDICTION"}</button>
    </form>
    <div class="share" ${champ()===null?"hidden":""}>
      <h3>Send it to the group</h3>
      <div class="row">
        <button class="btn wa" onclick="whatsapp()">SHARE ON WHATSAPP</button>
        <button class="btn outline" onclick="copyLink()">COPY LINK</button>
        <button class="btn outline" onclick="card()">DOWNLOAD CARD</button>
      </div>
    </div>
  </div>`;
  if (m.platform) $("platform").value = m.platform;
  if (m.handle) $("handle").value = m.handle;
  if (m.note) $("note").value = m.note;
  $("ncount").textContent = $("note").value.trim().length;
  $("note").addEventListener("input", e => { $("ncount").textContent = e.target.value.trim().length; setMe({note: e.target.value}); });
  $("handle").addEventListener("input", e => { e.target.value = e.target.value.replace(/^@+/, "").replace(/\s/g, ""); });
}

async function submitPrediction(e){
  e.preventDefault();
  const err = $("formerr"); err.hidden = true;
  const handle = $("handle").value.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)){ err.textContent = "Username can only have letters, numbers, dots and underscores."; err.hidden = false; return; }
  if (done() !== 63){ err.textContent = "Finish all 63 picks first."; err.hidden = false; return; }
  const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "SUBMITTING...";
  const m = me();
  try {
    const r = await api("/api/prediction", {method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({platform: $("platform").value, handle, note: $("note").value, picks: encode(), token: m.token})});
    setMe({submitted:true, token:r.token, id:r.id, platform:$("platform").value, handle, note:$("note").value, submittedPicks: encode()});
    toast(r.updated ? "Prediction updated" : "You're on the board");
    renderSubmit();
  } catch (x) {
    err.textContent = x.message; err.hidden = false; btn.disabled = false;
    btn.textContent = m.submitted ? "UPDATE MY PREDICTION" : "SUBMIT PREDICTION";
  }
}

// ---------- predictions ----------
let predQ = "", predOff = 0;
function pagePredictions(){
  $("view").innerHTML = `
  <div class="pagehead"><a href="#/">BACK TO HOME</a><h1>Predictions</h1></div>
  <p class="sub" id="predtotal"></p>
  <form class="search" onsubmit="event.preventDefault();predQ=$('q').value.trim().replace(/^@+/,'');predOff=0;loadPreds()">
    <span>@</span><input id="q" placeholder="Search @username" value="${esc(predQ)}"><button class="btn dark">SEARCH</button>
  </form>
  <div id="predlist" class="predlist"><p class="note">Loading...</p></div>
  <div class="row"><button class="btn outline" id="more" hidden onclick="predOff+=25;loadPreds(true)">LOAD MORE</button></div>`;
  loadPreds();
}
function predCard(x){
  const url = x.platform === "x" ? `https://x.com/${x.handle}` : `https://instagram.com/${x.handle}`;
  const dt = new Date(x.created*1000).toLocaleString("en-IN", {day:"numeric", month:"short", hour:"numeric", minute:"2-digit"});
  return `<article class="pred">
    <div class="predtop"><a href="${esc(url)}" target="_blank" rel="noreferrer nofollow">@${esc(x.handle)}</a>
      <span class="plat">${x.platform === "x" ? "X" : "IG"}</span>
      ${x.rank ? `<span class="rank">#${x.rank}</span>` : ""}</div>
    <small>PICKED TO WIN</small><div class="pchamp">${esc(AREAS[x.champion])}</div>
    ${x.note ? `<p class="pnote">${esc(x.note)}</p>` : ""}
    <div class="predfoot"><span>${dt}</span>
      <span>${x.settled ? `${x.points} pts · ${x.correct}/${x.settled} correct` : "Scoring starts after Round of 64"}</span>
      <a href="#/b/${x.picks}">VIEW BRACKET</a></div>
  </article>`;
}
async function loadPreds(append){
  try {
    const r = await api(`/api/predictions?q=${encodeURIComponent(predQ)}&offset=${predOff}`);
    $("predtotal").textContent = predQ ? `${r.total} matching "${predQ}"` : `${r.total.toLocaleString("en-IN")} public predictions`;
    const html = r.items.map(predCard).join("") || `<p class="note">${predQ ? "No predictions for that username." : "No predictions yet. Be the first."} <a href="#/picks">Make yours</a></p>`;
    $("predlist").innerHTML = append ? $("predlist").innerHTML + html : html;
    $("more").hidden = predOff + 25 >= r.total;
  } catch (x) { $("predlist").innerHTML = `<p class="err">${esc(x.message)}</p>`; }
}

// ---------- leaderboard ----------
async function pageLeaderboard(){
  $("view").innerHTML = `
  <div class="pagehead"><a href="#/">BACK TO HOME</a><h1>Leaderboard</h1></div>
  <div class="seg"><button id="lbc" class="on" onclick="lbTab('c')">MOST-PICKED CHAMPIONS</button><button id="lbp" onclick="lbTab('p')">PREDICTION SCORES</button></div>
  <div id="lb"><p class="note">Loading...</p></div>`;
  lbTab("c");
}
let lbOff = 0, lbTotal = 0;
async function lbMore(){
  lbOff += 25;
  const r = await api(`/api/predictions?sort=points&offset=${lbOff}`);
  $("lbitems").insertAdjacentHTML("beforeend", r.items.map(predCard).join(""));
  if (lbOff + 25 >= r.total) $("lbmore").hidden = true;
}
async function lbTab(t){
  $("lbc").classList.toggle("on", t==="c"); $("lbp").classList.toggle("on", t==="p");
  try {
    if (t === "c"){
      const s = await api("/api/stats");
      if (!s.total){ $("lb").innerHTML = `<p class="note">No predictions yet. <a href="#/picks">Be the first.</a></p>`; return; }
      $("lb").innerHTML = `<p class="sub">${s.total.toLocaleString("en-IN")} public predictions, ranked by who they pick to win it all.</p>` +
        s.champions.map((c,i) => {
          const pct = (c.n/s.total*100).toFixed(1);
          return `<div class="lbrow ${i<3?"top":""}"><span class="lbn">${i+1}</span><div class="lbname"><b>${esc(AREAS[c.area])}</b><small>${esc(AREAS_META[c.area][1])}</small></div>
            <div class="lbbar"><div style="width:${pct}%"></div></div><span class="lbv">${c.n} · ${pct}%</span></div>`;
        }).join("");
    } else {
      lbOff = 0;
      const r = await api("/api/predictions?sort=points&offset=0");
      const s = await api("/api/stats");
      $("lb").innerHTML = (s.settled ? `<p class="sub">${s.settled} of 63 matches decided. Points: 1, 2, 4, 8, 16, 32 per round.</p>` :
        `<p class="sub">No matches decided yet. Scores appear once the Round of 64 results are in.</p>`) +
        `<div id="lbitems" class="predlist">${r.items.map(predCard).join("")}</div>` +
        (r.total > 25 ? `<div class="row"><button class="btn outline" id="lbmore" onclick="lbMore()">LOAD MORE</button></div>` : "");
      lbTotal = r.total;
    }
  } catch (x) { $("lb").innerHTML = `<p class="err">${esc(x.message)}</p>`; }
}

// ---------- shared bracket ----------
let sharedRound = 0;
function pageShared(code){
  sharedPicks = decode(code);
  if (!sharedPicks){ $("view").innerHTML = `<div class="pagehead"><h1>Bracket not found</h1></div><p>This link looks broken. <a href="#/picks">Make your own bracket</a>.</p>`; return; }
  renderShared();
}
function setSharedRound(i){ sharedRound = i; renderShared(); }
function renderShared(){
  const p = sharedPicks;
  $("view").innerHTML = `
  <div class="pagehead"><a href="#/predictions">ALL PREDICTIONS</a><h1>A friend's bracket</h1></div>
  <div class="banner">Their champion: <b>${p[62]===null?"not picked":esc(AREAS[p[62]])}</b> · ${done(p)} of 63 picked
    <a class="btn yellow" href="#/picks">MAKE YOUR OWN</a></div>
  ${treeHTML(p, true)}
  <h2>Round by round</h2>
  ${tabsHTML(p, sharedRound, "setSharedRound")}
  <section class="matches">${cardsHTML(p, sharedRound, true)}</section>`;
  treeCentered = false; centerTree();
}

// ---------- share ----------
function whatsapp(){
  const c = picks[62]===null ? "" : `My Namma Area Cup champion: ${AREAS[picks[62]]}. `;
  window.open("https://wa.me/?text=" + encodeURIComponent(c + "Which Bangalore area wins? See my bracket and make yours: " + shareUrl()), "_blank");
}
async function copyLink(){
  try { await navigator.clipboard.writeText(shareUrl()); toast("Link copied"); }
  catch { prompt("Copy this link", shareUrl()); }
}
let toastT;
function toast(t){ const el=$("toast"); el.textContent=t; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>el.hidden=true,1800); }
async function card(){
  if (document.fonts) await document.fonts.ready;
  const c = document.createElement("canvas"); c.width=1080; c.height=1080;
  const x = c.getContext("2d"), T = m => picks[m]===null ? "TBD" : AREAS[picks[m]];
  x.fillStyle="#f4df4b"; x.fillRect(0,0,1080,1080);
  x.fillStyle="#111"; x.font="bold 64px Space Grotesk, sans-serif"; x.fillText("NAMMA AREA CUP",70,140);
  x.font="32px DM Sans, sans-serif"; x.fillText("64 Bangalore areas. One champion.",70,195);
  x.font="bold 30px DM Sans, sans-serif"; x.fillText("MY CHAMPION",70,330);
  x.font="bold 92px Space Grotesk, sans-serif"; x.fillText(T(62),70,430);
  x.font="bold 30px DM Sans, sans-serif"; x.fillText("FINALISTS",70,560);
  x.font="44px DM Sans, sans-serif"; [60,61].forEach((m,i)=>x.fillText(T(m),70,625+i*60));
  x.font="bold 30px DM Sans, sans-serif"; x.fillText("SEMIFINALISTS",70,820);
  x.font="36px DM Sans, sans-serif"; [56,57,58,59].forEach((m,i)=>x.fillText(T(m),70+(i%2)*480,880+Math.floor(i/2)*55));
  x.font="26px DM Sans, sans-serif"; x.fillText(location.host,70,1040);
  const a=document.createElement("a"); a.download="my-namma-area-cup.png"; a.href=c.toDataURL("image/png"); a.click();
}

// legacy share links (#b=...) from v1
(function(){ const h = new URLSearchParams(location.hash.slice(1)).get("b"); if (h) location.replace("#/b/" + h); })();
route();
