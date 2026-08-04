// URL d'export CSV du Google Sheet public (voir README.md pour la structure attendue).
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQA4wRnXoh-bjGzLPdDXByPlgN9bsDpwYFrhcIqOtKN7oWwm7iFWZZQbBNmvKUSXfZQn3kwq_jTH9dZ/pub?gid=0&single=true&output=csv";

const HEADERS = {
  nom: "Nom de la structure / Organisme",
  themes: "Thématiques principales",
  public: "Public cible",
  zone: "Échelle / Zone géographique",
  contacts: "Contacts",
  descriptif: "Descriptif & Modalités",
  // "Gestion interne" n'est JAMAIS affiché tel quel (usage interne à l'association :
  // référent, notes...). Seuls le statut et la date de vérification en sont extraits,
  // pour un petit badge de confiance sur la fiche — voir extractVerification().
  gestionInterne: "Gestion interne",
};

// Isole "Statut de vérification" et "Date de dernière vérification" du texte libre
// "Gestion interne", sans jamais exposer le reste (ex: contact référent interne).
function extractVerification(text) {
  if (!text) return { status: null, date: null };
  const statusMatch = text.match(/Statut de vérification\s*:\s*([^\n]+)/i);
  const dateMatch = text.match(/Date de dernière vérification\s*:\s*([^\n]+)/i);
  return {
    status: statusMatch ? statusMatch[1].trim() : null,
    date: dateMatch ? dateMatch[1].trim() : null,
  };
}

// ---------- Parseur CSV (RFC4180 : gère guillemets, virgules et retours à la ligne dans un champ) ----------
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // ignoré, le \n qui suit termine la ligne
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r[0] || "").trim() !== "");
}

// ---------- Matching flou des thématiques (accents/casse/synonymes tolérés) ----------
function normalize(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["de", "du", "des", "et", "la", "le", "les", "en", "a", "au", "aux", "vie"]);

// Découpe un champ libre séparé par virgules ("Tout public, Jeunes 15-25 ans, etc.")
// en tags individuels (thématiques, Public cible, Zone géographique...).
// Ignore les virgules à l'intérieur de parenthèses ("addictions (produits, jeux...)"
// reste un seul tag) et à l'intérieur de guillemets ("Genre, orientation & vie
// affective" utilisé pour désambiguïser une thématique qui contient elle-même une
// virgule) : une simple regex casserait ces deux cas sur du texte libre réel.
function splitTags(text) {
  const tokens = [];
  let current = "";
  let depth = 0;
  let inQuotes = false;
  for (const c of text || "") {
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === "(") depth++;
    if (!inQuotes && c === ")") depth = Math.max(0, depth - 1);
    if ((c === "," || c === ";") && !inQuotes && depth === 0) {
      tokens.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  tokens.push(current.trim());
  return tokens.filter(Boolean);
}

// Pour les puces de filtre uniquement (pas l'affichage ni la recherche) : un tag
// se terminant par une précision entre parenthèses ("Nationale (3114)") devient
// "Nationale" pour se regrouper avec les autres ressources nationales, plutôt que
// de rester une puce à usage unique.
function cleanFilterTag(tag) {
  return tag.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function matchTheme(token) {
  const normToken = normalize(token);
  if (!normToken) return null;

  let theme = THEMES.find((t) => normalize(t.label) === normToken);
  if (theme) return theme;

  theme = THEMES.find((t) => (t.aliases || []).some((a) => normalize(a) === normToken));
  if (theme) return theme;

  theme = THEMES.find((t) => {
    const normLabel = normalize(t.label);
    return normLabel.includes(normToken) || normToken.includes(normLabel);
  });
  if (theme) return theme;

  theme = THEMES.find((t) =>
    (t.aliases || []).some((a) => {
      const na = normalize(a);
      return na.includes(normToken) || normToken.includes(na);
    })
  );
  if (theme) return theme;

  const tokenWords = normToken.split(" ").filter((w) => w.length > 2 && !STOPWORDS.has(w));
  theme = THEMES.find((t) => {
    const labelWords = normalize(t.label).split(" ").filter((w) => w.length > 2 && !STOPWORDS.has(w));
    return tokenWords.some((w) => labelWords.includes(w));
  });
  return theme || null;
}

function themeById(id) {
  return THEMES.find((t) => t.id === id);
}

// ---------- Chargement + normalisation des ressources ----------
async function loadResources() {
  const res = await fetch(CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Réponse réseau invalide (" + res.status + ")");
  const text = await res.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim());
  const idx = Object.fromEntries(Object.entries(HEADERS).map(([key, label]) => [key, header.indexOf(label)]));

  const resources = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => !c || !c.trim())) continue;

    const nom = (r[idx.nom] || "").trim();
    // Ignore la ligne d'exemple/gabarit du Sheet ("Ex: Planning Familial 34...")
    if (!nom || /^ex\s*[:.]/i.test(nom)) continue;

    const rawThemes = splitTags(r[idx.themes] || "");
    const themeIds = new Set();
    rawThemes.forEach((t) => {
      const m = matchTheme(t);
      if (m) themeIds.add(m.id);
    });

    resources.push({
      nom,
      rawThemes,
      themeIds: [...themeIds],
      public: (r[idx.public] || "").trim(),
      zone: (r[idx.zone] || "").trim(),
      contacts: (r[idx.contacts] || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      descriptif: (r[idx.descriptif] || "").trim(),
      verification: extractVerification(r[idx.gestionInterne] || ""),
    });
  }
  return resources;
}

