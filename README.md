# 2GETHER — Site ressources

Site statique (HTML/CSS/JS, sans build) pour aider les membres de l'association
**2GETHER** à trouver rapidement les structures et ressources adaptées à leur
situation, via un questionnaire en 2 étapes :

1. **Questionnaire** : quelques questions à choix multiples sur la situation de la personne.
2. **Résultats** : les ressources du tableau partagé, classées par thématique la plus pertinente,
   avec les **démarches administratives liées** (documents à préparer, lien officiel).

Le site propose aussi une vue **"Démarches administratives"** indépendante, accessible
depuis la navigation, pour parcourir toutes les démarches et cocher au fur et à mesure
les documents déjà préparés.

Les ressources affichées viennent d'un **Google Sheet publié en CSV**, rechargé à
chaque visite du site — pas besoin de republier le site pour ajouter une ressource.
Les démarches administratives, elles, sont définies directement dans le code
(`js/demarches.js`) : leur contenu nécessite plus de rigueur qu'une simple liste
d'annuaire, donc elles ne passent pas par le Sheet.

Aucune réponse au questionnaire n'est enregistrée ni envoyée où que ce soit : tout se
passe dans le navigateur de la personne, y compris la checklist des documents cochés et
la progression en cours d'un assistant Cerfa (stockées en `localStorage`, jamais transmises).

Le site fonctionne comme une petite application installable (PWA) : une fois visité une
première fois, il reste consultable hors-ligne (ressources déjà chargées, démarches,
checklists, assistants Cerfa) grâce à un service worker (`sw.js`).

Une barre toujours visible en haut de page donne un accès rapide aux numéros d'urgence et
un bouton "Quitter rapidement" (ou la touche <kbd>Échap</kbd>) qui quitte le site
instantanément — pertinent vu les thématiques violences/harcèlement traitées par le site.

## Structure du projet

```
index.html                  page unique (accueil / quiz / résultats / ressources / démarches / assistant Cerfa)
css/style.css                charte graphique (dégradé du logo 2GETHER)
js/themes.js                 taxonomie des thématiques + questions du quiz (à éditer pour faire évoluer le quiz)
js/demarches.js              démarches administratives + documents à préparer par démarche
js/pdf-assistant.js          moteur générique du parcours simplifié → PDF Cerfa rempli (pdf-lib)
js/mdph-form.js              parcours simplifié + mapping des champs du Cerfa MDPH (15692*01)
js/logement-form.js          parcours simplifié + mapping du Cerfa Demande de logement social (14069*05)
js/sante-solidaire-form.js   parcours simplifié + mapping du Cerfa Complémentaire santé solidaire (12504*13)
js/vendor/pdf-lib.min.js     librairie de remplissage de PDF, vendue en local (pas de build, pas de CDN)
js/app.js                    chargement du CSV, matching, logique de navigation, checklist locale
assets/cerfa/                PDF officiels des Cerfa (téléchargés depuis formulaires.service-public.fr)
assets/icons/                icônes carrées (favicon, PWA) générées depuis le logo
assets/                      logo
sw.js                        service worker (cache pour la consultation hors-ligne)
manifest.json                métadonnées PWA (installation sur téléphone)
scripts/                     outillage Node (CI) — voir "Vérifications automatiques"
```

## Assistants de remplissage de Cerfa

Pour certaines démarches, le site propose un assistant : un parcours en langage simple qui
remplit directement le vrai formulaire officiel et le propose au téléchargement —
**entièrement dans le navigateur**, via la librairie [pdf-lib](https://pdf-lib.js.org/)
vendue en local dans `js/vendor/`. Rien n'est envoyé à un serveur, ce qui compte
particulièrement vu la sensibilité des informations (handicap, ressources, situation
familiale).

Trois assistants sont disponibles aujourd'hui :

| Démarche | Cerfa | Champs | Fichier de mapping |
|---|---|---|---|
| Dossier MDPH | 15692*01 | 639 | `js/mdph-form.js` |
| Demande de logement social | 14069*05 | 447 | `js/logement-form.js` |
| Complémentaire santé solidaire | 12504*13 | 218 | `js/sante-solidaire-form.js` |

D'autres démarches du catalogue (RSA, ordonnance de protection, carte d'identité,
inscription France Travail...) n'ont **pas** d'assistant : soit elles n'ont plus de Cerfa
téléchargeable (démarche désormais en ligne uniquement), soit le PDF officiel n'a pas de
champs remplissables (formulaire "plat", à remplir à la main). Pas la peine de re-tester
ces cas sans nouvelle info — c'est un fait du formulaire officiel, pas une limite du site.

