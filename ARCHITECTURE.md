# Architecture & Roadmap — Plateforme SaaS Hajj & Oumra

> Document de référence technique et stratégique — v1.0 — Août 2026

---

## Table des matières

1. [Vision & Objectifs](#1-vision--objectifs)
2. [Les trois espaces](#2-les-trois-espaces)
3. [Architecture multi-tenant](#3-architecture-multi-tenant)
4. [Stratégie domaines & sous-domaines](#4-stratégie-domaines--sous-domaines)
5. [Schéma de base de données](#5-schéma-de-base-de-données)
6. [RBAC — Rôles & Permissions](#6-rbac--rôles--permissions)
7. [Architecture applicative](#7-architecture-applicative)
8. [Structure des dossiers](#8-structure-des-dossiers)
9. [Stack technique](#9-stack-technique)
10. [Système de customisation des portails](#10-système-de-customisation-des-portails)
11. [Audit trail — Traçabilité des actions](#11-audit-trail--traçabilité-des-actions)
12. [Migration depuis le code existant](#12-migration-depuis-le-code-existant)
13. [Roadmap par phases](#13-roadmap-par-phases)
14. [Variables d'environnement](#14-variables-denvironnement)
15. [Décisions techniques clés](#15-décisions-techniques-clés)

---

## 1. Vision & Objectifs

### Produit

Une plateforme SaaS verticale pour les **agences de voyage spécialisées Hajj & Oumra** en Afrique de l'Ouest. Chaque agence partenaire obtient :

- Un **portail public** brandé à son image (présentation, offres, réservations)
- Un **espace admin** pour gérer ses équipes, ses pèlerins, ses offres
- Une **isolation totale** de ses données vis-à-vis des autres agences

Nous (l'éditeur de la plateforme) disposons d'un **super-admin** pour gérer l'ensemble des agences, des abonnements et de la configuration globale.

### Modèle économique

```
Agence partenaire → abonnement mensuel/annuel
  Plan Starter   : jusqu'à 50 pèlerins/an
  Plan Pro       : jusqu'à 300 pèlerins/an + domaine custom
  Plan Enterprise: illimité + support dédié + API
```

---

## 2. Les trois espaces

```
┌─────────────────────────────────────────────────────────────┐
│  ESPACE 1 — SUPER ADMIN                                      │
│  admin.hajj-platform.com                                     │
│  Gestion globale : agences, plans, config, monitoring        │
├─────────────────────────────────────────────────────────────┤
│  ESPACE 2 — ADMIN AGENCE                                     │
│  dashboard.{slug}.hajj-platform.com                          │
│  ou dashboard.agencepropre.com                               │
│  Gestion interne : pèlerins, offres, agents, finances        │
├─────────────────────────────────────────────────────────────┤
│  ESPACE 3 — PORTAIL PUBLIC AGENCE                            │
│  {slug}.hajj-platform.com                                    │
│  ou www.agencepropre.com                                     │
│  Vitrine publique : offres, réservations, contact, outils    │
└─────────────────────────────────────────────────────────────┘
```

### Espace 1 — Super Admin

Accessible uniquement par l'équipe de la plateforme.

| Fonctionnalité | Description |
|---|---|
| Gestion des agences | Créer, suspendre, supprimer une agence partenaire |
| Gestion des plans | Configurer les limites par plan (pèlerins, features) |
| Configuration globale | Thèmes de base, templates, langues disponibles |
| Monitoring | Usage par agence, erreurs, uptime |
| Facturation | Suivi des abonnements, relances |
| Impersonation | Se connecter en tant qu'admin d'une agence pour le support |
| Audit global | Voir toutes les actions de toutes les agences |

### Espace 2 — Admin Agence

Accessible par les admins et agents de chaque agence.

| Module | Fonctionnalités |
|---|---|
| Dashboard | Stats : pèlerins, réservations, revenus, taux de conversion |
| Pèlerins | Fiche complète, documents, statut visa, paiements |
| Offres | CRUD complet des offres (Hajj, Oumra) |
| Réservations | Gestion des dossiers, workflow de statuts |
| Équipe | Créer des agents, assigner des rôles, voir les actions |
| Portail | Personnaliser le portail public (couleurs, logo, textes) |
| Messages | Contact entrants, réponses |
| Documents | Modèles PDF (livrets, reçus, fiches visa) |
| Finances | Acomptes, soldes, paiements |
| Avis | Modérer les avis clients |
| Paramètres | Infos agence, domaine custom, intégrations |

### Espace 3 — Portail Public

Vitrine de l'agence, template issu du site actuel ZAM.

| Section | Contenu |
|---|---|
| Homepage | Hero, stats, offres vedettes, avis, FAQ |
| Offres | Listing + détail (vols, hôtels, programme, tarifs) |
| À propos | Histoire, équipe, valeurs |
| Outils pèlerin | Coran, Qibla, Guide des rites |
| Contact | Formulaire, WhatsApp |
| Compte pèlerin | Login, espace personnel, mes réservations |

---

## 3. Architecture multi-tenant

### Stratégie : Single Database, Tenant ID par document

Chaque document MongoDB porte un champ `tenantId` qui est l'ID de l'agence. C'est la stratégie la plus simple et la plus adaptée à MongoDB.

```
MongoDB Atlas
└── hajj-platform (database)
    ├── tenants          ← les agences
    ├── users            ← tous les utilisateurs (tenantId = null pour superadmin)
    ├── offers           ← offres par agence
    ├── reservations     ← réservations par agence
    ├── pilgrims         ← pèlerins par agence
    ├── reviews          ← avis par agence
    ├── contact_messages ← messages par agence
    ├── audit_logs       ← toutes les actions
    └── ...
```

### Règle fondamentale

> **Toute requête Prisma/MongoDB sur une ressource métier DOIT inclure le filtre `tenantId`.**
> Cette règle ne souffre aucune exception. Un middleware applicatif l'enforcer à chaque requête API.

### Isolation par contexte

```typescript
// src/lib/tenant-context.ts
// Le tenantId est résolu depuis :
// 1. Le sous-domaine/domaine de la requête
// 2. Le token JWT de session (tenantId inclus dans le payload)
// 3. Jamais depuis le corps de la requête (sécurité)

export async function getTenantContext(req: Request): Promise<TenantContext> {
  const host = req.headers.get('host')
  const tenant = await resolveTenantFromHost(host)
  return { tenantId: tenant.id, tenant }
}
```

---

## 4. Stratégie domaines & sous-domaines

### Phase 1 — Sous-domaines wildcard (immédiat)

```
hajj-platform.com              → Landing page de la plateforme (notre vitrine)
admin.hajj-platform.com        → Super admin
zam.hajj-platform.com          → Portail public ZAM
dashboard.zam.hajj-platform.com → Admin ZAM
abc.hajj-platform.com          → Portail public agence ABC
dashboard.abc.hajj-platform.com → Admin agence ABC
```

**Configuration DNS :**
```
*.hajj-platform.com       → CNAME → votre-app.netlify.app
*.*.hajj-platform.com     → CNAME → votre-app.netlify.app
```

**Résolution du tenant dans le code (middleware) :**
```typescript
// src/middleware.ts
const host = request.headers.get('host') // "zam.hajj-platform.com"
const slug = host.split('.')[0]          // "zam"
// → chercher le tenant avec ce slug dans la DB
```

### Phase 2 — Domaines custom (Plan Pro+)

L'agence peut pointer `www.agencezam.com` vers la plateforme.

```
www.agencezam.com → CNAME → zam.hajj-platform.com
```

**Côté plateforme :**
- Stocker le `customDomain` dans le modèle `Tenant`
- Le middleware résout d'abord par domaine exact, puis par sous-domaine
- SSL : Netlify/Vercel gèrent automatiquement le certificat Let's Encrypt

---

## 5. Schéma de base de données

> **Migration complète** du schéma actuel. Toutes les entités gagnent un `tenantId`.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// ─── TENANT (AGENCE PARTENAIRE) ──────────────────────────────────────────────

model Tenant {
  id           String       @id @default(auto()) @map("_id") @db.ObjectId
  slug         String       @unique           // "zam", "agence-abc"
  name         String                         // "ZAM Hajj & Oumra"
  email        String                         // email de contact de l'agence
  phone        String?
  address      String?
  country      String       @default("NE")    // ISO 3166-1
  customDomain String?                        // "www.agencezam.com" — unicité via index SPARSE MongoDB (voir schema.prisma)
  plan         Plan         @default(STARTER)
  status       TenantStatus @default(ACTIVE)
  trialEndsAt  DateTime?
  theme        Json?                          // config de customisation du portail
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  createdBy    String?                        // ID du superadmin créateur

  users        User[]
  offers       Offer[]
  reservations Reservation[]
  pilgrims     Pilgrim[]
  reviews      Review[]
  messages     ContactMessage[]
  auditLogs    AuditLog[]
}

// ─── USER (TOUS LES UTILISATEURS) ────────────────────────────────────────────

model User {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  tenantId  String?   @db.ObjectId           // null = superadmin plateforme
  email     String
  name      String
  phone     String?
  password  String
  role      UserRole  @default(PILGRIM)
  permissions String[]                       // permissions granulaires
  active    Boolean   @default(true)
  lastLoginAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  createdBy String?   @db.ObjectId           // qui a créé ce compte

  tenant       Tenant?       @relation(fields: [tenantId], references: [id])
  reservations Reservation[]
  auditLogs    AuditLog[]

  @@unique([tenantId, email])                // email unique PAR agence
}

// ─── PILGRIM (FICHE PÈLERIN COMPLÈTE) ────────────────────────────────────────

model Pilgrim {
  id            String          @id @default(auto()) @map("_id") @db.ObjectId
  tenantId      String          @db.ObjectId
  userId        String?         @db.ObjectId  // lié à un compte si existant
  firstName     String
  lastName      String
  email         String?
  phone         String?
  birthDate     DateTime?
  nationality   String?
  passportNumber String?
  passportExpiry DateTime?
  medicalNotes  String?
  category      PilgrimCategory @default(ADULT)
  status        PilgrimStatus   @default(REGISTERED)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  createdBy     String?         @db.ObjectId

  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  reservations Reservation[]
}

// ─── OFFER ───────────────────────────────────────────────────────────────────

model Offer {
  id            String    @id @default(auto()) @map("_id") @db.ObjectId
  tenantId      String    @db.ObjectId
  slug          String
  type          OfferType
  titleFr       String
  titleEn       String?
  titleAr       String?
  descFr        String
  descEn        String?
  descAr        String?
  departureDate DateTime?
  returnDate    DateTime?
  priceBaby     Float?
  priceChild    Float?
  priceAdult    Float
  priceCouple   Float?
  currency      String    @default("FCFA")
  provisional   Boolean   @default(false)
  active        Boolean   @default(true)
  data          Json?     // vols, hôtels, programme, documents (structure flexible)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  createdBy     String?   @db.ObjectId

  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  reservations Reservation[]

  @@unique([tenantId, slug])
}

// ─── RESERVATION ─────────────────────────────────────────────────────────────

model Reservation {
  id          String            @id @default(auto()) @map("_id") @db.ObjectId
  tenantId    String            @db.ObjectId
  pilgrimId   String?           @db.ObjectId
  userId      String?           @db.ObjectId  // compte pèlerin (si connecté)
  offerId     String            @db.ObjectId
  category    PilgrimCategory
  status      ReservationStatus @default(PENDING)
  deposit     Float?            // acompte versé
  totalAmount Float?
  notes       String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  createdBy   String?           @db.ObjectId

  tenant  Tenant   @relation(fields: [tenantId], references: [id])
  pilgrim Pilgrim? @relation(fields: [pilgrimId], references: [id])
  user    User?    @relation(fields: [userId], references: [id])
  offer   Offer    @relation(fields: [offerId], references: [id])
}

// ─── REVIEW ──────────────────────────────────────────────────────────────────

model Review {
  id        String  @id @default(auto()) @map("_id") @db.ObjectId
  tenantId  String  @db.ObjectId
  name      String
  rating    Int
  comment   String
  approved  Boolean @default(false)
  createdAt DateTime @default(now())
  createdBy String?  @db.ObjectId

  tenant Tenant @relation(fields: [tenantId], references: [id])
}

// ─── CONTACT MESSAGE ─────────────────────────────────────────────────────────

model ContactMessage {
  id        String  @id @default(auto()) @map("_id") @db.ObjectId
  tenantId  String  @db.ObjectId
  name      String
  email     String
  phone     String?
  subject   String
  message   String
  read      Boolean @default(false)
  createdAt DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])
}

// ─── AUDIT LOG ───────────────────────────────────────────────────────────────

model AuditLog {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  tenantId   String?  @db.ObjectId
  userId     String   @db.ObjectId
  userEmail  String
  userName   String
  action     String   // "reservation.created", "pilgrim.updated", "offer.deleted"...
  resource   String   // "Reservation", "Pilgrim", "Offer"...
  resourceId String?
  before     Json?    // état avant (pour les updates)
  after      Json?    // état après
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())

  tenant Tenant? @relation(fields: [tenantId], references: [id])
  user   User    @relation(fields: [userId], references: [id])
}

// ─── ENUMS ───────────────────────────────────────────────────────────────────

enum Plan {
  STARTER     // 50 pèlerins/an
  PRO         // 300 pèlerins/an + domaine custom
  ENTERPRISE  // illimité
}

enum TenantStatus {
  ACTIVE
  SUSPENDED
  TRIAL
  CANCELLED
}

enum UserRole {
  SUPER_ADMIN   // équipe plateforme
  AGENCY_ADMIN  // propriétaire/directeur agence
  AGENCY_AGENT  // agent de l'agence (rôle limité)
  PILGRIM       // pèlerin (accès portail uniquement)
}

enum OfferType {
  UMRAH
  HAJJ
}

enum PilgrimCategory {
  BABY
  CHILD
  ADULT
  COUPLE
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum PilgrimStatus {
  REGISTERED
  DOCUMENTS_PENDING
  VISA_APPLIED
  VISA_APPROVED
  DEPARTED
  RETURNED
  CANCELLED
}
```

---

## 6. RBAC — Rôles & Permissions

### Hiérarchie des rôles

```
SUPER_ADMIN
  └── peut tout faire sur toutes les agences
      └── AGENCY_ADMIN (par tenant)
            ├── peut tout faire dans son agence
            └── AGENCY_AGENT (par tenant, permissions variables)
                  └── PILGRIM (accès lecture de ses propres données)
```

### Permissions granulaires (AGENCY_AGENT)

Les agents peuvent avoir un sous-ensemble de ces permissions :

```typescript
export const PERMISSIONS = {
  // Pèlerins
  'pilgrims:read':   'Voir les pèlerins',
  'pilgrims:write':  'Créer/modifier des pèlerins',
  'pilgrims:delete': 'Supprimer des pèlerins',

  // Réservations
  'reservations:read':   'Voir les réservations',
  'reservations:write':  'Créer/modifier des réservations',
  'reservations:delete': 'Annuler des réservations',

  // Offres
  'offers:read':   'Voir les offres',
  'offers:write':  'Créer/modifier des offres',
  'offers:delete': 'Supprimer des offres',

  // Messages
  'messages:read':  'Voir les messages',
  'messages:reply': 'Répondre aux messages',

  // Finances
  'finances:read':  'Voir les paiements',
  'finances:write': 'Enregistrer des paiements',

  // Équipe
  'team:read':   'Voir l\'équipe',
  'team:write':  'Gérer les agents',

  // Avis
  'reviews:moderate': 'Modérer les avis',

  // Portail
  'portal:customize': 'Personnaliser le portail',

  // Audit
  'audit:read': 'Voir les logs d\'audit',
} as const

export type Permission = keyof typeof PERMISSIONS
```

### Profils d'agent prédéfinis

```typescript
export const AGENT_PROFILES = {
  COMMERCIAL: ['pilgrims:read', 'pilgrims:write', 'reservations:read', 'reservations:write', 'messages:read', 'messages:reply'],
  COMPTABLE:  ['finances:read', 'finances:write', 'reservations:read', 'pilgrims:read'],
  GUIDE:      ['pilgrims:read', 'reservations:read'],
  MODERATEUR: ['reviews:moderate', 'messages:read', 'messages:reply'],
}
```

---

## 7. Architecture applicative

### Vue d'ensemble

```
                    ┌──────────────────────────────────┐
                    │          DNS / CDN               │
                    │   Wildcard *.hajj-platform.com   │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │     Next.js App (Netlify/Vercel)  │
                    │                                  │
                    │  src/middleware.ts               │
                    │  ┌─────────────────────────────┐ │
                    │  │ 1. Résoudre le tenant        │ │
                    │  │    depuis le host            │ │
                    │  │ 2. Router vers l'espace      │ │
                    │  │    correct (public/admin/    │ │
                    │  │    superadmin)               │ │
                    │  │ 3. Vérifier auth & perms     │ │
                    │  └─────────────────────────────┘ │
                    │                                  │
                    │  ┌──────────┐ ┌───────────────┐  │
                    │  │ App      │ │ API Routes    │  │
                    │  │ Router   │ │ /api/...      │  │
                    │  └──────────┘ └───────────────┘  │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │         Prisma ORM               │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │       MongoDB Atlas               │
                    └──────────────────────────────────┘
```

### Middleware central (src/middleware.ts)

```typescript
// Logique de routage par host
//
// admin.hajj-platform.com          → /superadmin/...
// dashboard.{slug}.hajj-platform.com → /agency-admin/...
// {slug}.hajj-platform.com         → /public/...
// www.customdomain.com             → /public/... (résolution par customDomain)
```

### Structure des routes App Router

```
src/app/
├── (superadmin)/           → admin.hajj-platform.com
│   ├── layout.tsx
│   ├── page.tsx            → Dashboard superadmin
│   ├── tenants/            → Gestion des agences
│   ├── plans/              → Plans d'abonnement
│   └── settings/           → Config globale
│
├── (agency-admin)/         → dashboard.{slug}.hajj-platform.com
│   ├── layout.tsx
│   ├── page.tsx            → Dashboard agence
│   ├── pilgrims/           → Gestion pèlerins
│   ├── offers/             → Gestion offres
│   ├── reservations/       → Gestion réservations
│   ├── team/               → Gestion agents
│   ├── messages/           → Messages entrants
│   ├── reviews/            → Modération avis
│   ├── finances/           → Paiements
│   ├── portal/             → Customisation portail
│   └── settings/           → Paramètres agence
│
├── (public)/[locale]/      → {slug}.hajj-platform.com
│   ├── layout.tsx          → Header/Footer themé
│   ├── page.tsx            → Homepage
│   ├── offres/             → Offres
│   ├── a-propos/
│   ├── contact/
│   ├── compte/             → Espace pèlerin
│   ├── coran/
│   ├── qibla/
│   └── guide-pelerin/
│
└── api/
    ├── auth/               → login, logout, register
    ├── tenant/             → résolution tenant
    ├── offers/
    ├── reservations/
    ├── pilgrims/
    ├── reviews/
    ├── messages/
    └── admin/              → routes superadmin protégées
```

---

## 8. Structure des dossiers

```
zam_oumra_et_hajj/
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── app/
│   │   ├── (superadmin)/
│   │   ├── (agency-admin)/
│   │   ├── (public)/
│   │   └── api/
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── public/        → Header, Footer pour portail public
│   │   │   ├── admin/         → Sidebar, TopBar pour dashboards
│   │   │   └── superadmin/    → Layout superadmin
│   │   └── ui/                → Composants réutilisables
│   │
│   ├── lib/
│   │   ├── prisma.ts          → Client Prisma singleton
│   │   ├── session.ts         → JWT session (étendre avec tenantId)
│   │   ├── tenant.ts          → Résolution tenant depuis host
│   │   ├── permissions.ts     → RBAC helpers
│   │   ├── audit.ts           → Logger d'audit
│   │   └── offers-data.ts     → Données statiques (à migrer en DB)
│   │
│   ├── i18n/                  → Config next-intl (existant)
│   ├── messages/              → Traductions FR/EN/AR
│   │
│   ├── middleware.ts          → Routage multi-tenant central
│   │
│   └── types/
│       ├── tenant.ts
│       ├── session.ts
│       └── permissions.ts
│
├── public/
│   └── images/                → Assets publics (logos agences en DB/storage)
│
├── ARCHITECTURE.md            → Ce fichier
├── next.config.ts
└── package.json
```

---

## 9. Stack technique

| Couche | Technologie | Justification |
|---|---|---|
| Framework | Next.js 16 (App Router) | Existant, SSR, API Routes |
| Base de données | MongoDB Atlas | Existant, flexible pour JSON (offres, thèmes) |
| ORM | Prisma 6 | Existant, typage fort |
| Auth | jose (JWT custom) | Existant — étendre le payload |
| i18n | next-intl 4 | Existant — FR/EN/AR |
| CSS | Tailwind CSS v4 | Existant |
| Déploiement | Netlify | Existant — supporte wildcards |
| Emails transactionnels | Resend | Simple, API moderne, 3000 emails/mois gratuits |
| Stockage fichiers | Cloudinary ou Supabase Storage | Photos pèlerins, documents, logos |
| PDF | @react-pdf/renderer | Génération côté serveur, React-friendly |
| Paiements | CinetPay ou Mollie | Adapté Afrique de l'Ouest (Orange Money, Moov) |

### Dépendances à ajouter

```json
{
  "resend": "^4.x",
  "@react-pdf/renderer": "^4.x",
  "cloudinary": "^2.x",
  "zod": "^3.x",
  "react-hook-form": "^7.x",
  "@tanstack/react-query": "^5.x"
}

// Supprimer :
// "next-auth" (jamais utilisé)
```

---

## 10. Système de customisation des portails

### Modèle de thème (stocké en JSON dans Tenant.theme)

```typescript
type TenantTheme = {
  // Couleurs
  primaryColor: string       // "#1a6b4a"
  secondaryColor: string     // "#c9a84c"
  accentColor: string        // "#e8f5e9"

  // Logo & images
  logoUrl: string
  faviconUrl: string
  heroImageUrl: string

  // Textes
  tagline: string            // "Votre voyage vers les Lieux Saints"
  footerText: string

  // Coordonnées
  whatsappNumber: string
  facebookUrl: string?
  address: string?

  // Features activées
  features: {
    coran: boolean
    qibla: boolean
    guide: boolean
    shop: boolean
    ticketing: boolean
  }

  // Langue par défaut
  defaultLocale: 'fr' | 'en' | 'ar'
}
```

### Niveau de customisation par acteur

| Élément | Super Admin | Agency Admin | Résultat |
|---|---|---|---|
| Couleurs du thème | Définit les templates | Choisit parmi templates | Thème cohérent |
| Logo / Favicon | — | Upload libre | Branding agence |
| Images hero | Fournit des banques | Choisit ou upload | Visuels adaptés |
| Textes de la page | Définit la structure | Édite le contenu | Contenu agence |
| Features (Coran, etc.) | Active/désactive globalement | Active si droit | Feature flags |
| Domaine | Configure l'infra | Renseigne son domaine | Domaine custom |

---

## 11. Audit trail — Traçabilité des actions

### Principe

Chaque action métier est loguée : **qui, quoi, quand, sur quelle ressource, avant/après**.

### Helper d'audit

```typescript
// src/lib/audit.ts
export async function logAction(params: {
  userId: string
  userEmail: string
  userName: string
  tenantId?: string
  action: AuditAction        // "reservation.created"
  resource: string           // "Reservation"
  resourceId?: string
  before?: object
  after?: object
  req?: Request
}) {
  await prisma.auditLog.create({ data: { ...params, createdAt: new Date() } })
}
```

### Actions auditées (liste principale)

```
auth.login / auth.logout / auth.register
pilgrim.created / pilgrim.updated / pilgrim.deleted
offer.created / offer.updated / offer.deleted
reservation.created / reservation.status_changed / reservation.cancelled
review.approved / review.rejected
message.read / message.replied
team.agent_created / team.agent_updated / team.permissions_changed
portal.theme_updated
tenant.created / tenant.suspended / tenant.plan_changed
```

---

## 12. Migration depuis le code existant

### Ce qui est réutilisable tel quel
- Pages publiques `(public)/` — reprendre les 16 pages existantes
- Composants UI (Header, Footer, WhatsApp)
- Données statiques `offers-data.ts` → migrer vers DB progressivement
- i18n config + fichiers de traductions
- Logique session JWT (`session.ts`) → étendre le payload avec `tenantId` et `role`

### Ce qui change

| Ancien | Nouveau |
|---|---|
| `User.role: PILGRIM\|ADMIN` | `UserRole` avec 4 niveaux |
| Pas de `tenantId` | `tenantId` sur toutes les ressources |
| `Offer` sans lien tenant | `Offer.tenantId` |
| Auth sans agence | Session porte `tenantId`, `role`, `permissions[]` |
| Pas d'audit | `AuditLog` sur toutes les mutations |
| `next-auth` inutilisé | Supprimer la dépendance |

### SessionPayload étendue

```typescript
// src/lib/session.ts
export type SessionPayload = {
  id: string
  name: string
  email: string
  role: UserRole
  tenantId: string | null    // null = superadmin
  tenantSlug: string | null
  permissions: Permission[]
}
```

### Plan de migration

```
Étape 1 : Ajouter tenantId sur les modèles existants (User, Offer, Reservation, Review, ContactMessage)
Étape 2 : Créer le Tenant ZAM (notre première agence)
Étape 3 : Migrer les données existantes → assigner tenantId = ZAM
Étape 4 : Ajouter Pilgrim, AuditLog
Étape 5 : Étendre SessionPayload
Étape 6 : Créer le middleware de résolution tenant
Étape 7 : Construire l'espace Agency Admin
Étape 8 : Construire l'espace Super Admin
```

---

## 13. Roadmap par phases

---

### PHASE 0 — Stabilisation (2 semaines)
> Nettoyer et préparer le code existant avant de bâtir dessus

- [ ] Supprimer `next-auth` des dépendances
- [ ] Protéger toutes les routes API existantes avec vérification de session
- [ ] Brancher le Header/Footer sur les traductions i18n (actuellement hardcodé FR)
- [ ] Migrer les offres statiques (`offers-data.ts`) vers la DB MongoDB
- [ ] Ajouter `.env.example` documenté
- [ ] Remplacer le secret hardcodé dans `session.ts`
- [ ] Écrire les tests des routes API auth (login, register, logout)

**Livrable :** Site ZAM actuel fonctionnel, propre, sécurisé

---

### PHASE 1 — Foundation Multi-Tenant (4 semaines)
> Poser l'architecture qui supportera tout le reste

- [ ] Nouveau schéma Prisma complet (Tenant, User étendu, Pilgrim, AuditLog)
- [ ] Seeder MongoDB : créer le tenant ZAM avec ses données existantes
- [ ] Middleware de résolution tenant depuis le host
- [ ] SessionPayload étendue (`tenantId`, `role`, `permissions[]`)
- [ ] Helper `getTenantContext()` pour les Server Components et API Routes
- [ ] Helper `logAction()` pour l'audit trail
- [ ] Guards d'autorisation (`requireRole`, `requirePermission`)
- [ ] Protection automatique de toutes les requêtes par `tenantId`

**Livrable :** Infrastructure prête, aucune régression sur le portail ZAM existant

---

### PHASE 2 — Espace Admin Agence — Core (6 semaines)
> Le tableau de bord que chaque agence utilisera au quotidien

**Semaines 1-2 : Layout & Auth admin**
- [ ] Route `dashboard.{slug}.hajj-platform.com`
- [ ] Layout admin (sidebar, topbar, breadcrumbs)
- [ ] Login admin (page dédiée, séparée du portail public)
- [ ] Dashboard principal : stats (pèlerins, réservations, revenus)

**Semaines 3-4 : Gestion pèlerins & réservations**
- [ ] CRUD complet pèlerins (liste, fiche détaillée, ajout/édition)
- [ ] Fiche pèlerin : infos personnelles, passeport, statut visa
- [ ] CRUD réservations avec workflow de statuts
- [ ] Liaison pèlerin ↔ offre ↔ réservation

**Semaines 5-6 : Offres & Messages**
- [ ] CRUD offres depuis l'admin (remplace `offers-data.ts` statique)
- [ ] Gestion des messages de contact entrants
- [ ] Modération des avis clients
- [ ] Page paramètres agence (infos, logo, coordonnées)

**Livrable :** MVP admin utilisable par l'agence ZAM

---

### PHASE 3 — Espace Admin Agence — Avancé (4 semaines)

**Gestion d'équipe**
- [ ] CRUD agents avec assignation de rôles
- [ ] Interface de gestion des permissions par agent
- [ ] Profils prédéfinis (Commercial, Comptable, Guide, Modérateur)

**Finances**
- [ ] Enregistrement des acomptes et paiements
- [ ] Tableau suivi financier par réservation
- [ ] Export des données (CSV)

**Audit**
- [ ] Page journal d'audit : qui a fait quoi, quand
- [ ] Filtres par action, par agent, par période

**Customisation portail**
- [ ] Interface de personnalisation (couleurs, logo, textes)
- [ ] Aperçu en temps réel
- [ ] Gestion des features (activer/désactiver Coran, Qibla, etc.)

**Livrable :** Admin complet, multi-agents, traçable

---

### PHASE 4 — Super Admin (3 semaines)
> Notre outil interne pour gérer toutes les agences

- [ ] Route `admin.hajj-platform.com`
- [ ] Layout superadmin distinct
- [ ] CRUD tenants (créer, suspendre, modifier le plan)
- [ ] Vue globale : toutes les agences, stats agrégées
- [ ] Gestion des plans et limites
- [ ] Impersonation (se connecter en tant qu'admin d'une agence)
- [ ] Monitoring : erreurs, usage, dernier login par agence
- [ ] Journal d'audit global (toutes agences)

**Livrable :** Outil opérationnel pour onboarder de nouvelles agences

---

### PHASE 5 — Domaines Custom & Onboarding (2 semaines)

- [ ] Support domaines custom dans le middleware (résolution par `customDomain`)
- [ ] Guide d'onboarding in-app pour les nouvelles agences
- [ ] Formulaire de configuration initial (wizard d'installation)
- [ ] Emails de bienvenue (Resend)
- [ ] Documentation pour les agences (comment configurer leur DNS)

**Livrable :** Première agence externe peut s'onboarder en autonomie

---

### PHASE 6 — Fonctionnalités Premium (continu)

**Documents PDF**
- [ ] Livret pèlerin personnalisé avec le branding de l'agence
- [ ] Reçu de réservation / confirmation
- [ ] Fiche de préparation visa

**Notifications**
- [ ] Emails automatiques : confirmation réservation, rappel paiement, J-30 départ
- [ ] WhatsApp Business API (si budget)

**Espace pèlerin enrichi**
- [ ] Mon dossier (statut en temps réel)
- [ ] Mes documents (upload passeport, vaccins)
- [ ] Mon programme de voyage

**Application mobile**
- [ ] Reprendre `sonitrav-mobile` comme base
- [ ] App pèlerin : itinéraire, documents, Coran, Qibla, notifications push

---

## 14. Variables d'environnement

```bash
# .env.example

# Base de données
DATABASE_URL="mongodb+srv://user:password@cluster.mongodb.net/hajj-platform"

# Auth JWT
JWT_SECRET="your-strong-random-secret-min-32-chars"

# App
NEXT_PUBLIC_APP_URL="https://hajj-platform.com"
NEXT_PUBLIC_APP_NAME="Hajj Platform"

# Tenant par défaut en dev (portail public + API en single-domain localhost:3000)
DEV_DEFAULT_TENANT="zam"

# SMTP Gmail — mot de passe oublié / OTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="axionaa.academy@gmail.com"
SMTP_APP_PASSWORD="xxxx xxxx xxxx xxxx"
SMTP_FROM_NAME="ZAM Hajj & Oumra"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@hajj-platform.com"

# Stockage fichiers (Cloudinary)
CLOUDINARY_CLOUD_NAME="your-cloud"
CLOUDINARY_API_KEY="xxxx"
CLOUDINARY_API_SECRET="xxxx"

# Super Admin (créé manuellement en DB)
SUPER_ADMIN_EMAIL="admin@hajj-platform.com"

# Node
NODE_ENV="development"
```

---

## 15. Décisions techniques clés

### 1. Pourquoi Single Database avec tenantId et pas une DB par agence ?

- MongoDB Atlas facture par cluster, pas par database
- La gestion des connexions est simplifiée
- Les requêtes cross-tenant (pour le superadmin) sont possibles
- La migration est plus simple
- **Contrepartie :** requiert une discipline stricte sur le filtrage par `tenantId` dans chaque requête

### 2. Pourquoi garder jose et ne pas adopter next-auth ?

- Le code auth existant est propre et fonctionnel
- `next-auth` v4 a des dépendances vulnérables et une v5 (auth.js) cassante
- JWT custom avec `jose` donne plus de contrôle sur le payload (tenantId, permissions)
- Moins de magie, plus de clarté

### 3. Pourquoi MongoDB et pas PostgreSQL ?

- Existant dans le projet
- Le champ `data: Json` dans `Offer` est parfait pour stocker la structure flexible des vols/hôtels/programme
- Le champ `theme: Json` dans `Tenant` pour la customisation
- MongoDB Atlas offre un tier gratuit généreux pour démarrer

### 4. Pourquoi Netlify et pas Vercel ?

- Déjà configuré et déployé (`netlify.toml`)
- Vercel est une alternative valide si Netlify pose des limitations (wildcards sous-domaines)
- **Note :** Pour les wildcard subdomain sur Netlify, il faut le plan Pro. Vercel gère ça mieux sur le plan gratuit.

### 5. Route groups `(superadmin)`, `(agency-admin)`, `(public)`

Les parenthèses dans App Router créent des groupes sans affecter l'URL. Le routage vers le bon groupe se fait dans `middleware.ts` via la réécriture d'URL (`NextResponse.rewrite`).

---

## Résumé visuel de la roadmap

```
2026 Août       Septembre      Octobre        Novembre       Décembre
├── Phase 0 ──┤
              ├──── Phase 1 ────┤
                               ├────── Phase 2 ──────┤
                                                     ├─── Phase 3 ───┤
2027 Janvier       Février      Mars
                               ├─ Phase 4 ─┤
                                           ├─ Phase 5 ─┤
                                                       ├── Phase 6 → continu
```

---

*Document maintenu par l'équipe ZAM — mettre à jour au fil des décisions.*