// ---------- État de l'application ----------
const state = {
  resources: [],
  loadError: null,
  quizAnswers: {}, // { questionId: Set(optionIndex) }
  currentQuestion: 0,
  browseActiveThemes: new Set(),
  browseActivePublics: new Set(),
  browseActiveZones: new Set(),
  browseMoreFiltersOpen: false,
  browseSearch: "",
  demarchesActiveThemes: new Set(),
  demarchesSearch: "",
  checklist: {}, // { demarcheId: { docIndex: true } }, persisté en localStorage
};

// ---------- Checklist des démarches (stockée uniquement dans le navigateur) ----------
const CHECKLIST_STORAGE_KEY = "2gether-checklist-v1";

function loadChecklist() {
  try {
    return JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY)) || {};
  } catch (err) {
    return {};
  }
}

function saveChecklist() {
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state.checklist));
  } catch (err) {
    // Stockage indisponible (navigation privée, quota...) : on continue sans persister.
  }
}

function isDocChecked(demarcheId, index) {
  return !!(state.checklist[demarcheId] && state.checklist[demarcheId][index]);
}

function toggleDoc(demarcheId, index) {
  if (!state.checklist[demarcheId]) state.checklist[demarcheId] = {};
  state.checklist[demarcheId][index] = !state.checklist[demarcheId][index];
  saveChecklist();
}

function countChecked(demarche) {
  return demarche.documents.filter((_, i) => isDocChecked(demarche.id, i)).length;
}

function resetChecklist(demarcheId) {
  delete state.checklist[demarcheId];
  saveChecklist();
}

// ---------- Utilitaires de rendu ----------
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c === null || c === undefined) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

// Reconnaît une ligne de contact qu'elle soit "brute" (juste une URL/un email/
// un téléphone) ou préfixée d'un label ("Site Web : https://...", "Discord : ...").
function linkifyContact(line) {
  const emailRe = /^[\w.+-]+@[\w-]+\.[a-z.]{2,}$/i;
  const urlRe = /^(https?:\/\/|www\.)\S+$/i;
  const phoneRe = /^(\+?\d[\d .-]{5,}\d)$/;

  const detect = (value) => {
    if (emailRe.test(value)) return "email";
    if (urlRe.test(value)) return "url";
    if (phoneRe.test(value)) return "phone";
    return null;
  };

  const build = (value, kind) => {
    if (kind === "email") return el("a", { href: "mailto:" + value }, "✉️ " + value);
    if (kind === "url") {
      const href = value.startsWith("http") ? value : "https://" + value;
      return el("a", { href, target: "_blank", rel: "noopener" }, "🔗 " + value);
    }
    return el("a", { href: "tel:" + value.replace(/[ .-]/g, "") }, "📞 " + value);
  };

  const trimmed = line.trim();
  const wholeKind = detect(trimmed);
  if (wholeKind) return build(trimmed, wholeKind);

  const labelMatch = line.match(/^(.{1,40}?):\s*(\S.*)$/);
  if (labelMatch) {
    const label = labelMatch[1].trim();
    const value = labelMatch[2].trim();
    const kind = detect(value);
    if (kind) return el("span", {}, [label + " : ", build(value, kind)]);
  }

  return el("span", {}, "📍 " + line);
}

