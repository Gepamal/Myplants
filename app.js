"use strict";

// ---------- état local ----------
const CLE = "plantes.v1";
const etatDefaut = () => ({
  last: {}, snooze: {}, log: [], notes: {}, meteo: null, lieu: null,
  plantesPerso: [], photos: {}, masquees: [], rythme: {},
  theme: "clair", plantnetKey: "",
});
let etat = charger();

function charger() {
  try {
    return Object.assign(etatDefaut(), JSON.parse(localStorage.getItem(CLE)) || {});
  } catch {
    return etatDefaut();
  }
}
function sauver() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
    return true;
  } catch {
    toast("Stockage plein : supprime des photos ou exporte tes données");
    return false;
  }
}

// ---------- dates (toujours en local, format AAAA-MM-JJ) ----------
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const ajout = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const ecart = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
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
function debutFenetre(mois, s) {
  const d = parse(s); d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const prec = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    if (!mois.includes(prec.getMonth() + 1)) break;
    d.setMonth(d.getMonth() - 1);
  }
  return iso(d);
}
function prochaineFenetre(mois, s) {
  const d = parse(s); d.setDate(1);
  let dansFenetre = mois.includes(d.getMonth() + 1);
  for (let i = 0; i < 24; i++) {
    d.setMonth(d.getMonth() + 1);
    const dedans = mois.includes(d.getMonth() + 1);
    if (dedans && !dansFenetre) return iso(d);
    dansFenetre = dedans;
  }
  return null;
}
function finFenetre(mois, s) {
  const d = parse(s); d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const suiv = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    if (!mois.includes(suiv.getMonth() + 1)) break;
    d.setMonth(d.getMonth() + 1);
  }
  return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

// ---------- plantes ----------
const lesPlantes = () => [
  ...PLANTES.filter((p) => !etat.masquees.includes(p.id)),
  ...etat.plantesPerso,
];
const plante = (id) => PLANTES.find((p) => p.id === id) || etat.plantesPerso.find((p) => p.id === id);

// ---------- moteur de tâches ----------
const cle = (p, t) => `${p.id}:${t}`;
const dernier = (p, t, seed) => etat.last[cle(p, t)] || seed || null;
const rythme = (p) => etat.rythme[p.id] || 1;

function position(p) {
  if (p.lieu !== "mobile") return p.lieu === "exterieur" ? "dehors" : "dedans";
  const s = dernier(p, "sortir", p.taches.find((t) => t.id === "sortir")?.faitLe);
  const r = dernier(p, "rentrer", p.taches.find((t) => t.id === "rentrer")?.faitLe);
  return s && (!r || s > r) ? "dehors" : "dedans";
}
const nomPosition = (p) => (position(p) === "dehors" ? "extérieur" : "intérieur");

function tachesDe(p, auj) {
  const out = [];
  const a = p.arrosage;
  const base = a?.jours?.[saison(auj)];
  if (base) {
    const jours = Math.max(1, Math.round(base * rythme(p)));
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
    } else if (t.mois?.length && t.tousLesJours) {
      type = "recurrent";
      if (t.mois.includes(parse(auj).getMonth() + 1)) {
        const ws = debutFenetre(t.mois, auj);
        due = !fait || fait < ws ? ws : ajout(fait, t.tousLesJours);
        if (!t.mois.includes(parse(due).getMonth() + 1)) due = prochaineFenetre(t.mois, auj);
      } else due = prochaineFenetre(t.mois, auj);
    } else if (t.mois?.length) {
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
const toutes = (auj) => lesPlantes().flatMap((p) => tachesDe(p, auj));

// ---------- actions ----------
let annulation = null;
function agir(k, action) {
  annulation = JSON.stringify(etat);
  const auj = aujourdhui();
  const [pid, tid] = k.split(":");
  if (action === "fait") {
    etat.last[k] = auj;
    delete etat.snooze[k];
  } else if (action === "pasbesoin") {
    etat.snooze[k] = ajout(auj, 2);
    // La terre n'était pas sèche : on espace un peu les prochaines vérifications.
    if (tid === "arrosage") etat.rythme[pid] = Math.min(3, +((etat.rythme[pid] || 1) * 1.15).toFixed(2));
  } else if (action === "plustard") etat.snooze[k] = ajout(auj, 7);
  etat.log.unshift({ k, action, date: auj });
  etat.log = etat.log.slice(0, 500);
  sauver();
  rendre();
  toast({ fait: "C'est noté ✓", pasbesoin: "Revu dans 2 jours, rythme espacé", plustard: "Revu dans 7 jours" }[action], true);
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
    if (!location.hash.startsWith("#/ajouter") && !location.hash.startsWith("#/modifier")) rendre();
  } catch { /* hors ligne */ }
}

function alertesMeteo(auj) {
  const out = [];
  const jours = etat.meteo?.jours?.filter((j) => j.d >= auj) || [];
  if (!jours.length) return out;
  const plusFroid = jours.reduce((a, b) => (b.min < a.min ? b : a));
  const mois = parse(auj).getMonth() + 1;
  for (const p of lesPlantes()) {
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

// ---------- photos ----------
function compresser(file, max) {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * r);
      c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = ko;
    img.src = URL.createObjectURL(file);
  });
}
const dataUrlVersBlob = async (u) => (await fetch(u)).blob();

