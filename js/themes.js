/**
 * Taxonomie des thématiques + questionnaire.
 *
 * Pour ajouter/modifier une thématique : l'ajouter dans THEMES.
 * Le "label" doit correspondre (même approximativement, la comparaison
 * ignore accents/casse) à ce qui est écrit dans la colonne
 * "Thématiques principales" du Google Sheet, séparé par des virgules.
 *
 * Pour modifier le questionnaire : éditer QUESTIONS. Chaque option coche
 * un ou plusieurs "themeIds". Aucune autre partie du site n'a besoin
 * d'être touchée.
 */

const THEMES = [
  {
    id: "sante-mentale",
    label: "Santé mentale & bien-être",
    icon: "🧠",
    aliases: ["santé mentale", "bien-être", "mal-être", "dépression", "anxiété"],
  },
  {
    id: "ecoute",
    label: "Écoute & soutien psychologique",
    icon: "👂",
    aliases: ["écoute", "soutien psychologique", "ligne d'écoute", "psychologue"],
  },
  {
    id: "logement",
    label: "Logement & hébergement",
    icon: "🏠",
    aliases: ["logement", "hébergement", "hébergement d'urgence", "SDF"],
  },
  {
    id: "emploi",
    label: "Emploi, formation & insertion",
    icon: "💼",
    aliases: ["emploi", "formation", "insertion pro", "insertion professionnelle", "stage", "job"],
  },
  {
    id: "aide-financiere",
    label: "Aide financière & sociale",
    icon: "💶",
    aliases: ["aide financière", "aide sociale", "budget", "précarité", "RSA"],
  },
  {
    id: "genre-orientation",
    label: "Genre, orientation & vie affective",
    icon: "🌈",
    aliases: ["LGBT", "LGBTQ+", "LGBTQIA+", "orientation sexuelle", "identité de genre", "vie affective", "sexualité", "trans", "non-binaire"],
  },
  {
    id: "violences",
    label: "Violences & harcèlement",
    icon: "🛡️",
    aliases: ["violences", "harcèlement", "violences conjugales", "violences familiales", "maltraitance", "agression"],
  },
  {
    id: "addictions",
    label: "Addictions",
    icon: "🍃",
    aliases: ["addiction", "alcool", "drogue", "toxicomanie", "dépendance", "écrans"],
  },
  {
    id: "droits",
    label: "Droits & démarches",
    icon: "⚖️",
    aliases: ["droits", "démarches", "juridique", "aide juridique", "administratif", "papiers"],
  },
  {
    id: "vie-sociale",
    label: "Loisirs, sport & vie sociale",
    icon: "🤝",
    aliases: ["loisirs", "sport", "vie sociale", "isolement", "rencontres", "activités"],
  },
  {
    id: "numerique",
    label: "Numérique & harcèlement en ligne",
    icon: "💬",
    aliases: ["numérique", "harcèlement en ligne", "cyberharcèlement", "réseaux sociaux", "internet"],
  },
  {
    id: "handicap",
    label: "Handicap & santé",
    icon: "♿",
    aliases: ["handicap", "santé", "maladie", "accessibilité"],
  },
];

const QUESTIONS = [
  {
    id: "q1",
    text: "Comment tu te sens en ce moment, de manière générale ?",
    hint: "Tu peux cocher plusieurs réponses.",
    options: [
      { label: "Je me sens seul(e), isolé(e)", themeIds: ["vie-sociale", "sante-mentale"] },
      { label: "Je suis souvent stressé(e), anxieux(se) ou triste", themeIds: ["sante-mentale", "ecoute"] },
      { label: "Je me sens bien, j'ai juste envie de rencontrer du monde", themeIds: ["vie-sociale"] },
      { label: "Je ne sais pas trop, j'aurais besoin d'en parler", themeIds: ["ecoute"] },
    ],
  },
  {
    id: "q2",
    text: "As-tu des soucis concrets dans ton quotidien ?",
    hint: "Tu peux cocher plusieurs réponses.",
    options: [
      { label: "Logement / hébergement", themeIds: ["logement"] },
      { label: "Argent / budget", themeIds: ["aide-financiere"] },
      { label: "Études, stage ou travail", themeIds: ["emploi"] },
      { label: "Papiers administratifs / démarches", themeIds: ["droits"] },
      { label: "Aucun souci particulier", themeIds: [] },
    ],
  },
  {
    id: "q3",
    text: "Vis-tu une situation difficile avec d'autres personnes ?",
    hint: "Tu peux cocher plusieurs réponses.",
    options: [
      { label: "Harcèlement (école, travail, en ligne)", themeIds: ["violences", "numerique"] },
      { label: "Violences (familiales, dans le couple...)", themeIds: ["violences"] },
      { label: "Discrimination (origine, genre, handicap...)", themeIds: ["genre-orientation", "handicap"] },
      { label: "Non, rien de tout ça", themeIds: [] },
    ],
  },
  {
    id: "q4",
    text: "As-tu des questions sur toi-même (identité, orientation, corps...) ?",
    hint: "Tu peux cocher plusieurs réponses.",
    options: [
      { label: "Identité de genre / orientation sexuelle", themeIds: ["genre-orientation"] },
      { label: "Vie affective / sexualité", themeIds: ["genre-orientation"] },
      { label: "Handicap / santé particulière", themeIds: ["handicap"] },
      { label: "Rien de spécial", themeIds: [] },
    ],
  },
  {
    id: "q5",
    text: "As-tu une consommation (alcool, drogues, écrans...) qui t'inquiète ?",
    hint: "Une seule réponse.",
    options: [
      { label: "Oui, ça m'inquiète", themeIds: ["addictions"] },
      { label: "Non, pas particulièrement", themeIds: [] },
    ],
  },
];
