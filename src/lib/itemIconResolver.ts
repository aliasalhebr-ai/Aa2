import {
  Trees, Sprout, Wrench, Factory, Package, Leaf, Truck,
  Recycle, FlaskConical, Boxes, type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  variety: Trees,
  palm: Trees,
  plant: Sprout,
  seedling: Sprout,
  service: Wrench,
  product: Factory,
  factory: Factory,
  supply: Package,
  equipment: Package,
  logistics: Truck,
  transport: Truck,
  residue: Recycle,
  waste: Recycle,
  technology: FlaskConical,
  device: FlaskConical,
  default: Leaf,
};

export function resolveItemIcon(
  itemType: string | null,
  referenceSource: string | null,
): LucideIcon {
  const key = (referenceSource ?? itemType ?? '').toLowerCase();
  for (const [match, icon] of Object.entries(ICON_MAP)) {
    if (match === 'default') continue;
    if (key.includes(match)) return icon;
  }
  return ICON_MAP.default;
}

export function resolveItemIconByKey(iconKey: string | null | undefined): LucideIcon {
  if (!iconKey) return ICON_MAP.default;
  return ICON_MAP[iconKey.toLowerCase()] ?? ICON_MAP.default;
}
