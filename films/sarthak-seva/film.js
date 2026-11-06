// सार्थक ऑनलाइन सेवा केंद्र — the film. A pure function of time: renderFilm(ctx, t).
// Shots and timings follow TREATMENT.md; every number that drives sound lives in timeline.js / events().
import { setClock, shape, plane, ink, rays, ellipse, rect, rrect, spline, move, xform, star, sparkle, text, measure, arrow, dashed,
  paperFinish, kidney, boomerang, subpath, pointAt, plen, clamp, lerp, seg, ss, eo, eio, back, twos, TAU, hash, LW, HOLD, REG } from './engine/toon.js';
import { P, drawSon, drawMaa, drawBhai, drawDost, drawOperator, drawHand, armJoints, blendPose, ikArm, toLocal, toScreen } from './engine/cast.js';
import * as PR from './engine/props.js';
import { W, H, BEAT, bar, DUR, HOLD_AT, VO, SEC, captionCues } from './timeline.js';

let DURS = {}, WORDS = {}, ENV = {}, CUES = [], EVS = [];
export function setup(lines, durs, words, env) { DURS = durs; WORDS = words; ENV = env; CUES = captionCues(lines, durs, words); buildEvents(); }
export const events = () => EVS;
export const cues = () => CUES;

// ------------------------------------------------------------------ helpers
const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, k) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const tint = (c, k) => mix(c, '#FFFFFF', k), shade = (c, k) => mix(c, '#2A211B', k);
const pop = (t, t0, d = 0.28) => back(seg(t, t0, t0 + d), 1.9);
const tw = t => twos(t);
function cam(ctx, c) { ctx.translate(W / 2, H / 2); ctx.scale(c.z, c.z); ctx.rotate(c.r || 0); ctx.translate(-c.cx, -c.cy); LW.k = 1 / c.z; }
const w2s = (x, y, c) => { const dx = x - c.cx, dy = y - c.cy, co = Math.cos(c.r || 0), si = Math.sin(c.r || 0); return [W / 2 + c.z * (co * dx - si * dy), H / 2 + c.z * (si * dx + co * dy)]; };
function withCam(ctx, c, fn) { ctx.save(); cam(ctx, c); fn(); ctx.restore(); LW.k = 1; }
function room(ctx, wall, floorY, floorCol) {
  ctx.fillStyle = wall; ctx.fillRect(-3000, -3000, 7080, 7920);
  plane(ctx, rect(-3000, floorY, 7080, 4000), floorCol);
  ink(ctx, [[-60, floorY], [W + 60, floorY]], 5, { seed: 31, breaks: 0.22, taper: false });
}
// lip sync: mouth openness for whoever speaks, on twos
function mouthOf(who, t) {
  const v = VO.find(v => v.who === who && t >= v.t && t < v.t + (DURS[v.id] ?? 0)); if (!v) return 0;
  const e = ENV[v.id] || []; return e[Math.min(e.length - 1, Math.floor(tw(t - v.t) * 24))] || 0;
}
// blinks, deterministic: one every 2.6–4.2 s per character
function blink(t, seed) {
  const T = tw(t); let b = 0.4 + hash(seed) * 2;
  while (b < T + 1) { if (T >= b && T < b + 0.13) return 1; b += 2.6 + hash(seed, Math.floor(b)) * 1.6; }
  return 0;
}
// pose keys on twos: [[t, pose, d]] — d = blend time into this key (default one in-between)
function keyed(t, keys) {
  const T = tw(t); let i = keys.length - 1; while (i > 0 && T < keys[i][0]) i--;
  const [t0, p0, d = 1 / 12] = keys[i];
  if (i === 0 || T >= t0 + d) return { ...p0 };
  const k = d <= 1 / 12 + 1e-6 ? 0.5 : ss(seg(T, t0 - 1e-6, t0 + d));
  return blendPose(keys[i - 1][1], p0, k);
}
// text registry for readcheck (window.TEXTS): every world text, with its screen box
let TX = [], REGTX = true;
function say(ctx, id, str, x, y, o = {}) {
  text(ctx, str, x, y, o);
  if (!REGTX || (o.alpha ?? 1) < 0.99) return;
  ctx.save(); ctx.font = o.font || '64px Body'; if (o.track) ctx.letterSpacing = o.track + 'px';
  const m = ctx.measureText(str); let w = m.width; if (o.maxW && w > o.maxW) w = o.maxW;
  ctx.restore();
  const al = o.align || 'left', x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x;
  const asc = m.actualBoundingBoxAscent || 40, des = m.actualBoundingBoxDescent || 10;
  const M = ctx.getTransform(); const pts = [[x0, y - asc], [x0 + w, y - asc], [x0, y + des], [x0 + w, y + des]].map(([a, b]) => [M.a * a + M.c * b + M.e, M.b * a + M.d * b + M.f]);
  TX.push({ id, text: str, x0: Math.min(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), x1: Math.max(...pts.map(p => p[0])), y1: Math.max(...pts.map(p => p[1])) });
}
export function texts() { return TX.filter(b => b.x0 >= 0 && b.y0 >= 0 && b.x1 <= W && b.y1 <= H); }

