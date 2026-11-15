import { FLAVOR_ORDER } from './catalog';
import { BakeryMetaState, FlavorId } from './types';
import { ytPlayables } from './youtubePlayables';

const STORAGE_KEY = 'cake_sort_puzzle_3d_meta_v1';

function defaultCakesByFlavor(): Record<FlavorId, number> {
  const rec = {} as Record<FlavorId, number>;
  for (const f of FLAVOR_ORDER) rec[f] = 0;
  return rec;
}

export function createInitialMeta(): BakeryMetaState {
  return {
    currentLevel: 1,
    coins: 160,
    stars: 0,
    totalCakesBaked: 0,
    cakesBakedByFlavor: defaultCakesByFlavor(),
    boosters: {
      undo: 4,
      extraPlate: 2,
      shuffle: 2,
      autoBake: 1,
    },
    ownedDecor: ['counter:oak', 'plate:porcelain'],
    equippedCounter: 'oak',
    equippedPlate: 'porcelain',
    activeProps: [],
    soundEnabled: true,
    dailyClaimedDate: null,
  };
}

export function loadMeta(): BakeryMetaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialMeta();
    const parsed = JSON.parse(raw) as Partial<BakeryMetaState>;
    const base = createInitialMeta();
    return {
      ...base,
      ...parsed,
      boosters: { ...base.boosters, ...(parsed.boosters ?? {}) },
      cakesBakedByFlavor: { ...base.cakesBakedByFlavor, ...(parsed.cakesBakedByFlavor ?? {}) },
      ownedDecor: Array.isArray(parsed.ownedDecor) ? parsed.ownedDecor : base.ownedDecor,
      activeProps: Array.isArray(parsed.activeProps) ? parsed.activeProps : base.activeProps,
    };
  } catch {
    return createInitialMeta();
  }
}

export function saveMeta(meta: BakeryMetaState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    // Also sync to YouTube Playables Cloud Save asynchronously
    ytPlayables.saveCloudData(meta).catch(() => {});
  } catch {
    // Ignore storage quota errors
  }
}
