// Données des plantes. Pour modifier une fiche, édite ce fichier.
//
// arrosage.jours : intervalle indicatif entre deux vérifications, par saison
//   (hiver = nov-fév, printemps = mars-mai, ete = juin-août, automne = sept-oct).
//   null = pas de rappel d'arrosage pour cette saison.
// taches[] :
//   { id, label, mois:[...], tousLesJours:N }  -> récurrent pendant ces mois
//   { id, label, mois:[...] }                  -> une fois par an, pendant ces mois
//   { id, label, date:'AAAA-MM-JJ' }           -> ponctuel
//   { id, label, tousLesJours:N }              -> récurrent toute l'année
//   faitLe:'AAAA-MM-JJ' (optionnel) -> dernière fois que c'est fait, avant l'app
// gel : température mini supportée dehors (°C), pour les alertes météo.
// mobile : la plante passe l'été dehors et l'hiver dedans.

window.PLANTES = [
  {
    id: "azalee",
    nom: "Azalée",
    emoji: "🌺",
    espece: "Rhododendron simsii",
    lieu: "mobile",
    emplacement: "Intérieur, au frais (12 à 18 °C), loin des radiateurs ; dehors à l'ombre l'été",
    contenant: "Pot",
    gel: 0,
    arrosage: {
      jours: { hiver: 4, printemps: 4, ete: 3, automne: 4 },
      consigne: "La motte ne doit jamais sécher. Tremper le pot 10 à 15 min dans de l'eau non calcaire, puis bien égoutter.",
    },
    taches: [
      { id: "fanees", label: "Retirer les fleurs fanées", mois: [11, 12, 1, 2, 3], tousLesJours: 7 },
      { id: "feuilles", label: "Vérifier le dessous des feuilles (dépôt noir collant = fumagine, pucerons)", tousLesJours: 21 },
      { id: "taille", label: "Taille légère après la floraison", mois: [4] },
      { id: "rempotage", label: "Rempoter en terre de bruyère, pot à peine plus grand", mois: [4, 5] },
      { id: "engrais", label: "Engrais terre de bruyère", mois: [4, 5, 6, 7, 8], tousLesJours: 21 },
      { id: "sortir", label: "Sortir à l'ombre légère (après les gelées)", mois: [5, 6] },
      { id: "rentrer", label: "Rentrer avant les gelées, au frais (10 à 15 °C) pour former les boutons", mois: [10, 11], faitLe: "2026-11-22" },
    ],
    fiche: [
      "Le froid relatif de l'automne déclenche la formation des boutons : sans lui, elle refleurit mal.",
      "Eau non calcaire uniquement (pluie, déminéralisée, filtrée).",
      "Toxique pour les chats et chiens.",
    ],
    notes: "",
  },
  {
    id: "citronnier",
    nom: "Citronnier",
    emoji: "🍋",
    espece: "Citrus limon",
    lieu: "mobile",
    emplacement: "Séjour l'hiver (loin des radiateurs, plein soleil), dehors de mi-mai à octobre",
    contenant: "Grand pot, environ 1,80 m",
    gel: 5,
    arrosage: {
      jours: { hiver: 10, printemps: 6, ete: 3, automne: 6 },
      consigne: "Seulement si les 4 à 5 cm du dessus sont secs. Arroser à fond, puis vider la soucoupe.",
      dernier: "2026-11-22",
    },
    taches: [
      { id: "cochenilles", label: "Inspecter le dessous des feuilles (cochenilles)", tousLesJours: 14 },
      { id: "engrais", label: "Engrais agrumes avec fer", mois: [3, 4, 5, 6, 7, 8, 9, 10], tousLesJours: 21 },
      { id: "taille", label: "Taille légère (bois mort, branches mal placées)", mois: [3] },
      { id: "surfacage", label: "Surfaçage : remplacer les 5 cm du dessus par du terreau agrumes", mois: [3, 4] },
      { id: "sortir", label: "Sortir au jardin (nuits > 8 °C, après les Saints de glace)", mois: [5, 6] },
      { id: "rentrer", label: "Rentrer avant les nuits à 5 °C", mois: [10, 11], faitLe: "2026-11-15" },
    ],
    fiche: [
      "Hiver idéal : 10 à 15 °C avec un maximum de lumière. Au chaud, il perd des feuilles et attire les cochenilles.",
      "Feuilles jaune pâle = chlorose (fer). Eau peu calcaire et engrais agrumes avec fer de mars à octobre.",
      "Chute de feuilles après la rentrée : normale, c'est le changement de lumière.",
    ],
    notes: "Rentré mi-novembre 2026, a perdu des feuilles, chlorose en voie de stabilisation.",
  },
  {
    id: "olivier",
    nom: "Olivier",
    emoji: "🫒",
    espece: "Olea europaea",
    lieu: "mobile",
    emplacement: "Séjour l'hiver (loin des radiateurs, plein soleil), dehors l'été",
    contenant: "Pot moyen, à rempoter dans un pot percé",
    gel: -5,
    arrosage: {
      jours: { hiver: 14, printemps: 8, ete: 4, automne: 8 },
      consigne: "Seulement si les 4 à 5 cm du dessus sont secs. Jamais d'eau stagnante dans le cache-pot.",
      bloquePar: "rempotage",
      delaiApres: 5,
    },
    taches: [
      { id: "rempotage", label: "Rempoter : terreau + 30 à 50 % sable ou pouzzolane, pot percé, sans tasser", date: "2026-11-26" },
      { id: "taille", label: "Taille de restructuration (raccourcir les pousses filantes)", mois: [3, 4] },
      { id: "engrais", label: "Engrais olivier / méditerranéennes", mois: [4, 5, 6, 7, 8, 9], tousLesJours: 30 },
      { id: "sortir", label: "Sortir au jardin", mois: [4, 5] },
      { id: "rentrer", label: "Rentrer (ou laisser dehors contre un mur avec voile si > -5 °C)", mois: [11], faitLe: "2026-11-15" },
    ],
    fiche: [
      "Convalescence : excès d'eau dans le cache-pot en novembre 2026. Racines saines à l'odeur, motte mise à sécher.",
      "Arrosage bloqué jusqu'au rempotage, puis première vérification 5 jours après.",
      "Pousses longues et dégarnies = manque de lumière. Un hiver frais l'aide à fleurir.",
    ],
    notes: "",
  },
  {
    id: "oxalis",
    nom: "Trèfle pourpre",
    emoji: "☘️",
    espece: "Oxalis triangularis",
    lieu: "interieur",
    emplacement: "Intérieur, depuis 3 ans",
    contenant: "Petit pot",
    arrosage: {
      jours: { hiver: 7, printemps: 5, ete: 4, automne: 6 },
      consigne: "Quand le dessus est sec. S'il dépérit d'un coup, c'est son repos : couper le feuillage, plus d'eau pendant 4 à 6 semaines.",
    },
    taches: [
      { id: "engrais", label: "Engrais plantes vertes (dose réduite)", mois: [4, 5, 6, 7, 8, 9], tousLesJours: 30 },
      { id: "rempotage", label: "Rempoter ou diviser les bulbes si le pot est plein", mois: [3] },
    ],
    fiche: [
      "Tiges longues et molles = manque de lumière, rapproche-le d'une fenêtre.",
      "Toxique pour les chats et chiens (oxalates).",
    ],
    notes: "",
  },
  {
    id: "pilea",
    nom: "Pilea",
    emoji: "🪙",
    espece: "Pilea peperomioides",
    lieu: "interieur",
    emplacement: "Rebord de la baie, côté jardin",
    contenant: "Pot carré",
    arrosage: {
      jours: { hiver: 10, printemps: 7, ete: 5, automne: 8 },
      consigne: "Quand les 2 à 3 premiers cm sont secs.",
    },
    taches: [
      { id: "tourner", label: "Tourner le pot d'un quart de tour", tousLesJours: 7 },
      { id: "engrais", label: "Engrais plantes vertes", mois: [4, 5, 6, 7, 8, 9], tousLesJours: 30 },
      { id: "rempotage", label: "Rempoter et séparer les rejets", mois: [4, 5] },
    ],
    fiche: ["Pousse vers la lumière : le tourner chaque semaine le garde droit."],
    notes: "",
  },
  {
    id: "aeonium",
    nom: "Aeonium",
    emoji: "🌵",
    espece: "Aeonium",
    lieu: "interieur",
    emplacement: "Rebord de la baie, côté jardin",
    contenant: "Petit pot",
    arrosage: {
      jours: { hiver: 14, printemps: 14, ete: 30, automne: 10 },
      consigne: "Terre complètement sèche avant d'arroser. Il pousse en hiver et se repose en été : presque pas d'eau l'été.",
    },
    taches: [
      { id: "engrais", label: "Engrais cactées (dose réduite)", mois: [10, 11, 2, 3], tousLesJours: 45 },
      { id: "rempotage", label: "Rempoter en terreau cactées", mois: [9] },
    ],
    fiche: ["Lumière maximale. Rosette qui s'allonge = manque de lumière."],
    notes: "",
  },
  {
    id: "euphorbe",
    nom: "Euphorbe",
    emoji: "❄️",
    espece: "Euphorbia hypericifolia 'Diamond Frost' (probable)",
    lieu: "interieur",
    emplacement: "Rebord de la baie, côté jardin",
    contenant: "Petit pot",
    arrosage: {
      jours: { hiver: 10, printemps: 6, ete: 4, automne: 8 },
      consigne: "Laisser sécher le dessus entre deux arrosages.",
    },
    taches: [
      { id: "taille", label: "Rabattre de moitié pour la redensifier", mois: [3] },
      { id: "engrais", label: "Engrais plantes fleuries", mois: [4, 5, 6, 7, 8, 9], tousLesJours: 21 },
    ],
    fiche: ["Sève irritante : gants pour la taille.", "Identification à confirmer."],
    notes: "",
  },
  {
    id: "anthurium",
    nom: "Anthurium",
    emoji: "❤️",
    espece: "Anthurium andraeanum",
    lieu: "interieur",
    emplacement: "Rebord de la baie, côté jardin",
    contenant: "Pot moyen avec soucoupe",
    arrosage: {
      jours: { hiver: 8, printemps: 6, ete: 4, automne: 7 },
      consigne: "Quand le dessus est sec. Eau peu calcaire si possible, vider la soucoupe.",
    },
    taches: [
      { id: "engrais", label: "Engrais plantes fleuries", mois: [3, 4, 5, 6, 7, 8, 9], tousLesJours: 21 },
      { id: "feuilles", label: "Dépoussiérer les feuilles, retirer fleurs fanées et feuilles jaunies", tousLesJours: 30 },
      { id: "rempotage", label: "Rempoter si les racines débordent", mois: [3, 4] },
    ],
    fiche: ["Lumière vive sans soleil direct. Aime l'humidité.", "Toxique pour les animaux."],
    notes: "",
  },
  {
    id: "bruyere",
    nom: "Bruyère",
    emoji: "🌸",
    espece: "Erica gracilis",
    lieu: "interieur",
    emplacement: "Rebord de la baie, côté jardin",
    contenant: "Pot avec soucoupe",
    arrosage: {
      jours: { hiver: 3, printemps: 3, ete: 2, automne: 3 },
      consigne: "La motte ne doit jamais sécher. Eau non calcaire. Si elle est sèche : tremper le pot 10 min puis égoutter.",
    },
    taches: [
      { id: "fin", label: "Fin de floraison : sortir sous abri ou composter", mois: [1, 2] },
    ],
    fiche: ["Plante saisonnière : en intérieur chauffé, elle tient quelques semaines. Le frais la fait durer."],
    notes: "",
  },
  {
    id: "avocatier",
    nom: "Avocatier",
    emoji: "🥑",
    espece: "Persea americana",
    lieu: "interieur",
    emplacement: "Rebord de la baie, côté jardin",
    contenant: "Pot blanc",
    arrosage: {
      jours: { hiver: 8, printemps: 5, ete: 3, automne: 6 },
      consigne: "Quand les 2 à 3 premiers cm sont secs. Jamais détrempé.",
    },
    taches: [
      { id: "pincer", label: "Pincer la tête pour le faire ramifier", mois: [3, 4] },
      { id: "engrais", label: "Engrais plantes vertes", mois: [4, 5, 6, 7, 8, 9], tousLesJours: 30 },
    ],
    fiche: ["Fiche provisoire : photo seule à envoyer pour confirmer."],
    notes: "",
  },
  {
    id: "jasmins",
    nom: "Jasmins étoilés (x2)",
    emoji: "🤍",
    espece: "Trachelospermum jasminoides (probable)",
    lieu: "exterieur",
    emplacement: "Terrasse, en pots, goutte-à-goutte l'été",
    contenant: "2 grands bacs",
    gel: -8,
    arrosage: {
      jours: { hiver: null, printemps: null, ete: null, automne: null },
      consigne: "Arrosage automatique l'été. En hiver, vérifier les pots seulement par temps sec prolongé.",
    },
    taches: [
      { id: "taille", label: "Taille après floraison (raccourcir, palisser)", mois: [8, 9] },
      { id: "engrais", label: "Engrais plantes fleuries", mois: [4, 5, 6, 7], tousLesJours: 30 },
    ],
    fiche: [
      "Feuilles simples qui rougissent l'hiver : jasmin étoilé, pas un vrai jasmin. À confirmer.",
      "En pot, les racines sont plus exposées au gel qu'en pleine terre.",
    ],
    notes: "",
  },
  {
    id: "lauriers",
    nom: "Lauriers du Caucase",
    emoji: "🌳",
    espece: "Prunus laurocerasus 'Caucasica'",
    lieu: "exterieur",
    emplacement: "Pleine terre, arrosage auto l'été",
    contenant: "Pleine terre",
    arrosage: { jours: { hiver: null, printemps: null, ete: null, automne: null }, consigne: "Arrosage automatique l'été, rien le reste de l'année." },
    taches: [
      { id: "taille1", label: "Taille de la haie", mois: [6] },
      { id: "taille2", label: "Taille de rattrapage", mois: [9] },
    ],
    fiche: ["Toutes les parties sont toxiques (feuilles, graines)."],
    notes: "",
  },
  {
    id: "choisya",
    nom: "Orangers du Mexique",
    emoji: "🌼",
    espece: "Choisya ternata",
    lieu: "exterieur",
    emplacement: "Pleine terre, arrosage auto l'été",
    contenant: "Pleine terre",
    arrosage: { jours: { hiver: null, printemps: null, ete: null, automne: null }, consigne: "Arrosage automatique l'été, rien le reste de l'année." },
    taches: [{ id: "taille", label: "Taille légère après la floraison", mois: [6] }],
    fiche: ["Rustique jusque vers -10 °C. Floraison parfumée au printemps, parfois remontante à l'automne."],
    notes: "",
  },
  {
    id: "arrosage-auto",
    nom: "Arrosage automatique",
    emoji: "💧",
    espece: "Goutte-à-goutte du jardin",
    lieu: "exterieur",
    emplacement: "Jardin",
    contenant: "",
    arrosage: { jours: { hiver: null, printemps: null, ete: null, automne: null }, consigne: "" },
    taches: [
      { id: "remise", label: "Remettre en route et vérifier les goutteurs", mois: [4, 5] },
      { id: "purge", label: "Couper et purger avant les gelées", mois: [10, 11] },
    ],
    fiche: ["Pas une plante : les rappels de mise en route et d'hivernage du goutte-à-goutte."],
    notes: "",
  },
];

