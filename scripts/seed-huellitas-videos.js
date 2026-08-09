// Script puntual — NO se importa desde la app ni se ejecuta en el build.
// Busca 7 videos de stock en Pexels (uno por día de la semana), los recorta
// y comprime con ffmpeg (H.264, CRF26, ~25s, sin audio — mismo criterio que
// video-source/bike-hero.mp4) y los sube a Supabase Storage
// (loyalty-content/hero-videos/{orgId}/). Imprime al final el array de URLs
// públicas en el orden getDay() (0=domingo .. 6=sábado) para pegar en
// VET_HOME_VIDEOS (app/(public)/[slug]/page.tsx).
//
// Uso (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."; $env:PEXELS_API_KEY="..."; node scripts/seed-huellitas-videos.js
//
// Requiere Node 18+, ffmpeg en PATH, @supabase/supabase-js.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { createClient } = require("@supabase/supabase-js");

const execFileAsync = promisify(execFile);

const SUPABASE_URL = "https://inlmzasbkhngqamduugq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const ORG_ID = "5a1d6e9e-a105-4c15-9fa2-1b05215797a3"; // Huellitas

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
if (!PEXELS_API_KEY) {
  console.error("Falta PEXELS_API_KEY en el entorno.");
  process.exit(1);
}

// Índice = getDay() del cliente (0 domingo .. 6 sábado). Placeholders de
// stock con temas variados, a reemplazar fase a fase por material real.
const DAYS = [
  { index: 0, slug: "domingo-grupo-mascotas", query: "dogs and cats together relaxing" },
  { index: 1, slug: "lunes-perro-corriendo", query: "dog running slow motion" },
  { index: 2, slug: "martes-gato-jugando", query: "cat playing" },
  { index: 3, slug: "miercoles-revision-vet", query: "veterinarian dog checkup" },
  { index: 4, slug: "jueves-bano-peluqueria", query: "dog grooming bath" },
  { index: 5, slug: "viernes-cachorro", query: "puppy playing" },
  { index: 6, slug: "sabado-gato-relax", query: "cat relaxing" },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function searchPexelsVideo(query) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );
  if (!res.ok) {
    throw new Error(`Pexels video search failed (${res.status}) for "${query}": ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.videos || data.videos.length === 0) {
    throw new Error(`Pexels no devolvió videos para "${query}"`);
  }
  return data.videos;
}

function pickBestFile(video) {
  const mp4Files = video.video_files.filter((f) => f.file_type === "video/mp4" && f.width >= f.height);
  if (mp4Files.length === 0) throw new Error(`Sin archivo mp4 landscape para video #${video.id}`);
  // Preferimos algo cerca de 1080p para no bajar calidad al escalar.
  mp4Files.sort((a, b) => Math.abs(a.height - 1080) - Math.abs(b.height - 1080));
  return mp4Files[0];
}

async function downloadToFile(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buf);
}

async function compress(inputPath, outputPath) {
  // Escala/recorta a 1920x1080 cover, máx 25s, sin audio, H.264 CRF26 —
  // mismo criterio que video-source/bike-hero.mp4.
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-t", "25",
    "-vf", "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080",
    "-c:v", "libx264",
    "-crf", "26",
    "-preset", "medium",
    "-pix_fmt", "yuv420p",
    "-an",
    outputPath,
  ]);
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "huellitas-videos-"));
  const results = new Array(7).fill(null);

  for (const day of DAYS) {
    try {
      console.log(`\n[getDay=${day.index}] Buscando en Pexels: "${day.query}"...`);
      const videos = await searchPexelsVideo(day.query);
      const video = videos[0];
      const file = pickBestFile(video);

      const rawPath = path.join(tmpDir, `${day.slug}-raw.mp4`);
      const outPath = path.join(tmpDir, `${day.slug}.mp4`);

      console.log(`  Descargando (Pexels video #${video.id}, ${file.width}x${file.height})...`);
      await downloadToFile(file.link, rawPath);

      console.log("  Comprimiendo con ffmpeg (CRF26, 1920x1080, ≤25s, sin audio)...");
      await compress(rawPath, outPath);

      const fileBuffer = fs.readFileSync(outPath);
      const sizeMb = (fileBuffer.length / 1024 / 1024).toFixed(1);
      const storagePath = `hero-videos/${ORG_ID}/${day.slug}.mp4`;

      console.log(`  Subiendo a loyalty-content/${storagePath} (${sizeMb} MB)...`);
      const { error: uploadError } = await supabase.storage
        .from("loyalty-content")
        .upload(storagePath, fileBuffer, { upsert: true, contentType: "video/mp4" });
      if (uploadError) throw new Error(`Upload falló: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage.from("loyalty-content").getPublicUrl(storagePath);
      results[day.index] = publicUrlData.publicUrl;
      console.log(`  OK — ${publicUrlData.publicUrl}`);
    } catch (err) {
      console.error(`  ERROR en día ${day.index} (${day.slug}): ${err.message}`);
    }
  }

  console.log("\n\n--- Array final (índice = getDay(), pegar en VET_HOME_VIDEOS) ---");
  console.log(JSON.stringify(results, null, 2));

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error("Fallo general del script:", err);
  process.exit(1);
});
