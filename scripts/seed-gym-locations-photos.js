// Script de seed puntual — NO se importa desde la app ni se ejecuta en el build.
// Carga photo_url (via Pexels) para las 3 sedes de la organizacion "Gym2".
// Mismo criterio que seed-gym-de-prueba.js (productos) y el seed de las 10
// clases: se busca en Pexels, se descarga la imagen y se sube al bucket
// "loyalty-content" en Supabase Storage, después se guarda la URL pública.
//
// Uso (bash):
//   SUPABASE_SERVICE_ROLE_KEY=... PEXELS_API_KEY=... node scripts/seed-gym-locations-photos.js
//
// Uso (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."; $env:PEXELS_API_KEY="..."; node scripts/seed-gym-locations-photos.js
//
// Requiere Node 18+ (usa fetch nativo) y @supabase/supabase-js (ya esta en package.json).

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://inlmzasbkhngqamduugq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
if (!PEXELS_API_KEY) {
  console.error("Falta PEXELS_API_KEY en el entorno.");
  process.exit(1);
}

const ORG_ID = "08ff0a8d-07ee-44c3-afb2-1342226c2ae8"; // Gym2

// Una query distinta por sede para que no se repita el mismo tipo de foto —
// se alterna entre fachada/frente, interior y exterior, como pidió el
// usuario. Las primeras 3 (Centro/Norte/Sur) ya tienen photo_url cargado de
// una corrida anterior; quedan acá solo como referencia de qué tipo de foto
// ya se usó, para que las 5 nuevas no repitan el mismo criterio visual.
const LOCATIONS = [
  // Ya seedeadas (no se vuelven a tocar):
  // Centro    → "gym storefront facade entrance"      (fachada)
  // Norte     → "gym interior training floor weights" (interior)
  // Sur       → "modern gym building exterior"        (exterior)
  { id: "78f8c45c-a846-42fa-a8fc-a010503c2a6c", name: "Gym de Prueba - Sede Caballito", query: "gym entrance signage building" },
  { id: "3314c9dc-d455-4801-aa53-5ff7a47377a5", name: "Gym de Prueba - Sede San Isidro", query: "fitness center glass facade modern" },
  { id: "4130f238-680c-4b30-b160-21e8202993dd", name: "Gym de Prueba - Sede Martínez", query: "gym cardio machines treadmills interior" },
  { id: "a03e5043-9810-47ec-a3fb-0b8b307ece7e", name: "Gym de Prueba - Sede Banfield", query: "crossfit gym warehouse interior" },
  { id: "b0b85f49-09cd-4c35-a6e9-743a1f7b7dfd", name: "Gym de Prueba - Sede Pilar", query: "gym free weights rack interior" },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function searchPexels(query) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );
  if (!res.ok) {
    throw new Error(`Pexels search failed (${res.status}) for query "${query}": ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.photos || data.photos.length === 0) {
    throw new Error(`Pexels no devolvió resultados para "${query}"`);
  }
  return data.photos;
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar la imagen: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  console.log(`Sembrando fotos de sedes para org_id=${ORG_ID} (Gym2)\n`);

  for (const loc of LOCATIONS) {
    try {
      console.log(`\n→ ${loc.name}`);
      console.log(`  Buscando en Pexels: "${loc.query}"...`);
      const photos = await searchPexels(loc.query);
      const photo = photos[0];
      const imageSrc = photo.src.large;

      console.log(`  Descargando imagen (Pexels #${photo.id})...`);
      const imageBuffer = await downloadImage(imageSrc);

      const path = `gym-locations/${ORG_ID}/${loc.id}/${Date.now()}-seed.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("loyalty-content")
        .upload(path, imageBuffer, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("loyalty-content").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("gym_locations")
        .update({ photo_url: publicUrlData.publicUrl })
        .eq("id", loc.id);
      if (updateError) throw updateError;

      console.log(`  ✓ photo_url actualizado: ${publicUrlData.publicUrl}`);
    } catch (err) {
      console.error(`  ✗ Error en "${loc.name}":`, err.message ?? err);
    }
  }

  console.log("\nListo.");
}

main();
