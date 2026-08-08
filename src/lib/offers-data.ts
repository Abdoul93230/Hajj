export type Offer = {
  slug: string;
  type: "OUMRA" | "HADJ";
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: "blue" | "amber" | "purple";
  available: boolean;
  heroImage: string;
  priceFrom: number;
  priceCurrency: string;
  duration: string;
  departure: string | null;
  returnDate: string | null;
  airline: string | null;
  hotels: {
    city: "Médine" | "Makkah";
    name: string;
    checkin: string | null;
    checkout: string | null;
    nights: number | null;
    distance: string;
    pension: string;
  }[];
  flights: {
    direction: "Aller" | "Retour";
    airline: string;
    from: string;
    to: string;
    departTime: string | null;
    arrivalTime: string | null;
    date: string | null;
    stopover: string | null;
    bagageSoute: string;
    bagageCabine: string;
  }[];
  pricing: {
    label: string;
    sublabel: string;
    price: number | null;
    highlight?: boolean;
  }[];
  program: {
    step: number;
    title: string;
    content: string;
  }[];
  documents: {
    icon: string;
    title: string;
    content: string;
  }[];
  highlights: { icon: string; label: string; value: string }[];
  included: string[];
  notIncluded: string[];
};

const PROGRAM_OUMRA = [
  {
    step: 1,
    title: "Départ de Niamey",
    content: "Départ en groupe depuis Niamey avec vos documents, accompagné de notre équipe. Formalités d'embarquement prises en charge.",
  },
  {
    step: 2,
    title: "Séjour à Médine",
    content: "Après votre arrivée, une réunion d'information sera organisée pour vous expliquer les bienfaits de Médine et de la Mosquée du Prophète ﷺ, avec de nombreux conseils pratiques.",
  },
  {
    step: 3,
    title: "Visite de la Rawda Sharifa",
    content: "Vivez un moment spirituel unique en visitant la Rawda Sharifa, située dans la Mosquée du Prophète ﷺ. Considérée comme l'un des jardins du Paradis, elle est un lieu de recueillement privilégié.",
  },
  {
    step: 4,
    title: "Visite de la mosquée de Quba",
    content: "Le Prophète ﷺ a dit : « Quiconque se purifie chez lui, puis se rend à Quba et y effectue une prière remportera une récompense égale à celle d'une Oumra. »",
  },
  {
    step: 5,
    title: "Visite du mont Uhud",
    content: "Visite du mont Uhud, lieu emblématique de l'Histoire de l'Islam. Il est conseillé de visiter les tombes des Martyrs d'Uhud afin d'invoquer Allah pour eux.",
  },
  {
    step: 6,
    title: "Les rites de la Oumra",
    content: "Vous réaliserez les rites de la Oumra (Tawaf, Saî), accompagnés de votre guide qui vous expliquera chaque étape, répondra à vos questions et vous encadrera tout au long.",
  },
  {
    step: 7,
    title: "Les bienfaits de Makkah",
    content: "Un cours sur les bienfaits de Makkah et des informations pratiques vous seront délivrés pour profiter au mieux de votre séjour à la Cité Sainte.",
  },
  {
    step: 8,
    title: "Retour vers Niamey",
    content: "Votre séjour se terminera in shaa Allah. Nos organisateurs prendront soin de vous communiquer toutes les informations pour un départ en toute sérénité.",
  },
];

const DOCUMENTS_OUMRA = [
  {
    icon: "📘",
    title: "Passeport",
    content: "Passeport de nationalité nigérienne valable au minimum 6 mois après la date de retour.",
  },
  {
    icon: "📷",
    title: "Photos d'identité",
    content: "Quatre (04) photos d'identité récentes (avec hijab pour les femmes).",
  },
  {
    icon: "💉",
    title: "Vaccinations",
    content: "Carnet jaune de vaccination contre la fièvre jaune et la méningite obligatoire. D'autres vaccins peuvent s'ajouter selon les réglementations saoudiennes.",
  },
  {
    icon: "💳",
    title: "Acompte",
    content: "Acompte de 500 000 FCFA à la réservation (virement bancaire, chèque ou carte bancaire).",
  },
];

