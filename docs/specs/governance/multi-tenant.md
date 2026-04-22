# Qiplim Studio — Instance Configuration & Roles

> **Approche simplifiee** : une instance Qiplim par tenant (etablissement, entreprise, equipe). Pas de multi-tenant dans la DB. L'isolation est au niveau infrastructure (chaque tenant deploie sa propre instance via Docker). Les roles et le partage sont geres au sein de l'instance.

---

## 1. Modele : une instance par tenant

```
Instance Lycee Jean Moulin (docker compose)
  ├── PostgreSQL (donnees du lycee uniquement)
  ├── Redis (sessions, jobs, events)
  ├── Studio (app Next.js)
  └── Users : admin, profs, eleves (viewers)

Instance Ecole de Design (docker compose)
  ├── PostgreSQL (donnees de l'ecole uniquement)
  ├── Redis
  ├── Studio
  └── Users : admin, RP, intervenants, etudiants

Instance Qiplim Cloud (SaaS, mutualisee)
  ├── PostgreSQL (tous les users cloud)
  ├── Redis
  ├── Studio
  └── Users : createurs individuels (pas d'institution)
```

**Avantages** :
- Isolation totale des donnees (RGPD trivial)
- Chaque institution controle son infrastructure
- Pas de complexite multi-tenant dans le code
- Scale horizontal : plus d'institutions = plus d'instances

**Le SaaS Qiplim Cloud** est l'instance mutualisee pour les createurs individuels qui ne veulent pas self-host.

---

## 2. Roles

Trois roles au sein d'une instance :

| Role | Description | Permissions |
|------|-------------|------------|
| **admin** | Administrateur de l'instance | Tout : gerer les users, configurer l'instance, BYOK, voir tous les studios |
| **creator** | Createur de contenu (prof, formateur) | Creer/editer ses studios, generer des widgets, deployer, partager |
| **viewer** | Consommateur (eleve, apprenant) | Voir les studios partages, jouer les widgets, pas de creation |

### 2.1 Schema DB

Ajouter un champ `role` sur le modele `user` :

```prisma
model user {
  id    String @id
  email String @unique
  name  String?
  role  UserRole @default(CREATOR)  // ADMIN, CREATOR, VIEWER
  // ... existing fields
}

enum UserRole {
  ADMIN
  CREATOR
  VIEWER
}
```

### 2.2 Matrice de permissions

| Action | admin | creator | viewer |
|--------|-------|---------|--------|
| Voir ses studios | ✓ | ✓ | — |
| Voir les studios partages | ✓ | ✓ | ✓ |
| Creer un studio | ✓ | ✓ | — |
| Editer un studio | ✓ | ses studios | — |
| Generer des widgets | ✓ | ✓ | — |
| Deployer vers Qiplim (live) | ✓ | ✓ | — |
| Partager un studio | ✓ | ses studios | — |
| Jouer un widget (self-paced) | ✓ | ✓ | ✓ |
| Voir les resultats (dashboard) | ✓ | ses studios | ses scores |
| Gerer les utilisateurs | ✓ | — | — |
| Configurer l'instance (BYOK, locale, widgets) | ✓ | — | — |
| Voir tous les studios de l'instance | ✓ | — | — |

### 2.3 Implementation

```typescript
// lib/api/auth-context.ts — ajouter le role
export type AuthContext = {
  userId: string;
  role: 'ADMIN' | 'CREATOR' | 'VIEWER';
};

// Middleware de permission
function requireRole(...roles: UserRole[]) {
  return async (ctx: AuthContext) => {
    if (!roles.includes(ctx.role)) {
      return { error: 'Forbidden', status: 403 };
    }
  };
}

// Usage dans les routes
const ctx = await getAuthContext();
if (ctx.role === 'VIEWER') {
  return NextResponse.json({ error: 'Creators only' }, { status: 403 });
}
```

---

## 3. Partage de studios

Le `StudioShare` permet a un creator de partager son studio avec d'autres users de l'instance :

```prisma
model StudioShare {
  id        String     @id @default(cuid())
  studioId  String
  userId    String?    // invite par user
  email     String?    // invite par email (pending)
  role      ShareRole  @default(VIEWER)
  createdAt DateTime   @default(now())
  studio    Studio     @relation(fields: [studioId], references: [id], onDelete: Cascade)
  user      user?      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([studioId, userId])
  @@index([studioId])
  @@index([userId])
}

enum ShareRole {
  EDITOR   // peut editer les widgets du studio
  VIEWER   // peut voir et jouer les widgets
}
```

### 3.1 Lien public

