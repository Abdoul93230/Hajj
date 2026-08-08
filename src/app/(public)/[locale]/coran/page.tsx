"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Search, BookOpen,
  Play, Pause, SkipBack, SkipForward, Volume2, Eye, EyeOff,
} from "lucide-react";

/* ── 114 sourates ──────────────────────────────────────── */
const SURAHS: { n: number; ar: string; fr: string; ayahs: number; type: "M" | "Me" }[] = [
  { n: 1,   ar: "الفاتحة",      fr: "Al-Fatiha",       ayahs: 7,   type: "M"  },
  { n: 2,   ar: "البقرة",       fr: "Al-Baqara",       ayahs: 286, type: "Me" },
  { n: 3,   ar: "آل عمران",     fr: "Al-Imran",        ayahs: 200, type: "Me" },
  { n: 4,   ar: "النساء",       fr: "An-Nisa",         ayahs: 176, type: "Me" },
  { n: 5,   ar: "المائدة",      fr: "Al-Maida",        ayahs: 120, type: "Me" },
  { n: 6,   ar: "الأنعام",      fr: "Al-An'am",        ayahs: 165, type: "M"  },
  { n: 7,   ar: "الأعراف",      fr: "Al-A'raf",        ayahs: 206, type: "M"  },
  { n: 8,   ar: "الأنفال",      fr: "Al-Anfal",        ayahs: 75,  type: "Me" },
  { n: 9,   ar: "التوبة",       fr: "At-Tawba",        ayahs: 129, type: "Me" },
  { n: 10,  ar: "يونس",         fr: "Yunus",           ayahs: 109, type: "M"  },
  { n: 11,  ar: "هود",          fr: "Hud",             ayahs: 123, type: "M"  },
  { n: 12,  ar: "يوسف",         fr: "Yusuf",           ayahs: 111, type: "M"  },
  { n: 13,  ar: "الرعد",        fr: "Ar-Ra'd",         ayahs: 43,  type: "Me" },
  { n: 14,  ar: "إبراهيم",      fr: "Ibrahim",         ayahs: 52,  type: "M"  },
  { n: 15,  ar: "الحجر",        fr: "Al-Hijr",         ayahs: 99,  type: "M"  },
  { n: 16,  ar: "النحل",        fr: "An-Nahl",         ayahs: 128, type: "M"  },
  { n: 17,  ar: "الإسراء",      fr: "Al-Isra",         ayahs: 111, type: "M"  },
  { n: 18,  ar: "الكهف",        fr: "Al-Kahf",         ayahs: 110, type: "M"  },
  { n: 19,  ar: "مريم",         fr: "Maryam",          ayahs: 98,  type: "M"  },
  { n: 20,  ar: "طه",           fr: "Ta-Ha",           ayahs: 135, type: "M"  },
  { n: 21,  ar: "الأنبياء",     fr: "Al-Anbiya",       ayahs: 112, type: "M"  },
  { n: 22,  ar: "الحج",         fr: "Al-Hajj",         ayahs: 78,  type: "Me" },
  { n: 23,  ar: "المؤمنون",     fr: "Al-Muminun",      ayahs: 118, type: "M"  },
  { n: 24,  ar: "النور",        fr: "An-Nur",          ayahs: 64,  type: "Me" },
  { n: 25,  ar: "الفرقان",      fr: "Al-Furqan",       ayahs: 77,  type: "M"  },
  { n: 26,  ar: "الشعراء",      fr: "Ash-Shu'ara",     ayahs: 227, type: "M"  },
  { n: 27,  ar: "النمل",        fr: "An-Naml",         ayahs: 93,  type: "M"  },
  { n: 28,  ar: "القصص",        fr: "Al-Qasas",        ayahs: 88,  type: "M"  },
  { n: 29,  ar: "العنكبوت",     fr: "Al-Ankabut",      ayahs: 69,  type: "M"  },
  { n: 30,  ar: "الروم",        fr: "Ar-Rum",          ayahs: 60,  type: "M"  },
  { n: 31,  ar: "لقمان",        fr: "Luqman",          ayahs: 34,  type: "M"  },
  { n: 32,  ar: "السجدة",       fr: "As-Sajda",        ayahs: 30,  type: "M"  },
  { n: 33,  ar: "الأحزاب",      fr: "Al-Ahzab",        ayahs: 73,  type: "Me" },
  { n: 34,  ar: "سبأ",          fr: "Saba",            ayahs: 54,  type: "M"  },
  { n: 35,  ar: "فاطر",         fr: "Fatir",           ayahs: 45,  type: "M"  },
  { n: 36,  ar: "يس",           fr: "Ya-Sin",          ayahs: 83,  type: "M"  },
  { n: 37,  ar: "الصافات",      fr: "As-Saffat",       ayahs: 182, type: "M"  },
  { n: 38,  ar: "ص",            fr: "Sad",             ayahs: 88,  type: "M"  },
  { n: 39,  ar: "الزمر",        fr: "Az-Zumar",        ayahs: 75,  type: "M"  },
  { n: 40,  ar: "غافر",         fr: "Ghafir",          ayahs: 85,  type: "M"  },
  { n: 41,  ar: "فصلت",         fr: "Fussilat",        ayahs: 54,  type: "M"  },
  { n: 42,  ar: "الشورى",       fr: "Ash-Shura",       ayahs: 53,  type: "M"  },
  { n: 43,  ar: "الزخرف",       fr: "Az-Zukhruf",      ayahs: 89,  type: "M"  },
  { n: 44,  ar: "الدخان",       fr: "Ad-Dukhan",       ayahs: 59,  type: "M"  },
  { n: 45,  ar: "الجاثية",      fr: "Al-Jathiya",      ayahs: 37,  type: "M"  },
  { n: 46,  ar: "الأحقاف",      fr: "Al-Ahqaf",        ayahs: 35,  type: "M"  },
  { n: 47,  ar: "محمد",         fr: "Muhammad",        ayahs: 38,  type: "Me" },
  { n: 48,  ar: "الفتح",        fr: "Al-Fath",         ayahs: 29,  type: "Me" },
  { n: 49,  ar: "الحجرات",      fr: "Al-Hujurat",      ayahs: 18,  type: "Me" },
  { n: 50,  ar: "ق",            fr: "Qaf",             ayahs: 45,  type: "M"  },
  { n: 51,  ar: "الذاريات",     fr: "Adh-Dhariyat",    ayahs: 60,  type: "M"  },
  { n: 52,  ar: "الطور",        fr: "At-Tur",          ayahs: 49,  type: "M"  },
  { n: 53,  ar: "النجم",        fr: "An-Najm",         ayahs: 62,  type: "M"  },
  { n: 54,  ar: "القمر",        fr: "Al-Qamar",        ayahs: 55,  type: "M"  },
  { n: 55,  ar: "الرحمن",       fr: "Ar-Rahman",       ayahs: 78,  type: "Me" },
  { n: 56,  ar: "الواقعة",      fr: "Al-Waqi'a",       ayahs: 96,  type: "M"  },
  { n: 57,  ar: "الحديد",       fr: "Al-Hadid",        ayahs: 29,  type: "Me" },
  { n: 58,  ar: "المجادلة",     fr: "Al-Mujadila",     ayahs: 22,  type: "Me" },
  { n: 59,  ar: "الحشر",        fr: "Al-Hashr",        ayahs: 24,  type: "Me" },
  { n: 60,  ar: "الممتحنة",     fr: "Al-Mumtahana",    ayahs: 13,  type: "Me" },
  { n: 61,  ar: "الصف",         fr: "As-Saff",         ayahs: 14,  type: "Me" },
  { n: 62,  ar: "الجمعة",       fr: "Al-Jumu'a",       ayahs: 11,  type: "Me" },
  { n: 63,  ar: "المنافقون",    fr: "Al-Munafiqun",    ayahs: 11,  type: "Me" },
  { n: 64,  ar: "التغابن",      fr: "At-Taghabun",     ayahs: 18,  type: "Me" },
  { n: 65,  ar: "الطلاق",       fr: "At-Talaq",        ayahs: 12,  type: "Me" },
  { n: 66,  ar: "التحريم",      fr: "At-Tahrim",       ayahs: 12,  type: "Me" },
  { n: 67,  ar: "الملك",        fr: "Al-Mulk",         ayahs: 30,  type: "M"  },
  { n: 68,  ar: "القلم",        fr: "Al-Qalam",        ayahs: 52,  type: "M"  },
  { n: 69,  ar: "الحاقة",       fr: "Al-Haqqah",       ayahs: 52,  type: "M"  },
  { n: 70,  ar: "المعارج",      fr: "Al-Ma'arij",      ayahs: 44,  type: "M"  },
  { n: 71,  ar: "نوح",          fr: "Nuh",             ayahs: 28,  type: "M"  },
  { n: 72,  ar: "الجن",         fr: "Al-Jinn",         ayahs: 28,  type: "M"  },
  { n: 73,  ar: "المزمل",       fr: "Al-Muzzammil",    ayahs: 20,  type: "M"  },
  { n: 74,  ar: "المدثر",       fr: "Al-Muddaththir",  ayahs: 56,  type: "M"  },
  { n: 75,  ar: "القيامة",      fr: "Al-Qiyama",       ayahs: 40,  type: "M"  },
  { n: 76,  ar: "الإنسان",      fr: "Al-Insan",        ayahs: 31,  type: "Me" },
  { n: 77,  ar: "المرسلات",     fr: "Al-Mursalat",     ayahs: 50,  type: "M"  },
  { n: 78,  ar: "النبأ",        fr: "An-Naba",         ayahs: 40,  type: "M"  },
  { n: 79,  ar: "النازعات",     fr: "An-Nazi'at",      ayahs: 46,  type: "M"  },
  { n: 80,  ar: "عبس",          fr: "'Abasa",          ayahs: 42,  type: "M"  },
  { n: 81,  ar: "التكوير",      fr: "At-Takwir",       ayahs: 29,  type: "M"  },
  { n: 82,  ar: "الانفطار",     fr: "Al-Infitar",      ayahs: 19,  type: "M"  },
  { n: 83,  ar: "المطففين",     fr: "Al-Mutaffifin",   ayahs: 36,  type: "M"  },
  { n: 84,  ar: "الانشقاق",     fr: "Al-Inshiqaq",     ayahs: 25,  type: "M"  },
  { n: 85,  ar: "البروج",       fr: "Al-Buruj",        ayahs: 22,  type: "M"  },
  { n: 86,  ar: "الطارق",       fr: "At-Tariq",        ayahs: 17,  type: "M"  },
  { n: 87,  ar: "الأعلى",       fr: "Al-A'la",         ayahs: 19,  type: "M"  },
  { n: 88,  ar: "الغاشية",      fr: "Al-Ghashiya",     ayahs: 26,  type: "M"  },
  { n: 89,  ar: "الفجر",        fr: "Al-Fajr",         ayahs: 30,  type: "M"  },
  { n: 90,  ar: "البلد",        fr: "Al-Balad",        ayahs: 20,  type: "M"  },
  { n: 91,  ar: "الشمس",        fr: "Ash-Shams",       ayahs: 15,  type: "M"  },
  { n: 92,  ar: "الليل",        fr: "Al-Layl",         ayahs: 21,  type: "M"  },
  { n: 93,  ar: "الضحى",        fr: "Ad-Duha",         ayahs: 11,  type: "M"  },
  { n: 94,  ar: "الشرح",        fr: "Ash-Sharh",       ayahs: 8,   type: "M"  },
  { n: 95,  ar: "التين",        fr: "At-Tin",          ayahs: 8,   type: "M"  },
  { n: 96,  ar: "العلق",        fr: "Al-'Alaq",        ayahs: 19,  type: "M"  },
  { n: 97,  ar: "القدر",        fr: "Al-Qadr",         ayahs: 5,   type: "M"  },
  { n: 98,  ar: "البينة",       fr: "Al-Bayyina",      ayahs: 8,   type: "Me" },
  { n: 99,  ar: "الزلزلة",      fr: "Az-Zalzala",      ayahs: 8,   type: "Me" },
  { n: 100, ar: "العاديات",     fr: "Al-'Adiyat",      ayahs: 11,  type: "M"  },
  { n: 101, ar: "القارعة",      fr: "Al-Qari'a",       ayahs: 11,  type: "M"  },
  { n: 102, ar: "التكاثر",      fr: "At-Takathur",     ayahs: 8,   type: "M"  },
  { n: 103, ar: "العصر",        fr: "Al-'Asr",         ayahs: 3,   type: "M"  },
  { n: 104, ar: "الهمزة",       fr: "Al-Humaza",       ayahs: 9,   type: "M"  },
  { n: 105, ar: "الفيل",        fr: "Al-Fil",          ayahs: 5,   type: "M"  },
  { n: 106, ar: "قريش",         fr: "Quraysh",         ayahs: 4,   type: "M"  },
  { n: 107, ar: "الماعون",      fr: "Al-Ma'un",        ayahs: 7,   type: "M"  },
  { n: 108, ar: "الكوثر",       fr: "Al-Kawthar",      ayahs: 3,   type: "M"  },
  { n: 109, ar: "الكافرون",     fr: "Al-Kafirun",      ayahs: 6,   type: "M"  },
  { n: 110, ar: "النصر",        fr: "An-Nasr",         ayahs: 3,   type: "Me" },
  { n: 111, ar: "المسد",        fr: "Al-Masad",        ayahs: 5,   type: "M"  },
  { n: 112, ar: "الإخلاص",      fr: "Al-Ikhlas",       ayahs: 4,   type: "M"  },
  { n: 113, ar: "الفلق",        fr: "Al-Falaq",        ayahs: 5,   type: "M"  },
  { n: 114, ar: "الناس",        fr: "An-Nas",          ayahs: 6,   type: "M"  },
];

