/**
 * Assistant de remplissage — Cerfa n°14069*05 (Demande de logement social).
 *
 * Portée volontairement limitée au "cas simple" : une personne seule qui fait
 * sa première demande pour elle-même (pas de conjoint/codemandeur, pas de
 * colocataires, pas d'enfants/personnes à charge). Les sections revenus
 * détaillés (tableaux de ressources par personne/type), conjoint,
 * colocataires, personnes à charge et le complément handicap détaillé ne
 * sont PAS couvertes : à compléter à la main sur le PDF généré si elles
 * concernent la personne, avant relecture + signature.
 *
 * Chaque champ ci-dessous a été vérifié individuellement dans le vrai PDF
 * avant d'être ajouté ici (voir js/mdph-form.js pour la méthode).
 */

const LOGEMENT_WIZARD = {
  id: "logement",
  cerfaFile: "assets/cerfa/cerfa-14069-logement-social.pdf",
  cerfaLabel: "Cerfa n°14069*05 — Demande de logement social",
  downloadName: "demande-logement-social-pre-rempli.pdf",
  title: "Assistant Logement social",
  intro:
    "Cet assistant remplit pour toi les parties essentielles du dossier pour une première demande, seul(e), en ton nom. " +
    "Les parties plus spécifiques (revenus détaillés, conjoint, colocataires, enfants à charge...) resteront à " +
    "compléter à la main sur le PDF généré : elles seront listées à la fin.",
  steps: [
    {
      id: "identite",
      title: "Toi",
      fields: [
        {
          id: "civilite",
          label: "Tu es...",
          type: "single-choice",
          options: [
            { value: "mme", label: "Madame", pdf: "2. Coordonées_Mme" },
            { value: "m", label: "Monsieur", pdf: "2. Coordonées_M" },
          ],
        },
        { id: "nom", label: "Nom de naissance", type: "text", required: true, pdf: "2. Nom de naissance" },
        { id: "nomUsage", label: "Nom d'usage (si différent, optionnel)", type: "text", pdf: "2. Nom d'usage" },
        { id: "prenoms", label: "Prénom(s)", type: "text", required: true, pdf: "2. Prenom(s)" },
        {
          id: "naissance",
          label: "Date de naissance",
          type: "date-combined",
          pdf: "2. Date de naissance",
        },
        {
          id: "nationalite",
          label: "Nationalité",
          type: "single-choice",
          options: [
            { value: "fr", label: "Française", pdf: "2. Nationalite francaise" },
            { value: "ue", label: "Union européenne", pdf: "2. Nationalite Union europeene" },
            { value: "hors-ue", label: "Hors Union européenne", pdf: "2. Nationalite Hors Union europeene" },
          ],
        },
        { id: "securiteSociale", label: "Numéro de sécurité sociale (optionnel)", type: "text", pdf: "2. Securite sociale a" },
        { id: "telephone", label: "Téléphone portable", type: "text", pdf: "2. telephone portable" },
        { id: "email", label: "E-mail (optionnel)", type: "text", pdf: "2. Courrier electronique 1" },
      ],
    },
    {
      id: "adresse-actuelle",
      title: "Où tu vis actuellement",
      fields: [
        { id: "adresseNumero", label: "Numéro", type: "text", pdf: "2. Adresse du logement Numéro" },
        { id: "adresseVoie", label: "Voie", type: "text", required: true, pdf: "2. Adresse du logement Voie" },
        { id: "adresseComplement", label: "Complément (optionnel)", type: "text", pdf: "2. Adresse du logement Complement" },
        { id: "adresseCP", label: "Code postal", type: "text", pdf: "2. Adresse du logement Code postal" },
        { id: "adresseCommune", label: "Commune", type: "text", required: true, pdf: "2. Adresse du logement Commune" },
      ],
    },
    {
      id: "activite",
      title: "Ta situation professionnelle",
      fields: [
        {
          id: "situationPro",
          label: "Tu es...",
          type: "single-choice",
          options: [
            { value: "salarie", label: "Salarié(e) du privé", pdf: "3. Situation salarie du prive" },
            { value: "agent-etat", label: "Agent de l'État", pdf: "3. Situation agent de l'Etat" },
            { value: "etudiant", label: "Étudiant(e)", pdf: "3. Situation etudiant" },
            { value: "independant", label: "Indépendant(e)", pdf: "3. Situation independant" },
            { value: "chomage", label: "Sans emploi", pdf: "3. Situation chomage" },
            { value: "autre", label: "Autre situation", pdf: "3. Situation autres situations" },
          ],
        },
        { id: "profession", label: "Ta profession (optionnel)", type: "text", pdf: "3. Profession" },
      ],
    },
    {
      id: "logement-actuel",
      title: "Ton logement actuel",
      fields: [
        {
          id: "statutLogement",
          label: "Actuellement, tu es...",
          type: "single-choice",
          options: [
            { value: "proprietaire", label: "Propriétaire occupant", pdf: "5. Proprietaire occupant" },
            { value: "locataire-hlm", label: "Locataire HLM", pdf: "5. Locataire HLM" },
            { value: "locataire-prive", label: "Locataire privé", pdf: "5. Locataire privé" },
            { value: "logement-fonction", label: "Logement de fonction", pdf: "5. Logement de fonction" },
            { value: "residence-univ", label: "Résidence universitaire", pdf: "5. Residence universitaire" },
            { value: "chez-parents", label: "Hébergé(e) chez tes parents ou tes enfants", pdf: "5. Hebergement parents ou enfants" },
            { value: "chez-particulier", label: "Hébergé(e) chez un particulier", pdf: "5. Hebergement particulier" },
            { value: "sans-logement", label: "Sans logement", pdf: "5. Hebergement SDF bidonville" },
          ],
        },
        {
          id: "motifs",
          label: "Pourquoi fais-tu cette demande ?",
          type: "multi-choice",
          hint: "Coche ce qui s'applique.",
          options: [
            { value: "cher", label: "Logement actuel trop cher", pdf: "5. Logement trop cher" },
            { value: "petit", label: "Logement actuel trop petit", pdf: "5. Logement trop petit" },
            { value: "non-decent", label: "Logement actuel non décent", pdf: "5. Logement non decent" },
            { value: "handicap", label: "Logement inadapté à un handicap", pdf: "5. Logement inadapte handicap" },
            { value: "travail", label: "Trop éloigné de ton travail", pdf: "5. Logement eloigne lieu de travail" },
            { value: "expulsion", label: "Procédure d'expulsion en cours", pdf: "5. Procedure expulsion" },
            { value: "violences", label: "Violences au sein du couple", pdf: "5. Violences couple" },
            { value: "rapprochement", label: "Rapprochement familial", pdf: "5. Rapprochement familial" },
            { value: "divorce", label: "Divorce / séparation", pdf: "5. Divorce" },
          ],
        },
      ],
    },
    {
      id: "logement-recherche",
      title: "Le logement que tu recherches",
      fields: [
        {
          id: "typeRecherche",
          label: "Tu cherches...",
          type: "single-choice",
          options: [
            { value: "appartement", label: "Un appartement", pdf: "5. Logement recherche - Appartement" },
            { value: "maison", label: "Une maison", pdf: "5. Logement recherche - Maison" },
            { value: "indifferent", label: "Peu importe", pdf: "5. Logement recherche - Indifferent" },
          ],
        },
        {
          id: "tailleRecherche",
          label: "Taille souhaitée",
          type: "single-choice",
          options: [
            { value: "f1", label: "Studio / F1", pdf: "5. Proprietaire logement recherche Studio F1" },
            { value: "f2", label: "F2", pdf: "5. Proprietaire logement recherche F2" },
            { value: "f3", label: "F3", pdf: "5. Proprietaire logement recherche F3" },
            { value: "f4", label: "F4", pdf: "5. Proprietaire logement recherche F4" },
            { value: "f5", label: "F5", pdf: "5. Proprietaire logement recherche F5" },
          ],
        },
        { id: "villeSouhaitee", label: "Ville souhaitée en priorité", type: "text", pdf: "5. Ville souhaitee 1" },
        { id: "villeSouhaiteeCP", label: "Code postal de cette ville", type: "text", pdf: "5. Ville souhaitee CP 1" },
      ],
    },
  ],
  fixedChecks: ["1.Premiere demande"],
  fixedDateField: null,
  fixedSingleDateField: { pdf: "6. Date de depot" },
  notCovered: [
    "Le détail de tes ressources (revenus par type et par personne) — section 4 du PDF",
    "La partie conjoint / codemandeur (si tu fais la demande à deux)",
    "Les colocataires et les personnes à charge (enfants...)",
    "Le complément handicap détaillé (si ça te concerne, en fin de PDF)",
    "Les villes souhaitées supplémentaires (le PDF permet d'en indiquer jusqu'à 17, un seul est pré-rempli)",
    "Ta signature : à faire à la main (ou électroniquement) avant l'envoi",
  ],
};

// Permet aux scripts Node (voir scripts/) de lire cette config sans navigateur.
if (typeof module !== "undefined") module.exports = LOGEMENT_WIZARD;
