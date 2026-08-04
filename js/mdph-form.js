/**
 * Assistant de remplissage — Cerfa n°15692*01 (Demande à la MDPH).
 *
 * Portée volontairement limitée au "cas simple" : une personne qui fait sa
 * première demande MDPH pour elle-même (pas pour un enfant, pas en tant
 * qu'aidant familial). Les sections scolarité, aidant familial, historique
 * professionnel détaillé, tableaux de remboursement de frais et signature
 * ne sont PAS couvertes : la personne complète ces parties à la main sur le
 * PDF généré si elles la concernent, et doit relire + signer avant l'envoi.
 *
 * Chaque champ ci-dessous a été vérifié individuellement dans le vrai PDF
 * (nom exact du champ + position sur la page) avant d'être ajouté ici.
 * Ne pas ajouter un "pdf" sans avoir vérifié que le nom de champ existe
 * réellement dans assets/cerfa/cerfa-15692-mdph.pdf.
 *
 * Types de champ supportés par le moteur (js/pdf-assistant.js) :
 * - "text"          : une valeur → un champ texte du PDF
 * - "date3"          : jour/mois/année → 3 champs texte du PDF
 * - "postal5"        : code postal → 5 champs texte (1 chiffre par champ)
 * - "single-choice"  : une réponse cochée parmi plusieurs cases du PDF
 * - "multi-choice"   : plusieurs réponses cochées parmi plusieurs cases du PDF
 */

