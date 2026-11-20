import { describe, expect, it } from 'vitest';
import {
  caseSuivante,
  toucheGrille,
  type CaseGrille,
} from '../src/screens/planning-manuel-clavier.js';

/*
 * Lot 3g (D-114 (6)) : clavier de la grille du Planning manuel. Signatures :
 *   CaseGrille = { ligne: number (0 = première ressource), jour: number (1 à nbJours),
 *                  demi: 'matin' | 'apres_midi' }
 *   caseSuivante(courante, touche, nbLignes, nbJours) → nouvelle case courante, sans bouclage
 *     (aux bornes la case ne change pas) ; touche : 'droite' | 'gauche' | 'haut' | 'bas' | 'debut' | 'fin'
 *   toucheGrille(key d'un KeyboardEvent) → touche ou null (touche sans effet sur la grille)
 */
const c = (ligne: number, jour: number, demi: CaseGrille['demi']): CaseGrille => ({
  ligne,
  jour,
  demi,
});

describe('Clavier du Planning manuel (lot 3g)', () => {
  it('PMC-1 : → matin, après-midi, matin du jour suivant ; ← l’inverse', () => {
    expect(caseSuivante(c(1, 10, 'matin'), 'droite', 3, 31)).toEqual(c(1, 10, 'apres_midi'));
    expect(caseSuivante(c(1, 10, 'apres_midi'), 'droite', 3, 31)).toEqual(c(1, 11, 'matin'));
    expect(caseSuivante(c(1, 10, 'apres_midi'), 'gauche', 3, 31)).toEqual(c(1, 10, 'matin'));
    expect(caseSuivante(c(1, 10, 'matin'), 'gauche', 3, 31)).toEqual(c(1, 9, 'apres_midi'));
  });

  it('PMC-2 : ↓ et ↑ gardent le jour et la demi-case, changent de ressource', () => {
    expect(caseSuivante(c(0, 5, 'matin'), 'bas', 3, 31)).toEqual(c(1, 5, 'matin'));
    expect(caseSuivante(c(1, 5, 'apres_midi'), 'bas', 3, 31)).toEqual(c(2, 5, 'apres_midi'));
    expect(caseSuivante(c(2, 5, 'matin'), 'haut', 3, 31)).toEqual(c(1, 5, 'matin'));
    expect(caseSuivante(c(1, 5, 'apres_midi'), 'haut', 3, 31)).toEqual(c(0, 5, 'apres_midi'));
  });

  it('PMC-3 : Début et Fin : première et dernière case de la ligne, de n’importe quelle case', () => {
    for (const depart of [c(1, 1, 'matin'), c(1, 17, 'apres_midi'), c(1, 31, 'apres_midi')]) {
      expect(caseSuivante(depart, 'debut', 3, 31)).toEqual(c(1, 1, 'matin'));
      expect(caseSuivante(depart, 'fin', 3, 31)).toEqual(c(1, 31, 'apres_midi'));
    }
  });

  it('PMC-4 : bornes sans bouclage (première et dernière case, première et dernière ligne, angles)', () => {
    expect(caseSuivante(c(1, 1, 'matin'), 'gauche', 3, 31)).toEqual(c(1, 1, 'matin'));
    expect(caseSuivante(c(1, 31, 'apres_midi'), 'droite', 3, 31)).toEqual(c(1, 31, 'apres_midi'));
    expect(caseSuivante(c(0, 7, 'matin'), 'haut', 3, 31)).toEqual(c(0, 7, 'matin'));
    expect(caseSuivante(c(2, 7, 'matin'), 'bas', 3, 31)).toEqual(c(2, 7, 'matin'));
    // angle haut gauche
    expect(caseSuivante(c(0, 1, 'matin'), 'haut', 3, 31)).toEqual(c(0, 1, 'matin'));
    expect(caseSuivante(c(0, 1, 'matin'), 'gauche', 3, 31)).toEqual(c(0, 1, 'matin'));
    // angle bas droit
    expect(caseSuivante(c(2, 31, 'apres_midi'), 'bas', 3, 31)).toEqual(c(2, 31, 'apres_midi'));
    expect(caseSuivante(c(2, 31, 'apres_midi'), 'droite', 3, 31)).toEqual(c(2, 31, 'apres_midi'));
  });

  it('PMC-5 : grille d’une seule ligne : ↑ et ↓ sans effet, → et ← parcourent la ligne', () => {
    expect(caseSuivante(c(0, 4, 'apres_midi'), 'haut', 1, 31)).toEqual(c(0, 4, 'apres_midi'));
    expect(caseSuivante(c(0, 4, 'apres_midi'), 'bas', 1, 31)).toEqual(c(0, 4, 'apres_midi'));
    expect(caseSuivante(c(0, 4, 'apres_midi'), 'droite', 1, 31)).toEqual(c(0, 5, 'matin'));
    expect(caseSuivante(c(0, 4, 'apres_midi'), 'gauche', 1, 31)).toEqual(c(0, 4, 'matin'));
  });

  it('PMC-6 : mois de 28 jours (février 2027) : dernière case = 28 après-midi', () => {
    expect(caseSuivante(c(0, 27, 'apres_midi'), 'droite', 2, 28)).toEqual(c(0, 28, 'matin'));
    expect(caseSuivante(c(0, 28, 'apres_midi'), 'droite', 2, 28)).toEqual(c(0, 28, 'apres_midi'));
    expect(caseSuivante(c(1, 3, 'matin'), 'fin', 2, 28)).toEqual(c(1, 28, 'apres_midi'));
  });

  it('PMC-7 : correspondance des touches ; les autres touches sont sans effet (null)', () => {
    expect(toucheGrille('ArrowRight')).toBe('droite');
    expect(toucheGrille('ArrowLeft')).toBe('gauche');
    expect(toucheGrille('ArrowUp')).toBe('haut');
    expect(toucheGrille('ArrowDown')).toBe('bas');
    expect(toucheGrille('Home')).toBe('debut');
    expect(toucheGrille('End')).toBe('fin');
    for (const autre of ['Tab', ' ', 'Enter', 'PageUp', 'PageDown', 'Escape', 'a']) {
      expect(toucheGrille(autre)).toBeNull();
    }
  });
});
