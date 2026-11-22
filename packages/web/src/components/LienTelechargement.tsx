import { Download } from 'lucide-react';

/** Lien de téléchargement présenté comme un bouton secondaire (lot 6f, D-160 (5)) ; ne modifie aucun état. */
export function LienTelechargement({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex h-8 items-center justify-center gap-2 rounded-ui border border-gray-300 bg-white px-3 font-semibold text-gray-800 hover:bg-gray-100"
    >
      <Download aria-hidden className="size-4" />
      {children}
    </a>
  );
}
