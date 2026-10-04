# DOSSIER DE PRÉSENTATION — Plateforme hajj-e.com

### Document destiné à un expert pour l'élaboration de l'offre destinée aux agences

*Référence : état du code au commit `a1368c1` (octobre 2026) — build production vert, 108 routes.*

---

## 1. Résumé exécutif

**hajj-e.com est un SaaS vertical de gestion pour agences de voyage spécialisées Hadj & Oumra**, conçu pour l'Afrique de l'Ouest (marché de départ : Niger). Chaque agence partenaire dispose, **sous sa propre identité et sur son propre domaine**, de :

1. un **site public** vitrine + réservation en ligne ;
2. un **tableau de bord** couvrant tout le cycle de saison (pèlerins, voyages, documents, paiements, SMS) ;
3. un **portail pèlerin** trilingue où chaque pèlerin suit son dossier ;
4. le tout supervisé par une **console plateforme** multi-agences.

L'éditeur vend l'accès à la plateforme en abonnement ; l'agence n'installe rien (100 % navigateur, aucun serveur à gérer).

**Différenciateurs déjà construits :** isolation totale des données entre agences, marque blanche complète (logo/couleurs/textes/domaine), trilinguisme FR/EN/AR, cycle complet « pèlerin → documents → paiements → badges QR → SMS », et traçabilité (journal d'audit par agence).

---

## 2. Les espaces du système

| Espace | Adresse type | Utilisateur | Finalité |
|---|---|---|---|
| Landing plateforme | `hajj-e.com` (domaine racine) | Prospects | Vitrine produit, formules, FAQ, accès aux espaces (FR/EN/AR) |
| Console plateforme | `/superadmin` | Éditeur hajj-e (SUPER_ADMIN) | Créer / gérer / suspendre les agences, leurs thèmes, leurs stats |
| Espace agence | `dashboard.{slug}.hajj-e.com` | Admin + agents de l'agence | Gestion opérationnelle quotidienne |
| Portail public agence | `{slug}.hajj-e.com` ou domaine dédié | Clients de l'agence | Vitrine, offres, réservation, contact, outils pèlerin |
| Portail pèlerin | `/compte` (domaine de l'agence) | Pèlerin inscrit | Suivi de dossier dans sa langue |

**Routage** : le middleware résout automatiquement l'agence depuis le domaine (sous-domaines wildcard, domaine dédié, ou mono-domaine). Un seul code, N identités.

---

## 3. Acteurs et rôles (RBAC)

| Rôle | Portée | Capacités |
|---|---|---|
| `SUPER_ADMIN` | Plateforme, toutes agences | Tout : création/suspension d'agences, thèmes, statistiques, audit |
| `AGENCY_ADMIN` | Son agence | 18 permissions : pèlerins, réservations, offres, finances, équipe, messages, modération des avis, personnalisation, audit |
| `AGENCY_AGENT` | Son agence, permissions granulaires | Sous-ensemble assigné par l'admin (profils type : Commercial, Comptable, Guide…) |
| `PILGRIM` | Ses seules données | Portail personnel : dossier, documents, paiements, badge |

**Garanties transverses** : mots de passe hachés (bcrypt), changement forcé du mot de passe provisoire (modale non contournable), et **suspension d'une agence = blocage immédiat** de la connexion, des API, des inscriptions, des messages et des avis.

## 4. Fonctionnalités par espace

### 4.1 Console plateforme (superadmin)

- **Création d'agence en un écran** : identité, slug/domaine, plan, administrateur + mot de passe provisoire, choix des visuels (images historiques de l'agence « TEMPLATE » ou placeholders neutres + logo plateforme « PLACEHOLDER »).
- **Cycle de vie** : `ACTIVE` / `TRIAL` (essai) / `SUSPENDED` / `CANCELLED`, répercuté partout instantanément ; suppression avec purge complète des fichiers (Cloudinary).
- **Plans** : `STARTER` / `PRO` / `ENTERPRISE` attribués et modifiables, date de fin d'essai tracée. *(stockage + interface OK — quotas non appliqués, voir §9)*
- **Personnalisation à distance** de n'importe quelle agence : couleurs, logo & contact, images, textes (mêmes éditeurs que l'espace agence).
- **Statistiques par agence et par année** (saison), fiche d'inspection détaillée.
- **Messages de contact** entrants des portails, **bandeau d'annonce global** défilant (i18n), **journal d'audit** des actions sensibles.

### 4.2 Espace agence (tableau de bord)

