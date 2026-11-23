"use strict";

// ---------- état local ----------
const CLE = "plantes.v1";
const etatDefaut = () => ({ last: {}, snooze: {}, log: [], notes: {}, meteo: null, lieu: null });
let etat = charger();

function charger() {
  try {
    return Object.assign(etatDefaut(), JSON.parse(localStorage.getItem(CLE)) || {});
  } catch {
    return etatDefaut();
  }
}
function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch {}
}

// ---------- dates (toujours en local, format AAAA-MM-JJ) ----------
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const ajout = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const ecart = (a, b) => Math.round((parse(b) - parse(a)) / 86400000); // b - a en jours
const aujourdhui = () => iso(new Date());
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const joli = (s) => { const d = parse(s); return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`; };

function saison(s) {
  const m = parse(s).getMonth() + 1;
  if (m >= 11 || m <= 2) return "hiver";
  if (m <= 5) return "printemps";
  if (m <= 8) return "ete";
  return "automne";
}

// Premier jour de la fenêtre de mois qui contient la date s.
function debutFenetre(mois, s) {
  const d = parse(s);
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const prec = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    if (!mois.includes(prec.getMonth() + 1)) break;
    d.setMonth(d.getMonth() - 1);
  }
  return iso(d);
}
// Premier jour de la prochaine fenêtre qui commence après s (en sautant la fenêtre en cours).
function prochaineFenetre(mois, s) {
  const d = parse(s);
  d.setDate(1);
  let dansFenetre = mois.includes(d.getMonth() + 1);
  for (let i = 0; i < 24; i++) {
    d.setMonth(d.getMonth() + 1);
    const dedans = mois.includes(d.getMonth() + 1);
    if (dedans && !dansFenetre) return iso(d);
    dansFenetre = dedans;
  }
  return null;
}
// Dernier jour de la fenêtre en cours.
function finFenetre(mois, s) {
  const d = parse(s);
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const suiv = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    if (!mois.includes(suiv.getMonth() + 1)) break;
    d.setMonth(d.getMonth() + 1);
  }
  return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

// ---------- moteur de tâches ----------
const cle = (p, t) => `${p.id}:${t}`;
const dernier = (p, t, seed) => etat.last[cle(p, t)] || seed || null;

function position(p) {
  if (p.lieu !== "mobile") return p.lieu === "exterieur" ? "dehors" : "dedans";
  const s = dernier(p, "sortir", p.taches.find((t) => t.id === "sortir")?.faitLe);
  const r = dernier(p, "rentrer", p.taches.find((t) => t.id === "rentrer")?.faitLe);
  if (s && (!r || s > r)) return "dehors";
  return "dedans";
}

function tachesDe(p, auj) {
  const out = [];
  const a = p.arrosage;
  const jours = a?.jours?.[saison(auj)];
  if (jours) {
    const k = cle(p, "arrosage");
    let due = null, info = null;
    if (a.bloquePar) {
      const fait = dernier(p, a.bloquePar);
      if (!fait) info = "Arrosage en pause jusqu'au rempotage";
      else {
        const lw = etat.last[k];
        due = lw && lw >= fait ? ajout(lw, jours) : ajout(fait, a.delaiApres || 0);
      }
    } else {
      const lw = dernier(p, "arrosage", a.dernier);
      due = lw ? ajout(lw, jours) : auj;
    }
    if (due) out.push({ p, id: "arrosage", k, type: "arrosage", label: "Vérifier l'arrosage", consigne: a.consigne, due, dernierFait: etat.last[k] || a.dernier });
    else if (info) out.push({ p, id: "arrosage", k, type: "pause", label: info, due: null });
  }
  for (const t of p.taches || []) {
    const k = cle(p, t.id);
    const fait = dernier(p, t.id, t.faitLe);
    let due = null, limite = null, type;
    if (t.date) {
      type = "ponctuel";
      if (fait) continue;
      due = t.date;
    } else if (t.mois && t.tousLesJours) {
      type = "recurrent";
      if (t.mois.includes(parse(auj).getMonth() + 1)) {
        const ws = debutFenetre(t.mois, auj);
        due = !fait || fait < ws ? ws : ajout(fait, t.tousLesJours);
        if (!t.mois.includes(parse(due).getMonth() + 1)) due = prochaineFenetre(t.mois, auj);
      } else due = prochaineFenetre(t.mois, auj);
    } else if (t.mois) {
      type = "annuel";
      if (t.mois.includes(parse(auj).getMonth() + 1)) {
        const ws = debutFenetre(t.mois, auj);
        if (fait && fait >= ws) due = prochaineFenetre(t.mois, auj);
        else { due = ws; limite = finFenetre(t.mois, auj); }
      } else due = prochaineFenetre(t.mois, auj);
    } else if (t.tousLesJours) {
      type = "recurrent";
      due = fait ? ajout(fait, t.tousLesJours) : auj;
    }
    if (!due) continue;
    out.push({ p, id: t.id, k, type, label: t.label, due, limite, dernierFait: fait });
  }
  for (const x of out) {
    const s = etat.snooze[x.k];
    if (x.due && s && s > x.due) x.due = s;
  }
  return out;
}

const toutes = (auj) => PLANTES.flatMap((p) => tachesDe(p, auj));

// ---------- actions ----------
let annulation = null;
function agir(k, action) {
  annulation = JSON.stringify(etat);
  const auj = aujourdhui();
  if (action === "fait") {
    etat.last[k] = auj;
    delete etat.snooze[k];
  } else if (action === "pasbesoin") etat.snooze[k] = ajout(auj, 2);
  else if (action === "plustard") etat.snooze[k] = ajout(auj, 7);
  etat.log.unshift({ k, action, date: auj });
  etat.log = etat.log.slice(0, 500);
  sauver();
  rendre();
  toast({ fait: "C'est noté ✓", pasbesoin: "Revu dans 2 jours", plustard: "Revu dans 7 jours" }[action], true);
}

function toast(msg, avecAnnuler) {
  const el = document.getElementById("toast");
  el.innerHTML = `<span>${esc(msg)}</span>` + (avecAnnuler ? `<button id="annuler">Annuler</button>` : "");
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 5000);
  const b = document.getElementById("annuler");
  if (b) b.onclick = () => {
    if (annulation) { etat = JSON.parse(annulation); annulation = null; sauver(); rendre(); }
    el.hidden = true;
  };
}

// ---------- météo (Open-Meteo, sans clé) ----------
async function majMeteo(force) {
  if (!etat.lieu) return;
  const frais = etat.meteo && Date.now() - etat.meteo.t < 3 * 3600 * 1000;
  if (frais && !force) return;
  try {
    const { lat, lon } = etat.lieu;
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_min,temperature_2m_max,precipitation_sum&timezone=auto&forecast_days=7`);
    const j = await r.json();
    etat.meteo = { t: Date.now(), jours: j.daily.time.map((d, i) => ({ d, min: j.daily.temperature_2m_min[i], max: j.daily.temperature_2m_max[i], pluie: j.daily.precipitation_sum[i] })) };
    sauver();
    rendre();
  } catch { /* hors ligne : on garde l'ancienne */ }
}