// Rend le texte libre "praticable" : liens cliquables au fil du texte,
// et les lignes commençant par "-"/"•" deviennent une vraie liste.
// Les lignes de commentaire qui suivent une puce restent rattachées à
// celle-ci (cas fréquent : "- Titre : url" puis une ligne d'explication).
function linkifyText(line) {
  const urlRe = /(https?:\/\/[^\s]+)/g;
  const nodes = [];
  let lastIndex = 0;
  let match;
  while ((match = urlRe.exec(line))) {
    if (match.index > lastIndex) nodes.push(document.createTextNode(line.slice(lastIndex, match.index)));
    let url = match[0];
    const trailing = url.match(/[.,;:!?)\]]+$/);
    let trailingPunct = "";
    if (trailing) {
      trailingPunct = trailing[0];
      url = url.slice(0, -trailingPunct.length);
    }
    nodes.push(el("a", { href: url, target: "_blank", rel: "noopener" }, url));
    if (trailingPunct) nodes.push(document.createTextNode(trailingPunct));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) nodes.push(document.createTextNode(line.slice(lastIndex)));
  return nodes.length ? nodes : [document.createTextNode(line)];
}

function renderRichText(text) {
  const frag = document.createDocumentFragment();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let currentList = null;
  let currentLi = null;

  lines.forEach((line) => {
    const isBullet = /^[-•]\s+/.test(line);
    if (isBullet) {
      const content = line.replace(/^[-•]\s+/, "");
      if (!currentList) {
        currentList = el("ul", { class: "rich-list" });
        frag.appendChild(currentList);
      }
      currentLi = el("li", {}, linkifyText(content));
      currentList.appendChild(currentLi);
    } else if (currentLi) {
      // Ligne de commentaire rattachée à la puce précédente.
      currentLi.appendChild(el("br"));
      linkifyText(line).forEach((n) => currentLi.appendChild(n));
    } else {
      currentList = null;
      currentLi = null;
      frag.appendChild(el("p", {}, linkifyText(line)));
    }
  });
  return frag;
}

const LONG_TEXT_THRESHOLD = 320;

function descriptifBlock(text) {
  const isLong = text.length > LONG_TEXT_THRESHOLD;
  const wrap = el("div", { class: "descriptif" + (isLong ? " collapsed" : "") });
  wrap.appendChild(renderRichText(text));

  const fragChildren = [wrap];
  if (isLong) {
    const toggle = el(
      "button",
      {
        type: "button",
        class: "descriptif-toggle",
        "aria-expanded": "false",
        onclick: () => {
          const collapsed = wrap.classList.toggle("collapsed");
          toggle.textContent = collapsed ? "Lire plus ▾" : "Réduire ▴";
          toggle.setAttribute("aria-expanded", String(!collapsed));
        },
      },
      "Lire plus ▾"
    );
    fragChildren.push(toggle);
  }
  return fragChildren;
}

function themeChip(id) {
  const t = themeById(id);
  if (!t) return null;
  return el("span", { class: "chip" }, `${t.icon} ${t.label}`);
}

function verificationBadge(verification) {
  const status = (verification && verification.status) || "";
  if (!status) return null;
  const dateSuffix = verification.date ? ` le ${verification.date}` : "";
  if (/vérifié/i.test(status) && !/à\s*(re)?v[ée]rifier|mettre à jour/i.test(status)) {
    return el("span", { class: "chip chip-verified" }, `✅ Vérifié${dateSuffix}`);
  }
  return el("span", { class: "chip chip-unverified" }, `🕓 ${status}`);
}

