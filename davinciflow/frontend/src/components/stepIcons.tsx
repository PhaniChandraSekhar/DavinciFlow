import {
  ArrowRightLeft,
  Cable,
  Cloud,
  Database,
  Filter,
  Send,
  Sigma,
  type LucideIcon
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  database: Database,
  filter: Filter,
  'arrow-right-left': ArrowRightLeft,
  sigma: Sigma,
  cloud: Cloud,
  send: Send,
  cable: Cable
};

export function StepGlyph({ icon, className }: { icon: string; className?: string }) {
  const Icon = iconMap[icon] ?? Database;
  return <Icon className={className} />;
}