const MDPH_WIZARD = {
  id: "mdph",
  cerfaFile: "assets/cerfa/cerfa-15692-mdph.pdf",
  cerfaLabel: "Cerfa n°15692*01 — Demande à la MDPH",
  downloadName: "mdph-pre-rempli.pdf",
  title: "Assistant MDPH",
  intro:
    "Cet assistant remplit pour toi les parties essentielles du dossier MDPH pour une première demande, en ton nom. " +
    "Certaines parties plus spécifiques (scolarité, aidant familial, historique professionnel détaillé, signature...) " +
    "resteront à compléter à la main sur le PDF généré : elles seront listées à la fin.",
  steps: [
    {
      id: "identite",
      title: "Toi",
      fields: [
        { id: "nom", label: "Nom de naissance", type: "text", required: true, pdf: "Nom de naissance p2" },
        { id: "nomUsage", label: "Nom d'usage (si différent, optionnel)", type: "text", pdf: "Nom d'usage p2" },
        { id: "prenoms", label: "Prénom(s)", type: "text", required: true, pdf: "Prénoms p2" },
        {
          id: "sexe",
          label: "Tu es...",
          type: "single-choice",
          options: [
            { value: "H", label: "Un homme", pdf: "Sexe H p2" },
            { value: "F", label: "Une femme", pdf: "Sexe F p2" },
          ],
        },
        {
          id: "naissance",
          label: "Date de naissance",
          type: "date3",
          pdfJour: "DN J p2",
          pdfMois: "DN M p2",
          pdfAnnee: "DN A p2",
        },
        {
          id: "nationalite",
          label: "Nationalité",
          type: "single-choice",
          options: [
            { value: "fr", label: "Française", pdf: "Nationalité f p2" },
            { value: "ue", label: "Union européenne / Suisse", pdf: "Nationalité e p2" },
            { value: "autre", label: "Autre", pdf: "Nationalité autre p2" },
          ],
        },
      ],
    },
    {
      id: "contact",
      title: "Où on peut te contacter",
      fields: [
        { id: "adresse", label: "Adresse (numéro et rue)", type: "text", required: true, pdf: "Adresse p2" },
        { id: "complement", label: "Complément d'adresse (optionnel)", type: "text", pdf: "Complément d'adresse p2" },
        {
          id: "codePostal",
          label: "Code postal",
          type: "postal5",
          pdf: ["Code postal 1 p2", "Code postal 2 p2", "Code postal 3 p2", "Code postal 4 p2", "Code postal 5 p2"],
        },
        { id: "commune", label: "Commune", type: "text", required: true, pdf: "Commune p2" },
        { id: "telephone", label: "Téléphone", type: "text", pdf: "Numéro de téléphone p2" },
        { id: "email", label: "E-mail (optionnel)", type: "text", pdf: "Adresse e-mail p2" },
      ],
    },
    {
      id: "situation",
      title: "Ta situation de vie",
      fields: [
        {
          id: "situationVie",
          label: "Tu vis...",
          type: "single-choice",
          options: [
            { value: "seul", label: "Seul(e)", pdf: "Situation Seul" },
            { value: "couple", label: "En couple", pdf: "Situation En couple" },
            { value: "parent", label: "Avec un parent (ou les deux)", pdf: "Situation Avec un parent (ou les deux)" },
            { value: "enfant", label: "Avec ton enfant", pdf: "Situation Avec votre enfant (ou l'un d'entre eux)" },
          ],
        },
        {
          id: "logement",
          label: "Ton logement",
          type: "single-choice",
          options: [
            { value: "proprietaire", label: "Tu es propriétaire", pdf: "Vous êtes propriétaire" },
            { value: "locataire", label: "Tu es locataire", pdf: "Vous êtes locataire" },
            { value: "parents", label: "Hébergé(e) chez tes parents", pdf: "Vous êtes hébergé au domicile de vos parents" },
            { value: "ami", label: "Hébergé(e) chez un ami", pdf: "Vous êtes hébergé au domicile d'un ami" },
            { value: "medico-social", label: "Dans un établissement médico-social", pdf: "Vous êtes dans un établissement médico social" },
          ],
        },
      ],
    },
    {
      id: "ressources",
      title: "Ce que tu touches déjà",
      hint: "Coche ce qui s'applique (tu peux ne rien cocher).",
      fields: [
        {
          id: "prestations",
          label: "",
          type: "multi-choice",
          options: [
            { value: "aah", label: "L'AAH (allocation adulte handicapé)", pdf: "Vous recevez l'AAH" },
            { value: "rsa", label: "Le RSA", pdf: "Vous recevez le RSA" },
            { value: "chomage", label: "L'allocation chômage", pdf: "Vous recevez l'Allocation chômage" },
            { value: "ass", label: "L'ASS (allocation de solidarité spécifique)", pdf: "Vous recevez l'ASS" },
          ],
        },
      ],
    },
    {
      id: "besoins",
      title: "Au quotidien, as-tu besoin d'aide pour...",
      hint: "Coche ce qui s'applique (tu peux ne rien cocher).",
      fields: [
        {
          id: "besoinsQuotidien",
          label: "",
          type: "multi-choice",
          options: [
            { value: "depenses", label: "Régler tes dépenses courantes", pdf: "Besoin pour régler les dépenses courantes" },
            { value: "budget", label: "Gérer ton budget", pdf: "Besoin pour gérer son budget" },
            { value: "hygiene", label: "L'hygiène corporelle", pdf: "Besoin pour l'hygiène corporelle" },
            { value: "habiller", label: "T'habiller", pdf: "Besoin pour s'habiller" },
            { value: "courses", label: "Faire les courses", pdf: "Besoin pour faire les courses" },
            { value: "preparer-repas", label: "Préparer les repas", pdf: "Besoin pour préparer les repas" },
            { value: "prendre-repas", label: "Prendre les repas", pdf: "Besoin pour prendre les repas" },
            { value: "menage", label: "Faire le ménage", pdf: "Besoin pour faire le ménage" },
            { value: "sante", label: "Prendre soin de ta santé", pdf: "Besoin pour prendre soin de sa santé" },
          ],
        },
      ],
    },
    {
      id: "activite",
      title: "Études ou emploi",
      fields: [
        {
          id: "statut",
          label: "Actuellement...",
          type: "single-choice",
          options: [
            { value: "etudiant", label: "Tu es étudiant(e)", pdf: "Je suis étudiant (dans ce cas compléter également la partie C)" },
            { value: "sans-emploi", label: "Tu es sans emploi", pdf: "Je suis sans emploi" },
            { value: "emploi", label: "Tu as un emploi", pdf: "Oui j'ai un emploi" },
          ],
        },
        {
          id: "dejaTravaille",
          label: "As-tu déjà travaillé ?",
          type: "single-choice",
          showIf: { field: "statut", equals: "sans-emploi" },
          options: [
            { value: "oui", label: "Oui", pdf: "Oui, j'ai déjà travaillé" },
            { value: "non", label: "Non, jamais", pdf: "Non, je n'ai jamais travaillé" },
          ],
        },
        {
          id: "poleEmploi",
          label: "Es-tu inscrit(e) à France Travail (ex Pôle emploi) ?",
          type: "multi-choice",
          showIf: { field: "statut", equals: "sans-emploi" },
          options: [{ value: "oui", label: "Oui, je suis inscrit(e)", pdf: "Je suis inscrit à Pôle Emploi" }],
        },
        {
          id: "tempsEmploi",
          label: "Ton emploi est...",
          type: "single-choice",
          showIf: { field: "statut", equals: "emploi" },
          options: [
            { value: "complet", label: "À temps complet", pdf: "Emploi temps complet" },
            { value: "partiel", label: "À temps partiel", pdf: "Emploi temps partiel" },
          ],
        },
      ],
    },
    {
      id: "demande",
      title: "Ce que tu demandes à la MDPH",
      fields: [
        {
          id: "moinsDe20",
          label: "As-tu moins de 20 ans ?",
          type: "single-choice",
          options: [
            { value: "oui", label: "Oui" },
            { value: "non", label: "Non" },
          ],
        },
        {
          id: "demandeMoins20",
          label: "Coche ce que tu demandes",
          type: "multi-choice",
          showIf: { field: "moinsDe20", equals: "oui" },
          options: [
            { value: "aeeh", label: "AEEH (allocation d'éducation de l'enfant handicapé)", pdf: "Vous avez moins de 20 ans Allocation d'éducation de l'enfant handicapé" },
            { value: "pch", label: "PCH (prestation de compensation du handicap)", pdf: "Vous avez moins de 20 ans Prestation de compensation du handicap" },
            { value: "cmi-inv", label: "Carte mobilité inclusion — mention invalidité", pdf: "Vous avez moins de 20 ans Carte mobilité inclusion Mention invalidité" },
            { value: "cmi-stat", label: "Carte mobilité inclusion — mention stationnement", pdf: "Vous avez moins de 20 ans Carte mobilité inclusion Mention stationnement" },
          ],
        },
        {
          id: "demandePlus20",
          label: "Coche ce que tu demandes",
          type: "multi-choice",
          showIf: { field: "moinsDe20", equals: "non" },
          options: [
            { value: "aah", label: "AAH (allocation adulte handicapé)", pdf: "Vous avez plus de 20 ans Allocations aux adultes handicapés" },
            { value: "pch", label: "PCH (prestation de compensation du handicap)", pdf: "Prestation de compensation du handicap" },
            { value: "complement", label: "Complément de ressources", pdf: "Vous avez plus de 20 ans Complément de ressources" },
            { value: "cmi-inv", label: "Carte mobilité inclusion — mention invalidité", pdf: "Vous avez plus de 20 ans Carte mobilité inclusion Mention invalidité" },
            { value: "cmi-stat", label: "Carte mobilité inclusion — mention stationnement", pdf: "Vous avez plus de 20 ans Carte mobilité inclusion Mention stationnement" },
          ],
        },
      ],
    },
  ],
  // Cases cochées automatiquement (fixes, pas de question posée) : la date du
  // jour, et "première demande" puisque c'est le périmètre de cet assistant.
  fixedChecks: ["Première demande à la MDPH"],
  fixedDateField: {
    pdfJour: "Date de rédaction formulaire Jour",
    pdfMois: "Date de rédaction formulaire Mois",
    pdfAnnee: "Date de rédaction formulaire Année",
  },
  // Rappel affiché avant le téléchargement : ce que l'assistant NE remplit PAS.
  notCovered: [
    "La partie scolarité/études (si tu es en cours de scolarité et que ça te concerne)",
    "La partie \"aidant familial\" (si tu remplis le dossier pour quelqu'un d'autre)",
    "L'historique professionnel détaillé et les tableaux de frais/remboursements",
    "Le certificat médical (Cerfa n°15695*01, à faire remplir par un médecin séparément)",
    "Ta signature : à faire à la main (ou électroniquement) avant l'envoi",
  ],
};

// Permet aux scripts Node (voir scripts/) de lire cette config sans navigateur.
if (typeof module !== "undefined") module.exports = MDPH_WIZARD;