**Portée volontairement limitée** ("cas simple") sur les trois : une personne seule qui fait
sa première demande pour elle-même. Selon le formulaire, les sections conjoint/codemandeur,
personnes à charge, colocataires, historique professionnel détaillé, tableaux de
remboursement de frais ne sont pas couvertes — la personne les complète à la main sur le PDF
généré si elles la concernent (chaque assistant liste ce qui n'est pas couvert avant le
téléchargement). La signature n'est jamais pré-remplie : elle doit toujours être apposée par
la personne elle-même avant l'envoi.

Chaque champ de chaque mapping a été vérifié individuellement contre le vrai PDF (nom exact
+ position sur la page, et pour les champs date/code postal, le format attendu — certains
champs combinés type "JJMMAAAA" ont une longueur maximale stricte) avant d'être ajouté — ne
pas ajouter un champ sans faire cette vérification, une erreur de mapping sur un vrai dossier
a un vrai coût pour la personne qui l'envoie. Le Cerfa Complémentaire santé solidaire a des
noms de champs très abrégés et peu lisibles (`CP`, `AID1`...) : ils ont été identifiés en
croisant leur position avec le texte imprimé juste à côté dans le PDF, pas devinés depuis le
nom du champ — voir `js/sante-solidaire-form.js` pour le détail.

**Pour ajouter un assistant sur une autre démarche** :
1. Trouver le Cerfa sur `formulaires.service-public.fr` (chercher `cerfa_XXXXX.do` dans le
   code source de la page du formulaire) et le télécharger.
2. Vérifier qu'il a des champs remplissables : `PDFDocument.load(...).getForm().getFields()`
   avec pdf-lib. Si `getFields()` est vide, c'est un PDF plat — pas d'assistant possible.
3. Si les noms de champs ne sont pas clairs, croiser leur position (`widget.getRectangle()`)
   avec le texte de la page (ex. via `pdfjs-dist`) pour comprendre ce qu'ils représentent —
   ne jamais deviner à partir du seul nom du champ.
4. Créer un fichier `js/xxx-form.js` sur le modèle de `js/mdph-form.js`, en gardant la
   discipline du "cas simple" (ne pas essayer de couvrir tous les cas dès la première
   version).
5. Enregistrer le wizard dans `WIZARD_REGISTRY` (`js/pdf-assistant.js`), ajouter
   `wizard: "xxx"` sur la démarche correspondante (`js/demarches.js`), et charger le nouveau
   script dans `index.html`.
6. Valider avant de considérer que c'est fini : un script qui vérifie que chaque nom de champ
   référencé existe bien dans le PDF (voir historique du projet pour un exemple), puis un
   test en navigateur réel qui remplit le parcours, télécharge le PDF, et relit chaque valeur
   pour confirmer qu'elle est correcte.

## Vérifications automatiques (CI)

Le site lui-même ne nécessite aucun build, mais deux scripts Node (dans `scripts/`)
protègent contre deux risques réels : un mapping de champ Cerfa qui casse, ou un lien
officiel qui pourrit avec le temps. Ils tournent via GitHub Actions
(`.github/workflows/validate.yml`) à chaque push/PR et une fois par semaine, et sont
lançables en local :

```bash
npm install         # installe pdf-lib en devDependency, une seule fois
npm run validate:cerfa   # vérifie que chaque champ référencé existe dans le vrai PDF
npm run check:links      # vérifie que les liens officiels des démarches répondent encore
```

`check:links` a immédiatement trouvé un lien mort en conditions réelles la première fois
qu'il a tourné (page ameli.fr réorganisée) — ce n'est pas une vérification théorique.

## Mettre à jour les ressources (Google Sheet)