// ------------------------------------------------------------------ the style's furniture
function caption(ctx, t) {
  const cue = CUES.find(c => t >= c.t0 && t < c.t1); if (!cue) return;
  const a = Math.min(ss(seg(t, cue.t0, cue.t0 + 0.16)), 1 - ss(seg(t, cue.t1 - 0.12, cue.t1)));
  const font = '500 46px Body', maxW = 860;
  const words = cue.text.split(' '); let lines = [cue.text];
  if (measure(ctx, cue.text, font) > maxW) {
    let best = null;
    for (let k = 1; k < words.length; k++) { const a = words.slice(0, k).join(' '), b = words.slice(k).join(' '), m = Math.max(measure(ctx, a, font), measure(ctx, b, font)); if (!best || m < best.m) best = { m, l: [a, b] }; }
    lines = best.l;
  }
  const lw = Math.max(...lines.map(l => measure(ctx, l, font))), w = lw + 130, h = 34 + lines.length * 60, x = W / 2 - w / 2, y = 1700 - h;
  const tr = Math.min(t, HOLD_AT) * 0.8;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 10);
  shape(ctx, rrect(x, y, w, h, 14), { fill: P.paper, line: 3.2, seed: 901, grain: 0.15, breaks: 0.08, off: [5, 5] });
  star(ctx, x + 32, y + h / 2, 15, { n: 8, inner: 0.4, fill: P.mustard, off: [0, 0], rot: tr });
  star(ctx, x + w - 32, y + h / 2, 15, { n: 8, inner: 0.4, fill: P.mustard, off: [0, 0], rot: -tr });
  lines.forEach((l, i) => text(ctx, l, W / 2, y + 62 + i * 60, { font, fill: P.ink, align: 'center' }));
  ctx.restore();
}
// numbered medallion stamped on the outgoing scene (one beat before its iris)
function medallion(ctx, t, tStamp, x, y, i, r = 112) {
  const k = pop(t, tStamp, 0.24); if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate((1 - k) * 0.4);
  star(ctx, 0, 0, r * 1.22, { n: 16, inner: 0.84, fill: P.white, off: [0, 0], rot: i * 0.2 });
  shape(ctx, ellipse(0, 0, r, r, 64), { fill: STEP[i].g, line: 5, seed: 730 + i, grain: 0.3 });
  text(ctx, String(i + 1), 0, r * 0.4, { font: `400 ${Math.round(r * 1.15)}px Title`, fill: P.ink, plate: P.white, off: [5, 5], align: 'center' });
  ctx.restore();
}
function stepHeader(ctx, t, i, t0) {
  const k = eo(seg(tw(t), t0 + 0.05, t0 + 0.4)); if (k <= 0) return;
  ctx.save(); ctx.translate(-(1 - k) * 700, 0); const R = REGTX; REGTX = R && k >= 1;
  shape(ctx, ellipse(116, 214, 64, 64, 40), { fill: P.ink, line: 0, seed: 700, grain: 0.1, off: [0, 0] });
  say(ctx, 'hn' + i, String(i + 1), 116, 242, { font: '400 76px Title', fill: P.paper, align: 'center' });
  say(ctx, 'hs' + i, `सेवा ${i + 1} / 5`, 206, 176, { font: '600 30px Body', fill: P.ink, track: 4 });
  say(ctx, 'ht' + i, STEP[i].title, 204, 262, { font: '400 70px Title', fill: P.ink, plate: P.white, off: [4, 4], maxW: 840 });
  REGTX = R; ctx.restore();
}
function tag(ctx, t, t0, id, str, cx, y, o = {}) {
  const k = pop(t, t0); if (k <= 0) return;
  const font = `600 ${o.px || 40}px Body`, w = measure(ctx, str, font) + 100, h = 76, X = cx - w / 2;
  ctx.save(); ctx.translate(cx, y + h / 2); ctx.scale(k, k); ctx.translate(-cx, -(y + h / 2));
  shape(ctx, rrect(X, y, w, h, 14), { fill: P.paper, line: 3.6, seed: 710, grain: 0.15, off: [6, 5] });
  star(ctx, X + 40, y + h / 2, 18, { n: 8, inner: 0.42, fill: P.mustard, off: [0, 0], rot: Math.min(t, HOLD_AT) * 0.6 });
  const R = REGTX; REGTX = R && k >= 0.999; say(ctx, id, str, X + 70, y + 52, { font, fill: P.ink }); REGTX = R;
  ctx.restore();
}
function callout(ctx, t, t0, cx, cy, r, inner, bgc, leader) {
  const k = back(seg(t, t0, t0 + 0.32), 1.5); if (k <= 0) return;
  const R = r * k;
  if (leader) { const a = Math.atan2(leader[1][1] - leader[0][1], leader[1][0] - leader[0][0]); const ln = Array.from({ length: 24 }, (_, j) => [lerp(leader[0][0], leader[1][0], j / 23), lerp(leader[0][1], leader[1][1], j / 23)]); dashed(ctx, ln, 6, 16, 10, -t * 40, P.ink, clamp(k)); shape(ctx, ellipse(leader[1][0], leader[1][1], 9, 9, 12), { fill: P.ink, line: 0, off: [0, 0], grain: 0 }); }
  shape(ctx, ellipse(cx, cy, R + 16, R + 16, 72), { fill: P.paper, line: 4.5, seed: 720, grain: 0.15, breaks: 0.05 });
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  ctx.fillStyle = bgc; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.translate(cx, cy); ctx.scale(k, k); const RG = REGTX; REGTX = RG && k >= 0.999; inner(ctx); REGTX = RG; ctx.restore();
  ink(ctx, ellipse(cx, cy, R, R, 72), 4.5, { closed: true, seed: 721, breaks: 0.1 });
}
function speedLines(ctx, k, seed) {
  if (k <= 0) return;
  for (let i = 0; i < 14; i++) { const y = 200 + hash(i, seed) * 1500, x = hash(i, seed + 1) * W, L = 200 + hash(i, seed + 2) * 500;
    ink(ctx, [[x, y], [x + L, y]], 5 + hash(i, seed + 3) * 6, { seed: seed + i, alpha: 0.45 * k, taper: true }); }
}

// ------------------------------------------------------------------ S1 the problem (0 – 7.75)
const OFF = { bank: [190, 470], pf: [540, 372], samagra: [890, 470] };
const TANGLE = spline([[540, 664], [460, 606], [300, 616], [196, 566], [150, 500], [226, 446], [330, 520], [420, 470], [540, 430], [656, 476], [764, 526],
  [884, 560], [936, 498], [862, 440], [760, 470], [700, 566], [600, 606], [482, 562], [380, 626], [270, 664], [196, 622], [256, 556], [400, 540], [560, 518],
  [720, 604], [830, 646], [920, 610], [960, 540]], false, 8);
function holdStackPose(t) { return { armF: { a1: 1.42, a2: -2.55 }, fsF: 0.48, armB: { a1: 1.72, a2: -0.6 }, fsB: 0.48, handF: 'grip', handB: 'grip' }; }
function sceneProblem(ctx, t) {
  const k = eio(seg(t, 1.25, 2.25));
  const c = { z: lerp(2.3, 1, k) + 0.02 * seg(t, 2.25, 7.75), cx: lerp(560, 540, k), cy: lerp(900, 960, k) };
  withCam(ctx, c, () => {
    room(ctx, '#BCD2D6', 1478, '#86A6AD');
    // offices pop with each errand; dashed routes run from each person to an office
    const items = [['bank', 1.30, 'बैंक', [236, 716]], ['samagra', 2.46, 'समग्र ऑफिस', [846, 722]], ['pf', 3.98, 'PF ऑफिस', [540, 668]]];
    items.forEach(([kind, t0, label, from]) => {
      const kk = pop(t, t0); if (kk <= 0) return;
      const [ox, oy] = OFF[kind];
      const route = spline([from, [lerp(from[0], ox, 0.5) + (ox < 540 ? -30 : ox > 540 ? 30 : 40), lerp(from[1], oy, 0.5)], [ox, oy + 70]], false, 10);
      dashed(ctx, route, 5, 16, 12, 0, P.ink, seg(t, t0 + 0.05, t0 + 0.45));
      ctx.save(); ctx.translate(ox, oy); ctx.scale(kk, kk); ctx.translate(-ox, -oy);
      PR.office(ctx, kind, ox, oy, 0.82);
      const font = '600 30px Body', w = measure(ctx, label, font) + 40;
      shape(ctx, rrect(ox - w / 2, oy + 12, w, 48, 10), { fill: P.paper, line: 3, seed: 440 + t0 * 10, off: [4, 4] });
      const R = REGTX; REGTX = R && kk >= 0.999; say(ctx, 'lab_' + kind, label, ox, oy + 47, { font, fill: P.ink, align: 'center' }); REGTX = R;
      ctx.restore();
    });
    // "कहाँ-कहाँ भटकूँ?": the wandering, one long dashed scribble
    const u = seg(t, 5.72, 6.95);
    if (u > 0) dashed(ctx, TANGLE, 5, 16, 11, 0, P.coralD, u);
    const sl = ss(seg(tw(t), 6.95, 7.12));
    // the mother and the brother
    const maaFace = t < 1.3 ? 'smile' : 'worried', maaLook = t > 0.55 && t < 1.25 ? [4, 7] : t >= 1.3 ? [7, 1] : [0, 0];
    drawMaa(ctx, { x: 230, y: 1500, s: 1.4, view: 'front', face: maaFace, look: maaLook, blink: blink(t, 3) });
    drawBhai(ctx, { x: 852, y: 1500, s: 1.4, view: 'front', face: t < 2.46 ? 'neutral' : 'worried', look: t > 0.55 && t < 1.25 ? [-4, 7] : [-7, 1], blink: blink(t, 5) });
    // the son and his stack
    let look = [0, -3], face = 'worried';
    if (t >= 0.55 && t < 0.8) { look = [6, 7]; face = 'wow'; }
    else if (t >= 1.3 && t < 2.46) look = [-7, 0]; else if (t >= 2.46 && t < 3.98) look = [7, 0]; else if (t >= 3.98 && t < 5.72) look = [0, 5];
    else if (t >= 5.72 && t < 6.95) look = [Math.floor(tw(t) * 4) % 2 ? 7 : -7, -2];
    if (t >= 6.95) { face = 'sad'; look = [0, 6]; }
    const son = { x: 540, y: 1512, s: 1.45, view: 'front', face, look, blink: blink(t, 1), mouth: mouthOf('son', t), slump: sl, ...holdStackPose(t),
      held: g => { PR.paperStack(g, 0, -286 + sl * 8, 0.62, { droop: sl }); if (t < 0.25) PR.passbook(g, 4, -392, 0.62); } };
    drawSon(ctx, son, t);
    // the passbook slips, falls and lies on the floor
    if (t >= 0.25) {
      let x, y, r;
      const a = seg(t, 0.25, 0.55), b = seg(t, 0.55, 0.75);
      if (t < 0.55) { x = lerp(546, 640, ss(a)); y = lerp(944, 962, a); r = lerp(0, 0.5, a); }
      else if (t < 0.75) { x = lerp(640, 668, b); y = lerp(962, 1486, b * b); r = lerp(0.5, 1.3, b); }
      else { const bb = seg(t, 0.75, 0.9); x = 668 + bb * 6; y = 1486 - Math.sin(bb * Math.PI) * 18; r = lerp(1.3, 1.62, bb); }
      ctx.save(); ctx.translate(x, y); ctx.scale(1, t >= 0.75 ? 0.55 : 1); PR.passbook(ctx, 0, 0, 0.9, r); ctx.restore();
    }
  });
}

