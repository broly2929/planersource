export declare const PRE_CONTROLE: { fichier: string; ids: string[] }[];
export declare function motifPreControle(): string;
export declare function commandesPreControle(
  racine: string,
): { commande: string; args: string[]; cwd: string }[];
