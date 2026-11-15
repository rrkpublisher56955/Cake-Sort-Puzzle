import './style.css';
import { sound } from './game/audio';
import {
  BOOSTER_INFO,
  CAKE_FLAVORS,
  DECOR_CATALOG,
  FLAVOR_ORDER,
  getBakeryRank,
} from './game/catalog';
import {
  applyWhiskShuffle,
  canMoveSlices,
  findHintMove,
  generateLevelBoard,
  getLevelConfig,
  getTopGroup,
  getValidTargetIds,
  hasAnyProductiveMove,
  isPlateCompleted,
} from './game/puzzle';
import { CakeScene3D } from './game/scene3d';
import { loadMeta, saveMeta } from './game/storage';
import {
  BakeryMetaState,
  BoosterType,
  CounterThemeId,
  DecorItem,
  FlavorId,
  LevelConfig,
  PlateData,
  PlateStyleId,
  PropDecorId,
} from './game/types';
import { TypeSafeEvaluationResult, TypeSafeSystemOne } from './game/typesafeAI';
import { ytPlayables } from './game/youtubePlayables';

class CakeSortApp {
  private meta: BakeryMetaState;
  private scene3d: CakeScene3D;

  private levelConfig!: LevelConfig;
  private plates: PlateData[] = [];
  private selectedPlateId: number | null = null;
  private cakesCompleted = 0;
  private comboCount = 0;
  private undoStack: PlateData[][] = [];
  private hintPair: { fromId: number; toId: number } | null = null;
  private activeDrawerTab: 'surfaces' | 'props' | 'recipes' | 'supplies' = 'surfaces';

  // TypeSafe AI state tracking
  private lastEvaluation: TypeSafeEvaluationResult | null = null;
  private lastMoveTimestamp = Date.now();
  private invalidTapsCount = 0;

  // DOM refs
  private hudLevel = document.getElementById('hud-level')!;
  private hudLevelTitle = document.getElementById('hud-level-title')!;
  private hudCoins = document.getElementById('hud-coins')!;
  private hudStars = document.getElementById('hud-stars')!;
  private hudCakesCount = document.getElementById('hud-cakes-count')!;
  private orderIcons = document.getElementById('order-icons')!;
  private orderProgressFill = document.getElementById('order-progress-fill')!;
  private bakeryBadgeIcon = document.getElementById('bakery-badge-icon')!;
  private bakeryRankLabel = document.getElementById('bakery-rank-label')!;
  private decorNotifyDot = document.getElementById('decor-notify-dot')!;
  private tutorialBanner = document.getElementById('tutorial-banner')!;
  private toastLayer = document.getElementById('toast-layer')!;

  private btnTypesafe = document.getElementById('btn-typesafe')!;
  private typesafeStatusLabel = document.getElementById('typesafe-status-label')!;
  private modalTypesafe = document.getElementById('modal-typesafe')!;

  private btnYtSuite = document.getElementById('btn-yt-suite')!;
  private modalYtSuite = document.getElementById('modal-yt-suite')!;
  private ytTestList = document.getElementById('yt-test-list')!;

  private modalWin = document.getElementById('modal-win')!;
  private modalStuck = document.getElementById('modal-stuck')!;
  private modalBakery = document.getElementById('modal-bakery')!;
  private drawerContent = document.getElementById('drawer-content')!;

  constructor() {
    this.meta = loadMeta();
    const ytAudio = ytPlayables.isAudioEnabled();
    this.meta.soundEnabled = this.meta.soundEnabled && ytAudio;
    sound.enabled = this.meta.soundEnabled;

    ytPlayables.onAudioEnabledChange((enabled) => {
      this.meta.soundEnabled = enabled;
      sound.enabled = enabled;
      const soundBtn = document.getElementById('btn-sound');
      if (soundBtn) soundBtn.textContent = enabled ? '🔊' : '🔇';
      saveMeta(this.meta);
    });

    ytPlayables.onPause(() => {
      saveMeta(this.meta);
      sound.pauseAll();
    });

    ytPlayables.onResume(() => {
      sound.resumeAll();
    });

    const wrap = document.getElementById('canvas-wrap')!;
    this.scene3d = new CakeScene3D(wrap, (plateId) => this.handlePlateTap(plateId));
    this.scene3d.applyDecorTheme(
      this.meta.equippedCounter,
      this.meta.equippedPlate,
      this.meta.activeProps
    );

    this.bindUI();
    this.startLevel(this.meta.currentLevel);
    this.updateMetaUI();

    // Signal gameReady() to YouTube Playables SDK
    ytPlayables.emitGameReady();
  }

