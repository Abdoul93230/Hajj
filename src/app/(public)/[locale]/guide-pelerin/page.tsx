"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { BookOpen, Compass, ChevronRight, ArrowRight } from "lucide-react";
import IconWhatsApp from "@/components/ui/IconWhatsApp";

/* ─── DATA ──────────────────────────────────────── */

const TOC = [
  { id: "intro",          label: "Introduction aux types de pèlerinage" },
  { id: "oumra",          label: "Qu'est-ce que la Oumra ?" },
  { id: "rites-oumra",    label: "Les rituels de la Oumra" },
  { id: "hadj",           label: "Qu'est-ce que le Hadj ?" },
  { id: "rites-hadj",     label: "Les rites du Hadj" },
  { id: "duas",           label: "Du'as & Invocations" },
  { id: "conclusion",     label: "Conclusion" },
];

const PILGRIMAGES = [
  {
    title: "Hadj Tamattu'",
    arabic: "حج التمتع",
    desc: "Effectuer la Oumra puis le Hadj séparément, lors du même voyage. C'est la formule la plus courante pour les pèlerins étrangers.",
    badge: "Le plus courant",
    color: "blue",
  },
  {
    title: "Hadj Ifrad",
    arabic: "حج الإفراد",
    desc: "N'effectuer que le Hadj, sans Oumra dans le même voyage. L'état d'Ihram est maintenu depuis la Miqat jusqu'aux rites du Hadj.",
    badge: null,
    color: "amber",
  },
  {
    title: "Hadj Qiran",
    arabic: "حج القران",
    desc: "Combiner la Oumra et le Hadj en un seul Ihram continu. Le pèlerin effectue les rites des deux pèlerinages sans se désacraliser entre les deux.",
    badge: null,
    color: "blue",
  },
];

const OUMRA_RITUALS = [
  {
    step: 1,
    title: "Préparation à la sacralisation (Ihram)",
    content: "Avant d'entrer en état d'Ihram, il est recommandé de se purifier : bain de purification (Ghousl), couper les ongles, enlever les poils superflus. Pour les hommes, il est conseillé de se parfumer avant de revêtir les habits d'Ihram.",
  },
  {
    step: 2,
    title: "Vêtements de sacralisation",
    content: "Pour les hommes : deux pièces de tissu blanc non cousu — l'Izar (pièce du bas enroulée autour de la taille) et le Rida (pièce du haut drapée sur les épaules). Des sandales sont permises. Pour les femmes : des vêtements couvrants habituels, sans couvrir le visage ni les mains.",
  },
  {
    step: 3,
    title: "Départ vers La Mecque — la Miqat",
    content: "La Miqat est le point de passage obligatoire pour entrer en état d'Ihram. Pour les pèlerins de Médine, la Miqat est Dhou-El Houlayfa. On y formule l'intention de la Oumra et on prononce la Talbiya.",
  },
  {
    step: 4,
    title: "La Talbiya",
    content: 'Après l\'intention, on prononce : « Labbaïka Allahoumma labbaïk, Labbaïka lâ charîka laka labbaïk, Innal hamda wan ni\'mata laka wal moulk, lâ charîka lak. » (Me voici à Ta disposition, ô Allah, me voici ! Il n\'est point d\'associé à Toi.)',
  },
  {
    step: 5,
    title: "Interdictions durant l'Ihram",
    content: "Pour tous : se couper les cheveux ou les ongles, utiliser du parfum, se marier ou contracter un mariage, avoir des rapports conjugaux, chasser. Pour les hommes en plus : se couvrir la tête, porter des vêtements cousus. Pour les femmes : se couvrir le visage.",
  },
  {
    step: 6,
    title: "Arrivée à La Mecque — Première vue de la Ka'ba",
    content: "En apercevant la Ka'ba pour la première fois, il est recommandé de lever les mains et de faire des invocations. Certains savants conseillent de dire : « Allahoumma zid hadhâl bayta tachrifan wa ta'dhîman wa takrîman wa mahâbatan. »",
  },
  {
    step: 7,
    title: "Le Tawaf",
    content: "Circumambulation autour de la Ka'ba 7 fois dans le sens antihoraire, en commençant et terminant par la Pierre Noire (Hajarul Aswad). On commence par l'Istilam (toucher ou saluer la Pierre Noire), puis on effectue les 7 tours en récitant des invocations et en glorifiant Allah.",
  },
  {
    step: 8,
    title: "Le Sa'i entre Safa et Marwa",
    content: "Aller-retour 7 fois entre les collines de Safa et de Marwa, en commémorant la course de Hajar (Agar), épouse d'Ibrahim (Abraham), à la recherche d'eau pour son fils Ismaïl. On commence par Safa et on termine par Marwa.",
  },
  {
    step: 9,
    title: "Fin de la Oumra — Tahallul",
    content: "Après le Sa'i, on sort de l'état d'Ihram en se rasant la tête entièrement (Halq) ou en se raccourcissant les cheveux (Taqsîr). Le rasage est préférable pour les hommes. Après cela, toutes les interdictions de l'Ihram sont levées.",
  },
];

