import { BoosterType, CakeFlavor, DecorItem, FlavorId } from './types';

export const CAKE_FLAVORS: Record<FlavorId, CakeFlavor> = {
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry Shortcake',
    shortName: 'Strawberry',
    spongeColor: '#ffd2dc',
    creamColor: '#fff8f4',
    icingColor: '#ff6b8b',
    garnishColor: '#e62e4d',
    accentColor: '#5cb85c',
    badgeBg: '#ffe3ea',
    unlockLevel: 1,
    sellCoins: 15,
    description: 'Fluffy vanilla-berry sponge layered with whipped chantilly and glazed strawberries.',
  },
  chocolate: {
    id: 'chocolate',
    name: 'Belgian Truffle',
    shortName: 'Chocolate',
    spongeColor: '#5c3322',
    creamColor: '#a66d4f',
    icingColor: '#361b12',
    garnishColor: '#24100a',
    accentColor: '#d9a441',
    badgeBg: '#efe0d8',
    unlockLevel: 1,
    sellCoins: 18,
    description: 'Velvety dark cocoa layers enrobed in glossy ganache and gold-dusted truffles.',
  },
  matcha: {
    id: 'matcha',
    name: 'Ceremonial Matcha',
    shortName: 'Matcha',
    spongeColor: '#9ccf76',
    creamColor: '#f7f9f0',
    icingColor: '#69a84f',
    garnishColor: '#4c8734',
    accentColor: '#ffffff',
    badgeBg: '#e6f4dc',
    unlockLevel: 1,
    sellCoins: 20,
    description: 'Earthy Uji green tea sponge paired with sweet cream and tender matcha mochi.',
  },
  lemon: {
    id: 'lemon',
    name: 'Yuzu Lemon Meringue',
    shortName: 'Lemon',
    spongeColor: '#ffe885',
    creamColor: '#fffdf2',
    icingColor: '#ffd03b',
    garnishColor: '#fff9e6',
    accentColor: '#f5a623',
    badgeBg: '#fff5cc',
    unlockLevel: 2,
    sellCoins: 22,
    description: 'Bright citrus sponge finished with tangy yuzu curd and torched meringue peaks.',
  },
  blueberry: {
    id: 'blueberry',
    name: 'Blueberry Velvet',
    shortName: 'Blueberry',
    spongeColor: '#9b8ce8',
    creamColor: '#f5f2ff',
    icingColor: '#5d52b8',
    garnishColor: '#312b73',
    accentColor: '#64c28e',
    badgeBg: '#e8e4ff',
    unlockLevel: 3,
    sellCoins: 25,
    description: 'Wild blueberry compote folded into lavender cream with plump fresh berries.',
  },
  redvelvet: {
    id: 'redvelvet',
    name: 'Ruby Red Velvet',
    shortName: 'Red Velvet',
    spongeColor: '#b8293d',
    creamColor: '#fff9f5',
    icingColor: '#d9384e',
    garnishColor: '#fffaf7',
    accentColor: '#9e192b',
    badgeBg: '#fde2e6',
    unlockLevel: 5,
    sellCoins: 28,
    description: 'Classic crimson buttermilk crumb crowned with tangy cream cheese frosting.',
  },
  caramel: {
    id: 'caramel',
    name: 'Salted Caramel Espresso',
    shortName: 'Caramel',
    spongeColor: '#d69e66',
    creamColor: '#f5e2cb',
    icingColor: '#c47429',
    garnishColor: '#e89d3a',
    accentColor: '#6e4220',
    badgeBg: '#f9ead9',
    unlockLevel: 7,
    sellCoins: 32,
    description: 'Warm brown-butter sponge drizzled with fleur de sel caramel and espresso cream.',
  },
  pistachio: {
    id: 'pistachio',
    name: 'Pistachio Rose',
    shortName: 'Pistachio',
    spongeColor: '#a8cf98',
    creamColor: '#ffe3ec',
    icingColor: '#7eb872',
    garnishColor: '#f79ab5',
    accentColor: '#4e8a42',
    badgeBg: '#e4f3df',
    unlockLevel: 9,
    sellCoins: 36,
    description: 'Roasted Sicilian pistachio sponge kissed with delicate Damascus rosewater cream.',
  },
};

export const FLAVOR_ORDER: FlavorId[] = [
  'strawberry',
  'chocolate',
  'matcha',
  'lemon',
  'blueberry',
  'redvelvet',
  'caramel',
  'pistachio',
];