  private bindUI() {
    document.getElementById('btn-hint')!.addEventListener('click', () => this.showHint());
    document.getElementById('btn-restart')!.addEventListener('click', () => {
      if (this.scene3d.busy) return;
      this.startLevel(this.meta.currentLevel);
      this.showToast('Fresh plates ready!');
    });

    const soundBtn = document.getElementById('btn-sound')!;
    soundBtn.textContent = this.meta.soundEnabled ? '🔊' : '🔇';
    soundBtn.addEventListener('click', () => {
      this.meta.soundEnabled = !this.meta.soundEnabled;
      sound.enabled = this.meta.soundEnabled;
      soundBtn.textContent = this.meta.soundEnabled ? '🔊' : '🔇';
      saveMeta(this.meta);
    });

    // Booster buttons
    document.querySelectorAll<HTMLButtonElement>('.booster-btn[data-booster]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.booster as BoosterType;
        this.useBooster(type);
      });
    });

    // Bakery Drawer triggers
    const openBakery = (tab?: 'surfaces' | 'props' | 'recipes' | 'supplies') => {
      if (tab) this.activeDrawerTab = tab;
      this.openBakeryDrawer();
    };
    document.getElementById('btn-bakery')!.addEventListener('click', () => openBakery('surfaces'));
    document.getElementById('btn-open-decor')!.addEventListener('click', () => openBakery('surfaces'));
    document.getElementById('btn-coin-shop')!.addEventListener('click', () => openBakery('supplies'));
    document.getElementById('btn-close-bakery')!.addEventListener('click', () => {
      this.modalBakery.classList.add('hidden');
    });
    this.modalBakery.addEventListener('click', (e) => {
      if (e.target === this.modalBakery) this.modalBakery.classList.add('hidden');
    });

    document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.activeDrawerTab = tab.dataset.tab as typeof this.activeDrawerTab;
        this.renderBakeryDrawer();
      });
    });

    // Win modal buttons
    document.getElementById('btn-next-level')!.addEventListener('click', () => {
      this.modalWin.classList.add('hidden');
      this.startLevel(this.meta.currentLevel);
    });
    document.getElementById('btn-win-decor')!.addEventListener('click', () => {
      this.modalWin.classList.add('hidden');
      this.startLevel(this.meta.currentLevel);
      this.openBakeryDrawer();
    });

    // Stuck modal buttons
    document.getElementById('btn-stuck-plate')!.addEventListener('click', () => {
      this.modalStuck.classList.add('hidden');
      this.useBooster('extraPlate');
    });
    document.getElementById('btn-stuck-whisk')!.addEventListener('click', () => {
      this.modalStuck.classList.add('hidden');
      this.useBooster('shuffle');
    });
    document.getElementById('btn-stuck-undo')!.addEventListener('click', () => {
      this.modalStuck.classList.add('hidden');
      this.useBooster('undo');
    });
    document.getElementById('btn-stuck-retry')!.addEventListener('click', () => {
      this.modalStuck.classList.add('hidden');
      this.startLevel(this.meta.currentLevel);
    });

    // TypeSafe AI Modal Handlers
    this.btnTypesafe.addEventListener('click', () => this.openTypeSafeModal());
    document.getElementById('btn-close-typesafe')!.addEventListener('click', () => {
      this.modalTypesafe.classList.add('hidden');
    });
    document.getElementById('btn-apply-typesafe-hint')!.addEventListener('click', () => {
      this.modalTypesafe.classList.add('hidden');
      this.applyTypeSafeRoute();
    });

    // YouTube Playables Test Suite Handlers
    this.btnYtSuite.addEventListener('click', () => this.openYouTubeSuite());
    document.getElementById('btn-close-yt-suite')!.addEventListener('click', () => {
      this.modalYtSuite.classList.add('hidden');
    });
    document.getElementById('btn-close-yt-done')!.addEventListener('click', () => {
      this.modalYtSuite.classList.add('hidden');
    });
    document.getElementById('btn-rerun-yt-suite')!.addEventListener('click', () => {
      this.runYtPlayablesTests();
    });

    // Viewport Simulator Ratio buttons
    document.querySelectorAll<HTMLButtonElement>('.ratio-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ratio-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const ratio = btn.dataset.ratio;
        const app = document.getElementById('app')!;
        app.classList.remove('sim-portrait', 'sim-landscape');
        if (ratio === 'portrait') app.classList.add('sim-portrait');
        else if (ratio === 'landscape') app.classList.add('sim-landscape');
        window.dispatchEvent(new Event('resize'));
      });
    });
  }

  private startLevel(levelNum: number) {
    this.levelConfig = getLevelConfig(levelNum);
    this.plates = generateLevelBoard(this.levelConfig);
    this.selectedPlateId = null;
    this.cakesCompleted = 0;
    this.comboCount = 0;
    this.undoStack = [];
    this.hintPair = null;
    this.lastMoveTimestamp = Date.now();
    this.invalidTapsCount = 0;

    if (levelNum === 1) {
      this.hintPair = findHintMove(this.plates);
      this.tutorialBanner.classList.remove('hidden');
    } else {
      this.tutorialBanner.classList.add('hidden');
    }

    this.scene3d.syncBoard(this.plates, true);
    this.scene3d.setSelection(null, [], this.hintPair);
    this.updateLevelUI();
    this.updateBoosterUI();
    this.runTypeSafeEvaluation();
  }

  private runTypeSafeEvaluation() {
    const idleSec = (Date.now() - this.lastMoveTimestamp) / 1000;
    this.lastEvaluation = TypeSafeSystemOne.evaluateBoard(
      this.plates,
      idleSec,
      this.invalidTapsCount
    );

    // Update Top HUD TypeSafe Chip
    const evalResult = this.lastEvaluation;
    if (evalResult.suggestedMove) {
      this.typesafeStatusLabel.textContent = evalResult.routeHeadline;
    } else if (evalResult.stuckProbability > 0.6) {
      this.typesafeStatusLabel.textContent = 'Deadlock Alert';
    } else {
      this.typesafeStatusLabel.textContent = 'Optimal Rhythm';
    }
  }

  private openTypeSafeModal() {
    this.runTypeSafeEvaluation();
    const res = this.lastEvaluation;
    if (!res) return;

    document.getElementById('typesafe-route-badge')!.textContent = res.recommendedRoute.toUpperCase().replace('_', ' ');
    document.getElementById('typesafe-route-heading')!.textContent = res.routeHeadline;
    document.getElementById('typesafe-route-desc')!.textContent = res.strategicAdvice;

    document.getElementById('metric-entropy')!.textContent = res.boardEntropy.toFixed(2);
    document.getElementById('metric-stuck')!.textContent = `${Math.round(res.stuckProbability * 100)}%`;
    document.getElementById('metric-confidence')!.textContent = `${Math.round(res.confidence * 100)}%`;
    document.getElementById('metric-flow')!.textContent = res.flowState.toUpperCase();

    const list = document.getElementById('typesafe-judgments-list')!;
    list.innerHTML = '';
    res.judgments.forEach((j) => {
      const item = document.createElement('div');
      item.className = 'judgment-item';
      item.innerHTML = `
        <div>
          <b>${j.label}</b>
          <div style="font-size:10px;color:var(--apple-muted);">${j.rationale}</div>
        </div>
        <div style="font-weight:700;color:var(--apple-blue);">${Math.round(j.probability * 100)}%</div>
      `;
      list.appendChild(item);
    });

    this.modalTypesafe.classList.remove('hidden');
  }

  private applyTypeSafeRoute() {
    if (!this.lastEvaluation || !this.lastEvaluation.suggestedMove) {
      this.showToast('No active transfer route needed!');
      return;
    }
    const move = this.lastEvaluation.suggestedMove;
    this.hintPair = { fromId: move.fromId, toId: move.toId };
    this.selectedPlateId = move.fromId;
    const validTargets = getValidTargetIds(this.plates, move.fromId);
    this.scene3d.setSelection(move.fromId, validTargets, this.hintPair);
    sound.selectPlate();
    this.showToast(`TypeSafe Route: Plate #${move.fromId} ➜ Plate #${move.toId}`);
  }

  private openYouTubeSuite() {
    this.modalYtSuite.classList.remove('hidden');
    this.runYtPlayablesTests();
  }

  private async runYtPlayablesTests() {
    this.ytTestList.innerHTML = '<div class="test-loading">Executing YouTube Playables compliance audit...</div>';
    const report = await ytPlayables.runComplianceTestSuite();

    this.ytTestList.innerHTML = '';
    report.forEach((t) => {
      const item = document.createElement('div');
      item.className = 'test-item';
      item.innerHTML = `
        <span class="test-status-pill ${t.status}">${t.status}</span>
        <div class="test-body">
          <div class="test-name">${t.name}</div>
          <div class="test-desc">${t.description}</div>
          <div style="font-size:10px;color:var(--apple-blue);margin-top:2px;">${t.detail}</div>
        </div>
      `;
      this.ytTestList.appendChild(item);
    });
  }

  private handlePlateTap(plateId: number) {
    if (this.scene3d.busy) return;
    this.lastMoveTimestamp = Date.now();
    const tapped = this.plates.find((p) => p.id === plateId);
    if (!tapped) return;

    // 1. No plate currently selected -> try selecting tapped plate
    if (this.selectedPlateId === null) {
      if (tapped.slices.length === 0) {
        this.scene3d.triggerInvalidShake(plateId);
        sound.invalidTap();
        this.invalidTapsCount++;
        this.runTypeSafeEvaluation();
        return;
      }
      this.selectedPlateId = plateId;
      const validTargets = getValidTargetIds(this.plates, plateId);
      sound.selectPlate();
      this.scene3d.setSelection(plateId, validTargets, this.hintPair);
      return;
    }

    // 2. Tapping the already selected plate -> deselect
    if (this.selectedPlateId === plateId) {
      this.selectedPlateId = null;
      sound.deselectPlate();
      this.scene3d.setSelection(null, [], this.hintPair);
      return;
    }

    // 3. Attempt to move top slices from selectedPlate -> tapped
    const source = this.plates.find((p) => p.id === this.selectedPlateId)!;
    const movableCount = canMoveSlices(source, tapped);

    if (movableCount <= 0) {
      this.scene3d.triggerInvalidShake(plateId);
      sound.invalidTap();
      this.invalidTapsCount++;
      this.showToast('Match the raised flavor or tap an empty plate!');
      this.runTypeSafeEvaluation();
      return;
    }

    // Valid move! Save snapshot for Undo
    this.undoStack.push(this.plates.map((p) => ({ ...p, slices: [...p.slices] })));
    if (this.undoStack.length > 20) this.undoStack.shift();

    const topGroup = getTopGroup(source)!;
    const fromStartSlot = source.slices.length - movableCount;
    const toStartSlot = tapped.slices.length;

    // Mutate data model
    for (let i = 0; i < movableCount; i++) {
      source.slices.pop();
      tapped.slices.push(topGroup.flavor);
    }

    this.selectedPlateId = null;
    this.hintPair = null;
    this.invalidTapsCount = 0;
    if (this.levelConfig.level === 1 && this.undoStack.length >= 2) {
      this.tutorialBanner.classList.add('hidden');
    }
    this.scene3d.setSelection(null, [], null);
    sound.sliceMove(movableCount);

    this.scene3d.animateSliceMove(
      source.id,
      tapped.id,
      topGroup.flavor,
      movableCount,
      fromStartSlot,
      toStartSlot,
      () => {
        this.scene3d.syncBoard(this.plates, false);
        this.checkPlateCompletion(tapped);
        this.runTypeSafeEvaluation();
      }
    );
  }

  private checkPlateCompletion(plate: PlateData) {
    if (isPlateCompleted(plate)) {
      const completedFlavor = plate.slices[0];
      this.comboCount++;
      sound.cakeMerge(this.comboCount);

      this.scene3d.animateCakeMerge(plate.id, completedFlavor, () => {
        // Clear plate & award cake
        plate.slices = [];
        this.cakesCompleted++;
        this.undoStack = []; // prevent coin-farming undo after merge

        const flavorSpec = CAKE_FLAVORS[completedFlavor];
        const comboBonus = this.comboCount > 1 ? (this.comboCount - 1) * 5 : 0;
        const earned = flavorSpec.sellCoins + comboBonus;

        this.meta.coins += earned;
        this.meta.totalCakesBaked++;
        this.meta.cakesBakedByFlavor[completedFlavor] =
          (this.meta.cakesBakedByFlavor[completedFlavor] ?? 0) + 1;
        saveMeta(this.meta);
        ytPlayables.sendScore(this.meta.totalCakesBaked).catch(() => {});

        const comboTag = this.comboCount > 1 ? ` • Combo x${this.comboCount}!` : '';
        this.showToast(`${flavorSpec.shortName} Cake Baked! +${earned} 🪙${comboTag}`, true);

        this.scene3d.syncBoard(this.plates, false);
        this.updateLevelUI();
        this.updateMetaUI();
        this.runTypeSafeEvaluation();

        if (this.cakesCompleted >= this.levelConfig.targetCakes) {
          this.handleLevelWin();
        } else {
          this.checkStuckState();
        }
      });
    } else {
      this.comboCount = 0;
      this.checkStuckState();
      this.runTypeSafeEvaluation();
    }
  }

  private checkStuckState() {
    if (this.cakesCompleted >= this.levelConfig.targetCakes) return;
    if (!hasAnyProductiveMove(this.plates)) {
      this.modalStuck.classList.remove('hidden');
    }
  }

  private handleLevelWin() {
    sound.levelWin();
    const { rewardCoins, rewardStars, level } = this.levelConfig;
    const prevLevel = this.meta.currentLevel;

    this.meta.coins += rewardCoins;
    this.meta.stars += rewardStars;
    this.meta.currentLevel = prevLevel + 1;
    if (level % 2 === 0) {
      this.meta.boosters.undo += 1;
    }
    if (level % 3 === 0) {
      this.meta.boosters.shuffle += 1;
    }
    saveMeta(this.meta);
    this.updateMetaUI();

    // YouTube Playables score reporting & natural break interstitial ad
    ytPlayables.sendScore(this.meta.totalCakesBaked).catch(() => {});
    ytPlayables.requestInterstitialAd().catch(() => {});

    document.getElementById('win-heading')!.textContent =
      level % 5 === 0 ? 'Chef’s Special Served!' : 'Delicious Work!';
    document.getElementById('win-subtitle')!.textContent = `Level ${level} • ${this.levelConfig.title} Complete`;
    document.getElementById('win-coins')!.textContent = String(rewardCoins);
    document.getElementById('win-stars')!.textContent = String(rewardStars);

    const newlyUnlocked = FLAVOR_ORDER.find(
      (f) => CAKE_FLAVORS[f].unlockLevel === this.meta.currentLevel
    );
    const callout = document.getElementById('unlock-callout')!;
    if (newlyUnlocked) {
      callout.textContent = `🎉 New Recipe Unlocked: ${CAKE_FLAVORS[newlyUnlocked].name}!`;
      callout.classList.remove('hidden');
    } else {
      callout.classList.add('hidden');
    }

    this.modalWin.classList.remove('hidden');
  }

  private showHint() {
    if (this.scene3d.busy) return;
    this.runTypeSafeEvaluation();
    const hint = this.lastEvaluation?.suggestedMove || findHintMove(this.plates);
    if (!hint) {
      this.showToast('No moves found — try +Plate or Whisk!');
      sound.invalidTap();
      return;
    }
    this.hintPair = { fromId: hint.fromId, toId: hint.toId };
    this.selectedPlateId = hint.fromId;
    const validTargets = getValidTargetIds(this.plates, hint.fromId);
    this.scene3d.setSelection(hint.fromId, validTargets, this.hintPair);
    sound.selectPlate();
    this.showToast('Follow the Action Blue ring!');
  }

  private useBooster(type: BoosterType) {
    if (this.scene3d.busy) return;
    const info = BOOSTER_INFO[type];
    const count = this.meta.boosters[type];

    if (type === 'undo' && this.undoStack.length === 0) {
      this.showToast('Nothing to undo right now!');
      sound.invalidTap();
      return;
    }
    if (type === 'extraPlate' && this.plates.filter((p) => p.isExtra).length >= 2) {
      this.showToast('Maximum bonus plates on counter!');
      sound.invalidTap();
      return;
    }

    if (count > 0) {
      this.meta.boosters[type]--;
    } else if (this.meta.coins >= info.cost) {
      this.meta.coins -= info.cost;
    } else {
      this.showToast(`Need ${info.cost} 🪙 for ${info.name}!`);
      sound.invalidTap();
      return;
    }

    sound.boosterUse();
    this.selectedPlateId = null;
    this.hintPair = null;

    if (type === 'undo') {
      const prev = this.undoStack.pop()!;
      this.plates = prev;
      this.scene3d.syncBoard(this.plates, false);
      this.scene3d.setSelection(null, [], null);
      this.showToast('Move undone!');
    } else if (type === 'extraPlate') {
      const nextId = Math.max(...this.plates.map((p) => p.id), 0) + 1;
      this.plates.push({ id: nextId, slices: [], isExtra: true });
      this.scene3d.syncBoard(this.plates, true);
      this.scene3d.setSelection(null, [], null);
      this.showToast('Bonus plate added! 🍽️');
    } else if (type === 'shuffle') {
      this.undoStack = [];
      this.plates = applyWhiskShuffle(this.plates);
      this.scene3d.syncBoard(this.plates, true);
      this.scene3d.setSelection(null, [], null);
      this.showToast('Whisked into tidy groups! 🪄');
    } else if (type === 'autoBake') {
      this.performAutoCake();
    }

    saveMeta(this.meta);
    this.updateMetaUI();

    // YouTube Playables score reporting & natural break interstitial ad
    ytPlayables.sendScore(this.meta.totalCakesBaked).catch(() => {});
    ytPlayables.requestInterstitialAd().catch(() => {});
    this.updateBoosterUI();
    this.runTypeSafeEvaluation();
  }

  private performAutoCake() {
    const flavorCount = new Map<FlavorId, number>();
    for (const p of this.plates) {
      for (const s of p.slices) {
        flavorCount.set(s, (flavorCount.get(s) ?? 0) + 1);
      }
    }
    const candidates = Array.from(flavorCount.entries()).filter(([, c]) => c >= 6);
    if (candidates.length === 0) return;

    const targetFlavor = candidates[0][0];
    let targetPlate = this.plates.find((p) => p.slices.length === 0);
    if (!targetPlate) {
      targetPlate = this.plates.reduce((best, cur) => {
        const bCount = best.slices.filter((s) => s === targetFlavor).length;
        const cCount = cur.slices.filter((s) => s === targetFlavor).length;
        return cCount > bCount ? cur : best;
      });
    }

    const displaced: FlavorId[] = targetPlate.slices.filter((s) => s !== targetFlavor);
    let needed = 6;
    targetPlate.slices = [];

    const remainingPool: FlavorId[] = [];
    let removed = 0;
    for (const p of this.plates) {
      const kept: FlavorId[] = [];
      for (const s of p.slices) {
        if (s === targetFlavor && removed < needed) {
          removed++;
        } else {
          if (p.id === targetPlate.id) remainingPool.push(s);
          else kept.push(s);
        }
      }
      p.slices = kept;
    }
    void displaced;
    for (const d of remainingPool) {
      const slot = this.plates.find((p) => p.id !== targetPlate!.id && p.slices.length < 6);
      if (slot) slot.slices.push(d);
    }

    targetPlate.slices = Array(6).fill(targetFlavor);
    this.undoStack = [];
    this.scene3d.syncBoard(this.plates, false);
    this.checkPlateCompletion(targetPlate);
  }

  private updateLevelUI() {
    this.hudLevel.textContent = `LEVEL ${this.levelConfig.level}`;
    this.hudLevelTitle.textContent = this.levelConfig.title;
    this.hudCakesCount.textContent = `${this.cakesCompleted}/${this.levelConfig.targetCakes}`;
    const pct = Math.min(100, (this.cakesCompleted / this.levelConfig.targetCakes) * 100);
    this.orderProgressFill.style.width = `${pct}%`;

    this.orderIcons.innerHTML = '';
    for (let i = 0; i < this.levelConfig.targetCakes; i++) {
      const span = document.createElement('span');
      span.className = `order-flv-chip ${i < this.cakesCompleted ? 'done' : ''}`;
      span.textContent = '🍰';
      this.orderIcons.appendChild(span);
    }
  }

  private updateMetaUI() {
    this.hudCoins.textContent = String(this.meta.coins);
    this.hudStars.textContent = String(this.meta.stars);

    const { current } = getBakeryRank(this.meta.stars);
    this.bakeryBadgeIcon.textContent = current.badge;
    this.bakeryRankLabel.textContent = current.title;

    const today = new Date().toISOString().slice(0, 10);
    const canClaimDaily = this.meta.dailyClaimedDate !== today;
    const canBuyDecor = DECOR_CATALOG.some(
      (d) =>
        !this.meta.ownedDecor.includes(d.id) &&
        d.cost <= this.meta.coins &&
        d.unlockBakeryLevel <= current.level
    );
    this.decorNotifyDot.classList.toggle('hidden', !canClaimDaily && !canBuyDecor);
    this.updateBoosterUI();
  }

  private updateBoosterUI() {
    (['undo', 'extraPlate', 'shuffle', 'autoBake'] as BoosterType[]).forEach((type) => {
      const badge = document.getElementById(`badge-${type}`)!;
      const btn = document.getElementById(`boost-${type}`)!;
      const count = this.meta.boosters[type];
      const cost = BOOSTER_INFO[type].cost;

      if (count > 0) {
        badge.textContent = String(count);
        badge.classList.remove('coin-cost');
        btn.classList.remove('disabled');
      } else {
        badge.textContent = `${cost}🪙`;
        badge.classList.add('coin-cost');
        btn.classList.toggle('disabled', this.meta.coins < cost);
      }
    });
  }

  private openBakeryDrawer() {
    this.modalBakery.classList.remove('hidden');
    this.renderBakeryDrawer();
  }

  private renderBakeryDrawer() {
    const { current, next } = getBakeryRank(this.meta.stars);
    document.getElementById('drawer-rank-icon')!.textContent = current.badge;
    document.getElementById('drawer-rank-name')!.textContent = current.title;
    document.getElementById('drawer-coins')!.textContent = String(this.meta.coins);

    const starsText = next
      ? `${this.meta.stars} / ${next.starsRequired} ⭐ to ${next.title}`
      : `${this.meta.stars} ⭐ • Max Rank!`;
    document.getElementById('drawer-stars-text')!.textContent = starsText;
    const progress = next
      ? ((this.meta.stars - current.starsRequired) / (next.starsRequired - current.starsRequired)) * 100
      : 100;
    (document.getElementById('drawer-rank-fill') as HTMLElement).style.width = `${Math.max(
      8,
      Math.min(100, progress)
    )}%`;

    document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === this.activeDrawerTab);
    });

    this.drawerContent.innerHTML = '';

    if (this.activeDrawerTab === 'surfaces') {
      this.renderDecorSection('Countertops (Live 3D Preview)', 'counter', current.level);
      this.renderDecorSection('Plate Collections', 'plate', current.level);
    } else if (this.activeDrawerTab === 'props') {
      this.renderDecorSection('Countertop Props (Displayed in 3D Scene)', 'prop', current.level);
    } else if (this.activeDrawerTab === 'recipes') {
      this.renderRecipeBook();
    } else {
      this.renderSuppliesShop();
    }
  }

  private renderDecorSection(
    heading: string,
    category: 'counter' | 'plate' | 'prop',
    bakeryLevel: number
  ) {
    const label = document.createElement('div');
    label.style.cssText = 'font-size:12px;font-weight:700;color:var(--apple-muted);text-transform:uppercase;letter-spacing:0.04em;margin:12px 0 8px;';
    label.textContent = heading;
    this.drawerContent.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'decor-grid';

    for (const item of DECOR_CATALOG.filter((d) => d.category === category)) {
      const owned = this.meta.ownedDecor.includes(item.id);
      const locked = bakeryLevel < item.unlockBakeryLevel && !owned;
      const isEquipped = this.isDecorEquipped(item);

      const card = document.createElement('div');
      card.className = `decor-card ${isEquipped ? 'equipped' : ''}`;

      card.innerHTML = `
        <div class="decor-icon-badge">${item.icon}</div>
        <div class="decor-name">${item.name}</div>
        <div class="decor-desc">${item.description}</div>
      `;

      const btn = document.createElement('button');
      btn.className = 'decor-btn';
      if (locked) {
        btn.classList.add('btn-buy');
        btn.textContent = `🔒 Rank ${item.unlockBakeryLevel}`;
      } else if (!owned) {
        btn.classList.add('btn-buy');
        btn.textContent = `Buy • ${item.cost} 🪙`;
        btn.addEventListener('click', () => this.buyOrToggleDecor(item));
      } else if (category === 'prop') {
        btn.classList.add(isEquipped ? 'btn-equipped' : 'btn-equip');
        btn.textContent = isEquipped ? '✓ Placed' : '+ Place';
        btn.addEventListener('click', () => this.buyOrToggleDecor(item));
      } else {
        btn.classList.add(isEquipped ? 'btn-equipped' : 'btn-equip');
        btn.textContent = isEquipped ? '✓ Equipped' : 'Equip';
        btn.addEventListener('click', () => this.buyOrToggleDecor(item));
      }

      card.appendChild(btn);
      grid.appendChild(card);
    }

    this.drawerContent.appendChild(grid);
  }

  private isDecorEquipped(item: DecorItem): boolean {
    const [cat, slug] = item.id.split(':');
    if (cat === 'counter') return this.meta.equippedCounter === slug;
    if (cat === 'plate') return this.meta.equippedPlate === slug;
    if (cat === 'prop') return this.meta.activeProps.includes(slug as PropDecorId);
    return false;
  }

  private buyOrToggleDecor(item: DecorItem) {
    const owned = this.meta.ownedDecor.includes(item.id);
    if (!owned) {
      if (this.meta.coins < item.cost) {
        this.showToast(`Need ${item.cost} 🪙 — bake more cakes!`);
        sound.invalidTap();
        return;
      }
      this.meta.coins -= item.cost;
      this.meta.ownedDecor.push(item.id);
      sound.coinClink();
      this.showToast(`Unlocked ${item.name}!`, true);
    } else {
      sound.selectPlate();
    }

    const [cat, slug] = item.id.split(':');
    if (cat === 'counter') this.meta.equippedCounter = slug as CounterThemeId;
    else if (cat === 'plate') this.meta.equippedPlate = slug as PlateStyleId;
    else if (cat === 'prop') {
      const pId = slug as PropDecorId;
      if (!owned) {
        if (!this.meta.activeProps.includes(pId)) this.meta.activeProps.push(pId);
      } else {
        const idx = this.meta.activeProps.indexOf(pId);
        if (idx >= 0) this.meta.activeProps.splice(idx, 1);
        else this.meta.activeProps.push(pId);
      }
    }

    saveMeta(this.meta);
    this.scene3d.applyDecorTheme(
      this.meta.equippedCounter,
      this.meta.equippedPlate,
      this.meta.activeProps
    );
    this.updateMetaUI();
    this.renderBakeryDrawer();
  }

  private renderRecipeBook() {
    const label = document.createElement('div');
    label.style.cssText = 'font-size:12px;font-weight:700;color:var(--apple-muted);text-transform:uppercase;letter-spacing:0.04em;margin:12px 0 8px;';
    label.textContent = `Signature Cakes (${this.meta.totalCakesBaked} Total Baked)`;
    this.drawerContent.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'decor-grid';

    for (const fId of FLAVOR_ORDER) {
      const spec = CAKE_FLAVORS[fId];
      const unlocked = this.meta.currentLevel >= spec.unlockLevel;
      const baked = this.meta.cakesBakedByFlavor[fId] ?? 0;

      const card = document.createElement('div');
      card.className = `decor-card ${unlocked ? 'equipped' : ''}`;
      card.innerHTML = `
        <div class="decor-icon-badge">🍰</div>
        <div class="decor-name">${spec.name}</div>
        <div class="decor-desc">${spec.description}</div>
        <div style="font-size:11px;font-weight:700;color:var(--apple-blue);">
          ${unlocked ? `Baked: ${baked} cakes • ${spec.sellCoins}🪙` : `🔒 Unlocks at Level ${spec.unlockLevel}`}
        </div>
      `;
      grid.appendChild(card);
    }

    this.drawerContent.appendChild(grid);
  }

  private renderSuppliesShop() {
    const today = new Date().toISOString().slice(0, 10);
    const claimed = this.meta.dailyClaimedDate === today;

    const daily = document.createElement('div');
    daily.style.cssText = 'background:#ffffff;border:1px solid var(--apple-hairline);border-radius:18px;padding:16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;';
    daily.innerHTML = `
      <div>
        <h3 style="margin:0 0 4px;font-size:15px;font-weight:700;">🎁 Daily Patisserie Bonus</h3>
        <p style="margin:0;font-size:12px;color:var(--apple-muted);">+75 Coins & +1 Whisk Booster</p>
      </div>
    `;
    const claimBtn = document.createElement('button');
    claimBtn.className = claimed ? 'btn-secondary' : 'btn-primary';
    claimBtn.style.cssText = 'flex:0 0 auto;padding:8px 16px;font-size:12px;';
    claimBtn.textContent = claimed ? '✓ Claimed' : 'Claim';
    if (!claimed) {
      claimBtn.addEventListener('click', () => {
        this.meta.dailyClaimedDate = today;
        this.meta.coins += 75;
        this.meta.boosters.shuffle += 1;
        saveMeta(this.meta);
        sound.coinClink();
        this.showToast('+75 🪙 & +1 Whisk claimed!', true);
        this.updateMetaUI();
        this.renderBakeryDrawer();
      });
    }
    daily.appendChild(claimBtn);
    this.drawerContent.appendChild(daily);

    // YouTube Playables Rewarded Ad: Sponsor Patisserie Bonus
    const rewarded = document.createElement('div');
    rewarded.style.cssText = 'background:#ffffff;border:1px solid var(--apple-hairline);border-radius:18px;padding:16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;';
    rewarded.innerHTML = `
      <div>
        <h3 style="margin:0 0 4px;font-size:15px;font-weight:700;">🎬 Sponsor Bonus</h3>
        <p style="margin:0;font-size:12px;color:var(--apple-muted);">Watch a short clip: <b>+100 Coins</b> & <b>+1 Whisk</b></p>
      </div>
    `;
    const watchBtn = document.createElement('button');
    watchBtn.className = 'btn-primary';
    watchBtn.style.cssText = 'flex:0 0 auto;padding:8px 16px;font-size:12px;background:var(--apple-purple);';
    watchBtn.textContent = 'Watch Ad';
    watchBtn.addEventListener('click', async () => {
      const earned = await ytPlayables.requestRewardedAd('patisserie-bonus-100-coins');
      if (earned) {
        this.meta.coins += 100;
        this.meta.boosters.shuffle += 1;
        saveMeta(this.meta);
        sound.coinClink();
        this.showToast('+100 🪙 & +1 Whisk received!', true);
        this.updateMetaUI();
        this.renderBakeryDrawer();
      } else {
        this.showToast('Reward ad closed or skipped.');
      }
    });
    rewarded.appendChild(watchBtn);
    this.drawerContent.appendChild(rewarded);

    const label = document.createElement('div');
    label.style.cssText = 'font-size:12px;font-weight:700;color:var(--apple-muted);text-transform:uppercase;letter-spacing:0.04em;margin:12px 0 8px;';
    label.textContent = 'Stock Up on Boosters';
    this.drawerContent.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'decor-grid';

    (['undo', 'extraPlate', 'shuffle', 'autoBake'] as BoosterType[]).forEach((bType) => {
      const info = BOOSTER_INFO[bType];
      const card = document.createElement('div');
      card.className = 'decor-card';
      card.innerHTML = `
        <div class="decor-icon-badge">${info.icon}</div>
        <div class="decor-name">${info.name}</div>
        <div class="decor-desc">${info.desc}</div>
      `;
      const btn = document.createElement('button');
      btn.className = 'decor-btn btn-buy';
      btn.textContent = `Buy 1 • ${info.cost} 🪙`;
      btn.addEventListener('click', () => {
        if (this.meta.coins < info.cost) {
          this.showToast(`Need ${info.cost} 🪙!`);
          sound.invalidTap();
          return;
        }
        this.meta.coins -= info.cost;
        this.meta.boosters[bType]++;
        saveMeta(this.meta);
        sound.coinClink();
        this.updateMetaUI();
        this.renderBakeryDrawer();
      });
      card.appendChild(btn);
      grid.appendChild(card);
    });

    this.drawerContent.appendChild(grid);
  }

  private showToast(text: string, celebrate = false) {
    const el = document.createElement('div');
    el.className = 'toast';
    if (celebrate) {
      el.style.background = 'rgba(0, 113, 227, 0.94)';
    }
    el.textContent = text;
    this.toastLayer.appendChild(el);
    setTimeout(() => el.remove(), 2100);
  }
}

new CakeSortApp();
