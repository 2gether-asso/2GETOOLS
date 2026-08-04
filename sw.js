// Service worker : permet de consulter les ressources, démarches et checklists
// hors-ligne après une première visite. Stratégie :
// - fichiers du site (app shell, PDF Cerfa, pdf-lib) : cache d'abord, réseau en secours
// - Google Sheet (CSV) : réseau d'abord (données à jour), cache en secours si hors-ligne
//
// Pour publier une nouvelle version des fichiers mis en cache, incrémenter CACHE_NAME
// (sinon les visiteurs garderont une version en cache jusqu'à expiration naturelle).
const CACHE_NAME = "2gether-v1";

const APP_SHELL = [
  "index.html",
  "css/style.css",
  "manifest.json",
  "js/themes.js",
  "js/demarches.js",
  "js/mdph-form.js",
  "js/logement-form.js",
  "js/sante-solidaire-form.js",
  "js/pdf-assistant.js",
  "js/app.js",
  "js/vendor/pdf-lib.min.js",
  "assets/logo-2gether.png",
  "assets/icons/icon-16.png",
  "assets/icons/icon-32.png",
  "assets/icons/icon-180.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/cerfa/cerfa-15692-mdph.pdf",
  "assets/cerfa/cerfa-14069-logement-social.pdf",
  "assets/cerfa/cerfa-12504-css.pdf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Google Sheet : toujours essayer le réseau d'abord pour des données à jour,
  // mais garder une copie pour un usage hors-ligne dégradé.
  if (url.hostname.endsWith("google.com") || url.hostname.endsWith("googleusercontent.com")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Reste du site : cache d'abord (contenu statique versionné par CACHE_NAME).
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