function alertesMeteo(auj) {
  const out = [];
  const jours = etat.meteo?.jours?.filter((j) => j.d >= auj) || [];
  if (!jours.length) return out;
  const plusFroid = jours.reduce((a, b) => (b.min < a.min ? b : a));
  const mois = parse(auj).getMonth() + 1;
  for (const p of PLANTES) {
    if (p.gel == null) continue;
    const pos = position(p);
    if (pos === "dehors" && plusFroid.min < p.gel) {
      out.push(p.lieu === "mobile"
        ? `🥶 ${plusFroid.min.toFixed(0)} °C prévu ${joli(plusFroid.d)} : rentrer ${p.nom.toLowerCase()}`
        : `🥶 ${plusFroid.min.toFixed(0)} °C prévu ${joli(plusFroid.d)} : protéger ${p.nom.toLowerCase()} (voile, pot isolé)`);
    }
    if (p.lieu === "mobile" && pos === "dedans" && mois >= 4 && mois <= 6 && jours.every((j) => j.min >= Math.max(8, p.gel + 3))) {
      out.push(`☀️ Nuits ≥ 8 °C toute la semaine : bon moment pour sortir ${p.nom.toLowerCase()}`);
    }
  }
  return out;
}

// ---------- rendu ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $app = () => document.getElementById("app");