// ------------------------------------------------------------------ S2 the friend (7.75 – 12.25)
function sceneFriend(ctx, t) {
  const c = { z: 1 + 0.06 * ss(seg(t, 8.0, 11.75)), cx: 560, cy: 1010 };
  withCam(ctx, c, () => {
    room(ctx, '#F0BBA5', 1530, '#D98C72');
    sparkle(ctx, 180, 420, 40, { fill: P.white, rot: 0.2 }); sparkle(ctx, 930, 360, 28, { fill: P.white });
    const sonPose = { x: 330, y: 1600, s: 1.62, view: 'q', dir: 1 };
    const sl = 0.3 * (1 - ss(seg(tw(t), 7.95, 8.3)));
    let sFace = t < 8.25 ? 'sad' : t < 9.28 ? 'worried' : t < 10.0 ? 'wow' : t < 11.6 ? 'smile' : 'happy';
    const sLook = t < 8.25 ? [0, 6] : t < 11.6 ? [5, -3] : [8, -4];
    drawSon(ctx, { ...sonPose, face: sFace, look: sLook, slump: sl, blink: blink(t, 1), armF: { a1: 1.56, a2: 0.02 }, fsF: 0.85, handF: 'grip',
      held: g => PR.paperStack(g, 84, -290, 0.52) }, t);
    // the friend: pat on the shoulder → one finger up → shrug → turn and point
    const base = { x: 768, y: 1610, s: 1.62, view: 'q', dir: -1 };
    
    const lift = t < 7.83 ? 0 : t < 7.92 ? 8 : t >= 8.17 && t < 8.25 ? 10 : 0;
    const L2 = toLocal(base, 424, 1058 - lift * 1.62), onSh2 = ikArm('dost', base, 'F', L2[0], L2[1], 1);
    const keys = [
      [7.70, { armF: onSh2, handF: 'flat' }],
      [8.85, { armF: { a1: 1.15, a2: 0.4 }, handF: 'open' }, 0.17],
      [9.10, { armF: { a1: 1.0, a2: -1.45 }, handF: 'point' }, 0.17],
      [10.62, { armF: { a1: 1.5, a2: 0.4 }, handF: 'open' }, 0.17],
      [10.90, { armF: { a1: 1.9, a2: -0.9 }, handF: 'open', handRotF: -1.0, armB: { a1: 1.9, a2: -2.2 }, handB: 'open', handRotB: 0.9 }, 0.17],
    ];
    let pose = keyed(t, keys);
    if (tw(t) < 8.85) pose.armF = onSh2;
    if (tw(t) >= 9.6 && tw(t) < 10.62) pose.armF = { a1: 1.0, a2: -1.45 + (Math.floor((t - 9.6) / BEAT) % 2 ? 0.06 : 0) };
    let dir = -1, view = 'q';
    if (tw(t) >= 11.58 && tw(t) < 11.66) view = 'front';
    if (tw(t) >= 11.66) { dir = 1; pose = { armF: { a1: -0.5, a2: -0.42 }, handF: 'point', armB: { a1: 1.86, a2: 1.68 } }; }
    const dFace = t < 7.9 ? 'smile' : t < 11.0 ? 'happy' : 'smile';
    drawDost(ctx, { ...base, ...pose, view, dir, face: view === 'front' ? 'happy' : dFace, mouth: mouthOf('dost', t), blink: blink(t, 4), look: dir === 1 ? [4, -3] : [0, 0] }, t);
  });
}

// ------------------------------------------------------------------ S3 the shop outside (12.25 – 15.6) and inside (15.35 – 17.75)
const DOOR = [668, 1338];
function shopCam(t) { const k = eio(seg(t, 15.0, 15.6)); return { z: lerp(1 + 0.02 * seg(t, 12.25, 15), 2.4, k), cx: lerp(540, DOOR[0], k), cy: lerp(960, DOOR[1], k) }; }
function sceneExterior(ctx, t) {
  const c = shopCam(t);
  withCam(ctx, c, () => {
    ctx.fillStyle = P.paper; ctx.fillRect(-3000, -3000, 7080, 7920);
    rays(ctx, 640, 960, 28, 1500, P.mustardL, { alpha: 0.35 * clamp(pop(t, 12.25)), rot: Math.min(t, 20) * 0.04, r0: 0 });
    sparkle(ctx, 860, 430, 46, { fill: P.white }); sparkle(ctx, 300, 520, 30, { fill: P.white, rot: 0.3 });
    plane(ctx, rect(-3000, 1180, 7080, 400), '#E1CFA6');
    ink(ctx, [[-40, 1180], [W + 40, 1180]], 5, { seed: 32, breaks: 0.25, taper: false });
    PR.tree(ctx, 70, 1180, 1.05, 512);
    PR.gate(ctx, 220, 1180, 0.74);
    const R = REGTX; REGTX = R && c.z < 1.05;
    say(ctx, 'gate', 'जनपद पंचायत बुधनी', 220, 1180 - 500 * 0.74, { font: '400 50px Title', fill: P.paper, align: 'center', maxW: 390 * 0.74 / 0.74 * 0.74 });
    REGTX = R;
    plane(ctx, rect(-3000, 1480, 7080, 800), '#8FA3A0');
    ink(ctx, [[-40, 1480], [W + 40, 1480]], 5, { seed: 33, breaks: 0.2, taper: false });
    for (let i = 0; i < 6; i++) ink(ctx, [[i * 220 - 60, 1700], [i * 220 + 60, 1700]], 10, { color: P.paper, seed: 34 + i, taper: false, alpha: 0.7 });
    const k = pop(t, 12.25, 0.3);
    PR.shopFront(ctx, 640, 1480, 0.95, { signK: k, inside: g => {
      PR.counter(g, -240, -150, 480, 150); drawOperator(g, { x: 30, y: 120, s: 0.5, view: 'front', face: 'smile' });
      PR.monitor(g, -150, -150, 0.35, null); PR.clock(g, 170, -280, 34, 10.15);
    } });
    const R2 = REGTX; REGTX = R2 && k >= 0.999 && c.z < 1.05;
    if (k > 0) {
      ctx.save(); ctx.translate(640, 1480 - 540 * 0.95); ctx.scale(0.95 * k, 0.95 * k); ctx.rotate((1 - k) * 0.3);
      say(ctx, 'sign1', 'सार्थक', 0, -6, { font: '400 92px Title', fill: P.paper, align: 'center', plate: P.tealDD, off: [4, 4] });
      say(ctx, 'sign2', 'ऑनलाइन सेवा केंद्र', 0, 64, { font: '400 50px Title', fill: P.mustardL, align: 'center', plate: P.tealDD, off: [3, 3] });
      ctx.restore();
    }
    REGTX = R2;
  });
}
function opInsidePose(t) {
  const keys = [
    [0, { armF: { a1: 1.35, a2: 0.2 }, armB: { a1: 1.8, a2: 2.9 }, handF: 'flat', handB: 'flat', face: 'focus', look: [-5, 5] }],
    [16.25, { armF: { a1: 1.4, a2: 0.6 }, armB: { a1: 1.74, a2: 2.5 }, handF: 'open', handB: 'open', face: 'smile', look: [0, 0] }],
    [16.5, { armF: { a1: 1.47, a2: -2.42 }, armB: { a1: 1.67, a2: -0.72 }, handF: 'flat', handB: 'flat', handRotF: 0.85, handRotB: -0.85, face: 'happy', look: [0, 0], bow: 0.5 }, 0.17],
    [17.2, { armF: { a1: 1.4, a2: 0.6 }, armB: { a1: 1.74, a2: 2.5 }, handF: 'open', handB: 'open', face: 'smile', look: [0, 0], bow: 0 }, 0.17],
  ];
  return keyed(t, keys);
}
function sceneInterior(ctx, t) {
  const c = { z: 1 + 0.03 * seg(t, 15.4, 17.75), cx: 540, cy: 960 };
  withCam(ctx, c, () => {
    room(ctx, '#E8D3A8', 1760, '#C9A777');
    // a shelf of files, the wall clock
    shape(ctx, rect(70, 640, 360, 16), { fill: P.umber, line: 3.4, seed: 801 });
    [P.coral, P.teal, P.mustard, P.plum, P.olive, P.powder, P.tomato].forEach((col, i) => shape(ctx, rect(86 + i * 46, 520 - (i % 3) * 14, 36, 120 + (i % 3) * 14), { fill: col, line: 3, seed: 802 + i }));
    PR.clock(ctx, 900, 560, 84, 10.15, Math.floor(tw(t) / BEAT));
    drawOperator(ctx, { x: 540, y: 1772, s: 1.9, view: 'front', blink: blink(t, 6), ...opInsidePose(t) }, t);
    PR.counter(ctx, 20, 1290, 1040, 520);
    PR.monitor(ctx, 196, 1290, 0.9, null);
    PR.scanner(ctx, 730, 1290, 1.2, 0);
    PR.printer(ctx, 900, 1290, 0.8);
  });
}

