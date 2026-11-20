import pg from 'pg';

// Les dates restent des chaînes « AAAA-MM-JJ » (jamais d'objet Date : pas de dérive de fuseau),
// les numeric (charges, taux) deviennent des nombres.
pg.types.setTypeParser(pg.types.builtins.DATE, (valeur) => valeur);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (valeur) => Number(valeur));