const HAJJ_DAYS = [
  {
    day: "8 Dhou-Al-Hijja",
    title: "Yawm at-Tarwiyah — Départ vers Mina",
    content: "Le matin du 8, le pèlerin entre en état d'Ihram depuis son lieu de résidence à La Mecque (ou depuis la Miqat s'il n'avait pas encore fait la Oumra). Il part ensuite vers Mina pour y passer la journée et la nuit, en effectuant les prières du Dhouhr, Asr, Maghreb, Ichaa et Fadjr (chacune dans ses temps respectifs, en les raccourcissant sans les regrouper).",
  },
  {
    day: "9 Dhou-Al-Hijja",
    title: "Yawm Arafah — Le pilier du Hadj",
    content: "C'est le jour le plus important du Hadj. Après la prière du Fadjr, les pèlerins se rendent à Arafat. Ils y effectuent les prières du Dhouhr et de l'Asr regroupées et raccourcies, puis se tiennent à Arafat jusqu'au coucher du soleil en invoquant Allah. La station à Arafat est le pilier fondamental du Hadj — « Le Hadj, c'est Arafat. »",
  },
  {
    day: "Nuit à Muzdalifa",
    title: "Collecte des cailloux",
    content: "Après le coucher du soleil, les pèlerins partent vers Muzdalifa où ils effectuent les prières du Maghreb et de l'Ichaa regroupées. Ils y passent la nuit et ramassent les cailloux pour la lapidation du lendemain (minimum 49 cailloux de la taille d'un pois chiche). Les personnes âgées, malades ou accompagnées d'enfants peuvent partir vers minuit.",
  },
  {
    day: "10 Dhou-Al-Hijja",
    title: "Yawm an-Nahr — Jour du sacrifice",
    content: "Ce jour comporte 4 actes à effectuer dans l'ordre : 1) Lapidation du grand Jamarat (Jamarat al-Aqaba) avec 7 cailloux. 2) Sacrifice d'un animal. 3) Rasage ou raccourcissement des cheveux (première désacralisation partielle). 4) Tawaf al-Ifada et Sa'i (désacralisation complète). Après ces actes, toutes les interdictions de l'Ihram sont levées.",
  },
  {
    day: "11-13 Dhou-Al-Hijja",
    title: "Jours de Tachrik — Mina",
    content: "Les pèlerins retournent à Mina pour y passer les nuits. Chaque jour, après le Dhouhr, ils lapident les trois Jamarats (petit, moyen, grand) avec 7 cailloux chacun. Il est permis de quitter Mina après la lapidation du 12 avant le coucher du soleil (départ anticipé). Sinon, on reste jusqu'au 13.",
  },
  {
    day: "Avant le départ",
    title: "Tawaf al-Wada' — L'adieu",
    content: "Avant de quitter La Mecque, chaque pèlerin doit effectuer le Tawaf de l'adieu (7 circumambulations autour de la Ka'ba). C'est le dernier acte du Hadj. Les femmes en période de menstruation en sont dispensées.",
  },
];