// ------------------------------------------------------------------ S4 the five services (17.75 – 36.75)
const STEP = [
  { g: '#CFD59C', title: 'AePS बैंकिंग', tag: 'बिना लंबी लाइन के', who: 'maa' },
  { g: '#BED3D7', title: 'मनी ट्रांसफर', tag: 'किसी भी बैंक खाते में', who: 'son' },
  { g: '#E8D3A8', title: 'समग्र व संबल', tag: 'नाम सुधार · नया कार्ड', who: 'bhai' },
  { g: '#D6B6C8', title: 'PF सेवाएँ', tag: 'KYC · UAN · बैलेंस चेक', who: 'son' },
  { g: '#F2BBA6', title: 'खसरा व प्रमाण पत्र', tag: 'सभी सरकारी फॉर्म', who: 'dost' },
];
const CO = { x: 540, y: 730, r: 285 };
const SCAN = [470, 1452], MON = [660, 1452], PRN = [700, 1452];
const CUST = { maa: drawMaa, son: drawSon, bhai: drawBhai, dost: drawDost };
function sceneStep(ctx, t, i) {
  const T0 = SEC.steps[i], st = STEP[i];
  ctx.fillStyle = st.g; ctx.fillRect(0, 0, W, H);
  plane(ctx, rect(0, 1600, W, 400), shade(st.g, 0.14));
  ink(ctx, [[-40, 1600], [W + 40, 1600]], 5, { seed: 40 + i, breaks: 0.22, taper: false });
  // context: the counter, the operator behind it, the customer in front
  const op = { x: 860, y: 1772, s: 1.18, view: 'q', dir: -1, blink: blink(t, 6), face: 'smile', look: [0, 0] };
  const typing = (i === 1 && t > T0 + 0.4 && t < T0 + 1.2) || (i === 2 && t > T0 + 0.4 && t < T0 + 1.0);
  op.armF = typing ? { a1: 1.25, a2: 0.15 + (Math.floor(tw(t) * 12) % 2 ? 0.08 : -0.04) } : { a1: 1.3, a2: 0.35 };
  op.handF = typing ? 'point' : 'open';
  if (i === 0 && t >= T0 + 1.6) { const L = toLocal(op, 380, 1290); op.armF = ikArm('op', op, 'F', L[0], L[1], 1); op.handF = 'flat'; }
  if (i === 3 && t >= T0 + 0.5 && t < T0 + 1.3) { op.armF = { a1: 0.9, a2: -0.3 }; op.handF = 'grip'; }
  drawOperator(ctx, op, t);
  PR.counter(ctx, 380, 1452, 740, 330);
  if (i === 0) { PR.scanner(ctx, SCAN[0], SCAN[1], 0.9, t >= T0 + 0.5 && t < T0 + 1.6 ? 1 : 0); PR.monitor(ctx, 690, SCAN[1], 0.58, null); }
  else if (i === 4) PR.printer(ctx, PRN[0], PRN[1], 0.8, { busy: t > T0 + 0.6 && t < T0 + 2.1 });
  else PR.monitor(ctx, MON[0], MON[1], 0.62, g => { shape(g, rect(-120, -60, 240, 30), { fill: P.teal, line: 0, seed: 840, off: [0, 0] }); for (let k = 0; k < 3; k++) shape(g, rect(-110, -16 + k * 22, 160 - k * 30, 12), { fill: P.paper, line: 0, seed: 841 + k, off: [0, 0] }); });
  const who = st.who, cust = { x: 252, y: 1782, s: 1.2, view: 'q', dir: 1, blink: blink(t, 10 + i) };
  let face = 'smile', armF = null, handF = 'open', held = null, prop = null;
  if (i === 0) {
    if (t < T0 + 1.5) { const L = toLocal(cust, SCAN[0], SCAN[1] - 44 - (t < T0 + 0.5 ? 14 : 0)); armF = ikArm('maa', { ...cust }, 'F', L[0], L[1], 1); handF = 'thumb'; face = t < T0 + 0.5 ? 'focus' : 'smile'; }
    else { armF = { a1: 0.6, a2: -1.1 }; handF = 'grip'; face = t > T0 + 2.25 ? 'bliss' : 'happy';
      prop = { hand: 'F', draw: (g, J) => { for (let k = 0; k < 3; k++) if (t > T0 + 1.75 + k * 0.25) PR.note(g, J.ha[0] + 12 + k * 6, J.ha[1] - 40 - k * 6, 0.55, -1.2 + k * 0.25); } }; }
  } else if (i === 2) {
    face = t > T0 + 1.5 ? 'happy' : 'smile';
    if (t > T0 + 1.85) { armF = { a1: -0.2, a2: -1.3 }; handF = 'grip'; prop = { hand: 'F', draw: (g, J) => PR.card(g, J.ha[0] + 10, J.ha[1] - 66, 0.5, -0.1) }; }
  } else if (i === 1 || i === 3) {
    armF = { a1: 1.0, a2: 0.15 }; handF = 'flat'; face = (i === 1 && t > T0 + 2.5) || (i === 3 && t > T0 + 1.25) ? 'happy' : 'smile';
  } else { face = t > T0 + 1.9 ? 'happy' : 'smile'; armF = { a1: 1.0, a2: 0.2 }; handF = 'flat'; }
  const cp = { ...cust, face, look: [3, -2], armF: armF || undefined, handF, prop };
  CUST[who](ctx, cp, t);
  // the call-out
  const leaderTo = i === 0 ? [SCAN[0], SCAN[1] - 50] : i === 4 ? [PRN[0], PRN[1] - 90] : [MON[0], MON[1] - 140];
  const a = Math.atan2(leaderTo[1] - CO.y, leaderTo[0] - CO.x), from = [CO.x + Math.cos(a) * (CO.r + 18), CO.y + Math.sin(a) * (CO.r + 18)];
  callout(ctx, t, T0 + 0.12, CO.x, CO.y, CO.r, g => STEP_INNER[i](g, t, T0), tint(st.g, 0.45), [from, leaderTo]);
  tag(ctx, t, T0 + (i === 0 ? 1.0 : 0.5), 'tag' + i, st.tag, i === 0 ? 700 : 690, 1030);
}
const STEP_INNER = [
  // 1 AePS: thumb on the scanner, beep, then notes into the mother's palm
  (g, t, T0) => {
    const tb = T0 + 0.5;
    if (t < T0 + 1.5) {
      PR.scanner(g, 0, 190, 3.2, t >= tb ? 1 : 0, t >= tb ? 1 : 0);
      if (t >= tb) for (let k = 0; k < 3; k++) ink(g, ellipse(0, 4, 60 + k * 30 + seg(t, tb, tb + 0.4) * 40, 26 + k * 12, 40, 0, TAU), 3, { closed: true, seed: 870 + k, color: '#5DA862', alpha: 1 - seg(t, tb, tb + 0.7), taper: false });
      const hover = t < tb - 0.12 ? -60 : t < tb ? -84 : 0, sq = t >= tb && t < tb + 0.1 ? 0.94 : 1;
      g.save(); g.translate(0, hover); g.scale(1, sq);
      ink(g, [[-360, -250], [-160, -40]], 70, { seed: 880, taper: false }); ink(g, [[-360, -250], [-162, -42]], 56, { seed: 881, taper: false, color: P.skin.maa });
      [0, 1].forEach(k => ink(g, [[-206 + k * 15 - 36, -88 + k * 16 + 34], [-206 + k * 15 + 36, -88 + k * 16 - 34]], 10, { seed: 882 + k, taper: false, color: k ? P.teal : P.mustard }));
      drawHand(g, -160, -40, 0.82, 'thumb', 1, 3.3, P.skin.maa);
      g.restore();
      PR.check(g, 168, -150, 1.2, seg(t, tb + 0.25, tb + 0.5), '#3E8E4A');
    } else {
      drawHand(g, -70, 150, -0.55, 'open', -1, 3.1, P.skin.maa);
      for (let k = 0; k < 3; k++) {
        const tk = T0 + 1.75 + k * 0.25, u = eo(seg(t, tk, tk + 0.18));
        PR.note(g, lerp(190, -40 + k * 14, u), lerp(-80, 70 - k * 18, u), 1.15, lerp(-0.5, -0.25 + k * 0.12, u), k % 2 ? P.limeD : P.lime);
      }
      drawHand(g, 230, -60, Math.PI + 0.2, 'grip', 1, 3.0, P.skin.op);
      PR.check(g, 160, -170, 1.2, seg(t, T0 + 2.5, T0 + 2.75), '#3E8E4A');
    }
  },
  // 2 money transfer: a coin along the arrow from the shop to any bank
  (g, t, T0) => {
    shape(g, rrect(-250, -190, 500, 380, 20), { fill: P.ink, line: 0, seed: 890, off: [0, 0] });
    shape(g, rect(-230, -170, 460, 300), { fill: '#CFE0E2', line: 0, seed: 891, grain: 0.1 });
    PR.office(g, 'home', -150, 90, 0.62); PR.office(g, 'bank', 150, 100, 0.62);
    const u = seg(t, T0 + 0.85, T0 + 1.25);
    arrow(g, [-140, -40], [140, -40], { u, bend: -0.45, w: 7, fill: P.mustard, head: 30, dashedShaft: true, seed: 892 });
    const ct = seg(t, T0 + 1.0, T0 + 2.25);
    if (ct > 0 && ct < 1) { const pts = []; for (let k = 0; k <= 40; k++) { const s = k / 40, mx = 0, my = -40 - 0.45 * 280 * -1 * -1; pts.push([lerp(-140, 140, s), -40 - Math.sin(s * Math.PI) * 126]); } const p = pointAt(pts, eio(ct)); PR.coin(g, p.x, p.y, 34); }
    if (t >= T0 + 2.5) { star(g, 150, 10, 90 * pop(t, T0 + 2.5), { n: 12, inner: 0.6, fill: P.mustardL, off: [0, 0] }); PR.office(g, 'bank', 150, 100 - 12 * Math.sin(seg(t, T0 + 2.5, T0 + 2.8) * Math.PI), 0.62); }
    PR.check(g, 0, -120, 1.3, seg(t, T0 + 2.55, T0 + 2.8), '#3E8E4A');
  },
  // 3 Samagra and Sambal: e-KYC done, a new card pops out
  (g, t, T0) => {
    shape(g, rrect(-250, -210, 500, 250, 20), { fill: P.ink, line: 0, seed: 893, off: [0, 0] });
    shape(g, rect(-230, -190, 460, 210), { fill: '#CFE0E2', line: 0, seed: 894, grain: 0.1 });
    say(g, 'ekyc', 'e-KYC', -40, -110, { font: '400 64px Title', fill: P.ink, align: 'center' });
    shape(g, rrect(-190, -60, 380, 34, 10), { fill: P.paper, line: 3, seed: 895 });
    const pr = seg(t, T0 + 0.5, T0 + 1.0); if (pr > 0) shape(g, rrect(-186, -56, 372 * pr, 26, 8), { fill: P.teal, line: 0, seed: 896, off: [0, 0] });
    PR.check(g, 150, -125, 1.1, seg(t, T0 + 1.0, T0 + 1.2), '#3E8E4A');
    const k = pop(t, T0 + 1.5, 0.3);
    if (k > 0) { star(g, 0, 150, 150 * k, { n: 14, inner: 0.7, fill: P.mustardL, off: [0, 0], rot: Math.min(t, HOLD_AT) * 0.3 }); PR.card(g, 0, 150, 1.25 * k, -0.06);
      sparkle(g, 150, 70, 30 * k, { fill: P.white }); sparkle(g, -160, 230, 24 * k, { fill: P.white }); }
  },
  // 4 PF: the form gets its stamp, the padlock opens
  (g, t, T0) => {
    PR.pfForm(g, 0, 30, 1.25, -0.03);
    const ts = T0 + 1.0, open = ss(seg(t, ts + 0.25, ts + 0.5)), fade = 1 - seg(t, ts + 0.6, ts + 1.0);
    if (fade > 0) { g.save(); g.globalAlpha = fade; PR.padlock(g, 110, -110, 1.0, open); g.restore(); }
    if (t >= ts) {
      g.save(); g.translate(-30, 110); g.rotate(-0.15);
      shape(g, ellipse(0, 0, 74, 74, 40), { fill: null, line: 0 }); ink(g, ellipse(0, 0, 74, 74, 40), 8, { closed: true, seed: 897, color: P.coralD, breaks: 0.15 });
      PR.check(g, 0, 0, 1.1, 1, P.coralD); g.restore();
    }
    const down = t < ts - 0.35 ? -1 : t < ts ? 1 - eo(seg(t, ts - 0.35, ts)) : seg(t, ts + 0.1, ts + 0.45);
    if (down < 1 && t > T0 + 0.4) { const y = lerp(110, -420, down < 0 ? 1 : ss(down)); PR.rubberStamp(g, -30, y, 1.3); drawHand(g, -30, y - 160, -Math.PI / 2, 'grip', 1, 2.6, P.skin.op); }
  },
  // 5 khasra and certificates: the printer feeds them out
  (g, t, T0) => {
    const u1 = eo(seg(t, T0 + 0.85, T0 + 1.5)), u2 = eo(seg(t, T0 + 1.75, T0 + 2.0));
    PR.printer(g, 0, 250, 1.9, { busy: t < T0 + 2.1, behind: pg => {
      if (u2 > 0) PR.certificate(pg, 34, lerp(-30, -150, u2), 0.5, 0.08);
      if (u1 > 0) PR.khasra(pg, -30, lerp(-30, -158, u1), 0.5, -0.06);
    } });
    if (t > T0 + 2.0) { sparkle(g, 140, -180, 34 * pop(t, T0 + 2.0), { fill: P.white }); sparkle(g, -150, -120, 24 * pop(t, T0 + 2.05), { fill: P.white }); }
  },
];

