/**
 * TypeSafe AI — System One Evaluation & Routing Engine
 * Cake Sort Puzzle 3D Patisserie Studio
 *
 * Implements high-speed typed judgments and routing primitives using TypeSafe's
 * System One architectural patterns.
 */

import { CAKE_FLAVORS, FLAVOR_ORDER } from './catalog';
import { canMoveSlices, getTopGroup, isSingleFlavorPlate } from './puzzle';
import { BakeryMetaState, FlavorId, PlateData } from './types';

export type SystemOneFlowState = 'flow' | 'deliberating' | 'stuck' | 'frustrated';
export type SystemOneRoute =
  | 'direct_merge'
  | 'unblock_plate'
  | 'clean_transfer'
  | 'booster_whisk'
  | 'booster_extra_plate'
  | 'passive';

export interface TypeSafeJudgment {
  label: string;
  probability: number; // 0.0 to 1.0
  rationale: string;
}

export interface TypeSafeEvaluationResult {
  confidence: number;
  stuckProbability: number;
  flowState: SystemOneFlowState;
  boardEntropy: number; // 0 (perfectly sorted) -> 1.0 (highly scrambled)
  recommendedRoute: SystemOneRoute;
  routeHeadline: string;
  strategicAdvice: string;
  suggestedMove: {
    fromId: number;
    toId: number;
    flavor: FlavorId;
    slicesCount: number;
    reason: string;
  } | null;
  boosterRecommendation: {
    type: 'shuffle' | 'extraPlate' | 'autoBake' | null;
    urgency: 'low' | 'medium' | 'critical' | 'none';
    justification: string;
  };
  judgments: TypeSafeJudgment[];
}

export interface BakeryStyleRouting {
  harmoniousCounter: string;
  harmoniousPlate: string;
  paletteTheme: string;
  designVerdict: string;
}

