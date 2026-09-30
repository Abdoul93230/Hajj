/**
 * Génère les assets de marque de la PLATEFORME (hajj-e.com) à partir des deux
 * fichiers sources posés dans `public/images/` :
 *
 *   public/images/logo.png   → lockup HORIZONTAL (icône + « Hajj-e ») · fond transparent
 *   public/images/logo1.png  → lockup VERTICAL + baseline (fond crème, presse/présentation)
 *
 * Produits (tous versionnés) :
 *   public/brand/hajj-e-logo.png          lockup horizontal (headers, footer, emails)
 *   public/brand/hajj-e-mark.png          icône seule, carrée (badges, favicon, overlays)
 *   public/brand/hajj-e-logo-stacked.png  lockup vertical + baseline (présentations)
 *   public/brand/placeholders/*.png       visuels neutres des portails sans images
 *   src/app/icon.png + src/app/apple-icon.png   favicon de la plateforme
 *
 * Lancer : npm run brand:assets
 * ⚠️ `sharp` est fourni par Next.js (dépendance transitive) : ne pas l'utiliser
 *    dans le runtime de l'app, uniquement dans ce script de build hors-ligne.
 */
import { createRequire } from "node:module";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = resolve(import.meta.dirname, "..");
const SRC_LOCKUP = resolve(ROOT, "public/images/logo.png");
const SRC_STACKED = resolve(ROOT, "public/images/logo1.png");
const OUT_DIR = resolve(ROOT, "public/brand");
const OUT_PLACEHOLDERS = resolve(OUT_DIR, "placeholders");

/** Vert / or de la marque hajj-e (repris des logos). */
const BRAND = "#0f5132";
const ACCENT = "#b8860b";

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/**
 * Découpe le lockup horizontal : renvoie la largeur du PREMIER groupe (l'icône)
 * en trouvant la première colonne totalement vide après le début du dessin.
 */
async function splitIconFromWordmark(buffer, fallbackWidth) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const inked = new Array(width).fill(false);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] > 12) inked[x] = true;
    }
  }
  const minGap = Math.max(4, Math.round(width * 0.02));
  let run = 0;
  for (let x = 0; x < width; x++) {
    if (!inked[x]) {
      run++;
      continue;
    }
    if (run >= minGap && x < width * 0.6) return x - run; // début du premier « blanc » franc
    run = 0;
  }
  return Math.round(fallbackWidth * 0.34); // repli : icône ≈ 1/3 du lockup
}

/** Feuille SVG d'un visuel neutre (aucun texte : polices non garanties côté sharp). */
function placeholderSvg(width, height, { kind }) {
  const cx = width / 2;
  const cy = kind === "partner" ? height * 0.44 : height * 0.5;
  const scale = Math.min(width / 1600, height / 900);

  const glyph =
    kind === "partner"
      ? `<g transform="translate(${cx} ${cy}) scale(${scale * 1.15})" fill="none" stroke="${ACCENT}" stroke-opacity="0.55" stroke-width="16" stroke-linejoin="round">
           <rect x="-230" y="-110" width="460" height="220" rx="26"/>
           <path d="M-150 -20 h300 M-150 50 h190" stroke-linecap="round"/>
         </g>`
      : `<g transform="translate(${cx} ${cy - 30 * scale}) scale(${scale})" fill="none" stroke="${BRAND}" stroke-opacity="0.42" stroke-width="26" stroke-linejoin="round">
           <rect x="-330" y="-230" width="660" height="460" rx="40"/>
           <circle cx="-140" cy="-110" r="52"/>
           <path d="M-330 130 l180 -180 140 140 110 -110 200 200" stroke-linecap="round"/>
         </g>`;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7f8f6"/>
      <stop offset="1" stop-color="#e6ebe5"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${glyph}
</svg>`);
}

async function main() {
  await mkdir(OUT_PLACEHOLDERS, { recursive: true });
  const report = [];

  // ── 1. Lockup horizontal (transparent) ────────────────────────────────────
  const trimmed = await sharp(SRC_LOCKUP).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
  const lockup = await sharp(trimmed.data)
    .resize({ width: 720, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  await writeFile(resolve(OUT_DIR, "hajj-e-logo.png"), lockup);
  report.push(["public/brand/hajj-e-logo.png", lockup.length]);

  // ── 2. Icône seule, carrée (transparente) ────────────────────────────────
  const splitX = await splitIconFromWordmark(trimmed.data, trimmed.info.width);
  const iconCrop = await sharp(trimmed.data)
    .extract({ left: 0, top: 0, width: splitX, height: trimmed.info.height })
    .trim({ threshold: 10 })
    .toBuffer();
  const mark = await sharp(iconCrop)
    .resize({ width: 512, height: 512, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  await writeFile(resolve(OUT_DIR, "hajj-e-mark.png"), mark);
  report.push(["public/brand/hajj-e-mark.png", mark.length]);

  // ── 3. Lockup vertical + baseline (présentation / presse) ────────────────
  // (fond crème photographique → quantification forte pour rester léger)
  const stacked = await sharp(SRC_STACKED)
    .trim({ threshold: 10 })
    .resize({ width: 560, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, colours: 96 })
    .toBuffer();
  await writeFile(resolve(OUT_DIR, "hajj-e-logo-stacked.png"), stacked);
  report.push(["public/brand/hajj-e-logo-stacked.png", stacked.length]);

  // ── 4. Visuels neutres des portails (placeholders) ───────────────────────
  const placeholders = [
    ["photo-wide.png", 1600, 900, "photo"],
    ["photo-landscape.png", 1200, 900, "photo"],
    ["partner-logo.png", 800, 400, "partner"],
  ];
  for (const [name, width, height, kind] of placeholders) {
    const buf = await sharp(placeholderSvg(width, height, { kind }))
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    await writeFile(resolve(OUT_PLACEHOLDERS, name), buf);
    report.push([`public/brand/placeholders/${name}`, buf.length]);
  }

  // ── 5. Favicon plateforme (remplace le logo ZAM) ─────────────────────────
  const favicon = await sharp(mark)
    .resize({ width: 256, height: 256, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(resolve(ROOT, "src/app/icon.png"), favicon);
  report.push(["src/app/icon.png", favicon.length]);

  const appleIcon = await sharp(mark)
    .resize({ width: 180, height: 180, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(resolve(ROOT, "src/app/apple-icon.png"), appleIcon);
  report.push(["src/app/apple-icon.png", appleIcon.length]);

  for (const [file, size] of report) {
    await stat(resolve(ROOT, file)); // garantit l'écriture sur disque
    console.log(`OK  ${file.padEnd(46)} ${kb(size)}`);
  }
  console.log(`\nIcone detectee a x=${splitX}px (contenu recadre ${trimmed.info.width}x${trimmed.info.height}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
