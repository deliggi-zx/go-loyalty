// Script puntual — NO se importa desde la app. Busca 4 fotos de cancha
// (Pexels), las sube a Storage y crea las filas en gym_courts para Corner.
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://inlmzasbkhngqamduugq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const ORG_ID = "8ec2d9c4-f7cf-45a0-b22f-2ddd7059b941"; // Corner

if (!SUPABASE_SERVICE_ROLE_KEY || !PEXELS_API_KEY) {
  console.error("Faltan SUPABASE_SERVICE_ROLE_KEY / PEXELS_API_KEY.");
  process.exit(1);
}

const COURTS = [
  { name: "Cancha 1", court_type: "f5", query: "indoor soccer five a side court" },
  { name: "Cancha 2", court_type: "f5", query: "synthetic turf soccer field night" },
  { name: "Cancha 3", court_type: "f7", query: "seven a side football pitch" },
  { name: "Cancha 4", court_type: "f11", query: "full size soccer field stadium" },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function searchPexels(query) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );
  if (!res.ok) throw new Error(`Pexels search failed (${res.status}) for "${query}": ${await res.text()}`);
  const data = await res.json();
  if (!data.photos?.length) throw new Error(`Sin resultados para "${query}"`);
  return data.photos[0];
}

async function main() {
  for (const court of COURTS) {
    console.log(`\n→ ${court.name} (${court.court_type})`);
    console.log(`  Buscando "${court.query}"...`);
    const photo = await searchPexels(court.query);
    const res = await fetch(photo.src.large2x);
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `courts/${ORG_ID}/${court.name.toLowerCase().replace(/\s+/g, "-")}.jpg`;

    console.log(`  Subiendo a loyalty-content/${path}...`);
    const { error: uploadError } = await supabase.storage
      .from("loyalty-content")
      .upload(path, buf, { upsert: true, contentType: "image/jpeg" });
    if (uploadError) throw new Error(`Upload falló: ${uploadError.message}`);

    const { data: publicUrlData } = supabase.storage.from("loyalty-content").getPublicUrl(path);

    const { error: insertError } = await supabase.from("gym_courts").insert({
      org_id: ORG_ID,
      name: court.name,
      court_type: court.court_type,
      photo_url: publicUrlData.publicUrl,
    });
    if (insertError) throw new Error(`Insert falló: ${insertError.message}`);

    console.log(`  OK — ${publicUrlData.publicUrl}`);
  }
  console.log("\nListo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
