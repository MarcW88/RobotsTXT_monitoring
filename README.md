# Robots.txt Monitor

Outil de monitoring quotidien des fichiers `robots.txt` pour plusieurs sites.

## Pourquoi cet outil alors que Google Search Console existe ?

Google Search Console est utile pour diagnostiquer un site après coup, mais elle n'est pas conçue comme un système d'alerte multi-sites en temps réel.

Différences principales :

- **GSC est site par site** : difficile d'avoir une vue portefeuille sur tous les domaines clients.
- **GSC remonte souvent les problèmes avec délai** : l'outil doit détecter un changement critique dès sa publication.
- **GSC ne versionne pas clairement le robots.txt** : ici, chaque version sera historisée et comparée.
- **GSC ne connaît pas toujours tes règles métier** : par exemple, une règle qui bloque `/blog/`, `/products/`, `/collections/`, `/fr/`, `/nl/` ou des URLs business peut être critique pour toi.
- **GSC ne priorise pas selon tes pages importantes** : le monitoring doit croiser `robots.txt`, sitemaps et pages stratégiques.

## Faut-il crawler tous les sites chaque jour ?

Pas nécessairement crawler tout le site chaque jour.

Approche recommandée :

1. **Chaque jour** : récupérer `robots.txt`, le comparer à la version précédente, vérifier le statut HTTP, le contenu, les directives et les sitemaps déclarés.
2. **Chaque jour ou plusieurs fois par semaine** : récupérer les sitemaps listés dans `robots.txt` et les sitemaps connus.
3. **Seulement si changement critique** : tester un échantillon de pages importantes contre les règles `robots.txt`.
4. **Périodiquement** : refaire un crawl léger des pages prioritaires, pas un crawl complet.

Le coeur du produit est donc un monitoring différentiel, pas un crawler massif quotidien.

## Critères d'alerte robots.txt

Alertes critiques :

- `robots.txt` inaccessible : `404`, `5xx`, timeout, DNS error.
- Passage soudain à `Disallow: /` pour `Googlebot` ou `*`.
- Blocage nouveau d'un répertoire important.
- Suppression de lignes `Sitemap:`.
- Changement massif du fichier.
- Robots.txt retourne du HTML, une redirection suspecte ou un contenu vide.
- Directive contradictoire ou mal formatée.

Alertes importantes :

- Sitemap déclaré inaccessible.
- Sitemap déclaré mais vide.
- Nombre d'URLs sitemap en forte baisse.
- Pages importantes maintenant bloquées par robots.txt.
- Différence entre sitemaps déclarés dans `robots.txt` et sitemaps connus.

Alertes informatives :

- Modification mineure du fichier.
- Ajout d'un nouveau sitemap.
- Changement de crawl-delay.

## Définition des pages importantes

Les pages importantes ne doivent pas être définies uniquement par le crawler. Elles doivent venir de plusieurs sources pondérées.

Sources possibles :

- **Sitemaps XML** : URLs officiellement indexables.
- **Google Search Console** : clics, impressions, pages indexées, pages avec trafic SEO.
- **Analytics** : sessions organiques, conversions, chiffre d'affaires.
- **Configuration manuelle** : patterns critiques par site, par exemple `/products/`, `/collections/`, `/blog/`, `/category/`, `/fr/`, `/nl/`.
- **Crawl interne périodique** : pages liées depuis la navigation, home, catégories, hubs.
- **Business rules** : pages money, pages locales, pages marques, pages catégories.

Score recommandé :

```text
importance_score = sitemap_presence
                 + organic_clicks_score
                 + impressions_score
                 + revenue_or_conversion_score
                 + internal_link_depth_score
                 + manual_priority_boost
```

Exemples de seuils :

- `critical` : home, pages money, pages avec trafic/conversions, pages déclarées manuellement.
- `high` : URLs sitemap avec impressions/clics ou pages proches de la home.
- `medium` : URLs sitemap sans performance connue.
- `low` : URLs découvertes uniquement par crawl profond.

## Cas des sites avec plusieurs sitemaps

Il faut gérer les index de sitemaps récursivement.

Process :