function resourceCard(resource) {
  const children = [el("h3", {}, resource.nom)];

  const badge = verificationBadge(resource.verification);
  if (badge) children.push(badge);

  const chipsWrap = el("div", { class: "chips" });
  if (resource.themeIds.length) {
    resource.themeIds.forEach((id) => chipsWrap.appendChild(themeChip(id)));
  } else if (resource.rawThemes.length) {
    resource.rawThemes.forEach((t) => chipsWrap.appendChild(el("span", { class: "chip chip-muted" }, t)));
  }
  if (chipsWrap.children.length) children.push(chipsWrap);

  if (resource.descriptif) children.push(...descriptifBlock(resource.descriptif));
  if (resource.public) children.push(el("p", { class: "meta" }, [el("strong", {}, "Public : "), resource.public]));
  if (resource.zone) children.push(el("p", { class: "meta" }, [el("strong", {}, "Zone : "), resource.zone]));

  if (resource.contacts.length) {
    const ul = el(
      "ul",
      { class: "contacts" },
      resource.contacts.map((line) => el("li", {}, linkifyContact(line)))
    );
    children.push(ul);
  }

  return el("article", { class: "resource-card" }, children);
}

function demarcheCard(demarche) {
  const children = [el("h3", {}, demarche.title)];

  const chipsWrap = el("div", { class: "chips" });
  demarche.themeIds.forEach((id) => {
    const chip = themeChip(id);
    if (chip) chipsWrap.appendChild(chip);
  });
  if (chipsWrap.children.length) children.push(chipsWrap);

  if (demarche.summary) children.push(el("p", { class: "meta" }, demarche.summary));

  const wizardConfig = WIZARD_REGISTRY[demarche.wizard];
  if (wizardConfig) {
    children.push(
      el(
        "button",
        {
          type: "button",
          class: "btn btn-primary wizard-cta",
          onclick: () => {
            startWizard(wizardConfig);
            showView("view-cerfa-wizard");
          },
        },
        "✨ Remplir mon dossier avec l'assistant"
      )
    );
  }

  if (demarche.officialLink) {
    children.push(
      el(
        "a",
        { class: "btn btn-ghost official-link", href: demarche.officialLink.url, target: "_blank", rel: "noopener" },
        `${demarche.officialLink.label} ↗`
      )
    );
  }

  const total = demarche.documents.length;
  const progressFill = el("div", { class: "progress-fill" });
  const progressLabel = el("p", { class: "checklist-label" });
  const resetBtn = el(
    "button",
    {
      type: "button",
      class: "checklist-reset",
      onclick: () => {
        if (countChecked(demarche) === 0) return;
        if (!window.confirm("Réinitialiser ta checklist pour cette démarche ?")) return;
        resetChecklist(demarche.id);
        list.querySelectorAll("input[type=checkbox]").forEach((cb) => {
          cb.checked = false;
          cb.closest("li").classList.remove("checked");
        });
        updateProgress();
      },
    },
    "↺ Réinitialiser"
  );
  const updateProgress = () => {
    const count = countChecked(demarche);
    progressFill.style.width = total ? `${(count / total) * 100}%` : "0%";
    progressLabel.textContent = `${count} / ${total} documents prêts`;
    resetBtn.hidden = count === 0;
  };
  updateProgress();
  children.push(
    el("div", { class: "checklist-progress" }, [
      el("div", { class: "progress-track" }, progressFill),
      el("div", { class: "checklist-progress-row" }, [progressLabel, resetBtn]),
    ])
  );

  const list = el("ul", { class: "checklist" });
  demarche.documents.forEach((doc, i) => {
    const checkboxId = `check-${demarche.id}-${i}`;
    const checkbox = el("input", { type: "checkbox", id: checkboxId });
    checkbox.checked = isDocChecked(demarche.id, i);
    const label = el("label", { for: checkboxId }, doc);
    const li = el("li", { class: checkbox.checked ? "checked" : "" }, [checkbox, label]);
    checkbox.addEventListener("change", () => {
      toggleDoc(demarche.id, i);
      li.classList.toggle("checked", isDocChecked(demarche.id, i));
      updateProgress();
    });
    list.appendChild(li);
  });
  children.push(list);

  if (demarche.tips) children.push(el("p", { class: "tips" }, `💡 ${demarche.tips}`));

  return el("article", { class: "resource-card demarche-card" }, children);
}

// ---------- Navigation entre vues ----------
function showView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === id));
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === id));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

// ---------- Quiz ----------
function resetQuiz() {
  state.quizAnswers = {};
  state.currentQuestion = 0;
}

