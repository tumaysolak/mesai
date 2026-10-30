import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { DEPARTMENTS, deptOf } from "./Office.jsx";

// ---------------------------------------------------------------------------
// MESAI HQ: the office as a small diorama. Six rooms on a cream plate, one
// desk per employee, a round table in the hall for meetings. Every employee is
// an office cat: asleep at the desk when the shift is closed, typing when it is
// their turn, walking to the table when the board meets.
//
// The scene is built once per staff list and then only nudged: statuses, the
// shift phase and the counters on the whiteboards update in place, so the
// camera and the animations never jump when the panel refreshes.
// ---------------------------------------------------------------------------

const ROOM_W = 11;
const ROOM_D = 8.5;
const GAP_X = 2.6;
const HALL = 5.4;
const WALL_H = 1.7;
const PLATE_PAD = 2.4;
const DESK_K = 1.3;
const SEAT_Y = 0.08 + 0.53 * DESK_K;
const PAW_Y = 0.08 + 0.835 * DESK_K - SEAT_Y + 0.02;

export const roomCentre = (dept) => {
  const x = (dept.col - 1) * (ROOM_W + GAP_X);
  const z = dept.row === 0 ? -(HALL / 2 + ROOM_D / 2) : HALL / 2 + ROOM_D / 2;
  return new THREE.Vector3(x, 0, z);
};

// Fur by persona look, so a cat is the same cat every day.
const FUR = [
  { fur: "#e9a05a", belly: "#f8e3c6", stripe: "#c97a3a" }, // ginger tabby
  { fur: "#9da3ab", belly: "#e6e6e3", stripe: "#7d838c" }, // grey
  { fur: "#2d2c31", belly: "#f4f1ea", stripe: null }, // tuxedo
  { fur: "#efdab6", belly: "#fbf3e3", stripe: "#d9bd8e" }, // cream
  { fur: "#8b5a3d", belly: "#e2c3a4", stripe: "#6c4029" }, // brown
  { fur: "#f3f0ea", belly: "#ffffff", stripe: null }, // white
  { fur: "#d9773a", belly: "#f6d7b6", stripe: "#b25a25" }, // orange
  { fur: "#e9e2d6", belly: "#ffffff", stripe: "#3a3236" }, // calico-ish
];
export const furOf = (agent) => {
  const look = Number.isInteger(agent?.look)
    ? ((agent.look % 8) + 8) % 8
    : [...String(agent?.id || "x")].reduce((n, c) => n + c.charCodeAt(0), 0) %
      8;
  return FUR[look];
};

const mix = (a, b, t) => {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return "#" + ca.lerp(cb, t).getHexString();
};

const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.86,
        metalness: 0,
        ...opts,
      }),
    );
  }
  return matCache.get(key);
}

function box(w, h, d, color, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function roundedPlate(w, d, h, r, color) {
  const s = new THREE.Shape();
  const x = -w / 2,
    y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.12,
    bevelSegments: 3,
  });
  g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat(color));
  m.receiveShadow = true;
  return m;
}

// --- canvas textures --------------------------------------------------------
function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData.canvas = c;
  t.userData.draw = draw;
  return t;
}
function redraw(tex, draw) {
  const c = tex.userData.canvas;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  draw(ctx, c.width, c.height);
  tex.needsUpdate = true;
}

function rugTexture(base, accent, edge) {
  return canvasTexture(512, 320, (ctx, w, h) => {
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = base;
    ctx.fillRect(14, 14, w - 28, h - 28);
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, w - 60, h - 60);
    const n = 5;
    for (let i = 0; i < n; i += 1) {
      const cx = 70 + (i * (w - 140)) / (n - 1);
      const cy = h / 2;
      ctx.fillStyle = i % 2 ? accent : "#ffffff";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 62);
      ctx.lineTo(cx + 40, cy);
      ctx.lineTo(cx, cy + 62);
      ctx.lineTo(cx - 40, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = i % 2 ? "#ffffff" : accent;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 22);
      ctx.lineTo(cx + 14, cy);
      ctx.lineTo(cx, cy + 22);
      ctx.lineTo(cx - 14, cy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,.6)";
    for (let i = 0; i < 24; i += 1) {
      ctx.fillRect(40 + i * 18.5, 40, 6, 6);
      ctx.fillRect(40 + i * 18.5, h - 46, 6, 6);
    }
  });
}

function drawFloorLabel(name, line, color) {
  return (ctx, w, h) => {
    ctx.fillStyle = shadeStr(color, 0.55);
    ctx.font = "800 92px Manrope, 'Bricolage Grotesque', sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(name, 8, 104);
    ctx.font = "600 44px Manrope, sans-serif";
    ctx.fillStyle = shadeStr(color, 0.45);
    ctx.fillText(line, 12, 168);
  };
}
function shadeStr(hex, k) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return "#" + c.getHexString();
}

