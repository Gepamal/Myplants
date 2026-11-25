"use strict";
// Conseils d'emplacement (règles, hors ligne) et bilan par une IA européenne.
// Chargé avant app.js : les fonctions d'app.js ne sont appelées qu'à l'exécution.

// Type d'entretien des plantes de départ.
const TYPE_DEPARTS = {
  citronnier: "agrume", olivier: "mediterraneenne", oxalis: "plante-verte", pilea: "plante-verte",
  aeonium: "succulente", euphorbe: "plante-fleurie", anthurium: "plante-fleurie", bruyere: "terre-bruyere",
  avocatier: "plante-verte", azalee: "terre-bruyere", jasmins: "pot-exterieur", lauriers: "arbuste",
  choisya: "arbuste", "arrosage-auto": null,
};
const typeDe = (p) => p.type || TYPE_DEPARTS[p.id] || deviner(p.espece) || null;

// Besoins par type : lumière minimale (0 à 4), soleil direct derrière une vitre toléré, sensibilité au radiateur,
// exposition idéale dehors.
const BESOINS = {
  "plante-verte": { lumiere: 1.5, soleilDirect: true, radiateur: 1, dehors: ["mi-ombre", "ombre"] },
  "plante-fleurie": { lumiere: 2, soleilDirect: false, radiateur: 1, dehors: ["mi-ombre"] },
  "succulente": { lumiere: 3, soleilDirect: true, radiateur: 0, dehors: ["soleil"] },
  "orchidee": { lumiere: 2, soleilDirect: false, radiateur: 2, dehors: ["mi-ombre"] },
  "agrume": { lumiere: 3, soleilDirect: true, radiateur: 2, dehors: ["soleil"] },
  "mediterraneenne": { lumiere: 3, soleilDirect: true, radiateur: 2, dehors: ["soleil"] },
  "terre-bruyere": { lumiere: 2, soleilDirect: false, radiateur: 2, dehors: ["mi-ombre", "ombre"] },
  "arbuste": { lumiere: 0, soleilDirect: true, radiateur: 0, dehors: ["soleil", "mi-ombre", "ombre"] },
  "pot-exterieur": { lumiere: 2, soleilDirect: true, radiateur: 1, dehors: ["soleil", "mi-ombre"] },
};
const LUMIERE_PLANTE = { avocatier: 3, pilea: 2, oxalis: 2 };

const ORIENTATIONS = [["S", "Sud"], ["SO", "Sud-ouest"], ["SE", "Sud-est"], ["O", "Ouest"], ["E", "Est"], ["NO", "Nord-ouest"], ["NE", "Nord-est"], ["N", "Nord"], ["aucune", "Pas de fenêtre proche"]];
const SCORE_ORIENT = { S: 4, SO: 3.5, SE: 3.5, O: 3, E: 2.5, NO: 1.5, NE: 1.5, N: 1, aucune: 0 };
const DISTANCES = [["contre", "Contre la fenêtre (moins d'1 m)"], ["moyen", "À 1 ou 2 m"], ["loin", "À plus de 2 m"]];
const FACTEUR_DIST = { contre: 1, moyen: 0.6, loin: 0.3 };
const EXPOSITIONS = [["soleil", "Plein soleil (6 h et plus)"], ["mi-ombre", "Mi-ombre"], ["ombre", "Ombre"]];

const cond = (p) => etat.conditions?.[p.id] || {};

