import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function hashPw(pw: string) {
  return bcrypt.hash(pw, 12);
}

async function createOffer(data: {
  tenantId: string;
  slug: string;
  titleFr: string;
  type: "HAJJ" | "UMRAH";
  descFr: string;
  priceAdult: number;
  departureDate: Date;
  returnDate: Date;
  maxCapacity: number;
  createdAt: Date;
}) {
  const offer = await prisma.offer.create({
    data: {
      tenantId: data.tenantId,
      slug: data.slug,
      titleFr: data.titleFr,
      type: data.type,
      descFr: data.descFr,
      priceAdult: data.priceAdult,
      departureDate: data.departureDate,
      returnDate: data.returnDate,
      currency: "FCFA",
      active: true,
      data: { maxCapacity: data.maxCapacity },
    },
  });
  await prisma.offer.update({ where: { id: offer.id }, data: { createdAt: data.createdAt } });
  return offer;
}

async function createPilgrim(data: {
  tenantId: string;
  email: string;
  name: string;
  password: string;
  phone: string;
  gender: string;
  birthDate: Date;
  city: string;
  country: string;
  hasPassport: boolean;
  hasCni: boolean;
  hasVaccine: boolean;
  pilgrimStatus: string;
  emergencyName: string;
  emergencyPhone: string;
  createdAt: Date;
}) {
  const { createdAt, ...rest } = data;
  const user = await prisma.user.create({
    data: {
      ...rest,
      role: "PILGRIM",
      permissions: [],
      active: true,
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { createdAt } });
  return user;
}

async function createReservation(data: {
  tenantId: string;
  userId: string;
  offerId: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  totalAmount: number;
  createdAt: Date;
}) {
  const { createdAt, ...rest } = data;
  const res = await prisma.reservation.create({
    data: { ...rest, category: "ADULT" },
  });
  await prisma.reservation.update({ where: { id: res.id }, data: { createdAt } });
  return res;
}

async function createDocumentsForPilgrim(
  tenantId: string,
  userId: string,
  flags: { hasPassport: boolean; hasCni: boolean; hasVaccine: boolean },
  refDate: Date,
  adminId: string
) {
  const docs: { type: string; label: string; status: string; expiresAt: Date | null }[] = [];
  if (flags.hasPassport) docs.push({ type: "PASSPORT", label: "Passeport biométrique", status: "VALID", expiresAt: new Date(refDate.getFullYear() + 5, refDate.getMonth(), 1) });
  if (flags.hasCni)      docs.push({ type: "CNI",      label: "Carte Nationale d'Identité", status: "VALID", expiresAt: new Date(refDate.getFullYear() + 10, refDate.getMonth(), 1) });
  if (flags.hasVaccine)  docs.push({ type: "VACCINE",  label: "Vaccin Méningite A+C+W135+Y", status: "VALID", expiresAt: new Date(refDate.getFullYear() + 3, refDate.getMonth(), 1) });

  for (const doc of docs) {
    const created = await prisma.pilgrimDocument.create({
      data: {
        tenantId,
        userId,
        type: doc.type as "PASSPORT" | "CNI" | "VACCINE",
        status: doc.status as "VALID",
        label: doc.label,
        expiresAt: doc.expiresAt,
        createdBy: adminId,
      },
    });
    await prisma.pilgrimDocument.update({ where: { id: created.id }, data: { createdAt: refDate } });
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🗑️  Nettoyage complet de la base...\n");

  // Suppression dans le bon ordre (dépendances)
  await prisma.auditLog.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.pilgrimDocument.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.contactMessage.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log("✅ Base nettoyée\n");
  console.log("🌱 Seeding...\n");

  const pw = await hashPw("Pelerin123!");

  // ══════════════════════════════════════════════════════════════════════════
  // 1. TENANT PLATFORM + SUPER ADMIN
  // ══════════════════════════════════════════════════════════════════════════
  const platform = await prisma.tenant.create({
    data: {
      slug: "__platform__",
      name: "Hajj Platform",
      email: "platform@hajj-platform.com",
      plan: "ENTERPRISE",
      status: "PLATFORM",
    },
  });

  await prisma.user.create({
    data: {
      tenantId: platform.id,
      email: "superadmin@hajj-platform.com",
      name: "Super Admin",
      password: await hashPw("SuperAdmin123!"),
      role: "SUPER_ADMIN",
      permissions: [],
      active: true,
    },
  });
  console.log("✅ Platform + Super Admin créés");

  // ══════════════════════════════════════════════════════════════════════════
  // 2. AGENCE ZAM (Niger, depuis juin 2021)
  // ══════════════════════════════════════════════════════════════════════════
  const zam = await prisma.tenant.create({
    data: {
      slug: "zam",
      name: "ZAM Hajj & Oumra",
      email: "contact@zamhajj.com",
      phone: "+227 96 96 90 70",
      address: "Niamey, Niger",
      country: "NE",
      plan: "PRO",
      status: "ACTIVE",
      theme: {
        primaryColor: "#0f5132",
        secondaryColor: "#b8860b",
        whatsappNumber: "22796969070",
        tagline: "Votre voyage vers les Lieux Saints",
        defaultLocale: "fr",
      },
    },
  });
  await prisma.tenant.update({ where: { id: zam.id }, data: { createdAt: new Date("2021-06-15") } });

  const zamAdmin = await prisma.user.create({
    data: {
      tenantId: zam.id,
      email: "admin@zamhajj.com",
      name: "Admin ZAM",
      password: await hashPw("ZamAdmin123!"),
      role: "AGENCY_ADMIN",
      permissions: [],
      active: true,
      createdAt: new Date("2021-06-15"),
    },
  });
  console.log("✅ Agence ZAM + Admin créés");

  // ── VOYAGES ZAM ────────────────────────────────────────────────────────────
  const zOffers = {
    h26std: await createOffer({
      tenantId: zam.id, slug: "hajj-standard-confort-2026",
      titleFr: "Hajj Standard Confort 2026", type: "HAJJ",
      descFr: "Forfait Hajj tout compris avec hébergement 4★ à La Mecque et Médine, vols directs depuis Niamey.",
      priceAdult: 4_500_000,
      departureDate: new Date("2026-06-01"), returnDate: new Date("2026-06-27"),
      maxCapacity: 100, createdAt: new Date("2026-01-15"),
    }),
    h26vip: await createOffer({
      tenantId: zam.id, slug: "hajj-vip-prestige-2026",
      titleFr: "Hajj VIP Prestige 2026", type: "HAJJ",
      descFr: "Hôtels 5★ à 200 m de la Kaaba, service personnalisé, guide dédié.",
      priceAdult: 7_200_000,
      departureDate: new Date("2026-05-28"), returnDate: new Date("2026-06-27"),
      maxCapacity: 40, createdAt: new Date("2026-01-20"),
    }),
    o26ram: await createOffer({
      tenantId: zam.id, slug: "omra-ramadan-superieur-2026",
      titleFr: "Omra Ramadan Supérieur 2026", type: "UMRAH",
      descFr: "Séjour spirituel pendant le Ramadan avec programme religieux encadré.",
      priceAdult: 1_850_000,
      departureDate: new Date("2026-03-12"), returnDate: new Date("2026-03-27"),
      maxCapacity: 60, createdAt: new Date("2026-01-10"),
    }),
    o26vip: await createOffer({
      tenantId: zam.id, slug: "omra-vip-celeste-2026",
      titleFr: "Omra VIP Céleste 2026", type: "UMRAH",
      descFr: "Omra hors-saison hôtels de luxe, guide personnel dédié.",
      priceAdult: 3_200_000,
      departureDate: new Date("2026-05-20"), returnDate: new Date("2026-05-30"),
      maxCapacity: 30, createdAt: new Date("2026-02-01"),
    }),
    o26dec: await createOffer({
      tenantId: zam.id, slug: "omra-decouverte-2026",
      titleFr: "Omra Découverte 2026", type: "UMRAH",
      descFr: "Idéale pour primo-pèlerins, accompagnement complet et programme pédagogique.",
      priceAdult: 1_400_000,
      departureDate: new Date("2026-09-10"), returnDate: new Date("2026-09-24"),
      maxCapacity: 80, createdAt: new Date("2026-03-01"),
    }),
    h25std: await createOffer({
      tenantId: zam.id, slug: "hajj-standard-2025",
      titleFr: "Hajj Standard 2025", type: "HAJJ",
      descFr: "Forfait Hajj 2025 tout compris depuis Niamey.",
      priceAdult: 4_200_000,
      departureDate: new Date("2025-06-04"), returnDate: new Date("2025-06-30"),
      maxCapacity: 90, createdAt: new Date("2025-01-10"),
    }),
    o25ram: await createOffer({
      tenantId: zam.id, slug: "omra-ramadan-2025",
      titleFr: "Omra Ramadan 2025", type: "UMRAH",
      descFr: "Omra pendant le Ramadan 2025.",
      priceAdult: 1_750_000,
      departureDate: new Date("2025-03-01"), returnDate: new Date("2025-03-15"),
      maxCapacity: 50, createdAt: new Date("2025-01-05"),
    }),
    h24std: await createOffer({
      tenantId: zam.id, slug: "hajj-standard-2024",
      titleFr: "Hajj Standard 2024", type: "HAJJ",
      descFr: "Forfait Hajj 2024 tout compris.",
      priceAdult: 3_900_000,
      departureDate: new Date("2024-06-14"), returnDate: new Date("2024-07-10"),
      maxCapacity: 80, createdAt: new Date("2024-01-10"),
    }),
  };
  console.log(`   → ${Object.keys(zOffers).length} voyages ZAM créés`);

  // ── PÈLERINS ZAM 2026 ──────────────────────────────────────────────────────
  const zamPilgrims2026 = [
    { email: "abdoulaye.ndiaye@zam.ne",       name: "Abdoulaye Ndiaye",        phone: "+221 77 555 12 34", gender: "M", birthDate: new Date("1973-04-10"), city: "Dakar",       country: "Sénégal",      hasPassport: true,  hasCni: true,  hasVaccine: false, pilgrimStatus: "VISA_OK",    emergencyName: "Fatou Ndiaye",       emergencyPhone: "+221 77 100 00 01", offer: zOffers.h26std, status: "CONFIRMED" as const },
    { email: "fatoumata.sylla@zam.ne",        name: "Fatoumata Sylla Bocoum",   phone: "+221 78 432 90 90", gender: "F", birthDate: new Date("1982-08-22"), city: "Dakar",       country: "Sénégal",      hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "REGISTERED", emergencyName: "Mamadou Bocoum",      emergencyPhone: "+221 77 100 00 02", offer: zOffers.h26std, status: "CONFIRMED" as const },
    { email: "amadou.pathe.diallo@zam.ne",    name: "Amadou Pathé Diallo",      phone: "+224 622 34 56 78", gender: "M", birthDate: new Date("1959-11-03"), city: "Conakry",     country: "Guinée",       hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "VISA_OK",    emergencyName: "Aissatou Diallo",     emergencyPhone: "+224 622 00 00 03", offer: zOffers.o26ram, status: "CONFIRMED" as const },
    { email: "mariam.keita.traore@zam.ne",    name: "Mariam Keïta Traoré",      phone: "+223 76 89 45 12",  gender: "F", birthDate: new Date("1978-03-17"), city: "Bamako",      country: "Mali",         hasPassport: true,  hasCni: false, hasVaccine: true,  pilgrimStatus: "INCOMPLETE", emergencyName: "Seydou Traoré",       emergencyPhone: "+223 76 00 00 04",  offer: zOffers.h26std, status: "PENDING"   as const },
    { email: "ousseini.maiga@zam.ne",         name: "Ousseini Ibrahim Maïga",   phone: "+227 96 12 34 56",  gender: "M", birthDate: new Date("1965-07-28"), city: "Niamey",      country: "Niger",        hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "REGISTERED", emergencyName: "Haoua Maïga",         emergencyPhone: "+227 96 00 00 05",  offer: zOffers.h26vip, status: "CONFIRMED" as const },
    { email: "kadiatou.balde.sow@zam.ne",     name: "Kadiatou Baldé Sow",       phone: "+224 655 78 90 12", gender: "F", birthDate: new Date("1970-12-05"), city: "Labé",        country: "Guinée",       hasPassport: false, hasCni: true,  hasVaccine: false, pilgrimStatus: "INCOMPLETE", emergencyName: "Mamadou Sow",         emergencyPhone: "+224 655 00 00 06", offer: zOffers.o26vip, status: "PENDING"   as const },
    { email: "moussa.coulibaly@zam.ne",       name: "Moussa Coulibaly Sangaré", phone: "+225 07 89 12 34",  gender: "M", birthDate: new Date("1986-02-14"), city: "Abidjan",     country: "Côte d'Ivoire",hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "REGISTERED", emergencyName: "Assétou Sangaré",     emergencyPhone: "+225 07 00 00 07",  offer: zOffers.o26dec, status: "CONFIRMED" as const },
    { email: "aissata.barry.diallo@zam.ne",   name: "Aïssata Barry Diallo",     phone: "+221 77 456 78 90", gender: "F", birthDate: new Date("1990-06-21"), city: "Ziguinchor",  country: "Sénégal",      hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "VISA_OK",    emergencyName: "Ibrahima Barry",      emergencyPhone: "+221 77 00 00 08",  offer: zOffers.o26ram, status: "CONFIRMED" as const },
    { email: "aliou.sy.fall@zam.ne",          name: "Aliou Sy Fall",            phone: "+221 76 234 56 78", gender: "M", birthDate: new Date("1955-09-10"), city: "Saint-Louis", country: "Sénégal",      hasPassport: true,  hasCni: false, hasVaccine: true,  pilgrimStatus: "PENDING",    emergencyName: "Rokhaya Fall",        emergencyPhone: "+221 76 00 00 09",  offer: zOffers.h26std, status: "PENDING"   as const },
    { email: "binta.camara.kouyate@zam.ne",   name: "Binta Camara Kouyaté",     phone: "+224 628 90 12 34", gender: "F", birthDate: new Date("1968-04-30"), city: "Kindia",      country: "Guinée",       hasPassport: true,  hasCni: true,  hasVaccine: false, pilgrimStatus: "REGISTERED", emergencyName: "Alpha Kouyaté",       emergencyPhone: "+224 628 00 00 10", offer: zOffers.h26std, status: "CONFIRMED" as const },
  ];

  for (const p of zamPilgrims2026) {
    const { offer, status, ...pilgrimData } = p;
    const user = await createPilgrim({ ...pilgrimData, tenantId: zam.id, password: pw, createdAt: new Date("2026-02-01") });
    await createReservation({ tenantId: zam.id, userId: user.id, offerId: offer.id, status, totalAmount: offer.priceAdult, createdAt: new Date("2026-02-15") });
    await createDocumentsForPilgrim(zam.id, user.id, { hasPassport: p.hasPassport, hasCni: p.hasCni, hasVaccine: p.hasVaccine }, new Date("2026-02-10"), zamAdmin.id);
  }
  console.log(`   → ${zamPilgrims2026.length} pèlerins ZAM 2026`);

  // ── PÈLERINS ZAM 2025 ──────────────────────────────────────────────────────
  const zamPilgrims2025 = [
    { email: "boubacar.diop.2025@zam.ne",     name: "Boubacar Diop",     phone: "+221 77 111 22 33", gender: "M", birthDate: new Date("1968-05-10"), city: "Thiès",    country: "Sénégal", hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "VISA_OK",    emergencyName: "Ndèye Diop",     emergencyPhone: "+221 77 000 11 01", offer: zOffers.h25std, status: "CONFIRMED" as const },
    { email: "rokiatou.bah.2025@zam.ne",      name: "Rokiatou Bah",      phone: "+224 620 44 55 66", gender: "F", birthDate: new Date("1975-09-14"), city: "Mamou",    country: "Guinée",  hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "REGISTERED", emergencyName: "Ibrahima Bah",   emergencyPhone: "+224 620 000 22 02", offer: zOffers.h25std, status: "CONFIRMED" as const },
    { email: "souleymane.toure.2025@zam.ne",  name: "Souleymane Touré",  phone: "+223 76 33 44 55",  gender: "M", birthDate: new Date("1960-01-20"), city: "Kayes",    country: "Mali",    hasPassport: true,  hasCni: false, hasVaccine: true,  pilgrimStatus: "VISA_OK",    emergencyName: "Oumou Touré",    emergencyPhone: "+223 76 000 33 03",  offer: zOffers.h25std, status: "CONFIRMED" as const },
    { email: "mariama.diallo.2025@zam.ne",    name: "Mariama Diallo",    phone: "+224 666 77 88 99", gender: "F", birthDate: new Date("1983-07-07"), city: "Conakry",  country: "Guinée",  hasPassport: true,  hasCni: true,  hasVaccine: false, pilgrimStatus: "INCOMPLETE", emergencyName: "Mamadou Diallo", emergencyPhone: "+224 666 000 44 04", offer: zOffers.h25std, status: "PENDING"   as const },
    { email: "hamidou.niass.2025@zam.ne",     name: "Hamidou Niass",     phone: "+221 76 555 66 77", gender: "M", birthDate: new Date("1971-03-25"), city: "Kaolack",  country: "Sénégal", hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "REGISTERED", emergencyName: "Khady Niass",    emergencyPhone: "+221 76 000 55 05",  offer: zOffers.o25ram, status: "CONFIRMED" as const },
  ];
  for (const p of zamPilgrims2025) {
    const { offer, status, ...pilgrimData } = p;
    const user = await createPilgrim({ ...pilgrimData, tenantId: zam.id, password: pw, createdAt: new Date("2025-02-01") });
    await createReservation({ tenantId: zam.id, userId: user.id, offerId: offer.id, status, totalAmount: offer.priceAdult, createdAt: new Date("2025-02-15") });
    await createDocumentsForPilgrim(zam.id, user.id, { hasPassport: p.hasPassport, hasCni: p.hasCni, hasVaccine: p.hasVaccine }, new Date("2025-02-10"), zamAdmin.id);
  }
  console.log(`   → ${zamPilgrims2025.length} pèlerins ZAM 2025`);

  // ── PÈLERINS ZAM 2024 ──────────────────────────────────────────────────────
  const zamPilgrims2024 = [
    { email: "ibrahima.fall.2024@zam.ne",    name: "Ibrahima Fall",   phone: "+221 77 222 33 44", gender: "M", birthDate: new Date("1962-08-15"), city: "Dakar",  country: "Sénégal", hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "VISA_OK",    emergencyName: "Adja Fall",        emergencyPhone: "+221 77 000 66 06", offer: zOffers.h24std, status: "CONFIRMED" as const },
    { email: "kadija.tounkara.2024@zam.ne",  name: "Kadija Tounkara", phone: "+223 78 44 55 66",  gender: "F", birthDate: new Date("1977-12-03"), city: "Ségou",  country: "Mali",    hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "REGISTERED", emergencyName: "Bakary Tounkara",  emergencyPhone: "+223 78 000 77 07", offer: zOffers.h24std, status: "CONFIRMED" as const },
    { email: "oumar.sall.2024@zam.ne",       name: "Oumar Sall",      phone: "+221 76 666 77 88", gender: "M", birthDate: new Date("1958-04-18"), city: "Louga",  country: "Sénégal", hasPassport: true,  hasCni: false, hasVaccine: true,  pilgrimStatus: "VISA_OK",    emergencyName: "Fatou Sall",       emergencyPhone: "+221 76 000 88 08", offer: zOffers.h24std, status: "CONFIRMED" as const },
    { email: "aminata.conde.2024@zam.ne",    name: "Aminata Condé",   phone: "+224 631 88 99 00", gender: "F", birthDate: new Date("1980-06-30"), city: "Kankan", country: "Guinée",  hasPassport: true,  hasCni: true,  hasVaccine: false, pilgrimStatus: "INCOMPLETE", emergencyName: "Lansana Condé",    emergencyPhone: "+224 631 000 99 09", offer: zOffers.h24std, status: "CONFIRMED" as const },
  ];
  for (const p of zamPilgrims2024) {
    const { offer, status, ...pilgrimData } = p;
    const user = await createPilgrim({ ...pilgrimData, tenantId: zam.id, password: pw, createdAt: new Date("2024-02-01") });
    await createReservation({ tenantId: zam.id, userId: user.id, offerId: offer.id, status, totalAmount: offer.priceAdult, createdAt: new Date("2024-02-15") });
    await createDocumentsForPilgrim(zam.id, user.id, { hasPassport: p.hasPassport, hasCni: p.hasCni, hasVaccine: p.hasVaccine }, new Date("2024-02-10"), zamAdmin.id);
  }
  console.log(`   → ${zamPilgrims2024.length} pèlerins ZAM 2024`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. AGENCE BARAKAH (Mali, depuis mars 2022)
  // ══════════════════════════════════════════════════════════════════════════
  const barakah = await prisma.tenant.create({
    data: {
      slug: "barakah",
      name: "Barakah Voyages",
      email: "contact@barakah-voyages.ml",
      phone: "+223 76 12 34 56",
      address: "Bamako, Mali",
      country: "ML",
      plan: "PRO",
      status: "ACTIVE",
      theme: {
        primaryColor: "#1a3a5c",
        secondaryColor: "#c0932b",
        whatsappNumber: "22376123456",
        tagline: "Bénédiction & Sérénité pour vos pèlerins",
        defaultLocale: "fr",
      },
    },
  });
  await prisma.tenant.update({ where: { id: barakah.id }, data: { createdAt: new Date("2022-03-10") } });

  const barakahAdmin = await prisma.user.create({
    data: {
      tenantId: barakah.id,
      email: "admin@barakah-voyages.ml",
      name: "Amadou Diallo",
      password: await hashPw("BarakahAdmin123!"),
      role: "AGENCY_ADMIN",
      permissions: [],
      active: true,
      createdAt: new Date("2022-03-10"),
    },
  });
  console.log("✅ Agence BARAKAH + Admin créés");

  // ── VOYAGES BARAKAH ────────────────────────────────────────────────────────
  const bOffers = {
    h26std: await createOffer({
      tenantId: barakah.id, slug: "hajj-standard-confort-2026",
      titleFr: "Hajj Standard Confort 2026", type: "HAJJ",
      descFr: "Forfait Hajj tout compris depuis Bamako, hébergement 4★.",
      priceAdult: 4_800_000,
      departureDate: new Date("2026-06-03"), returnDate: new Date("2026-06-29"),
      maxCapacity: 80, createdAt: new Date("2026-01-15"),
    }),
    o26ram: await createOffer({
      tenantId: barakah.id, slug: "omra-ramadan-superieur-2026",
      titleFr: "Omra Ramadan Supérieur 2026", type: "UMRAH",
      descFr: "Omra Ramadan depuis Bamako avec programme spirituel complet.",
      priceAdult: 1_950_000,
      departureDate: new Date("2026-03-15"), returnDate: new Date("2026-03-30"),
      maxCapacity: 50, createdAt: new Date("2026-01-10"),
    }),
    o26vip: await createOffer({
      tenantId: barakah.id, slug: "omra-vip-2026",
      titleFr: "Omra VIP 2026", type: "UMRAH",
      descFr: "Omra VIP hôtels luxe, service premium.",
      priceAdult: 3_500_000,
      departureDate: new Date("2026-05-15"), returnDate: new Date("2026-05-25"),
      maxCapacity: 25, createdAt: new Date("2026-02-01"),
    }),
    h25std: await createOffer({
      tenantId: barakah.id, slug: "hajj-standard-2025",
      titleFr: "Hajj Standard 2025", type: "HAJJ",
      descFr: "Hajj 2025 tout compris depuis Bamako.",
      priceAdult: 4_400_000,
      departureDate: new Date("2025-06-06"), returnDate: new Date("2025-07-02"),
      maxCapacity: 70, createdAt: new Date("2025-01-10"),
    }),
  };
  console.log(`   → ${Object.keys(bOffers).length} voyages BARAKAH créés`);

  // ── PÈLERINS BARAKAH 2026 ──────────────────────────────────────────────────
  const barakahPilgrims2026 = [
    { email: "modibo.keita@barakah.ml",         name: "Modibo Keïta",          phone: "+223 76 111 22 33", gender: "M", birthDate: new Date("1967-03-12"), city: "Bamako", country: "Mali", hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "VISA_OK",    emergencyName: "Fatoumata Keïta",  emergencyPhone: "+223 76 000 11 11", offer: bOffers.h26std, status: "CONFIRMED" as const },
    { email: "sitan.coulibaly@barakah.ml",       name: "Sitan Coulibaly",       phone: "+223 78 222 33 44", gender: "F", birthDate: new Date("1979-07-19"), city: "Sikasso", country: "Mali", hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "REGISTERED", emergencyName: "Drissa Coulibaly", emergencyPhone: "+223 78 000 22 22", offer: bOffers.h26std, status: "CONFIRMED" as const },
    { email: "boubacar.diallo@barakah.ml",       name: "Boubacar Diallo",       phone: "+224 621 33 44 55", gender: "M", birthDate: new Date("1972-11-05"), city: "Boké",   country: "Guinée", hasPassport: true,  hasCni: false, hasVaccine: true,  pilgrimStatus: "INCOMPLETE", emergencyName: "Mariama Diallo",   emergencyPhone: "+224 621 000 33 33", offer: bOffers.o26ram, status: "PENDING"   as const },
    { email: "oumou.sangare@barakah.ml",         name: "Oumou Sangaré Traoré",  phone: "+223 65 444 55 66", gender: "F", birthDate: new Date("1985-01-28"), city: "Mopti",  country: "Mali", hasPassport: true,  hasCni: true,  hasVaccine: false, pilgrimStatus: "PENDING",    emergencyName: "Hamidou Traoré",  emergencyPhone: "+223 65 000 44 44", offer: bOffers.h26std, status: "PENDING"   as const },
    { email: "cheick.sissoko@barakah.ml",        name: "Cheick Oumar Sissoko",  phone: "+223 76 555 66 77", gender: "M", birthDate: new Date("1960-09-14"), city: "Kayes",  country: "Mali", hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "VISA_OK",    emergencyName: "Rokia Sissoko",   emergencyPhone: "+223 76 000 55 55", offer: bOffers.o26vip, status: "CONFIRMED" as const },
    { email: "awa.traore@barakah.ml",            name: "Awa Traoré Koné",       phone: "+223 79 666 77 88", gender: "F", birthDate: new Date("1974-05-30"), city: "Bamako", country: "Mali", hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "REGISTERED", emergencyName: "Seydou Koné",     emergencyPhone: "+223 79 000 66 66", offer: bOffers.h26std, status: "CONFIRMED" as const },
  ];
  for (const p of barakahPilgrims2026) {
    const { offer, status, ...pilgrimData } = p;
    const user = await createPilgrim({ ...pilgrimData, tenantId: barakah.id, password: pw, createdAt: new Date("2026-02-01") });
    await createReservation({ tenantId: barakah.id, userId: user.id, offerId: offer.id, status, totalAmount: offer.priceAdult, createdAt: new Date("2026-02-15") });
    await createDocumentsForPilgrim(barakah.id, user.id, { hasPassport: p.hasPassport, hasCni: p.hasCni, hasVaccine: p.hasVaccine }, new Date("2026-02-10"), barakahAdmin.id);
  }
  console.log(`   → ${barakahPilgrims2026.length} pèlerins BARAKAH 2026`);

  // ── PÈLERINS BARAKAH 2025 ──────────────────────────────────────────────────
  const barakahPilgrims2025 = [
    { email: "adama.coulibaly.2025@barakah.ml", name: "Adama Coulibaly", phone: "+223 76 123 45 67", gender: "M", birthDate: new Date("1965-08-20"), city: "Bamako", country: "Mali", hasPassport: true,  hasCni: true,  hasVaccine: true,  pilgrimStatus: "VISA_OK",    emergencyName: "Djeneba Coulibaly", emergencyPhone: "+223 76 000 77 77", offer: bOffers.h25std, status: "CONFIRMED" as const },
    { email: "hawa.diarra.2025@barakah.ml",     name: "Hawa Diarra",     phone: "+223 78 234 56 78", gender: "F", birthDate: new Date("1980-02-14"), city: "Ségou",  country: "Mali", hasPassport: true,  hasCni: true,  hasVaccine: false, pilgrimStatus: "REGISTERED", emergencyName: "Moussa Diarra",     emergencyPhone: "+223 78 000 88 88", offer: bOffers.h25std, status: "CONFIRMED" as const },
    { email: "seydou.bamba.2025@barakah.ml",    name: "Seydou Bamba",    phone: "+223 65 345 67 89", gender: "M", birthDate: new Date("1958-11-11"), city: "Kayes",  country: "Mali", hasPassport: true,  hasCni: false, hasVaccine: true,  pilgrimStatus: "VISA_OK",    emergencyName: "Mariam Bamba",      emergencyPhone: "+223 65 000 99 99", offer: bOffers.h25std, status: "CONFIRMED" as const },
  ];
  for (const p of barakahPilgrims2025) {
    const { offer, status, ...pilgrimData } = p;
    const user = await createPilgrim({ ...pilgrimData, tenantId: barakah.id, password: pw, createdAt: new Date("2025-02-01") });
    await createReservation({ tenantId: barakah.id, userId: user.id, offerId: offer.id, status, totalAmount: offer.priceAdult, createdAt: new Date("2025-02-15") });
    await createDocumentsForPilgrim(barakah.id, user.id, { hasPassport: p.hasPassport, hasCni: p.hasCni, hasVaccine: p.hasVaccine }, new Date("2025-02-10"), barakahAdmin.id);
  }
  console.log(`   → ${barakahPilgrims2025.length} pèlerins BARAKAH 2025`);

  // ── RÉSUMÉ ─────────────────────────────────────────────────────────────────
  console.log("\n🎉 Seed terminé !\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  SUPER ADMIN");
  console.log("  Email    : superadmin@hajj-platform.com");
  console.log("  Password : SuperAdmin123!");
  console.log("───────────────────────────────────────────────────────────────");
  console.log("  ZAM Hajj & Oumra   (Niger, PRO, depuis 2021)");
  console.log("  Login    : admin@zamhajj.com  /  ZamAdmin123!");
  console.log("  Voyages  : 5 en 2026 · 2 en 2025 · 1 en 2024");
  console.log("  Pèlerins : 10 en 2026 · 5 en 2025 · 4 en 2024");
  console.log("───────────────────────────────────────────────────────────────");
  console.log("  Barakah Voyages    (Mali, PRO, depuis 2022)");
  console.log("  Login    : admin@barakah-voyages.ml  /  BarakahAdmin123!");
  console.log("  Voyages  : 3 en 2026 · 1 en 2025");
  console.log("  Pèlerins : 6 en 2026 · 3 en 2025");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\n  Mot de passe pèlerins : Pelerin123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