const DUAS = [
  {
    id: "dua-voyageur",
    category: "Voyage",
    title: "Invocation du voyageur (pour le résident qui reste)",
    arabic: "استودعكم الله الذي لا تضيع ودائعه",
    phonetic: "Astawdi'ukoumoul-Lâhoul Lazî Lâ toudîou Wadâ'i'ahou",
    french: "Je vous confie à Allah, Celui dont les dépôts ne se perdent jamais.",
  },
  {
    id: "dua-sortie-maison",
    category: "Voyage",
    title: "Invocation de sortie de la maison",
    arabic: "بسم الله، توكلت على الله، لا حول ولا قوة إلا بالله؛ اللهم إني أعوذ بك أن أضل أو أضل، أو أزل أو أزل، أو أظلم أو أظلم، أو أجهل أو يجهل علي",
    phonetic: "Bismillâhi, Tawakaltou Alalâhi, Lâ hawla walâ qouwwata Illâ billâhi. Allâhoumma Innî aoûzou bika an adilla aw oudalla, aw azilla aw ouzalla, an azlima aw ouzlama, aw ajhala aw youjhala alayya.",
    french: "Au nom d'Allah. Je me confie à Allah. Il n'y a de force et de puissance qu'en Allah. Ô Allah ! Je cherche Ton refuge contre le fait d'égarer ou d'être égaré, de glisser ou de faire glisser, d'opprimer ou d'être opprimé, d'être ignorant ou de me faire traiter avec ignorance.",
  },
  {
    id: "dua-voyage",
    category: "Voyage",
    title: "Invocation du voyage (sur la monture)",
    arabic: "الله أكبر — سبحان الذي سخر لنا هذا وما كنا له مقرنين، وإنا إلى ربنا لمنقلبون. اللهم إنا نسألك في سفرنا هذا البر والتقوى، ومن العمل ما ترضى. اللهم هون علينا سفرنا هذا واطو عنا بعده",
    phonetic: "Allahou Akbar (3×). Soubhânallazî sakhara lanâ hâzâ wa mâ kounnâ lahoû mouqrinîna, wa innâ ilâ rabbinâ lamounqaliboûna. Allâhoumma innâ nas'alouka fî safarnâ hâzâ albirra wattaqwâ, wa nimal'amali mâ tardâ. Allâhoumma hawwin alaynâ safarinâ hazâ watwi annâ bou'oudahou.",
    french: "Allah est le Plus Grand (3×). Gloire à Celui qui nous a assujetti ceci alors que nous n'en étions pas capables, et c'est vers notre Seigneur que nous retournerons. Ô Allah ! Nous Te demandons durant ce voyage la piété et ce qui Te plaît comme œuvre. Ô Allah, facilite-nous ce voyage et raccourcis-en la distance.",
  },
  {
    id: "dua-entree-mosquee",
    category: "Mosquée",
    title: "Invocation d'entrée dans la mosquée",
    arabic: "أعوذ بالله العظيم وبوجهه الكريم وسلطانه القديم من الشيطان الرجيم. بسم الله، والصلاة والسلام على رسول الله، اللهم افتح لي أبواب رحمتك",
    phonetic: "Aoûzou billâhil-azîmi wabi wajhihîl-karîmi wa soultânihil-qadîmi minach-chaytânir'radjîmi. Bismillâhi was'salâtou wassalâmou alâ rasoûlilâhi, allâhoumma iftah lî abwâba rahmatika.",
    french: "Je cherche refuge auprès d'Allah le Très Grand, auprès de Son Noble Visage et de Sa Toute-puissance éternelle, contre Satan le maudit. Au nom d'Allah, que la paix et la bénédiction soient sur le Messager d'Allah. Ô Allah ! Ouvre-moi les portes de Ta miséricorde.",
  },
  {
    id: "dua-sortie-mosquee",
    category: "Mosquée",
    title: "Invocation de sortie de la mosquée",
    arabic: "بسم الله والصلاة والسلام على رسول الله، اللهم أسألك من فضلك، اللهم اعصمني من الشيطان الرجيم",
    phonetic: "Bismillâhi, was'salâtou wassalâmou alâ rasoûlilâhi. Allâhoumma asalouka min fadlika, allâhoumma I'isimnî minach-chaytânir'radjîmi.",
    french: "Au nom d'Allah, que la paix et la bénédiction soient sur le Messager d'Allah. Ô Allah ! Je Te demande de Ta grâce. Ô Allah ! Préserve-moi de Satan le maudit.",
  },
  {
    id: "dua-tombe-prophete",
    category: "Médine",
    title: "Ce qu'on dit auprès de la tombe du Prophète ﷺ",
    arabic: "السلام عليك أيها النبي ورحمة الله وبركاته، صلى عليك الله وجزاك عن أمتك خير الجزاء",
    phonetic: "Assalâmou alyka ayyouhan'nabiyyou warahamatoullâhi wa barakâtouhou, sallâ alaykal-lâhou, wa djazâka an oummatika khayral-djazâ'i.",
    french: "Que la paix, la miséricorde et les bénédictions d'Allah soient sur toi, Ô Prophète ! Qu'Allah Te comble de Ses bénédictions et te récompense du meilleur pour ta communauté.",
  },
  {
    id: "dua-cimetiere",
    category: "Médine",
    title: "Invocation de visite au cimetière (Al-Baqi')",
    arabic: "السلام عليكم أهل الديار، من المؤمنين والمسلمين، وإنا إن شاء الله بكم لاحقون، ويرحم الله المستقدمين منا والمستأخرين، أسأل الله لنا ولكم العافية",
    phonetic: "Assalâmou alaykoum Ahlad-diyâri, minal-Mou'minîna walmouslimâ, wa innâ inchâ-Allâhou bikoum lâhiqoûna – wa yarhamoul-lâhoul moustaqdimîna minnâ wal-mousta'akhirîna – As aloul-lâhou lanâ wa lakoumoul-âfiyata.",
    french: "Que la paix soit sur vous, ô habitants de ces demeures, croyants et musulmans. Nous vous rejoindrons si Allah le veut. Qu'Allah fasse miséricorde à ceux d'entre nous qui sont partis avant et à ceux qui partiront après. Je demande à Allah la santé pour nous et pour vous.",
  },
  {
    id: "dua-ihram",
    category: "Oumra & Hadj",
    title: "La Talbiya — Ce qu'on dit lors de l'Ihrâm",
    arabic: "لبيك اللهم لبيك، لبيك لا شريك لك لبيك، إن الحمد والنعمة لك والملك لا شريك لك",
    phonetic: "Labbaykal-lâhoumma labbayka, Labbayka lâ charîka laka labbayka, innal-hamda wanni'imata laka wal moulk lâ chrîka laka.",
    french: "Me voici à Ta disposition, ô Allah, me voici ! Me voici, Tu n'as pas d'associé, me voici ! La louange, la grâce et la royauté T'appartiennent. Tu n'as pas d'associé.",
    highlight: true,
  },
  {
    id: "dua-tawaf",
    category: "Oumra & Hadj",
    title: "Ce qu'on dit au début du Tawaf",
    arabic: "بسم الله، والله أكبر، اللهم إيمانا بك، وتصديقا بكتابك، ووفاء بعهدك، واتباعا لسنة نبيك صلى الله عليه وسلم",
    phonetic: "Bismillâhi, wal-lâhou akbar, Allâhoumma îmânan bika, wa tasdîqan bikitâbika, wa wafâ'an bi ahdika, wat'tibâ'an lisounnati nabiyyika sallal-lâhou alayhi wasallama.",
    french: "Au nom d'Allah, Allah est le Plus Grand. Ô Allah, avec foi en Toi, confiance en Ton Livre, en accomplissant mon engagement envers Toi et en suivant la Sunna de Ton Prophète ﷺ.",
  },
  {
    id: "dua-yamani",
    category: "Oumra & Hadj",
    title: "Invocation entre le pilier Yémani et la Pierre Noire",
    arabic: "ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار",
    phonetic: "Rabbanâ âtinâ fiddouniyâ hassanatan wa fil âkhirati hassanatan waqinâ azâbannâri.",
    french: "Notre Seigneur, accorde-nous ce qui est bien en ce monde et ce qui est bien dans l'au-delà, et préserve-nous du châtiment du Feu.",
  },
  {
    id: "dua-maqam-ibrahim",
    category: "Oumra & Hadj",
    title: "Invocation au niveau du Maqâm Ibrahim",
    arabic: "واتخذوا من مقام إبراهيم مصلى",
    phonetic: "Wattakhazoû min maqâmi Ibrâhîma mousallâ.",
    french: "Et prenez la station d'Ibrahim comme lieu de prière. (Sourate Al-Baqara, 2:125)",
  },
  {
    id: "dua-zamzam",
    category: "Oumra & Hadj",
    title: "Invocation pour boire l'eau de Zam-Zam",
    arabic: "بسم الله",
    phonetic: "Bismillâhi (puis faire ses propres invocations).",
    french: "Au nom d'Allah. Puis formuler ses propres invocations en buvant.",
  },
  {
    id: "dua-safa",
    category: "Oumra & Hadj",
    title: "Invocation sur le mont Safâ (et Marwa)",
    arabic: "الله أكبر، الله أكبر، الله أكبر — لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. لا إله إلا الله وحده أنجز وعده ونصر عبده وهزم الأحزاب وحده",
    phonetic: "Allâhou Akbar (3×), lâ ilâha illal'lâhou wahadahou lâ charîka lahou, lahoul'moulkou wa lahoul'hamdou wa houwa alâ koulli chai'in qadîroun ; lâ ilâha illal'lâhou wahadahou anjaza wa'adahou, wa naçara abdahou, wa hazamal'ahazâba wahadahou.",
    french: "Allah est le Plus Grand (3×). Il n'y a de divinité qu'Allah, Seul, sans associé. À Lui la royauté et la louange, et Il est Puissant sur toute chose. Il n'y a de divinité qu'Allah Seul, Il a accompli Sa promesse, secouru Son serviteur et vaincu les coalisés Seul.",
  },
  {
    id: "dua-arafat",
    category: "Hadj",
    title: "Invocation du jour d'Arafat",
    arabic: "الله أكبر، الله أكبر، الله أكبر — لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير",
    phonetic: "Allâhou Akbar (3×), lâ ilâha illal'lâhou wahadahou lâ charîka lahou, lahoul'moulkou wa lahoul'hamdou wa houwa alâ koulli chai'in qadîroun.",
    french: "Allah est le Plus Grand (3×). Il n'y a de divinité qu'Allah, Seul, sans associé. À Lui la royauté et la louange, et Il est Puissant sur toute chose.",
  },
  {
    id: "dua-jamarat",
    category: "Hadj",
    title: "Ce qu'on dit lors de la lapidation des Jamarats",
    arabic: "بسم الله، الله أكبر",
    phonetic: "Bismillâhi, Allâhou Akbar.",
    french: "Au nom d'Allah, Allah est le Plus Grand. (À prononcer à chaque jet de caillou.)",
  },
];

