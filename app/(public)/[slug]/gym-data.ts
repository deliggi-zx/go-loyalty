import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// ── Sedes ─────────────────────────────────────────────────────────────────

export interface GymLocation {
  id: string;
  name: string;
  address: string | null;
  opening_hours: string | null;
  photo_url: string | null;
}

export const getGymLocations = cache(async (orgId: string): Promise<GymLocation[]> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("gym_locations")
    .select("id, name, address, opening_hours, photo_url")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  return data ?? [];
});

// ── Clases + horarios ────────────────────────────────────────────────────

export interface GymScheduleSlot {
  id: string;
  day_of_week: number; // 1=lunes .. 7=domingo
  start_time: string;
  end_time: string;
  instructor_name: string | null;
  location_name: string;
}

export interface GymClassData {
  id: string;
  name: string;
  category: string | null;
  intensity: string | null;
  description: string | null;
  photo_url: string | null;
  schedule: GymScheduleSlot[];
}

export const getGymClasses = cache(async (orgId: string): Promise<GymClassData[]> => {
  const supabase = createClient();
  const [{ data: classes }, { data: schedule }, { data: locations }] = await Promise.all([
    supabase
      .from("gym_classes")
      .select("id, name, category, intensity, description, photo_url")
      .eq("org_id", orgId)
      .order("name", { ascending: true }),
    supabase
      .from("gym_class_schedule")
      .select("id, class_id, location_id, day_of_week, start_time, end_time, instructor_name")
      .eq("org_id", orgId),
    supabase.from("gym_locations").select("id, name").eq("org_id", orgId),
  ]);

  const locationNames = new Map((locations ?? []).map((l) => [l.id, l.name]));

  const scheduleByClass = new Map<string, GymScheduleSlot[]>();
  for (const s of schedule ?? []) {
    const list = scheduleByClass.get(s.class_id) ?? [];
    list.push({
      id: s.id,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      instructor_name: s.instructor_name,
      location_name: locationNames.get(s.location_id) ?? "",
    });
    scheduleByClass.set(s.class_id, list);
  }
  scheduleByClass.forEach((list) => {
    list.sort((a, b) => a.day_of_week - b.day_of_week);
  });

  return (classes ?? []).map((c) => ({
    ...c,
    schedule: scheduleByClass.get(c.id) ?? [],
  }));
});

// ── Testimonios ──────────────────────────────────────────────────────────

export interface GymTestimonial {
  id: string;
  body: string;
  rating: number;
  created_at: string;
  author_name: string;
}

export const getGymTestimonials = cache(async (orgId: string): Promise<GymTestimonial[]> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("gym_testimonials")
    .select("id, body, rating, created_at, profiles(full_name)")
    .eq("org_id", orgId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return (data ?? []).map((t) => {
    const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
    return {
      id: t.id,
      body: t.body,
      rating: t.rating,
      created_at: t.created_at,
      author_name: profile?.full_name || "Socio de la casa",
    };
  });
});