// ---------- rendu ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);
const vignette = (p, cls = "") => etat.photos[p.id]
  ? `<img class="vignette ${cls}" src="${etat.photos[p.id]}" alt="">`
  : `<span class="emoji ${cls}">${p.emoji || "🌱"}</span>`;

function ligneTache(x, auj, compacte) {
  const retard = ecart(x.due, auj);
  let quand;
  if (x.limite) quand = `avant le ${joli(x.limite)}`;
  else if (retard > 0 && !x.dernierFait) quand = "à faire";
  else if (retard > 0) quand = `en retard de ${retard} j`;
  else if (retard === 0) quand = "aujourd'hui";
  else quand = joli(x.due);
  const arrosage = x.type === "arrosage";
  return `<li class="tache ${retard > 0 && !x.limite && x.dernierFait ? "retard" : ""}">
    <div class="t-tete">${vignette(x.p)}
      <div><a class="t-plante" href="#/plante/${x.p.id}">${esc(x.p.nom)}</a>
      <div class="t-label">${esc(x.label)}</div>
      ${x.consigne && !compacte ? `<div class="t-consigne">${esc(x.consigne)}</div>` : ""}
      <div class="t-quand">${quand}</div></div></div>
    ${compacte ? "" : `<div class="t-actions"><button class="ok" data-k="${x.k}" data-a="fait">Fait</button><button data-k="${x.k}" data-a="${arrosage ? "pasbesoin" : "plustard"}">${arrosage ? "Pas besoin" : "Plus tard"}</button></div>`}
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
    const ps = lesPlantes().filter(f);
    if (!ps.length) return "";
    return `<h2>${titre}</h2><ul class="cartes">${ps.map((p) => {
      const ts = tachesDe(p, auj).filter((x) => x.due).sort((a, b) => a.due.localeCompare(b.due));
      const n = ts.filter((x) => x.due <= auj).length;
      const prochaine = ts[0];
      return `<li><a href="#/plante/${p.id}">${vignette(p, "gros")}
        <div><b>${esc(p.nom)}</b><small>${esc(p.espece)}</small>
        <small>${n ? `<span class="badge">${n}</span> à faire` : prochaine ? `Prochain : ${joli(prochaine.due)}` : ""}</small></div></a></li>`;
    }).join("")}</ul>`;
  };
  return `<h1>Mes plantes</h1>
    <a class="bouton large" href="#/ajouter">＋ Ajouter une plante</a>
    ${groupe("Intérieur", (p) => position(p) === "dedans")}
    ${groupe("Extérieur", (p) => position(p) === "dehors")}`;
}

function vuePlante(id) {
  const p = plante(id);
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
  const r = rythme(p);
  const aDesJours = a?.jours && Object.values(a.jours).some((v) => v);
  const fmt = (v) => (v ? `${Math.max(1, Math.round(v * r))} j` : "-");
  return `
    <a class="retour" href="#/plantes">‹ Plantes</a>
    ${etat.photos[p.id] ? `<img class="photo-plante" src="${etat.photos[p.id]}" alt="">` : ""}
    <h1>${etat.photos[p.id] ? "" : `<span class="emoji">${p.emoji || "🌱"}</span> `}${esc(p.nom)}</h1>
    <p class="espece">${esc(p.espece)}</p>
    <dl><dt>Où</dt><dd>${esc(p.emplacement)} · <b>${nomPosition(p)}</b></dd>
    ${p.contenant ? `<dt>Contenant</dt><dd>${esc(p.contenant)}</dd>` : ""}</dl>
    ${a?.consigne ? `<h2>Arrosage</h2><p>${esc(a.consigne)}</p>` : ""}
    ${aDesJours ? `<p class="petit">Vérification : hiver ${fmt(a.jours.hiver)} · printemps ${fmt(a.jours.printemps)} · été ${fmt(a.jours.ete)} · automne ${fmt(a.jours.automne)}</p>
      <div class="ligne rythme"><span class="petit">Rythme ${r === 1 ? "de base" : r > 1 ? `espacé de ${Math.round((r - 1) * 100)} %` : `resserré de ${Math.round((1 - r) * 100)} %`}</span>
      <button data-rythme="0.85">Plus souvent</button><button data-rythme="1.15">Moins souvent</button>${r !== 1 ? `<button data-rythme="reset">Réinitialiser</button>` : ""}</div>` : ""}
    ${p.fiche?.length ? `<h2>À savoir</h2><ul class="puces">${p.fiche.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
    <h2>Tâches</h2>
    <ul class="liste">${ts.map((x) => (x.due ? ligneTache(x, auj) : `<li class="tache pause">${esc(x.label)}</li>`)).join("") || `<li class="vide">Aucune tâche.</li>`}</ul>
    <h2>Mes notes</h2>
    <textarea id="notes" rows="4" placeholder="Observations, traitements, changement d'emplacement…">${esc(etat.notes[p.id] ?? p.notes ?? "")}</textarea>
    <h2>Historique</h2>
    ${hist.length ? `<ul class="hist">${hist.map((l) => `<li><span>${joli(l.date)}</span> ${esc(labelDe(l.k))} : ${nomAction[l.action] || l.action}</li>`).join("")}</ul>` : `<p class="vide">Rien encore.</p>`}
    <h2>Gérer</h2>
    <div class="ligne wrap">
      <label class="bouton secondaire">📷 ${etat.photos[p.id] ? "Changer la photo" : "Ajouter une photo"}<input id="photo-plante" type="file" accept="image/*" hidden></label>
      ${p.perso
        ? `<a class="bouton secondaire" href="#/modifier/${p.id}">Modifier</a><button id="supprimer" class="danger">Supprimer</button>`
        : `<button id="masquer" class="danger">Masquer cette plante</button>`}
    </div>`;
}

// ---------- ajout / modification ----------
let brouillon = null;
let fichierHD = null;

function nouveauBrouillon(p) {
  if (p) return {
    id: p.id, nom: p.nom, espece: p.espece, type: p.type || "plante-verte", lieu: p.lieu,
    emplacement: p.emplacement, contenant: p.contenant === "Pleine terre" ? "pleine-terre" : "pot",
    auto: !!p.arrosageAuto, notes: etat.notes[p.id] ?? p.notes ?? "", photo: etat.photos[p.id] || null, ia: p.ia || null,
  };
  return { nom: "", espece: "", type: "plante-verte", lieu: "interieur", emplacement: "", contenant: "pot", auto: false, notes: "", photo: null, ia: null };
}

const optionsType = (v) => Object.entries(TYPES).map(([k, t]) => `<option value="${k}" ${k === v ? "selected" : ""}>${t.emoji} ${esc(t.label)}</option>`).join("");

function vueAjout(id) {
  const existant = id ? plante(id) : null;
  if (!brouillon || brouillon.id !== (existant?.id)) brouillon = nouveauBrouillon(existant);
  const b = brouillon;
  return `
    <a class="retour" href="${existant ? `#/plante/${existant.id}` : "#/plantes"}">‹ Retour</a>
    <h1>${existant ? "Modifier" : "Ajouter une plante"}</h1>
    ${b.photo ? `<img class="photo-plante" src="${b.photo}" alt="">` : ""}
    <div class="ligne">
      <label class="bouton secondaire demi">📷 Prendre une photo<input class="f-photo" type="file" accept="image/*" capture="environment" hidden></label>
      <label class="bouton secondaire demi">🖼️ Galerie<input class="f-photo" type="file" accept="image/*" hidden></label>
    </div>
    <h2>Identifier</h2>
    <div class="ligne">
      <button id="id-plantnet">🔍 Pl@ntNet</button>
      <button id="id-ia">🤖 Demander à une IA</button>
    </div>
    <div id="id-resultats">${rendrePropositions(b)}</div>
    <div id="etapes-ia" class="alerte" hidden>
      <b>1.</b> La question est copiée ✓<br>
      <b>2.</b> Choisis ton IA, puis dans le champ de message : appui long → <b>Coller</b>, et envoie.<br>
      <b>3.</b> Copie sa réponse (bouton copier du bloc de code) et reviens ici la coller ci-dessous.
      <button id="ouvrir-partage" class="ok large">Choisir mon IA</button>
    </div>
    <details id="det-ia"><summary>Coller la réponse de l'IA</summary>
      <textarea id="f-json" rows="5" placeholder="Colle ici la réponse (le bloc JSON)"></textarea>
      <button id="appliquer-json">Remplir la fiche</button>
      ${b.ia ? `<p class="petit">✓ Fiche de l'IA appliquée : arrosage, tâches et conseils viendront de sa réponse.</p>` : ""}
    </details>
    <h2>Fiche</h2>
    <label>Nom ou surnom<input id="f-nom" value="${esc(b.nom)}" placeholder="ex. Azalée du salon"></label>
    <label>Espèce<input id="f-espece" value="${esc(b.espece)}" placeholder="ex. Rhododendron simsii"></label>
    <label>Type d'entretien<select id="f-type">${optionsType(b.type)}</select></label>
    <label>Où vit-elle ?<select id="f-lieu">
      <option value="interieur" ${b.lieu === "interieur" ? "selected" : ""}>Intérieur toute l'année</option>
      <option value="exterieur" ${b.lieu === "exterieur" ? "selected" : ""}>Extérieur toute l'année</option>
      <option value="mobile" ${b.lieu === "mobile" ? "selected" : ""}>Intérieur l'hiver, extérieur l'été</option>
    </select></label>
    <label>Emplacement<input id="f-emplacement" value="${esc(b.emplacement)}" placeholder="ex. séjour, fenêtre plein sud"></label>
    <label>Contenant<select id="f-contenant">
      <option value="pot" ${b.contenant === "pot" ? "selected" : ""}>En pot</option>
      <option value="pleine-terre" ${b.contenant === "pleine-terre" ? "selected" : ""}>Pleine terre</option>
    </select></label>
    <label class="case"><input id="f-auto" type="checkbox" ${b.auto ? "checked" : ""}> Arrosage automatique (pas de rappel d'arrosage)</label>
    <label>Notes<textarea id="f-notes" rows="3">${esc(b.notes)}</textarea></label>
    <button id="enregistrer" class="ok large">Enregistrer</button>`;
}

// Devine un type à partir du nom latin.
function deviner(espece) {
  const g = (espece || "").toLowerCase();
  const r = [
    [/citrus|fortunella|kumquat/, "agrume"],
    [/olea|laurus|nerium|lavand|rosmarin|salvia|thym|cistus|myrtus|punica|ficus carica/, "mediterraneenne"],
    [/rhododendron|azalea|erica|calluna|camellia|pieris|gardenia|skimmia|vaccinium|hydrangea/, "terre-bruyere"],
    [/phalaenopsis|orchid|dendrobium|cattleya|oncidium|vanda|cymbidium/, "orchidee"],
    [/cact|echeveria|crassula|aeonium|sedum|haworthia|aloe|kalanchoe|sempervivum|opuntia|mammillaria|euphorbia (milii|trigona|tirucalli)/, "succulente"],
    [/anthurium|spathiphyllum|begonia|cyclamen|saintpaulia|hibiscus|bromeli|guzmania|gerbera|chrysanth|kalanchoe|poinsettia|euphorbia pulcherrima|streptocarpus/, "plante-fleurie"],
    [/prunus laurocerasus|choisya|photinia|buxus|ligustrum|eleagnus|abelia|viburnum|pittosporum|escallonia/, "arbuste"],
  ].find(([re]) => re.test(g));
  return r ? r[1] : null;
}

function lireForm() {
  const v = (i) => $(i)?.value?.trim() ?? "";
  // Si l'utilisateur a retouché un nom proposé, on ne l'écrase plus.
  if (brouillon.nomAuto && v("f-nom") !== brouillon.nom) brouillon.nomAuto = false;
  Object.assign(brouillon, {
    nom: v("f-nom"), espece: v("f-espece"), type: v("f-type"), lieu: v("f-lieu"),
    emplacement: v("f-emplacement"), contenant: v("f-contenant"), auto: $("f-auto").checked, notes: $("f-notes").value,
  });
}

function construirePlante(b, existant) {
  const t = TYPES[b.type] || TYPES["plante-verte"];
  const ia = b.ia || {};
  const sansRappel = b.auto || (b.contenant === "pleine-terre" && b.lieu === "exterieur");
  const nulls = { hiver: null, printemps: null, ete: null, automne: null };
  let jours = ia.jours || { ...t.jours };
  if (sansRappel) jours = nulls;
  let taches = (ia.taches || t.taches).map((x) => ({ ...x }));
  const auj = aujourdhui();
  const m = parse(auj).getMonth() + 1;
  if (b.lieu === "mobile" && !taches.some((x) => x.id === "sortir")) {
    taches.push({ id: "sortir", label: "Sortir (nuits au-dessus de 8 °C)", mois: [5, 6] });
    // Ajoutée entre octobre et avril : on considère qu'elle est déjà rentrée.
    taches.push({ id: "rentrer", label: "Rentrer avant les nuits froides", mois: [10, 11], faitLe: m >= 10 || m <= 4 ? auj : undefined });
  }
  return {
    id: existant?.id || "perso-" + Date.now().toString(36),
    perso: true,
    type: b.type,
    ia: b.ia || null,
    nom: b.nom || b.espece || "Sans nom",
    emoji: t.emoji,
    espece: b.espece || "Espèce inconnue",
    lieu: b.lieu,
    emplacement: b.emplacement || (b.lieu === "exterieur" ? "Extérieur" : "Intérieur"),
    contenant: b.contenant === "pleine-terre" ? "Pleine terre" : "Pot",
    arrosageAuto: b.auto,
    gel: ia.gel ?? t.gel,
    arrosage: { jours, consigne: b.auto ? "Arrosage automatique." : ia.consigne || t.consigne },
    taches,
    fiche: ia.fiche || t.fiche,
    notes: "",
  };
}

const PROMPT_IA = (b) => `Identifie la plante sur la photo et propose sa fiche d'entretien pour mon app de suivi.
Contexte : ${b.lieu === "mobile" ? "intérieur l'hiver, extérieur l'été" : b.lieu === "exterieur" ? "extérieur toute l'année" : "intérieur toute l'année"}${b.emplacement ? `, ${b.emplacement}` : ""}, ${b.contenant === "pleine-terre" ? "en pleine terre" : "en pot"}${b.auto ? ", arrosage automatique" : ""}. Climat : France, hémisphère nord.
Réponds avec un court commentaire si besoin, puis ce JSON dans un bloc de code (pour que je puisse le copier d'un geste) :
{
  "nom": "nom commun en français",
  "espece": "nom latin",
  "type": "un parmi : ${Object.keys(TYPES).join(", ")}",
  "gel": température minimale supportée en °C (nombre),
  "arrosage": {
    "jours": { "hiver": nombre ou null, "printemps": nombre ou null, "ete": nombre ou null, "automne": nombre ou null },
    "consigne": "comment vérifier et arroser, en une phrase"
  },
  "taches": [ { "label": "tâche", "mois": [numéros de mois 1-12], "tousLesJours": nombre (optionnel, si répété dans ces mois) } ],
  "fiche": ["conseil clé", "toxicité éventuelle"]
}
"jours" = intervalle indicatif entre deux vérifications de l'arrosage.
Si la photo ne suffit pas pour identifier, dis-le et pose-moi une question au lieu de deviner.`;

function appliquerIA(texte) {
  const debut = texte.indexOf("{"), fin = texte.lastIndexOf("}");
  if (debut < 0 || fin < debut) throw new Error("Pas de JSON trouvé");
  const j = JSON.parse(texte.slice(debut, fin + 1));
  const nombre = (x) => (typeof x === "number" && x > 0 ? Math.round(x) : null);
  const jours = j.arrosage?.jours ? {
    hiver: nombre(j.arrosage.jours.hiver), printemps: nombre(j.arrosage.jours.printemps),
    ete: nombre(j.arrosage.jours.ete), automne: nombre(j.arrosage.jours.automne),
  } : null;
  const taches = Array.isArray(j.taches) ? j.taches.filter((t) => t && t.label).map((t, i) => {
    const mois = Array.isArray(t.mois) ? t.mois.map(Number).filter((m) => m >= 1 && m <= 12) : [];
    const x = { id: "ia" + i, label: String(t.label) };
    if (mois.length) x.mois = mois;
    if (nombre(t.tousLesJours)) x.tousLesJours = nombre(t.tousLesJours);
    return x.mois || x.tousLesJours ? x : null;
  }).filter(Boolean) : null;
  lireForm();
  if (j.nom && !brouillon.nom) brouillon.nom = String(j.nom);
  if (j.espece) brouillon.espece = String(j.espece);
  if (j.type && TYPES[j.type]) brouillon.type = j.type;
  brouillon.ia = {
    jours, taches,
    consigne: j.arrosage?.consigne ? String(j.arrosage.consigne) : null,
    fiche: Array.isArray(j.fiche) ? j.fiche.map(String) : null,
    gel: typeof j.gel === "number" ? j.gel : null,
  };
  for (const k of Object.keys(brouillon.ia)) if (brouillon.ia[k] == null) delete brouillon.ia[k];
}

async function appelPlantNet(url, options) {
  let r;
  try { r = await fetch(url, options); }
  catch { throw new Error("Pl@ntNet a refusé l'accès depuis cette page. Dans les réglages de ta clé : \"Expose my API key\" coché et domaine autorisé écrit exactement https://gepamal.github.io (avec https://, sans / final)."); }
  if (r.ok || r.status === 404) return r;
  let detail = "";
  try { detail = (await r.json()).message || ""; } catch {}
  const raisons = { 400: "Requête refusée (photo ?)", 401: "Clé invalide", 403: "Clé refusée pour ce domaine", 429: "Quota du jour atteint" };
  throw new Error(`${raisons[r.status] || "Erreur"} (code ${r.status})${detail ? ` : ${detail}` : ""}`);
}

async function identifierPlantNet() {
  lireForm();
  const res = $("id-resultats");
  if (!brouillon.photo) { toast("Ajoute d'abord une photo"); return; }
  if (!etat.plantnetKey) {
    res.innerHTML = `<p class="petit">Il faut une clé Pl@ntNet gratuite : <a href="#/reglages">Réglages</a>.</p>`;
    return;
  }
  res.innerHTML = `<p class="petit">Identification en cours…</p>`;
  try {
    const fd = new FormData();
    fd.append("images", fichierHD || await dataUrlVersBlob(brouillon.photo), "photo.jpg");
    fd.append("organs", "auto");
    const r = await appelPlantNet(`https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(etat.plantnetKey)}&lang=fr&nb-results=3`, { method: "POST", body: fd });
    if (r.status === 404) { res.innerHTML = `<p class="petit">Pl@ntNet ne reconnaît pas de plante sur cette photo. Essaie avec une feuille ou une fleur bien nette, en gros plan.</p>`; return; }
    const j = await r.json();
    brouillon.propositions = (j.results || []).slice(0, 3).map((x) => ({
      latin: x.species.scientificNameWithoutAuthor,
      commun: x.species.commonNames?.[0] || "",
      score: x.score,
    }));
    if (!brouillon.propositions.length) { res.innerHTML = `<p class="petit">Aucune proposition.</p>`; return; }
    choisirProposition(0);
  } catch (e) {
    res.innerHTML = `<p class="petit erreur">${esc(e.message)}</p>`;
  }
}

function rendrePropositions(b) {
  if (!b.propositions?.length) return "";
  return b.propositions.map((x, i) => `<button class="choix ${i === b.choix ? "choisi" : ""}" data-prop="${i}">
      ${i === b.choix ? "✓ " : ""}<b>${esc(x.latin)}</b>${x.commun ? ` · ${esc(x.commun)}` : ""} <span class="petit">${Math.round(x.score * 100)} %</span></button>`).join("")
    + `<p class="petit">La proposition la plus probable est appliquée. Touche une autre pour la choisir. Identification par l'API Pl@ntNet.</p>`;
}

function choisirProposition(i) {
  lireForm();
  const x = brouillon.propositions[i];
  brouillon.choix = i;
  brouillon.espece = x.latin;
  if (!brouillon.nom || brouillon.nomAuto) { brouillon.nom = x.commun || x.latin; brouillon.nomAuto = true; }
  const t = deviner(x.latin);
  if (t) brouillon.type = t;
  rendre();
  toast(t ? `Type proposé : ${TYPES[t].label}` : "Vérifie le type d'entretien");
}

async function testerCle() {
  const cle = $("cle-plantnet").value.trim();
  etat.plantnetKey = cle; sauver();
  const out = $("test-cle");
  out.textContent = "Test en cours…";
  try {
    const r = await appelPlantNet(`https://my-api.plantnet.org/v2/quota/daily?api-key=${encodeURIComponent(cle)}`);
    const j = await r.json();
    const n = j?.identify?.count ?? j?.quota?.identify?.count;
    out.textContent = `✓ Clé valide et domaine autorisé${n != null ? ` (${n} identification(s) aujourd'hui)` : ""}`;
  } catch (e) { out.textContent = e.message; }
}

function demanderIA() {
  lireForm();
  const texte = PROMPT_IA(brouillon);
  // Copie immédiate, pendant le geste de l'utilisateur.
  navigator.clipboard?.writeText(texte).catch(() => {});
  $("etapes-ia").hidden = false;
  $("det-ia").open = true;
  $("ouvrir-partage").onclick = async () => {
    try {
      if (fichierHD && navigator.canShare?.({ files: [fichierHD] })) await navigator.share({ files: [fichierHD], text: texte });
      else if (navigator.share) await navigator.share({ text: texte });
      else toast("Ouvre ton IA, colle la question et joins la photo");
    } catch { /* partage annulé */ }
  };
}

function enregistrer() {
  lireForm();
  if (!brouillon.nom && !brouillon.espece) { toast("Donne au moins un nom"); return; }
  const existant = brouillon.id ? plante(brouillon.id) : null;
  const p = construirePlante(brouillon, existant);
  if (existant) etat.plantesPerso = etat.plantesPerso.map((x) => (x.id === p.id ? p : x));
  else etat.plantesPerso.push(p);
  if (brouillon.photo) etat.photos[p.id] = brouillon.photo;
  if (brouillon.notes) etat.notes[p.id] = brouillon.notes;
  if (!sauver()) return;
  brouillon = null;
  location.hash = `#/plante/${p.id}`;
  toast(existant ? "Modifications enregistrées" : "Plante ajoutée 🌱");
}

// ---------- réglages ----------
function lienAgenda() {
  const url = location.href.split("#")[0];
  const demain = ajout(aujourdhui(), 1).replaceAll("-", "");
  const params = new URLSearchParams({
    action: "TEMPLATE", text: "🌱 Plantes : tâches du jour", details: `Ouvrir l'app : ${url}`,
    dates: `${demain}T090000/${demain}T091000`, ctz: "Europe/Paris", recur: "RRULE:FREQ=DAILY",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function vueReglages() {
  const masquees = PLANTES.filter((p) => etat.masquees.includes(p.id));
  const th = (v, l) => `<button data-theme="${v}" class="${etat.theme === v ? "ok" : ""}">${l}</button>`;
  return `<h1>Réglages</h1>
    <h2>Apparence</h2>
    <div class="ligne">${th("clair", "Clair")}${th("sombre", "Sombre")}${th("auto", "Auto")}</div>
    <h2>Météo</h2>
    <p>${etat.lieu ? `📍 ${esc(etat.lieu.nom)}` : "Aucune ville définie."}</p>
    <div class="ligne"><input id="ville" placeholder="Ville (ex. Paris)"><button id="chercher">Chercher</button></div>
    <div id="resultats"></div>
    <button id="geo">Utiliser ma position</button>
    <p class="petit">Prévisions Open-Meteo pour les alertes gel et le bon moment pour sortir les plantes. La position reste dans ton téléphone.</p>
    <h2>Identification Pl@ntNet</h2>
    <p class="petit">Crée une clé gratuite sur my.plantnet.org (500 identifications par jour). Dans les réglages de ta clé, coche "Expose my API key" et ajoute comme domaine autorisé, exactement : <b>https://gepamal.github.io</b></p>
    <div class="ligne"><input id="cle-plantnet" placeholder="Clé API Pl@ntNet" value="${esc(etat.plantnetKey)}"><button id="sauver-cle">Tester</button></div>
    <p id="test-cle" class="petit"></p>
    <h2>Rappel quotidien</h2>
    <p>Crée un événement répété chaque jour à 9 h dans Google Agenda, avec le lien vers l'app.</p>
    <a class="bouton" href="${lienAgenda()}" target="_blank" rel="noopener">Ajouter à Google Agenda</a>
    ${masquees.length ? `<h2>Plantes masquées</h2>${masquees.map((p) => `<button class="choix" data-reafficher="${p.id}">Réafficher : ${esc(p.nom)}</button>`).join("")}` : ""}
    <h2>Sauvegarde</h2>
    <p class="petit">Tout est stocké dans ce navigateur, photos comprises. Exporte régulièrement.</p>
    <div class="ligne wrap"><button id="export">Exporter</button><button id="partager">Envoyer vers mon cloud</button><label class="bouton secondaire">Importer<input id="import" type="file" accept=".json,.txt,application/json,text/plain" hidden></label></div>`;
}

function appliquerTheme() {
  const sombre = etat.theme === "sombre" || (etat.theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = sombre ? "sombre" : "clair";
  document.querySelector('meta[name="theme-color"]').content = sombre ? "#161816" : "#1f3d2b";
}

// Android n'accepte de partager que certains types de fichiers : le .json en est exclu, le .txt passe.
function fichierExport(pourPartage) {
  return pourPartage
    ? new File([JSON.stringify(etat)], `plantes-sauvegarde-${aujourdhui()}.txt`, { type: "text/plain" })
    : new File([JSON.stringify(etat)], `plantes-${aujourdhui()}.json`, { type: "application/json" });
}

// ---------- routeur ----------
function rendre() {
  appliquerTheme();
  const h = location.hash || "#/";
  let html;
  if (h.startsWith("#/plante/")) html = vuePlante(decodeURIComponent(h.slice(9)));
  else if (h === "#/plantes") html = vuePlantes();
  else if (h === "#/reglages") html = vueReglages();
  else if (h === "#/ajouter") html = vueAjout(null);
  else if (h.startsWith("#/modifier/")) html = vueAjout(decodeURIComponent(h.slice(11)));
  else html = vueJour();
  $("app").innerHTML = html;
  const onglet = /^#\/(plante\/|plantes|ajouter|modifier)/.test(h) ? "#/plantes" : h === "#" ? "#/" : h;
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("actif", a.getAttribute("href") === onglet));
  brancher();
}

function brancher() {
  const on = (id, ev, f) => { const el = $(id); if (el) el[ev] = f; };
  document.querySelectorAll("button[data-k]").forEach((b) => (b.onclick = () => agir(b.dataset.k, b.dataset.a)));

  // fiche plante
  const pid = location.hash.startsWith("#/plante/") ? decodeURIComponent(location.hash.slice(9)) : null;
  on("notes", "oninput", () => { etat.notes[pid] = $("notes").value; sauver(); });
  document.querySelectorAll("button[data-rythme]").forEach((b) => (b.onclick = () => {
    const v = b.dataset.rythme;
    etat.rythme[pid] = v === "reset" ? 1 : Math.min(3, Math.max(0.4, +((etat.rythme[pid] || 1) * +v).toFixed(2)));
    sauver(); rendre();
  }));
  on("photo-plante", "onchange", async () => {
    const f = $("photo-plante").files[0];
    if (!f) return;
    etat.photos[pid] = await compresser(f, 640);
    if (sauver()) rendre();
  });
  on("masquer", "onclick", () => {
    if (!confirm("Masquer cette plante ? Tu pourras la réafficher dans Réglages.")) return;
    etat.masquees.push(pid); sauver(); location.hash = "#/plantes";
  });
  on("supprimer", "onclick", () => {
    if (!confirm("Supprimer définitivement cette plante et son historique ?")) return;
    etat.plantesPerso = etat.plantesPerso.filter((p) => p.id !== pid);
    delete etat.photos[pid]; delete etat.notes[pid]; delete etat.rythme[pid];
    etat.log = etat.log.filter((l) => !l.k.startsWith(pid + ":"));
    sauver(); location.hash = "#/plantes";
  });

  // ajout
  document.querySelectorAll(".f-photo").forEach((inp) => (inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    lireForm();
    brouillon.photo = await compresser(f, 1024);
    // Version haute définition, gardée en mémoire seulement, pour l'identification.
    fichierHD = new File([await dataUrlVersBlob(await compresser(f, 2000))], "plante.jpg", { type: "image/jpeg" });
    rendre();
  }));
  on("id-plantnet", "onclick", identifierPlantNet);
  document.querySelectorAll("button[data-prop]").forEach((bt) => (bt.onclick = () => choisirProposition(+bt.dataset.prop)));
  on("id-ia", "onclick", demanderIA);
  on("appliquer-json", "onclick", () => {
    try { appliquerIA($("f-json").value); rendre(); $("det-ia").open = true; toast("Fiche remplie, vérifie puis enregistre"); }
    catch { toast("Réponse illisible : colle tout le bloc JSON"); }
  });
  on("f-type", "onchange", () => { lireForm(); });
  on("enregistrer", "onclick", enregistrer);

  // réglages
  document.querySelectorAll("button[data-theme]").forEach((b) => (b.onclick = () => { etat.theme = b.dataset.theme; sauver(); rendre(); }));
  document.querySelectorAll("button[data-reafficher]").forEach((b) => (b.onclick = () => {
    etat.masquees = etat.masquees.filter((x) => x !== b.dataset.reafficher); sauver(); rendre();
  }));
  on("sauver-cle", "onclick", testerCle);
  on("geo", "onclick", () => navigator.geolocation.getCurrentPosition(
    (pos) => { etat.lieu = { lat: +pos.coords.latitude.toFixed(2), lon: +pos.coords.longitude.toFixed(2), nom: "Ma position" }; etat.meteo = null; sauver(); majMeteo(true); rendre(); },
    () => toast("Position refusée ou indisponible")));
  on("chercher", "onclick", async () => {
    const q = $("ville").value.trim();
    if (!q) return;
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=fr`);
      const j = await r.json();
      const res = $("resultats");
      res.innerHTML = (j.results || []).map((v, i) => `<button class="choix" data-i="${i}">${esc(v.name)}, ${esc(v.admin2 || v.admin1 || "")} (${esc(v.country_code)})</button>`).join("") || "<p>Aucun résultat.</p>";
      res.querySelectorAll(".choix").forEach((b) => (b.onclick = () => {
        const v = j.results[b.dataset.i];
        etat.lieu = { lat: +v.latitude.toFixed(2), lon: +v.longitude.toFixed(2), nom: v.name };
        etat.meteo = null; sauver(); majMeteo(true); rendre();
      }));
    } catch { toast("Recherche impossible (hors ligne ?)"); }
  });
  on("export", "onclick", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(fichierExport());
    a.download = `plantes-${aujourdhui()}.json`;
    a.click();
  });
  on("partager", "onclick", async () => {
    const f = fichierExport(true);
    if (!navigator.canShare?.({ files: [f] })) { toast("Ce navigateur ne permet pas de partager un fichier : utilise Exporter"); return; }
    try {
      await navigator.share({ files: [f], title: "Sauvegarde plantes" });
      etat.derniereSauvegarde = aujourdhui(); sauver();
    } catch (e) { if (e.name !== "AbortError") toast("Partage impossible : " + e.message); }
  });
  on("import", "onchange", async () => {
    try {
      const data = JSON.parse(await $("import").files[0].text());
      if (!data.last || !data.log) throw new Error();
      etat = Object.assign(etatDefaut(), data); sauver(); toast("Import réussi"); rendre();
    } catch { toast("Fichier invalide"); }
  });
}

window.addEventListener("hashchange", () => {
  if (!/^#\/(ajouter|modifier)/.test(location.hash)) { brouillon = null; fichierHD = null; }
  rendre(); scrollTo(0, 0);
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !/^#\/(ajouter|modifier)/.test(location.hash)) { rendre(); majMeteo(); }
});
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", appliquerTheme);
rendre();
majMeteo();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