// Modèles utilisés quand on ajoute une plante depuis l'app.
window.TYPES = {
  "plante-verte": {
    label: "Plante verte d'intérieur", emoji: "🌿", gel: 10,
    jours: { hiver: 10, printemps: 7, ete: 5, automne: 8 },
    consigne: "Quand les 2 à 3 premiers cm sont secs. Vider la soucoupe.",
    taches: [
      { id: "engrais", label: "Engrais plantes vertes", mois: [4, 5, 6, 7, 8, 9], tousLesJours: 30 },
      { id: "feuilles", label: "Dépoussiérer les feuilles", tousLesJours: 30 },
      { id: "rempotage", label: "Rempoter si les racines débordent", mois: [3, 4] },
    ],
    fiche: ["Lumière vive sans soleil direct brûlant.", "L'excès d'eau tue plus que la soif."],
  },
  "plante-fleurie": {
    label: "Plante fleurie d'intérieur", emoji: "🌼", gel: 10,
    jours: { hiver: 8, printemps: 6, ete: 4, automne: 7 },
    consigne: "Quand le dessus est sec. Vider la soucoupe.",
    taches: [
      { id: "engrais", label: "Engrais plantes fleuries", mois: [3, 4, 5, 6, 7, 8, 9], tousLesJours: 21 },
      { id: "fanees", label: "Retirer les fleurs fanées", tousLesJours: 14 },
      { id: "rempotage", label: "Rempoter si nécessaire", mois: [3, 4] },
    ],
    fiche: ["Beaucoup de lumière pour refleurir."],
  },
  "succulente": {
    label: "Succulente / cactus", emoji: "🌵", gel: 5,
    jours: { hiver: 21, printemps: 14, ete: 10, automne: 14 },
    consigne: "Terre complètement sèche avant d'arroser.",
    taches: [
      { id: "engrais", label: "Engrais cactées", mois: [4, 5, 6, 7, 8], tousLesJours: 45 },
      { id: "rempotage", label: "Rempoter en terreau cactées", mois: [3, 4] },
    ],
    fiche: ["Lumière maximale. Une plante qui s'allonge manque de lumière."],
  },
  "orchidee": {
    label: "Orchidée", emoji: "🌸", gel: 12,
    jours: { hiver: 10, printemps: 7, ete: 7, automne: 8 },
    consigne: "Quand les racines sont argentées : tremper 10 min, puis bien égoutter.",
    taches: [
      { id: "engrais", label: "Engrais orchidées", mois: [3, 4, 5, 6, 7, 8, 9, 10], tousLesJours: 21 },
      { id: "rempotage", label: "Rempoter en écorces après la floraison", mois: [4, 5] },
    ],
    fiche: ["Jamais d'eau stagnante au fond du cache-pot."],
  },
  "agrume": {
    label: "Agrume en pot", emoji: "🍋", gel: 5,
    jours: { hiver: 10, printemps: 6, ete: 3, automne: 6 },
    consigne: "Quand les 4 à 5 cm du dessus sont secs. Arroser à fond, vider la soucoupe.",
    taches: [
      { id: "cochenilles", label: "Inspecter le dessous des feuilles (cochenilles)", tousLesJours: 14 },
      { id: "engrais", label: "Engrais agrumes avec fer", mois: [3, 4, 5, 6, 7, 8, 9, 10], tousLesJours: 21 },
      { id: "taille", label: "Taille légère", mois: [3] },
    ],
    fiche: ["Hiver idéal : 10 à 15 °C et beaucoup de lumière.", "Feuilles pâles = chlorose : eau peu calcaire et engrais avec fer."],
  },
  "mediterraneenne": {
    label: "Méditerranéenne (olivier, laurier, lavande…)", emoji: "🫒", gel: -5,
    jours: { hiver: 14, printemps: 8, ete: 4, automne: 8 },
    consigne: "Quand les 4 à 5 cm du dessus sont secs. Craint l'eau stagnante.",
    taches: [
      { id: "engrais", label: "Engrais méditerranéennes", mois: [4, 5, 6, 7, 8, 9], tousLesJours: 30 },
      { id: "taille", label: "Taille de forme", mois: [3, 4] },
    ],
    fiche: ["Plein soleil. Un hiver frais lui convient mieux que la chaleur d'un intérieur."],
  },
  "terre-bruyere": {
    label: "Terre de bruyère (azalée, camélia, bruyère…)", emoji: "💮", gel: -5,
    jours: { hiver: 5, printemps: 4, ete: 3, automne: 4 },
    consigne: "Motte toujours fraîche, jamais détrempée. Eau non calcaire.",
    taches: [
      { id: "engrais", label: "Engrais terre de bruyère", mois: [4, 5, 6, 7, 8], tousLesJours: 21 },
      { id: "taille", label: "Taille légère après la floraison", mois: [4, 5] },
      { id: "rempotage", label: "Rempoter en terre de bruyère", mois: [4, 5] },
    ],
    fiche: ["Sol acide indispensable : jamais de calcaire."],
  },
  "arbuste": {
    label: "Arbuste ou haie en pleine terre", emoji: "🌳", gel: -10,
    jours: { hiver: null, printemps: null, ete: null, automne: null },
    consigne: "Pas d'arrosage une fois installé, sauf sécheresse prolongée ou les deux premiers étés.",
    taches: [
      { id: "taille", label: "Taille (après la floraison pour les arbustes à fleurs)", mois: [6] },
      { id: "paillage", label: "Pailler le pied avant l'hiver", mois: [11] },
    ],
    fiche: [],
  },
  "pot-exterieur": {
    label: "Plante en pot à l'extérieur", emoji: "🪴", gel: -5,
    jours: { hiver: null, printemps: 5, ete: 2, automne: 6 },
    consigne: "En pot dehors, ça sèche vite l'été : vérifier souvent quand il fait chaud.",
    taches: [
      { id: "engrais", label: "Engrais", mois: [4, 5, 6, 7], tousLesJours: 30 },
      { id: "protection", label: "Protéger le pot du gel (voile, pot surélevé, isolant)", mois: [11, 12] },
    ],
    fiche: ["Les racines en pot gèlent plus vite qu'en pleine terre."],
  },
};