export class TypeSafeSystemOne {
  /**
   * Fast System One Evaluation of the current puzzle board state.
   * Computes board entropy, deadlock risk, and optimal tactical route.
   */
  public static evaluateBoard(
    plates: PlateData[],
    idleSeconds = 0,
    invalidTapsCount = 0
  ): TypeSafeEvaluationResult {
    let filledPlates = 0;
    let emptyPlates = 0;
    let totalSlices = 0;
    const flavorDistribution: Record<FlavorId, number> = {} as any;
    for (const f of FLAVOR_ORDER) flavorDistribution[f] = 0;

    // Measure slice distribution and entropy
    plates.forEach((p) => {
      const len = p.slices.length;
      totalSlices += len;
      if (len === 0) emptyPlates++;
      else filledPlates++;
      p.slices.forEach((f) => {
        flavorDistribution[f] = (flavorDistribution[f] || 0) + 1;
      });
    });

    // Calculate Board Entropy (disorder ratio)
    let mixedPlatesCount = 0;
    plates.forEach((p) => {
      if (p.slices.length > 1 && !isSingleFlavorPlate(p)) {
        mixedPlatesCount++;
      }
    });
    const boardEntropy = filledPlates > 0 ? mixedPlatesCount / filledPlates : 0;

    // Scan all candidate moves
    interface ScoredMove {
      fromId: number;
      toId: number;
      flavor: FlavorId;
      count: number;
      score: number;
      route: SystemOneRoute;
      reason: string;
    }

    const candidateMoves: ScoredMove[] = [];

    for (const from of plates) {
      if (from.slices.length === 0) continue;
      const fromTop = getTopGroup(from);
      if (!fromTop) continue;
      const isFromMono = isSingleFlavorPlate(from);

      for (const to of plates) {
        if (from.id === to.id) continue;
        const count = canMoveSlices(from, to);
        if (count <= 0) continue;

        // Skip moving mono-plates to empty plates (redundant)
        if (isFromMono && to.slices.length === 0) continue;

        let score = 0;
        let route: SystemOneRoute = 'clean_transfer';
        let reason = `Transfer ${count} ${CAKE_FLAVORS[fromTop.flavor].name} slice(s)`;

        // 1. Direct 6-slice completion
        if (to.slices.length + count === 6 && (to.slices.length === 0 || isSingleFlavorPlate(to))) {
          score += 1000;
          route = 'direct_merge';
          reason = `Complete full 6-slice ${CAKE_FLAVORS[fromTop.flavor].name} cake!`;
        }
        // 2. Merging onto existing flavor
        else if (to.slices.length > 0) {
          score += 120 + count * 25;
          route = 'direct_merge';
          reason = `Group ${count} ${CAKE_FLAVORS[fromTop.flavor].name} slices together on plate #${to.id}`;
        }
        // 3. Unblocking underlying flavor
        else if (to.slices.length === 0) {
          const buriedCount = from.slices.length - fromTop.count;
          if (buriedCount > 0) {
            score += 60 + buriedCount * 20;
            route = 'unblock_plate';
            reason = `Move top slices to uncover buried flavor underneath plate #${from.id}`;
          } else {
            score += 15;
          }
        }

        // Bonus if source plate becomes completely empty
        if (from.slices.length === count) {
          score += 40;
        }

        candidateMoves.push({
          fromId: from.id,
          toId: to.id,
          flavor: fromTop.flavor,
          count,
          score,
          route,
          reason,
        });
      }
    }

    // Sort moves descending by score
    candidateMoves.sort((a, b) => b.score - a.score);
    const bestMove = candidateMoves[0] || null;

    // Determine Stuck Probability
    let stuckProbability = 0;
    if (candidateMoves.length === 0) {
      stuckProbability = 1.0;
    } else if (emptyPlates === 0 && candidateMoves.length <= 1) {
      stuckProbability = 0.75;
    } else if (emptyPlates === 0 && candidateMoves.every((m) => m.route === 'clean_transfer')) {
      stuckProbability = 0.45;
    } else {
      stuckProbability = Math.max(0.05, 0.3 * boardEntropy);
    }

    // Determine Player Flow State
    let flowState: SystemOneFlowState = 'flow';
    if (candidateMoves.length === 0) {
      flowState = 'stuck';
    } else if (invalidTapsCount >= 3 || (idleSeconds > 18 && candidateMoves.length > 0)) {
      flowState = 'frustrated';
    } else if (idleSeconds > 8) {
      flowState = 'deliberating';
    } else {
      flowState = 'flow';
    }

    // Determine System One Routing Decision
    let recommendedRoute: SystemOneRoute = 'passive';
    let routeHeadline = 'Optimal Rhythm';
    let strategicAdvice = 'Smooth flow detected. Continue sorting at your natural pace.';

    if (candidateMoves.length === 0) {
      recommendedRoute = emptyPlates === 0 ? 'booster_extra_plate' : 'booster_whisk';
      routeHeadline = 'Deadlock Detected';
      strategicAdvice =
        emptyPlates === 0
          ? 'Counter is packed. Add an Extra Plate (+Plate) to create breathing room.'
          : 'No valid matches. Use Whisk to redistribute slices into playable stacks.';
    } else if (bestMove && bestMove.route === 'direct_merge' && bestMove.score >= 1000) {
      recommendedRoute = 'direct_merge';
      routeHeadline = 'Cake Ready to Bake!';
      strategicAdvice = bestMove.reason;
    } else if (stuckProbability > 0.65) {
      recommendedRoute = 'booster_extra_plate';
      routeHeadline = 'Congested Counter';
      strategicAdvice = 'Plates are tightly packed with few free slots. Clear a plate or add +Plate.';
    } else if (bestMove && bestMove.route === 'unblock_plate') {
      recommendedRoute = 'unblock_plate';
      routeHeadline = 'Uncover Buried Flavors';
      strategicAdvice = bestMove.reason;
    } else if (bestMove) {
      recommendedRoute = 'clean_transfer';
      routeHeadline = 'Consolidate Flavors';
      strategicAdvice = bestMove.reason;
    }

    // Booster Recommendation Logic
    let boosterRec: TypeSafeEvaluationResult['boosterRecommendation'] = {
      type: null,
      urgency: 'none',
      justification: 'No booster required.',
    };

    if (candidateMoves.length === 0) {
      boosterRec = {
        type: emptyPlates === 0 ? 'extraPlate' : 'shuffle',
        urgency: 'critical',
        justification: 'Deadlock resolution required to continue gameplay.',
      };
    } else if (stuckProbability > 0.6 && emptyPlates === 0) {
      boosterRec = {
        type: 'extraPlate',
        urgency: 'medium',
        justification: 'Opening an additional plate significantly elevates move permutations.',
      };
    } else if (boardEntropy > 0.75 && candidateMoves.length <= 2) {
      boosterRec = {
        type: 'shuffle',
        urgency: 'low',
        justification: 'High entropy configuration. Whisk will group like slices.',
      };
    }

    // Confidence metric (0.7 to 0.99 for System One judgments)
    const confidence = candidateMoves.length === 0 ? 0.99 : Math.min(0.96, 0.72 + (bestMove?.score || 0) / 2000);

    const judgments: TypeSafeJudgment[] = [
      {
        label: 'Board Entropy',
        probability: Number(boardEntropy.toFixed(2)),
        rationale: `${mixedPlatesCount} of ${filledPlates} active plates contain mixed flavor layers.`,
      },
      {
        label: 'Stuck Likelihood',
        probability: Number(stuckProbability.toFixed(2)),
        rationale: `${candidateMoves.length} candidate moves available across ${emptyPlates} empty plates.`,
      },
      {
        label: 'Confidence Score',
        probability: Number(confidence.toFixed(2)),
        rationale: `System One model calibrated from heuristic move-tree projection.`,
      },
    ];

    return {
      confidence,
      stuckProbability,
      flowState,
      boardEntropy,
      recommendedRoute,
      routeHeadline,
      strategicAdvice,
      suggestedMove: bestMove
        ? {
            fromId: bestMove.fromId,
            toId: bestMove.toId,
            flavor: bestMove.flavor,
            slicesCount: bestMove.count,
            reason: bestMove.reason,
          }
        : null,
      boosterRecommendation: boosterRec,
      judgments,
    };
  }

