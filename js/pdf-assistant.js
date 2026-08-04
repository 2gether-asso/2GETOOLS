// Moteur générique d'assistant de remplissage de Cerfa : rendu du parcours
// déclaré dans js/mdph-form.js, puis remplissage du vrai PDF avec pdf-lib,
// entièrement dans le navigateur (le PDF n'est jamais envoyé nulle part).

const wizardState = {
  wizard: null,
  currentStep: 0,
  answers: {}, // { fieldId: string | Set<string> }
};

// Associe le "wizard" déclaré sur une démarche (js/demarches.js) à sa config.
// Ajouter une entrée ici après avoir créé un nouveau fichier js/xxx-form.js.
const WIZARD_REGISTRY = {
  mdph: typeof MDPH_WIZARD !== "undefined" ? MDPH_WIZARD : null,
  logement: typeof LOGEMENT_WIZARD !== "undefined" ? LOGEMENT_WIZARD : null,
  "sante-solidaire": typeof SANTE_SOLIDAIRE_WIZARD !== "undefined" ? SANTE_SOLIDAIRE_WIZARD : null,
};

// pdf-lib (~500 Ko) n'est utile qu'à la génération du PDF : on ne le charge
// qu'à l'ouverture d'un assistant, pas sur toutes les pages du site.
let pdfLibLoadPromise = null;
function ensurePdfLibLoaded() {
  if (window.PDFLib) return Promise.resolve();
  if (!pdfLibLoadPromise) {
    pdfLibLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "js/vendor/pdf-lib.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Impossible de charger la librairie de remplissage de PDF."));
      document.head.appendChild(script);
    });
  }
  return pdfLibLoadPromise;
}

// ---------- Sauvegarde de la progression (reprendre plus tard) ----------
const WIZARD_PROGRESS_KEY = "2gether-wizard-progress-v1";

function loadWizardProgressStore() {
  try {
    return JSON.parse(localStorage.getItem(WIZARD_PROGRESS_KEY)) || {};
  } catch (err) {
    return {};
  }
}

function saveWizardProgress() {
  if (!wizardState.wizard) return;
  try {
    const store = loadWizardProgressStore();
    const serializable = {};
    Object.entries(wizardState.answers).forEach(([k, v]) => {
      serializable[k] = v instanceof Set ? { __set: true, values: [...v] } : v;
    });
    store[wizardState.wizard.id] = { currentStep: wizardState.currentStep, answers: serializable };
    localStorage.setItem(WIZARD_PROGRESS_KEY, JSON.stringify(store));
  } catch (err) {
    // Stockage indisponible (navigation privée, quota...) : on continue sans persister.
  }
}

function clearWizardProgress(wizardId) {
  try {
    const store = loadWizardProgressStore();
    delete store[wizardId];
    localStorage.setItem(WIZARD_PROGRESS_KEY, JSON.stringify(store));
  } catch (err) {
    // rien à faire
  }
}

function deserializeWizardAnswers(raw) {
  const answers = {};
  Object.entries(raw || {}).forEach(([k, v]) => {
    answers[k] = v && v.__set ? new Set(v.values) : v;
  });
  return answers;
}

function wizardFieldVisible(field) {
  if (!field.showIf) return true;
  const current = wizardState.answers[field.showIf.field];
  return current === field.showIf.equals;
}

// Les champs texte/date/code postal ne redéclenchent pas un rendu complet à
// chaque frappe (ça ferait perdre le focus) : on rafraîchit juste l'état du
// bouton "Suivant" après chaque saisie.
function updateWizardNextButton() {
  saveWizardProgress();
  const wizard = wizardState.wizard;
  if (wizardState.currentStep >= wizard.steps.length) return;
  const step = wizard.steps[wizardState.currentStep];
  document.getElementById("wizard-next").disabled = !wizardStepIsValid(step);
}

