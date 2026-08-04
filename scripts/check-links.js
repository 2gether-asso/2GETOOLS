#!/usr/bin/env node
/**
 * Vérifie que les liens officiels des démarches (js/demarches.js) répondent
 * toujours (pas de 404/500). N'empêche pas de détecter un contenu déplacé sur
 * une page qui répond 200 — juste les liens franchement morts.
 *
 * Usage : node scripts/check-links.js
 */
const path = require("path");

const DEMARCHES = require(path.join(__dirname, "..", "js/demarches.js"));

async function checkUrl(url) {
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!res.ok && [403, 405, 501].includes(res.status)) {
      // Certains serveurs refusent HEAD : on retente en GET avant de conclure.
      res = await fetch(url, { method: "GET", redirect: "follow" });
    }
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: null, error: err.message };
  }
}

async function main() {
  const links = DEMARCHES.filter((d) => d.officialLink && d.officialLink.url).map((d) => ({
    title: d.title,
    url: d.officialLink.url,
  }));

  console.log(`Vérification de ${links.length} liens officiels...\n`);
  let hasError = false;

  for (const { title, url } of links) {
    const result = await checkUrl(url);
    if (result.ok) {
      console.log(`OK   ${title} -> ${url}`);
    } else {
      hasError = true;
      console.error(`FAIL ${title} -> ${url} (status=${result.status ?? "?"}${result.error ? ", " + result.error : ""})`);
    }
  }

  if (hasError) {
    console.error("\nAu moins un lien officiel semble mort — à vérifier et corriger dans js/demarches.js.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("ERREUR", err);
  process.exit(1);
});
