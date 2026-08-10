const VARIETY_ICONS: Record<string, string> = {
  sukkari: '🍯',
  sukari: '🍯',
  khalas: '🟤',
  khalasi: '🟤',
  barhi: '🟡',
  barhee: '🟡',
  sagai: '🌴',
  sagay: '🌴',
  ajwa: '⚫',
  majdoul: '🟫',
  majdool: '🟫',
  khidri: '🔻',
  khadrawy: '🟢',
};

export function getVarietyIcon(varietyId: string | undefined, varietyName: string | undefined): string {
  const idKey = varietyId?.toLowerCase().replace(/\s+/g, '') ?? '';
  if (idKey && VARIETY_ICONS[idKey]) return VARIETY_ICONS[idKey];
  const nameKey = varietyName?.toLowerCase().replace(/\s+/g, '') ?? '';
  if (nameKey && VARIETY_ICONS[nameKey]) return VARIETY_ICONS[nameKey];
  return '🌴';
}

const DEFAULT_VARIETY_IMAGES: Record<string, string[]> = {
  sukkari: [
    'https://images.pexels.com/photos/4469611/pexels-photo-4469611.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/36539852/pexels-photo-36539852.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  khalas: [
    'https://images.pexels.com/photos/36072771/pexels-photo-36072771.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  barhi: [
    'https://images.pexels.com/photos/5155704/pexels-photo-5155704.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/5194089/pexels-photo-5194089.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  sagai: [
    'https://images.pexels.com/photos/37284778/pexels-photo-37284778.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/12944736/pexels-photo-12944736.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  ajwa: [
    'https://images.pexels.com/photos/12625117/pexels-photo-12625117.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/37284778/pexels-photo-37284778.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
};

const GENERIC_FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/17877983/pexels-photo-17877983.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

export function getDefaultVarietyImages(varietyId: string): string[] {
  const key = varietyId?.toLowerCase().replace(/\s+/g, '') ?? '';
  if (key && DEFAULT_VARIETY_IMAGES[key]) return DEFAULT_VARIETY_IMAGES[key];
  return GENERIC_FALLBACK_IMAGES;
}

// ── Palm tree images for uprooting (نقايل) context ──
const PALM_TREE_IMAGES: Record<string, string[]> = {
  sukari: [
    'https://images.pexels.com/photos/12908177/pexels-photo-12908177.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/14096760/pexels-photo-14096760.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/9983115/pexels-photo-9983115.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  khalas: [
    'https://images.pexels.com/photos/28170223/pexels-photo-28170223.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/12968096/pexels-photo-12968096.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/9092134/pexels-photo-9092134.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  barhi: [
    'https://images.pexels.com/photos/17877729/pexels-photo-17877729.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/17877603/pexels-photo-17877603.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/17877771/pexels-photo-17877771.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  saghai: [
    'https://images.pexels.com/photos/35833297/pexels-photo-35833297.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/36845395/pexels-photo-36845395.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/33740543/pexels-photo-33740543.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  majdoul: [
    'https://images.pexels.com/photos/17877770/pexels-photo-17877770.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/17877982/pexels-photo-17877982.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/17877983/pexels-photo-17877983.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
};

const GENERIC_PALM_TREE_IMAGES = [
  'https://images.pexels.com/photos/12908177/pexels-photo-12908177.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/28170223/pexels-photo-28170223.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/35833297/pexels-photo-35833297.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

export function getPalmTreeImages(varietyId: string): string[] {
  const key = varietyId?.toLowerCase().replace(/\s+/g, '') ?? '';
  if (key && PALM_TREE_IMAGES[key]) return PALM_TREE_IMAGES[key];
  return GENERIC_PALM_TREE_IMAGES;
}

// ── Palm seedling images for فسائل context ──
const SEEDLING_IMAGES: Record<string, string[]> = {
  sukari: [
    'https://images.pexels.com/photos/11573787/pexels-photo-11573787.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/6508563/pexels-photo-6508563.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/30119143/pexels-photo-30119143.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  khalas: [
    'https://images.pexels.com/photos/31113009/pexels-photo-31113009.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/7156429/pexels-photo-7156429.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/12407449/pexels-photo-12407449.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  barhi: [
    'https://images.pexels.com/photos/19812779/pexels-photo-19812779.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/11678307/pexels-photo-11678307.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/30253502/pexels-photo-30253502.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  saghai: [
    'https://images.pexels.com/photos/31113012/pexels-photo-31113012.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/9512341/pexels-photo-9512341.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/5808/food-healthy-vegetables-village.jpg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  majdoul: [
    'https://images.pexels.com/photos/11573787/pexels-photo-11573787.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/30119143/pexels-photo-30119143.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/6508563/pexels-photo-6508563.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
};

const GENERIC_SEEDLING_IMAGES = [
  'https://images.pexels.com/photos/11573787/pexels-photo-11573787.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/6508563/pexels-photo-6508563.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/30119143/pexels-photo-30119143.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

export function getSeedlingImages(varietyId: string): string[] {
  const key = varietyId?.toLowerCase().replace(/\s+/g, '') ?? '';
  if (key && SEEDLING_IMAGES[key]) return SEEDLING_IMAGES[key];
  return GENERIC_SEEDLING_IMAGES;
}

// ── Palm residue images for مخلفات context ──
const RESIDUE_IMAGES: Record<string, string[]> = {
  fronds: [
    'https://images.pexels.com/photos/11498742/pexels-photo-11498742.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/10248498/pexels-photo-10248498.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/14047139/pexels-photo-14047139.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  frond_strips: [
    'https://images.pexels.com/photos/10248498/pexels-photo-10248498.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/14047139/pexels-photo-14047139.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/11498742/pexels-photo-11498742.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  kerb: [
    'https://images.pexels.com/photos/434132/pexels-photo-434132.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/36532742/pexels-photo-36532742.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/33753209/pexels-photo-33753209.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  fiber: [
    'https://images.pexels.com/photos/17588814/pexels-photo-17588814.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/57396/rope-ropes-knot-woven-57396.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/1624291/pexels-photo-1624291.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  trunks: [
    'https://images.pexels.com/photos/29894480/pexels-photo-29894480.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/35981359/pexels-photo-35981359.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/36363962/pexels-photo-36363962.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  mixed: [
    'https://images.pexels.com/photos/10903417/pexels-photo-10903417.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/7728309/pexels-photo-7728309.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/10969906/pexels-photo-10969906.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  other: [
    'https://images.pexels.com/photos/10903417/pexels-photo-10903417.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/7728309/pexels-photo-7728309.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/10969906/pexels-photo-10969906.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
};

const GENERIC_RESIDUE_IMAGES = [
  'https://images.pexels.com/photos/11498742/pexels-photo-11498742.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/10248498/pexels-photo-10248498.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/14047139/pexels-photo-14047139.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

export function getResidueImages(residueType: string): string[] {
  const key = residueType?.toLowerCase().replace(/\s+/g, '') ?? '';
  if (key && RESIDUE_IMAGES[key]) return RESIDUE_IMAGES[key];
  return GENERIC_RESIDUE_IMAGES;
}

// ── Residue type icons (emoji for slider) ──
const RESIDUE_ICONS: Record<string, string> = {
  fronds: '🌿',
  frond_strips: '🪵',
  kerb: '🛡️',
  fiber: '🧵',
  trunks: '🪵',
  mixed: '♻️',
  other: '📦',
};

export function getResidueIcon(residueType: string | undefined): string {
  const key = residueType?.toLowerCase().replace(/\s+/g, '') ?? '';
  if (key && RESIDUE_ICONS[key]) return RESIDUE_ICONS[key];
  return '📦';
}

// ── Palm supply images for مستلزمات وتقنيات context ──
const SUPPLY_IMAGES: Record<string, string[]> = {
  irrigation_systems: [
    'https://images.pexels.com/photos/10606633/pexels-photo-10606633.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/11678428/pexels-photo-11678428.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/33881124/pexels-photo-33881124.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  fertilization: [
    'https://images.pexels.com/photos/12612073/pexels-photo-12612073.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/36830577/pexels-photo-36830577.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/4894608/pexels-photo-4894608.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  pest_control: [
    'https://images.pexels.com/photos/36830577/pexels-photo-36830577.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/37993891/pexels-photo-37993891.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/4894608/pexels-photo-4894608.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  pollination_tools: [
    'https://images.pexels.com/photos/7509492/pexels-photo-7509492.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/7509487/pexels-photo-7509487.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/20579991/pexels-photo-20579991.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  harvest_equipment: [
    'https://images.pexels.com/photos/12982187/pexels-photo-12982187.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/5454206/pexels-photo-5454206.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/6680149/pexels-photo-6680149.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  smart_tech: [
    'https://images.pexels.com/photos/5230957/pexels-photo-5230957.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/5230960/pexels-photo-5230960.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/36729360/pexels-photo-36729360.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  packing_supplies: [
    'https://images.pexels.com/photos/18566999/pexels-photo-18566999.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/19214709/pexels-photo-19214709.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/20579991/pexels-photo-20579991.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  spare_parts: [
    'https://images.pexels.com/photos/7568431/pexels-photo-7568431.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/5279361/pexels-photo-5279361.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/4049356/pexels-photo-4049356.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
};

const GENERIC_SUPPLY_IMAGES = [
  'https://images.pexels.com/photos/18566999/pexels-photo-18566999.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/7509492/pexels-photo-7509492.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/10606633/pexels-photo-10606633.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

export function getSupplyImages(category: string): string[] {
  const key = category?.toLowerCase().replace(/\s+/g, '') ?? '';
  if (key && SUPPLY_IMAGES[key]) return SUPPLY_IMAGES[key];
  return GENERIC_SUPPLY_IMAGES;
}

const SUPPLY_ICONS: Record<string, string> = {
  irrigation_systems: '💧',
  fertilization: '🧪',
  pest_control: '🛡️',
  pollination_tools: '✂️',
  harvest_equipment: '🚜',
  smart_tech: '📱',
  packing_supplies: '📦',
  spare_parts: '⚙️',
};

export function getSupplyIcon(category: string | undefined): string {
  const key = category?.toLowerCase().replace(/\s+/g, '') ?? '';
  if (key && SUPPLY_ICONS[key]) return SUPPLY_ICONS[key];
  return '🔧';
}

// ── Palm service images for خدمات النخيل context ──
const SERVICE_BRANCH_IMAGES: Record<string, string[]> = {
  pollination: [
    'https://images.pexels.com/photos/17877771/pexels-photo-17877771.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/17872169/pexels-photo-17872169.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/28445714/pexels-photo-28445714.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  pruning: [
    'https://images.pexels.com/photos/16681284/pexels-photo-16681284.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/35089307/pexels-photo-35089307.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/36797822/pexels-photo-36797822.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  uprooting_planting: [
    'https://images.pexels.com/photos/35619776/pexels-photo-35619776.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/11669872/pexels-photo-11669872.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/36617363/pexels-photo-36617363.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  protection: [
    'https://images.pexels.com/photos/36752203/pexels-photo-36752203.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/4894608/pexels-photo-4894608.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/37218952/pexels-photo-37218952.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  agricultural: [
    'https://images.pexels.com/photos/21967623/pexels-photo-21967623.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/11996945/pexels-photo-11996945.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/11996941/pexels-photo-11996941.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  consulting: [
    'https://images.pexels.com/photos/5230957/pexels-photo-5230957.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/6284997/pexels-photo-6284997.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/36729360/pexels-photo-36729360.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
};

const GENERIC_SERVICE_IMAGES = [
  'https://images.pexels.com/photos/16681284/pexels-photo-16681284.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/17877771/pexels-photo-17877771.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/21967623/pexels-photo-21967623.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

export function getServiceImages(branchKey: string): string[] {
  const key = branchKey?.toLowerCase().replace(/\s+/g, '') ?? '';
  if (key && SERVICE_BRANCH_IMAGES[key]) return SERVICE_BRANCH_IMAGES[key];
  return GENERIC_SERVICE_IMAGES;
}

const SERVICE_BRANCH_ICONS: Record<string, string> = {
  pollination: '🌸',
  pruning: '✂️',
  uprooting_planting: '🌱',
  protection: '🛡️',
  agricultural: '🌾',
  consulting: '📋',
};

export function getServiceBranchIcon(branchKey: string | undefined): string {
  const key = branchKey?.toLowerCase().replace(/\s+/g, '') ?? '';
  if (key && SERVICE_BRANCH_ICONS[key]) return SERVICE_BRANCH_ICONS[key];
  return '🛠️';
}