1. Lire les lignes `Sitemap:` dans `robots.txt`.
2. Détecter si chaque sitemap est un `sitemapindex` ou un `urlset`.
3. Si `sitemapindex`, récupérer tous les sitemaps enfants.
4. Normaliser les URLs.
5. Dédupliquer.
6. Classer les sitemaps par type si possible : pages, produits, catégories, articles, images, hreflang, langues.
7. Comparer les volumes jour après jour.

Alertes spécifiques :

- Sitemap enfant disparu.
- Forte baisse d'URLs dans un sitemap enfant.
- Sitemap produit/catégorie inaccessible.
- Sitemap général existe mais ne contient plus certains sitemaps spécialisés.

## MVP proposé

Le premier MVP peut contenir :

- Liste de sites à monitorer dans un fichier de configuration.
- Fetch quotidien de `robots.txt`.
- Historique des versions.
- Diff entre deux versions.
- Extraction des directives `Allow`, `Disallow`, `Sitemap`, `User-agent`.
- Fetch des sitemaps déclarés.
- Détection des changements critiques.
- Rapport HTML ou dashboard simple.
- Alertes Slack/email à terme.

## URLs importantes manuelles

Avant le scoring automatique, l'outil utilise une liste manuelle d'URLs critiques.

Créer un fichier `important_urls.csv` à partir de `important_urls.example.csv` :

```csv
site,url,type,priority
Example,https://www.example.com/,homepage,high
Example,https://www.example.com/products/example,conversion,high
Example,https://www.example.com/blog/example,seo,medium
```

User-agents testés :

- `Googlebot`
- `Googlebot-Image`
- `Bingbot`
- `GPTBot`
- `ClaudeBot`
- `PerplexityBot`
- `CCBot`

Alertes générées :

- homepage bloquée ;
- URL `high` priority bloquée ;
- URL business critique bloquée ;
- page présente dans un sitemap mais bloquée ;
- Googlebot autorisé mais bots IA bloqués ;
- changement de statut depuis le dernier check.

## Rapport d'alertes CSV

À chaque exécution, l'outil génère :

`data/alerts.csv`

Colonnes :

- `date`
- `site`
- `severity`
- `alert_type`
- `message`
- `url`
- `user_agent`
- `previous_status`
- `current_status`

Niveaux :

- `critical` : homepage bloquée, `Disallow: /`, `robots.txt` inaccessible, URL business critique bloquée.
- `high` : sitemap disparu, sitemap inaccessible, chute massive d'URLs, page sitemap bloquée, changement de statut robots.
- `medium` : bots IA bloqués alors que Googlebot est autorisé, sitemap vide, changement non critique.

## Diagnostic robots.txt expert

L'outil produit une lecture unifiée de la politique de crawl effective du site.

Architecture interne :

- couche 1 : interprétation technique des directives avec `advertools` ;
- couche 2 : décision effective `allowed` / `blocked` avec `urllib.robotparser` ;
- couche 3 : alertes métier SEO/GEO.

Le module `robots_policy.py` structure cette logique avec :

- `can_fetch_url()` : retourne la décision effective pour une URL et un user-agent.
- `extract_rules()` : structure les directives du `robots.txt`.
- `analyze_user_agents()` : produit une matrice URL × user-agent.
- `detect_policy_risks()` : transforme les décisions techniques en risques lisibles.

L'utilisateur final ne voit pas deux moteurs concurrents. Il voit une politique de crawl effective :

```text
Googlebot: allowed
GPTBot: blocked
Risque: medium
Raison: Googlebot allowed but AI bots blocked
```

## Crawl Policy Status

Le dashboard synthétise chaque site avec un statut unique :

- `OK` : aucune alerte significative.
- `Warning` : alerte `medium` ou `high`.
- `Critical` : alerte critique SEO/GEO.
- `Unknown` : statut impossible à déterminer, par exemple `robots.txt` inaccessible.

Le résumé automatique transforme les alertes techniques en phrases exploitables :

- `Googlebot peut accéder aux URLs critiques suivies.`
- `2 sitemap(s) ont perdu plus de 30 % de leurs URLs.`
- `Des bots IA sont bloqués sur 5 URL(s) business.`

## Stack possible

Option simple :

- Python
- SQLite
- Streamlit pour le dashboard
- Cron ou GitHub Actions pour le monitoring quotidien

Option plus produit :

- FastAPI
- PostgreSQL
- React/Next.js
- Worker quotidien via cron

Pour démarrer vite, Python + SQLite + Streamlit est recommandé.