Le Sheet doit garder ces colonnes (dans n'importe quel ordre) :

| Colonne | Utilisation |
|---|---|
| `Nom de la structure / Organisme` | titre affiché |
| `Thématiques principales` | **clé du matching**, voir liste ci-dessous, séparer plusieurs thématiques par une virgule |
| `Public cible` | affiché sur la fiche |
| `Échelle / Zone géographique` | affiché sur la fiche |
| `Contacts` | une info par ligne (téléphone, site, email, adresse, horaires...) ; les emails/liens/téléphones sont détectés automatiquement et transformés en liens cliquables |
| `Descriptif & Modalités` | texte libre affiché sur la fiche |
| `Gestion interne` | **jamais affiché sur le site**, réservé à l'usage interne de l'association |

La première ligne de données du Sheet (celle qui commence par "Ex:") sert de
gabarit d'exemple et est automatiquement ignorée par le site.

Les colonnes "Thématiques principales", "Public cible" et "Échelle / Zone géographique"
acceptent plusieurs valeurs séparées par une virgule. Une virgule à l'intérieur d'une
parenthèse ("Personnes confrontées aux addictions (produits, jeux, écrans)") ou entre
guillemets ("Genre, orientation & vie affective" pour désambiguïser une thématique qui
contient elle-même une virgule) est gérée correctement et ne coupe pas la valeur en deux
— inutile de l'éviter, le site s'en sort. Ces trois colonnes alimentent aussi les filtres
"Ressources" (public/zone) : un tag trop long (>42 caractères) n'apparaît pas comme puce
de filtre (juste trop spécifique pour être une catégorie réutilisable) mais reste
cherchable via la barre de recherche.

### Thématiques reconnues

Pour que le matching avec le questionnaire fonctionne, utilise de préférence un
de ces libellés dans la colonne "Thématiques principales" (les accents/majuscules
ne sont pas sensibles, et quelques synonymes courants sont reconnus — voir
`js/themes.js` → `aliases`) :

- Santé mentale & bien-être
- Écoute & soutien psychologique
- Logement & hébergement
- Emploi, formation & insertion
- Aide financière & sociale
- Genre, orientation & vie affective
- Violences & harcèlement
- Addictions
- Droits & démarches
- Loisirs, sport & vie sociale
- Numérique & harcèlement en ligne
- Handicap & santé

Une ressource peut avoir plusieurs thématiques, séparées par une virgule.
Si une thématique tapée dans le Sheet ne correspond à aucune de la liste, la
ressource reste visible dans "Parcourir toutes les ressources" mais n'apparaîtra
pas automatiquement dans les résultats du questionnaire.

Pour ajouter/renommer une thématique ou changer les questions du quiz, tout se
passe dans `js/themes.js` — aucune autre modification n'est nécessaire.

## Ajouter/modifier une démarche administrative

Tout se passe dans `js/demarches.js` — chaque entrée de `DEMARCHES` a :
- `themeIds` : une ou plusieurs thématiques (id de `js/themes.js`), pour que la démarche
  apparaisse sous la bonne section dans les résultats du questionnaire ;
- `documents` : la liste des pièces généralement demandées, qui devient la checklist ;
- `officialLink` : le lien vers le formulaire/service officiel (toujours vérifier qu'il est à jour) ;
- `tips` (optionnel) : un conseil pratique.

⚠️ Le contenu (documents demandés, liens) est indicatif et a été rédigé sans expertise
juridique — à faire relire par un membre de l'association qui connaît bien ces démarches
avant publication, et à tenir à jour si les procédures changent.

La checklist cochée par chaque visiteur est stockée uniquement dans son navigateur
(`localStorage`), jamais envoyée nulle part — l'association ne peut pas la consulter.

## Développement local

Comme le site charge le CSV via `fetch`, il faut le servir via un petit serveur
local (ouvrir `index.html` directement avec `file://` bloque cette requête) :

```bash
# depuis le dossier du projet
python -m http.server 8080
# puis ouvrir http://localhost:8080
```

## Déploiement sur GitHub Pages

1. Pousser le contenu de ce dépôt sur la branche `main` de GitHub.
2. Dans **Settings → Pages**, choisir la branche `main` et le dossier `/ (root)`.
3. Le site est disponible à `https://<utilisateur>.github.io/<nom-du-repo>/`.

Aucune étape de build n'est nécessaire : les fichiers sont servis tels quels.

### ⚠️ À remplacer avant publication

Plusieurs éléments contiennent un texte `REMPLACER-PAR-...` en attendant l'URL réelle du
site une fois déployé (impossible à connaître à l'avance) :

- `sitemap.xml` : l'URL du site.
- `index.html` (pied de page) : les deux liens vers le site principal / les réseaux sociaux
  de 2GETHER.

Optionnel mais recommandé pour un partage correct sur WhatsApp/Instagram/Facebook :
- `index.html` (`<meta property="og:image">`) : actuellement une URL relative
  (`assets/icons/icon-512.png`), certains lecteurs de réseaux sociaux veulent une URL
  absolue — la remplacer par `https://<url-du-site>/assets/icons/icon-512.png` une fois
  déployé.