function renderQuiz() {
  const container = document.getElementById("quiz-question");
  container.innerHTML = "";

  const q = QUESTIONS[state.currentQuestion];
  const selected = state.quizAnswers[q.id] || new Set();

  document.getElementById("quiz-progress-bar").style.width = `${(state.currentQuestion / QUESTIONS.length) * 100}%`;
  document.getElementById("quiz-step").textContent = `Question ${state.currentQuestion + 1} / ${QUESTIONS.length}`;

  container.appendChild(el("h2", {}, q.text));
  if (q.hint) container.appendChild(el("p", { class: "hint" }, q.hint));

  const optsWrap = el("div", { class: "options" });
  q.options.forEach((opt, i) => {
    const isActive = selected.has(i);
    const btn = el(
      "button",
      {
        type: "button",
        class: "option-btn" + (isActive ? " active" : ""),
        "aria-pressed": String(isActive),
        onclick: () => {
          if (!state.quizAnswers[q.id]) state.quizAnswers[q.id] = new Set();
          const set = state.quizAnswers[q.id];
          set.has(i) ? set.delete(i) : set.add(i);
          renderQuiz();
        },
      },
      opt.label
    );
    optsWrap.appendChild(btn);
  });
  container.appendChild(optsWrap);

  document.getElementById("quiz-back").disabled = state.currentQuestion === 0;
  const isLast = state.currentQuestion === QUESTIONS.length - 1;
  const nextBtn = document.getElementById("quiz-next");
  nextBtn.textContent = isLast ? "Voir mes résultats" : "Suivant";
}

function computeThemeScores() {
  const scores = {};
  Object.entries(state.quizAnswers).forEach(([qId, indices]) => {
    const q = QUESTIONS.find((x) => x.id === qId);
    if (!q) return;
    indices.forEach((i) => {
      (q.options[i].themeIds || []).forEach((tid) => {
        scores[tid] = (scores[tid] || 0) + 1;
      });
    });
  });
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({ id, score }));
}

function renderResults() {
  const wrap = document.getElementById("results-content");
  wrap.innerHTML = "";

  const ranked = computeThemeScores();

  if (!ranked.length) {
    wrap.appendChild(
      el("div", { class: "empty-state" }, [
        el("p", {}, "Tu n'as coché aucune situation particulière : tout va bien de ce côté-là !"),
        el("p", {}, "Tu peux quand même parcourir toutes les ressources de l'association ci-dessous."),
      ])
    );
    renderResourceList(wrap, state.resources);
    return;
  }

  ranked.forEach(({ id }) => {
    const theme = themeById(id);
    if (!theme) return;
    const matches = state.resources.filter((r) => r.themeIds.includes(id));

    const section = el("section", { class: "results-theme" }, [
      el("h2", {}, `${theme.icon} ${theme.label}`),
    ]);

    if (matches.length) {
      const list = el("div", { class: "resource-list" });
      matches.forEach((r) => list.appendChild(resourceCard(r)));
      section.appendChild(list);
    } else {
      section.appendChild(
        el(
          "p",
          { class: "empty-state" },
          "Aucune ressource enregistrée pour cette thématique pour le moment. Contacte un référent 2GETHER pour en savoir plus."
        )
      );
    }

    const relatedDemarches = DEMARCHES.filter((d) => d.themeIds.includes(id));
    if (relatedDemarches.length) {
      const demarchesList = el("div", { class: "resource-list" });
      relatedDemarches.forEach((d) => demarchesList.appendChild(demarcheCard(d)));
      section.appendChild(
        el("div", { class: "related-demarches" }, [
          el("h3", { class: "related-demarches-title" }, "📋 Démarches liées"),
          demarchesList,
        ])
      );
    }

    wrap.appendChild(section);
  });
}

// ---------- Parcours libre ----------
function renderResourceList(container, resources) {
  if (!resources.length) {
    container.appendChild(el("p", { class: "empty-state" }, "Aucune ressource ne correspond à ta recherche."));
    return;
  }
  const list = el("div", { class: "resource-list" });
  resources.forEach((r) => list.appendChild(resourceCard(r)));
  container.appendChild(list);
}

// Groupe de puces à cocher/décocher générique (thématiques, public, zone...).
function renderFilterChipGroup(container, items, activeSet, getLabel, getKey, onToggle) {
  items.forEach((item) => {
    const key = getKey(item);
    const active = activeSet.has(key);
    container.appendChild(
      el(
        "button",
        {
          type: "button",
          class: "filter-chip" + (active ? " active" : ""),
          "aria-pressed": String(active),
          onclick: () => {
            active ? activeSet.delete(key) : activeSet.add(key);
            onToggle();
          },
        },
        getLabel(item)
      )
    );
  });
}

