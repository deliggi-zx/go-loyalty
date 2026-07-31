// Script de seed puntual — NO se importa desde la app ni se ejecuta en el build.
// Carga productos + imagenes (via Pexels) para la organizacion "Gym de Prueba".
//
// Uso (bash):
//   SUPABASE_SERVICE_ROLE_KEY=... PEXELS_API_KEY=... node scripts/seed-gym-de-prueba.js
//
// Uso (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."; $env:PEXELS_API_KEY="..."; node scripts/seed-gym-de-prueba.js
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

const ORG_ID = "08ff0a8d-07ee-44c3-afb2-1342226c2ae8"; // Gym de Prueba

const CATEGORY_IDS = {
  Suplementos: "96206bb2-8014-4011-aa96-6c750d9cb798",
  "Indumentaria Deportiva": "32d11bb6-68ee-4952-8aa9-efa003d824fe",
  Accesorios: "b9f2ea8c-78c9-40a1-b077-663a6df8e99e",
  Equipamiento: "122be656-aea4-4c11-8e12-41c5654e8908",
  "Bebidas y Snacks": "680b6285-a051-47d9-be62-4eb17c4cd454",
};

const CATEGORY_QUERIES = {
  Suplementos: "protein supplements bottle",
  "Indumentaria Deportiva": "gym clothing activewear",
  Accesorios: "gym accessories gloves",
  Equipamiento: "gym equipment dumbbells",
  "Bebidas y Snacks": "protein bar snack",
};

const PRODUCTS = [
  { category: "Suplementos", name: "Proteína Whey 1kg", price: 45000, description: "Proteína de suero de alta pureza para maximizar la recuperación muscular post-entrenamiento." },
  { category: "Suplementos", name: "Proteína Whey 2kg", price: 82000, description: "El doble de rendimiento: proteína whey premium para quienes entrenan fuerte y seguido." },
  { category: "Suplementos", name: "Creatina Monohidratada 300g", price: 22000, description: "Creatina pura micronizada para ganar fuerza y potencia en cada sesión." },
  { category: "Suplementos", name: "Pre-entreno 300g", price: 28000, description: "Fórmula energizante para entrenar con más foco, resistencia e intensidad." },
  { category: "Suplementos", name: "BCAA 200g", price: 19000, description: "Aminoácidos esenciales para reducir la fatiga muscular y acelerar la recuperación." },
  { category: "Suplementos", name: "Multivitamínico x60", price: 14000, description: "Complejo vitamínico diario para sostener tu energía y rendimiento deportivo." },
  { category: "Indumentaria Deportiva", name: "Remera Dry-Fit", price: 15000, description: "Remera técnica transpirable que mantiene el cuerpo seco durante el entrenamiento." },
  { category: "Indumentaria Deportiva", name: "Calza Deportiva Mujer", price: 24000, description: "Calza de compresión flexible, ideal para entrenamiento funcional y running." },
  { category: "Indumentaria Deportiva", name: "Short de Entrenamiento", price: 18000, description: "Short liviano y cómodo, pensado para máxima libertad de movimiento." },
  { category: "Indumentaria Deportiva", name: "Buzo Canguro Training", price: 32000, description: "Buzo con capucha en algodón premium, perfecto para el pre y post entreno." },
  { category: "Indumentaria Deportiva", name: "Top Deportivo Mujer", price: 16000, description: "Top deportivo con sujeción media, cómodo para cualquier tipo de actividad." },
  { category: "Accesorios", name: "Guantes de Entrenamiento", price: 9000, description: "Guantes acolchados que protegen tus manos durante el levantamiento de pesas." },
  { category: "Accesorios", name: "Cinturón de Levantamiento", price: 32000, description: "Cinturón de cuero resistente para dar estabilidad lumbar en cargas pesadas." },
  { category: "Accesorios", name: "Shaker 700ml", price: 6500, description: "Vaso mezclador con mallado antigrumos, ideal para tus batidos post-entreno." },
  { category: "Accesorios", name: "Muñequeras (par)", price: 5000, description: "Muñequeras de compresión que brindan soporte extra en ejercicios de empuje." },
  { category: "Accesorios", name: "Straps de Agarre", price: 7500, description: "Straps de agarre para asegurar la barra en levantamientos de alta exigencia." },
  { category: "Equipamiento", name: "Mancuernas Ajustables (par)", price: 145000, description: "Set de mancuernas ajustables para entrenar distintos grupos musculares en casa." },
  { category: "Equipamiento", name: "Banda Elástica Resistencia", price: 8000, description: "Banda de resistencia versátil para trabajar fuerza y movilidad." },
  { category: "Equipamiento", name: "Colchoneta de Yoga", price: 17000, description: "Colchoneta antideslizante ideal para yoga, pilates y estiramientos." },
  { category: "Equipamiento", name: "Soga para Saltar", price: 6000, description: "Soga de salto ajustable, perfecta para cardio de alta intensidad." },
  { category: "Bebidas y Snacks", name: "Barra de Proteína", price: 3500, description: "Barra proteica sabor chocolate, ideal como snack pre o post entrenamiento." },
  { category: "Bebidas y Snacks", name: "Agua Saborizada 500ml", price: 2500, description: "Agua saborizada baja en calorías para hidratarte durante el entreno." },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function searchPexels(query) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15`,
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
  console.log(`Sembrando productos para org_id=${ORG_ID} (Gym de Prueba)\n`);

  // Una búsqueda en Pexels por categoría; se rotan los resultados entre los
  // productos de esa categoría para no repetir la misma foto en todos.
  const photosByCategory = {};
  for (const [category, query] of Object.entries(CATEGORY_QUERIES)) {
    console.log(`Buscando en Pexels: "${query}" (${category})...`);
    photosByCategory[category] = await searchPexels(query);
  }

  const usedIndexByCategory = {};

  for (const product of PRODUCTS) {
    try {
      const categoryId = CATEGORY_IDS[product.category];
      if (!categoryId) throw new Error(`Categoría desconocida: ${product.category}`);

      const photos = photosByCategory[product.category];
      const idx = (usedIndexByCategory[product.category] ?? 0) % photos.length;
      usedIndexByCategory[product.category] = idx + 1;
      const photo = photos[idx];
      const imageSrc = photo.src.large;

      console.log(`\n→ ${product.name}`);
      console.log(`  Descargando imagen (Pexels #${photo.id})...`);
      const imageBuffer = await downloadImage(imageSrc);

      const { data: insertedProduct, error: productError } = await supabase
        .from("products")
        .insert({
          org_id: ORG_ID,
          category_id: categoryId,
          name: product.name,
          description: product.description,
          price: product.price,
          active: true,
        })
        .select("id")
        .single();
      if (productError) throw new Error(`Insert producto falló: ${productError.message}`);

      const productId = insertedProduct.id;
      const filePath = `products/${ORG_ID}/${productId}/${Date.now()}-seed.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, imageBuffer, { contentType: "image/jpeg" });
      if (uploadError) throw new Error(`Upload de imagen falló: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      const { error: imageError } = await supabase.from("product_images").insert({
        product_id: productId,
        image_url: publicUrlData.publicUrl,
        display_order: 0,
      });
      if (imageError) throw new Error(`Insert product_images falló: ${imageError.message}`);

      console.log(`  OK — producto ${productId}, imagen subida a ${filePath}`);
    } catch (err) {
      console.error(`  ERROR en "${product.name}": ${err.message}`);
    }
  }

  console.log("\nListo.");
}

main().catch((err) => {
  console.error("Fallo general del script:", err);
  process.exit(1);
});