// ------------------------------------------------------------------ S5 relief and the blessing (36.75 – 41.4)
const CLOCK = [880, 500, 88];
const HEART = ikArm('son', { view: 'q' }, 'F', 24, -330, 1);   // the son's hand on his heart
function reliefCam(t) {
  const k = eio(seg(t, 40.75, 41.2));
  return { z: lerp(1 + 0.04 * seg(t, 36.75, 40.75), 3.1, k), cx: lerp(560, CLOCK[0], k), cy: lerp(1150, CLOCK[1], k) };
}
function sceneRelief(ctx, t) {
  const c = reliefCam(t);
  withCam(ctx, c, () => {
    room(ctx, '#EBD2A6', 1760, '#D49A80');
    shape(ctx, rect(60, 600, 380, 16), { fill: P.umber, line: 3.4, seed: 811 });
    [P.teal, P.coral, P.mustard, P.olive, P.plum, P.powder].forEach((col, i) => shape(ctx, rect(76 + i * 52, 476 - (i % 3) * 14, 40, 124 + (i % 3) * 14), { fill: col, line: 3, seed: 812 + i }));
    PR.clock(ctx, CLOCK[0], CLOCK[1], CLOCK[2], 10.4, Math.floor(tw(Math.min(t, 40.25)) / BEAT));
    PR.counter(ctx, 640, 1240, 520, 520);
    PR.printer(ctx, 940, 1240, 0.6);
    // Maa blesses, the son bows with a hand on his heart
    const tb = 38.75;
    const maaKeys = [
      [0, { armF: { a1: 1.3, a2: 1.5 }, handF: 'open', face: 'smile' }],
      [tb - 0.17, { armF: { a1: 1.45, a2: 1.3 }, handF: 'open', face: 'smile' }, 0.12],
      [tb, { armF: { a1: 0.9, a2: -1.4 }, handF: 'flat', handRotF: -0.1, face: 'bliss' }, 0.12],          // the hand comes up by her own shoulder first
      [tb + 0.17, { armF: { a1: -0.72, a2: -1.3 }, handF: 'flat', handRotF: -0.2, face: 'bliss' }, 0.17],
    ];
    drawMaa(ctx, { x: 200, y: 1722, s: 1.45, view: 'q', dir: 1, blink: blink(t, 3), look: [3, -3], ...keyed(t, maaKeys) }, t);
    const sonKeys = [
      [0, { face: 'wow', bow: 0, armF: { a1: 1.4, a2: 1.3 }, handF: 'open' }],
      [37.6, { face: 'happy', bow: 0, armF: { a1: 1.4, a2: 1.3 }, handF: 'open' }],
      [39.0, { face: 'bliss', bow: 1, armF: HEART, handF: 'flat', handRotF: -1.2 }, 0.25],
    ];
    drawSon(ctx, { x: 600, y: 1735, s: 1.5, view: 'q', dir: -1, blink: blink(t, 1), mouth: mouthOf('son', t), look: [2, -2], ...keyed(t, sonKeys),
      armB: { a1: 1.62, a2: 1.55 }, handB: 'grip', prop: { hand: 'B', draw: (g, J) => PR.folder(g, J.ha[0] - 6, J.ha[1] - 10, 0.55, 0.1) } }, t);
    drawBhai(ctx, { x: 860, y: 1728, s: 1.38, view: 'front', face: 'happy', blink: blink(t, 5), look: [-3, 0],
      armF: { a1: 1.42, a2: -2.55 }, fsF: 0.5, armB: { a1: 1.72, a2: -0.6 }, fsB: 0.5, handF: 'grip', handB: 'grip', held: g => PR.card(g, 0, -300, 0.62, -0.04) }, t);
    drawDost(ctx, { x: 1045, y: 1740, s: 1.38, view: 'q', dir: -1, face: 'happy', blink: blink(t, 4), look: [0, 0] }, t);
  });
}

