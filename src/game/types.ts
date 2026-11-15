export type FlavorId =
  | 'strawberry'
  | 'chocolate'
  | 'matcha'
  | 'blueberry'
  | 'lemon'
  | 'redvelvet'
  | 'caramel'
  | 'pistachio';

export interface CakeFlavor {
  id: FlavorId;
  name: string;
  shortName: string;
  spongeColor: string;
  creamColor: string;
  icingColor: string;
  garnishColor: string;
  accentColor: string;
  badgeBg: string;
  unlockLevel: number;
  sellCoins: number;
  description: string;
}

export type CounterThemeId = 'oak' | 'marble' | 'terrazzo' | 'slate';
export type PlateStyleId = 'porcelain' | 'gold' | 'mint' | 'rose';
export type PropDecorId = 'macaron' | 'teapot' | 'tulips' | 'lights' | 'trophy';

export type DecorCategory = 'counter' | 'plate' | 'prop';

export interface DecorItem {
  id: string;
  category: DecorCategory;
  name: string;
  description: string;
  cost: number;
  unlockBakeryLevel: number;
  icon: string;
  previewColor: string;
}

export type BoosterType = 'undo' | 'extraPlate' | 'shuffle' | 'autoBake';

export interface BoosterCounts {
  undo: number;
  extraPlate: number;
  shuffle: number;
  autoBake: number;
}

export interface PlateData {
  id: number;
  slices: FlavorId[]; // ordered bottom -> top (last element is top removable group), max 6
  isExtra?: boolean;
}

export interface MoveRecord {
  fromPlateId: number;
  toPlateId: number;
  flavor: FlavorId;
  count: number;
}

export interface LevelConfig {
  level: number;
  title: string;
  flavors: FlavorId[];
  plateCount: number;
  targetCakes: number;
  rewardCoins: number;
  rewardStars: number;
  isSpecialOrder?: boolean;
}

export interface BakeryMetaState {
  currentLevel: number;
  coins: number;
  stars: number;
  totalCakesBaked: number;
  cakesBakedByFlavor: Record<FlavorId, number>;
  boosters: BoosterCounts;
  ownedDecor: string[];
  equippedCounter: CounterThemeId;
  equippedPlate: PlateStyleId;
  activeProps: PropDecorId[];
  soundEnabled: boolean;
  dailyClaimedDate: string | null;
}