function renderWizardField(field) {
  const wrap = el("div", { class: "wizard-field" });
  const inputId = `field-${field.id}`;
  const labelId = `label-${field.id}`;
  const isDateType = field.type === "date3" || field.type === "date-combined";

  if (field.label && !isDateType) {
    const labelAttrs = { class: "wizard-field-label", id: labelId };
    if (field.type === "text" || field.type === "postal5") labelAttrs.for = inputId;
    wrap.appendChild(el("label", labelAttrs, field.label));
  }
  if (field.hint) wrap.appendChild(el("p", { class: "hint" }, field.hint));

  if (field.type === "text") {
    const input = el("input", { type: "text", id: inputId, class: "wizard-input" });
    input.value = wizardState.answers[field.id] || "";
    input.addEventListener("input", (e) => {
      wizardState.answers[field.id] = e.target.value;
      updateWizardNextButton();
    });
    wrap.appendChild(input);
  } else if (isDateType) {
    // "date3"/"date-combined" ont la même UI (3 champs jour/mois/année) ; seul le
    // remplissage du PDF diffère (voir generateWizardPdf).
    const row = el("div", { class: "wizard-date-row", role: "group" });
    if (field.label) row.setAttribute("aria-label", field.label);
    const parts = wizardState.answers[field.id] || {};
    [
      ["jour", "JJ", "Jour"],
      ["mois", "MM", "Mois"],
      ["annee", "AAAA", "Année"],
    ].forEach(([part, placeholder, a11yLabel]) => {
      const input = el("input", {
        type: "text",
        inputmode: "numeric",
        maxlength: part === "annee" ? "4" : "2",
        placeholder,
        "aria-label": a11yLabel,
        class: "wizard-input wizard-date-input",
      });
      input.value = parts[part] || "";
      input.addEventListener("input", (e) => {
        const current = wizardState.answers[field.id] || {};
        current[part] = e.target.value.replace(/\D/g, "");
        wizardState.answers[field.id] = current;
        updateWizardNextButton();
      });
      row.appendChild(input);
    });
    wrap.appendChild(row);
  } else if (field.type === "postal5") {
    const input = el("input", {
      type: "text",
      id: inputId,
      inputmode: "numeric",
      maxlength: "5",
      placeholder: "34000",
      class: "wizard-input",
    });
    input.value = wizardState.answers[field.id] || "";
    input.addEventListener("input", (e) => {
      wizardState.answers[field.id] = e.target.value.replace(/\D/g, "").slice(0, 5);
      updateWizardNextButton();
    });
    wrap.appendChild(input);
  } else if (field.type === "single-choice") {
    const optsWrap = el("div", { class: "options", role: "group" });
    if (field.label) optsWrap.setAttribute("aria-labelledby", labelId);
    field.options.forEach((opt) => {
      const isActive = wizardState.answers[field.id] === opt.value;
      optsWrap.appendChild(
        el(
          "button",
          {
            type: "button",
            class: "option-btn" + (isActive ? " active" : ""),
            "aria-pressed": String(isActive),
            onclick: () => {
              wizardState.answers[field.id] = opt.value;
              renderWizardStep();
            },
          },
          opt.label
        )
      );
    });
    wrap.appendChild(optsWrap);
  } else if (field.type === "multi-choice") {
    if (!wizardState.answers[field.id]) wizardState.answers[field.id] = new Set();
    const selected = wizardState.answers[field.id];
    const optsWrap = el("div", { class: "options", role: "group" });
    if (field.label) optsWrap.setAttribute("aria-labelledby", labelId);
    field.options.forEach((opt) => {
      const isActive = selected.has(opt.value);
      optsWrap.appendChild(
        el(
          "button",
          {
            type: "button",
            class: "option-btn" + (isActive ? " active" : ""),
            "aria-pressed": String(isActive),
            onclick: () => {
              selected.has(opt.value) ? selected.delete(opt.value) : selected.add(opt.value);
              renderWizardStep();
            },
          },
          opt.label
        )
      );
    });
    wrap.appendChild(optsWrap);
  }

  return wrap;
}

function wizardStepIsValid(step) {
  return step.fields.every((field) => {
    if (!field.required || !wizardFieldVisible(field)) return true;
    const value = wizardState.answers[field.id];
    return typeof value === "string" && value.trim() !== "";
  });
}

function renderWizardStep() {
  const wizard = wizardState.wizard;
  const isReview = wizardState.currentStep === wizard.steps.length;
  const container = document.getElementById("wizard-content");
  container.innerHTML = "";

  const totalSteps = wizard.steps.length + 1;
  document.getElementById("wizard-progress-bar").style.width = `${(wizardState.currentStep / totalSteps) * 100}%`;

  if (isReview) {
    document.getElementById("wizard-step-label").textContent = "Dernière étape";
    container.appendChild(el("h2", {}, "Vérifie et génère ton PDF"));
    container.appendChild(
      el(
        "p",
        { class: "hint" },
        "L'assistant va remplir le PDF officiel avec ce que tu as indiqué. Rien n'est envoyé nulle part : le fichier est généré directement sur ton appareil."
      )
    );
    container.appendChild(el("p", { class: "meta" }, [el("strong", {}, "Ce qui ne sera PAS rempli automatiquement :")]));
    container.appendChild(el("ul", { class: "rich-list" }, wizard.notCovered.map((t) => el("li", {}, t))));
    const genBtn = el(
      "button",
      {
        type: "button",
        class: "btn btn-primary",
        onclick: async () => {
          genBtn.disabled = true;
          genBtn.textContent = "Génération en cours…";
          try {
            await generateWizardPdf(wizard);
            genBtn.textContent = "PDF téléchargé ✓";
          } catch (err) {
            console.error(err);
            genBtn.textContent = "Générer mon PDF rempli";
            genBtn.disabled = false;
            document.getElementById("wizard-error").hidden = false;
          }
        },
      },
      "Générer mon PDF rempli"
    );
    container.appendChild(genBtn);
    document.getElementById("wizard-error").hidden = true;
  } else {
    const step = wizard.steps[wizardState.currentStep];
    document.getElementById("wizard-step-label").textContent = `Étape ${wizardState.currentStep + 1} / ${wizard.steps.length}`;
    container.appendChild(el("h2", {}, step.title));
    if (step.hint) container.appendChild(el("p", { class: "hint" }, step.hint));
    step.fields.filter(wizardFieldVisible).forEach((field) => container.appendChild(renderWizardField(field)));
  }

  document.getElementById("wizard-back").disabled = wizardState.currentStep === 0;
  const nextBtn = document.getElementById("wizard-next");
  nextBtn.hidden = isReview;
  if (!isReview) {
    const step = wizard.steps[wizardState.currentStep];
    nextBtn.disabled = !wizardStepIsValid(step);
  }

  saveWizardProgress();
}