function ligneTache(x, auj, compacte) {
  const retard = ecart(x.due, auj);
  let quand = "";
  if (x.limite) quand = `avant le ${joli(x.limite)}`;
  else if (retard > 0 && !x.dernierFait) quand = "à faire";
  else if (retard > 0) quand = `en retard de ${retard} j`;
  else if (retard === 0) quand = "aujourd'hui";
  else quand = joli(x.due);
  const second = x.type === "arrosage" ? "pasbesoin" : "plustard";
  const secondLabel = x.type === "arrosage" ? "Pas besoin" : "Plus tard";
  return `<li class="tache ${retard > 0 && !x.limite && x.dernierFait ? "retard" : ""}">
    <div class="t-tete"><span class="emoji">${x.p.emoji}</span>
      <div><a class="t-plante" href="#/plante/${x.p.id}">${esc(x.p.nom)}</a>
      <div class="t-label">${esc(x.label)}</div>
      ${x.consigne && !compacte ? `<div class="t-consigne">${esc(x.consigne)}</div>` : ""}
      <div class="t-quand">${quand}</div></div></div>
    ${compacte ? "" : `<div class="t-actions"><button class="ok" data-k="${x.k}" data-a="fait">Fait</button><button data-k="${x.k}" data-a="${second}">${secondLabel}</button></div>`}
  </li>`;
}

