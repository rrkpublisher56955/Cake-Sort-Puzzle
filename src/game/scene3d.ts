import * as THREE from 'three';
import {
  createBakeryPropMesh,
  createCakeSliceMesh,
  createCounterTexture,
  createPlateMesh,
  createWholeCakeMesh,
} from './cakeMesh';
import { CAKE_FLAVORS } from './catalog';
import { getTopGroup } from './puzzle';
import { CounterThemeId, FlavorId, PlateData, PlateStyleId, PropDecorId } from './types';
import { ytPlayables } from './youtubePlayables';

interface PlateVisual {
  plateId: number;
  root: THREE.Group;
  plateBase: THREE.Group;
  ringMesh: THREE.Mesh;
  hitMesh: THREE.Mesh;
  sliceMeshes: THREE.Group[];
  wholeCake: THREE.Group | null;
  targetPos: THREE.Vector3;
  shakeTime: number;
  bounceTime: number;
  scaleSpring: { val: number; vel: number };
}

interface FlyingSliceAnim {
  mesh: THREE.Group;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startRotY: number;
  endRotY: number;
  delay: number;
  elapsed: number;
  duration: number;
  onArrive?: () => void;
  arrived: boolean;
}

interface ConfettiParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface MergeAnim {
  plateId: number;
  flavor: FlavorId;
  elapsed: number;
  phase: 'spin' | 'showcase' | 'flyout';
  wholeCake: THREE.Group | null;
  onComplete: () => void;
}

export class CakeScene3D {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private counterMesh!: THREE.Mesh;
  private counterRimMesh!: THREE.Mesh;
  private propsGroup = new THREE.Group();
  private platesGroup = new THREE.Group();
  private fxGroup = new THREE.Group();

  private plateVisuals = new Map<number, PlateVisual>();
  private flyingAnims: FlyingSliceAnim[] = [];
  private confetti: ConfettiParticle[] = [];
  private mergeAnims: MergeAnim[] = [];
  private ambientMotes: THREE.Mesh[] = [];

  private selectedPlateId: number | null = null;
  private validTargetIds = new Set<number>();
  private hintPair: { fromId: number; toId: number } | null = null;

  private currentCounterTheme: CounterThemeId = 'oak';
  private currentPlateStyle: PlateStyleId = 'porcelain';
  private currentProps: PropDecorId[] = [];
  private currentPlatesData: PlateData[] = [];

  // Parallax & Apple fluid spring camera interaction
  private pointerNorm = new THREE.Vector2(0, 0);
  private cameraParallax = new THREE.Vector2(0, 0);
  private baseCameraPos = new THREE.Vector3(0, 7.2, 7.8);
  private firstFrameFired = false;

  private clock = new THREE.Clock();
  private rafId = 0;
  private onPlateTap: (plateId: number) => void;
  private isBusyAnimating = false;

  private confettiGeo = new THREE.BoxGeometry(0.085, 0.085, 0.02);
  private ringGeo = new THREE.TorusGeometry(0.99, 0.045, 12, 64);

  constructor(container: HTMLElement, onPlateTap: (plateId: number) => void) {
    this.container = container;
    this.onPlateTap = onPlateTap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#fcf6f0');
    this.scene.fog = new THREE.Fog('#fcf6f0', 16, 32);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 70);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(w, h);
    // Retina / High-DPI support up to 2.5 for crisp 8K-like physical clarity
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupEnvironment();

    this.scene.add(this.propsGroup);
    this.scene.add(this.platesGroup);
    this.scene.add(this.fxGroup);

