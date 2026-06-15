# Supabase MCP Setup

## Objectif

Connecter Windsurf/Cursor/Claude ou un autre client MCP à Supabase via le serveur MCP officiel Supabase.

## Configuration recommandée

Utiliser une configuration :

- scopée à un seul projet Supabase avec `project_ref`
- en lecture seule avec `read_only=true`
- limitée aux outils utiles au démarrage : `database`, `docs`, `debugging`, `development`

## URL MCP recommandée

```text
https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF&read_only=true&features=database,docs,debugging,development
```

Remplace `YOUR_PROJECT_REF` par le Project ID Supabase.

Tu peux le trouver dans :

```text
Supabase Dashboard -> Project Settings -> General -> Project ID
```

## Configuration MCP JSON

À ajouter dans ton client MCP :

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF&read_only=true&features=database,docs,debugging,development"
    }
  }
}
```

## Authentification

Le serveur MCP Supabase utilise OAuth.

Lors du premier lancement, ton client MCP devrait ouvrir une fenêtre de connexion Supabase. Connecte-toi avec ton compte Supabase/GitHub et choisis l'organisation qui contient le projet.

## Pourquoi read-only par défaut ?

Le mode `read_only=true` empêche :

- les migrations SQL
- les modifications de schéma
- les suppressions
- les changements de configuration
- les écritures accidentelles

C'est le mode recommandé pour démarrer.

## Quand passer en mode écriture ?

Uniquement quand tu veux que l'assistant applique directement des migrations.

Dans ce cas, utilise temporairement :

```text
https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF&features=database,docs,debugging,development
```

Puis reviens en read-only après la migration.

## Outils utiles avec cette configuration

- `list_tables`
- `list_extensions`
- `list_migrations`
- `execute_sql` en lecture seule
- `get_logs`
- `get_advisors`
- `get_project_url`
- `get_publishable_keys`
- `generate_typescript_types`
- `search_docs`

## À ne pas faire

- Ne pas utiliser le MCP sur un projet de production sans `read_only=true`.
- Ne pas activer toutes les features si elles ne sont pas nécessaires.
- Ne pas exposer la `service_role_key` dans un client frontend.
- Ne pas donner accès MCP à des utilisateurs finaux.

## Prochaine étape

Quand tu as ton `project_ref`, remplace `YOUR_PROJECT_REF` dans l'URL MCP et ajoute la configuration dans ton client MCP.
