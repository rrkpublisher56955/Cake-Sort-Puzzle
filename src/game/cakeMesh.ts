import * as THREE from 'three';
import { CAKE_FLAVORS } from './catalog';
import { CounterThemeId, FlavorId, PlateStyleId, PropDecorId } from './types';

const SLICE_RADIUS = 0.68;
const SLICE_INNER = 0.055;
const SLICE_HALF_ANGLE = (52 * Math.PI) / 180 / 2; // 52 deg wedge -> clean 8 deg gap between 6 slices

function makeWedgeShape(rInner: number, rOuter: number, halfAngle: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(rInner * Math.cos(-halfAngle), rInner * Math.sin(-halfAngle));
  shape.lineTo(rOuter * Math.cos(-halfAngle), rOuter * Math.sin(-halfAngle));
  shape.absarc(0, 0, rOuter, -halfAngle, halfAngle, false);
  shape.lineTo(rInner * Math.cos(halfAngle), rInner * Math.sin(halfAngle));
  shape.absarc(0, 0, rInner, halfAngle, -halfAngle, true);
  return shape;
}

// Shared slice layer geometries (built once)
const wedgeShape = makeWedgeShape(SLICE_INNER, SLICE_RADIUS, SLICE_HALF_ANGLE);
const icingShape = makeWedgeShape(SLICE_INNER * 0.9, SLICE_RADIUS + 0.015, SLICE_HALF_ANGLE + 0.01);

const spongeBottomGeo = new THREE.ExtrudeGeometry(wedgeShape, {
  depth: 0.13,
  bevelEnabled: false,
  curveSegments: 18,
});
spongeBottomGeo.rotateX(-Math.PI / 2);

const creamMidGeo = new THREE.ExtrudeGeometry(wedgeShape, {
  depth: 0.075,
  bevelEnabled: false,
  curveSegments: 18,
});
creamMidGeo.rotateX(-Math.PI / 2);

const spongeTopGeo = new THREE.ExtrudeGeometry(wedgeShape, {
  depth: 0.125,
  bevelEnabled: false,
  curveSegments: 18,
});
spongeTopGeo.rotateX(-Math.PI / 2);

const icingTopGeo = new THREE.ExtrudeGeometry(icingShape, {
  depth: 0.065,
  bevelEnabled: true,
  bevelThickness: 0.018,
  bevelSize: 0.014,
  bevelSegments: 3,
  curveSegments: 18,
});
icingTopGeo.rotateX(-Math.PI / 2);

// Curved outer frosting shell
const outerArcShape = makeWedgeShape(SLICE_RADIUS - 0.025, SLICE_RADIUS + 0.018, SLICE_HALF_ANGLE + 0.005);
const outerFrostGeo = new THREE.ExtrudeGeometry(outerArcShape, {
  depth: 0.37,
  bevelEnabled: false,
  curveSegments: 18,
});
outerFrostGeo.rotateX(-Math.PI / 2);

const garnishSphereGeo = new THREE.SphereGeometry(0.068, 14, 12);
const garnishMiniGeo = new THREE.SphereGeometry(0.044, 12, 10);
const garnishBoxGeo = new THREE.BoxGeometry(0.085, 0.07, 0.085);
const garnishConeGeo = new THREE.ConeGeometry(0.062, 0.12, 12);

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

function getMat(color: string, roughness = 0.55, metalness = 0.02): THREE.MeshStandardMaterial {
  const key = `${color}_${roughness}_${metalness}`;
  let m = materialCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materialCache.set(key, m);
  }
  return m;
}