// Renvoie une liste de { ok, texte }.
function conseilsEmplacement(p, auj) {
  const t = typeDe(p);
  const b = BESOINS[t];
  if (!b) return [];
  const c = cond(p);
  const out = [];
  const dehors = position(p) === "dehors";
  const hiver = saison(auj) === "hiver";
  if (!dehors) {
    if (!c.orientation) return [{ ok: null, texte: "Indique l'orientation de la fenêtre la plus proche pour un avis sur l'emplacement." }];
    const lumiere = SCORE_ORIENT[c.orientation] * (FACTEUR_DIST[c.distance || "contre"]);
    const besoin = LUMIERE_PLANTE[p.id] ?? b.lumiere;
    if (lumiere + 0.01 < besoin) {
      const ideal = besoin >= 3 ? "une fenêtre sud ou ouest" : "une fenêtre est ou ouest";
      out.push({ ok: false, texte: `Trop sombre pour elle${c.distance && c.distance !== "contre" ? ", surtout à cette distance" : ""}. Rapproche-la d'${ideal}, à moins d'1 m.${hiver ? " En hiver, la lumière baisse encore : c'est la priorité." : ""}` });
    } else out.push({ ok: true, texte: "Lumière suffisante à cet emplacement." });
    if (!b.soleilDirect && ["S", "SO", "O"].includes(c.orientation) && (c.distance || "contre") === "contre") {
      out.push({ ok: false, texte: "Le soleil direct derrière la vitre peut brûler ses feuilles ou ses fleurs : un voilage, ou recule-la d'un mètre." });
    }
    if (c.radiateur) {
      out.push(b.radiateur >= 2
        ? { ok: false, texte: "Radiateur trop proche : l'air chaud et sec fait chuter les feuilles et attire cochenilles et araignées rouges. Éloigne-la d'au moins 1 m." }
        : { ok: false, texte: "Radiateur proche : surveille le dessèchement de la terre et des pointes de feuilles." });
    }
    if (hiver && (t === "agrume" || t === "mediterraneenne")) {
      out.push({ ok: null, texte: "L'hiver, elle préfère une pièce fraîche (10 à 15 °C) et très lumineuse à un séjour chauffé." });
    }
  } else {
    if (!c.exposition) return [{ ok: null, texte: "Indique son exposition au soleil pour un avis sur l'emplacement." }];
    if (!b.dehors.includes(c.exposition)) {
      const voulu = b.dehors.map((e) => EXPOSITIONS.find((x) => x[0] === e)[1].toLowerCase()).join(" ou ");
      out.push({ ok: false, texte: `Exposition peu adaptée : elle préfère ${voulu}.` });
    } else out.push({ ok: true, texte: "Exposition adaptée." });
    if (p.gel != null && p.gel > -3 && hiver) out.push({ ok: false, texte: `Elle craint le gel (${p.gel} °C). Prévois un abri ou rentre-la par grand froid.` });
  }
  return out;
}
const nbAlertes = (p, auj) => conseilsEmplacement(p, auj).filter((x) => x.ok === false).length;

function blocEmplacement(p, auj) {
  if (!BESOINS[typeDe(p)]) return "";
  const c = cond(p);
  const dehors = position(p) === "dehors";
  const opt = (liste, v) => `<option value="">Choisir…</option>` + liste.map(([k, l]) => `<option value="${k}" ${v === k ? "selected" : ""}>${l}</option>`).join("");
  const champs = dehors
    ? `<label>Exposition<select data-cond="exposition">${opt(EXPOSITIONS, c.exposition)}</select></label>`
    : `<label>Orientation de la fenêtre la plus proche<select data-cond="orientation">${opt(ORIENTATIONS, c.orientation)}</select></label>
       <label>Distance à la fenêtre<select data-cond="distance">${opt(DISTANCES, c.distance)}</select></label>
       <label class="case"><input type="checkbox" data-cond="radiateur" ${c.radiateur ? "checked" : ""}> Radiateur ou chauffage à moins d'1 m</label>`;
  const avis = conseilsEmplacement(p, auj);
  return `<h2>Emplacement</h2>
    ${champs}
    <ul class="avis">${avis.map((a) => `<li class="${a.ok === true ? "bon" : a.ok === false ? "mauvais" : ""}">${a.ok === true ? "✓" : a.ok === false ? "⚠" : "ℹ"} ${esc(a.texte)}</li>`).join("")}</ul>`;
}

function brancherEmplacement(pid) {
  document.querySelectorAll("[data-cond]").forEach((el) => (el.onchange = () => {
    etat.conditions = etat.conditions || {};
    const c = (etat.conditions[pid] = etat.conditions[pid] || {});
    c[el.dataset.cond] = el.type === "checkbox" ? el.checked : el.value;
    sauver();
    const y = scrollY; rendre(); scrollTo(0, y);
  }));
}

// ---------- bilan par une IA européenne ----------
const IA_EUROPE = `<div class="ia-europe">
  <p><b>Des IA européennes, au choix :</b></p>
  <ul>
    <li><b>Euria</b> (Infomaniak, Genève) : hébergée exclusivement en Suisse, tes échanges ne servent pas à entraîner ses modèles.</li>
    <li><b>Mistral Vibe</b>, ex-Le Chat (Mistral AI, Paris).</li>
  </ul>
  <p class="petit">Rien n'est envoyé automatiquement : tu vois le texte et c'est toi qui le colles dans l'IA de ton choix.</p>
</div>`;

