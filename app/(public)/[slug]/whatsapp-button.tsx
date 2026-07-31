import { MessageCircle } from "lucide-react";

interface WhatsAppButtonProps {
  whatsappNumber: string | null;
}

export function WhatsAppButton({ whatsappNumber }: WhatsAppButtonProps) {
  if (!whatsappNumber) return null;

  return (
    <a
      href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      style={{ backgroundColor: "#25D366" }}
    >
      <MessageCircle className="w-7 h-7 text-white" />
    </a>
  );
}