export function createCakeSliceMesh(flavorId: FlavorId): THREE.Group {
  const spec = CAKE_FLAVORS[flavorId];
  const group = new THREE.Group();

  const spongeMat = getMat(spec.spongeColor, 0.78, 0.0);
  const creamMat = getMat(spec.creamColor, 0.48, 0.02);
  const icingMat = getMat(spec.icingColor, 0.28, 0.04);
  const garnishMat = getMat(spec.garnishColor, 0.25, 0.05);
  const accentMat = getMat(spec.accentColor, 0.35, 0.06);

  const bSponge = new THREE.Mesh(spongeBottomGeo, spongeMat);
  bSponge.castShadow = true;
  bSponge.receiveShadow = true;
  group.add(bSponge);

  const midCream = new THREE.Mesh(creamMidGeo, creamMat);
  midCream.position.y = 0.13;
  midCream.castShadow = true;
  midCream.receiveShadow = true;
  group.add(midCream);

  const tSponge = new THREE.Mesh(spongeTopGeo, spongeMat);
  tSponge.position.y = 0.205;
  tSponge.castShadow = true;
  tSponge.receiveShadow = true;
  group.add(tSponge);

  const outerFrost = new THREE.Mesh(outerFrostGeo, icingMat);
  outerFrost.position.y = 0.01;
  outerFrost.castShadow = true;
  outerFrost.receiveShadow = true;
  group.add(outerFrost);

  const topIcing = new THREE.Mesh(icingTopGeo, icingMat);
  topIcing.position.y = 0.33;
  topIcing.castShadow = true;
  topIcing.receiveShadow = true;
  group.add(topIcing);

  // Garnish on top at r = 0.41
  const garnishGroup = new THREE.Group();
  garnishGroup.position.set(0.41, 0.425, 0);

  if (flavorId === 'strawberry') {
    const berry = new THREE.Mesh(garnishConeGeo, garnishMat);
    berry.position.y = 0.05;
    berry.castShadow = true;
    const leaf = new THREE.Mesh(garnishMiniGeo, accentMat);
    leaf.scale.set(1.2, 0.35, 1.2);
    leaf.position.y = 0.005;
    garnishGroup.add(berry, leaf);
  } else if (flavorId === 'chocolate') {
    const truffle = new THREE.Mesh(garnishSphereGeo, garnishMat);
    truffle.position.y = 0.05;
    truffle.castShadow = true;
    const goldBit = new THREE.Mesh(garnishMiniGeo, accentMat);
    goldBit.scale.set(0.6, 0.6, 0.6);
    goldBit.position.set(0.03, 0.095, 0.02);
    garnishGroup.add(truffle, goldBit);
  } else if (flavorId === 'matcha') {
    const cream = new THREE.Mesh(garnishConeGeo, accentMat);
    cream.scale.set(1.05, 0.85, 1.05);
    cream.position.y = 0.04;
    const mochi = new THREE.Mesh(garnishBoxGeo, garnishMat);
    mochi.scale.set(0.75, 0.75, 0.75);
    mochi.position.set(-0.04, 0.04, 0.04);
    mochi.rotation.y = 0.4;
    garnishGroup.add(cream, mochi);
  } else if (flavorId === 'lemon') {
    const meringue = new THREE.Mesh(garnishConeGeo, garnishMat);
    meringue.scale.set(1.15, 0.95, 1.15);
    meringue.position.y = 0.045;
    const zest = new THREE.Mesh(garnishMiniGeo, accentMat);
    zest.scale.set(1.1, 0.45, 0.7);
    zest.position.set(0.05, 0.03, 0);
    garnishGroup.add(meringue, zest);
  } else if (flavorId === 'blueberry') {
    const b1 = new THREE.Mesh(garnishMiniGeo, garnishMat);
    b1.position.set(-0.025, 0.038, -0.025);
    const b2 = new THREE.Mesh(garnishMiniGeo, garnishMat);
    b2.position.set(0.03, 0.035, 0.028);
    const leaf = new THREE.Mesh(garnishMiniGeo, accentMat);
    leaf.scale.set(1.1, 0.3, 0.6);
    leaf.position.set(-0.03, 0.02, 0.04);
    garnishGroup.add(b1, b2, leaf);
  } else if (flavorId === 'redvelvet') {
    const swirl = new THREE.Mesh(garnishConeGeo, garnishMat);
    swirl.scale.set(1.1, 0.8, 1.1);
    swirl.position.y = 0.04;
    const crumb = new THREE.Mesh(garnishMiniGeo, accentMat);
    crumb.scale.set(0.55, 0.55, 0.55);
    crumb.position.set(0.02, 0.08, 0);
    garnishGroup.add(swirl, crumb);
  } else if (flavorId === 'caramel') {
    const cube = new THREE.Mesh(garnishBoxGeo, garnishMat);
    cube.position.y = 0.035;
    cube.rotation.set(0.15, 0.5, 0.1);
    const bean = new THREE.Mesh(garnishMiniGeo, accentMat);
    bean.scale.set(0.85, 0.55, 0.65);
    bean.position.set(0.04, 0.075, 0.02);
    garnishGroup.add(cube, bean);
  } else {
    // pistachio
    const rosette = new THREE.Mesh(garnishConeGeo, garnishMat);
    rosette.scale.set(1.1, 0.75, 1.1);
    rosette.position.y = 0.038;
    const nut = new THREE.Mesh(garnishMiniGeo, accentMat);
    nut.scale.set(0.65, 0.55, 0.85);
    nut.position.set(-0.03, 0.03, 0.03);
    garnishGroup.add(rosette, nut);
  }

  group.add(garnishGroup);
  return group;
}

