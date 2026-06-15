# Migration Supabase + Vercel

## Stack technique recommandée

### Frontend SaaS

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Apache ECharts
- TanStack Table
- Vercel

### Backend et base de données

- Supabase Postgres
- Supabase Auth
- Row Level Security
- Supabase service role key pour les jobs serveur

### Monitoring

- Python
- requests
- advertools
- GitHub Actions cron

### Notifications

- Resend pour les emails
- Slack ou Discord plus tard si nécessaire

## Architecture cible

```text
GitHub Actions cron
        |
        v
Python monitor.py
        |
        v
Supabase Postgres + Auth
        |
        v
Next.js dashboard on Vercel
```

## Ordre de migration recommandé

1. Créer le projet Supabase
2. Exécuter `supabase_schema.sql` dans Supabase SQL Editor
3. Créer une organisation initiale
4. Importer les sites dans la table `sites`
5. Ajouter les variables Supabase dans les secrets GitHub ou Streamlit
6. Adapter `monitor.py` pour écrire dans Supabase
7. Tester un check manuel
8. Créer le dashboard Next.js sur Vercel
9. Ajouter Supabase Auth
10. Ajouter GitHub Actions pour le check quotidien

## Variables à prévoir

### Pour le monitor Python

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DEFAULT_ORGANIZATION_ID=
```

### Pour Next.js

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Tables créées

- `organizations`
- `user_profiles`
- `sites`
- `checks`
- `alerts`
- `sitemap_details`
- `important_urls`
- `important_url_results`

## Sécurité

- Les tables ont Row Level Security activé.
- Les utilisateurs ne voient que les données de leur organisation.
- Le monitor Python devra utiliser la `service_role_key` uniquement côté serveur ou GitHub Actions.
- Ne jamais exposer la `service_role_key` dans Next.js côté client.

## Prochaine étape technique

Adapter `monitor.py` pour :

- Charger les sites depuis Supabase
- Insérer les checks dans `checks`
- Insérer les alertes dans `alerts`
- Insérer les sitemaps dans `sitemap_details`
- Insérer les résultats des URLs importantes dans `important_url_results`

La version SQLite peut rester disponible en fallback pendant la transition.