function drawBoard(counts, color) {
  return (ctx, w, h) => {
    ctx.fillStyle = "#26282e";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, 10);
    const cols = [
      ["AKTİF", counts.doing],
      ["SIRA", counts.next],
      ["BİTTİ", counts.done],
    ];
    cols.forEach(([label, n], i) => {
      const x = 28 + i * ((w - 40) / 3);
      ctx.fillStyle = "#f4efe4";
      ctx.font = "800 96px Manrope, sans-serif";
      ctx.fillText(String(n), x, 128);
      ctx.fillStyle = "rgba(244,239,228,.55)";
      ctx.font = "700 24px Manrope, sans-serif";
      ctx.fillText(label, x + 2, 166);
    });
    ctx.fillStyle = "rgba(244,239,228,.85)";
    ctx.font = "700 34px Manrope, sans-serif";
    ctx.fillText(`${counts.output} çıktı`, 30, 226);
  };
}

function drawScreen(on, color, seed = 0) {
  return (ctx, w, h) => {
    ctx.fillStyle = on ? "#16181d" : "#2a2c31";
    ctx.fillRect(0, 0, w, h);
    if (!on) {
      ctx.fillStyle = "rgba(255,255,255,.06)";
      ctx.fillRect(10, 10, w - 20, 6);
      return;
    }
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, 14);
    for (let i = 0; i < 9; i += 1) {
      const len = 30 + ((i * 53 + seed * 31) % 140);
      ctx.fillStyle =
        i % 3 === 0 ? color : i % 3 === 1 ? "#cfe9d7" : "rgba(255,255,255,.55)";
      ctx.fillRect(14 + (i % 2) * 14, 26 + i * 12, len, 6);
    }
  };
}

// --- props ------------------------------------------------------------------
function plant(scale = 1, tint = "#7fb069") {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.22, 0.42, 10),
    mat("#d8cbb6"),
  );
  pot.position.y = 0.21;
  pot.castShadow = true;
  g.add(pot);
  const greens = [tint, mix(tint, "#3f7a3a", 0.4), mix(tint, "#c7e39a", 0.3)];
  [
    [0, 0.9, 0, 0.42],
    [0.18, 1.25, 0.06, 0.32],
    [-0.14, 1.32, -0.08, 0.3],
    [0.02, 1.6, 0, 0.24],
  ].forEach(([x, y, z, r], i) => {
    const leaf = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 0),
      mat(greens[i % 3], { flatShading: true }),
    );
    leaf.position.set(x, y, z);
    leaf.rotation.set(i, i * 0.7, 0);
    leaf.castShadow = true;
    g.add(leaf);
  });
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.6, 5),
    mat("#7a5a3a"),
  );
  stem.position.y = 0.62;
  g.add(stem);
  g.scale.setScalar(scale);
  return g;
}

function serverRack() {
  const g = new THREE.Group();
  const body = box(0.9, 2.1, 0.8, "#2b2e35");
  body.position.y = 1.05;
  g.add(body);
  for (let i = 0; i < 6; i += 1) {
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.05, 0.02),
      new THREE.MeshBasicMaterial({ color: i % 2 ? "#7fd6a0" : "#f2c14e" }),
    );
    led.position.set(0, 0.4 + i * 0.28, 0.41);
    led.userData.blink = i;
    g.add(led);
  }
  return g;
}

function shelf(color) {
  const g = new THREE.Group();
  const frame = box(1.8, 1.4, 0.45, "#e8dcc8");
  frame.position.y = 0.7;
  g.add(frame);
  const books = ["#e07a5f", "#3d405b", "#81b29a", "#f2cc8f", color];
  for (let r = 0; r < 2; r += 1) {
    for (let i = 0; i < 7; i += 1) {
      const b = box(0.16, 0.42, 0.34, books[(i + r * 2) % books.length]);
      b.position.set(-0.7 + i * 0.22, 0.42 + r * 0.6, 0.06);
      g.add(b);
    }
  }
  return g;
}

function poster(color, kind = 0) {
  const tex = canvasTexture(160, 220, (ctx, w, h) => {
    ctx.fillStyle = "#fbf7ef";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    if (kind === 0) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 - 10, 46, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 1) {
      for (let i = 0; i < 5; i += 1)
        ctx.fillRect(24, 40 + i * 30, 30 + ((i * 37) % 80), 14);
    } else {
      ctx.fillRect(30, 60, 100, 100);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(56, 86, 48, 48);
    }
    ctx.strokeStyle = "#d9cdb8";
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.85),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
  );
  return m;
}