export function createWholeCakeMesh(flavorId: FlavorId): THREE.Group {
  const spec = CAKE_FLAVORS[flavorId];
  const group = new THREE.Group();

  const spongeMat = getMat(spec.spongeColor, 0.75, 0.0);
  const creamMat = getMat(spec.creamColor, 0.45, 0.02);
  const icingMat = getMat(spec.icingColor, 0.24, 0.04);
  const garnishMat = getMat(spec.garnishColor, 0.22, 0.05);
  const accentMat = getMat(spec.accentColor, 0.3, 0.06);

  const R = 0.68;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.01, 0.34, 32), spongeMat);
  base.position.y = 0.17;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Cream band
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.008, R + 0.008, 0.075, 32), creamMat);
  band.position.y = 0.17;
  group.add(band);

  // Smooth icing coat & top
  const top = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.025, R + 0.02, 0.11, 32), icingMat);
  top.position.y = 0.36;
  top.castShadow = true;
  group.add(top);

  // 12 scalloped whipped-cream dollops around top rim
  const dollopGeo = new THREE.ConeGeometry(0.085, 0.13, 12);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const d = new THREE.Mesh(dollopGeo, creamMat);
    d.position.set(Math.cos(a) * 0.53, 0.455, Math.sin(a) * 0.53);
    d.castShadow = true;
    group.add(d);
  }

  // Centerpiece crown
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const g = new THREE.Mesh(garnishSphereGeo, garnishMat);
    g.position.set(Math.cos(a) * 0.11, 0.46, Math.sin(a) * 0.11);
    g.castShadow = true;
    group.add(g);
  }
  const crown = new THREE.Mesh(garnishConeGeo, accentMat);
  crown.position.set(0, 0.51, 0);
  crown.castShadow = true;
  group.add(crown);

  return group;
}

export function createPlateMesh(styleId: PlateStyleId, isExtra = false): THREE.Group {
  const group = new THREE.Group();

  const points: THREE.Vector2[] = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.62, 0),
    new THREE.Vector2(0.76, 0.04),
    new THREE.Vector2(0.92, 0.12),
    new THREE.Vector2(0.95, 0.145),
    new THREE.Vector2(0.92, 0.165),
    new THREE.Vector2(0.74, 0.09),
    new THREE.Vector2(0.60, 0.055),
    new THREE.Vector2(0, 0.055),
  ];

  const plateGeo = new THREE.LatheGeometry(points, 40);

  let bodyColor = '#fffdf9';
  let rimColor = '#eadfce';
  let rimMetal = 0.05;
  let rimRough = 0.3;

  if (styleId === 'gold') {
    bodyColor = '#ffffff';
    rimColor = '#e5b94c';
    rimMetal = 0.78;
    rimRough = 0.22;
  } else if (styleId === 'mint') {
    bodyColor = '#d2f2e3';
    rimColor = '#f7efe5';
  } else if (styleId === 'rose') {
    bodyColor = '#fce0e8';
    rimColor = '#fff6f8';
  }

  if (isExtra) {
    rimColor = '#f5c242';
    rimMetal = 0.65;
  }

  const bodyMat = getMat(bodyColor, 0.2, 0.05);
  const plateMesh = new THREE.Mesh(plateGeo, bodyMat);
  plateMesh.receiveShadow = true;
  plateMesh.castShadow = true;
  group.add(plateMesh);

  // Decorative outer rim ring
  const rimRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.915, 0.022, 10, 44),
    getMat(rimColor, rimRough, rimMetal)
  );
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = 0.15;
  group.add(rimRing);

  return group;
}

