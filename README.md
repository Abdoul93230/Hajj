This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## 🚀 Production — initialiser une base neuve (MongoDB)

L'application a besoin (1) de la structure MongoDB et (2) du **superadmin** de la
plateforme. C'est ensuite lui qui crée chaque agence — et l'admin de cette
agence — depuis `/superadmin/tenants` : base neuve, aucune donnée de démo,
aucun vestige d'une autre installation.

> ⚠️ **Ne jamais lancer `npm run seed` en production** : ce script **purge toute
> la base** (tenants, utilisateurs, offres, réservations…) puis injecte des
> données de démonstration. Il est réservé à une base de dev/démo.
> Pour une base de production, utilisez `npm run bootstrap`.

### 1. Variables d'environnement minimales

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion MongoDB (ex. `mongodb://user:pass@host:27017/db?authSource=db&replicaSet=rs0`) |
| `JWT_SECRET` | Signature des sessions (`zam_session`) — **obligatoire** |
| `DEV_DEFAULT_TENANT` | Slug de l'agence **si le domaine est dédié à UNE seule agence** (ex. `zam`). À laisser **vide** pour une plateforme multi-agences mono-domaine |
| `USE_SUBDOMAIN_TENANT` | `true` = une agence par sous-domaine (`zam.mondomaine.com`, `dashboard.zam.mondomaine.com`, `admin.mondomaine.com`) |
| `PLATFORM_ROOT_DOMAINS` | Domaines **racine** de la plateforme (landing) : `hajj-e.com,www.hajj-e.com`. Vide → host de `NEXT_PUBLIC_APP_URL` (racine + www) |
| `NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL` | Adresse affichée sur la landing (défaut `contact@hajj-e.com`) |
| `NEXT_PUBLIC_APP_URL` | URL publique (liens e-mails / SMS) |
| `CLOUDINARY_*` | Envoi des documents / photos (sinon l'upload échoue) |
| `SMTP_*`, `LAFRICA_SMS_*` | Notifications (optionnel) |

**Multi-agences — deux façons de router :**

- **sous-domaines** : `USE_SUBDOMAIN_TENANT=true` + DNS wildcard
  (`zam.mondomaine.com`, `dashboard.zam.mondomaine.com`, `admin.mondomaine.com`) ;
- **mono-domaine** : laisser `DEV_DEFAULT_TENANT` **vide** — chaque connexion
  détermine l'agence (recherche de l'utilisateur par email + cookie `zam_dev_tenant`
  qui route les pages suivantes).

`DEV_DEFAULT_TENANT` **fait foi pour le portail public** dès qu'il est renseigné :
ne l'utilisez que pour un déploiement (public) mono-agence.

Pour l'**espace agence** (`/agency-admin`), l'agence est résolue dans cet ordre :

1. **sous-domaine** : `dashboard.<slug>.…` puis `<slug>.…` ;
2. **cookie de connexion** `zam_dev_tenant` (mono-domaine multi-agences) ;
3. `DEV_DEFAULT_TENANT` — dernier recours.

Un défaut de déploiement n'écrase donc jamais l'identité de l'admin connecté.
Sinon on obtient le symptôme « connexion réussie mais on reste sur
`/agency-admin/login` » (l'en-tête `x-tenant-slug` du middleware ne correspondait
plus au `tenantSlug` de la session).

### Landing de la plateforme (domaine racine)

Le domaine **racine** de la plateforme (par ex. `hajj-e.com`, `www.hajj-e.com`)
n'affiche **pas** la vitrine d'une agence : il sert la **landing de la
plateforme** (vitrine du produit, formules, FAQ, accès aux espaces). Les
domaines d'agence, eux, ne changent pas.

| Host | Espace servi |
| --- | --- |
| `hajj-e.com`, `www.hajj-e.com` | **Landing plateforme** (`PLATFORM_ROOT_DOMAINS`) |
| `zam.hajj-e.com` | Portail public de l'agence `zam` (inchangé) |
| `dashboard.zam.hajj-e.com` | Tableau de bord de l'agence `zam` (inchangé) |
| `admin.hajj-e.com` (ou `/superadmin`) | Console plateforme |
| Domaine nu inconnu + `DEV_DEFAULT_TENANT` renseigné | Portail de cette agence (déploiement mono-agence) |
| Domaine nu inconnu + `DEV_DEFAULT_TENANT` vide | Landing plateforme |

Détails techniques :

- `src/lib/tenant-slug.ts` → `platformRootDomains()` / `isPlatformHost()` ;
  un domaine nu n'est **jamais** converti en slug d'agence (`parts.length >= 3`
  requis, `www` exclu) ;
- la landing vit **physiquement** sous `/<locale>/platform` et le middleware la
  masque par un `rewrite` : les URLs publiques restent `/fr`, `/en`, `/ar`
  (locale en 1er segment → `<html lang/dir>` correct côté serveur, même en arabe) ;
- les contenus de la landing sont dans `src/messages/<locale>/platform.json`
  (namespace `platform`, chargé par `src/i18n/request.ts`).

**Sous-domaine SANS agence** (ex. `test2.hajj-e.com` alors que `test2` n'existe
pas) : le portail ne sert **jamais** un « portail fantôme » (branding de repli).
La requête est redirigée (307) vers la landing :

- `PLATFORM_ROOT_DOMAINS` déclaré (production) → URL absolue du domaine
  plateforme (`https://hajj-e.com/fr`) ;
- développement (aucun domaine plateforme) → bascule `?__mode=platform` sur le
  même host, qui affiche la landing ;