// --- desk + cat -------------------------------------------------------------
function makeDesk(color, seed) {
  const g = new THREE.Group();
  const top = box(1.7, 0.09, 0.95, "#e9d6b4");
  top.position.y = 0.78;
  g.add(top);
  [
    [-0.78, -0.4],
    [0.78, -0.4],
    [-0.78, 0.4],
    [0.78, 0.4],
  ].forEach(([x, z]) => {
    const leg = box(0.07, 0.78, 0.07, "#f4efe6");
    leg.position.set(x, 0.39, z);
    g.add(leg);
  });
  // laptop: base on the desk, lid facing the chair (the -z side)
  const base = box(0.62, 0.04, 0.42, "#c9ccd2");
  base.position.set(0, 0.845, -0.05);
  g.add(base);
  const lid = new THREE.Group();
  lid.position.set(0, 0.86, 0.15);
  const back = box(0.62, 0.42, 0.03, "#dfe2e7");
  back.position.y = 0.21;
  lid.add(back);
  const screenTex = canvasTexture(256, 160, drawScreen(false, color, seed));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.36),
    new THREE.MeshBasicMaterial({ map: screenTex }),
  );
  screen.position.set(0, 0.21, -0.017);
  screen.rotation.y = Math.PI;
  lid.add(screen);
  const logo = new THREE.Mesh(
    new THREE.CircleGeometry(0.05, 16),
    new THREE.MeshBasicMaterial({ color: "#ffffff" }),
  );
  logo.position.set(0, 0.22, 0.017);
  lid.add(logo);
  lid.rotation.x = 0.22;
  g.add(lid);
  // a mug, because every desk has one
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.065, 0.14, 12),
    mat(color),
  );
  mug.position.set(0.58, 0.9, 0.12);
  mug.castShadow = true;
  g.add(mug);
  // chair behind the desk (on the -z side)
  const seat = box(0.62, 0.1, 0.56, "#f1ece3");
  seat.position.set(0, 0.48, -0.78);
  g.add(seat);
  const backrest = box(0.62, 0.62, 0.08, "#f1ece3");
  backrest.position.set(0, 0.82, -1.06);
  g.add(backrest);
  const post = box(0.07, 0.45, 0.07, "#9a9ea6");
  post.position.set(0, 0.22, -0.78);
  g.add(post);
  return { group: g, screenTex, lid };
}