export function createCounterTexture(theme: CounterThemeId): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (theme === 'oak') {
    ctx.fillStyle = '#dcb589';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 4) {
      const shade = Math.sin(y * 0.06) * 8 + (Math.random() - 0.5) * 8;
      ctx.fillStyle = `rgba(140, 88, 42, ${0.05 + Math.abs(shade) * 0.004})`;
      ctx.fillRect(0, y, 512, 3);
    }
    // Subtle plank lines
    ctx.strokeStyle = 'rgba(110, 68, 30, 0.16)';
    ctx.lineWidth = 2;
    for (let y = 64; y < 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  } else if (theme === 'marble') {
    ctx.fillStyle = '#f5f4f0';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = `rgba(155, 160, 170, ${0.12 + Math.random() * 0.14})`;
      ctx.lineWidth = 1 + Math.random() * 3;
      ctx.beginPath();
      let x = Math.random() * 512;
      let y = 0;
      ctx.moveTo(x, y);
      while (y < 512) {
        y += 24;
        x += (Math.random() - 0.45) * 45;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (theme === 'terrazzo') {
    ctx.fillStyle = '#faecef';
    ctx.fillRect(0, 0, 512, 512);
    const chips = ['#f2849e', '#84d9ba', '#f7c873', '#9aa5e8', '#e3b5a4'];
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = chips[i % chips.length];
      ctx.save();
      ctx.translate(Math.random() * 512, Math.random() * 512);
      ctx.rotate(Math.random() * Math.PI);
      const w = 5 + Math.random() * 12;
      const h = 4 + Math.random() * 9;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2, -h * 0.3);
      ctx.lineTo(w * 0.3, h / 2);
      ctx.lineTo(-w * 0.4, h * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else {
    // slate
    ctx.fillStyle = '#2d313d';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.035})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    ctx.strokeStyle = 'rgba(229, 185, 76, 0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, 488, 488);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBakeryPropMesh(propId: PropDecorId): THREE.Group {
  const group = new THREE.Group();

  if (propId === 'macaron') {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.22, 0.14, 24), getMat('#fff9f2', 0.25, 0.05));
    stand.position.y = 0.07;
    stand.castShadow = true;
    group.add(stand);

    const macColors = ['#ff8fab', '#a8e6cf', '#ffd3b6', '#cdb4db'];
    for (let i = 0; i < 4; i++) {
      const mac = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 - i * 0.015, 0.18 - i * 0.015, 0.11, 20),
        getMat(macColors[i], 0.4, 0.02)
      );
      mac.position.set(0, 0.2 + i * 0.115, 0);
      mac.castShadow = true;
      group.add(mac);
    }
    const domeMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.26,
      roughness: 0.08,
      metalness: 0.1,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.y = 0.14;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), getMat('#f5d08a', 0.2, 0.6));
    knob.position.y = 0.58;
    group.add(dome, knob);
  } else if (propId === 'tulips') {
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.52, 20), getMat('#f8f1e7', 0.3, 0.05));
    vase.position.y = 0.26;
    vase.castShadow = true;
    group.add(vase);

    const tulipColors = ['#ff5d8f', '#ff85a1', '#ffb3c6', '#ff477e'];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 8), getMat('#529954', 0.6));
      stem.position.set(Math.cos(a) * 0.06, 0.6, Math.sin(a) * 0.06);
      stem.rotation.z = Math.cos(a) * 0.18;
      stem.rotation.x = Math.sin(a) * 0.18;

      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), getMat(tulipColors[i], 0.45));
      bud.scale.set(0.85, 1.35, 0.85);
      bud.position.set(Math.cos(a) * 0.11, 0.84, Math.sin(a) * 0.11);
      bud.castShadow = true;
      group.add(stem, bud);
    }
  } else if (propId === 'teapot') {
    const brass = getMat('#dfa943', 0.22, 0.82);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), brass);
    body.scale.set(1.1, 0.9, 1.1);
    body.position.y = 0.24;
    body.castShadow = true;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.08, 16), brass);
    lid.position.y = 0.48;
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.055, 0.28, 10), brass);
    spout.position.set(0.28, 0.3, 0);
    spout.rotation.z = -0.7;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 18, Math.PI), brass);
    handle.position.set(-0.26, 0.26, 0);
    handle.rotation.z = Math.PI / 2;
    group.add(body, lid, spout, handle);

    // Cute espresso cup next to it
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.14, 16), getMat('#fffdf9', 0.25));
    cup.position.set(0.45, 0.07, 0.18);
    cup.castShadow = true;
    group.add(cup);
  } else if (propId === 'lights') {
    // Festive arch of warm glowing bistro bulbs along the back
    const cordMat = getMat('#4b3a30', 0.8);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: '#fff4c2',
      emissive: '#ffcf66',
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const postGeo = new THREE.CylinderGeometry(0.025, 0.03, 1.35, 10);
    const pLeft = new THREE.Mesh(postGeo, cordMat);
    pLeft.position.set(-4.3, 0.67, 0);
    const pRight = new THREE.Mesh(postGeo, cordMat);
    pRight.position.set(4.3, 0.67, 0);
    group.add(pLeft, pRight);

    const curvePts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const x = -4.3 + t * 8.6;
      const sag = Math.sin(t * Math.PI) * 0.32;
      curvePts.push(new THREE.Vector3(x, 1.32 - sag, 0));
    }
    const curve = new THREE.CatmullRomCurve3(curvePts);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.015, 6, false), cordMat);
    group.add(wire);

    for (let i = 1; i < 10; i++) {
      const pt = curve.getPoint(i / 10);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), bulbMat);
      bulb.position.set(pt.x, pt.y - 0.08, pt.z);
      group.add(bulb);
    }
  } else if (propId === 'trophy') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.16, 18), getMat('#2c303a', 0.3, 0.2));
    base.position.y = 0.08;
    const gold = getMat('#f7c948', 0.18, 0.88);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.22, 14), gold);
    stem.position.y = 0.26;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.1, 0.28, 20), gold);
    cup.position.y = 0.48;
    cup.castShadow = true;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), gold);
    star.position.y = 0.72;
    group.add(base, stem, cup, star);
  }

  return group;
}