- **Tableau de bord** : vue d'ensemble de la saison.
- **Pèlerins** : registre par année/saison, fiche complète (passeport, CNI, contacts d'urgence, ville, profession, photo), statut d'avancement (Nouveau → Dossier complet → Visa déposé → Visa obtenu → Parti → Retour), création de comptes pèlerins avec mot de passe provisoire forcé, réinitialisation de mot de passe.
- **Voyages / forfaits (Hajj & Oumra)** : création, dates, tarifs par catégorie (adulte / enfant / bébé / couple, défaut FCFA), **programme jour par jour**, inscription fermée automatiquement à la date de départ, affectation des pèlerins.
- **Documents** : dépôt (pèlerin ou agence), vérification avec statuts **Reçu / Valide / Expiré / Rejeté**, motif de rejet et correction — passeport, CNI, visa, photo, vaccin, médical.
- **Paiements** : acomptes, tranches, solde final, remboursements ; modes espèces / virement / mobile money / chèque ; reçus téléversés et **reçus imprimables** ; historique par pèlerin et par réservation ; reste à payer.
- **Messages SMS** : envois manuels et groupés, journal exact (destinataire, corps, **segments facturés** 160 GSM-7 / 70 UCS-2, statut, expéditeur), SMS automatiques à la création de compte et aux versements ; canal SMS (Niger +227) ou e-mail.
- **Personnalisation** de SON portail (couleurs, logo, images, textes) — **option ouverte agence par agence** par la plateforme.
- Changement de mot de passe.

### 4.3 Portail public de l'agence (visiteurs)

- Vitrine trilingue FR/EN/AR : accueil (hero, chiffres clés, offres, témoignages, bandeau d'annonces), **offres détaillées** (vols, hôtels, programme, tarifs), pages histoire / à propos, **avis clients avec modération préalable**, contact (formulaire + WhatsApp), pages légales (CGV, mentions, cookies).
- **Réservation en ligne** : le visiteur crée son compte pèlerin puis réserve — contrôles doublon, dates de départ, catégorie tarifaire.
- **Outils pèlerin** : Coran, boussole Qibla, guide des rites.
- Boutique et Billetterie : **pages d'attente** (« bientôt disponible ») — pas encore fonctionnelles.
- Espace pèlerin (connexion, mot de passe oublié par code OTP e-mail).

### 4.4 Portail pèlerin

- Suivi du dossier (statuts), **paiements** et reste à payer, **documents** à fournir/corriger en ligne, **programme** du voyage, **badge imprimable avec QR code** (check-in), profil à compléter, trilingue.

### 4.5 Le cycle complet (valeur métier)

Agence créée → personnalisée → offres publiées → pèlerin inscrit → réservation → versements échelonnés → documents vérifiés → visa → badge & check-in → voyage → retour. Chaque étape est journalisée (audit) et notifiable (SMS / e-mail).

---

## 5. Modèle de données (MongoDB + Prisma)

| Collection | Contenu |
|---|---|
| `Tenant` (agence) | slug, domaine dédié, plan, statut, thème JSON, mode visuels, personnalisation autonome |
| `User` | 4 rôles + profil pèlerin complet (passeport, CNI, vaccin, contact d'urgence…) |
| `Offer` | Hadj/Oumra, saison/année, titres FR/EN/AR, tarifs multicatégorie, programme JSON |
| `Reservation` | lien pèlerin ↔ offre, statut (en attente → confirmé → en cours → terminé → annulé) |
| `Payment` | acompte / tranche / solde / remboursement, mode, reçu, référence |
| `PilgrimDocument` | 7 types (passeport, CNI, visa, photo, vaccin, médical, autre), 4 statuts |
| `Review` | avis client avec modération avant publication |
| `ContactMessage` | messages du formulaire de contact du portail |
| `AuditLog` | qui / quoi / quand / avant-après / IP / navigateur |
| `PasswordResetOtp` | code OTP hashé (10 min, 5 essais, anti-spam 60 s) |
| `SmsMessage` | journal + compteur de segments facturés (source : compte, versement, manuel) |

**Règle d'or** : chaque document porte `tenantId`, chaque requête est filtrée dessus → **aucune agence ne voit jamais les données d'une autre**.

## 6. Marque blanche & internationalisation

- **Thème par agence** (stocké en JSON) : couleurs, logo, images, textes éditables.
- **Éditeurs partagés** superadmin ↔ agence : le superadmin personnalise à distance n'importe quelle agence ; l'admin agence ne le peut que si la plateforme lui a ouvert la **personnalisation autonome** (interrupteur par agence, jamais accordé aux agents).
- **Visuels à la création** : l'agence hérite des images historiques qu'elle fournit (mode TEMPLATE) ou de placeholders neutres + logo plateforme (mode PLACEHOLDER) — aucun écran vide, aucun mélange d'identités.
- **3 langues** (FR par défaut, EN, AR) sur le portail public et le portail pèlerin, y compris les contenus éditables de l'agence.
- **Domaine** : `agence.hajj-e.com` (sous-domaine wildcard) immédiatement, ou **domaine propre déjà existant** de l'agence en pointant les DNS (champ prévu en base).

---

## 7. Sécurité, traçabilité, conformité

- Session **JWT signée** en cookie, mots de passe **bcrypt**, code OTP de réinitialisation hashé (expiration 10 min, 5 essais max, anti-spam 60 s).
- Contrôle d'accès systématique sur **toutes** les API : session + rôle + statut de l'agence (Active ou Essai uniquement).
- **Journal d'audit par agence** : action, ressource, état avant/après, utilisateur, IP, navigateur.
- Fichiers (documents, photos, reçus, logos) stockés sur **Cloudinary**, jamais dans la base de données.
- Aucune donnée bancaire ni paiement en ligne traité à ce jour (encaissements enregistrés manuellement avec justificatif téléversé) → pas de PCI-DSS aujourd'hui.
- Déploiement **Docker** / **Netlify**, variables d'environnement documentées (README de production, `bootstrap` pour initialiser une base neuve).

---

## 8. Stack technique

| Couche | Technologie |
|---|---|
| Front / SSR | Next.js **16** (App Router, Turbopack), React **19**, TypeScript |
| Styles | Tailwind CSS **4** |
| Base de données | **MongoDB** + Prisma **6** (single database, `tenantId` par document) |
| Auth | JWT maison (`jose`) + `bcryptjs` (next-auth installé mais non utilisé) |
| i18n | `next-intl` — FR / EN / AR |
| Fichiers | Cloudinary |
| E-mails | `nodemailer` (SMTP) — OTP, notifications |
| SMS | LAfricaMobile (expéditeur « SmartLimb »), compteur de segments |
| QR / PDF | `qrcode` (badges), impressions navigateur (reçus, badges) |
| Exploitation | Scripts `bootstrap` (base de production), `seed` (démo), `brand:assets` |

**Maturité** : build production vert (108 routes pages + API), dépôt Git privé, déploiement Netlify + Dockerfile.

## 9. ÉTAT RÉEL vs PROMIS — ce que l'expert doit savoir (transparence)

### ✅ Opérationnel et vendable aujourd'hui

L'intégralité du §4 : registre pèlerins, voyages + programme jour par jour, documents avec vérification et motifs de rejet, paiements + reçus imprimables, badges QR, SMS avec compteur de segments, portails trilingues, marque blanche complète, console superadmin, audit, suspension immédiate, isolation des données.

### ⚠️ Existant mais NON appliqué (champs et interfaces présents, règle métier manquante)

- **Plans (`STARTER`/`PRO`/`ENTERPRISE`)** : attribués, affichés, modifiables depuis la console — mais **aucun quota ni fonctionnalité n'est verrouillé par plan**. En l'état, toute agence a tout, quel que soit son plan.
- **Essai (`trialEndsAt`)** : date affichée dans la console, **mais aucune coupure automatique à échéance** (le statut `TRIAL`, lui, est bien bloquant une fois qu'on force `SUSPENDED`, mais rien ne bascule tout seul).
- **Facturation / abonnement en ligne** : totalement hors plateforme (encaissement manuel par l'éditeur).
- **Roadmap non implémentée** (présente dans `ARCHITECTURE.md`, absente du code) : impersonation (support en tant qu'admin d'agence), monitoring, **export CSV**, limites par plan, factures, app mobile pèlerin.
- **Pages Équipe / Paramètres / Portail** de l'espace agence : retirées du menu (non implémentées). Le RBAC agent existe côté API mais l'attribution d'équipe se fait encore hors produit.
- **Boutique & Billetterie** : pages d'attente uniquement.
- **Paiement en ligne des voyages** : absent — les versements des pèlerins sont enregistrés manuellement par l'agence (le pèlerin suit son solde, il ne paie pas sur la plateforme).

### 🧠 Conséquence directe sur l'offre

Le produit est aujourd'hui **« tout inclus » de fait**. Toute différenciation par formule (pèlerins/an, domaine personnalisé, SMS inclus, personnalisation, nombre d'agences…) devra être soit :

1. **câblée techniquement** (feature gating par plan — quelques jours/semaines de dev, base déjà en place), soit
2. **pilotée manuellement** depuis la console superadmin (ouvrir/fermer la personnalisation, suspendre, etc.) — viable au démarrage avec peu d'agences.

**C'est la décision n°1 à trancher avec l'expert** : quotas verrouillés ou pilotage commercial ?

## 10. L'offre commerciale actuelle (déjà publiée sur la landing)

La vitrine `hajj-e.com` présente **3 formules sans prix** (appel à l'action « Nous contacter »), à concilier avec les plans techniques :

| Formule | Promesse publiée |
|---|---|
| **Découverte** | 1 agence sur son domaine · registre, voyages, paiements, documents · portail pèlerin trilingue · support e-mail |
| **Partenaire** *(recommandée)* | Marque blanche complète · badges QR, SMS et modèles de messages · comptes d'équipe et rôles · statistiques par année |
| **Réseau** | Plusieurs agences, chacune sur son domaine · console plateforme et supervision globale · accompagnement à la mise en service · évolutions dédiées |

Arguments déjà écrits (réutilisables pour la prospection) : SaaS sans installation, un domaine par agence, isolation stricte des données, 3 langues, suivi pèlerin complet. Cibles identifiées : **agences de voyage**, **pèlerins**, **administration plateforme**.

> ⚠️ À noter : « comptes d'équipe et rôles » est promis dans la formule Partenaire alors que la page Équipe n'est pas encore implémentée (le mécanisme de permissions, lui, existe). À arbitrer : promettre ou câbler avant vente.

---

## 11. Leviers de monétisation visibles dans le produit *(matière première pour l'expert)*

1. **Abonnement par formule** — déjà structuré (plans, essai, statuts) mais non appliqué (§9).
2. **SMS** — coût réel **déjà journalisé et compté par segment** : refacturation ou forfaits SMS inclus / à l'usage est immédiatement quantifiable.
3. **Domaine personnalisé** — attribut `customDomain` déjà prévu en base : option payante naturelle (plan Pro dans l'architecture d'origine).
4. **Personnalisation autonome** — interrupteur agence par agence : « design premium » ouvert moyennant supplément, ou inclus selon la formule.
5. **Volume** — nombre de pèlerins par saison : quota naturel pour la formule d'entrée (l'architecture d'origine prévoyait 50 pèlerins/an en Starter, 300 en Pro, illimité en Enterprise).
6. **Réseau / sur-mesure** — plusieurs agences sur un même compte, reprise de données, évolutions dédiées (formule Réseau).
7. **Modules futurs** — boutique, billetterie, app mobile pèlerin : upsells déjà « réservés » dans la navigation.

### Questions à poser à l'expert

- Quel **prix** (FCFA ? mensuel / annuel / à la saison ?) et quel positionnement face aux concurrents ?
- **Essai gratuit** : combien de jours ? Première saison offerte ?
- Quels **quotas** par formule, et **verrouillés techniquement** ou commercialement ?
- **Encaissement** : mobile money, virement, chèque — quel parcours pour l'abonnement lui-même ?
- Facturation des **SMS** (inclus / à l'usage / re-facturés) ?
- Niveau de **support** promis (e-mail, WhatsApp, dédié) et engagement de service ?
- Politique **réseau** : tarif par agence ? agrégation ?
- Que faire des **agences existantes** (transition, tarification héritée) ?

---

## 12. Annexes — références pour l'expert technique

- **Modèle de données** : `prisma/schema.prisma`
- **Routage multi-agences** : `src/middleware.ts`, `src/lib/tenant-slug.ts`
- **Rôles & permissions** : `src/lib/permissions.ts`
- **Roadmap historique & décisions** : `ARCHITECTURE.md` (périmètre plus large que l'état actuel — voir §9)
- **Contenus de la landing / offre** : `src/messages/{fr,en,ar}/platform.json`
- **Variables clés** : `DATABASE_URL`, `JWT_SECRET`, `USE_SUBDOMAIN_TENANT`, `PLATFORM_ROOT_DOMAINS`, `CLOUDINARY_*`, `SMTP_*`, `LAFRICA_SMS_*`, `NEXT_PUBLIC_APP_URL`
- **Adresses type** : `{slug}.hajj-e.com` (portail agence) · `dashboard.{slug}.hajj-e.com` (gestion) · `hajj-e.com` (landing plateforme) · `/superadmin` (console)

---

*Document généré le 1er octobre 2026 à partir de l'état réel du code (commit `a1368c1`, build vert). Toute affirmation « ✅ opérationnel » a été vérifiée dans le code ; toute limite « ⚠️ » également.*