function promptBilan(auj) {
  const ps = lesPlantes().filter((p) => typeDe(p));
  const meteo = etat.meteo?.jours?.slice(0, 7).map((j) => `${j.d} ${Math.round(j.min)}/${Math.round(j.max)} °C`).join(", ");
  const lignes = ps.map((p) => {
    const c = cond(p);
    const dehors = position(p) === "dehors";
    const empl = dehors
      ? `extérieur${c.exposition ? `, exposition ${c.exposition}` : ""}`
      : `intérieur${c.orientation ? `, fenêtre ${c.orientation}` : ""}${c.distance ? `, distance ${DISTANCES.find((d) => d[0] === c.distance)[1].toLowerCase()}` : ""}${c.radiateur ? ", près d'un radiateur" : ""}`;
    const arros = etat.log.filter((l) => l.k === `${p.id}:arrosage`).slice(0, 3).map((l) => `${l.date} ${l.action === "fait" ? "arrosé" : "pas besoin"}`).join("; ");
    const notes = (etat.notes[p.id] ?? p.notes ?? "").trim();
    return `- ${p.nom} (${p.espece}) : ${empl} ; ${p.emplacement || ""} ; ${p.contenant || ""}${p.lieu === "mobile" ? " ; sort l'été" : ""}${arros ? ` ; derniers arrosages : ${arros}` : ""}${notes ? ` ; notes : ${notes}` : ""}`;
  }).join("\n");
  return `Fais le bilan de mes plantes, en jardinier franc et concret.
Date : ${auj} (${saison(auj)}), ${etat.lieu?.nom ? `à ${etat.lieu.nom}` : "en France"}.${meteo ? `\nMétéo des 7 prochains jours (min/max) : ${meteo}.` : ""}

Mes plantes :
${lignes}

Pour chaque plante : un verdict (✓ ou ⚠) sur l'emplacement, la lumière et l'arrosage, et l'action concrète à faire maintenant si besoin.
Termine par les 3 priorités de la saison. Si une information te manque pour juger, dis-le plutôt que de deviner.`;
}

function vueBilan() {
  const auj = aujourdhui();
  const ps = lesPlantes().filter((p) => typeDe(p));
  const alertes = ps.flatMap((p) => conseilsEmplacement(p, auj).filter((x) => x.ok === false).map((x) => ({ p, x })));
  const sansInfo = ps.filter((p) => conseilsEmplacement(p, auj).some((x) => x.ok === null && /Indique/.test(x.texte)));
  return `<a class="retour" href="#/plantes">‹ Plantes</a>
    <h1>Bilan de mes plantes</h1>
    <h2>Ce que l'app voit</h2>
    ${alertes.length ? `<ul class="avis">${alertes.map(({ p, x }) => `<li class="mauvais">⚠ <a href="#/plante/${p.id}">${esc(p.nom)}</a> : ${esc(x.texte)}</li>`).join("")}</ul>` : `<p>✓ Aucun problème d'emplacement repéré.</p>`}
    ${sansInfo.length ? `<p class="petit">Emplacement non renseigné pour : ${sansInfo.map((p) => `<a href="#/plante/${p.id}">${esc(p.nom)}</a>`).join(", ")}. Le bilan sera plus juste si tu le complètes.</p>` : ""}
    <h2>Un avis plus fin par une IA</h2>
    <p>L'app prépare un message avec toutes tes plantes, leurs emplacements, tes derniers arrosages, tes notes et la météo.</p>
    ${IA_EUROPE}
    <div class="ligne wrap">
      <button class="ok" id="bilan-euria">Euria</button>
      <button class="ok" id="bilan-mistral">Mistral Vibe</button>
      <button id="bilan-autre">Autre IA</button>
    </div>
    <div id="bilan-etapes" class="alerte" hidden></div>
    <details><summary>Voir le message envoyé</summary><pre class="prompt">${esc(promptBilan(auj))}</pre></details>`;
}

function brancherBilan() {
  const texte = promptBilan(aujourdhui());
  const etapes = (html) => { const e = $("bilan-etapes"); e.innerHTML = html; e.hidden = false; };
  const copier = () => navigator.clipboard?.writeText(texte).catch(() => {});
  const partager = async () => { try { if (navigator.share) await navigator.share({ text: texte }); } catch {} };
  const b1 = $("bilan-euria"), b2 = $("bilan-mistral"), b3 = $("bilan-autre");
  if (b1) b1.onclick = () => {
    copier();
    etapes(`<b>1.</b> Message copié ✓<br><b>2.</b> Ouvre <b>Euria</b> (app ou site d'Infomaniak), puis appui long → <b>Coller</b> et envoie.<br><button class="ok large" id="partage-euria">Ou le partager directement vers l'app Euria</button>`);
    $("partage-euria").onclick = partager;
  };
  if (b2) b2.onclick = () => {
    copier();
    // Mistral accepte un message prérempli dans l'adresse ; il est aussi copié au cas où.
    const url = `https://chat.mistral.ai/chat?q=${encodeURIComponent(texte)}`;
    etapes(`<b>1.</b> Message copié ✓<br><b>2.</b> Mistral Vibe s'ouvre avec le message prérempli. S'il est vide : appui long → <b>Coller</b>.<br><a class="bouton large" href="${url}" target="_blank" rel="noopener">Ouvrir Mistral Vibe</a>`);
  };
  if (b3) b3.onclick = () => { copier(); partager(); toast("Message copié"); };
}

