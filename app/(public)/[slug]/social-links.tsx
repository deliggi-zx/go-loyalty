import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

interface SocialLinksProps {
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  className?: string;
  iconClassName?: string;
}

export function SocialLinks({
  facebookUrl,
  instagramUrl,
  twitterUrl,
  youtubeUrl,
  className,
  iconClassName,
}: SocialLinksProps) {
  const links = [
    { url: facebookUrl, icon: Facebook, label: "Facebook" },
    { url: instagramUrl, icon: Instagram, label: "Instagram" },
    { url: twitterUrl, icon: Twitter, label: "Twitter" },
    { url: youtubeUrl, icon: Youtube, label: "YouTube" },
  ].filter((l) => l.url);

  if (links.length === 0) return null;

  return (
    <div className={className ?? "flex items-center gap-3"}>
      {links.map(({ url, icon: Icon, label }) => (
        <a
          key={label}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={iconClassName ?? "text-stone-400 hover:text-stone-700 transition-colors"}
        >
          <Icon className="w-5 h-5" />
        </a>
      ))}
    </div>
  );
}
