# Web Sémantique — Exercices & pièges

Application web statique (HTML/CSS/JS vanilla, sans build) pour préparer l'examen
« Web Sémantique » (Master BD2C, Université Hassan II) en **résolvant des exercices**,
pas en relisant des réponses.

## La méthode

Chaque exercice est un **micro-problème construit autour d'un piège** tiré du cours
ou des examens réels 2020/2025 — jamais une simple question de cours. Le flux :

1. **Résoudre** — on écrit sa réponse (textarea) avant de révéler quoi que ce soit ;
2. **Révéler** — le corrigé s'affiche sous la réponse : résultat, **le piège**,
   **règle à retenir**, et une **checklist de correction** pour les exercices d'écriture ;
3. **S'auto-évaluer** honnêtement — « Je savais » / « À revoir » (sauvegardé en `localStorage`).

- 41 exercices sur 7 thèmes : XML & DTD, XML Schema, XPath, XSLT, XQuery,
  JSON & JSON Schema, RDF/RDFS/OWL.
- Deux types : **à prédire** (donner le résultat / valide ou pas / trouver l'erreur)
  et **à écrire** (produire du code : DTD, XSD, XPath, XSLT, JSON Schema…).
- Trois niveaux affichés en badge (warm-up / medium / hard) ; dans un thème,
  les exercices progressent du plus simple au plus piégeux.
- Filtrage par thème, ordre aléatoire optionnel, raccourcis clavier
  (Espace = révéler, 1 = à revoir, 2 = je savais, ←/→ = naviguer).

Les données vivent dans `data/exercises.json` (un objet par exercice :
`id`, `topic`, `topicLabel`, `level`, `type`, `title`, `prompt`, `correction`,
prompt/correction en Markdown).

## Développement local

Comme `app.js` charge `data/exercises.json` via `fetch()`, il faut servir les
fichiers via un petit serveur HTTP (le `file://` direct ne fonctionne pas à
cause des restrictions CORS) :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000/`.

## Déploiement

Cette branche (`web-semantique`) est destinée à être servie telle quelle par
GitHub Pages (Settings → Pages → Branch → `web-semantique` → `/ (root)`).

`style.css` et `app.js` sont chargés avec un paramètre `?v=N` dans `index.html`
pour éviter que le cache du navigateur/CDN ne serve une version périmée après
un déploiement (surtout important ici puisque la branche `main` du même dépôt
sert un autre projet avec des fichiers de même nom). **Incrémenter ce `N`** à
chaque modification de `style.css` ou `app.js`.