function startWizard(wizard) {
  wizardState.wizard = wizard;
  ensurePdfLibLoaded().catch(() => {}); // démarre le chargement en tâche de fond, erreur gérée au moment de générer

  const saved = loadWizardProgressStore()[wizard.id];
  const hasSavedAnswers = saved && Object.keys(saved.answers || {}).length > 0;
  const resume = hasSavedAnswers && window.confirm("Une progression enregistrée existe pour cet assistant. Reprendre où tu en étais ?");

  if (resume) {
    wizardState.currentStep = saved.currentStep || 0;
    wizardState.answers = deserializeWizardAnswers(saved.answers);
  } else {
    wizardState.currentStep = 0;
    wizardState.answers = {};
    if (hasSavedAnswers) clearWizardProgress(wizard.id);
  }

  document.getElementById("wizard-title").textContent = wizard.title;
  document.getElementById("wizard-intro").textContent = wizard.intro;
  renderWizardStep();
}

function pad2(v) {
  return (v || "").toString().padStart(2, "0");
}

async function generateWizardPdf(wizard) {
  await ensurePdfLibLoaded();
  const { PDFDocument } = window.PDFLib;
  const bytes = await fetch(wizard.cerfaFile).then((r) => {
    if (!r.ok) throw new Error("Impossible de charger le PDF officiel (" + r.status + ")");
    return r.arrayBuffer();
  });
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();

  const setText = (fieldName, value) => {
    if (!value) return;
    try {
      form.getTextField(fieldName).setText(String(value));
    } catch (err) {
      console.warn("Champ PDF introuvable (texte) :", fieldName, err.message);
    }
  };
  const check = (fieldName) => {
    if (!fieldName) return;
    try {
      form.getCheckBox(fieldName).check();
    } catch (err) {
      console.warn("Champ PDF introuvable (case) :", fieldName, err.message);
    }
  };

  wizard.steps.forEach((step) => {
    step.fields.filter(wizardFieldVisible).forEach((field) => {
      const value = wizardState.answers[field.id];
      if (field.type === "text") {
        setText(field.pdf, value);
      } else if (field.type === "date3") {
        if (value && value.jour) setText(field.pdfJour, pad2(value.jour));
        if (value && value.mois) setText(field.pdfMois, pad2(value.mois));
        if (value && value.annee) setText(field.pdfAnnee, value.annee);
      } else if (field.type === "date-combined") {
        if (value && value.jour && value.mois && value.annee) {
          setText(field.pdf, `${pad2(value.jour)}${pad2(value.mois)}${value.annee}`);
        }
      } else if (field.type === "postal5") {
        const digits = (value || "").padEnd(5, " ").split("");
        field.pdf.forEach((fieldName, i) => {
          if (digits[i] && digits[i] !== " ") setText(fieldName, digits[i]);
        });
      } else if (field.type === "single-choice") {
        const opt = field.options.find((o) => o.value === value);
        if (opt && opt.pdf) check(opt.pdf);
      } else if (field.type === "multi-choice") {
        const selected = value || new Set();
        field.options.forEach((opt) => {
          if (selected.has(opt.value) && opt.pdf) check(opt.pdf);
        });
      }
    });
  });

  (wizard.fixedChecks || []).forEach(check);
  const today = new Date();
  if (wizard.fixedDateField) {
    setText(wizard.fixedDateField.pdfJour, pad2(today.getDate()));
    setText(wizard.fixedDateField.pdfMois, pad2(today.getMonth() + 1));
    setText(wizard.fixedDateField.pdfAnnee, String(today.getFullYear()));
  }
  if (wizard.fixedSingleDateField) {
    setText(wizard.fixedSingleDateField.pdf, `${pad2(today.getDate())}${pad2(today.getMonth() + 1)}${today.getFullYear()}`);
  }

  const filledBytes = await doc.save();
  const blob = new Blob([filledBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = wizard.downloadName || wizard.id + "-pre-rempli.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