export const DECOR_CATALOG: DecorItem[] = [
  // Countertops
  {
    id: 'counter:oak',
    category: 'counter',
    name: 'Warm Honey Oak',
    description: 'Classic sunlit artisan bakery counter with natural wood grain.',
    cost: 0,
    unlockBakeryLevel: 1,
    icon: '🪵',
    previewColor: '#d4a373',
  },
  {
    id: 'counter:marble',
    category: 'counter',
    name: 'Carrara White Marble',
    description: 'Cool Parisian pastry slab veined in soft silver-grey.',
    cost: 120,
    unlockBakeryLevel: 1,
    icon: '🏛️',
    previewColor: '#f4f3ef',
  },
  {
    id: 'counter:terrazzo',
    category: 'counter',
    name: 'Blush Pastel Terrazzo',
    description: 'Playful modern stone speckled with rose, mint, and gold chips.',
    cost: 220,
    unlockBakeryLevel: 2,
    icon: '🎨',
    previewColor: '#f9e4e8',
  },
  {
    id: 'counter:slate',
    category: 'counter',
    name: 'Midnight Brass Slate',
    description: 'Chic evening dessert bar inlaid with brushed champagne brass.',
    cost: 360,
    unlockBakeryLevel: 4,
    icon: '✨',
    previewColor: '#2c303a',
  },

  // Plate styles
  {
    id: 'plate:porcelain',
    category: 'plate',
    name: 'Classic Porcelain',
    description: 'Crisp ivory glaze plates with a timeless patisserie curve.',
    cost: 0,
    unlockBakeryLevel: 1,
    icon: '🍽️',
    previewColor: '#fffdf9',
  },
  {
    id: 'plate:gold',
    category: 'plate',
    name: 'Gold-Rimmed Royal',
    description: 'Fine bone china finished with a 24k champagne gold rim.',
    cost: 150,
    unlockBakeryLevel: 1,
    icon: '👑',
    previewColor: '#f7d774',
  },
  {
    id: 'plate:mint',
    category: 'plate',
    name: 'Pastel Mint Ceramic',
    description: 'Hand-thrown celadon mint stoneware with warm cream lip.',
    cost: 240,
    unlockBakeryLevel: 2,
    icon: '🌿',
    previewColor: '#bde8d4',
  },
  {
    id: 'plate:rose',
    category: 'plate',
    name: 'Blush Petal China',
    description: 'Soft sakura-pink porcelain crafted for signature desserts.',
    cost: 320,
    unlockBakeryLevel: 3,
    icon: '🌸',
    previewColor: '#f9c5d1',
  },

  // 3D Props displayed live around the bakery counter
  {
    id: 'prop:macaron',
    category: 'prop',
    name: 'Macaron Glass Cloche',
    description: 'A sparkling dome display stacked with pastel French macarons.',
    cost: 90,
    unlockBakeryLevel: 1,
    icon: '🧁',
    previewColor: '#ffb7c5',
  },
  {
    id: 'prop:tulips',
    category: 'prop',
    name: 'Fresh Tulip Vase',
    description: 'Cream ceramic pitcher bursting with cheerful morning tulips.',
    cost: 140,
    unlockBakeryLevel: 1,
    icon: '🌷',
    previewColor: '#ff758f',
  },
  {
    id: 'prop:teapot',
    category: 'prop',
    name: 'Vintage Brass Teapot',
    description: 'Polished brass tea kettle & espresso cups for café guests.',
    cost: 210,
    unlockBakeryLevel: 2,
    icon: '🫖',
    previewColor: '#d9a441',
  },
  {
    id: 'prop:lights',
    category: 'prop',
    name: 'Warm Café Fairy Lights',
    description: 'Cozy glowing bistro bulbs draped across the bakery backdrop.',
    cost: 280,
    unlockBakeryLevel: 3,
    icon: '💡',
    previewColor: '#ffe082',
  },
  {
    id: 'prop:trophy',
    category: 'prop',
    name: 'Golden Whisk Award',
    description: 'Prestigious Master Pâtissier trophy gleaming on the shelf.',
    cost: 450,
    unlockBakeryLevel: 4,
    icon: '🏆',
    previewColor: '#ffd54f',
  },
];

export interface BakeryRank {
  level: number;
  title: string;
  starsRequired: number;
  badge: string;
}

export const BAKERY_RANKS: BakeryRank[] = [
  { level: 1, title: 'Cozy Home Kitchen', starsRequired: 0, badge: '🥐' },
  { level: 2, title: 'Neighborhood Bakehouse', starsRequired: 4, badge: '🧁' },
  { level: 3, title: 'La Petite Pâtisserie', starsRequired: 10, badge: '🍰' },
  { level: 4, title: 'Grand Boulevard Salon', starsRequired: 18, badge: '🎂' },
  { level: 5, title: 'Royal Star Confectionery', starsRequired: 30, badge: '👑' },
];

export function getBakeryRank(stars: number): { current: BakeryRank; next: BakeryRank | null } {
  let current = BAKERY_RANKS[0];
  let next: BakeryRank | null = BAKERY_RANKS[1];
  for (let i = 0; i < BAKERY_RANKS.length; i++) {
    if (stars >= BAKERY_RANKS[i].starsRequired) {
      current = BAKERY_RANKS[i];
      next = BAKERY_RANKS[i + 1] ?? null;
    }
  }
  return { current, next };
}

export const BOOSTER_INFO: Record<
  BoosterType,
  { name: string; icon: string; cost: number; desc: string }
> = {
  undo: {
    name: 'Undo',
    icon: '↩️',
    cost: 25,
    desc: 'Rewind your last slice move.',
  },
  extraPlate: {
    name: '+Plate',
    icon: '🍽️',
    cost: 60,
    desc: 'Add a bonus porcelain plate to the counter.',
  },
  shuffle: {
    name: 'Whisk',
    icon: '🪄',
    cost: 70,
    desc: 'Smartly tidy and regroup tricky slices.',
  },
  autoBake: {
    name: 'Auto-Cake',
    icon: '✨',
    cost: 110,
    desc: 'Instantly gather & serve one full 6-slice cake!',
  },
};