- production non configurée → 404 du portail (`(public)/[locale]/not-found.tsx`),
  donc **aucune boucle de redirection possible**.

Un slug **absent** (`x-tenant-slug` vide : déploiement mono-domaine) n'est pas
concerné — c'est le comportement historique (portail par défaut).

**Bascule en développement** (jamais active en production) : un badge « Dev » en
bas de page permet de passer de la landing au portail d'agence et inversement.
Il pose le cookie `zam_dev_mode` (`platform` / `tenant`) via `?__mode=…`.
En production, le middleware ignore totalement ce paramètre et ce cookie.

### Personnalisation par l'agence (self-personalization)

Chaque agence peut se voir ouvrir la **personnalisation de son propre espace**
(couleurs, logo, contact, images, textes) — la décision se prend **agence par
agence** depuis le superadmin.

- **Activation** : fiche de l'agence dans le superadmin → carte
  « ✍️ Personnalisation par l'agence » (interrupteur) → écrit
  `Tenant.selfPersonalization` (audit :
  `tenant.self_personalization_enabled` / `tenant.self_personalization_disabled`).
- **Côté agence** : l'onglet **Personnalisation** apparaît dans la sidebar
  (`/agency-admin/personalisation/couleurs` · `logo-contact` · `medias` · `textes`).
  Il n'est visible que pour un rôle `AGENCY_ADMIN` **et** si le flag est actif ;
  une URL directe sans activation renvoie vers le tableau de bord.
- **Sécurité** : une garde unique, `requireThemeEditor(tenantId)`
  (`src/lib/permissions.ts`) — superadmin sur n'importe quelle agence, **ou** admin
  de l'agence propriétaire quand le flag est actif. Les routes
  `/api/superadmin/tenants/[id]{,/logo,/media}` l'utilisent : les deux espaces
  partagent la même écriture du thème et le même audit (`tenant.theme_updated`),
  sans duplication de code.
- **Éditeurs partagés** : `src/components/tenant-editors/*` (couleurs, logo &
  contact, images, textes) et `buildThemeTextEditorData()`
  (`src/lib/tenant-theme-catalog.ts`) : une seule définition des slots de textes
  pour les deux espaces.
- MongoDB : champ à défaut `false` ; les documents antérieurs (champ absent) sont
  traités comme désactivés — le code teste toujours `=== true`.

### 2. Structure + comptes de départ

```bash
npx prisma generate
npx prisma db push        # collections + index uniques (base neuve)
npm run bootstrap         # plateforme + superadmin  (idempotent, aucune agence)

# avec un autre fichier d'environnement :
npx tsx --env-file=.env.production prisma/bootstrap.ts
```

`prisma/bootstrap.ts` ne supprime rien et crée uniquement ce qui manque :
plateforme + superadmin + l'**index unique sparse** `Tenant.customDomain_key`
(que `db push` ne génère pas — voir le commentaire dans `prisma/schema.prisma`).

Ensuite, **créez les agences depuis le superadmin** : `/superadmin/tenants` →
« Créer une agence » (le tenant *et* son `AGENCY_ADMIN` sont créés dans une même
transaction, avec le mot de passe de votre choix).

À la création, l'agence est **notifiée automatiquement** (best-effort, jamais
bloquant) :

| Canal | Destinataire | Condition |
| --- | --- | --- |
| **Email** | adresse de l'agence (repli : celle de l'admin) | `SMTP_*` configuré |
| **SMS** | numéro de l'agence | numéro **Niger (+227)** et `LAFRICA_SMS_*` configuré (les SMS ne partent que vers le +227) |

Le message contient le **lien de connexion**, l'identifiant et le mot de passe
choisi par le superadmin. Le récapitulatif s'affiche dans la modale (envoyé /
non envoyé + raison). Renseignez `NEXT_PUBLIC_APP_URL` pour un lien de connexion
correct dans les messages.

Variables lues par le bootstrap (défauts entre parenthèses) :

| Variable | Défaut |
| --- | --- |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | `superadmin@hajj-platform.com` / `SuperAdmin123!` |
| `BOOTSTRAP_TENANT_SLUG` | *(vide → aucune agence créée : c'est le superadmin qui les crée)* |
| `BOOTSTRAP_TENANT_NAME` / `_EMAIL` / `_PHONE` / `_ADDRESS` / `_COUNTRY` / `_PLAN` | `Zam` / `contact@<slug>.com` / — / — / `NE` / `PRO` |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | sinon `<SLUG>_ADMIN_EMAIL` / `<SLUG>_ADMIN_PASSWORD` du `.env` (ex. `ZAM_ADMIN_EMAIL`) |
| `BOOTSTRAP_ADMIN_NAME` | `Admin <NOM AGENCE>` |
| `BOOTSTRAP_RESET_PASSWORD=true` | réécrit le mot de passe si le compte existe déjà |

Pour **ajouter une agence en ligne de commande** (facultatif) : relancer avec
`BOOTSTRAP_TENANT_SLUG` + `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`.

### 3. Se connecter

| Espace | URL | Compte |
| --- | --- | --- |
| Superadmin (plateforme) | `/superadmin/login` | `SUPER_ADMIN_EMAIL` |
| Agence | `/agency-admin/login` | email + mot de passe saisis lors de la création de l'agence |
| Portail pèlerin | `/fr/compte` | inscriptions publiques |

Les agences se gèrent ensuite depuis le superadmin (création, suspension,
thème, textes personnalisés) — voir `ARCHITECTURE.md`.
