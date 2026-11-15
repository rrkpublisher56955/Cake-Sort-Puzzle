import { CAKE_FLAVORS, FLAVOR_ORDER } from './catalog';
import { FlavorId, LevelConfig, PlateData } from './types';

export interface TopGroup {
  flavor: FlavorId;
  count: number;
}

export function getTopGroup(plate: PlateData): TopGroup | null {
  const len = plate.slices.length;
  if (len === 0) return null;
  const flavor = plate.slices[len - 1];
  let count = 1;
  for (let i = len - 2; i >= 0; i--) {
    if (plate.slices[i] === flavor) count++;
    else break;
  }
  return { flavor, count };
}

export function isSingleFlavorPlate(plate: PlateData): boolean {
  if (plate.slices.length === 0) return false;
  const f = plate.slices[0];
  return plate.slices.every((s) => s === f);
}

export function isPlateCompleted(plate: PlateData): boolean {
  return plate.slices.length === 6 && isSingleFlavorPlate(plate);
}

export function canMoveSlices(from: PlateData, to: PlateData): number {
  if (from.id === to.id) return 0;
  if (from.slices.length === 0) return 0;
  const free = 6 - to.slices.length;
  if (free <= 0) return 0;

  const top = getTopGroup(from)!;
  if (to.slices.length === 0) {
    return Math.min(top.count, free);
  }
  const destTop = to.slices[to.slices.length - 1];
  if (destTop !== top.flavor) return 0;
  return Math.min(top.count, free);
}

export function getValidTargetIds(plates: PlateData[], fromPlateId: number): number[] {
  const from = plates.find((p) => p.id === fromPlateId);
  if (!from) return [];
  return plates
    .filter((to) => canMoveSlices(from, to) > 0)
    .map((to) => to.id);
}

export function hasAnyProductiveMove(plates: PlateData[]): boolean {
  for (const from of plates) {
    if (from.slices.length === 0) continue;
    const fromSingle = isSingleFlavorPlate(from);
    for (const to of plates) {
      if (from.id === to.id) continue;
      if (canMoveSlices(from, to) <= 0) continue;
      // Moving a single-flavor plate onto an empty plate is redundant
      if (fromSingle && to.slices.length === 0) continue;
      return true;
    }
  }
  return false;
}

export function findHintMove(plates: PlateData[]): { fromId: number; toId: number } | null {
  let bestScore = -1;
  let bestMove: { fromId: number; toId: number } | null = null;

  for (const from of plates) {
    if (from.slices.length === 0) continue;
    const fromSingle = isSingleFlavorPlate(from);
    const top = getTopGroup(from)!;

    for (const to of plates) {
      const movable = canMoveSlices(from, to);
      if (movable <= 0) continue;
      if (fromSingle && to.slices.length === 0) continue;

      let score = 0;
      if (to.slices.length > 0) {
        // Merging onto matching slices is great!
        score += 50 + movable * 10;
        if (to.slices.length + movable === 6 && isSingleFlavorPlate(to)) {
          score += 500; // Immediately completes a 6-cake!
        }
        // Exposes a new flavor underneath or empties source
        if (movable === top.count) score += 25;
      } else {
        // Moving onto empty plate to uncover underneath flavor
        score += 10 + (from.slices.length - top.count) * 4;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = { fromId: from.id, toId: to.id };
      }
    }
  }
  return bestMove;
}

// Seeded PRNG for consistent, enjoyable levels
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getLevelConfig(level: number): LevelConfig {
  const unlockedFlavors = FLAVOR_ORDER.filter((f) => CAKE_FLAVORS[f].unlockLevel <= level);

  let flavorCount = 3;
  let extraEmptyPlates = 2;
  if (level === 1) {
    flavorCount = 3;
    extraEmptyPlates = 2;
  } else if (level <= 3) {
    flavorCount = 4;
    extraEmptyPlates = 2;
  } else if (level <= 5) {
    flavorCount = 5;
    extraEmptyPlates = 2;
  } else if (level <= 8) {
    flavorCount = 6;
    extraEmptyPlates = 2;
  } else if (level <= 12) {
    flavorCount = Math.min(7, unlockedFlavors.length);
    extraEmptyPlates = 2;
  } else {
    flavorCount = Math.min(8, unlockedFlavors.length);
    extraEmptyPlates = 2;
  }

  // Pick flavors deterministically for variety each level
  const rng = mulberry32(level * 9173 + 1337);
  const pool = [...unlockedFlavors];
  // Guarantee newly unlocked flavor appears on its unlock level!
  const newlyUnlocked = unlockedFlavors.filter((f) => CAKE_FLAVORS[f].unlockLevel === level);
  const chosen: FlavorId[] = [...newlyUnlocked];
  for (const f of chosen) {
    const idx = pool.indexOf(f);
    if (idx !== -1) pool.splice(idx, 1);
  }
  while (chosen.length < flavorCount && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }

  const plateCount = flavorCount + extraEmptyPlates;
  const isSpecialOrder = level > 1 && level % 5 === 0;
  const titles = [
    'Morning Glaze',
    'Sweet Counter',
    'Berry Rush',
    'Tea Time Prep',
    'Chef’s Special',
    'Patisserie Pop',
    'Velvet Parade',
    'Golden Oven',
    'Sugar Symphony',
    'Grand Gala',
  ];

  return {
    level,
    title: isSpecialOrder ? `Chef's Special #${level}` : titles[(level - 1) % titles.length],
    flavors: chosen,
    plateCount,
    targetCakes: chosen.length,
    rewardCoins: 45 + level * 12 + (isSpecialOrder ? 40 : 0),
    rewardStars: isSpecialOrder ? 3 : level % 3 === 0 ? 2 : 1,
    isSpecialOrder,
  };
}