export const OFFERS: Offer[] = [
  /* ── OUMRA AOÛT 2026 ─────────────────────────── */
  {
    slug: "oumra-aout-2026",
    type: "OUMRA",
    title: "Oumra Août 2026",
    subtitle: "Oumra tout compris",
    badge: "Disponible",
    badgeColor: "blue",
    available: true,
    heroImage: "/images/kaaba.jpg",
    priceFrom: 1250000,
    priceCurrency: "FCFA",
    duration: "19 jours",
    departure: "04 Août 2026",
    returnDate: "23 Août 2026",
    airline: "Turkish Airlines",
    highlights: [
      { icon: "🕌", label: "Durée",         value: "19 jours" },
      { icon: "🏨", label: "Hébergement",   value: "4 nuits Médine · 15 nuits Makkah" },
      { icon: "✈️", label: "Vol",            value: "Turkish Airlines" },
      { icon: "👤", label: "Guide",          value: "Expérimenté inclus" },
    ],
    hotels: [
      {
        city: "Médine",
        name: "Deyar Al Eiman",
        checkin: "04/08/2026",
        checkout: "08/08/2026",
        nights: 4,
        distance: "~170 m de la mosquée",
        pension: "Non incluse",
      },
      {
        city: "Makkah",
        name: "Razana Hôtel",
        checkin: "08/08/2026",
        checkout: "23/08/2026",
        nights: 15,
        distance: "~600 m du Haram",
        pension: "Non incluse",
      },
    ],
    flights: [
      {
        direction: "Aller",
        airline: "Turkish Airlines",
        from: "Niamey (NIM)",
        to: "Médine (MED)",
        departTime: "22h25",
        arrivalTime: "16h15",
        date: "04/08/2026",
        stopover: "Escale Istanbul",
        bagageSoute: "23 kg",
        bagageCabine: "7 kg",
      },
      {
        direction: "Retour",
        airline: "Turkish Airlines",
        from: "Médine (MED)",
        to: "Niamey (NIM)",
        departTime: "19h20",
        arrivalTime: "05h25",
        date: "23/08/2026",
        stopover: "Escale Istanbul",
        bagageSoute: "23 kg",
        bagageCabine: "7 kg",
      },
    ],
    pricing: [
      { label: "Chambre quadruple",  sublabel: "par adulte",           price: 1250000, highlight: true },
      { label: "Chambre double",     sublabel: "par personne (couple)", price: 1250000 },
      { label: "Enfant",             sublabel: "2 à 12 ans",            price: 1150000 },
      { label: "Bébé",               sublabel: "0 à 2 ans",             price: 300000 },
    ],
    program: [
      ...PROGRAM_OUMRA.slice(0, 7),
      {
        step: 8,
        title: "Visite des lieux du Hadj",
        content: "Visite de Mina, Arafat, Muzdalifah et le Jamarat — des lieux chargés d'histoire et de spiritualité.",
      },
      {
        step: 9,
        title: "Retour vers Niamey",
        content: "Votre séjour se terminera in shaa Allah. Nos organisateurs prendront soin de vous communiquer toutes les informations pour un départ en toute sérénité.",
      },
    ],
    documents: DOCUMENTS_OUMRA,
    included: [
      "Vol aller-retour Turkish Airlines",
      "Visa Oumra",
      "Hébergement 4 nuits à Médine",
      "Hébergement 15 nuits à Makkah",
      "Transferts aéroport ↔ hôtels",
      "Encadrement religieux & guides",
      "Cours préparatoires aux rites",
      "Visites guidées (Rawda, Quba, Uhud…)",
    ],
    notIncluded: [
      "Repas (pension non incluse)",
      "Dépenses personnelles",
      "Pourboires",
    ],
  },

  /* ── OUMRA RAMADAN 2027 ──────────────────────── */
  {
    slug: "oumra-ramadan-2027",
    type: "OUMRA",
    title: "Oumra Ramadan 2027",
    subtitle: "Oumra tout compris",
    badge: "Bientôt disponible",
    badgeColor: "purple",
    available: false,
    heroImage: "/images/mosque-night.jpg",
    priceFrom: 1950000,
    priceCurrency: "FCFA",
    duration: "À confirmer",
    departure: null,
    returnDate: null,
    airline: null,
    highlights: [
      { icon: "🌙", label: "Période",        value: "Ramadan 2027" },
      { icon: "🏨", label: "Hébergement",   value: "Médine + Makkah" },
      { icon: "✈️", label: "Vol",            value: "Niamey → Médine" },
      { icon: "👤", label: "Guide",          value: "Expérimenté inclus" },
    ],
    hotels: [
      {
        city: "Médine",
        name: "Deyar Al Eiman",
        checkin: null,
        checkout: null,
        nights: null,
        distance: "~170 m de la mosquée",
        pension: "Non incluse",
      },
      {
        city: "Makkah",
        name: "Razana Hôtel (provisoire)",
        checkin: null,
        checkout: null,
        nights: null,
        distance: "~600 m du Haram",
        pension: "Non incluse",
      },
    ],
    flights: [
      {
        direction: "Aller",
        airline: "À confirmer",
        from: "Niamey (NIM)",
        to: "Médine (MED)",
        departTime: null,
        arrivalTime: null,
        date: null,
        stopover: "Vol direct",
        bagageSoute: "23 kg",
        bagageCabine: "7 kg",
      },
      {
        direction: "Retour",
        airline: "À confirmer",
        from: "Médine (MED)",
        to: "Niamey (NIM)",
        departTime: null,
        arrivalTime: null,
        date: null,
        stopover: "Vol direct",
        bagageSoute: "23 kg",
        bagageCabine: "7 kg",
      },
    ],
    pricing: [
      { label: "Chambre quadruple",  sublabel: "par adulte",           price: null, highlight: true },
      { label: "Chambre double",     sublabel: "par personne (couple)", price: null },
      { label: "Enfant",             sublabel: "2 à 12 ans",            price: null },
      { label: "Bébé",               sublabel: "0 à 2 ans",             price: null },
    ],
    program: PROGRAM_OUMRA,
    documents: DOCUMENTS_OUMRA,
    included: [
      "Vols charter & réguliers",
      "Visa Oumra inclus",
      "Prise en charge médicale complète",
      "Hébergement à Médine (~170 m mosquée)",
      "Hébergement à Makkah (~600 m Haram)",
      "Accompagnement et cours inclus",
      "Guides expérimentés",
      "Transferts aéroport ↔ hôtels",
    ],
    notIncluded: [
      "Repas (pension non incluse)",
      "Dépenses personnelles",
      "Pourboires",
    ],
  },

  /* ── HADJ 2027 ───────────────────────────────── */
  {
    slug: "hadj-2027",
    type: "HADJ",
    title: "Hadj 2027",
    subtitle: "Hadj tout compris",
    badge: "Inscriptions ouvertes",
    badgeColor: "amber",
    available: true,
    heroImage: "/images/tawaf.jpg",
    priceFrom: 3184500,
    priceCurrency: "FCFA",
    duration: "À confirmer",
    departure: null,
    returnDate: null,
    airline: null,
    highlights: [
      { icon: "🕋", label: "Type",           value: "Hadj officiel" },
      { icon: "🏨", label: "Hébergement",   value: "Proche du Haram" },
      { icon: "✈️", label: "Vol",            value: "Niamey → Jeddah" },
      { icon: "👤", label: "Guide",          value: "Encadrement complet" },
    ],
    hotels: [
      {
        city: "Makkah",
        name: "À confirmer",
        checkin: null,
        checkout: null,
        nights: null,
        distance: "Proche du Haram",
        pension: "Non incluse",
      },
      {
        city: "Médine",
        name: "À confirmer",
        checkin: null,
        checkout: null,
        nights: null,
        distance: "Proche de la mosquée",
        pension: "Non incluse",
      },
    ],
    flights: [
      {
        direction: "Aller",
        airline: "À confirmer",
        from: "Niamey (NIM)",
        to: "Jeddah (JED)",
        departTime: null,
        arrivalTime: null,
        date: null,
        stopover: null,
        bagageSoute: "23 kg",
        bagageCabine: "7 kg",
      },
      {
        direction: "Retour",
        airline: "À confirmer",
        from: "Jeddah (JED)",
        to: "Niamey (NIM)",
        departTime: null,
        arrivalTime: null,
        date: null,
        stopover: null,
        bagageSoute: "23 kg",
        bagageCabine: "7 kg",
      },
    ],
    pricing: [
      { label: "Adulte",  sublabel: "par personne", price: 3184500, highlight: true },
    ],
    program: [
      { step: 1, title: "Départ de Niamey", content: "Départ en groupe depuis Niamey avec vos documents, accompagné de notre équipe. Formalités d'embarquement prises en charge." },
      { step: 2, title: "Arrivée à Makkah", content: "Installation à l'hôtel. Réunion d'information sur les rites du Hadj, les bienfaits de Makkah et les consignes pratiques." },
      { step: 3, title: "Séjour à Makkah — rites préliminaires", content: "Accomplissement des prières à la Mosquée Sacrée, tawaf de bienvenue (Tawaf al-Qudum) et prières optionnelles." },
      { step: 4, title: "8 Dhul Hijja — Yawm at-Tarwiyah", content: "Départ vers Mina pour le séjour de la nuit. Prières et méditation dans les tentes de Mina." },
      { step: 5, title: "9 Dhul Hijja — Yawm Arafah", content: "Pilier central du Hadj. Séjour à Arafah de midi jusqu'au coucher du soleil pour les supplication et invocations." },
      { step: 6, title: "Muzdalifah & Jamarat", content: "Nuit à Muzdalifah, collecte des cailloux, puis lapidation du Jamarat (symbolisant le rejet de Satan)." },
      { step: 7, title: "Séjour à Médine", content: "Visite de la Mosquée du Prophète ﷺ, de la Rawda Sharifa, de Quba et d'Uhud." },
      { step: 8, title: "Retour vers Niamey", content: "Fin du séjour in shaa Allah. Départ organisé dans les meilleures conditions." },
    ],
    documents: [
      ...DOCUMENTS_OUMRA,
      {
        icon: "📋",
        title: "Formulaire Hadj",
        content: "Formulaire d'inscription officiel au Hadj délivré par le COHO (Commissariat à l'Organisation du Hadj et de la Oumra du Niger).",
      },
    ],
    included: [
      "Visa Hadj",
      "Vol aller-retour",
      "Hébergement proche du Haram (Makkah)",
      "Hébergement à Médine",
      "Tentes de Mina",
      "Encadrement religieux & guides",
      "Transferts et transports sur place",
      "Constitution du dossier COHO",
    ],
    notIncluded: [
      "Repas (pension non incluse)",
      "Dépenses personnelles",
      "Pourboires",
    ],
  },
];

export function getOfferBySlug(slug: string): Offer | undefined {
  return OFFERS.find((o) => o.slug === slug);
}