function makeCat(agent) {
  const look = furOf(agent);
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const furM = mat(look.fur);
  const bellyM = mat(look.belly);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), furM);
  torso.scale.set(1, 1.08, 0.92);
  torso.position.y = 0.42;
  torso.castShadow = true;
  body.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), bellyM);
  belly.scale.set(0.9, 1.05, 0.6);
  belly.position.set(0, 0.4, 0.2);
  body.add(belly);
  if (look.stripe) {
    for (let i = 0; i < 3; i += 1) {
      const s = new THREE.Mesh(
        new THREE.TorusGeometry(0.4, 0.035, 6, 18, Math.PI),
        mat(look.stripe),
      );
      s.rotation.set(Math.PI / 2, 0, Math.PI);
      s.position.set(0, 0.55 + i * 0.11, -0.04);
      s.scale.set(1 - i * 0.12, 1 - i * 0.12, 1);
      body.add(s);
    }
  }
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.045, 8, 22),
    mat(agent.color || "#e0674a"),
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.8;
  body.add(collar);
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 10, 8),
    mat("#f2c14e", { metalness: 0.4, roughness: 0.4 }),
  );
  bell.position.set(0, 0.74, 0.25);
  body.add(bell);

  const head = new THREE.Group();
  head.position.y = 1.05;
  body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), furM);
  skull.scale.set(1.08, 0.94, 0.96);
  skull.castShadow = true;
  head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), bellyM);
  muzzle.scale.set(1.25, 0.8, 0.8);
  muzzle.position.set(0, -0.1, 0.27);
  head.add(muzzle);
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 6),
    mat("#e58f9a"),
  );
  nose.position.set(0, -0.04, 0.39);
  head.add(nose);
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 4), furM);
    ear.position.set(side * 0.21, 0.3, -0.02);
    ear.rotation.set(-0.1, Math.PI / 4, side * -0.32);
    ear.castShadow = true;
    head.add(ear);
    const inner = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.15, 4),
      mat("#f2b8b5"),
    );
    inner.position.set(side * 0.2, 0.29, 0.04);
    inner.rotation.set(-0.1, Math.PI / 4, side * -0.32);
    head.add(inner);
  });
  // two kinds of eyes: open when awake, a soft line when asleep
  const eyesOpen = new THREE.Group();
  const eyesShut = new THREE.Group();
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 10),
      mat("#1d1d22", { roughness: 0.3 }),
    );
    eye.scale.set(1, 1.25, 0.6);
    eye.position.set(side * 0.13, 0.04, 0.31);
    eyesOpen.add(eye);
    const glint = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 6, 6),
      new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    );
    glint.position.set(side * 0.13 + 0.02, 0.07, 0.35);
    eyesOpen.add(glint);
    const shut = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.012, 6, 12, Math.PI),
      mat("#1d1d22"),
    );
    shut.position.set(side * 0.13, 0.03, 0.33);
    shut.rotation.z = Math.PI;
    eyesShut.add(shut);
  });
  head.add(eyesOpen, eyesShut);
  // paws on the desk edge
  const paws = [-1, 1].map((side) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), bellyM);
    p.scale.set(1, 0.7, 1.3);
    p.position.set(side * 0.18, PAW_Y, 0.42);
    body.add(p);
    return p;
  });
  // tail
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.15, -0.36),
    new THREE.Vector3(0.25, 0.08, -0.6),
    new THREE.Vector3(0.45, 0.3, -0.62),
    new THREE.Vector3(0.5, 0.62, -0.5),
  ]);
  const tail = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 16, 0.065, 8, false),
    furM,
  );
  tail.castShadow = true;
  body.add(tail);
  // floor ring that shows the selected cat
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.78, 36),
    new THREE.MeshBasicMaterial({
      color: agent.color || "#e0674a",
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  g.add(ring);
  return { group: g, body, head, eyesOpen, eyesShut, paws, tail, ring };
}

// --- labels -----------------------------------------------------------------
function tagElement() {
  const el = document.createElement("div");
  el.className = "hq-tag";
  el.innerHTML =
    '<b class="hq-tag-name"></b><span class="hq-tag-line"><i></i><em></em></span><div class="hq-tag-say"></div><div class="hq-tag-z">z<span>z</span><span>z</span></div>';
  return el;
}

// ---------------------------------------------------------------------------
const MEETING =
  /toplantı|yönetim kurulu|oylama|retrospektif/i;

export function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export default function Office3D({
  agents = [],
  tasks = [],
  artifacts = [],
  events = [],
  running = false,
  phase = "",
  memoryCount = 0,
  focus = null,
  selected = null,
  onFocus,
  onSelect,
  homeSignal = 0,
}) {
  const host = useRef(null);
  const world = useRef(null);
  const cb = useRef({ onFocus, onSelect });
  cb.current = { onFocus, onSelect };

  const staffKey = agents
    .map((a) => `${a.id}:${deptOf(a)}:${a.look}`)
    .join("|");

  // --- build ---------------------------------------------------------------
  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    const W = () => Math.max(320, el.clientWidth);
    const H = () => Math.max(260, el.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W(), H());
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.className = "hq-canvas";
    el.appendChild(renderer.domElement);

    const labels = new CSS2DRenderer();
    labels.setSize(W(), H());
    labels.domElement.className = "hq-labels";
    el.appendChild(labels.domElement);

    const scene = new THREE.Scene();
    const plateW = 3 * ROOM_W + 2 * GAP_X + PLATE_PAD * 2;
    const plateD = 2 * ROOM_D + HALL + PLATE_PAD * 2;

    // Orthographic camera on the classic isometric diagonal.
    const frustum = 30;
    const aspect = W() / H();
    const camera = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      -200,
      400,
    );
    const OFFSET = new THREE.Vector3(38, 34, 38);
    camera.position.copy(OFFSET);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minZoom = 0.6;
    controls.maxZoom = 6;
    controls.minPolarAngle = 0.55;
    controls.maxPolarAngle = 1.12;
    controls.minAzimuthAngle = Math.PI / 4 - 0.75;
    controls.maxAzimuthAngle = Math.PI / 4 + 0.75;
    controls.screenSpacePanning = true;
    controls.zoomSpeed = 0.9;

    // light: warm sun from the upper left, cool fill from the sky
    scene.add(new THREE.HemisphereLight("#fff8ee", "#d9cbb4", 1.35));
    const sun = new THREE.DirectionalLight("#fff3e0", 1.9);
    sun.position.set(-18, 32, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.0006;
    sun.shadow.radius = 4;
    scene.add(sun);

    // the extruded plate carries a 0.12 bevel above its face; sink it so the
    // room floors and rugs sit on top
    const plate = roundedPlate(plateW, plateD, 0.7, 1.4, "#f2e9d8");
    plate.position.y = -0.13;
    scene.add(plate);
    const rim = roundedPlate(plateW + 0.5, plateD + 0.5, 0.25, 1.6, "#e3d6bf");
    rim.position.y = -0.7;
    scene.add(rim);

    const pickables = [];
    const rooms = new Map();
    const cats = new Map();

    // hall runner + meeting table
    const runner = new THREE.Mesh(
      new THREE.PlaneGeometry(plateW - 4, HALL - 1.6),
      mat("#eadfcb"),
    );
    runner.rotation.x = -Math.PI / 2;
    runner.position.y = 0.01;
    runner.receiveShadow = true;
    scene.add(runner);
    const table = new THREE.Group();
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.12, 40),
      mat("#e9d6b4"),
    );
    tableTop.position.y = 0.8;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    const tableLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.5, 0.8, 16),
      mat("#f4efe6"),
    );
    tableLeg.position.y = 0.4;
    table.add(tableTop, tableLeg);
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42, 2),
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#ff8a6b",
        emissiveIntensity: 0.55,
        roughness: 0.25,
      }),
    );
    orb.position.y = 1.55;
    orb.castShadow = true;
    table.add(orb);
    scene.add(table);
    const orbEl = document.createElement("div");
    orbEl.className = "hq-orb";
    const orbLabel = new CSS2DObject(orbEl);
    orbLabel.position.set(0, 2.45, 0);
    scene.add(orbLabel);
    [-1, 1].forEach((side) => {
      const p = plant(1.15, side > 0 ? "#86b36b" : "#9cc27a");
      p.position.set(side * (plateW / 2 - 1.6), 0, 0);
      scene.add(p);
    });

    // rooms
    DEPARTMENTS.forEach((dept, di) => {
      const c = roomCentre(dept);
      const room = new THREE.Group();
      room.position.copy(c);
      room.userData.deptId = dept.id;
      const floorCol = mix(dept.color, "#fbf4e8", 0.6);
      const wallCol = mix(dept.color, "#ffffff", 0.18);
      const floor = box(ROOM_W, 0.08, ROOM_D, floorCol);
      floor.position.y = 0.04;
      floor.castShadow = false;
      floor.userData.deptId = dept.id;
      room.add(floor);
      pickables.push(floor);
      // back walls on the far sides so the camera always sees in
      const backWall = box(ROOM_W, WALL_H, 0.2, wallCol);
      backWall.position.set(0, WALL_H / 2, -ROOM_D / 2 + 0.1);
      const sideWall = box(0.2, WALL_H, ROOM_D, mix(wallCol, "#000000", 0.08));
      sideWall.position.set(-ROOM_W / 2 + 0.1, WALL_H / 2, 0);
      const cap1 = box(ROOM_W, 0.06, 0.24, mix(wallCol, "#ffffff", 0.5));
      cap1.position.set(0, WALL_H + 0.03, -ROOM_D / 2 + 0.1);
      const cap2 = box(0.24, 0.06, ROOM_D, mix(wallCol, "#ffffff", 0.5));
      cap2.position.set(-ROOM_W / 2 + 0.1, WALL_H + 0.03, 0);
      // a low front lip so the room reads as a room from the camera side
      const lip = box(ROOM_W * 0.42, 0.42, 0.16, wallCol);
      lip.position.set(ROOM_W * 0.29, 0.21, ROOM_D / 2 - 0.08);
      const lipSide = box(0.16, 0.42, ROOM_D * 0.35, wallCol);
      lipSide.position.set(ROOM_W / 2 - 0.08, 0.21, -ROOM_D * 0.325);
      [backWall, sideWall, cap1, cap2, lip, lipSide].forEach((m) => {
        m.userData.deptId = dept.id;
        room.add(m);
        pickables.push(m);
      });
      // rug
      const rug = new THREE.Mesh(
        new THREE.PlaneGeometry(6.4, 3.6),
        new THREE.MeshStandardMaterial({
          map: rugTexture(
            mix(dept.color, "#ffffff", 0.08),
            mix(dept.color, "#2a2a30", 0.35),
            mix(dept.color, "#ffffff", 0.45),
          ),
          roughness: 1,
        }),
      );
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0.3, 0.09, 0.4);
      rug.receiveShadow = true;
      rug.userData.deptId = dept.id;
      room.add(rug);
      pickables.push(rug);
      // posters on the back wall
      [0, 1, 2].forEach((k) => {
        const p = poster(mix(dept.color, "#3a3a44", k * 0.2), (k + di) % 3);
        p.position.set(-3.2 + k * 1.05, 1.0, -ROOM_D / 2 + 0.21);
        room.add(p);
      });
      // a department-specific prop
      if (dept.id === "teknoloji") {
        [0, 1].forEach((k) => {
          const r = serverRack();
          r.position.set(-ROOM_W / 2 + 0.75 + k * 1.0, 0.08, -ROOM_D / 2 + 0.7);
          room.add(r);
        });
      } else if (dept.id === "strateji" || dept.id === "finans") {
        const s = shelf(dept.color);
        s.position.set(-ROOM_W / 2 + 1.4, 0.08, -ROOM_D / 2 + 0.5);
        room.add(s);
      }
      const pl = plant(0.95, di % 2 ? "#7fb069" : "#93c47d");
      pl.position.set(ROOM_W / 2 - 0.8, 0.08, -ROOM_D / 2 + 0.8);
      room.add(pl);
      const bag = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 18, 12),
        mat(mix(dept.color, "#2a2a30", 0.15)),
      );
      bag.scale.set(1, 0.55, 1);
      bag.position.set(ROOM_W / 2 - 1.2, 0.36, -0.6);
      bag.castShadow = true;
      room.add(bag);
      const lamp = new THREE.Group();
      const pole = box(0.05, 1.9, 0.05, "#3a3a40");
      pole.position.y = 0.95;
      const shadeM = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.32, 0.34, 16, 1, true),
        mat("#fbf3e3", { side: THREE.DoubleSide, emissive: "#ffe9c4", emissiveIntensity: 0.35 }),
      );
      shadeM.position.y = 1.9;
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.05, 16), mat("#3a3a40"));
      foot.position.y = 0.03;
      lamp.add(pole, shadeM, foot);
      lamp.position.set(-ROOM_W / 2 + 0.6, 0.08, -0.4);
      room.add(lamp);
      const pl2 = plant(0.7, "#8fbf72");
      pl2.position.set(-ROOM_W / 2 + 0.7, 0.08, ROOM_D / 2 - 0.7);
      room.add(pl2);
      // whiteboard on a stand facing the camera
      const boardTex = canvasTexture(
        420,
        250,
        drawBoard({ doing: 0, next: 0, done: 0, output: 0 }, dept.color),
      );
      const board = new THREE.Group();
      const boardFace = new THREE.Mesh(
        new THREE.PlaneGeometry(1.9, 1.13),
        new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.7 }),
      );
      boardFace.position.y = 1.25;
      const boardBack = box(2.0, 1.22, 0.06, "#e6e1d8");
      boardBack.position.set(0, 1.25, -0.04);
      const legA = box(0.06, 0.8, 0.06, "#9a9ea6");
      legA.position.set(-0.7, 0.4, 0);
      const legB = legA.clone();
      legB.position.x = 0.7;
      board.add(boardBack, boardFace, legA, legB);
      board.position.set(ROOM_W / 2 - 1.5, 0.08, ROOM_D / 2 - 1.2);
      board.rotation.y = Math.PI / 4;
      room.add(board);
      // floor lettering
      const labelTex = canvasTexture(
        900,
        190,
        drawFloorLabel(dept.name, "", dept.color),
      );
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(5.6, 1.18),
        new THREE.MeshBasicMaterial({
          map: labelTex,
          transparent: true,
          depthWrite: false,
        }),
      );
      label.rotation.x = -Math.PI / 2;
      label.position.set(-1.9, 0.1, ROOM_D / 2 - 0.85);
      room.add(label);
      scene.add(room);
      rooms.set(dept.id, {
        dept,
        group: room,
        boardTex,
        labelTex,
        desks: [],
        last: "",
      });
    });

    // desks and cats
    const byDept = new Map(DEPARTMENTS.map((d) => [d.id, []]));
    agents.forEach((a) => byDept.get(deptOf(a))?.push(a));
    const everyone = [];
    byDept.forEach((team, id) => {
      const room = rooms.get(id);
      const cols = team.length > 4 ? 3 : 2;
      const rowsN = Math.ceil(team.length / cols) || 1;
      team.forEach((agent, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = (col - (Math.min(cols, team.length) - 1) / 2) * 3.05 + 0.2;
        const z = (row - (rowsN - 1) / 2) * 3.4 + 0.55;
        const desk = makeDesk(room.dept.color, i + 1);
        desk.group.position.set(x, 0.08, z);
        desk.group.scale.setScalar(DESK_K);
        room.group.add(desk.group);
        const cat = makeCat(agent);
        const seat = new THREE.Vector3(x, SEAT_Y, z - 0.8 * DESK_K).add(
          room.group.position,
        );
        cat.group.position.copy(seat);
        cat.group.traverse((o) => {
          o.userData.agentId = agent.id;
        });
        scene.add(cat.group);
        cat.group.traverse((o) => {
          if (o.isMesh && o !== cat.ring) pickables.push(o);
        });
        const tagEl = tagElement();
        const tag = new CSS2DObject(tagEl);
        tag.position.set(0, 2.05, 0);
        cat.group.add(tag);
        tagEl.addEventListener("click", (e) => {
          e.stopPropagation();
          cb.current.onSelect?.(agent.id);
        });
        const entry = {
          agent,
          dept: room.dept,
          ...cat,
          desk,
          seat,
          tagEl,
          pos: seat.clone(),
          target: seat.clone(),
          facing: 0,
          mode: "sleep",
          say: "",
          sayUntil: 0,
          phase: Math.random() * 6,
          screenOn: null,
        };
        cats.set(agent.id, entry);
        everyone.push(entry);
      });
    });
    // meeting seats around the round table, in staff order
    everyone.forEach((c, i) => {
      const a = (i / Math.max(1, everyone.length)) * Math.PI * 2 + Math.PI / 2;
      c.meet = new THREE.Vector3(Math.cos(a) * 2.45, 0.08, Math.sin(a) * 1.85);
      c.meetFacing = Math.atan2(-c.meet.x, -c.meet.z);
    });

    // --- camera moves ------------------------------------------------------
    const tween = { active: false };
    function flyTo(target, zoom, ms = 900) {
      tween.active = true;
      tween.t0 = performance.now();
      tween.ms = ms;
      tween.fromT = controls.target.clone();
      tween.toT = target.clone();
      tween.fromZ = camera.zoom;
      tween.toZ = zoom;
      tween.offset = camera.position.clone().sub(controls.target);
    }
    // Fit the whole plate into the part of the frame the cards leave free.
    const SIDE = () => (W() > 980 ? 350 : 0);
    function homeView() {
      const probe = camera.clone();
      probe.position.copy(OFFSET);
      probe.lookAt(0, 0, 0);
      probe.zoom = 1;
      probe.updateMatrixWorld();
      probe.updateProjectionMatrix();
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          for (const y of [-0.8, WALL_H + 1.4]) {
            const v = new THREE.Vector3(
              (sx * plateW) / 2,
              y,
              (sz * plateD) / 2,
            ).project(probe);
            minX = Math.min(minX, v.x);
            maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y);
            maxY = Math.max(maxY, v.y);
          }
      const free = (W() - SIDE()) / W();
      const zoom =
        Math.min((2 * free) / (maxX - minX), 2 / (maxY - minY)) * 1.06;
      // slide the plate left so it sits centred in the free area
      const right = new THREE.Vector3().setFromMatrixColumn(probe.matrixWorld, 0);
      const worldPerNdc = (camera.right - camera.left) / 2 / zoom;
      const shift = (1 - free) * worldPerNdc;
      const target = right.multiplyScalar(shift);
      return { zoom, target };
    }
    function fitZoom() {
      return homeView().zoom;
    }

    // --- picking ------------------------------------------------------------
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down = null;
    const onDown = (e) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (!hit) return;
      let o = hit.object;
      while (o && !o.userData.agentId && !o.userData.deptId) o = o.parent;
      if (o?.userData.agentId) cb.current.onSelect?.(o.userData.agentId);
      else if (o?.userData.deptId) cb.current.onFocus?.(o.userData.deptId);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    // --- loop ---------------------------------------------------------------
    const clock = new THREE.Clock();
    let raf = 0;
    const tmp = new THREE.Vector3();
    function frame() {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(0.1, clock.getDelta());
      const t = clock.elapsedTime;
      if (tween.active) {
        const k = Math.min(1, (performance.now() - tween.t0) / tween.ms);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        controls.target.lerpVectors(tween.fromT, tween.toT, e);
        camera.zoom = tween.fromZ + (tween.toZ - tween.fromZ) * e;
        camera.position.copy(controls.target).add(tween.offset);
        camera.updateProjectionMatrix();
        if (k >= 1) tween.active = false;
      }
      controls.update();
      orb.rotation.y += dt * 0.4;
      orb.material.emissiveIntensity = 0.45 + Math.sin(t * 2) * 0.15;
      const now = performance.now();
      cats.forEach((c) => {
        // walking
        tmp.copy(c.target).sub(c.pos);
        tmp.y = 0;
        const dist = tmp.length();
        const walking = dist > 0.05;
        if (walking) {
          const step = Math.min(dist, dt * 2.6);
          tmp.normalize();
          c.pos.addScaledVector(tmp, step);
          c.facing = Math.atan2(tmp.x, tmp.z);
        } else {
          c.pos.copy(c.target);
          c.facing = c.atTable ? c.meetFacing : 0;
        }
        const hop = walking ? Math.abs(Math.sin(t * 11 + c.phase)) * 0.14 : 0;
        c.group.position.set(c.pos.x, c.target.y + hop, c.pos.z);
        const cur = c.group.rotation.y;
        let diff = c.facing - cur;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        c.group.rotation.y = cur + diff * Math.min(1, dt * 8);
        // posture
        const asleep = c.mode === "sleep" && !walking;
        c.eyesOpen.visible = !asleep;
        c.eyesShut.visible = asleep;
        const breath = Math.sin(t * (asleep ? 1.4 : 2.2) + c.phase);
        c.body.scale.y = 1 + breath * (asleep ? 0.035 : 0.015);
        c.head.rotation.x = asleep ? 0.42 + breath * 0.03 : walking ? 0 : -0.05;
        c.head.rotation.z = asleep ? 0.18 : Math.sin(t * 0.7 + c.phase) * 0.05;
        c.head.position.y = asleep ? 0.95 : 1.05;
        const typing = c.mode === "work" && !walking && !c.atTable;
        c.paws.forEach((p, i) => {
          p.position.y =
            PAW_Y + (typing ? Math.max(0, Math.sin(t * 16 + i * Math.PI)) * 0.06 : 0);
          p.visible = !walking;
        });
        c.tail.rotation.y = Math.sin(t * (asleep ? 0.8 : 2.4) + c.phase) * 0.35;
        const ring = c.ring.material;
        ring.opacity = c.selected ? 0.55 + Math.sin(t * 4) * 0.25 : 0;
        // the laptop lights up only for whoever is working at it
        const on = c.mode === "work" && !c.atTable;
        if (on !== c.screenOn) {
          c.screenOn = on;
          redraw(c.desk.screenTex, drawScreen(on, c.dept.color, c.phase * 10));
        }
        if (on && Math.floor(t * 3 + c.phase) !== c.lastBlink) {
          c.lastBlink = Math.floor(t * 3 + c.phase);
          redraw(
            c.desk.screenTex,
            drawScreen(true, c.dept.color, c.lastBlink),
          );
        }
        c.tagEl.classList.toggle("is-saying", c.sayUntil > now);
      });
      scene.traverse((o) => {
        if (o.userData.blink !== undefined)
          o.visible = Math.sin(t * 3 + o.userData.blink * 1.7) > -0.4;
      });
      renderer.render(scene, camera);
      labels.render(scene, camera);
    }

    const resize = () => {
      const a = W() / H();
      camera.left = (-frustum * a) / 2;
      camera.right = (frustum * a) / 2;
      camera.top = frustum / 2;
      camera.bottom = -frustum / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
      labels.setSize(W(), H());
      world.current?.home?.(true);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    {
      const h = homeView();
      camera.zoom = h.zoom;
      controls.target.copy(h.target);
      camera.position.copy(h.target).add(OFFSET);
      camera.updateProjectionMatrix();
    }

    world.current = {
      rooms,
      cats,
      orbEl,
      flyTo,
      home: (instant) => {
        const h = homeView();
        if (instant) {
          controls.target.copy(h.target);
          camera.position.copy(h.target).add(OFFSET);
          camera.zoom = h.zoom;
          camera.updateProjectionMatrix();
        } else {
          flyTo(h.target, h.zoom);
          tween.offset = OFFSET.clone();
        }
      },
      fitZoom,
      framed: (point, zoom) => {
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
        right.y = 0;
        right.normalize();
        const worldPerNdc = (camera.right - camera.left) / 2 / zoom;
        return point.clone().add(right.multiplyScalar((SIDE() / W()) * worldPerNdc));
      },
      table,
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        const m = o.material;
        if (m && m.map) m.map.dispose();
      });
      renderer.dispose();
      el.innerHTML = "";
      world.current = null;
    };
    // the scene is rebuilt only when the staff list itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffKey]);

  // --- live state ------------------------------------------------------------
  const meeting = running && MEETING.test(phase || "");
  const lastEvent = useRef(null);
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    const agentById = new Map(agents.map((a) => [a.id, a]));
    // rooms: whiteboard numbers and the floor line
    w.rooms.forEach((room, id) => {
      const team = agents.filter((a) => deptOf(a) === id);
      const ids = new Set(team.map((a) => a.id));
      const mine = tasks.filter((t) => ids.has(t.ownerId));
      const counts = {
        doing: mine.filter((t) => t.status === "in_progress").length,
        next: mine.filter((t) => t.status === "backlog").length,
        done: mine.filter((t) => t.status === "done").length,
        output: artifacts.filter((a) => ids.has(a.ownerId)).length,
      };
      const awake = running
        ? team.filter((a) => a.status === "working").length
        : 0;
      const line = `${team.length} ajan · ${awake} çalışıyor`;
      const key = JSON.stringify(counts) + line;
      if (room.last !== key) {
        room.last = key;
        redraw(room.boardTex, drawBoard(counts, room.dept.color));
        redraw(room.labelTex, drawFloorLabel(room.dept.name, line, room.dept.color));
      }
    });
    w.orbEl.innerHTML = `<i></i>ORTAK HAFIZA <b>${memoryCount}</b> öğrenim`;
    w.orbEl.style.opacity = meeting ? "0" : "1";
    // cats: who is awake, who walks to the table
    const top = events[0];
    const fresh = top && top.id !== lastEvent.current;
    if (fresh && lastEvent.current !== null && top.agentId) {
      const c = w.cats.get(top.agentId);
      if (c) {
        c.say = String(top.message || "").replace(/\s*\[[^\]]+\]\s*$/, "");
        c.sayUntil = performance.now() + 7000;
      }
    }
    if (top) lastEvent.current = top.id;
    w.cats.forEach((c, id) => {
      const a = agentById.get(id) || c.agent;
      c.agent = a;
      const working = running && a.status === "working";
      c.mode = running && (working || meeting) ? "work" : "sleep";
      c.atTable = meeting;
      c.target.copy(meeting ? c.meet : c.seat);
      if (meeting) c.target.y = 0.08;
      c.selected = selected === id;
      const status = !running
        ? "uyuyor"
        : meeting
          ? "toplantıda"
          : working
            ? "çalışıyor"
            : "sırada";
      const el = c.tagEl;
      el.dataset.status = status;
      el.style.setProperty("--dept", c.dept.color);
      el.querySelector(".hq-tag-name").textContent = a.name;
      el.querySelector(".hq-tag-line em").textContent = `${a.role} · ${status}`;
      const say = el.querySelector(".hq-tag-say");
      // Only the latest speaker and the selected cat talk; a room full of
      // bubbles reads as noise.
      const wanted =
        c.sayUntil > performance.now()
          ? c.say
          : c.selected && running && a.task
            ? a.task
            : "";
      say.textContent = wanted.length > 110 ? wanted.slice(0, 108) + "…" : wanted;
      if (c.selected && running && a.task) c.sayUntil = performance.now() + 4000;
      el.classList.toggle("is-dim", Boolean(focus) && c.dept.id !== focus);
      el.classList.toggle("is-selected", c.selected);
    });
  }, [agents, tasks, artifacts, events, running, meeting, memoryCount, focus, selected]);

  // --- camera follows focus / selection -------------------------------------
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    if (selected && w.cats.get(selected)) {
      const c = w.cats.get(selected);
      const z = w.fitZoom() * 3.6;
      w.flyTo(w.framed(c.target.clone().setY(1.2), z), z, 1000);
    } else if (focus) {
      const dept = DEPARTMENTS.find((d) => d.id === focus);
      if (dept) {
        const z = w.fitZoom() * 2.5;
        w.flyTo(w.framed(roomCentre(dept), z), z, 900);
      }
    } else {
      w.home(false);
    }
  }, [focus, selected, homeSignal, staffKey]);

  return <div className="hq-stage" ref={host} />;
}
