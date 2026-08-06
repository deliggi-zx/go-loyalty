// Filtro básico de contenido para gym_testimonials.
// Objetivo: demo/showroom — bloquear lo obviamente inapropiado con una lista
// simple de palabras prohibidas en español + límite de longitud. No reemplaza
// una moderación real (sin IA, sin servicio externo), pero corre del lado del
// servidor al momento de publicar, como pidió el cliente.

export const TESTIMONIAL_MIN_LENGTH = 3;
export const TESTIMONIAL_MAX_LENGTH = 500;

// Lista básica, en minúsculas y sin acentos (la comparación normaliza el texto).
// Cubre insultos comunes y algunas palabras típicas de spam.
const BANNED_WORDS = [
  "boludo",
  "pelotudo",
  "forro",
  "puto",
  "puta",
  "putos",
  "putas",
  "mierda",
  "carajo",
  "concha",
  "cornudo",
  "imbecil",
  "idiota",
  "estupido",
  "estupida",
  "gil",
  "andate a la mierda",
  "hijo de puta",
  "click aqui",
  "gana dinero",
  "prestamo facil",
  "viagra",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // saca acentos: "estúpido" -> "estupido"
}

export interface TestimonialFilterResult {
  ok: boolean;
  reason?: string;
}

export function moderateTestimonial(rawText: string): TestimonialFilterResult {
  const text = (rawText ?? "").trim();

  if (text.length < TESTIMONIAL_MIN_LENGTH) {
    return { ok: false, reason: "El comentario es demasiado corto." };
  }

  if (text.length > TESTIMONIAL_MAX_LENGTH) {
    return {
      ok: false,
      reason: `El comentario supera el límite de ${TESTIMONIAL_MAX_LENGTH} caracteres.`,
    };
  }

  const normalized = normalize(text);
  const hasBannedWord = BANNED_WORDS.some((word) => normalized.includes(normalize(word)));

  if (hasBannedWord) {
    return {
      ok: false,
      reason: "Tu comentario contiene lenguaje que no podemos publicar. Por favor, reformulalo.",
    };
  }

  return { ok: true };
}
