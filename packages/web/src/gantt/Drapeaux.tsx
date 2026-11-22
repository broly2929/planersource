import { Badge } from '../components/Badge';
import { VIDE, libelleDrapeau } from './libelles';

/** Badge « Client » (engagement client dépassé, D-149 (8d)) : hors des drapeaux du moteur. */
export function Drapeaux({
  drapeaux,
  engagementClient = false,
}: {
  drapeaux: string[];
  engagementClient?: boolean;
}) {
  if (drapeaux.length === 0 && !engagementClient) return <>{VIDE}</>;
  return (
    <span className="flex gap-1 whitespace-nowrap">
      {drapeaux.map((d) => (
        <Badge key={d} statut="flag">
          {libelleDrapeau(d)}
        </Badge>
      ))}
      {engagementClient && (
        <Badge statut="flag" title="Engagement client dépassé">
          Client
        </Badge>
      )}
    </span>
  );
}