// ------------------------------------------------------------------ S5b–S6 the plan, the sunburst and the card (41.0 – 59.7)
const CEN = [540, 1000];
const STARTS = [[190, 560], [540, 300], [900, 590], [1000, 1010], [890, 1470], [540, 1700], [180, 1470], [70, 1000]];
const WANDER = STARTS.map((s, k) => {
  const pts = [s]; let [x, y] = s;
  for (let j = 1; j <= 5; j++) {
    const tx = lerp(s[0], CEN[0], j / 6) + (hash(k, j, 1) - 0.5) * 340, ty = lerp(s[1], CEN[1], j / 6) + (hash(k, j, 2) - 0.5) * 340;
    pts.push([tx, ty]);
    if (j === 3) { pts.push([tx + 60, ty - 40], [tx + 70, ty + 40], [tx - 10, ty + 30]); }
  }
  pts.push(STARTS[(k + 3) % 8]);
  return spline(pts, false, 8);
});
function straightOf(k, n) {
  const [sx, sy] = STARTS[k], a = Math.atan2(CEN[1] - sy, CEN[0] - sx), L = Math.hypot(CEN[0] - sx, CEN[1] - sy) - 150;
  return Array.from({ length: n }, (_, i) => [sx + Math.cos(a) * L * i / (n - 1), sy + Math.sin(a) * L * i / (n - 1)]);
}
function resample(pts, n) { return Array.from({ length: n }, (_, i) => { const p = pointAt(pts, i / (n - 1)); return [p.x, p.y]; }); }
const WANDER_R = WANDER.map(p => resample(p, 90));
function sceneBurst(ctx, t) {
  const tf = Math.min(t, HOLD_AT);
  const c = { z: 1 + 0.04 * seg(t, 41.2, 45.75), cx: 540, cy: 980 };
  withCam(ctx, c, () => {
    ctx.fillStyle = P.paper; ctx.fillRect(-3000, -3000, 7080, 7920);
    const fadeMap = 1 - ss(seg(t, 45.0, 45.9));
    // the town as a mid-century map: field kidneys, a pond, blocks
    if (fadeMap > 0) {
      ctx.save(); ctx.globalAlpha = fadeMap;
      shape(ctx, kidney(250, 800, 150, 0.3), { fill: P.lime, line: 3, seed: 950, grain: 0.3 });
      shape(ctx, kidney(820, 1240, 170, -0.4), { fill: P.lime, line: 3, seed: 951, grain: 0.3 });
      shape(ctx, boomerang(820, 820, 130, 0.5), { fill: P.powder, line: 3, seed: 952, grain: 0.3 });
      shape(ctx, rrect(330, 1190, 170, 120, 16), { fill: P.sand, line: 3, seed: 953 });
      shape(ctx, rrect(600, 660, 160, 110, 16), { fill: P.sand, line: 3, seed: 954 });
      // the Janpad campus next to the shop
      shape(ctx, rrect(420, 690, 240, 150, 18), { fill: P.lime, line: 3.4, seed: 955, grain: 0.3 });
      ctx.restore();
    }
    // sunburst
    const sb = ss(seg(t, 43.6, 44.2));
    if (sb > 0) rays(ctx, CEN[0], CEN[1], 30, 1500, P.mustardL, { alpha: 0.6 * sb, rot: tf * 0.05, r0: 60 });
    // the wandering: ghost tangle, then each path pulls straight to one door
    WANDER_R.forEach((pts, k) => {
      const ts = 42.0 + 0.25 * k, u = ss(seg(t, ts, ts + 0.3));
      const draw = seg(t, 41.2, 41.8);
      if (draw <= 0) return;
      const S = straightOf(k, pts.length), P2 = pts.map((p, i) => [lerp(p[0], S[i][0], u), lerp(p[1], S[i][1], u)]);
      if (u <= 0) dashed(ctx, P2, 5, 14, 11, 0, P.coralD, draw);
      else ink(ctx, P2, lerp(5, 9, u), { seed: 960 + k, taper: true, color: k % 2 ? P.tealD : P.coralD, wob: 0.15 });
    });
    if (fadeMap > 0) {
      ctx.save(); ctx.globalAlpha = fadeMap;
      PR.office(ctx, 'bank', STARTS[0][0], STARTS[0][1] + 60, 0.5); PR.office(ctx, 'samagra', STARTS[2][0], STARTS[2][1] + 60, 0.5);
      PR.office(ctx, 'pf', STARTS[6][0], STARTS[6][1] + 60, 0.5); PR.office(ctx, 'home', STARTS[4][0], STARTS[4][1] + 60, 0.5);
      [1, 3, 5, 7].forEach((k, j) => { ctx.save(); ctx.translate(STARTS[k][0], STARTS[k][1] + 34); ctx.scale(0.32, 0.32); PR.office(ctx, 'home', 0, 0, 1); ctx.restore(); });
      ctx.restore();
    }
    // the shop at the centre, then it settles into the card
    const m = ss(seg(t, 45.4, 46.0)), sx = lerp(CEN[0], 540, m), sy = lerp(CEN[1] + 60, 1110, m), ssz = lerp(0.48, 0.78, m);
    star(ctx, sx, sy - 90 * ssz / 0.48 * 0.6, lerp(140, 230, m) * clamp(pop(t, 43.75, 0.3)), { n: 16, inner: 0.72, fill: P.white, off: [0, 0], rot: tf * 0.1 });
    const R = REGTX; REGTX = false; PR.office(ctx, 'shop', sx, sy, ssz); REGTX = R;
  });
  if (t >= SEC.cta) cta(ctx, t);
}
function cta(ctx, t) {
  const tf = Math.min(t, HOLD_AT);
  // title plate
  const k = pop(t, SEC.cta, 0.3);
  if (k > 0) {
    ctx.save(); ctx.translate(540, 430); ctx.scale(k, k); ctx.rotate((1 - k) * 0.2); ctx.translate(-540, -430);
    shape(ctx, rrect(80, 250, 920, 360, 30), { fill: P.teal, line: 5, seed: 980, grain: 0.3, off: [9, 7] });
    star(ctx, 132, 300, 26, { n: 8, inner: 0.4, fill: P.mustard, off: [0, 0], rot: tf * 0.5 }); star(ctx, 948, 300, 26, { n: 8, inner: 0.4, fill: P.mustard, off: [0, 0], rot: -tf * 0.5 });
    const R = REGTX; REGTX = R && k >= 0.999;
    say(ctx, 'title1', 'सार्थक', 540, 455, { font: '400 170px Title', fill: P.paper, align: 'center', plate: P.tealDD, off: [6, 6] });
    say(ctx, 'title2', 'ऑनलाइन सेवा केंद्र', 540, 565, { font: '400 84px Title', fill: P.mustardL, align: 'center', plate: P.tealDD, off: [4, 4] });
    REGTX = R; ctx.restore();
  }
  // kicker writes on
  const wk = seg(t, 47.75, 48.6);
  if (wk > 0) {
    shape(ctx, rrect(100, 650, 880, 120, 60), { fill: P.paper, line: 3.6, seed: 984, off: [5, 5] });
    ctx.save(); ctx.beginPath(); ctx.rect(0, 640, 130 + 840 * wk, 160); ctx.clip();
    const R = REGTX; REGTX = R && wk >= 1;
    say(ctx, 'kicker2', 'आपकी सुविधा, हमारा विश्वास!', 540, 735, { font: '400 62px Kicker', fill: P.tealD, align: 'center', maxW: 820 });
    REGTX = R; ctx.restore();
  }
  // address and number
  const ka = pop(t, 51.25);
  if (ka > 0) {
    ctx.save(); ctx.translate(540, 1300); ctx.scale(ka, ka); ctx.translate(-540, -1300);
    shape(ctx, rrect(110, 1218, 860, 150, 20), { fill: P.paper, line: 3.8, seed: 985, off: [6, 5] });
    PR.pin(ctx, 186, 1340, 0.95);
    const R = REGTX; REGTX = R && ka >= 0.999;
    say(ctx, 'addr1', 'मुख्य द्वार के पास,', 248, 1282, { font: '600 46px Body', fill: P.ink });
    say(ctx, 'addr2', 'जनपद पंचायत, बुधनी', 248, 1344, { font: '600 46px Body', fill: P.ink });
    REGTX = R; ctx.restore();
  }
  const kp = pop(t, 54.75, 0.26);
  if (kp > 0) {
    ctx.save(); ctx.translate(540, 1450); ctx.scale(kp, kp); ctx.rotate((1 - kp) * -0.2); ctx.translate(-540, -1450);
    shape(ctx, rrect(120, 1388, 840, 128, 26), { fill: P.mustard, line: 5, seed: 986, grain: 0.25, off: [7, 6] });
    shape(ctx, ellipse(204, 1452, 46, 46, 30), { fill: P.ink, line: 0, seed: 987, off: [0, 0] });
    PR.phoneIcon(ctx, 204, 1452, 0.95, P.mustard);
    const R = REGTX; REGTX = R && kp >= 0.999;
    say(ctx, 'phone', '90395 80560', 606, 1484, { font: '400 88px Title', fill: P.ink, align: 'center', plate: P.white, off: [4, 4] });
    REGTX = R; ctx.restore();
  }
}