function renderBrowse() {
  const filterWrap = document.getElementById("browse-filters");
  filterWrap.innerHTML = "";
  renderFilterChipGroup(filterWrap, THEMES, state.browseActiveThemes, (t) => `${t.icon} ${t.label}`, (t) => t.id, renderBrowse);

  // Tags trop longs (>42 caractères) exclus des puces : une description entière
  // n'est pas une catégorie réutilisable, elle reste néanmoins cherchable via la
  // barre de recherche (qui, elle, regarde le texte complet).
  const MAX_TAG_LENGTH = 42;
  const resourceTags = (field) =>
    state.resources.flatMap((r) => splitTags(r[field]).map(cleanFilterTag)).filter((t) => t && t.length <= MAX_TAG_LENGTH);
  const uniquePublics = [...new Set(resourceTags("public"))].sort((a, b) => a.localeCompare(b, "fr"));
  const uniqueZones = [...new Set(resourceTags("zone"))].sort((a, b) => a.localeCompare(b, "fr"));

  const hasActiveSecondaryFilters = state.browseActivePublics.size > 0 || state.browseActiveZones.size > 0;
  const showSecondaryFilters = state.browseMoreFiltersOpen || hasActiveSecondaryFilters;

  if (uniquePublics.length || uniqueZones.length) {
    filterWrap.appendChild(
      el(
        "button",
        {
          type: "button",
          class: "more-filters-toggle",
          "aria-expanded": String(showSecondaryFilters),
          onclick: () => {
            state.browseMoreFiltersOpen = !state.browseMoreFiltersOpen;
            renderBrowse();
          },
        },
        showSecondaryFilters ? "▴ Moins de filtres" : "▾ Filtrer aussi par public / zone"
      )
    );
  }

  if (showSecondaryFilters) {
    if (uniquePublics.length) {
      filterWrap.appendChild(el("p", { class: "filters-group-label" }, "Public :"));
      const row = el("div", { class: "filters" });
      renderFilterChipGroup(row, uniquePublics, state.browseActivePublics, (t) => t, (t) => t, renderBrowse);
      filterWrap.appendChild(row);
    }
    if (uniqueZones.length) {
      filterWrap.appendChild(el("p", { class: "filters-group-label" }, "Zone :"));
      const row = el("div", { class: "filters" });
      renderFilterChipGroup(row, uniqueZones, state.browseActiveZones, (t) => t, (t) => t, renderBrowse);
      filterWrap.appendChild(row);
    }
  }

  let filtered = state.resources;
  if (state.browseActiveThemes.size) {
    filtered = filtered.filter((r) => r.themeIds.some((id) => state.browseActiveThemes.has(id)));
  }
  if (state.browseActivePublics.size) {
    filtered = filtered.filter((r) => splitTags(r.public).map(cleanFilterTag).some((p) => state.browseActivePublics.has(p)));
  }
  if (state.browseActiveZones.size) {
    filtered = filtered.filter((r) => splitTags(r.zone).map(cleanFilterTag).some((z) => state.browseActiveZones.has(z)));
  }
  if (state.browseSearch.trim()) {
    const q = normalize(state.browseSearch);
    filtered = filtered.filter((r) => normalize(r.nom + " " + r.descriptif + " " + r.public + " " + r.zone).includes(q));
  }

  const results = document.getElementById("browse-results");
  results.innerHTML = "";
  renderResourceList(results, filtered);
}

// ---------- Démarches administratives ----------
function renderDemarches() {
  const filterWrap = document.getElementById("demarches-filters");
  filterWrap.innerHTML = "";
  renderFilterChipGroup(filterWrap, THEMES, state.demarchesActiveThemes, (t) => `${t.icon} ${t.label}`, (t) => t.id, renderDemarches);

  let filtered = DEMARCHES;
  if (state.demarchesActiveThemes.size) {
    filtered = filtered.filter((d) => d.themeIds.some((id) => state.demarchesActiveThemes.has(id)));
  }
  if (state.demarchesSearch.trim()) {
    const q = normalize(state.demarchesSearch);
    filtered = filtered.filter((d) => normalize(d.title + " " + d.summary).includes(q));
  }

  const results = document.getElementById("demarches-results");
  results.innerHTML = "";
  if (!filtered.length) {
    results.appendChild(el("p", { class: "empty-state" }, "Aucune démarche ne correspond à ce filtre."));
    return;
  }
  const list = el("div", { class: "resource-list" });
  filtered.forEach((d) => list.appendChild(demarcheCard(d)));
  results.appendChild(list);
}

