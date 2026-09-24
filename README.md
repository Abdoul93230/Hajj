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

L'application a besoin (1) de la structure MongoDB et (2) de deux comptes pour
démarrer : le **superadmin** de la plateforme et l'**admin de l'agence**.

> ⚠️ **Ne jamais lancer `npm run seed` en production** : ce script **purge toute
> la base** (tenants, utilisateurs, offres, réservations…) puis injecte des
> données de démonstration. Il est réservé à une base de dev/démo.
> Pour une base de production, utilisez `npm run bootstrap`.

### 1. Variables d'environnement minimales

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion MongoDB (ex. `mongodb://user:pass@host:27017/db?authSource=db&replicaSet=rs0`) |
| `JWT_SECRET` | Signature des sessions (`zam_session`) — **obligatoire** |
| `DEV_DEFAULT_TENANT` | Slug de l'agence du déploiement **mono-domaine** (ex. `zam`) |
| `USE_SUBDOMAIN_TENANT` | `true` = une agence par sous-domaine (`zam.mondomaine.com`, `dashboard.zam.mondomaine.com`, `admin.mondomaine.com`) |
| `NEXT_PUBLIC_APP_URL` | URL publique (liens e-mails / SMS) |
| `CLOUDINARY_*` | Envoi des documents / photos (sinon l'upload échoue) |
| `SMTP_*`, `LAFRICA_SMS_*` | Notifications (optionnel) |

`DEV_DEFAULT_TENANT` **fait foi** sur un déploiement sans sous-domaine : sans
elle (et sans cookie de connexion), aucune agence ne peut être déterminée.

### 2. Structure + comptes de départ

```bash
npx prisma generate
npx prisma db push        # collections + index uniques (base neuve)
npm run bootstrap         # plateforme + superadmin + agence + admin  (idempotent)

# avec un autre fichier d'environnement :
npx tsx --env-file=.env.production prisma/bootstrap.ts
```

`prisma/bootstrap.ts` ne supprime rien, crée uniquement ce qui manque, et crée
aussi l'**index unique sparse** `Tenant.customDomain_key` (que `db push` ne
génère pas — voir le commentaire dans `prisma/schema.prisma`).

Variables lues par le bootstrap (défauts entre parenthèses) :

| Variable | Défaut |
| --- | --- |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | `superadmin@hajj-platform.com` / `SuperAdmin123!` |
| `BOOTSTRAP_TENANT_SLUG` | `zam` |
| `BOOTSTRAP_TENANT_NAME` / `_EMAIL` / `_PHONE` / `_ADDRESS` / `_COUNTRY` / `_PLAN` | `Zam` / `contact@<slug>.com` / — / — / `NE` / `PRO` |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | sinon `<SLUG>_ADMIN_EMAIL` / `<SLUG>_ADMIN_PASSWORD` du `.env` (ex. `ZAM_ADMIN_EMAIL`) |
| `BOOTSTRAP_ADMIN_NAME` | `Admin <NOM AGENCE>` |
| `BOOTSTRAP_RESET_PASSWORD=true` | réécrit le mot de passe si le compte existe déjà |

Pour **ajouter une autre agence** : relancer avec un autre
`BOOTSTRAP_TENANT_SLUG` (et ses `*_ADMIN_EMAIL` / `*_ADMIN_PASSWORD`).

### 3. Se connecter

| Espace | URL | Compte |
| --- | --- | --- |
| Superadmin (plateforme) | `/superadmin/login` | `SUPER_ADMIN_EMAIL` |
| Agence | `/agency-admin/login` | `BOOTSTRAP_ADMIN_EMAIL` |
| Portail pèlerin | `/fr/compte` | inscriptions publiques |

Les agences se gèrent ensuite depuis le superadmin (création, suspension,
thème, textes personnalisés) — voir `ARCHITECTURE.md`.
