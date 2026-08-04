/**
 * Démarches administratives courantes, avec la liste indicative des documents
 * à préparer.
 *
 * Contenu à vérifier et enrichir par l'association : les documents demandés
 * varient parfois selon la situation ou le département. Le lien officiel de
 * chaque démarche fait toujours foi en cas de doute.
 *
 * Pour ajouter une démarche : l'ajouter dans DEMARCHES. "themeIds" doit
 * reprendre un ou plusieurs id de THEMES (js/themes.js) — la démarche
 * apparaîtra alors dans la vue "Démarches" et sous les thématiques
 * correspondantes dans les résultats du questionnaire.
 */

const DEMARCHES = [
  {
    id: "carte-identite-passeport",
    themeIds: ["droits"],
    title: "Renouveler ou faire une carte d'identité / un passeport",
    summary: "Démarche à réaliser en mairie (avec rendez-vous), muni des bons justificatifs.",
    officialLink: { label: "Faire une pré-demande en ligne", url: "https://www.service-public.fr/particuliers/vosdroits/N358" },
    documents: [
      "Photo d'identité récente aux normes",
      "Ancienne carte d'identité ou passeport (si tu en as un)",
      "Justificatif de domicile de moins d'1 an",
      "Acte de naissance (si 1ère demande ou pas d'ancien titre)",
      "Timbre fiscal (uniquement pour un passeport)",
    ],
    tips: "Prends rendez-vous en mairie plusieurs semaines à l'avance, les délais sont parfois longs.",
  },
  {
    id: "inscription-france-travail",
    themeIds: ["emploi"],
    title: "S'inscrire à France Travail (ex Pôle emploi)",
    summary: "Pour être accompagné dans la recherche d'emploi ou de formation, et ouvrir d'éventuels droits.",
    officialLink: { label: "S'inscrire en ligne", url: "https://www.francetravail.fr/accueil/" },
    documents: [
      "Pièce d'identité",
      "RIB",
      "CV à jour",
      "Attestation employeur (si tu as déjà travaillé)",
      "Numéro de sécurité sociale",
    ],
    tips: "L'inscription se fait d'abord en ligne, un premier rendez-vous te sera ensuite proposé.",
  },
  {
    id: "contrat-engagement-jeune",
    themeIds: ["emploi", "aide-financiere"],
    title: "Contrat d'Engagement Jeune (CEJ)",
    summary: "Accompagnement intensif + allocation pour les 16-25 ans sans emploi ni formation.",
    officialLink: { label: "En savoir plus", url: "https://www.1jeune1solution.gouv.fr/contrat-engagement-jeune" },
    documents: [
      "Pièce d'identité",
      "Justificatif de domicile",
      "RIB",
      "Dernier diplôme ou certificat de scolarité",
    ],
    tips: "À demander auprès de ta Mission Locale ou de France Travail.",
  },
  {
    id: "logement-social",
    themeIds: ["logement"],
    title: "Demande de logement social",
    summary: "Permet d'obtenir un numéro unique valable dans tout le département.",
    officialLink: { label: "Faire la demande en ligne", url: "https://www.demande-logement-social.gouv.fr/" },
    wizard: "logement",
    documents: [
      "Pièce d'identité",
      "Avis d'imposition (ou de non-imposition) le plus récent",
      "Justificatifs de ressources des 3 derniers mois",
      "RIB",
      "Livret de famille (si besoin)",
    ],
    tips: "La demande est gratuite et se renouvelle chaque année. Tu peux aussi utiliser l'assistant de remplissage ci-dessus pour pré-remplir le formulaire.",
  },
  {
    id: "aide-logement-apl",
    themeIds: ["logement", "aide-financiere"],
    title: "Demande d'aide au logement (APL)",
    summary: "Aide versée par la CAF pour réduire le montant du loyer.",
    officialLink: {
      label: "Simuler et faire la demande",
      url: "https://www.caf.fr/allocataires/aides-et-demarches/droits-et-prestations/logement-et-cadre-de-vie/les-aides-au-logement",
    },
    documents: [
      "Bail de location signé",
      "Dernière quittance de loyer ou attestation du bailleur",
      "RIB",
      "Avis d'imposition",
    ],
    tips: "",
  },
  {
    id: "rsa-jeune-bourse",
    themeIds: ["aide-financiere"],
    title: "RSA jeune actif / bourse sur critères sociaux",
    summary: "Aides financières selon ta situation (jeune actif ayant déjà travaillé, ou étudiant).",
    officialLink: { label: "Vérifier ton éligibilité", url: "https://www.service-public.fr/particuliers/vosdroits/N19775" },
    documents: [
      "Pièce d'identité",
      "Avis d'imposition (le tien ou celui de tes parents selon le dispositif)",
      "RIB",
      "Justificatifs de ressources",
      "Certificat de scolarité (pour une bourse)",
    ],
    tips: "Les conditions varient beaucoup selon ta situation : demande conseil à une assistante sociale ou au CROUS.",
  },
  {
    id: "dossier-mdph",
    themeIds: ["handicap"],
    title: "Dossier MDPH (reconnaissance handicap)",
    summary: "Permet d'ouvrir des droits liés à un handicap ou une maladie invalidante (AAH, RQTH, aménagements...).",
    officialLink: { label: "Trouver ta MDPH", url: "https://www.service-public.fr/particuliers/vosdroits/F14953" },
    wizard: "mdph",
    documents: [
      "Formulaire Cerfa de demande MDPH complété",
      "Certificat médical de moins de 12 mois",
      "Pièce d'identité",
      "Justificatif de domicile",
    ],
    tips: "Le dossier peut être long à préparer : une assistante sociale peut t'aider à le remplir. Tu peux aussi utiliser l'assistant de remplissage ci-dessus pour pré-remplir le formulaire.",
  },
  {
    id: "complementaire-sante-solidaire",
    themeIds: ["handicap", "aide-financiere"],
    title: "Complémentaire santé solidaire",
    summary: "Permet d'avoir une couverture santé gratuite ou à prix réduit selon tes revenus.",
    officialLink: {
      label: "Vérifier ton éligibilité",
      url: "https://www.ameli.fr/assure/droits-demarches/difficultes-acces-droits-soins/complementaire-sante/complementaire-sante-solidaire-demande",
    },
    wizard: "sante-solidaire",
    documents: ["Pièce d'identité", "Justificatif de domicile", "Avis d'imposition", "RIB"],
    tips: "Tu peux utiliser l'assistant de remplissage ci-dessus pour pré-remplir le formulaire.",
  },
  {
    id: "changement-prenom-genre",
    themeIds: ["genre-orientation", "droits"],
    title: "Changement de prénom / de mention de sexe à l'état civil",
    summary: "Démarche possible en mairie (prénom) ou au tribunal (mention de sexe), sans obligation médicale.",
    officialLink: { label: "Voir la procédure", url: "https://www.service-public.fr/particuliers/vosdroits/F1361" },
    documents: [
      "Pièce d'identité",
      "Acte de naissance avec filiation",
      "Justificatif de domicile",
      "Lettre expliquant ta demande",
    ],
    tips: "Des associations comme Chrysalide ou Fransgenre proposent des guides détaillés pour préparer ce dossier.",
  },
  {
    id: "depot-plainte",
    themeIds: ["violences"],
    title: "Déposer plainte",
    summary: "Possible dans n'importe quel commissariat/gendarmerie, en ligne pour certaines infractions, ou par courrier au procureur.",
    officialLink: { label: "Porter plainte en ligne", url: "https://www.service-public.fr/particuliers/vosdroits/F1435" },
    documents: [
      "Pièce d'identité",
      "Tout élément de preuve (photos, messages, certificats médicaux)",
      "Coordonnées d'éventuels témoins",
    ],
    tips: "Tu peux te faire accompagner par une association (CIDFF, France Victimes) avant ou pendant cette démarche.",
  },
  {
    id: "ordonnance-protection",
    themeIds: ["violences"],
    title: "Demande d'ordonnance de protection",
    summary: "Mesure d'urgence prononcée par un juge pour protéger une victime de violences.",
    officialLink: { label: "Voir la procédure", url: "https://www.service-public.fr/particuliers/vosdroits/F31255" },
    documents: [
      "Pièce d'identité",
      "Éléments de preuve des violences subies",
      "Justificatifs de la situation familiale (si besoin)",
    ],
    tips: "France Victimes (116 006) peut t'aider à monter ce dossier.",
  },
  {
    id: "signalement-cyberharcelement",
    themeIds: ["numerique", "violences"],
    title: "Signaler un cyberharcèlement",
    summary: "Signalement auprès de la plateforme concernée, avec possibilité de dépôt de plainte.",
    officialLink: { label: "3018 - signaler en ligne", url: "https://3018.fr/" },
    documents: [
      "Captures d'écran datées des messages/publications",
      "Identifiants des comptes concernés (pseudos, liens)",
      "Pièce d'identité (si dépôt de plainte)",
    ],
    tips: "Ne supprime pas les messages/publications avant de les avoir capturés : ce sont des preuves.",
  },
];

// Permet aux scripts Node (voir scripts/) de lire cette config sans navigateur.
if (typeof module !== "undefined") module.exports = DEMARCHES;