// ---------- Initialisation ----------
// Fonctionne indépendamment du chargement des ressources (réseau lent/absent
// ne doit jamais empêcher de quitter le site rapidement).
function setupSafetyControls() {
  const quickExit = () => window.location.replace("https://www.google.com");
  document.getElementById("quick-exit").addEventListener("click", quickExit);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") quickExit();
  });
}

async function init() {
  setupSafetyControls();
  document.getElementById("app-year").textContent = new Date().getFullYear();
  state.checklist = loadChecklist();

  try {
    state.resources = await loadResources();
  } catch (err) {
    state.loadError = err;
  }

  const loadingBanner = document.getElementById("loading-banner");
  if (loadingBanner) loadingBanner.remove();

  if (state.loadError) {
    document.getElementById("global-error").hidden = false;
  } else if (!state.resources.length) {
    document.getElementById("global-empty").hidden = false;
  }

  document.getElementById("start-quiz").addEventListener("click", () => {
    resetQuiz();
    renderQuiz();
    showView("view-quiz");
  });

  document.getElementById("go-browse-from-intro").addEventListener("click", () => {
    renderBrowse();
    showView("view-browse");
  });

  document.getElementById("go-demarches-from-intro").addEventListener("click", () => {
    renderDemarches();
    showView("view-demarches");
  });

  document.querySelectorAll(".nav-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const target = btn.dataset.view;
      if (target === "view-browse") renderBrowse();
      if (target === "view-demarches") renderDemarches();
      showView(target);
    })
  );

  document.getElementById("quiz-back").addEventListener("click", () => {
    if (state.currentQuestion > 0) {
      state.currentQuestion--;
      renderQuiz();
    }
  });

  document.getElementById("quiz-next").addEventListener("click", () => {
    if (state.currentQuestion < QUESTIONS.length - 1) {
      state.currentQuestion++;
      renderQuiz();
    } else {
      document.getElementById("quiz-progress-bar").style.width = "100%";
      renderResults();
      showView("view-results");
    }
  });

  document.getElementById("retake-quiz").addEventListener("click", () => {
    resetQuiz();
    renderQuiz();
    showView("view-quiz");
  });

  document.getElementById("go-browse-from-results").addEventListener("click", () => {
    renderBrowse();
    showView("view-browse");
  });

  document.querySelectorAll(".back-to-intro").forEach((btn) =>
    btn.addEventListener("click", () => showView("view-intro"))
  );

  document.getElementById("wizard-quit").addEventListener("click", () => {
    const hasAnswers = wizardState.wizard && Object.keys(wizardState.answers).length > 0;
    if (hasAnswers) {
      const leave = window.confirm(
        "Quitter l'assistant ? Ta progression est sauvegardée sur cet appareil, tu pourras reprendre plus tard."
      );
      if (!leave) return;
    }
    showView("view-intro");
  });

  document.getElementById("wizard-back").addEventListener("click", () => {
    if (wizardState.currentStep > 0) {
      wizardState.currentStep--;
      renderWizardStep();
    }
  });

  document.getElementById("wizard-next").addEventListener("click", () => {
    if (wizardState.currentStep < wizardState.wizard.steps.length) {
      wizardState.currentStep++;
      renderWizardStep();
    }
  });

  document.getElementById("browse-search").addEventListener("input", (e) => {
    state.browseSearch = e.target.value;
    renderBrowse();
  });

  document.getElementById("demarches-search").addEventListener("input", (e) => {
    state.demarchesSearch = e.target.value;
    renderDemarches();
  });
}

document.addEventListener("DOMContentLoaded", init);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // Hors-ligne indisponible (navigation privée, navigateur trop ancien...) :
      // le site continue de fonctionner normalement en ligne.
    });
  });
}