Un studio peut etre rendu public (accessible sans compte sur l'instance) :

```prisma
model Studio {
  // ... existing fields
  isPublic    Boolean  @default(false)
  publicSlug  String?  @unique   // URL: /s/{slug}
}
```

URL publique : `https://studio.lycee-jean-moulin.fr/s/{slug}`

Les viewers anonymes (sans compte) peuvent voir et jouer les widgets. Leurs scores sont stockes dans un cookie de session (pas de persistence long terme).

---

## 4. Configuration de l'instance

Chaque instance a une configuration globale (pas une table DB — un fichier `.env` ou une table `InstanceConfig` simple) :

### 4.1 Via .env

```bash
# Instance identity
INSTANCE_NAME="Lycee Jean Moulin"
INSTANCE_LOGO_URL="/images/logo.png"

# Locale (determine la hierarchie pedagogique)
INSTANCE_LOCALE="fr-secondary"  # fr-lmd | fr-secondary | fr-pro | generic

# Widgets actives (liste blanche)
INSTANCE_ENABLED_WIDGETS="QUIZ,MULTIPLE_CHOICE,WORDCLOUD,POSTIT,RANKING,OPENTEXT,FLASHCARD,PRESENTATION,COURSE_PLAN,SESSION_PLAN"

# BYOK par defaut pour toute l'instance
MISTRAL_API_KEY=...
OPENAI_API_KEY=...
```

### 4.2 Via table DB (optionnel, pour admin UI)

```prisma
model InstanceConfig {
  id    String @id @default("singleton")
  name  String @default("Qiplim Studio")
  logo  String?
  locale String @default("generic")
  enabledWidgets String[] @default([])  // si vide = tous actives
  settings Json @default("{}")
  updatedAt DateTime @updatedAt
}
```

L'admin peut modifier la config depuis `/settings/instance` (page admin).

### 4.3 Locale par instance

| Type d'instance | Locale | Hierarchie |
|----------------|--------|-----------|
| Lycee | `fr-secondary` | Classe → Matiere → Chapitre → Seance → Activite |
| Universite | `fr-lmd` | Programme → Semestre → UE → EC → Seance → Activite |
| Formation pro | `fr-pro` | Parcours → Module → Session → Activite |
| Individuel (SaaS) | `generic` | Program → Unit → Course → Session → Activity |

La locale est definie au niveau de l'instance (`.env` ou InstanceConfig). Les users ne la choisissent pas — elle est determinee par l'institution.

---

## 5. Widget activation

L'instance active les widgets pertinents pour son contexte :

### Profils par defaut

| Contexte | Widgets actives |
|----------|----------------|
| **Lycee** | QUIZ, MULTIPLE_CHOICE, WORDCLOUD, POSTIT, RANKING, OPENTEXT, FLASHCARD, PRESENTATION, COURSE_PLAN, SESSION_PLAN, CLASS_OVERVIEW, AUDIO, FAQ, SUMMARY, GLOSSARY |
| **Superieur** | Tous les widgets lycee + ROLEPLAY, NOTEBOOK, SYLLABUS, PROGRAM_OVERVIEW, SEMESTER, UNIT, REPORT, DATA_TABLE, MINDMAP, TIMELINE |
| **Pro** | Tous les widgets superieur + SIMULATION, TRAINING, VIDEO, INFOGRAPHIC |
| **Individuel** | Tous les widgets |

L'admin peut overrider en ajoutant/retirant des widgets.

---

## 6. Gestion des utilisateurs (admin)

L'admin de l'instance gere les users via `/settings/users` :

- **Creer un compte** (email + role)
- **Inviter par email** (envoie un lien d'inscription)
- **Changer le role** d'un user (creator → viewer, etc.)
- **Desactiver un compte** (soft delete)
- **Import CSV** (bulk import d'etudiants/profs)

Pas de LDAP/SSO pour le moment — c'est Phase 3+ si necessaire.

---

## 7. Deploiement regional (Pays de la Loire)

Le scenario "100+ lycees" fonctionne ainsi :

```
Region Pays de la Loire (coordination)
  │
  ├── Lycee Jean Moulin → instance propre (studio.lycee-jean-moulin.fr)
  ├── Lycee Clemenceau → instance propre (studio.lycee-clemenceau.fr)
  ├── Lycee Livet → instance propre (studio.lycee-livet.fr)
  └── ...
```

Chaque lycee a :
- Son propre docker compose (ou Kubernetes pod)
- Sa propre DB PostgreSQL
- Ses propres utilisateurs (profs + eleves)
- Sa propre config (locale fr-secondary, widgets actives)

La region peut :
- Fournir un template docker-compose pour tous les lycees
- Gerer les DNS (*.education-pdl.fr)
- Centraliser les mises a jour (pull de l'image Docker)
- Eventuellement : un dashboard regional qui agregue des stats (Phase 3+, via API)

**Pas de multi-tenant dans le code** — c'est de l'infra (un conteneur par lycee).

---

## 8. Ce qui est hors scope (simplifie)

| Feature | Ancienne spec | Nouvelle approche |
|---------|--------------|-------------------|
| OrganizationGroup table | multi-tenant.md § 1 | Supprime — infra-level (region = provisioning) |
| Organization table | multi-tenant.md § 1 | Supprime — une instance = un tenant |
| Workspace table | multi-tenant.md § 1 | Supprime — pas de sous-groupes pour le moment |
| OrganizationMember table | multi-tenant.md § 5 | Supprime — user.role suffit |
| OrgProviderConfig table | multi-tenant.md § 5 | Supprime — .env ou InstanceConfig |
| Widget activation par org | multi-tenant.md § 4 | Simplifie — config instance |
| Data isolation middleware | multi-tenant.md § 8 | Supprime — isolation physique (DB separee) |
| LDAP / SSO | — | Phase 3+ si necessaire |
| Billing / subscription | — | Hors scope |

---

## 9. Tables a ajouter (minimal)

| Table | Champs | Description |
|-------|--------|-------------|
| `StudioShare` | studioId, userId?, email?, role (EDITOR/VIEWER) | Partage studio entre users |
| `InstanceConfig` | name, logo, locale, enabledWidgets, settings | Config instance (optionnel, singleton) |

Modifier :
| Table | Modification |
|-------|-------------|
| `user` | Ajouter `role: UserRole` (ADMIN / CREATOR / VIEWER) |
| `Studio` | Ajouter `isPublic: Boolean`, `publicSlug: String?` |