const FEATURED = [1, 2, 18, 36, 55, 67, 97, 112, 114];

/* cdn.islamic.network – Mishary Alafasy 128kbps */
function audioUrl(absoluteN: number) {
  return `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${absoluteN}.mp3`;
}

interface Ayah {
  numberInSurah: number;
  number: number;
  text: string;
  translation?: string;
}

export default function CoranPage() {
  const [view, setView]             = useState<"home" | "reader">("home");
  const [selected, setSelected]     = useState(1);
  const [ayahs, setAyahs]           = useState<Ayah[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [showTranslation, setShowTranslation] = useState(true);
  const [fontSize, setFontSize]     = useState<"sm" | "md" | "lg">("md");
  const [filterType, setFilterType] = useState<"all" | "M" | "Me">("all");

  /* ── Audio ── */
  const audioRef                    = useRef<HTMLAudioElement>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const ayahRefs                    = useRef<(HTMLDivElement | null)[]>([]);

  const currentSurah = SURAHS.find(s => s.n === selected)!;

  /* ── Load surah ── */
  async function loadSurah(n: number) {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setIsPlaying(false); setPlayingIdx(null);
    setLoading(true); setView("reader"); setSelected(n);
    window.scrollTo({ top: 0 });
    try {
      const [arRes, frRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${n}`),
        fetch(`https://api.alquran.cloud/v1/surah/${n}/fr.hamidullah`),
      ]);
      const [ar, fr] = await Promise.all([arRes.json(), frRes.json()]);
      setAyahs(ar.data.ayahs.map((a: Ayah, i: number) => ({
        ...a, translation: fr.data.ayahs[i]?.text,
      })));
    } catch { setAyahs([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadSurah(1); }, []);

  /* ── Play a specific ayah by index ── */
  const playAyah = useCallback((idx: number) => {
    const ayah = ayahs[idx];
    if (!ayah || !audioRef.current) return;
    setPlayingIdx(idx);
    setAudioLoading(true);
    setIsPlaying(true);
    audioRef.current.src = audioUrl(ayah.number);
    audioRef.current.play().catch(() => { setIsPlaying(false); setAudioLoading(false); });
    ayahRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [ayahs]);

  const playNext = useCallback(() => {
    if (playingIdx !== null && playingIdx < ayahs.length - 1) {
      playAyah(playingIdx + 1);
    } else {
      setIsPlaying(false); setPlayingIdx(null);
    }
  }, [playingIdx, ayahs, playAyah]);

  const playPrev = useCallback(() => {
    if (playingIdx !== null && playingIdx > 0) playAyah(playingIdx - 1);
  }, [playingIdx, playAyah]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause(); setIsPlaying(false);
    } else {
      if (playingIdx === null && ayahs.length > 0) { playAyah(0); }
      else { audioRef.current.play(); setIsPlaying(true); }
    }
  }, [isPlaying, playingIdx, ayahs, playAyah]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded   = () => playNext();
    const onCanPlay = () => setAudioLoading(false);
    el.addEventListener("ended", onEnded);
    el.addEventListener("canplay", onCanPlay);
    return () => { el.removeEventListener("ended", onEnded); el.removeEventListener("canplay", onCanPlay); };
  }, [playNext]);

  const filtered = SURAHS.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.fr.toLowerCase().includes(q) || s.ar.includes(q) || String(s.n).includes(q);
    const matchType   = filterType === "all" || s.type === filterType;
    return matchSearch && matchType;
  });

  const arabicFontSize = fontSize === "sm" ? "text-xl" : fontSize === "lg" ? "text-3xl" : "text-2xl";
  const transFontSize  = fontSize === "sm" ? "text-xs"  : fontSize === "lg" ? "text-base" : "text-sm";
  const playingAyah    = playingIdx !== null ? ayahs[playingIdx] : null;

  /* ════════════════════════════════════════════════════
     HOME
  ════════════════════════════════════════════════════ */
  if (view === "home") return (
    <>
      {/* Hero */}
      <section className="relative bg-[#06251a] py-20 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: "url('/images/quran.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06251a]/70 to-[#06251a]" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">OUTILS DU PÈLERIN</p>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-3"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>القرآن الكريم</h1>
          <h2 className="text-2xl font-bold text-white/80 mb-4">Le Saint Coran</h2>
          <p className="text-white/50 text-base mb-8 max-w-lg mx-auto">
            Lecture bilingue et récitation audio sourate par sourate — récitateur Mishary Alafasy.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => loadSurah(1)}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 py-3.5 rounded-full transition-all hover:scale-105">
              <BookOpen size={18} /> Parcourir les sourates
            </button>
            <button
              onClick={() => {
                loadSurah(1);
                setTimeout(() => playAyah(0), 2200);
              }}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-3.5 rounded-full border border-white/20 transition-all hover:scale-105">
              <Play size={18} fill="white" /> Écouter Al-Fatiha
            </button>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="bg-white py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest text-amber-600 uppercase mb-2">SOURATES POPULAIRES</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Souvent récitées</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {SURAHS.filter(s => FEATURED.includes(s.n)).map(s => (
              <button key={s.n} onClick={() => loadSurah(s.n)}
                className="card-lift bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center hover:bg-[#0f5132] group transition-all">
                <p className="text-2xl font-black text-[#0f5132] group-hover:text-white mb-1">{s.n}</p>
                <p className="text-sm font-bold text-gray-900 group-hover:text-white">{s.fr}</p>
                <p className="text-xs text-gray-400 group-hover:text-white/70 mt-0.5" dir="rtl">{s.ar}</p>
                <p className="text-xs text-gray-400 group-hover:text-emerald-200 mt-1">{s.ayahs} v.</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Full list */}
      <section className="bg-gray-50 py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Rechercher une sourate…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
            </div>
            <div className="flex gap-2">
              {(["all", "M", "Me"] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === t ? "bg-[#0f5132] text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-300"}`}>
                  {t === "all" ? "Toutes" : t === "M" ? "Mecquoises" : "Médinoises"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filtered.map(s => (
              <button key={s.n} onClick={() => loadSurah(s.n)}
                className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left group">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#0f5132] font-black text-sm flex-shrink-0 group-hover:bg-[#0f5132] group-hover:text-white transition-all">
                  {s.n}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{s.fr}</p>
                  <p className="text-xs text-gray-400">{s.ayahs} v. · {s.type === "M" ? "Mecquoise" : "Médinoise"}</p>
                </div>
                <p className="text-base text-[#0a3d26] flex-shrink-0" dir="rtl">{s.ar}</p>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-12">Aucune sourate pour &laquo;{search}&raquo;</p>
          )}
        </div>
      </section>
    </>
  );

  /* ════════════════════════════════════════════════════
     READER
  ════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />

      {/* ── Reader header ── */}
      <div className="sticky top-[72px] z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setView("home")}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#0f5132] transition-colors flex-shrink-0">
            <ChevronLeft size={16} /> Sourates
          </button>
          <div className="flex-1 text-center">
            <p className="font-bold text-gray-900 text-sm">{currentSurah.fr}</p>
            <p className="text-xs text-gray-400">{currentSurah.ayahs} v. · {currentSurah.type === "M" ? "Mecquoise" : "Médinoise"}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(["sm","md","lg"] as const).map(s => (
                <button key={s} onClick={() => setFontSize(s)}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${fontSize === s ? "bg-white shadow text-[#0f5132]" : "text-gray-500"}`}>
                  {s === "sm" ? "A" : s === "md" ? "A+" : "A++"}
                </button>
              ))}
            </div>
            <button onClick={() => setShowTranslation(v => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#0f5132] bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
              {showTranslation ? <Eye size={13} /> : <EyeOff size={13} />}
              <span className="hidden sm:inline">Trad.</span>
            </button>
            <button onClick={() => selected > 1 && loadSurah(selected - 1)} disabled={selected <= 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#0f5132] disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => selected < 114 && loadSurah(selected + 1)} disabled={selected >= 114}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#0f5132] disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-2 border-[#0f5132] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Chargement…</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Surah header */}
            <div className="bg-gradient-to-br from-[#062b1a] to-[#0a3d26] px-8 py-8 text-center">
              <p className="text-white/60 text-xs tracking-widest uppercase mb-2">Sourate {selected}</p>
              <p className="text-white text-4xl mb-2" dir="rtl">{currentSurah.ar}</p>
              <p className="text-emerald-200 font-bold text-lg">{currentSurah.fr}</p>
              <p className="text-white/50 text-xs mt-1">
                {currentSurah.ayahs} versets · {currentSurah.type === "M" ? "Mecquoise" : "Médinoise"}
              </p>
              <button onClick={() => ayahs.length > 0 && playAyah(0)}
                className="mt-5 inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-6 py-2.5 rounded-full border border-white/20 transition-all">
                <Play size={14} fill="white" /> Écouter la sourate
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-5">
              {/* Bismillah */}
              {selected !== 1 && selected !== 9 && (
                <div className="text-center text-2xl text-[#0a3d26] py-4 border-b border-gray-100" dir="rtl">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </div>
              )}

              {ayahs.map((ayah, idx) => {
                const isActive = playingIdx === idx;
                return (
                  <div
                    key={ayah.numberInSurah}
                    ref={el => { ayahRefs.current[idx] = el; }}
                    className={`group rounded-xl transition-colors ${isActive ? "bg-emerald-50 -mx-3 px-3 py-3" : "border-b border-gray-50 last:border-0 pb-5 last:pb-0"}`}
                  >
                    {/* Controls row */}
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() =>
                          isActive && isPlaying
                            ? (audioRef.current?.pause(), setIsPlaying(false))
                            : playAyah(idx)
                        }
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isActive
                            ? "bg-[#0f5132] text-white"
                            : "bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-emerald-100 hover:text-[#0f5132]"
                        }`}
                        title="Écouter ce verset"
                      >
                        {isActive && audioLoading
                          ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : isActive && isPlaying
                          ? <Pause size={12} fill="currentColor" />
                          : <Play  size={12} fill="currentColor" />
                        }
                      </button>
                      <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${isActive ? "border-emerald-500 bg-[#0f5132] text-white" : "border-emerald-200 bg-emerald-50 text-[#0f5132]"}`}>
                        {ayah.numberInSurah}
                      </span>
                    </div>

                    {/* Arabic */}
                    <p className={`text-right leading-loose mb-3 ${arabicFontSize} ${isActive ? "text-[#062b1a]" : "text-gray-900"}`} dir="rtl">
                      {ayah.text}
                    </p>

                    {/* Translation */}
                    {showTranslation && ayah.translation && (
                      <p className={`leading-relaxed border-l-2 border-emerald-200 pl-3 ${transFontSize} ${isActive ? "text-[#0a3d26]" : "text-gray-500"}`}>
                        {ayah.translation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation bottom */}
            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50">
              <button onClick={() => selected > 1 && loadSurah(selected - 1)} disabled={selected <= 1}
                className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#0f5132] disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
                {selected > 1 ? SURAHS[selected - 2].fr : ""}
              </button>
              <p className="text-xs text-gray-400">{selected} / 114</p>
              <button onClick={() => selected < 114 && loadSurah(selected + 1)} disabled={selected >= 114}
                className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#0f5132] disabled:opacity-30 transition-colors">
                {selected < 114 ? SURAHS[selected].fr : ""}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <button onClick={() => setView("home")} className="text-sm text-[#0f5132] hover:underline flex items-center gap-1 mx-auto">
            <ChevronLeft size={14} /> Retour à la liste
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MINI-PLAYER (persistent bottom bar)
      ══════════════════════════════════════════════ */}
      {(isPlaying || playingIdx !== null) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#06251a]/97 backdrop-blur-md border-t border-[#0a3d26]/40 shadow-2xl">
          {/* Progress bar */}
          {playingIdx !== null && ayahs.length > 0 && (
            <div className="h-0.5 bg-[#062b1a]/60">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-all duration-500"
                style={{ width: `${((playingIdx + 1) / ayahs.length) * 100}%` }}
              />
            </div>
          )}

          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
            {/* Icon */}
            <div className="w-11 h-11 rounded-xl bg-[#0f5132]/60 border border-[#0f5132]/40 flex items-center justify-center flex-shrink-0">
              <Volume2 size={18} className="text-emerald-300" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{currentSurah.fr}</p>
              <p className="text-emerald-400 text-xs">
                {playingAyah
                  ? `Verset ${playingAyah.numberInSurah} / ${currentSurah.ayahs}`
                  : "Récitation"}
                &nbsp;·&nbsp;Mishary Alafasy
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={playPrev} disabled={playingIdx === 0 || playingIdx === null}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-all">
                <SkipBack size={16} />
              </button>

              <button onClick={togglePlayPause}
                className="w-12 h-12 rounded-full bg-[#0f5132] hover:bg-emerald-500 flex items-center justify-center text-white transition-all hover:scale-105 shadow-lg shadow-[#062b1a]/50">
                {audioLoading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : isPlaying
                  ? <Pause size={18} fill="white" />
                  : <Play  size={18} fill="white" />
                }
              </button>

              <button onClick={playNext}
                disabled={playingIdx === ayahs.length - 1 || playingIdx === null}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-all">
                <SkipForward size={16} />
              </button>

              <button
                onClick={() => { audioRef.current?.pause(); setIsPlaying(false); setPlayingIdx(null); }}
                className="w-8 h-8 ml-1 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all text-lg leading-none">
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