// ------------------------------------------------------------------ the master renderer with its transitions
export function renderFilm(ctx, t, Q) {
  setClock(t); HOLD.t = t >= HOLD_AT ? HOLD_AT : null; LW.k = 1; TX = []; REGTX = true;
  ctx.save();
  const ST = SEC.steps;
  const iris = (cx, cy, r, inner) => { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); inner(); ctx.restore(); ink(ctx, ellipse(cx, cy, r, r, 90), 7, { closed: true, seed: 960 }); };
  const quiet = fn => { const R = REGTX; REGTX = false; fn(); REGTX = R; };
  if (t < SEC.friend) sceneProblem(ctx, t);
  else if (t < SEC.friend + 0.25) {                    // colour-block wipe from the friend's side
    const k = eio(seg(t, SEC.friend, SEC.friend + 0.25)), x = W * (1 - k);
    quiet(() => sceneProblem(ctx, SEC.friend - 1e-3));
    ctx.save(); ctx.beginPath(); ctx.rect(x, 0, W, H); ctx.clip(); quiet(() => sceneFriend(ctx, t)); ctx.restore();
    ink(ctx, [[x, -10], [x, H + 10]], 7, { seed: 961 });
  } else if (t < SEC.pan) sceneFriend(ctx, t);
  else if (t < SEC.shop) {                             // the finger leads the frame: a whip pan right
    const u = eio(seg(t, SEC.pan, SEC.shop)), off = u * (W + 240);
    ctx.save(); ctx.translate(-off, 0); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); quiet(() => sceneFriend(ctx, t)); ctx.restore();
    ctx.save(); ctx.translate(W - off, 0); ctx.fillStyle = P.mustard; ctx.fillRect(0, 0, 240, H); ctx.restore();
    ctx.save(); ctx.translate(W + 240 - off, 0); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); quiet(() => sceneExterior(ctx, SEC.shop - 0.02)); ctx.restore();
    speedLines(ctx, Math.sin(u * Math.PI), 77);
  } else if (t < 15.35) sceneExterior(ctx, t);
  else if (t < SEC.inside) {                            // iris through the shop door
    const c = shopCam(t), [dx, dy] = w2s(DOOR[0], DOOR[1], c), k = eio(seg(t, 15.35, SEC.inside));
    quiet(() => sceneExterior(ctx, t));
    iris(dx, dy, lerp(30, 1300, k * k), () => quiet(() => sceneInterior(ctx, t)));
  } else if (t < ST[0] - 0.25) {
    sceneInterior(ctx, t);
    medallion(ctx, t, ST[0] - 0.5, 730, 1220, 0);
  } else if (t < 36.75) {
    let i = ST.length - 1; while (i > 0 && t < ST[i] - 0.25) i--;
    const T0 = ST[i];
    if (t < T0 + 0.2) {                                 // iris through the medallion
      const k = eio(seg(t, T0 - 0.25, T0 + 0.2));
      const fx = i === 0 ? 730 : CO.x, fy = i === 0 ? 1220 : CO.y;
      quiet(() => { if (i === 0) sceneInterior(ctx, T0 - 0.26); else sceneStep(ctx, T0 - 0.26, i - 1); medallion(ctx, T0, T0 - 0.5, fx, fy, i); });
      const cx = lerp(fx, W / 2, k), cy = lerp(fy, H / 2, k);
      iris(cx, cy, lerp(112, 1200, k * k), () => quiet(() => sceneStep(ctx, Math.max(t, T0 + 1e-3), i)));
      if (k < 0.5) { ctx.save(); ctx.globalAlpha = 1 - k * 2; ctx.translate(cx, cy); ctx.scale(1 + k * 3, 1 + k * 3); text(ctx, String(i + 1), 0, 45, { font: '400 130px Title', fill: P.ink, plate: P.white, off: [5, 5], align: 'center' }); ctx.restore(); }
    } else {
      sceneStep(ctx, t, i);
      if (i < ST.length - 1 && t >= ST[i + 1] - 0.5) medallion(ctx, t, ST[i + 1] - 0.5, CO.x, CO.y, i + 1);
    }
    if (t >= T0 - 0.25) stepHeader(ctx, t, i, T0);
  } else if (t < 37.0) {                               // colour block rises from the bottom
    const k = eio(seg(t, 36.75, 37.0)), y = H * (1 - k);
    quiet(() => { sceneStep(ctx, 36.749, 4); stepHeader(ctx, 36.749, 4, ST[4]); });
    ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, H); ctx.clip(); quiet(() => sceneRelief(ctx, t)); ctx.restore();
    ink(ctx, [[-10, y], [W + 10, y]], 7, { seed: 962 });
  } else if (t < 41.0) sceneRelief(ctx, t);
  else if (t < SEC.plan + 0.25) {                       // the clock face opens into the plan
    const c = reliefCam(t), [cx, cy] = w2s(CLOCK[0], CLOCK[1], c), k = eio(seg(t, 41.0, SEC.plan + 0.25));
    quiet(() => sceneRelief(ctx, t));
    iris(cx, cy, lerp(CLOCK[2] * c.z, 1300, k * k), () => quiet(() => sceneBurst(ctx, t)));
  } else sceneBurst(ctx, t);
  // kicker over the shop shots (screen space)
  if (t >= 13.25 && t < ST[0] - 0.25) {
    const k = pop(t, 13.25, 0.3); ctx.save(); ctx.translate(540, 250); ctx.scale(k, k); ctx.translate(-540, -250);
    shape(ctx, rrect(110, 128, 860, 250, 24), { fill: P.paper, line: 4, seed: 990, off: [6, 5], alpha: 0.96 });
    const R = REGTX; REGTX = R && k >= 0.999;
    say(ctx, 'kick1', 'हर डिजिटल ज़रूरत का', 540, 232, { font: '400 72px Kicker', fill: P.tealD, align: 'center' });
    say(ctx, 'kick2', '100% भरोसेमंद समाधान', 540, 330, { font: '400 72px Kicker', fill: P.coralD, align: 'center' });
    REGTX = R; ctx.restore();
  }
  ctx.restore();
  LW.k = 1;
  paperFinish(ctx, W, H, 1);
  if (!(Q && Q.has('nosubs'))) caption(ctx, t);
}