// Fast heuristic-guided solver to verify generated boards are 100% solvable
function verifySolvable(initialPlates: PlateData[]): boolean {
  type State = FlavorId[][];
  const encode = (st: State) =>
    st
      .map((p) => p.join(','))
      .sort()
      .join('|');

  const start: State = initialPlates.map((p) => [...p.slices]);
  const visited = new Set<string>();
  visited.add(encode(start));

  const scoreState = (st: State): number => {
    let score = 0;
    let empty = 0;
    for (const p of st) {
      if (p.length === 0) {
        empty++;
        continue;
      }
      // Count contiguous runs from bottom
      let runs = 1;
      for (let i = 1; i < p.length; i++) {
        if (p[i] !== p[i - 1]) runs++;
      }
      if (runs === 1) score += p.length * 4;
      else score -= runs * 6;
    }
    return score + empty * 8;
  };

  // Beam / priority queue search
  let frontier: { state: State; score: number }[] = [{ state: start, score: scoreState(start) }];
  let steps = 0;
  const MAX_VISITED = 2500;

  while (frontier.length > 0 && visited.size < MAX_VISITED && steps < 3000) {
    steps++;
    // Pop highest score
    let bestIdx = 0;
    for (let i = 1; i < frontier.length; i++) {
      if (frontier[i].score > frontier[bestIdx].score) bestIdx = i;
    }
    const current = frontier.splice(bestIdx, 1)[0].state;

    // Check solved
    if (current.every((p) => p.length === 0)) {
      return true;
    }

    const n = current.length;
    for (let i = 0; i < n; i++) {
      const from = current[i];
      if (from.length === 0) continue;
      const topF = from[from.length - 1];
      let topCount = 1;
      for (let k = from.length - 2; k >= 0; k--) {
        if (from[k] === topF) topCount++;
        else break;
      }
      const fromSingle = topCount === from.length;

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const to = current[j];
        if (to.length >= 6) continue;
        if (to.length === 0 && fromSingle) continue;
        if (to.length > 0 && to[to.length - 1] !== topF) continue;

        const moveAmt = Math.min(topCount, 6 - to.length);
        const next: State = current.map((p) => [...p]);
        for (let m = 0; m < moveAmt; m++) {
          next[i].pop();
          next[j].push(topF);
        }
        // Auto-clear completed cake
        if (next[j].length === 6 && next[j].every((x) => x === topF)) {
          next[j] = [];
        }

        const key = encode(next);
        if (!visited.has(key)) {
          visited.add(key);
          frontier.push({ state: next, score: scoreState(next) });
        }
      }
    }

    // Keep frontier bounded
    if (frontier.length > 400) {
      frontier.sort((a, b) => b.score - a.score);
      frontier.length = 250;
    }
  }
  return false;
}