  /**
   * Bakery Style & Aesthetic Evaluator
   * Analyzes player's active decorations and recommends harmonious palettes.
   */
  public static routeBakeryStyle(meta: BakeryMetaState): BakeryStyleRouting {
    const counter = meta.equippedCounter;
    const plate = meta.equippedPlate;

    if (counter === 'slate') {
      return {
        harmoniousCounter: 'Dark Slate Atelier',
        harmoniousPlate: plate === 'gold' ? 'Royal Gilding' : 'Mint Celadon',
        paletteTheme: 'Midnight Patisserie & Specular Glaze',
        designVerdict: 'High-contrast luxury presentation with deep chiaroscuro reflections.',
      };
    } else if (counter === 'marble') {
      return {
        harmoniousCounter: 'Carrara Marble Studio',
        harmoniousPlate: 'Porcelain White or Rose Quartz',
        paletteTheme: 'Viennese Grand Café',
        designVerdict: 'Bright museum-grade lighting with pristine specular porcelain sheen.',
      };
    } else if (counter === 'terrazzo') {
      return {
        harmoniousCounter: 'Milano Terrazzo',
        harmoniousPlate: 'Mint Celadon or Gold Rim',
        paletteTheme: 'Contemporary Artisan Bakery',
        designVerdict: 'Playful Mediterranean warmth with textured organic counter undertones.',
      };
    } else {
      return {
        harmoniousCounter: 'French Warm Oak',
        harmoniousPlate: 'Porcelain White',
        paletteTheme: 'Artisan Parisian Boulangerie',
        designVerdict: 'Classic warm ambient woods with soft golden bakery radiance.',
      };
    }
  }
}
