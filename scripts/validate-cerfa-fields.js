#!/usr/bin/env node
/**
 * Vérifie que chaque nom de champ référencé dans les assistants (js/*-form.js)
 * existe bien dans le vrai PDF officiel correspondant, avec le bon type
 * (case à cocher vs champ texte). Sert de garde-fou si le formulaire officiel
 * est mis à jour par l'administration (les noms de champs peuvent changer).
 *
 * Usage : node scripts/validate-cerfa-fields.js
 */
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const ROOT = path.join(__dirname, "..");

const WIZARDS = [
  require(path.join(ROOT, "js/mdph-form.js")),
  require(path.join(ROOT, "js/logement-form.js")),
  require(path.join(ROOT, "js/sante-solidaire-form.js")),
];

function collectReferencedFields(wizard) {
  const referenced = [];
  const collect = (name) => {
    if (name) referenced.push(name);
  };
  wizard.steps.forEach((step) => {
    step.fields.forEach((field) => {
      if (field.type === "text" || field.type === "date-combined") collect(field.pdf);
      else if (field.type === "date3") {
        collect(field.pdfJour);
        collect(field.pdfMois);
        collect(field.pdfAnnee);
      } else if (field.type === "postal5") field.pdf.forEach(collect);
      else if (field.type === "single-choice" || field.type === "multi-choice") {
        field.options.forEach((o) => collect(o.pdf));
      }
    });
  });
  (wizard.fixedChecks || []).forEach(collect);
  if (wizard.fixedDateField) {
    collect(wizard.fixedDateField.pdfJour);
    collect(wizard.fixedDateField.pdfMois);
    collect(wizard.fixedDateField.pdfAnnee);
  }
  if (wizard.fixedSingleDateField) collect(wizard.fixedSingleDateField.pdf);
  return referenced;
}

function fieldIsCheckboxRef(wizard, name) {
  const inOptions = wizard.steps.some((s) =>
    s.fields.some(
      (f) => (f.type === "single-choice" || f.type === "multi-choice") && f.options.some((o) => o.pdf === name)
    )
  );
  return inOptions || (wizard.fixedChecks || []).includes(name);
}

async function main() {
  let hasError = false;

  for (const wizard of WIZARDS) {
    const pdfPath = path.join(ROOT, wizard.cerfaFile);
    if (!fs.existsSync(pdfPath)) {
      console.error(`FAIL [${wizard.id}] PDF introuvable : ${wizard.cerfaFile}`);
      hasError = true;
      continue;
    }

    const bytes = fs.readFileSync(pdfPath);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = doc.getForm();
    const allNames = new Set(form.getFields().map((f) => f.getName()));
    const referenced = collectReferencedFields(wizard);

    const missing = referenced.filter((n) => !allNames.has(n));
    const wrongType = referenced.filter(
      (n) => allNames.has(n) && fieldIsCheckboxRef(wizard, n) && form.getField(n).constructor.name !== "PDFCheckBox"
    );

    if (missing.length || wrongType.length) {
      hasError = true;
      console.error(`FAIL [${wizard.id}] ${missing.length} champ(s) manquant(s), ${wrongType.length} type(s) incorrect(s)`);
      missing.forEach((m) => console.error(`  - manquant dans le PDF : ${JSON.stringify(m)}`));
      wrongType.forEach((m) => console.error(`  - type inattendu (pas une case à cocher) : ${JSON.stringify(m)}`));
    } else {
      console.log(`OK   [${wizard.id}] ${referenced.length} champs vérifiés contre ${wizard.cerfaFile}`);
    }
  }

  if (hasError) {
    console.error("\nUn ou plusieurs assistants référencent des champs introuvables/incorrects.");
    console.error("Le formulaire officiel a probablement changé — voir README.md pour la marche à suivre.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("ERREUR", err);
  process.exit(1);
});