export function generateLevelBoard(config: LevelConfig): PlateData[] {
  // Handcrafted welcoming Level 1 board (guaranteed 3-move intuitive start!)
  if (config.level === 1) {
    const [f0, f1, f2] = config.flavors;
    return [
      { id: 0, slices: [f0, f0, f0, f0, f1, f1] },
      { id: 1, slices: [f1, f1, f1, f1, f2, f2] },
      { id: 2, slices: [f2, f2, f2, f2, f0, f0] },
      { id: 3, slices: [] },
      { id: 4, slices: [] },
    ];
  }

  for (let attempt = 0; attempt < 25; attempt++) {
    const rng = mulberry32(config.level * 4999 + attempt * 313 + 77);
    const plates: FlavorId[][] = [];
    for (const f of config.flavors) {
      plates.push([f, f, f, f, f, f]);
    }
    while (plates.length < config.plateCount) {
      plates.push([]);
    }

    const totalSteps = 28 + config.level * 6;
    for (let s = 0; s < totalSteps; s++) {
      // Collect valid reverse-peel moves
      const candidates: { src: number; dst: number; amt: number }[] = [];
      const emptyCount = plates.filter((p) => p.length === 0).length;

      for (let i = 0; i < plates.length; i++) {
        const src = plates[i];
        if (src.length === 0) continue;
        const topF = src[src.length - 1];
        let g = 1;
        for (let k = src.length - 2; k >= 0; k--) {
          if (src[k] === topF) g++;
          else break;
        }
        const isPure = g === src.length;
        const maxPeel = isPure ? g : g - 1;
        if (maxPeel <= 0) continue;

        for (let j = 0; j < plates.length; j++) {
          if (i === j) continue;
          const dst = plates[j];
          if (dst.length >= 6) continue;
          // Preserve at least 1 empty plate so board starts clean & inviting
          if (dst.length === 0 && emptyCount <= 1 && !isPure) continue;
          if (dst.length > 0 && dst[dst.length - 1] === topF) continue;

          const maxFit = Math.min(maxPeel, 6 - dst.length);
          for (let amt = 1; amt <= Math.min(maxFit, 3); amt++) {
            candidates.push({ src: i, dst: j, amt });
          }
        }
      }

      if (candidates.length === 0) break;
      const pick = candidates[Math.floor(rng() * candidates.length)];
      const f = plates[pick.src][plates[pick.src].length - 1];
      for (let m = 0; m < pick.amt; m++) {
        plates[pick.src].pop();
        plates[pick.dst].push(f);
      }
    }

    // Ensure no plate starts already completed and at least 1 plate is empty
    const hasCompleted = plates.some((p) => p.length === 6 && p.every((x) => x === p[0]));
    const emptyPlates = plates.filter((p) => p.length === 0).length;
    if (hasCompleted || emptyPlates === 0) continue;

    // Shuffle plate visual order
    for (let i = plates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [plates[i], plates[j]] = [plates[j], plates[i]];
    }

    const result: PlateData[] = plates.map((slices, idx) => ({ id: idx, slices }));
    if (hasAnyProductiveMove(result) && verifySolvable(result)) {
      return result;
    }
  }

  // Fallback guaranteed solvable cyclic mix
  const fallback: PlateData[] = [];
  const fl = config.flavors;
  for (let i = 0; i < fl.length; i++) {
    const fA = fl[i];
    const fB = fl[(i + 1) % fl.length];
    fallback.push({ id: i, slices: [fA, fA, fA, fA, fB, fB] });
  }
  while (fallback.length < config.plateCount) {
    fallback.push({ id: fallback.length, slices: [] });
  }
  return fallback;
}

/**
 * Smart Whisk Booster: regroups scattered slices across the existing plates
 * while keeping total slice counts per flavor identical and leaving room to sort.
 */
export function applyWhiskShuffle(plates: PlateData[]): PlateData[] {
  const counts = new Map<FlavorId, number>();
  for (const p of plates) {
    for (const s of p.slices) {
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }

  // Build grouped chunks of 2-4 same-flavor slices and distribute neatly leaving >=1 empty plate
  const chunks: FlavorId[][] = [];
  for (const [flavor, total] of counts.entries()) {
    let rem = total;
    while (rem > 0) {
      const take = rem >= 4 ? 3 : rem;
      chunks.push(Array(take).fill(flavor));
      rem -= take;
    }
  }

  // Interleave chunks from different flavors
  chunks.sort((a, b) => b.length - a.length);
  const newPlates: PlateData[] = plates.map((p) => ({ ...p, slices: [] }));
  const usableCount = Math.max(1, newPlates.length - 1);

  // Place chunks without creating pre-completed plates
  let pIdx = 0;
  for (const chunk of chunks) {
    let placed = false;
    for (let tries = 0; tries < newPlates.length; tries++) {
      const target = newPlates[(pIdx + tries) % usableCount];
      if (target.slices.length + chunk.length <= 6) {
        const wouldComplete =
          target.slices.length + chunk.length === 6 &&
          target.slices.every((s) => s === chunk[0]);
        if (!wouldComplete) {
          target.slices.push(...chunk);
          pIdx = (pIdx + tries + 1) % usableCount;
          placed = true;
          break;
        }
      }
    }
    if (!placed) {
      for (const target of newPlates) {
        if (target.slices.length + chunk.length <= 6) {
          target.slices.push(...chunk);
          break;
        }
      }
    }
  }

  return newPlates;
}
