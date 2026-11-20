import type pg from 'pg';

/** Pool ou client de transaction : les fonctions de création n'ouvrent jamais de transaction. */
export type Db = Pick<pg.Pool, 'query'>;

interface ErreurPg {
  code?: string;
  constraint?: string;
}

const pgErr = (err: unknown): ErreurPg => (err ?? {}) as ErreurPg;

export const estDoublon = (err: unknown): boolean => pgErr(err).code === '23505';
export const estReference = (err: unknown): boolean =>
  pgErr(err).code === '23503' || pgErr(err).code === '23001';
export const estContrainte = (err: unknown, nom?: string): boolean =>
  pgErr(err).code === '23514' && (nom === undefined || pgErr(err).constraint === nom);
export const nomContrainte = (err: unknown): string | undefined => pgErr(err).constraint;