function vueJour() {
  const auj = aujourdhui();
  const ts = toutes(auj).filter((x) => x.due);
  const afaire = ts.filter((x) => x.due <= auj).sort((a, b) => (a.type === "arrosage" ? 0 : 1) - (b.type === "arrosage" ? 0 : 1) || a.due.localeCompare(b.due));
  const avenir = ts.filter((x) => x.due > auj && x.due <= ajout(auj, 14)).sort((a, b) => a.due.localeCompare(b.due));
  const alertes = alertesMeteo(auj);
  const meteo = etat.meteo?.jours?.filter((j) => j.d >= auj).slice(0, 7) || [];
  return `
    <h1>Aujourd'hui <small>${joli(auj)}</small></h1>
    ${alertes.map((a) => `<div class="alerte">${esc(a)}</div>`).join("")}
    ${meteo.length ? `<div class="meteo">${meteo.map((j) => `<div><b>${JOURS[parse(j.d).getDay()]}</b><span class="${j.min < 0 ? "froid" : ""}">${Math.round(j.min)}°</span><span>${Math.round(j.max)}°</span>${j.pluie >= 1 ? `<i>💧${Math.round(j.pluie)}</i>` : ""}</div>`).join("")}</div>`
      : !etat.lieu ? `<a class="info" href="#/reglages">📍 Ajoute ta ville dans Réglages pour les alertes gel</a>` : ""}
    <h2>À faire ${afaire.length ? `<span class="badge">${afaire.length}</span>` : ""}</h2>
    ${afaire.length ? `<ul class="liste">${afaire.map((x) => ligneTache(x, auj)).join("")}</ul>` : `<p class="vide">Rien à faire aujourd'hui 🌿</p>`}
    <h2>Dans les 14 jours</h2>
    ${avenir.length ? `<ul class="liste">${avenir.map((x) => ligneTache(x, auj, true)).join("")}</ul>` : `<p class="vide">Rien de prévu.</p>`}`;
}

function vuePlantes() {
  const auj = aujourdhui();
  const groupe = (titre, f) => {
    const ps = PLANTES.filter(f);
    return `<h2>${titre}</h2><ul class="cartes">${ps.map((p) => {
      const ts = tachesDe(p, auj).filter((x) => x.due).sort((a, b) => a.due.localeCompare(b.due));
      const n = ts.filter((x) => x.due <= auj).length;
      const prochaine = ts[0];
      return `<li><a href="#/plante/${p.id}"><span class="emoji gros">${p.emoji}</span>
        <div><b>${esc(p.nom)}</b><small>${esc(p.espece)}</small>
        <small>${n ? `<span class="badge">${n}</span> à faire` : prochaine ? `Prochain : ${joli(prochaine.due)}` : ""}</small></div></a></li>`;
    }).join("")}</ul>`;
  };
  return `<h1>Mes plantes</h1>
    ${groupe("Dedans", (p) => position(p) === "dedans")}
    ${groupe("Dehors", (p) => position(p) === "dehors")}`;
}

function vuePlante(id) {
  const p = PLANTES.find((x) => x.id === id);
  if (!p) return `<p>Plante inconnue.</p>`;
  const auj = aujourdhui();
  const ts = tachesDe(p, auj);
  const hist = etat.log.filter((l) => l.k.startsWith(p.id + ":")).slice(0, 15);
  const labelDe = (k) => {
    const t = k.split(":")[1];
    return t === "arrosage" ? "Arrosage" : p.taches.find((x) => x.id === t)?.label || t;
  };
  const nomAction = { fait: "fait", pasbesoin: "vérifié, pas besoin", plustard: "reporté" };
  const a = p.arrosage;
  const freq = a?.jours && Object.values(a.jours).some((v) => v)
    ? `<p class="petit">Vérification indicative : hiver ${a.jours.hiver ?? "-"} j · printemps ${a.jours.printemps ?? "-"} j · été ${a.jours.ete ?? "-"} j · automne ${a.jours.automne ?? "-"} j</p>` : "";
  return `
    <a class="retour" href="#/plantes">‹ Plantes</a>
    <h1><span class="emoji">${p.emoji}</span> ${esc(p.nom)}</h1>
    <p class="espece">${esc(p.espece)}</p>
    <dl><dt>Où</dt><dd>${esc(p.emplacement)} · <b>${position(p)}</b></dd>
    ${p.contenant ? `<dt>Contenant</dt><dd>${esc(p.contenant)}</dd>` : ""}</dl>
    ${a?.consigne ? `<h2>Arrosage</h2><p>${esc(a.consigne)}</p>${freq}` : ""}
    ${p.fiche?.length ? `<h2>À savoir</h2><ul class="puces">${p.fiche.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
    <h2>Tâches</h2>
    <ul class="liste">${ts.map((x) => x.due ? ligneTache(x, auj) : `<li class="tache pause">${esc(x.label)}</li>`).join("")}</ul>
    <h2>Mes notes</h2>
    <textarea id="notes" rows="4" placeholder="Observations, traitements, changement d'emplacement…">${esc(etat.notes[p.id] ?? p.notes ?? "")}</textarea>
    <h2>Historique</h2>
    ${hist.length ? `<ul class="hist">${hist.map((l) => `<li><span>${joli(l.date)}</span> ${esc(labelDe(l.k))} : ${nomAction[l.action] || l.action}</li>`).join("")}</ul>` : `<p class="vide">Rien encore.</p>`}`;
}

function lienAgenda() {
  const url = location.href.split("#")[0];
  const demain = ajout(aujourdhui(), 1).replaceAll("-", "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "🌱 Plantes : tâches du jour",
    details: `Ouvrir l'app : ${url}`,
    dates: `${demain}T090000/${demain}T091000`,
    ctz: "Europe/Paris",
    recur: "RRULE:FREQ=DAILY",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function vueReglages() {
  return `<h1>Réglages</h1>
    <h2>Météo</h2>
    <p>${etat.lieu ? `📍 ${esc(etat.lieu.nom)}` : "Aucune ville définie."}</p>
    <div class="ligne"><input id="ville" placeholder="Ville (ex. Paris)"><button id="chercher">Chercher</button></div>
    <div id="resultats"></div>
    <button id="geo">Utiliser ma position</button>
    <p class="petit">Prévisions Open-Meteo, utilisées pour les alertes gel et le bon moment pour sortir les plantes. La position reste dans ton téléphone.</p>
    <h2>Rappel quotidien</h2>
    <p>Crée un événement répété chaque jour à 9 h dans Google Agenda, avec le lien vers l'app.</p>
    <a class="bouton" href="${lienAgenda()}" target="_blank" rel="noopener">Ajouter à Google Agenda</a>
    <h2>Sauvegarde</h2>
    <p class="petit">Ton historique est stocké dans ce navigateur. Exporte-le de temps en temps.</p>
    <div class="ligne"><button id="export">Exporter</button><label class="bouton">Importer<input id="import" type="file" accept="application/json" hidden></label></div>`;
}

function rendre() {
  const h = location.hash || "#/";
  let html;
  if (h.startsWith("#/plante/")) html = vuePlante(decodeURIComponent(h.slice(9)));
  else if (h === "#/plantes") html = vuePlantes();
  else if (h === "#/reglages") html = vueReglages();
  else html = vueJour();
  $app().innerHTML = html;
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("actif", a.getAttribute("href") === (h.startsWith("#/plante/") ? "#/plantes" : h === "#" ? "#/" : h)));
  brancher();
}

function brancher() {
  document.querySelectorAll("button[data-k]").forEach((b) => (b.onclick = () => agir(b.dataset.k, b.dataset.a)));
  const notes = document.getElementById("notes");
  if (notes) notes.oninput = () => { etat.notes[location.hash.slice(9)] = notes.value; sauver(); };
  const geo = document.getElementById("geo");
  if (geo) geo.onclick = () => navigator.geolocation.getCurrentPosition(
    (pos) => { etat.lieu = { lat: +pos.coords.latitude.toFixed(2), lon: +pos.coords.longitude.toFixed(2), nom: "Ma position" }; etat.meteo = null; sauver(); majMeteo(true); rendre(); },
    () => toast("Position refusée ou indisponible"));
  const chercher = document.getElementById("chercher");
  if (chercher) chercher.onclick = async () => {
    const q = document.getElementById("ville").value.trim();
    if (!q) return;
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=fr`);
      const j = await r.json();
      const res = document.getElementById("resultats");
      res.innerHTML = (j.results || []).map((v, i) => `<button class="choix" data-i="${i}">${esc(v.name)}, ${esc(v.admin2 || v.admin1 || "")} (${esc(v.country_code)})</button>`).join("") || "<p>Aucun résultat.</p>";
      res.querySelectorAll(".choix").forEach((b) => (b.onclick = () => {
        const v = j.results[b.dataset.i];
        etat.lieu = { lat: +v.latitude.toFixed(2), lon: +v.longitude.toFixed(2), nom: v.name };
        etat.meteo = null; sauver(); majMeteo(true); rendre();
      }));
    } catch { toast("Recherche impossible (hors ligne ?)"); }
  };
  const exp = document.getElementById("export");
  if (exp) exp.onclick = () => {
    const blob = new Blob([JSON.stringify(etat, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `plantes-${aujourdhui()}.json`;
    a.click();
  };
  const imp = document.getElementById("import");
  if (imp) imp.onchange = async () => {
    try {
      const data = JSON.parse(await imp.files[0].text());
      if (!data.last || !data.log) throw new Error();
      etat = Object.assign(etatDefaut(), data); sauver(); toast("Import réussi"); rendre();
    } catch { toast("Fichier invalide"); }
  };
}

window.addEventListener("hashchange", () => { rendre(); scrollTo(0, 0); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) { rendre(); majMeteo(); } });
rendre();
majMeteo();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
