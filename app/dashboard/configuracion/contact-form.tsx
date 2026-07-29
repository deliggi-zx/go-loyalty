"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrgContact } from "./actions";

interface ContactOrgData {
  about_text: string | null;
  whatsapp_number: string | null;
  phone_number: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  terms_text: string | null;
}

interface ContactFormProps {
  org: ContactOrgData;
}

export function ContactForm({ org }: ContactFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [aboutText, setAboutText] = useState(org.about_text ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(org.whatsapp_number ?? "");
  const [phoneNumber, setPhoneNumber] = useState(org.phone_number ?? "");
  const [facebookUrl, setFacebookUrl] = useState(org.facebook_url ?? "");
  const [instagramUrl, setInstagramUrl] = useState(org.instagram_url ?? "");
  const [twitterUrl, setTwitterUrl] = useState(org.twitter_url ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(org.youtube_url ?? "");
  const [termsText, setTermsText] = useState(org.terms_text ?? "");

  function handleSave() {
    startTransition(async () => {
      await updateOrgContact({
        about_text: aboutText || null,
        whatsapp_number: whatsappNumber || null,
        phone_number: phoneNumber || null,
        facebook_url: facebookUrl || null,
        instagram_url: instagramUrl || null,
        twitter_url: twitterUrl || null,
        youtube_url: youtubeUrl || null,
        terms_text: termsText || null,
      });
      router.refresh();
    });
  }

  const fieldClass =
    "w-full h-9 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors";

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Contacto y redes
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Se muestran en el menú lateral y el pie de tu página pública. Dejá vacío lo que no uses.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-600">Acerca del negocio</label>
          <textarea
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            rows={3}
            placeholder="Contale a tus clientes de qué se trata tu negocio"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Teléfono</label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+54 11 1234-5678"
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">WhatsApp</label>
            <input
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="5491112345678"
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Facebook</label>
            <input
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/tu-negocio"
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Instagram</label>
            <input
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/tu-negocio"
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Twitter / X</label>
            <input
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              placeholder="https://x.com/tu-negocio"
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">YouTube</label>
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/@tu-negocio"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-600">Términos y condiciones</label>
          <textarea
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
            rows={4}
            placeholder="Términos del programa de fidelización"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
        >
          {isPending ? "Guardando..." : "Guardar contacto"}
        </button>
      </div>
    </section>
  );
}