// ---------- présentation au premier démarrage ----------
// Feuille d'acacia dorée (feuille composée pennée).
const ACACIA = `<svg class="acacia" viewBox="0 0 64 24" aria-hidden="true"><defs><linearGradient id="or" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d77a"/><stop offset=".5" stop-color="#d4a62a"/><stop offset="1" stop-color="#a87b12"/></linearGradient></defs>
  <path d="M2 13 Q32 11 62 12" stroke="#b8891c" stroke-width="1.2" fill="none"/>
  ${[8, 15, 22, 29, 36, 43, 50].map((x) => `<ellipse cx="${x + 2}" cy="${7.5}" rx="3.2" ry="5" transform="rotate(-28 ${x + 2} 7.5)" fill="url(#or)"/><ellipse cx="${x + 2}" cy="${17}" rx="3.2" ry="5" transform="rotate(28 ${x + 2} 17)" fill="url(#or)"/>`).join("")}
  <ellipse cx="59" cy="12" rx="4" ry="2.6" fill="url(#or)"/></svg>`;
function splash() {
  const f = (i, t, d) => `<div class="sf"><span>${i}</span><b>${t}</b><small>${d}</small></div>`;
  return `<div id="splash"><div class="splash-in">
    <div class="splash-haut">
      <div class="splash-logo">🌱</div>
      <h1>Myplants</h1>
      <p class="splash-devise">Je les soigne, elles m'embellissent la vie.</p>
      <p class="splash-intro">Pas de compte, pas de pub, pas d'abonnement.</p>
    </div>
    <div class="splash-grille">
      ${f("📷", "Prends une photo et c'est rempli", "Pl@ntNet la reconnaît, t'as plus qu'à valider")}
      ${f("💧", "Des rappels qui apprennent", "Ils s'ajustent à ta façon d'arroser")}
      ${f("🌡️", "La météo veille", "Myplants t'alerte si la météo change")}
      ${f("🪟", "Place-les au bon endroit", "Fenêtre, distance, radiateur : verdict instantané")}
      ${f("🩺", "Un bilan à la demande", "Par une IA européenne, quand tu veux")}
      ${f("🔒", "Tes données chez toi", "Tout reste dans ton téléphone")}
    </div>
    <p class="splash-libre"><b>Ouvert, gratuit, souverain :</b> Pl@ntNet (recherche publique française, <a href="https://donorbox.org/plantnet-donation-fr" target="_blank" rel="noopener">à soutenir</a>), Open-Meteo, Euria (Suisse) et Mistral (Paris). Code public sur <a href="https://github.com/Gepamal/Myplants" target="_blank" rel="noopener">GitHub</a>.</p>
    <button class="ok large" id="splash-ok">C'est parti <span class="sign">· Saad 🌿</span></button>
  </div></div>`;
}
