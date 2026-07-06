# Web Sémantique — Entraînement par questions

Application web statique (HTML/CSS/JS vanilla, sans build) pour réviser le cours
« Web Sémantique » (Master BD2C, Université Hassan II) par questions et corrections.

- 46 questions extraites de la fiche de révision : XML & DTD, XML Schema, XPath,
  XSLT, XQuery, JSON & JSON Schema, RDF/RDFS/OWL2, dont les examens réels 2020 et 2025.
- Filtrage par thème et par source (examen réel / exercice inédit).
- Progression (maîtrisé / à revoir) sauvegardée dans le `localStorage` du navigateur.

## Développement local

Comme `app.js` charge `data/questions.json` via `fetch()`, il faut servir les
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