const DUA_CATEGORIES = ["Tous", "Voyage", "Mosquée", "Médine", "Oumra & Hadj", "Hadj"];

const TOOLS = [
  { href: "/coran",        icon: <BookOpen size={22} />, title: "Lire le Coran",      desc: "Arabe & traduction française" },
  { href: "/qibla",        icon: <Compass size={22} />,  title: "Direction Qibla",    desc: "Géolocalisation en temps réel" },
  { href: "/guide-pelerin#duas", icon: <span className="text-lg">🤲</span>, title: "Du'as & Invocations", desc: "Les invocations essentielles" },
];

/* ─── COMPONENT ─────────────────────────────────── */

export default function GuidePelerinPage() {
  const [activeSection, setActiveSection] = useState("intro");
  const [duaFilter, setDuaFilter] = useState("Tous");
  const [expandedDua, setExpandedDua] = useState<string | null>(null);

  const filteredDuas = duaFilter === "Tous"
    ? DUAS
    : DUAS.filter((d) => d.category === duaFilter);

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {/* ── HERO ───────────────────────────────────── */}
      <section className="relative bg-[#06251a] py-20 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: "url('/images/mosque-interior.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06251a]/60 to-[#06251a]" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 text-white/50 text-xs mb-4">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight size={12} />
            <span className="text-white/80">Guide du pèlerin</span>
          </div>
          <p className="section-label text-amber-400 mb-3">OUTILS DU PÈLERIN</p>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4" style={{ fontFamily: "var(--font-playfair, serif)" }}>
            Guide du pèlerin
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Les rites du Hadj et de la Oumra, étape par étape.
          </p>
        </div>
      </section>

      {/* ── TOOLS SHORTCUTS ────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-3">
            {TOOLS.map((t) => (
              <Link key={t.href} href={t.href as "/coran" | "/qibla" | "/guide-pelerin"}
                className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
                <span className="text-[#0f5132] group-hover:scale-110 transition-transform">{t.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN ───────────────────────────────────── */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">

            {/* ── SIDEBAR TOC ──────────────────────── */}
            <aside className="hidden lg:block">
              <div className="sticky top-[140px] bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-4">Table des matières</p>
                <nav className="space-y-1">
                  {TOC.map((item) => (
                    <button key={item.id} onClick={() => scrollTo(item.id)}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                        activeSection === item.id
                          ? "bg-[#0f5132] text-white font-semibold"
                          : "text-gray-600 hover:bg-gray-50 hover:text-[#0f5132]"
                      }`}>
                      <ChevronRight size={12} className={activeSection === item.id ? "text-white" : "text-gray-300"} />
                      {item.label}
                    </button>
                  ))}
                </nav>

                {/* CTA box */}
                <div className="mt-6 bg-[#062b1a] rounded-xl p-4 text-white">
                  <p className="font-bold text-sm mb-1">Prêt à partir ?</p>
                  <p className="text-white/60 text-xs mb-3">Consultez nos offres Hadj & Oumra 2026–2027</p>
                  <Link href="/offres"
                    className="flex items-center gap-1.5 text-amber-400 text-xs font-bold hover:text-amber-300 transition-colors">
                    Voir les offres <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </aside>

            {/* ── CONTENT ──────────────────────────── */}
            <div className="space-y-10">

              {/* 1 — Intro */}
              <section id="intro" className="scroll-mt-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-[#0f5132] flex items-center justify-center text-white text-sm font-black flex-shrink-0">1</div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Introduction aux types de pèlerinage</h2>
                </div>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Le pèlerinage islamique se décline principalement en deux formes : la Oumra (le petit pèlerinage, réalisable toute l&apos;année) et le Hadj (le grand pèlerinage, cinquième pilier de l&apos;Islam). Le Hadj lui-même peut être accompli selon trois méthodes :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {PILGRIMAGES.map((p) => (
                    <div key={p.title} className={`rounded-xl border p-4 ${
                      p.color === "blue" ? "bg-emerald-50 border-emerald-200" :
                      p.color === "amber"   ? "bg-amber-50 border-amber-200"     :
                      "bg-emerald-50 border-emerald-200"
                    }`}>
                      {p.badge && (
                        <span className="inline-block text-xs font-bold bg-[#0f5132] text-white px-2 py-0.5 rounded-full mb-2">{p.badge}</span>
                      )}
                      <p className="font-bold text-gray-900 text-sm">{p.title}</p>
                      <p className={`text-xs mb-2 font-arabic ${
                        p.color === "blue" ? "text-[#0f5132]" :
                        p.color === "amber"   ? "text-amber-700"   :
                        "text-emerald-700"
                      }`}>{p.arabic}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 2 — Oumra */}
              <section id="oumra" className="scroll-mt-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-[#0f5132] flex items-center justify-center text-white text-sm font-black flex-shrink-0">2</div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Qu&apos;est-ce que la Oumra ?</h2>
                </div>
                <p className="text-gray-600 leading-relaxed mb-4">
                  La Oumra est un acte d&apos;adoration qui consiste à se rendre à La Mecque pour effectuer des rites spécifiques. Contrairement au Hadj, elle n&apos;est pas obligatoire mais <strong className="text-gray-900">très fortement recommandée</strong>. Elle peut être accomplie à tout moment de l&apos;année.
                </p>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Le Prophète ﷺ a dit : « La Oumra à la Oumra est une expiation pour ce qui se passe entre elles, et le Hadj mabrour n&apos;a pour récompense que le Paradis. » <span className="text-gray-400 text-sm">(Al-Boukhârî et Muslim)</span>
                </p>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <p className="text-sm text-[#062b1a] font-semibold mb-2">Les 4 actes de la Oumra :</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {["Ihram", "Tawaf (7 tours)", "Sa'i (7 allers-retours)", "Tahallul (rasage)"].map((act, i) => (
                      <div key={act} className="bg-white rounded-lg p-3 text-center border border-emerald-100">
                        <div className="w-7 h-7 rounded-full bg-[#0f5132] text-white text-xs font-black flex items-center justify-center mx-auto mb-1.5">{i + 1}</div>
                        <p className="text-xs font-semibold text-gray-800">{act}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 3 — Rituels Oumra */}
              <section id="rites-oumra" className="scroll-mt-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-[#0f5132] flex items-center justify-center text-white text-sm font-black flex-shrink-0">3</div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Les rituels de la Oumra</h2>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
                  <div className="space-y-6">
                    {OUMRA_RITUALS.map((r) => (
                      <div key={r.step} className="flex gap-5">
                        <div className="w-9 h-9 rounded-full bg-[#0f5132] flex items-center justify-center text-white text-xs font-black flex-shrink-0 z-10 shadow-sm">
                          {r.step}
                        </div>
                        <div className="flex-1 pb-1">
                          <p className="font-bold text-gray-900 mb-1.5">{r.title}</p>
                          <p className="text-sm text-gray-600 leading-relaxed">{r.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 4 — Hadj */}
              <section id="hadj" className="scroll-mt-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">4</div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Qu&apos;est-ce que le Hadj ?</h2>
                </div>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Le Hadj est le <strong className="text-gray-900">cinquième pilier de l&apos;Islam</strong>. Il est obligatoire une fois dans la vie pour tout musulman adulte, sain d&apos;esprit et en ayant les moyens physiques et financiers. Il se déroule du 8 au 13 Dhou al-Hijja.
                </p>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Chaque année, des millions de pèlerins du monde entier convergent vers La Mecque pour accomplir ce rite fondamental. Allah dit dans le Coran :
                </p>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 text-center">
                  <p className="text-amber-900 font-bold text-sm mb-1">« وَلِلَّهِ عَلَى النَّاسِ حِجُّ الْبَيْتِ مَنِ اسْتَطَاعَ إِلَيْهِ سَبِيلًا »</p>
                  <p className="text-amber-700 text-xs italic">« Et c'est un devoir envers Allah pour les gens qui en ont la capacité, d'accomplir le Hadj vers la Maison. » (Sourate Âl-Imran, 3:97)</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "8 Dhul Hijja",   value: "Mina" },
                    { label: "9 Dhul Hijja",   value: "Arafat" },
                    { label: "Nuit",            value: "Muzdalifa" },
                    { label: "10-13 Dhul Hijja", value: "Mina + La Mecque" },
                  ].map((d) => (
                    <div key={d.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                      <p className="text-xs text-gray-400 mb-0.5">{d.label}</p>
                      <p className="font-bold text-gray-900 text-sm">{d.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 5 — Rites Hadj */}
              <section id="rites-hadj" className="scroll-mt-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">5</div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Les rites du Hadj</h2>
                </div>
                <div className="space-y-4">
                  {HAJJ_DAYS.map((day, i) => (
                    <div key={day.day} className={`rounded-xl border overflow-hidden ${
                      i < 4 ? "border-amber-100" : "border-gray-100"
                    }`}>
                      <div className={`px-5 py-3 flex items-center gap-3 ${
                        i < 4 ? "bg-amber-50" : "bg-gray-50"
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${
                          i < 4 ? "bg-amber-600" : "bg-gray-500"
                        }`}>
                          {i + 1}
                        </div>
                        <div>
                          <p className={`text-xs font-bold tracking-wide ${i < 4 ? "text-amber-600" : "text-gray-500"}`}>{day.day}</p>
                          <p className="font-bold text-gray-900 text-sm">{day.title}</p>
                        </div>
                      </div>
                      <div className="px-5 py-4">
                        <p className="text-sm text-gray-600 leading-relaxed">{day.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 6 — Du'as */}
              <section id="duas" className="scroll-mt-28">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-[#0f5132] flex items-center justify-center text-white text-sm font-black flex-shrink-0">6</div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Du&apos;as & Invocations</h2>
                  </div>
                  <p className="text-gray-500 text-sm mb-5 pl-12">
                    Les invocations essentielles du pèlerin, étape par étape — en arabe, phonétique et traduction française.
                  </p>

                  {/* Filtres catégories */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {DUA_CATEGORIES.map((cat) => (
                      <button key={cat} onClick={() => setDuaFilter(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          duaFilter === cat
                            ? "bg-[#0f5132] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-[#0f5132]"
                        }`}>
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Liste des du'as */}
                  <div className="space-y-3">
                    {filteredDuas.map((dua) => (
                      <div key={dua.id}
                        className={`rounded-xl border overflow-hidden transition-all ${
                          dua.highlight ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100"
                        }`}>
                        <button
                          onClick={() => setExpandedDua(expandedDua === dua.id ? null : dua.id)}
                          className="w-full flex items-center justify-between px-5 py-3.5 text-left group"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                              dua.category === "Hadj"         ? "bg-amber-100 text-amber-700" :
                              dua.category === "Oumra & Hadj" ? "bg-emerald-100 text-[#0f5132]" :
                              dua.category === "Médine"       ? "bg-emerald-100 text-emerald-700" :
                              dua.category === "Mosquée"      ? "bg-purple-100 text-purple-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>{dua.category}</span>
                            <span className="text-sm font-semibold text-gray-900 group-hover:text-[#0f5132] transition-colors truncate">
                              {dua.title}
                            </span>
                          </div>
                          <span className={`ml-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                            expandedDua === dua.id ? "bg-[#0f5132] text-white rotate-45" : "bg-gray-100 text-gray-500"
                          }`}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </span>
                        </button>

                        {expandedDua === dua.id && (
                          <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                            {/* Arabe */}
                            <div className="bg-[#062b1a] rounded-xl p-4 text-right">
                              <p className="text-white text-lg leading-loose font-arabic" dir="rtl">
                                {dua.arabic}
                              </p>
                            </div>
                            {/* Phonétique */}
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                              <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Phonétique</p>
                              <p className="text-sm text-amber-900 italic leading-relaxed">{dua.phonetic}</p>
                            </div>
                            {/* Traduction */}
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Traduction</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{dua.french}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 7 — Conclusion */}
              <section id="conclusion" className="scroll-mt-28 bg-[#062b1a] rounded-2xl p-6 md:p-8 text-white">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-black flex-shrink-0">7</div>
                  <h2 className="text-xl md:text-2xl font-bold">Conclusion</h2>
                </div>
                <p className="text-white/80 leading-relaxed mb-4">
                  Ainsi s&apos;achèvent les rites du Hadj. Que Allah accepte le pèlerinage de tous les fidèles et leur accorde Sa miséricorde. Toutes les louanges appartiennent à Allah, Seigneur de l&apos;Univers.
                </p>
                <p className="text-white/80 leading-relaxed mb-6">
                  Une bonne préparation physique, mentale et spirituelle est essentielle. L&apos;équipe Hajj et Oumra ZAM est là pour vous accompagner à chaque étape et vous permettre de vivre ce moment sacré en toute sérénité.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/offres"
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all hover:scale-105">
                    Voir nos offres <ArrowRight size={14} />
                  </Link>
                  <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all">
                    <IconWhatsApp size={16} /> Nous contacter
                  </a>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM CTA ─────────────────────────────── */}
      <section className="bg-white py-14 px-4 border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-label mb-3">PRÊT À PARTIR ?</p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-playfair, serif)" }}>
            Accompagnez-vous d&apos;une agence de confiance
          </h2>
          <p className="text-gray-500 text-sm mb-7">Hajj et Oumra ZAM vous accompagne depuis plus de 25 ans pour votre Hadj et votre Oumra.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/offres" className="btn-primary px-8 py-3">
              Nos offres Hadj & Oumra <ArrowRight size={14} />
            </Link>
            <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 border-2 border-[#0f5132] text-[#0f5132] font-semibold text-sm px-6 py-3 rounded-full hover:bg-emerald-50 transition-all">
              <IconWhatsApp size={16} /> WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
