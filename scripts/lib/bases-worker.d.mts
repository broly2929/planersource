// Signatures de la base par worker de vitest (D-196). Implémentation : bases-worker.mjs.
export const VERSION_MECANISME: string;

export interface Base {
  nom: string;
  url: string;
}

export interface ClientMinimal {
  query: (
    texte: string,
    valeurs?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  end: () => Promise<void>;
}

export interface OptionsBases {
  famille?: string;
  worker?: string;
  connecter?: (url: string) => Promise<ClientMinimal>;
}

export function nomsBases(
  urlMaintenance: string,
  opts?: { famille?: string; worker?: string },
): { modele: Base; worker?: Base };
export function empreinte(dossier: string): string;
export function preparerModele(
  urlMaintenance: string,
  opts: OptionsBases & { empreinte: string; migrer: (urlModele: string) => Promise<void> },
): Promise<'construit' | 'reutilise'>;
export function creerBaseWorker(
  urlMaintenance: string,
  opts: OptionsBases & { worker: string; familleModele?: string; neuve?: boolean },
): Promise<string>;
export function nettoyerBasesWorker(urlMaintenance: string, opts?: OptionsBases): Promise<string[]>;
