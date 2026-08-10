// Script puntual — NO se importa desde la app. Descarga 3 fotos de stock
// (Pexels) para Corner (hero cancha nocturna + 2 promo) y las sube a
// Supabase Storage, mismo bucket/patrón que el resto (loyalty-content).
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://inlmzasbkhngqamduugq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const ORG_ID = "8ec2d9c4-f7cf-45a0-b22f-2ddd7059b941"; // Corner

if (!SUPABASE_SERVICE_ROLE_KEY || !PEXELS_API_KEY) {
  console.error("Faltan SUPABASE_SERVICE_ROLE_KEY / PEXELS_API_KEY.");
  process.exit(1);
}

const IMAGES = [
  { slug: "hero-cancha-nocturna", query: "soccer field night lights" },
  { slug: "promo-1", query: "football turf ball night" },
  { slug: "promo-2", query: "five a side soccer match night" },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function searchPexels(query) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );
  if (!res.ok) throw new Error(`Pexels search failed (${res.status}) for "${query}": ${await res.text()}`);
  const data = await res.json();
  if (!data.photos?.length) throw new Error(`Sin resultados para "${query}"`);
  return data.photos[0];
}

async function main() {
  const results = {};
  for (const { slug, query } of IMAGES) {
    console.log(`Buscando "${query}"...`);
    const photo = await searchPexels(query);
    const res = await fetch(photo.src.large2x);
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `branding/corner/${slug}.jpg`;
    console.log(`  Subiendo a loyalty-content/${path}...`);
    const { error } = await supabase.storage
      .from("loyalty-content")
      .upload(path, buf, { upsert: true, contentType: "image/jpeg" });
    if (error) throw new Error(`Upload falló: ${error.message}`);
    const { data } = supabase.storage.from("loyalty-content").getPublicUrl(path);
    results[slug] = data.publicUrl;
    console.log(`  OK — ${data.publicUrl}`);
  }
  console.log("\n" + JSON.stringify(results, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
