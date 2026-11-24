import { useState } from 'react';
import { api } from '../../api';
import { useAnnuaire, type EntreeAnnuaire } from '../../annuaire';
import { useAuth } from '../../auth';
import { Case } from '../../components/Case';
import { Dialog, useDialoguePret } from '../../components/Dialog';
import { Chargement } from '../../components/Etat';
import { Field } from '../../components/Field';
import { Notification } from '../../components/Notification';
import { Select } from '../../components/Select';
import { optionsProjetParent, type ProjetArbre } from '../../projets/arbre';
import { CODE_UTILISE, FormulaireDialogue, useListe } from './commun';

interface ProjetModifiable {
  id: number;
  code: string;
  nom: string;
  chef_id: number;
  date_debut: string;
  priorite: number;
  clos: boolean;
  est_modele: boolean;
  parent_id: number | null;
}

function Formulaire({
  projet: p,
  admin,
  annuaire,
  projets,
  onSucces,
  onAnnuler,
}: {
  projet: ProjetModifiable;
  admin: boolean;
  annuaire: EntreeAnnuaire[] | null;
  projets: ProjetArbre[];
  onSucces: () => void;
  onAnnuler: () => void;
}) {
  useDialoguePret(annuaire !== null);
  const [code, setCode] = useState(p.code);
  const [nom, setNom] = useState(p.nom);
  const [debut, setDebut] = useState(p.date_debut);
  const [priorite, setPriorite] = useState(String(p.priorite));
  const [clos, setClos] = useState(p.clos);
  const [chef, setChef] = useState(String(p.chef_id));
  const [parent, setParent] = useState(p.parent_id === null ? '' : String(p.parent_id));
  const parentChange = parent !== (p.parent_id === null ? '' : String(p.parent_id));
  const optionsParent = [
    { value: '', label: 'Aucun (projet racine)' },
    ...optionsProjetParent(projets, p.id),
  ];
  // Chef de projet : administrateur sur un projet ordinaire seulement (D-072) ; D-028 pour la liste.
  const avecChef = admin && !p.est_modele;
  const options = (annuaire ?? [])
    .filter(
      (u) =>
        u.id === p.chef_id ||
        (u.actif && (u.role === 'administrateur' || u.role === 'chef_de_projet')),
    )
    .map((u) => ({ value: String(u.id), label: u.nom }));

  // Seuls les champs modifiés partent dans le PATCH.
  const modifies = () => ({
    ...(code !== p.code ? { code } : {}),
    ...(nom !== p.nom ? { nom } : {}),
    ...(debut !== p.date_debut ? { date_debut: debut } : {}),
    ...(Number(priorite) !== p.priorite ? { priorite: Number(priorite) } : {}),
    ...(clos !== p.clos ? { clos } : {}),
    ...(avecChef && chef !== String(p.chef_id) ? { chef_id: Number(chef) } : {}),
    ...(!p.est_modele && parentChange ? { parent_id: parent === '' ? null : Number(parent) } : {}),
  });

  return (
    <FormulaireDialogue
      libelle="Enregistrer"
      envoyer={() => api(`/api/projets/${p.id}`, { method: 'PATCH', body: modifies() })}
      onSucces={onSucces}
      onAnnuler={onAnnuler}
      conflit={CODE_UTILISE}
      cible="projet"
    >
      <Field label="Code" required value={code} onChange={(e) => setCode(e.target.value)} />
      <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
      <Field
        label={p.est_modele ? 'Date de début' : 'Pas avant le'}
        type="date"
        required
        value={debut}
        onChange={(e) => setDebut(e.target.value)}
      />
      <Field
        label="Priorité"
        type="number"
        required
        min="0"
        max="1000"
        step="1"
        value={priorite}
        onChange={(e) => setPriorite(e.target.value)}
      />
      {avecChef && (
        <Select
          label="Chef de projet"
          value={chef}
          onChange={(e) => setChef(e.target.value)}
          options={options}
        />
      )}
      {!p.est_modele && (
        <Select
          label="Projet parent"
          value={parent}
          onChange={(e) => setParent(e.target.value)}
          options={optionsParent}
        />
      )}
      <Case label="Clos" checked={clos} onChange={(e) => setClos(e.target.checked)} />
    </FormulaireDialogue>
  );
}

/**
 * Dialogue de modification d'un projet ou d'un modèle, unique pour la fiche et les listes.
 * Les valeurs initiales viennent de GET /api/projets/:id. À monter à l'ouverture seulement.
 */
export function DialogueModifProjet({
  projetId,
  onFermer,
  onSucces,
}: {
  projetId: number;
  onFermer: () => void;
  onSucces: () => void;
}) {
  const { etat: auth } = useAuth();
  const admin = auth.statut === 'connecte' && auth.user.role === 'administrateur';
  const annuaire = useAnnuaire();
  const [etat] = useListe<ProjetModifiable>(`/api/projets/${projetId}`);
  const [liste] = useListe<ProjetArbre[]>('/api/projets');
  return (
    <Dialog
      ouvert
      onOuvertChange={(ouvert) => !ouvert && onFermer()}
      titre="Modifier le projet"
      description="Modifiez le code, le nom, la date de début (« pas avant le » pour un projet), la priorité et l’état."
    >
      {etat.statut === 'chargement' && <Chargement libelle="Chargement du projet…" />}
      {etat.statut === 'erreur' && (
        <Notification type="erreur">Impossible de charger le projet.</Notification>
      )}
      {etat.statut === 'ok' && liste.statut === 'chargement' && (
        <Chargement libelle="Chargement du projet…" />
      )}
      {etat.statut === 'ok' && liste.statut !== 'chargement' && (
        <Formulaire
          projet={etat.donnees}
          admin={admin}
          annuaire={annuaire}
          projets={liste.statut === 'ok' ? liste.donnees : []}
          onSucces={onSucces}
          onAnnuler={onFermer}
        />
      )}
    </Dialog>
  );
}