    this.updateCameraFraming(6);
    this.bindEvents();
    this.animate();
  }

  private setupLights() {
    // 1. Soft Warm Ambient Fill Light (Apple museum warmth)
    const hemi = new THREE.HemisphereLight('#fffaf4', '#ebd5c2', 1.25);
    this.scene.add(hemi);

    // 2. Studio Key Light with soft shadows
    const key = new THREE.DirectionalLight('#fff8f0', 1.85);
    key.position.set(4.8, 10.5, 6.0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 28;
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);

    // 3. Cool Accent Rim Light for mirror glaze icing specular highlights
    const rim = new THREE.DirectionalLight('#f0f4ff', 0.65);
    rim.position.set(-6.5, 6.0, -5.5);
    this.scene.add(rim);

    // 4. Subtle Front Tabletop Bounce Light
    const bounce = new THREE.PointLight('#ffe8d6', 0.5, 12);
    bounce.position.set(0, 1.2, 3.8);
    this.scene.add(bounce);
  }

  private setupEnvironment() {
    // Bakery counter tabletop
    const tex = createCounterTexture(this.currentCounterTheme);
    const counterGeo = new THREE.BoxGeometry(15.5, 0.75, 11.2);
    const counterMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.52,
      metalness: 0.04,
    });
    this.counterMesh = new THREE.Mesh(counterGeo, counterMat);
    this.counterMesh.position.set(0, -0.375, -0.3);
    this.counterMesh.receiveShadow = true;
    this.scene.add(this.counterMesh);

    // Front brushed brass/platinum trim
    const rimGeo = new THREE.BoxGeometry(15.6, 0.16, 0.22);
    const rimMat = new THREE.MeshStandardMaterial({
      color: '#e6c89c',
      roughness: 0.35,
      metalness: 0.45,
    });
    this.counterRimMesh = new THREE.Mesh(rimGeo, rimMat);
    this.counterRimMesh.position.set(0, -0.045, 5.25);
    this.scene.add(this.counterRimMesh);

    // Back café wall backdrop
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(18, 5.2, 0.45),
      new THREE.MeshStandardMaterial({ color: '#f7eee4', roughness: 0.92 })
    );
    backWall.position.set(0, 2.1, -5.6);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Ambient floating bakery sparkles / motes
    const moteGeo = new THREE.SphereGeometry(0.026, 8, 8);
    const moteMat = new THREE.MeshBasicMaterial({
      color: '#fff3db',
      transparent: true,
      opacity: 0.65,
    });
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(moteGeo, moteMat);
      m.position.set(
        (Math.random() - 0.5) * 11,
        0.4 + Math.random() * 3.5,
        (Math.random() - 0.5) * 7 - 0.5
      );
      m.userData = {
        baseY: m.position.y,
        baseX: m.position.x,
        speed: 0.35 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
      };
      this.scene.add(m);
      this.ambientMotes.push(m);
    }
  }

  public applyDecorTheme(
    counter: CounterThemeId,
    plateStyle: PlateStyleId,
    props: PropDecorId[]
  ) {
    if (counter !== this.currentCounterTheme) {
      this.currentCounterTheme = counter;
      const mat = this.counterMesh.material as THREE.MeshStandardMaterial;
      if (mat.map) mat.map.dispose();
      mat.map = createCounterTexture(counter);
      mat.roughness = counter === 'marble' || counter === 'slate' ? 0.28 : 0.55;
      mat.needsUpdate = true;

      const rimMat = this.counterRimMesh.material as THREE.MeshStandardMaterial;
      rimMat.color.set(
        counter === 'slate' ? '#d4af37' : counter === 'marble' ? '#d8d4cc' : '#e6c89c'
      );
      const bgHex = counter === 'slate' ? '#1c1f2b' : '#fcf6f0';
      this.scene.background = new THREE.Color(bgHex);
      this.scene.fog = new THREE.Fog(bgHex, 16, 32);
    }

    if (plateStyle !== this.currentPlateStyle) {
      this.currentPlateStyle = plateStyle;
      for (const pv of this.plateVisuals.values()) {
        const plateData = this.currentPlatesData.find((p) => p.id === pv.plateId);
        pv.root.remove(pv.plateBase);
        pv.plateBase = createPlateMesh(plateStyle, plateData?.isExtra);
        pv.root.add(pv.plateBase);
      }
    }

    this.currentProps = [...props];
    while (this.propsGroup.children.length > 0) {
      this.propsGroup.remove(this.propsGroup.children[0]);
    }

    const propPlacements: Record<PropDecorId, { pos: [number, number, number]; rotY: number }> = {
      macaron: { pos: [-3.6, 0, -3.7], rotY: 0.25 },
      tulips: { pos: [-1.55, 0, -3.9], rotY: -0.15 },
      teapot: { pos: [1.65, 0, -3.8], rotY: -0.35 },
      trophy: { pos: [3.65, 0, -3.7], rotY: -0.2 },
      lights: { pos: [0, 0.35, -4.6], rotY: 0 },
    };

    for (const pid of this.currentProps) {
      const mesh = createBakeryPropMesh(pid);
      const place = propPlacements[pid];
      mesh.position.set(...place.pos);
      mesh.rotation.y = place.rotY;
      this.propsGroup.add(mesh);
    }
  }

  private computePlatePositions(count: number): THREE.Vector3[] {
    let rows: number[];
    if (count <= 3) rows = [count];
    else if (count === 4) rows = [2, 2];
    else if (count === 5) rows = [3, 2];
    else if (count === 6) rows = [3, 3];
    else if (count === 7) rows = [4, 3];
    else if (count === 8) rows = [4, 4];
    else if (count === 9) rows = [3, 3, 3];
    else rows = [4, 4, count - 8];

    const spacingX = count >= 8 ? 2.18 : 2.32;
    const spacingZ = rows.length >= 3 ? 2.15 : 2.28;
    const totalH = (rows.length - 1) * spacingZ;
    const positions: THREE.Vector3[] = [];

    for (let r = 0; r < rows.length; r++) {
      const cols = rows[r];
      const totalW = (cols - 1) * spacingX;
      const z = -totalH / 2 + r * spacingZ + 0.12;
      for (let c = 0; c < cols; c++) {
        const x = -totalW / 2 + c * spacingX;
        positions.push(new THREE.Vector3(x, 0, z));
      }
    }
    return positions;
  }

  private updateCameraFraming(plateCount: number) {
    const aspect = this.camera.aspect;
    // Portrait (9:16 mobile) vs Landscape (16:9 desktop) camera adjustment
    const wideBoost = aspect < 0.75 ? 1.62 : aspect < 0.95 ? 1.4 : aspect < 1.2 ? 1.16 : 1.0;
    const extraDepth = plateCount >= 9 ? 1.8 : plateCount >= 7 ? 0.95 : 0;
    const dist = (7.5 + extraDepth) * wideBoost;
    const height = (7.1 + extraDepth * 0.75) * wideBoost;

    this.baseCameraPos.set(0, height, dist);
    this.camera.position.copy(this.baseCameraPos);
    this.camera.lookAt(0, 0.12, -0.32);
  }

  public syncBoard(plates: PlateData[], animateLayout = false) {
    this.currentPlatesData = plates.map((p) => ({ ...p, slices: [...p.slices] }));
    const positions = this.computePlatePositions(plates.length);
    this.updateCameraFraming(plates.length);

    const keepIds = new Set(plates.map((p) => p.id));
    for (const [id, pv] of this.plateVisuals.entries()) {
      if (!keepIds.has(id)) {
        this.platesGroup.remove(pv.root);
        this.plateVisuals.delete(id);
      }
    }

    plates.forEach((p, idx) => {
      let pv = this.plateVisuals.get(p.id);
      const targetPos = positions[idx];

      if (!pv) {
        const root = new THREE.Group();
        root.position.copy(targetPos);
        if (animateLayout) {
          root.scale.set(0.01, 0.01, 0.01);
        }

        const plateBase = createPlateMesh(this.currentPlateStyle, p.isExtra);
        root.add(plateBase);

        const ringMat = new THREE.MeshBasicMaterial({
          color: '#0071e3',
          transparent: true,
          opacity: 0,
        });
        const ringMesh = new THREE.Mesh(this.ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = 0.045;
        root.add(ringMesh);

        const hitMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(1.05, 1.05, 0.58, 24),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitMesh.position.y = 0.28;
        hitMesh.userData.plateId = p.id;
        root.add(hitMesh);

        this.platesGroup.add(root);
        pv = {
          plateId: p.id,
          root,
          plateBase,
          ringMesh,
          hitMesh,
          sliceMeshes: [],
          wholeCake: null,
          targetPos: targetPos.clone(),
          shakeTime: 0,
          bounceTime: animateLayout ? 0.35 : 0,
          scaleSpring: { val: animateLayout ? 0.01 : 1, vel: 0 },
        };
        this.plateVisuals.set(p.id, pv);
      } else {
        pv.targetPos.copy(targetPos);
        if (!animateLayout) {
          pv.root.position.copy(targetPos);
        }
      }

      this.rebuildPlateSlices(pv, p);
    });
  }

  private rebuildPlateSlices(pv: PlateVisual, plate: PlateData) {
    for (const sm of pv.sliceMeshes) {
      pv.root.remove(sm);
    }
    pv.sliceMeshes = [];

    const topGroup = getTopGroup(plate);
    const hasMultipleGroups = topGroup !== null && topGroup.count < plate.slices.length;
    const topStartIdx = topGroup ? plate.slices.length - topGroup.count : plate.slices.length;

    plate.slices.forEach((flavor, slotIdx) => {
      const mesh = createCakeSliceMesh(flavor);
      const angle = slotIdx * (Math.PI / 3);
      mesh.rotation.y = angle;
      const isTopSlice = slotIdx >= topStartIdx;
      const baseY = isTopSlice && hasMultipleGroups ? 0.12 : 0.065;
      mesh.position.y = baseY;
      mesh.userData = { slotIdx, isTopSlice, baseY };
      pv.root.add(mesh);
      pv.sliceMeshes.push(mesh);
    });
  }

  public setSelection(
    selectedId: number | null,
    validTargets: number[],
    hint: { fromId: number; toId: number } | null = null
  ) {
    this.selectedPlateId = selectedId;
    this.validTargetIds = new Set(validTargets);
    this.hintPair = hint;
  }

  public triggerInvalidShake(plateId: number) {
    const pv = this.plateVisuals.get(plateId);
    if (pv) pv.shakeTime = 0.38;
  }

  public animateSliceMove(
    fromId: number,
    toId: number,
    flavor: FlavorId,
    count: number,
    fromStartSlot: number,
    toStartSlot: number,
    onDone: () => void
  ) {
    const fromPv = this.plateVisuals.get(fromId);
    const toPv = this.plateVisuals.get(toId);
    if (!fromPv || !toPv) {
      onDone();
      return;
    }

    this.isBusyAnimating = true;

    // Remove the moving slice meshes from source plate immediately and spawn flying clones
    for (let i = 0; i < count; i++) {
      const slotIdx = fromStartSlot + count - 1 - i;
      const removed = fromPv.sliceMeshes.pop();
      if (removed) fromPv.root.remove(removed);

      const flyMesh = createCakeSliceMesh(flavor);
      const startRot = slotIdx * (Math.PI / 3);
      const destSlot = toStartSlot + i;
      const endRot = destSlot * (Math.PI / 3);

      const startPos = fromPv.root.position.clone().add(new THREE.Vector3(0, 0.38, 0));
      const endPos = toPv.root.position.clone().add(new THREE.Vector3(0, 0.07, 0));

      flyMesh.position.copy(startPos);
      flyMesh.rotation.y = startRot;
      this.fxGroup.add(flyMesh);

      const isLast = i === count - 1;
      this.flyingAnims.push({
        mesh: flyMesh,
        startPos,
        endPos,
        startRotY: startRot,
        endRotY: endRot,
        delay: i * 0.05,
        elapsed: 0,
        duration: 0.28,
        arrived: false,
        onArrive: () => {
          toPv.bounceTime = 0.25;
          toPv.scaleSpring.vel = -0.15; // squash impulse on landing
          if (isLast) {
            this.isBusyAnimating = false;
            onDone();
          }
        },
      });
    }
  }

  public animateCakeMerge(plateId: number, flavor: FlavorId, onComplete: () => void) {
    const pv = this.plateVisuals.get(plateId);
    if (!pv) {
      onComplete();
      return;
    }
    this.isBusyAnimating = true;
    this.mergeAnims.push({
      plateId,
      flavor,
      elapsed: 0,
      phase: 'spin',
      wholeCake: null,
      onComplete: () => {
        this.isBusyAnimating = false;
        onComplete();
      },
    });
  }

  private spawnConfettiBurst(origin: THREE.Vector3, flavor: FlavorId) {
    const spec = CAKE_FLAVORS[flavor];
    const palette = [spec.icingColor, spec.spongeColor, '#ffd166', '#ffffff', '#2997ff', '#ff5d8f'];

    for (let i = 0; i < 36; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: palette[i % palette.length],
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(this.confettiGeo, mat);
      m.position.copy(origin).add(new THREE.Vector3(0, 0.48, 0));
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.6 + Math.random() * 2.8;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        3.2 + Math.random() * 3.0,
        Math.sin(angle) * speed
      );
      const rotVel = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14
      );
      this.fxGroup.add(m);
      this.confetti.push({ mesh: m, vel, rotVel, life: 0, maxLife: 0.95 + Math.random() * 0.45 });
    }
  }

  public get busy(): boolean {
    return this.isBusyAnimating || this.flyingAnims.length > 0 || this.mergeAnims.length > 0;
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
  }

  private handlePointerMove = (e: PointerEvent) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.pointerNorm.x = (e.clientX / w) * 2 - 1;
    this.pointerNorm.y = -(e.clientY / h) * 2 + 1;
  };

  private handleResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.updateCameraFraming(this.currentPlatesData.length || 6);
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (this.busy) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hitMeshes: THREE.Object3D[] = [];
    for (const pv of this.plateVisuals.values()) {
      hitMeshes.push(pv.hitMesh);
    }

    const hits = this.raycaster.intersectObjects(hitMeshes, false);
    if (hits.length > 0) {
      const plateId = hits[0].object.userData.plateId as number;
      this.onPlateTap(plateId);
    }
  };

  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    // Emit firstFrameReady signal to YouTube Playables SDK
    if (!this.firstFrameFired) {
      this.firstFrameFired = true;
      ytPlayables.emitFirstFrameReady();
    }

    // 1. Apple-style Parallax Camera Float
    this.cameraParallax.x = THREE.MathUtils.lerp(this.cameraParallax.x, this.pointerNorm.x * 0.45, 0.06);
    this.cameraParallax.y = THREE.MathUtils.lerp(this.cameraParallax.y, this.pointerNorm.y * 0.28, 0.06);
    this.camera.position.x = this.baseCameraPos.x + this.cameraParallax.x;
    this.camera.position.y = this.baseCameraPos.y + this.cameraParallax.y;
    this.camera.lookAt(0, 0.12, -0.32);

    // 2. Update ambient floating motes
    for (const m of this.ambientMotes) {
      const { baseY, baseX, speed, phase } = m.userData;
      m.position.y = baseY + Math.sin(elapsed * speed + phase) * 0.2;
      m.position.x = baseX + Math.cos(elapsed * speed * 0.8 + phase) * 0.12;
    }

    // 3. Update plates (selection hover, spring scale, shake, ring indicators)
    for (const pv of this.plateVisuals.values()) {
      pv.root.position.x = THREE.MathUtils.lerp(pv.root.position.x, pv.targetPos.x, 0.18);
      pv.root.position.z = THREE.MathUtils.lerp(pv.root.position.z, pv.targetPos.z, 0.18);

      // Shake offset
      let shakeOffsetX = 0;
      if (pv.shakeTime > 0) {
        pv.shakeTime = Math.max(0, pv.shakeTime - dt);
        shakeOffsetX = Math.sin(pv.shakeTime * 56) * 0.14 * (pv.shakeTime / 0.38);
      }
      pv.plateBase.position.x = shakeOffsetX;

      // Spring physics for plate bounce
      const springStiffness = 180;
      const springDamping = 14;
      const force = -springStiffness * (pv.scaleSpring.val - 1);
      pv.scaleSpring.vel += (force - springDamping * pv.scaleSpring.vel) * dt;
      pv.scaleSpring.val += pv.scaleSpring.vel * dt;

      const s = Math.max(0.01, pv.scaleSpring.val);
      pv.root.scale.set(s, 1 / Math.sqrt(s), s);

      const isSelected = pv.plateId === this.selectedPlateId;
      const isValid = this.validTargetIds.has(pv.plateId);
      const isHintFrom = this.hintPair?.fromId === pv.plateId && this.selectedPlateId === null;
      const isHintTo = this.hintPair?.toId === pv.plateId && this.selectedPlateId === this.hintPair.fromId;

      // Apple Action Blue & Golden Ring indicators
      const ringMat = pv.ringMesh.material as THREE.MeshBasicMaterial;
      if (isSelected) {
        ringMat.color.set('#0071e3');
        ringMat.opacity = 0.92;
        const pulse = 1.02 + Math.sin(elapsed * 6.5) * 0.035;
        pv.ringMesh.scale.set(pulse, pulse, 1);
      } else if (isValid || isHintTo) {
        ringMat.color.set(isHintTo ? '#ffd166' : '#34c759');
        ringMat.opacity = 0.65 + Math.sin(elapsed * 5.5) * 0.25;
        const pulse = 1.0 + Math.sin(elapsed * 5.5) * 0.04;
        pv.ringMesh.scale.set(pulse, pulse, 1);
      } else if (isHintFrom) {
        ringMat.color.set('#ffd166');
        ringMat.opacity = 0.5 + Math.sin(elapsed * 4.5) * 0.35;
        const pulse = 1.0 + Math.sin(elapsed * 4.5) * 0.05;
        pv.ringMesh.scale.set(pulse, pulse, 1);
      } else {
        ringMat.opacity = THREE.MathUtils.lerp(ringMat.opacity, 0, 0.2);
      }

      // Slice lift for selected plate's movable top group
      for (const sm of pv.sliceMeshes) {
        const { isTopSlice, baseY } = sm.userData;
        let desiredY = baseY as number;
        if (isSelected && isTopSlice) {
          desiredY = 0.42 + Math.sin(elapsed * 6.5) * 0.045;
        } else if (isHintFrom && isTopSlice) {
          desiredY = (baseY as number) + 0.09 + Math.sin(elapsed * 4.5) * 0.035;
        }
        sm.position.y = THREE.MathUtils.lerp(sm.position.y, desiredY, 0.24);
      }
    }

    // 4. Flying slice parabolic arcs
    for (let i = this.flyingAnims.length - 1; i >= 0; i--) {
      const anim = this.flyingAnims[i];
      if (anim.delay > 0) {
        anim.delay -= dt;
        continue;
      }
      anim.elapsed += dt;
      const t = Math.min(1, anim.elapsed / anim.duration);
      // Apple fluid ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      anim.mesh.position.lerpVectors(anim.startPos, anim.endPos, ease);
      anim.mesh.position.y += Math.sin(t * Math.PI) * 1.65;

      let diff = anim.endRotY - anim.startRotY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      anim.mesh.rotation.y = anim.startRotY + diff * ease;
      anim.mesh.rotation.x = Math.sin(t * Math.PI) * 0.28;

      if (t >= 1 && !anim.arrived) {
        anim.arrived = true;
        this.fxGroup.remove(anim.mesh);
        this.flyingAnims.splice(i, 1);
        anim.onArrive?.();
      }
    }

    // 5. Match-6 Cake Merge animations
    for (let i = this.mergeAnims.length - 1; i >= 0; i--) {
      const m = this.mergeAnims[i];
      const pv = this.plateVisuals.get(m.plateId);
      if (!pv) {
        this.mergeAnims.splice(i, 1);
        m.onComplete();
        continue;
      }

      m.elapsed += dt;
      if (m.phase === 'spin') {
        const p = Math.min(1, m.elapsed / 0.35);
        pv.root.rotation.y = p * Math.PI * 2;
        const shrink = 1 - p * 0.25;
        for (const sm of pv.sliceMeshes) {
          sm.scale.set(shrink, 1 + p * 0.15, shrink);
        }
        if (p >= 1) {
          pv.root.rotation.y = 0;
          for (const sm of pv.sliceMeshes) pv.root.remove(sm);
          pv.sliceMeshes = [];
          const whole = createWholeCakeMesh(m.flavor);
          whole.position.y = 0.08;
          whole.scale.set(0.15, 0.15, 0.15);
          pv.root.add(whole);
          m.wholeCake = whole;
          m.phase = 'showcase';
          m.elapsed = 0;
          this.spawnConfettiBurst(pv.root.position, m.flavor);
        }
      } else if (m.phase === 'showcase') {
        const p = Math.min(1, m.elapsed / 0.46);
        if (m.wholeCake) {
          // Elastic spring pop
          const s = p < 0.4 ? 0.15 + (p / 0.4) * 1.05 : 1.2 - ((p - 0.4) / 0.6) * 0.2;
          m.wholeCake.scale.set(s, s, s);
          m.wholeCake.rotation.y = p * Math.PI * 0.7;
        }
        if (p >= 1) {
          m.phase = 'flyout';
          m.elapsed = 0;
        }
      } else if (m.phase === 'flyout') {
        const p = Math.min(1, m.elapsed / 0.35);
        const ease = p * p;
        if (m.wholeCake) {
          m.wholeCake.position.y = 0.08 + ease * 3.6;
          m.wholeCake.position.z = -ease * 2.4;
          const s = Math.max(0.04, 1 - ease * 0.92);
          m.wholeCake.scale.set(s, s, s);
          m.wholeCake.rotation.y += dt * 5.5;
        }
        if (p >= 1) {
          if (m.wholeCake) pv.root.remove(m.wholeCake);
          this.mergeAnims.splice(i, 1);
          m.onComplete();
        }
      }
    }

    // 6. 3D Confetti particles with gravity and drag
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.life += dt;
      c.vel.y -= 8.2 * dt;
      c.vel.x *= 0.985;
      c.vel.z *= 0.985;
      c.mesh.position.addScaledVector(c.vel, dt);
      c.mesh.rotation.x += c.rotVel.x * dt;
      c.mesh.rotation.y += c.rotVel.y * dt;
      c.mesh.rotation.z += c.rotVel.z * dt;
      const s = Math.max(0.01, 1 - c.life / c.maxLife);
      c.mesh.scale.set(s, s, s);
      if (c.life >= c.maxLife) {
        this.fxGroup.remove(c.mesh);
        (c.mesh.material as THREE.Material).dispose();
        this.confetti.splice(i, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.dispose();
  }
}
