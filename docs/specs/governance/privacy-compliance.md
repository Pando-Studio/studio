# Qiplim — RGPD, Vie privee et Souverainete des donnees

> **Version** : 1.0 — 10 avril 2026
> **Statut** : Specification — a valider par le DPO de l'institution
> **Audience** : DSI, DPO, juristes, responsables ENT, equipe technique Qiplim
> **Perimetre** : Qiplim Studio + Qiplim Engage (les deux applications du monorepo)

---

## Table des matieres

1. [Donnees collectees](#1-donnees-collectees)
2. [Traitement des donnees](#2-traitement-des-donnees)
3. [Donnees des mineurs](#3-donnees-des-mineurs)
4. [Droits des utilisateurs (RGPD)](#4-droits-des-utilisateurs-rgpd)
5. [Souverainete des donnees](#5-souverainete-des-donnees)
6. [Securite technique](#6-securite-technique)
7. [Data Processing Agreement (DPA)](#7-data-processing-agreement-dpa)
8. [Conformite specifique Education Nationale](#8-conformite-specifique-education-nationale)

---

## 1. Donnees collectees

### 1.1 Cartographie par profil utilisateur

Qiplim distingue trois profils :

| Profil | Description | Application |
|--------|-------------|-------------|
| **Enseignant / Formateur** | Cree des studios, genere des widgets, anime des sessions | Studio + Engage |
| **Eleve / Apprenant** | Participe aux sessions, repond aux activites | Engage (+ Studio en lecture seule) |
| **Administrateur** | Gere les comptes, supervise l'usage | Studio + Engage (role admin) |

### 1.2 Donnees de compte (identite)

| Donnee | Collectee pour | Base legale | Profils concernes | Retention |
|--------|---------------|-------------|-------------------|-----------|
| Email | Authentification, communication | Contrat (Art. 6.1.b) | Tous les comptes | Duree du compte + 30 jours apres suppression |
| Nom / Prenom | Affichage dans l'interface | Contrat (Art. 6.1.b) | Tous les comptes | Duree du compte |
| Mot de passe (hashe) | Authentification | Contrat (Art. 6.1.b) | Comptes email/password | Duree du compte |
| Image de profil (URL) | Personnalisation | Consentement (Art. 6.1.a) | Optionnel | Duree du compte |
| Provider OAuth (Google) | Authentification SSO | Contrat (Art. 6.1.b) | Comptes Google | Duree du compte |
| Role (`user`, `admin`) | Gestion des permissions | Interet legitime (Art. 6.1.f) | Tous | Duree du compte |
| Statut (`pending`, `active`, `banned`) | Moderation | Interet legitime (Art. 6.1.f) | Tous | Duree du compte |

**Schema Prisma concerne** : `user`, `account` (tables BetterAuth).

**Participants aux sessions live (Engage)** : les participants ne creent PAS de compte. Ils fournissent uniquement un pseudonyme (`name`, max 100 caracteres) pour rejoindre une session. Ce pseudonyme est stocke dans la table `Participant` et associe a la session.

| Donnee participant | Collectee pour | Base legale | Retention |
|-------------------|---------------|-------------|-----------|
| Pseudonyme (name) | Identification dans la session | Interet legitime (Art. 6.1.f) | Duree de la session + 90 jours |
| isActive | Etat de connexion | Interet legitime | Duree de la session |

### 1.3 Donnees de contenu (pedagogique)

#### Studio

| Donnee | Description | Propriete | Retention |
|--------|-------------|-----------|-----------|
| Studios | Projets pedagogiques (titre, description, settings) | Enseignant | Duree du compte |
| Sources (`StudioSource`) | Documents uploades (PDF, PPTX, etc.), URLs, videos YouTube | Enseignant | Duree du studio |
| Chunks (`StudioSourceChunk`) | Decoupage des documents + embeddings vectoriels (1024D) | Systeme (derive des sources) | Supprime avec la source |
| Widgets | Contenus pedagogiques generes ou manuels (quiz, presentations, etc.) | Enseignant | Duree du studio |
| Conversations | Historique des echanges avec l'IA (messages, citations) | Enseignant | Duree du studio |
| Presentations | Diaporamas avec slides et widgets integres | Enseignant | Duree du studio |
| Plans de cours (`CoursePlan`) | Plans pedagogiques structures | Enseignant | Duree du studio |
| Favoris (`UserFavorite`) | Widgets et plans marques comme favoris | Enseignant | Duree du compte |

#### Engage

| Donnee | Description | Propriete | Retention |
|--------|-------------|-----------|-----------|
| Projets | Collections d'activites (titre, code d'acces) | Enseignant | Duree du compte |
| Activites | Contenus des activites (config JSON, type, parametres) | Enseignant | Duree du projet |
| Documents | Fichiers uploades pour la generation d'activites | Enseignant | Duree du projet |
| Sessions live (`LiveSession`) | Sessions de presentation en direct | Enseignant | 90 jours apres la fin |
| Reponses (`ActivityResponse`) | Reponses des participants (JSON, score, isCorrect) | Participant | 90 jours apres la session |

### 1.4 Donnees d'usage

| Donnee | Collectee pour | Base legale | Retention |
|--------|---------------|-------------|-----------|
| `GenerationRun` (type, status, tokens) | Suivi des generations IA, debugging | Interet legitime (Art. 6.1.f) | 90 jours |
| Nombre de sessions, participants | Statistiques d'usage pour l'enseignant | Contrat (Art. 6.1.b) | Duree du projet |
| Scores et taux de completion | Suivi pedagogique | Contrat (Art. 6.1.b) | 90 jours apres la session |

### 1.5 Donnees techniques

| Donnee | Collectee pour | Base legale | Retention |
|--------|---------------|-------------|-----------|
| Adresse IP (`session.ipAddress`) | Securite, detection de fraude | Interet legitime (Art. 6.1.f) | Duree de la session auth (7 jours max) |
| User Agent (`session.userAgent`) | Compatibilite, debugging | Interet legitime (Art. 6.1.f) | Duree de la session auth (7 jours max) |
| Token de session | Authentification | Contrat (Art. 6.1.b) | 7 jours (expiration BetterAuth) |
| Cookies de session | Maintien de la connexion | Contrat (Art. 6.1.b) | 7 jours |
| Logs applicatifs (serveur) | Debugging, monitoring | Interet legitime (Art. 6.1.f) | 30 jours |

### 1.6 Donnees NON collectees

Qiplim ne collecte **pas** :

- Donnees biometriques
- Donnees de geolocalisation precise
- Historique de navigation hors Qiplim
- Donnees de reseaux sociaux (hors OAuth Google si utilise)
- Numero de telephone
- Date de naissance
- Adresse postale
- Donnees de carte bancaire (paiement delegue)

---

## 2. Traitement des donnees

### 2.1 Donnees au repos (data at rest)

| Systeme | Contenu | Localisation | Chiffrement |
|---------|---------|-------------|-------------|
| **PostgreSQL 16** (Engage) | Comptes, projets, activites, reponses, sessions | Clever Cloud (France, Paris) | Chiffrement disque (AES-256, gere par Clever Cloud) |
| **PostgreSQL 16** (Studio) | Comptes, studios, sources, widgets, conversations | Clever Cloud (France, Paris) | Chiffrement disque (AES-256, gere par Clever Cloud) |
| **Redis 7** | Cache de session, progression des jobs, events temps reel | Clever Cloud (France, Paris) | Donnees ephemeres, TTL max 2h pour les sessions |
| **Cellar S3** (Clever Cloud) | Documents uploades (PDF, PPTX, images) | Clever Cloud (France, Paris) | Chiffrement cote serveur (SSE-S3) |
| **pgvector** (embeddings) | Vecteurs d'embeddings des documents (1024 dimensions) | Dans PostgreSQL Studio | Meme chiffrement que PostgreSQL |

**Mots de passe** : hashes par BetterAuth (bcrypt/argon2, jamais stockes en clair).

**Cles API BYOK** : chiffrees AES-256-GCM avant stockage en base. Cle de derivation via `BYOK_ENCRYPTION_KEY` (variable d'environnement). IV aleatoire de 12 octets par cle. Prefixe `v2:` pour distinguer du format legacy.

### 2.2 Donnees en transit (data in transit)

| Flux | Protocole | Detail |
|------|-----------|--------|
| Client → Serveur (Next.js) | HTTPS / TLS 1.2+ | Certificats Let's Encrypt geres par Clever Cloud |
| Serveur → PostgreSQL | TLS | Connexion SSL forcee en production |
| Serveur → Redis | TLS | Connexion SSL via Clever Cloud |
| Serveur → Cellar S3 | HTTPS | API S3 via HTTPS (endpoint Clever Cloud) |
| Serveur → Providers IA | HTTPS / TLS 1.2+ | Appels API REST vers Mistral, OpenAI, etc. |
| Serveur → Unstructured.io | HTTPS | Parsing de documents (voir 2.3) |
| Client → Ably (Engage) | WSS (WebSocket Secure) | Temps reel via Ably (token auth) |
| Serveur → Ably (Engage) | HTTPS | Publication d'events via Ably REST |

### 2.3 Traitement par des tiers (sous-traitants)

#### Providers IA — Flux de donnees

Quand Qiplim genere du contenu pedagogique (quiz, presentations, etc.), des extraits de documents de l'utilisateur sont envoyes a un provider IA via le pipeline RAG.

| Etape du pipeline | Donnees envoyees au provider | Ce qui reste en interne |
|-------------------|-----------------------------|-----------------------|
| Embedding (vectorisation) | Chunks de texte (extraits de documents) | Vecteurs stockes dans pgvector |
| Generation (LLM) | Prompt + contexte RAG (chunks pertinents) | Widget genere stocke en base |
| Chat conversationnel | Message utilisateur + contexte | Historique conversation en base |
| Transcription audio | Fichier audio | Texte transcrit en base |
| Generation d'images | Prompt textuel (pas de donnees personnelles) | Image stockee dans S3 |

#### Politiques des providers IA

| Provider | Siege | Stockage donnees | Utilisation pour entrainement | DPA disponible | Risque souverainete |
|----------|-------|-----------------|------------------------------|----------------|-------------------|
| **Mistral AI** | France (Paris) | EU uniquement | Non (API) | Oui (RGPD natif) | **Faible** — provider francais |
| **OpenAI** | USA | USA (Azure EU possible) | Non via API (depuis mars 2023) | Oui (DPA standard) | **Eleve** — transfert hors EU |
| **Anthropic** | USA | USA | Non via API | Oui (DPA standard) | **Eleve** — transfert hors EU |
| **Google (Gemini)** | USA | Multi-region (EU possible) | Non via API payante | Oui (DPA Google Cloud) | **Moyen** — depende de la config |

#### Autres sous-traitants

| Sous-traitant | Donnees traitees | Localisation | DPA |
|--------------|-----------------|-------------|-----|
| **Clever Cloud** | Hebergement complet (DB, S3, compute) | France (Paris, Roubaix) | Oui — fournisseur francais, certifie HDS |
| **Ably** (Engage uniquement) | Messages temps reel (events de session, pas de donnees personnelles) | EU (Dublin, Ireland) | Oui — RGPD compliant |
| **Unstructured.io** | Contenu des documents (pour parsing/extraction) | USA | Oui — mais transfert hors EU |
| **Let's Encrypt** | Aucune donnee utilisateur (certificats TLS) | USA | N/A |

### 2.4 BYOK : implications sur le traitement

Le systeme BYOK (Bring Your Own Key) permet a l'utilisateur de fournir ses propres cles API pour les providers IA.

**Quand l'utilisateur utilise sa propre cle** :
- L'utilisateur a un contrat direct avec le provider IA
- Qiplim agit comme intermediaire technique (pas de relation contractuelle Qiplim ↔ provider pour ces appels)
- L'utilisateur est responsable de verifier la conformite RGPD de son provider
- La cle est chiffree AES-256-GCM en base et jamais exposee cote client

**Quand l'utilisateur utilise la cle plateforme Qiplim** :
- Qiplim est responsable du choix du provider et du DPA associe
- Par defaut : **Mistral AI** (provider francais, donnees EU)
- L'utilisateur est informe du provider utilise dans les settings

**Resolution des cles** : `projet` → `compte` → `plateforme` (Mistral par defaut).

### 2.5 Donnees ephemeres (Redis)

Redis est utilise comme cache ephemere, **pas comme stockage persistant** :

| Cle Redis | Contenu | TTL | Donnees personnelles |
|-----------|---------|-----|---------------------|
| Session cache (Engage) | Etat de la session live | 2h | Non (IDs uniquement) |
| Activity results (Engage) | Agregation des reponses | 30s | Non (scores agreges) |
| Presenter token (Engage) | Verification du token presenter | 30s | Non (token + sessionId) |
| BullMQ jobs | Parametres des jobs de generation | Duree du job | Oui (sourceIds, prompts) — ephemere |
| Studio events (pub/sub) | Events de progression | Immediat (pas de retention) | Non |

---

## 3. Donnees des mineurs

### 3.1 Cadre legal

Le RGPD (Art. 8) et la loi Informatique et Libertes (Art. 45) imposent des protections renforcees pour les donnees des mineurs de moins de 15 ans (seuil francais, vs 16 ans dans le RGPD general).

| Tranche d'age | Regime applicable |
|---------------|------------------|
| < 15 ans (college) | Consentement parental obligatoire |
| 15-17 ans (lycee) | Consentement du mineur suffisant |
| 18+ (superieur) | Regime general adulte |

### 3.2 Scenario de deploiement Education Nationale

#### Scenario A : Session live sans compte (recommande pour les mineurs)

Les eleves participent via un code de session (6 caracteres). Ils fournissent uniquement un pseudonyme. **Aucune creation de compte requise.**

| Donnee collectee | Niveau de risque | Justification |
|-----------------|-----------------|---------------|
| Pseudonyme (libre, peut etre anonyme) | **Faible** | Pas une donnee personnelle si non nominatif |
| Reponses aux activites | **Faible** | Liees au pseudonyme, pas a une identite |
| Score | **Faible** | Lie au pseudonyme |

**Recommandation** : pour les classes de college (< 15 ans), utiliser des pseudonymes non nominatifs (ex: "Joueur 1", initiales, ou pseudonymes choisis par l'eleve).

#### Scenario B : Compte eleve (lycee, enseignement superieur)

Si l'institution choisit de creer des comptes eleves (pour le suivi individuel) :

| Exigence | Implementation |
|----------|----------------|
| Consentement parental (< 15 ans) | Workflow de validation : creation du compte par l'admin → notification aux parents → activation apres consentement |
| Information claire | Page d'information adaptee a l'age, en francais |
| Minimisation des donnees | Seuls l'email et le prenom sont requis (pas de nom de famille obligatoire) |
| Droit a l'effacement | Suppression complete sur demande du parent ou de l'eleve |

#### Scenario C : SSO via ENT (cible institutionnelle)

L'institution provisionne les comptes via son ENT (Environnement Numerique de Travail). Qiplim recoit uniquement :
- Un identifiant opaque (pas l'identite civile)
- Un attribut de role (eleve / enseignant)
- Optionnel : classe, etablissement

**Avantage** : l'institution reste responsable du traitement de l'identite. Qiplim ne stocke que l'identifiant opaque.

### 3.3 Principes de protection des mineurs

| Principe | Implementation dans Qiplim |
|----------|---------------------------|
| **Minimisation** (Art. 5.1.c) | Pas de donnee personnelle requise pour participer a une session. Pseudonyme libre. |
| **Limitation de la finalite** (Art. 5.1.b) | Les reponses servent uniquement au suivi pedagogique. Pas de profilage, pas de publicite. |
| **Limitation de la conservation** (Art. 5.1.e) | Reponses de session : 90 jours max. Suppression automatique ensuite. |
| **Pas de profilage** (Art. 22) | Aucun profilage automatise. Les scores sont affiches a l'enseignant, pas utilises pour des decisions automatisees. |
| **Pas de publicite** | Qiplim ne contient aucune publicite, aucun tracker tiers, aucun pixel de suivi. |
| **Pas de partage avec des tiers** | Les donnees des eleves ne sont jamais partagees avec des tiers a des fins commerciales. |

### 3.4 Anonymisation des resultats

Pour les deploiements sensibles (mineurs, evaluations), Qiplim propose des options d'anonymisation :

| Option | Description | Configuration |
|--------|-------------|---------------|
| **Pseudonymes imposes** | L'enseignant peut forcer des pseudonymes generiques ("Equipe A", "Joueur 1-30") | Setting du projet |
| **Resultats agreges uniquement** | L'enseignant ne voit que les statistiques globales (% de bonnes reponses, distribution) sans lien individuel | Setting de l'activite |
| **Pas de leaderboard** | Desactiver le classement individuel visible par tous | Setting de la session |
| **Suppression acceleree** | Reponses supprimees a la fin de la session (pas de retention 90 jours) | Setting de la session |

---

## 4. Droits des utilisateurs (RGPD)

### 4.1 Vue d'ensemble

| Droit | Article RGPD | Delai de reponse | Implementation |
|-------|-------------|-------------------|----------------|
| Droit d'acces | Art. 15 | 30 jours | API + interface |
| Droit de rectification | Art. 16 | 30 jours | Interface directe |
| Droit a l'effacement | Art. 17 | 30 jours | API + interface |
| Droit a la portabilite | Art. 20 | 30 jours | Export JSON/CSV |
| Droit d'opposition | Art. 21 | 30 jours | Settings |
| Droit a la limitation du traitement | Art. 18 | 30 jours | Support |

### 4.2 Droit d'acces (Art. 15)

L'utilisateur peut demander l'ensemble de ses donnees personnelles.

**Endpoint API** :

```
GET /api/privacy/export
Authorization: Bearer {session_token}
Accept: application/json
```

**Donnees incluses dans l'export** :

| Categorie | Donnees exportees |
|-----------|------------------|
| Profil | email, name, image, role, createdAt |
| Studios | Liste des studios (titre, description, dates) |
| Sources | Liste des sources (titre, type, taille, dates) — pas le contenu binaire |
| Widgets | Liste des widgets (titre, type, status, dates) + configuration JSON |
| Conversations | Historique complet des messages avec l'IA |
| Presentations | Structure des presentations (slides, ordre) |
| Favoris | Liste des widgets et plans favoris |
| Sessions auth | Sessions actives (IP, user agent, dates) |
| Configurations BYOK | Providers configures (pas les cles API en clair) |

**Format** : archive ZIP contenant des fichiers JSON structures.

**Ce qui n'est PAS inclus** :
- Fichiers binaires uploades (trop volumineux — lien de telechargement separe)
- Embeddings vectoriels (donnees derivees, pas des donnees personnelles)
- Logs serveur (non rattachables a l'utilisateur sans investigation manuelle)

### 4.3 Droit de rectification (Art. 16)

L'utilisateur peut modifier ses donnees personnelles directement dans l'interface :

| Donnee | Ou modifier | Methode |
|--------|------------|---------|
| Nom / Prenom | Settings du compte | Interface |
| Email | Settings du compte | Verification par email |
| Image de profil | Settings du compte | Interface |
| Contenus des studios | Dans chaque studio | Interface |

**Endpoint API** :

```
PATCH /api/privacy/profile
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "name": "Nouveau nom",
  "email": "nouvel-email@example.com"
}
```

### 4.4 Droit a l'effacement (Art. 17)

Suppression complete du compte et de toutes les donnees associees.

**Endpoint API** :

```
DELETE /api/privacy/account
Authorization: Bearer {session_token}
X-Confirm: "DELETE_MY_ACCOUNT"
```

**Cascade de suppression** :

```
user (supprime)
  ├── account (cascade)
  ├── session (cascade)
  ├── Studio (cascade)
  │     ├── StudioSource (cascade)
  │     │     └── StudioSourceChunk (cascade) — embeddings inclus
  │     ├── Widget (cascade)
  │     ├── Conversation (cascade)
  │     │     └── ConversationMessage (cascade)
  │     ├── Presentation (cascade)
  │     │     └── PresentationVersion (cascade)
  │     │           └── Slide (cascade)
  │     ├── CoursePlan (cascade)
  │     ├── GenerationRun (cascade)
  │     └── ProviderConfig (cascade) — cles BYOK supprimees
  ├── UserProviderConfig (cascade)
  ├── UserFavorite (cascade)
  ├── DocumentFolder (cascade)
  └── DocumentTag (cascade)
```

**Fichiers S3** : les fichiers dans Cellar S3 sont supprimes de maniere asynchrone (job BullMQ) apres la suppression du compte. Le path S3 `users/{userId}/studios/{studioId}/` est integralement purge.

**Redis** : les donnees ephemeres expirent naturellement (TTL max 2h). Aucune action requise.

**Delai** : la suppression est effective immediatement en base. Les fichiers S3 sont supprimes sous 24h. Un email de confirmation est envoye.

**Exception** : les reponses de session deja soumises par l'utilisateur dans le contexte d'un projet Engage d'un autre enseignant ne sont PAS supprimees (elles appartiennent au contexte pedagogique de l'enseignant). Elles sont anonymisees (participantId → null, name → "Utilisateur supprime").

### 4.5 Droit a la portabilite (Art. 20)

Export des donnees dans un format structure, couramment utilise et lisible par machine.

**Endpoint API** :

```
POST /api/privacy/export
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "format": "json" | "csv",
  "scope": "all" | "studios" | "profile"
}
```

**Formats disponibles** :

| Format | Contenu | Use case |
|--------|---------|----------|
| JSON (defaut) | Archive ZIP avec fichiers JSON structures | Re-import dans un autre outil |
| CSV | Fichiers CSV (un par table) | Analyse dans un tableur |

**Structure de l'archive JSON** :

```
export-{userId}-{date}/
  ├── profile.json          # Donnees du compte
  ├── studios/
  │     ├── {studioId}.json # Studio + sources + widgets
  │     └── ...
  ├── conversations/
  │     └── {studioId}.json # Messages par studio
  ├── presentations/
  │     └── {studioId}.json # Presentations par studio
  ├── favorites.json        # Favoris
  └── metadata.json         # Date d'export, version du schema
```

### 4.6 Droit d'opposition (Art. 21)

L'utilisateur peut s'opposer a certains traitements fondes sur l'interet legitime.

| Traitement | Opposition possible | Consequence |
|-----------|-------------------|-------------|
| Collecte d'IP/User Agent dans les sessions auth | Oui | Sessions creees sans ces metadonnees |
| Logs d'usage (GenerationRun) | Oui | Generation fonctionne, mais sans tracking des tokens et de la progression |
| Statistiques d'usage | Oui | Pas de compteurs d'usage dans le dashboard admin |

**Endpoint API** :

```
PATCH /api/privacy/preferences
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "collectTechnicalData": false,
  "collectUsageStats": false
}
```

### 4.7 Exercice des droits — Procedure

| Canal | Methode | Delai |
|-------|---------|-------|
| Interface Qiplim | Settings → Vie privee → boutons d'action | Immediat (acces, rectification) ou 24h (effacement, export) |
| Email | privacy@qiplim.com | 30 jours calendaires max |
| Courrier | Adresse du responsable de traitement | 30 jours calendaires max |
| Via l'institution (ENT) | L'administrateur de l'institution fait la demande | 30 jours calendaires max |

Pour les mineurs :
- < 15 ans : demande par le representant legal
- 15-17 ans : demande par l'eleve ou le representant legal
- L'institution peut faire la demande au nom de ses eleves (si deployment ENT)

---

## 5. Souverainete des donnees

### 5.1 Hebergement

| Composant | Fournisseur | Localisation | Certification |
|-----------|-------------|-------------|---------------|
| Compute (Next.js, workers) | Clever Cloud | France (Paris / Roubaix) | ISO 27001, HDS, SecNumCloud (en cours) |
| PostgreSQL | Clever Cloud | France | Meme certification |
| Redis | Clever Cloud | France | Meme certification |
| Stockage objet (S3) | Clever Cloud Cellar | France | Meme certification |

**Clever Cloud** est un hebergeur francais base a Nantes. Toutes les donnees restent dans des datacenters en France metropolitaine. Clever Cloud est certifie HDS (Hebergeur de Donnees de Sante), ce qui couvre largement les exigences des donnees educatives.

### 5.2 Modeles de deploiement

| Modele | Description | Controle des donnees | Pour qui |
|--------|-------------|---------------------|----------|
| **SaaS Qiplim** (cloud) | Heberge par Qiplim sur Clever Cloud France | Qiplim = sous-traitant, Institution = responsable de traitement | Etablissements souhaitant une solution geree |
| **Self-hosted** (on-premise) | L'institution heberge sur sa propre infrastructure | Institution controle tout | Rectorats, grandes universites, institutions sensibles |
| **Cloud prive** | Qiplim deploie sur l'infrastructure cloud de l'institution (OVH, Scaleway, etc.) | Institution = responsable et hebergeur | Institutions avec contraintes d'hebergement specifiques |

#### SaaS Qiplim — Garanties

- Donnees en France metropolitaine (pas de region EU hors France)
- Pas de replication hors France
- Backups dans le meme datacenter ou dans un autre datacenter Clever Cloud en France
- Acces aux donnees par l'equipe Qiplim uniquement pour le support technique (avec journalisation)

#### Self-hosted — Prerequis

```
Infrastructure minimale :
  - PostgreSQL 16 avec extension pgvector
  - Redis 7+
  - Stockage objet S3-compatible (MinIO, Ceph, etc.)
  - Node.js 20+
  - Reverse proxy avec TLS (nginx, Traefik, etc.)
  - [Optionnel] LLM local (Ollama + Mistral) pour zero transfert de donnees
```

L'institution fournit ses propres cles API pour les providers IA, ou deploie un LLM local.

### 5.3 Transferts hors EU — Analyse de risques

#### Transferts identifies

| Transfert | Destination | Donnees concernees | Frequence | Mitigations |
|-----------|-------------|-------------------|-----------|-------------|
| Appels API Mistral | France (EU) | Extraits de documents, prompts | A chaque generation | **Aucun risque** — provider francais, donnees EU |
| Appels API OpenAI | USA | Extraits de documents, prompts | Si BYOK ou choix utilisateur | DPA OpenAI, donnees non utilisees pour l'entrainement |
| Appels API Anthropic | USA | Extraits de documents, prompts | Si BYOK ou choix utilisateur | DPA Anthropic, donnees non utilisees pour l'entrainement |
| Appels API Google Gemini | USA / EU (configurable) | Extraits de documents, prompts | Si BYOK ou choix utilisateur | DPA Google Cloud, region EU possible |
| Unstructured.io (parsing) | USA | Contenu des documents | A chaque upload de document | Voir mitigation ci-dessous |
| Ably (Engage) | EU (Dublin) | Events de session (IDs, pas de contenu personnel) | En temps reel pendant les sessions | Pas de donnees personnelles dans les messages |

#### Mitigations par niveau

| Niveau | Strategy | Pour qui |
|--------|----------|----------|
| **Niveau 1 : Standard** | Mistral (defaut) + DPA avec sous-traitants US | La plupart des etablissements |
| **Niveau 2 : Renforce** | Mistral uniquement + parsing local des documents (remplacement Unstructured.io) | Etablissements sensibles |
| **Niveau 3 : Souverain** | Self-hosted + LLM local (Ollama) + parsing local + stockage on-premise | Rectorats, institutions avec exigences maximales |

#### Remplacement d'Unstructured.io (priorite haute)

Le parsing de documents via Unstructured.io implique un transfert du contenu des documents vers les USA. Cela pose un probleme pour les documents sensibles.

**Plan de mitigation** :
1. **Court terme** : informer l'utilisateur avant l'upload que le document sera traite par un service aux USA
2. **Moyen terme** : proposer un parsing local via `pdf-parse`, `mammoth`, `pptx-parser` (bibliotheques Node.js)
3. **Long terme** : deployer Unstructured.io en self-hosted (image Docker disponible) sur l'infrastructure Clever Cloud

### 5.4 Matrice de conformite par modele

| Exigence | SaaS Qiplim | Self-hosted | Cloud prive |
|----------|-------------|-------------|-------------|
| Donnees en France | Oui | Oui (si heberge en France) | Oui (si cloud francais) |
| Zero transfert hors EU | Non (si BYOK US) — Oui (si Mistral only) | Oui (si LLM local) | Oui (si LLM local) |
| Institution = responsable de traitement | Oui | Oui | Oui |
| Qiplim = sous-traitant | Oui | Non (support uniquement) | Optionnel |
| Audit par l'institution | Sur demande | Controle total | Controle total |
| Chiffrement au repos | Oui (Clever Cloud) | A configurer | A configurer |
| Backups en France | Oui | Responsabilite institution | Responsabilite institution |

---

## 6. Securite technique

### 6.1 Chiffrement

#### Au repos

| Composant | Algorithme | Gestion des cles |
|-----------|-----------|------------------|
| PostgreSQL (disque) | AES-256 (Clever Cloud managed) | Cles gerees par Clever Cloud |
| Cellar S3 (objets) | AES-256 SSE-S3 | Cles gerees par Clever Cloud |
| Cles API BYOK | AES-256-GCM (applicatif) | Cle derivee via `scrypt` depuis `BYOK_ENCRYPTION_KEY` |
| Mots de passe | bcrypt / argon2 (BetterAuth) | Salting automatique |
| Tokens OAuth | Stockes chiffres en base | Geres par BetterAuth |

#### En transit

| Flux | Protocole | Version minimale |
|------|-----------|-----------------|
| HTTPS (clients) | TLS | 1.2 (1.3 prefere) |
| PostgreSQL | TLS | 1.2 |
| Redis | TLS | 1.2 |
| WebSocket (Ably) | WSS (TLS) | 1.2 |
| API providers IA | HTTPS / TLS | 1.2 |

### 6.2 Authentification et autorisation

| Mecanisme | Implementation | Detail |
|-----------|----------------|--------|
| Authentification | BetterAuth | Email/password + Google OAuth |
| Sessions | Tokens signes, cookie HttpOnly | Expiration 7 jours, renouvellement automatique a 24h |
| Cookie flags | `HttpOnly`, `Secure`, `SameSite=Lax` | Pas accessible en JavaScript |
| Prefix securise | `__Secure-` prefix en HTTPS | Protection contre les attaques de cookie |
| Middleware | `middleware.ts` (Next.js) | Verification du token sur les routes protegees |
| Roles | `user`, `admin` | Admin = gestion des utilisateurs, pas d'acces aux contenus |
| BYOK token auth | Token presenter (Engage) | Token unique par session, verifie cote serveur |
| Sessions participant | Pas de compte requis | Code de session 6 caracteres, pseudonyme libre |

### 6.3 Validation des entrees

| Couche | Outil | Perimetre |
|--------|-------|-----------|
| API routes | Zod schemas | Toutes les routes API utilisent des schemas Zod pour valider les entrees |
| Formulaires client | Zod + react-hook-form | Validation cote client avant envoi |
| Base de donnees | Prisma (types) | Types stricts, contraintes d'integrite |
| Uploads | Validation MIME + taille | Limite de taille par fichier, types MIME autorises |

### 6.4 Protection contre les attaques courantes

| Attaque | Protection | Implementation |
|---------|-----------|----------------|
| **XSS** (Cross-Site Scripting) | Content Security Policy, echappement React | Next.js echappe par defaut, CSP configurable |
| **CSRF** (Cross-Site Request Forgery) | SameSite cookies, token CSRF (BetterAuth) | Cookies `SameSite=Lax` par defaut |
| **SQL Injection** | Prisma ORM (requetes parametrees) | Pas de SQL brut, queries Prisma typees |
| **SSRF** (Server-Side Request Forgery) | Validation des URLs avant fetch | URLs de sources validees avant traitement |
| **Rate limiting** | A implementer | Recommande : 100 req/min par IP pour les API, 10 req/min pour la generation IA |
| **Brute force login** | BetterAuth rate limiting | Verrouillage temporaire apres echecs repetes |
| **File upload malicious** | Validation MIME, taille max, pas d'execution | Les fichiers sont stockes dans S3, jamais executes cote serveur |

### 6.5 Journalisation et audit

#### Etat actuel

| Type de log | Implemente | Contenu |
|------------|-----------|---------|
| Logs applicatifs (serveur) | Oui (`logger`) | Erreurs, warnings, info — rotation 30 jours |
| Logs de generation | Oui (`GenerationRun`) | Type, status, tokens, erreurs — par studio |
| Logs d'authentification | Partiel (BetterAuth) | Connexions reussies via sessions, pas de log des echecs |
| Logs d'acces aux donnees | **Non implemente** | Requis pour la conformite |
| Logs d'actions admin | **Non implemente** | Requis pour la conformite |

#### A implementer (recommandations)

| Log | Contenu | Retention | Priorite |
|-----|---------|-----------|----------|
| **AuditLog** | userId, action, resource, resourceId, ipAddress, timestamp | 1 an | P1 — requis RGPD |
| Actions tracees | CREATE/UPDATE/DELETE sur studios, widgets, sources, comptes | — | P1 |
| Acces admin | Toute action d'un admin sur le compte d'un autre utilisateur | — | P1 |
| Export de donnees | Chaque demande d'export (Art. 15/20) | — | P1 |
| Suppression de compte | Date, methode, confirmation | — | P1 |

**Schema propose** :

```
model AuditLog {
  id          String   @id @default(cuid())
  userId      String?
  action      String   // CREATE, READ, UPDATE, DELETE, EXPORT, LOGIN, LOGOUT
  resource    String   // studio, widget, source, user, session
  resourceId  String?
  details     Json?    // informations supplementaires
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([resource, resourceId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### 6.6 Gestion des incidents

| Phase | Action | Delai |
|-------|--------|-------|
| Detection | Monitoring Clever Cloud + alertes applicatives | Immediat |
| Evaluation | Evaluer la nature et la portee de la violation | < 24h |
| Notification CNIL | Si risque pour les droits et libertes des personnes | < 72h (Art. 33 RGPD) |
| Notification des personnes | Si risque eleve pour les personnes | "Dans les meilleurs delais" (Art. 34 RGPD) |
| Notification de l'institution | Si deploiement institutionnel | < 24h apres detection |
| Remediation | Corriger la vulnerabilite, limiter l'impact | ASAP |
| Post-mortem | Documenter l'incident, mesures correctives | < 30 jours |

---

## 7. Data Processing Agreement (DPA)

### 7.1 Roles et responsabilites

| Acteur | Role RGPD | Responsabilites |
|--------|-----------|-----------------|
| **Institution** (lycee, universite, OF) | Responsable de traitement (Art. 4.7) | Definit les finalites du traitement, choisit Qiplim, informe les utilisateurs |
| **Qiplim** (Pando Studio SAS) | Sous-traitant (Art. 4.8) | Traite les donnees selon les instructions du responsable, assure la securite technique |
| **Providers IA** (Mistral, OpenAI, etc.) | Sous-traitant ulterieur (Art. 28.2) | Traitement de generation, sous les instructions de Qiplim |
| **Clever Cloud** | Sous-traitant ulterieur (Art. 28.2) | Hebergement et stockage |
| **Ably** | Sous-traitant ulterieur (Art. 28.2) | Transport temps reel (Engage uniquement) |

### 7.2 Contenu du DPA (Art. 28 RGPD)

Le DPA entre l'institution et Qiplim couvre :

| Clause | Contenu |
|--------|---------|
| **Objet et duree** | Mise a disposition de la plateforme Qiplim pour la creation et l'animation de contenus pedagogiques interactifs. Duree du contrat. |
| **Nature et finalite du traitement** | Creation de contenus pedagogiques (studios, widgets), animation de sessions interactives, suivi des resultats pedagogiques. |
| **Categories de personnes concernees** | Enseignants/formateurs, eleves/apprenants (y compris mineurs), administrateurs. |
| **Categories de donnees** | Donnees d'identification, contenus pedagogiques, reponses aux activites, scores, donnees techniques (voir section 1). |
| **Obligations du sous-traitant** | Traitement sur instructions documentees uniquement, confidentialite, securite (Art. 32), notification des violations (< 48h), assistance aux droits des personnes, suppression en fin de contrat. |
| **Sous-traitants ulterieurs** | Liste exhaustive (section 7.3), autorisation prealable ecrite pour tout changement. |
| **Transferts hors EU** | Liste des transferts (section 5.3), clauses contractuelles types si applicable, evaluation d'impact si provider US. |
| **Audit** | L'institution peut auditer Qiplim sur site ou sur pieces, avec un preavis raisonnable (30 jours). |
| **Fin du contrat** | Restitution de toutes les donnees (export complet) + suppression dans les 90 jours, sur instruction du responsable. |

### 7.3 Registre des sous-traitants ulterieurs

| Sous-traitant | Pays | Donnees traitees | Garanties | DPA |
|---------------|------|-----------------|-----------|-----|
| **Clever Cloud** | France | Toutes les donnees (hebergement) | HDS, ISO 27001 | Inclus dans le contrat d'hebergement |
| **Mistral AI** | France | Extraits de documents (generation) | RGPD natif, donnees EU | DPA Mistral standard |
| **OpenAI** | USA | Extraits de documents (si BYOK) | DPA, pas d'entrainement via API | DPA OpenAI + SCC |
| **Anthropic** | USA | Extraits de documents (si BYOK) | DPA, pas d'entrainement via API | DPA Anthropic + SCC |
| **Google** | USA / EU | Extraits de documents (si BYOK) | DPA Google Cloud, region EU possible | DPA Google + SCC |
| **Ably** | Ireland (EU) | Events de session (pas de donnees personnelles) | RGPD compliant | DPA Ably standard |
| **Unstructured.io** | USA | Contenu des documents (parsing) | DPA disponible | DPA + SCC (a mettre en place) |

**SCC** = Standard Contractual Clauses (Clauses Contractuelles Types de la Commission europeenne, decision 2021/914).

### 7.4 Template DPA simplifie

Un template DPA est disponible pour les institutions. Il inclut :
1. Le contrat principal (conditions generales)
2. L'annexe 1 : description du traitement (categories de donnees, personnes, finalites)
3. L'annexe 2 : mesures techniques et organisationnelles (securite)
4. L'annexe 3 : liste des sous-traitants ulterieurs
5. L'annexe 4 : clauses specifiques mineurs (si applicable)

**Contact** : dpo@qiplim.com pour obtenir le template DPA.

---

## 8. Conformite specifique Education Nationale

### 8.1 Cadre reglementaire

| Texte | Application a Qiplim |
|-------|---------------------|
| **RGPD** (Reglement UE 2016/679) | Applicable integralement — base legale de tout le document |
| **Loi Informatique et Libertes** (loi 78-17 modifiee) | Seuil mineur a 15 ans (vs 16 ans RGPD), CNIL = autorite de controle |
| **Code de l'education** (Art. L131-2, D111-1) | Protection des donnees des eleves, droits des parents |
| **Circulaire MEN n° 2017-079** | Usage du numerique educatif, protection des donnees scolaires |
| **Doctrine cloud au centre** (circulaire PM 2021) | Preference pour les solutions cloud qualifiees (SecNumCloud) |
| **SDET** (Schema Directeur des ENT, v6.3) | Interoperabilite avec les ENT, standards d'echange |

### 8.2 Schema Directeur des ENT (SDET)

Le SDET definit les normes d'interoperabilite pour les outils numeriques educatifs. Qiplim doit s'y conformer pour etre integre aux ENT des academies.

| Exigence SDET | Statut Qiplim | Plan |
|---------------|---------------|------|
| **Authentification CAS** (Central Authentication Service) | Non implemente | P2 — a integrer via BetterAuth custom provider |
| **SAML 2.0** (federation d'identite) | Non implemente | P2 — standard ENT, a integrer |
| **Provisioning SCIM** (gestion des comptes) | Non implemente | P3 — creation/suppression automatique des comptes |
| **Profil SDET utilisateur** (attributs standard) | Non implemente | P2 — mapper les attributs ENT vers le modele Qiplim |
| **Annuaire LDAP** | Non implemente | P3 — optionnel, SAML prefere |

**Attributs SDET a supporter** :

| Attribut SDET | Mapping Qiplim | Requis |
|---------------|---------------|--------|
| `uid` | `user.id` (identifiant opaque) | Oui |
| `mail` | `user.email` | Oui |
| `displayName` | `user.name` | Oui |
| `eduPersonAffiliation` | `user.role` (mapping: student → user, staff → user, faculty → user) | Oui |
| `eduPersonPrimaryAffiliation` | Determine les permissions dans Qiplim | Oui |
| `supannEtablissement` | Metadata de l'institution (pour le multi-tenant) | Souhaite |
| `supannEtuId` | Identifiant etudiant opaque | Optionnel |

### 8.3 GAR (Gestionnaire d'Acces aux Ressources)

Le GAR est le service du Ministere de l'Education Nationale qui gere l'acces aux ressources numeriques educatives. L'integration GAR permet a Qiplim d'etre accessible depuis les ENT sans re-authentification.

| Aspect | Detail |
|--------|--------|
| **Protocole** | SAML 2.0 (le GAR est un IdP federateur) |
| **Donnees recues** | Identifiant opaque, profil (enseignant/eleve), etablissement, niveau de classe |
| **Donnees NON recues** | Nom, prenom, email, date de naissance (le GAR ne transmet que le minimum) |
| **Avantage RGPD** | Anonymisation native : Qiplim ne recoit jamais l'identite civile de l'eleve |
| **Prerequis** | Etre reference dans le catalogue GAR (procedure d'inscription aupres du MEN) |
| **Statut Qiplim** | Non implemente — a evaluer pour le deploiement academique |

### 8.4 Donnees scolaires — Compatibilite

| Systeme MEN | Description | Interaction avec Qiplim |
|-------------|-------------|------------------------|
| **SIECLE** | Base eleves (identite, scolarite) | Aucune interaction directe. Les donnees SIECLE restent dans SIECLE. Si SSO ENT, seul l'identifiant opaque est transmis. |
| **LSU / LSL** (Livret Scolaire) | Evaluations et competences | Qiplim ne contribue PAS au livret scolaire. Les scores restent dans Qiplim sauf export xAPI explicite par l'enseignant. |
| **Pronote / Ecole Directe** | Logiciels de vie scolaire | Pas d'integration directe. L'enseignant peut exporter des resultats manuellement. |
| **Moodle / LMS** | Plateformes LMS | Export SCORM/xAPI prevu (voir specs/interoperability.md) pour integration dans les LMS institutionnels. |

### 8.5 Recommandations pour le deploiement academique

| Etape | Action | Responsable |
|-------|--------|-------------|
| 1 | Signer le DPA avec l'institution (section 7) | DSI + DPO de l'institution |
| 2 | Choisir le modele de deploiement (section 5.2) | DSI |
| 3 | Configurer le provider IA (Mistral recommande pour la souverainete) | Admin Qiplim |
| 4 | Si mineurs : activer les protections (section 3) | Admin institution |
| 5 | Integrer l'ENT si disponible (SSO SAML/CAS) | DSI + equipe Qiplim |
| 6 | Former les enseignants (configuration de la vie privee, pseudonymes) | Referent numerique |
| 7 | Informer les parents (notice vie privee) | Chef d'etablissement |
| 8 | Renseigner le registre de traitement de l'institution | DPO |

### 8.6 AIPD (Analyse d'Impact sur la Protection des Donnees)

Une AIPD (Art. 35 RGPD) est obligatoire quand le traitement est susceptible d'engendrer un risque eleve pour les personnes. Dans le cas de Qiplim deploye pour des mineurs, une AIPD est **recommandee**.

**Criteres declencheurs (CNIL)** :

| Critere | Qiplim |
|---------|--------|
| Donnees de personnes vulnerables (mineurs) | **Oui** (si deploiement scolaire) |
| Evaluation/scoring | **Oui** (scores aux quiz, classements) |
| Collecte a grande echelle | **Possible** (deploiement academique) |
| Usage innovant (IA) | **Oui** (generation par LLM) |

**Recommandation** : realiser une AIPD avec le DPO de l'institution avant tout deploiement impliquant des mineurs. Qiplim fournit les elements techniques (ce document) et l'assistance necessaire.

---

## Annexe A — Checklist de conformite

### Pour l'institution (responsable de traitement)

- [ ] DPA signe avec Qiplim
- [ ] Registre de traitement mis a jour (Art. 30)
- [ ] Notice d'information aux utilisateurs redigee et diffusee
- [ ] Si mineurs < 15 ans : formulaire de consentement parental prepare
- [ ] Si mineurs : AIPD realisee avec le DPO
- [ ] Modele de deploiement choisi (SaaS / self-hosted / cloud prive)
- [ ] Provider IA valide (Mistral recommande pour la souverainete)
- [ ] Referent numerique forme
- [ ] Procedure d'exercice des droits documentee
- [ ] Procedure de gestion des incidents documentee

### Pour Qiplim (sous-traitant)

- [ ] DPA template disponible et a jour
- [ ] Registre des sous-traitants ulterieurs a jour (section 7.3)
- [ ] Chiffrement au repos et en transit verifie
- [ ] Endpoints de droits RGPD implementes (sections 4.2 a 4.6)
- [ ] Audit logs implementes (section 6.5)
- [ ] Procedure de notification des violations documentee (< 48h)
- [ ] Suppression en cascade testee et documentee (section 4.4)
- [ ] Export de donnees teste et documente (section 4.5)
- [ ] Parsing local des documents disponible (alternative a Unstructured.io)
- [ ] SSO SAML/CAS integre (pour le deploiement ENT)

---

## Annexe B — Glossaire

| Terme | Definition |
|-------|-----------|
| **RGPD** | Reglement General sur la Protection des Donnees (UE 2016/679) |
| **CNIL** | Commission Nationale de l'Informatique et des Libertes (autorite francaise) |
| **DPA** | Data Processing Agreement (contrat de sous-traitance Art. 28) |
| **DPO** | Data Protection Officer / Delegue a la Protection des Donnees |
| **AIPD** / **DPIA** | Analyse d'Impact sur la Protection des Donnees (Art. 35) |
| **SCC** | Standard Contractual Clauses (Clauses Contractuelles Types) |
| **BYOK** | Bring Your Own Key (l'utilisateur fournit ses propres cles API) |
| **ENT** | Environnement Numerique de Travail |
| **GAR** | Gestionnaire d'Acces aux Ressources (MEN) |
| **SDET** | Schema Directeur des ENT |
| **SIECLE** | Systeme d'Information pour les Eleves en Colleges et Lycees |
| **LSU** / **LSL** | Livret Scolaire Unique / Livret Scolaire du Lycee |
| **HDS** | Hebergeur de Donnees de Sante (certification ASIP Sante) |
| **SecNumCloud** | Qualification ANSSI pour les services cloud de confiance |
| **RAG** | Retrieval-Augmented Generation (generation augmentee par la recherche) |

---

## Annexe C — Contacts

| Role | Contact |
|------|---------|
| DPO Qiplim | dpo@qiplim.com |
| Vie privee (exercice des droits) | privacy@qiplim.com |
| Securite (incidents) | security@qiplim.com |
| Support technique | support@qiplim.com |
| CNIL | www.cnil.fr — 01 53 73 22 22 |

---

> **Note** : ce document est une specification technique destinee a informer les acheteurs institutionnels. Il ne constitue pas un avis juridique. Chaque institution doit valider la conformite avec son propre DPO et ses juristes.
