# Prisma Migrations - Guide Studio

## Architecture

- **Schema** : `packages/db-studio/prisma/schema.prisma`
- **Migrations** : `packages/db-studio/prisma/migrations/`
- **Prisma version** : 6.x (ne PAS utiliser la v7 globale)
- **Base de donnees** : PostgreSQL sur Clever Cloud

## Connexion a la base de donnees

```bash
# Staging
psql -h bfgarcrfqcdwixwn79wd-postgresql.services.clever-cloud.com \
     -p 6581 \
     -U u5gdu1fnsby5jvsrsubx \
     -d bfgarcrfqcdwixwn79wd
```

Le mot de passe est dans la variable `DATABASE_URL` sur Clever Cloud.

## Workflow de migration

### 1. Modifier le schema

Editer `packages/db-studio/prisma/schema.prisma` avec les changements souhaites.

### 2. Generer la migration

```bash
cd packages/db-studio
npx --package=prisma@6 prisma migrate dev --name nom_de_la_migration
```

Cela va :
- Generer un fichier SQL dans `prisma/migrations/<timestamp>_nom_de_la_migration/migration.sql`
- Appliquer la migration sur la base locale
- Regenerer le Prisma Client

### 3. Verifier le SQL genere

Relire le fichier `migration.sql` genere pour verifier qu'il fait bien ce qu'on attend.

### 4. Commiter et pousser

```bash
git add packages/db-studio/prisma/
git commit -m "feat(db): description de la migration"
git push origin studio
```

### 5. Deploiement automatique

Sur Clever Cloud, les migrations sont appliquees automatiquement grace aux hooks :

- **CC_POST_BUILD_HOOK** : `pnpm --filter @qiplim/db-studio run db:generate && ... && cd apps/studio && pnpm run build`
  - Regenere le Prisma Client pendant le build
- **CC_PRE_RUN_HOOK** : `cd packages/db-studio && npx prisma migrate deploy`
  - Applique les migrations pendantes avant le demarrage de l'app

## Commandes utiles

### Appliquer les migrations en local

```bash
cd packages/db-studio
npx --package=prisma@6 prisma migrate dev
```

### Regenerer le Prisma Client sans migrer

```bash
cd packages/db-studio
npx --package=prisma@6 prisma generate
```

### Voir l'etat des migrations

```bash
cd packages/db-studio
npx --package=prisma@6 prisma migrate status
```

### Reinitialiser la base locale (destructif)

```bash
cd packages/db-studio
npx --package=prisma@6 prisma migrate reset
```

### Appliquer le schema sans migration (dev seulement)

```bash
cd packages/db-studio
npx --package=prisma@6 prisma db push
```

### Executer du SQL brut sur la base distante

```bash
cd packages/db-studio
echo "SELECT * FROM ..." | npx --package=prisma@6 prisma db execute --url "$DATABASE_URL" --stdin
```

Ou directement via psql si disponible :
```bash
psql -h bfgarcrfqcdwixwn79wd-postgresql.services.clever-cloud.com -p 6581 -U u5gdu1fnsby5jvsrsubx -d bfgarcrfqcdwixwn79wd
```

## Depannage

### Migration echoue en production (table/colonne existe deja)

Si la base a ete configuree avec `db push` (pas de table `_prisma_migrations`), les migrations vont tenter de creer des objets qui existent deja.

**Solution** : marquer les migrations existantes comme appliquees :

```bash
cd packages/db-studio
npx --package=prisma@6 prisma migrate resolve --applied NOM_MIGRATION
```

Puis relancer le deploy.

### Colonne manquante apres `migrate resolve`

Si une migration a ete marquee comme appliquee (`resolve --applied`) sans avoir ete executee, des colonnes/tables peuvent manquer.

**Solution** : creer une migration corrective avec des statements idempotents :

```sql
-- Colonnes
ALTER TABLE "ma_table" ADD COLUMN IF NOT EXISTS "ma_colonne" TEXT;

-- Enum values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MA_VALEUR'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'MonEnum')) THEN
    ALTER TYPE "MonEnum" ADD VALUE 'MA_VALEUR';
  END IF;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "ma_table" (...);

-- Index
CREATE INDEX IF NOT EXISTS "mon_index" ON "ma_table"("colonne");

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ma_fk') THEN
    ALTER TABLE "ma_table" ADD CONSTRAINT "ma_fk" FOREIGN KEY ...;
  END IF;
END $$;
```

### Prisma v7 globale vs v6 locale

La CLI Prisma globale est en v7 qui a des breaking changes (pas de `url` dans `datasource`). Toujours utiliser la version locale :

```bash
# BON
npx --package=prisma@6 prisma migrate dev

# MAUVAIS (utilise la v7 globale)
prisma migrate dev
```

### Forcer un rebuild sur Clever Cloud

Si le Prisma Client est desynchronise du schema (erreur "column does not exist") :

```bash
clever deploy -a studio-staging --force --same-commit-policy=rebuild
```

Cela force un rebuild complet avec `prisma generate` au lieu de reutiliser le cache.