// ------------------------------------------------------------------ sound events (the same times drive the pictures)
function buildEvents() {
  const E = []; const ev = (t, type, o = {}) => E.push({ t: +t.toFixed(4), type, ...o });
  VO.forEach(v => ev(v.t, 'vo', { id: v.id }));
  ev(0.25, 'paper_slip'); ev(0.75, 'book_thump', { pan: 0.2 });
  [[1.30, -0.5], [2.46, 0.5], [3.98, 0]].forEach(([t, p]) => { ev(t, 'pop', { pan: p }); ev(t + 0.05, 'pen', { dur: 0.4, pan: p }); });
  ev(5.72, 'scribble', { dur: 1.2 });
  ev(SEC.friend, 'pat'); ev(SEC.friend, 'swish', { pan: 0.4 }); ev(8.25, 'pat', { gain: 0.5 });
  ev(9.28, 'tick'); ev(11.66, 'cloth', { gain: 0.6 }); ev(11.75, 'snap');
  ev(SEC.pan, 'whoosh', { dur: 0.45 }); ev(SEC.shop, 'sign_stamp'); ev(13.25, 'pen', { dur: 0.6, pan: -0.2 });
  ev(15.0, 'whoosh', { dur: 0.5, gain: 0.5 }); ev(15.35, 'iris', { dur: 0.3 });
  ev(16.5, 'namaste');
  SEC.steps.forEach((T0, i) => { ev(T0 - 0.5, 'stamp', { n: i }); ev(T0 - 0.25, 'iris', { dur: 0.45 }); ev(T0 + 0.12, 'pop', { gain: 0.6 }); ev(T0 + (i === 0 ? 1.0 : 0.5), 'pop', { gain: 0.5, pan: 0.3 }); });
  const S0 = SEC.steps;
  ev(S0[0] + 0.5, 'beep_ok'); [0, 1, 2].forEach(k => ev(S0[0] + 1.75 + k * 0.25, 'note_flick', { pan: -0.2 + k * 0.1 })); ev(S0[0] + 2.5, 'check');
  ev(S0[1] + 0.4, 'keys', { dur: 0.8 }); ev(S0[1] + 1.0, 'whoosh', { dur: 0.35, gain: 0.4 }); [0, 1, 2].forEach(k => ev(S0[1] + 1.25 + k * 0.5, 'pip', { n: k })); ev(S0[1] + 2.5, 'ding');
  ev(S0[2] + 0.4, 'keys', { dur: 0.6 }); ev(S0[2] + 1.0, 'check'); ev(S0[2] + 1.5, 'card_snap'); ev(S0[2] + 1.5, 'sparkle');
  ev(S0[3] + 0.65, 'whoosh', { dur: 0.3, gain: 0.4 }); ev(S0[3] + 1.0, 'rubber_stamp'); ev(S0[3] + 1.25, 'lock');
  ev(S0[4] + 0.6, 'printer', { dur: 1.5 }); ev(S0[4] + 1.5, 'paper_out'); ev(S0[4] + 2.0, 'paper_out', { gain: 0.8 }); ev(S0[4] + 2.0, 'sparkle');
  ev(36.75, 'swish', { pan: 0 }); ev(38.75, 'cloth', { gain: 0.5 }); ev(39.0, 'cloth', { gain: 0.4 });
  ev(SEC.clockIris, 'clock_tick'); ev(SEC.clockIris, 'whoosh', { dur: 0.45, gain: 0.5 }); ev(41.0, 'iris', { dur: 0.4 });
  ev(41.2, 'scribble', { dur: 0.6, gain: 0.5 });
  for (let k = 0; k < 8; k++) ev(42.0 + 0.25 * k, 'straighten', { n: k, pan: Math.cos(Math.atan2(STARTS[k][1] - CEN[1], STARTS[k][0] - CEN[0])) * 0.6 });
  ev(43.75, 'shimmer');
  ev(SEC.cta, 'stamp_big'); ev(47.75, 'pen', { dur: 0.8 }); ev(51.25, 'pop'); ev(54.75, 'stamp', { n: 9 });
  E.sort((a, b) => a.t - b.t); EVS = E;
}
