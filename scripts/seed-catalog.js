// Script de seed genérico multi-rubro — NO se importa desde la app ni se
// ejecuta en el build. Carga categorías + productos + imágenes (vía Pexels)
// para una organización, sin asumir ningún rubro particular: todo lo
// específico (org, categorías, queries de Pexels, lista de productos) vive
// en el bloque CONFIG de abajo. Para sembrar otra org, se edita CONFIG (o se
// copia el archivo) — nada del resto del script cambia.
//
// Basado en el mismo patrón que scripts/seed-gym-de-prueba.js (Pexels +
// Supabase Storage), generalizado para no atarlo a un rubro fijo.
//
// Uso (bash):
//   SUPABASE_SERVICE_ROLE_KEY=... PEXELS_API_KEY=... node scripts/seed-catalog.js
//
// Uso (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."; $env:PEXELS_API_KEY="..."; node scripts/seed-catalog.js
//
// Requiere Node 18+ (usa fetch nativo) y @supabase/supabase-js (ya está en package.json).

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

// ---------------------------------------------------------------------------
// CONFIG — lo único que cambia entre orgs/rubros.
// ---------------------------------------------------------------------------
const CONFIG = {
  orgId: "5a1d6e9e-a105-4c15-9fa2-1b05215797a3", // Huellitas (Veterinaria)
  orgLabel: "Huellitas",

  // category -> { id, query de Pexels }
  categories: {
    "Alimento balanceado": { id: "8158c531-912e-400e-9736-653701cbb528", query: "dog food bowl kibble" },
    "Antiparasitarios": { id: "6d2a38af-2454-4547-9f34-1ee73d389187", query: "veterinarian dog checkup" },
    "Accesorios": { id: "ce0641c2-6b95-402c-8cc6-c6804b9413e8", query: "dog leash collar accessories" },
    "Juguetes": { id: "0a761b9a-aeda-4187-b1cd-490ff2bee5f7", query: "dog toy ball" },
    "Higiene": { id: "8c78fdf7-d684-452b-8a93-c0974db6a6e2", query: "pet grooming brush shampoo" },
  },

  products: [
    { category: "Alimento balanceado", name: "Alimento Balanceado Perro Adulto 15kg", price: 62000, description: "Nutrición completa y balanceada para perros adultos de todas las razas." },
    { category: "Alimento balanceado", name: "Alimento Balanceado Perro Cachorro 15kg", price: 65000, description: "Fórmula especial para cachorros, con más proteína para su etapa de crecimiento." },
    { category: "Alimento balanceado", name: "Alimento Balanceado Gato Adulto 7.5kg", price: 48000, description: "Alimento premium para gatos adultos, con taurina y omega 3 y 6." },
    { category: "Alimento balanceado", name: "Alimento Balanceado Gato Esterilizado 7.5kg", price: 49500, description: "Fórmula baja en grasas pensada para gatos esterilizados, cuida el peso ideal." },
    { category: "Alimento balanceado", name: "Alimento Húmedo Perro Lata 400g", price: 4200, description: "Lata de alimento húmedo, sabor irresistible como complemento de la dieta diaria." },
    { category: "Alimento balanceado", name: "Alimento Húmedo Gato Sobre 85g", price: 1800, description: "Sobre individual de alimento húmedo para gatos, textura en salsa." },
    { category: "Antiparasitarios", name: "Pipeta Antipulgas y Garrapatas Perro", price: 8500, description: "Protección mensual contra pulgas y garrapatas, aplicación tópica." },
    { category: "Antiparasitarios", name: "Pipeta Antipulgas y Garrapatas Gato", price: 7900, description: "Fórmula suave para gatos, elimina y previene pulgas y garrapatas." },
    { category: "Antiparasitarios", name: "Comprimido Antiparasitario Interno", price: 6500, description: "Desparasitario oral de amplio espectro para perros y gatos." },
    { category: "Antiparasitarios", name: "Collar Antipulgas", price: 9800, description: "Collar de liberación gradual, hasta 8 meses de protección continua." },
    { category: "Accesorios", name: "Correa de Paseo Reforzada", price: 11000, description: "Correa resistente de 1.5m, ideal para paseos diarios seguros." },
    { category: "Accesorios", name: "Arnés Ajustable", price: 13500, description: "Arnés acolchado con ajuste en tres puntos, distribuye mejor la fuerza que el collar." },
    { category: "Accesorios", name: "Cucha Acolchada Mediana", price: 27000, description: "Cucha suave y lavable, tamaño mediano, para un descanso cómodo." },
    { category: "Accesorios", name: "Transportadora Plástica", price: 34000, description: "Transportadora ventilada, segura para viajes cortos y visitas al veterinario." },
    { category: "Juguetes", name: "Pelota de Goma Resistente", price: 4500, description: "Pelota de goma natural, resistente a mordidas fuertes." },
    { category: "Juguetes", name: "Mordillo de Cuerda", price: 3800, description: "Cuerda trenzada ideal para el juego y la limpieza dental." },
    { category: "Juguetes", name: "Ratón de Juguete con Catnip", price: 2200, description: "Juguete relleno de catnip, estimula el instinto de caza de los gatos." },
    { category: "Higiene", name: "Shampoo Antipulgas", price: 7200, description: "Shampoo suave con acción antipulgas, no irrita la piel." },
    { category: "Higiene", name: "Cepillo Deslanador", price: 6800, description: "Cepillo especial para remover pelo suelto y reducir la caída de pelo en casa." },
    { category: "Higiene", name: "Cortaúñas para Mascotas", price: 5200, description: "Cortaúñas ergonómico con tope de seguridad, para perros y gatos." },
  ],
};
// ---------------------------------------------------------------------------

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
  console.log(`Sembrando catálogo para org_id=${CONFIG.orgId} (${CONFIG.orgLabel})\n`);

  // Una búsqueda en Pexels por categoría; se rotan los resultados entre los
  // productos de esa categoría para no repetir la misma foto en todos.
  const photosByCategory = {};
  for (const [category, { query }] of Object.entries(CONFIG.categories)) {
    console.log(`Buscando en Pexels: "${query}" (${category})...`);
    photosByCategory[category] = await searchPexels(query);
  }

  const usedIndexByCategory = {};

  for (const product of CONFIG.products) {
    try {
      const categoryConfig = CONFIG.categories[product.category];
      if (!categoryConfig) throw new Error(`Categoría desconocida: ${product.category}`);

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
          org_id: CONFIG.orgId,
          category_id: categoryConfig.id,
          name: product.name,
          description: product.description,
          price: product.price,
          active: true,
        })
        .select("id")
        .single();
      if (productError) throw new Error(`Insert producto falló: ${productError.message}`);

      const productId = insertedProduct.id;
      const filePath = `products/${CONFIG.orgId}/${productId}/${Date.now()}-seed.jpg`;

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
