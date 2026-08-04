/**
 * Assistant de remplissage — Cerfa n°12504*13 (Demande de Complémentaire
 * santé solidaire / C2S).
 *
 * Portée volontairement limitée au "cas simple" : une personne seule qui
 * fait la demande pour elle-même (pas de conjoint/concubin/pacsé, pas de
 * personnes à charge). Les sections conjoint, personnes de moins de 25 ans
 * à charge et "situation familiale ayant changé" ne sont PAS couvertes.
 *
 * Contrairement aux deux autres assistants, les noms de champs de ce PDF
 * sont des codes courts peu lisibles (ex: "CP", "AID1"...). Chaque champ
 * utilisé ici a été identifié en croisant sa position sur la page avec le
 * texte imprimé juste à côté dans le vrai PDF (et pas deviné à partir du
 * nom du champ) — voir le script d'analyse si besoin de vérifier à nouveau
 * après une éventuelle mise à jour du formulaire officiel.
 */

const SANTE_SOLIDAIRE_WIZARD = {
  id: "sante-solidaire",
  cerfaFile: "assets/cerfa/cerfa-12504-css.pdf",
  cerfaLabel: "Cerfa n°12504*13 — Complémentaire santé solidaire",
  downloadName: "complementaire-sante-solidaire-pre-rempli.pdf",
  title: "Assistant Complémentaire santé solidaire",
  intro:
    "Cet assistant remplit pour toi les parties essentielles du dossier pour une demande seul(e), en ton nom. " +
    "Les parties qui concernent un conjoint ou des personnes à charge resteront à compléter à la main sur le " +
    "PDF généré si elles te concernent : elles seront listées à la fin.",
  steps: [
    {
      id: "identite",
      title: "Toi",
      fields: [
        { id: "nom", label: "Nom(s) et prénom(s)", type: "text", required: true, pdf: "Vos noms et prénoms" },
        { id: "numSS", label: "Numéro de sécurité sociale (si tu en as un)", type: "text", pdf: "Votre n° SS a" },
        { id: "cleSS", label: "Clé (2 derniers chiffres, optionnel)", type: "text", pdf: "clé a" },
        { id: "numAllocataire", label: "Numéro de dossier CAF (si tu en as un)", type: "text", pdf: "Votre n° allocataire" },
        { id: "naissance", label: "Date de naissance", type: "date-combined", pdf: "Votre Date naissance" },
        {
          id: "nationalite",
          label: "Nationalité",
          type: "single-choice",
          options: [
            { value: "fr", label: "Française", pdf: "Votre nationalité" },
            { value: "ue", label: "Européenne", pdf: "européenne" },
            { value: "autre", label: "Autre", pdf: "autre" },
          ],
        },
      ],
    },
    {
      id: "adresse",
      title: "Ton adresse",
      fields: [
        { id: "adresse", label: "Adresse", type: "text", required: true, pdf: "ADRESS" },
        { id: "codePostal", label: "Code postal", type: "text", pdf: "CP" },
        { id: "commune", label: "Commune", type: "text", required: true, pdf: "Commune" },
      ],
    },
    {
      id: "prestations",
      title: "Ce que tu touches déjà",
      hint: "Coche ce qui s'applique (tu peux ne rien cocher).",
      fields: [
        {
          id: "prestations",
          label: "",
          type: "multi-choice",
          options: [
            { value: "rsa", label: "Le RSA", pdf: "RSA1" },
            { value: "aah", label: "L'AAH (allocation adulte handicapé)", pdf: "AAH1" },
            { value: "aspa", label: "L'ASPA ou l'ASV", pdf: "ASV1" },
            { value: "asi", label: "L'ASI (allocation supplémentaire d'invalidité)", pdf: "ASI1" },
          ],
        },
      ],
    },
  ],
  fixedChecks: [],
  fixedDateField: null,
  fixedSingleDateField: null,
  notCovered: [
    "La partie conjoint / concubin(e) / pacsé(e) (si tu fais la demande à deux)",
    "Les personnes de moins de 25 ans à ta charge",
    "Le changement de situation familiale au cours des 12 derniers mois",
    "Ta signature : à faire à la main (ou électroniquement) avant l'envoi",
  ],
};

// Permet aux scripts Node (voir scripts/) de lire cette config sans navigateur.
if (typeof module !== "undefined") module.exports = SANTE_SOLIDAIRE_WIZARD;
