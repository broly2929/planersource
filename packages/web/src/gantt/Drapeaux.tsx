import { Badge } from '../components/Badge';
import { VIDE, libelleDrapeau } from './libelles';

export function Drapeaux({ drapeaux }: { drapeaux: string[] }) {
  if (drapeaux.length === 0) return <>{VIDE}</>;
  return (
    <span className="flex gap-1 whitespace-nowrap">
      {drapeaux.map((d) => (
        <Badge key={d} statut="flag">
          {libelleDrapeau(d)}
        </Badge>
      ))}
    </span>
  );
}
