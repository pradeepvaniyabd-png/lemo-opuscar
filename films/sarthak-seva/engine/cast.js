// The cast of "सार्थक ऑनलाइन सेवा केंद्र", drawn with the style engine (toon.js).
// Limited animation: bodies are held drawings; arms, hands, eyes, brows and mouths move.
// Local units: feet at (0,0), up is negative y. View 'q' = three-quarter facing +x (mirror with dir:-1), 'front' = facing camera.
// pose: { x, y, s, dir, view, face, mouth(0..1), blink(0..1), look:[dx,dy], armF:{a1,a2}, armB:{a1,a2}, handF, handB,
//         slump(0..1), bow(0..1), prop:{...}, shadow }
// Angles: 0 = +x (forward), π/2 = down. armF is the near arm (drawn over the body), armB the far one.
import { shape, ink, ellipse, spline, xform, move, rrect, rect, TAU, clamp, lerp, reg, path, LW, sparkle } from './toon.js';

export const P = {
  paper: '#F3E7CF', paperD: '#E4D3B2', paperDD: '#CDB893', ink: '#2A211B', inkSoft: '#4A3D33', white: '#FBF5E8',
  mustard: '#E1A83E', mustardD: '#B9832A', mustardL: '#F1CD7E',
  coral: '#D9674C', coralD: '#B04C36', coralL: '#EE9A80',
  tomato: '#C9483A', tomatoD: '#9E3528',
  teal: '#2E8C86', tealD: '#216A65', tealL: '#86C3BC', tealDD: '#18504C',
  powder: '#A9C4C9', powderD: '#86A6AD', slate: '#5F7F87',
  olive: '#8C8A3E', oliveD: '#6B6A2B', oliveL: '#B9B76E',
  lime: '#BFC46A', limeD: '#99A045', plum: '#7E4A6A', plumL: '#B98AA6', sand: '#D9C39A', sandD: '#BFA77A',
  umber: '#7A5236', umberD: '#5B3C27', khaki: '#B79A6A', khakiD: '#957A4E', cream: '#EFE3C8', creamD: '#D8C9A8',
  shirtBlue: '#BCD0D3', shirtBlueD: '#97B0B4', grey: '#B9B2A6', greyD: '#8F877B', blush: '#B5553A',
  skin: { son: '#B9805A', dost: '#A86F48', maa: '#C48C64', bhai: '#B47C55', op: '#AD7550' },
  skinD: { son: '#9A6443', dost: '#8B5735', maa: '#A5704C', bhai: '#956240', op: '#8F5C3C' },
};
const HAIR = P.ink;

// ------------------------------------------------------------------ hands
// Four-finger cartoon hand (three fingers + thumb), one union outline, thin finger separations.
// kind: open | flat | point | grip | thumb | bless (open, palm down, fingers together) ; side ±1 = thumb side.
export function drawHand(ctx, x, y, a, kind = 'open', side = 1, k = 1, skin = P.skin.son) {
  const parts = [], seps = [];
  const E = (cx, cy, rx, ry, rot = 0) => parts.push(ellipse(cx, cy, rx, ry, 18, 0, TAU, rot));
  E(12, 0, 15, 13.5);
  if (kind === 'open') {
    [-0.62, 0, 0.62].forEach(r => E(12 + Math.cos(r) * 25, Math.sin(r) * 25, 12, 5, r));
    E(4, -15 * side, 10, 5, -1.35 * side);
  } else if (kind === 'flat' || kind === 'bless') {
    [-10, 0, 10].forEach((dy, i) => E(34 + (i === 1 ? 3 : 0), dy, 13, 4.8));
    E(10, -15 * side, 9, 5, -0.9 * side);
    seps.push([[24, -5], [40, -5]], [[24, 5], [40, 5]]);
  } else if (kind === 'point') {
    E(38, -5 * side, 19, 4.8); E(25, 5 * side, 7, 6); E(20, 11 * side, 6, 5.5); E(8, -14 * side, 8.5, 5, -1.0 * side);
  } else if (kind === 'thumb') {           // fist with the thumb pushed forward (pressing a scanner)
    E(26, -2, 7, 6.5); E(26, 7, 6.5, 6.2); E(23, 15, 6, 5.5); E(30, -14 * side, 13, 6, -0.15 * side);
    seps.push([[20, 2.5], [29, 2.5]], [[19, 11], [27, 11]]);
  } else { E(26, -8, 6.5, 6.5); E(28, 1, 6.5, 6.5); E(25, 10, 6, 6); E(12, -14 * side, 9, 5.5, -0.4 * side); seps.push([[22, -3.5], [30, -3.5]], [[22, 5.5], [29, 5.5]]); }
  const PP = parts.map(p => xform(p, x, y, a, k));
  ctx.save(); ctx.strokeStyle = P.ink; ctx.lineWidth = 6 * k * LW.k; ctx.lineJoin = 'round';
  for (const p of PP) { path(ctx, p); ctx.stroke(); }
  const o = reg(77, 0.6); ctx.fillStyle = skin;
  for (const p of PP) { path(ctx, move(p, o[0] * 0.5, o[1] * 0.5)); ctx.fill(); }
  ctx.lineWidth = 2.4 * k * LW.k; ctx.lineCap = 'round';
  for (const s2 of seps) { const q = xform(s2, x, y, a, k); ctx.beginPath(); ctx.moveTo(...q[0]); ctx.lineTo(...q[1]); ctx.stroke(); }
  ctx.restore();
}

// ------------------------------------------------------------------ arms
const DEF = {
  q: { F: { sh: [40, -388], rest: { a1: 1.32, a2: 1.52 } }, B: { sh: [-38, -390], rest: { a1: 1.84, a2: 1.68 } } },
  front: { F: { sh: [54, -388], rest: { a1: 1.38, a2: 1.5 } }, B: { sh: [-54, -388], rest: { a1: 1.76, a2: 1.64 } } },
};
export function armJoints(pose, which, rig) {
  const view = pose.view === 'front' ? 'front' : 'q';
  const d = DEF[view][which], sh0 = rig.sh?.[view]?.[which] || d.sh;
  const sl = (pose.slump || 0) * 10;
  const sh = [sh0[0] + (view === 'q' ? sl * 0.6 : 0), sh0[1] + sl];
  const arm = pose[which === 'F' ? 'armF' : 'armB'] || d.rest;
  const UA = (rig.ua || 102) * (pose[which === 'F' ? 'usF' : 'usB'] ?? 1), FA = (rig.fa || 94) * (pose[which === 'F' ? 'fsF' : 'fsB'] ?? 1);   // us/fs: foreshortening
  const el = [sh[0] + Math.cos(arm.a1) * UA, sh[1] + Math.sin(arm.a1) * UA];
  const ha = [el[0] + Math.cos(arm.a2) * FA, el[1] + Math.sin(arm.a2) * FA];
  return { sh, el, ha, a1: arm.a1, a2: arm.a2 };
}
// sleeve = 'half' (garment over the upper arm, skin below), 'full' (garment to the wrist), 'none'
function drawArm(ctx, pose, which, rig, seed) {
  const J = armJoints(pose, which, rig);
  const prop = pose.prop && (pose.prop.hand || 'F') === which ? pose.prop : null;
  if (prop && prop.behind && prop.draw) prop.draw(ctx, J, pose);
  const full = spline([J.sh, [(J.sh[0] + J.el[0]) / 2, (J.sh[1] + J.el[1]) / 2], J.el, [(J.el[0] + J.ha[0]) / 2, (J.el[1] + J.ha[1]) / 2], J.ha], false, 6);
  const o = reg(seed, 1);
  if (rig.sleeve === 'full') {
    ink(ctx, full, 30, { seed, taper: false, wob: 0.08 });
    ink(ctx, move(full, o[0] * 0.6, o[1] * 0.6), 21, { seed: seed + 1, taper: false, wob: 0.05, color: rig.sleeveCol });
    const a = J.a2, cx = J.ha[0] - Math.cos(a) * 10, cy = J.ha[1] - Math.sin(a) * 10;
    ink(ctx, [[cx + Math.cos(a + 1.57) * 14, cy + Math.sin(a + 1.57) * 14], [cx - Math.cos(a + 1.57) * 14, cy - Math.sin(a + 1.57) * 14]], 3, { seed: seed + 2, taper: false, color: rig.sleeveColD || P.ink });
  } else {
    ink(ctx, full, 24, { seed, taper: false, wob: 0.08 });
    ink(ctx, move(full, o[0] * 0.6, o[1] * 0.6), 15, { seed: seed + 1, taper: false, wob: 0.05, color: rig.skin });
    if (rig.sleeve === 'half') {
      const up = [J.sh, [lerp(J.sh[0], J.el[0], 0.5), lerp(J.sh[1], J.el[1], 0.5)], [lerp(J.sh[0], J.el[0], 0.78), lerp(J.sh[1], J.el[1], 0.78)]];
      ink(ctx, up, 36, { seed: seed + 3, taper: false, wob: 0.06 });
      ink(ctx, move(up, o[0] * 0.6, o[1] * 0.6), 27, { seed: seed + 4, taper: false, wob: 0.04, color: rig.sleeveCol });
    }
    if (rig.bangles) {
      const a = J.a2;
      for (let i = 0; i < 2; i++) {
        const cx = J.ha[0] - Math.cos(a) * (14 + i * 7), cy = J.ha[1] - Math.sin(a) * (14 + i * 7);
        ink(ctx, [[cx + Math.cos(a + 1.57) * 11, cy + Math.sin(a + 1.57) * 11], [cx - Math.cos(a + 1.57) * 11, cy - Math.sin(a + 1.57) * 11]], 4.2, { seed: seed + 6 + i, taper: false, color: i ? P.teal : P.mustard });
      }
    }
  }
  const hk = pose[which === 'F' ? 'handF' : 'handB'] || 'open';
  if (hk !== 'none') drawHand(ctx, J.ha[0], J.ha[1], J.a2 + (pose[which === 'F' ? 'handRotF' : 'handRotB'] || 0), hk, which === 'F' ? -1 : 1, rig.hk || 1, rig.skin);
  if (prop && !prop.behind && prop.draw) prop.draw(ctx, J, pose);
  return J;
}

// ------------------------------------------------------------------ faces
function eye(ctx, x, y, face, blink, i, sx = 1, big = 1) {
  const closedHappy = face === 'happy' || face === 'bliss';
  if (closedHappy || blink > 0.5) {
    ink(ctx, closedHappy ? [[x - 8 * sx, y + 3], [x, y - 5], [x + 8 * sx, y + 3]] : [[x - 8 * sx, y + 1], [x + 8 * sx, y + 1]], 4, { seed: 80 + i, taper: false });
  } else {
    const r = (face === 'wow' ? 8.6 : 6.8) * big;
    shape(ctx, ellipse(x, y, r * 0.8 * sx, r * 1.3, 14), { fill: P.ink, line: 0, grain: 0, off: [0, 0] });
    shape(ctx, ellipse(x + 1.5, y - 3.5, 2.2, 2.6, 8), { fill: P.white, line: 0, grain: 0, off: [0, 0] });
    if (face === 'sad' || face === 'tired') ink(ctx, [[x - 9 * sx, y - 5], [x + 9 * sx, y - 6]], 3.6, { seed: 85 + i, taper: false });   // heavy lid
  }
}
// brows: worried = inner ends (toward the nose, +x in 3/4) raised; happy = soft arches; wow = high
function brow(ctx, x, y, face, i, sx = 1, front = false, thick = 3.6) {
  let by = y - 19, lift = 0;                      // lift > 0 raises the inner end
  if (face === 'wow') by = y - 26;
  if (face === 'happy' || face === 'bliss') by = y - 22;
  if (face === 'worried' || face === 'sad') lift = 6;
  if (face === 'focus') lift = -4;
  // inner end: in 3/4 the inner end of both brows is the +x end; in front view, eye 0 (left) inner = +x, eye 1 (right) inner = -x
  const innerIsRight = front ? i === 0 : true;
  const xl = x - 9 * sx, xr = x + 9 * sx;
  const yl = by + (innerIsRight ? 0 : -lift), yr = by + (innerIsRight ? -lift : 0);
  if (face === 'happy' || face === 'bliss') ink(ctx, spline([[xl, yl + 2], [x, yl - 3], [xr, yr + 2]], false, 4), thick, { seed: 90 + i, taper: true });
  else ink(ctx, [[xl, yl], [xr, yr]], thick, { seed: 90 + i, taper: true });
}
// mouth: m = lip-sync openness 0..1 overrides the face's mouth when > 0.08
function mouth(ctx, x, y, face, m = 0, w = 1) {
  if (m > 0.08) {
    const h = 3 + m * 12, ww = 9 + m * 3;
    const mp = spline([[x - ww * w, y - 2], [x, y - 4], [x + ww * w, y - 2], [x + ww * 0.7 * w, y + h], [x - ww * 0.7 * w, y + h]], true, 5);
    shape(ctx, mp, { fill: P.inkSoft, line: 3.2, seed: 95, grain: 0, breaks: 0 });
    if (m > 0.4) { ctx.save(); path(ctx, mp); ctx.clip(); shape(ctx, ellipse(x + 1, y + h, ww * 0.55 * w, 4.5, 10), { fill: P.coralL, line: 0, grain: 0, off: [0, 0] }); ctx.restore(); }
    return;
  }
  if (face === 'happy' || face === 'bliss') {
    // an open smile: dark mouth with a strip of teeth along the top, lips curving up at the corners
    const pts = spline([[x - 15 * w, y - 7], [x, y - 5], [x + 13 * w, y - 8], [x + 6 * w, y + 7], [x - 7 * w, y + 7]], true, 6);
    shape(ctx, pts, { fill: P.inkSoft, line: 3.2, seed: 95, grain: 0, breaks: 0 });
    ctx.save(); path(ctx, pts); ctx.clip();
    shape(ctx, rect(x - 16 * w, y - 9, 30 * w, 7), { fill: P.white, line: 0, grain: 0, off: [0, 0] });
    shape(ctx, ellipse(x - 1, y + 7, 7 * w, 4, 10), { fill: P.coralL, line: 0, grain: 0, off: [0, 0] });
    ctx.restore();
  }
  else if (face === 'wow') { const mp = ellipse(x - 1, y + 2, 7 * w, 9, 16); shape(ctx, mp, { fill: P.inkSoft, line: 3.2, seed: 96, grain: 0, breaks: 0 }); ctx.save(); path(ctx, mp); ctx.clip(); shape(ctx, ellipse(x - 1, y + 10, 5, 3.5, 10), { fill: P.coralL, line: 0, grain: 0, off: [0, 0] }); ctx.restore(); }
  else if (face === 'smile') ink(ctx, spline([[x - 14 * w, y - 5], [x - 1, y + 5], [x + 12 * w, y - 6]], false, 5), 3.6, { seed: 99 });
  else if (face === 'worried' || face === 'sad' || face === 'tired') ink(ctx, spline([[x - 12 * w, y + 3], [x, y - 3], [x + 10 * w, y + 3]], false, 5), 3.4, { seed: 100 });
  else ink(ctx, spline([[x - 12 * w, y - 1], [x - 1, y + 3], [x + 9 * w, y - 2]], false, 5), 3.4, { seed: 100 });
}
function cheek(ctx, x, y, a = 0.32) { shape(ctx, ellipse(x, y, 11, 7, 14), { fill: P.blush, line: 0, grain: 0, seed: 101, alpha: a }); }

// Head builder. hd = { skin, chain(q), tip(q), frontR:[rx,ry], hairQ, hairF, extras(ctx, view), eyeQ:[[x,y],[x,y]], eyeF:[[x,y],[x,y]], mouthQ, mouthF, big }
function drawHead(ctx, pose, hd) {
  const view = pose.view === 'front' ? 'front' : 'q', face = pose.face || 'neutral', blink = pose.blink ?? 0, look = pose.look || [0, 0], m = pose.mouth || 0;
  const sl = pose.slump || 0, bw = pose.bow || 0;
  ctx.save();
  // slump: the head drops and tips forward; bow: a small nod
  ctx.translate(view === 'q' ? sl * 8 + bw * 10 : 0, sl * 16 + bw * 10);
  const pivot = hd.pivot || [0, -420];
  ctx.translate(pivot[0], pivot[1]); ctx.rotate((view === 'q' ? 1 : 0) * (sl * 0.14 + bw * 0.16)); ctx.translate(-pivot[0], -pivot[1]);
  if (hd.behind) hd.behind(ctx, view);
  if (view === 'front') {
    const [rx, ry] = hd.frontR, cy = hd.frontCY ?? -482;
    if (hd.ears !== false) [-1, 1].forEach((s, i) => shape(ctx, ellipse(s * (rx - 2), cy + 8, 9, 14, 14), { fill: hd.skin, line: 3.4, seed: 160 + i, grain: 0.1 }));
    shape(ctx, ellipse(0, cy, rx, ry, 40), { fill: hd.skin, line: 4, seed: 161, grain: 0.15, breaks: 0.18 });
    if (hd.hairF) shape(ctx, hd.hairF, { fill: hd.hairCol || HAIR, line: 0, seed: 162, grain: 0.3 });
    hd.eyeF.forEach(([x, y], i) => { eye(ctx, x + look[0], y + look[1], face, blink, i, 1, hd.big || 1); brow(ctx, x, y, face, i, 1, true, hd.browW || 3.6); });
    ink(ctx, spline([[2, cy + 2], [-6, cy + 24], [5, cy + 27]], false, 4), 3.4, { seed: 164 });
    if (hd.extrasF) hd.extrasF(ctx);
    mouth(ctx, hd.mouthF[0], hd.mouthF[1], face, m);
    if (hd.cheeks !== false) { cheek(ctx, -rx * 0.62, cy + 24); cheek(ctx, rx * 0.62, cy + 24); }
    if (hd.overF) hd.overF(ctx);
  } else {
    if (hd.ear) shape(ctx, ellipse(hd.ear[0], hd.ear[1], 9, 14, 14), { fill: hd.skin, line: 3.4, seed: 165, grain: 0.1 });
    const head = [...spline(hd.chain, false, 6), hd.tip];
    shape(ctx, head, { fill: hd.skin, line: 4, seed: 166, grain: 0.15, breaks: 0.12 });
    if (hd.ear) { shape(ctx, ellipse(hd.ear[0], hd.ear[1], 9, 14, 14), { fill: hd.skin, line: 3.4, seed: 167, grain: 0.1 }); ink(ctx, spline([[hd.ear[0] + 2, hd.ear[1] - 6], [hd.ear[0] - 3, hd.ear[1]], [hd.ear[0] + 2, hd.ear[1] + 6]], false, 4), 2.4, { seed: 168 }); }
    if (hd.hairQ) shape(ctx, hd.hairQ, { fill: hd.hairCol || HAIR, line: 0, seed: 169, grain: 0.3 });
    hd.eyeQ.forEach(([x, y], i) => { eye(ctx, x + look[0], y + look[1], face, blink, i, i === 1 ? 0.78 : 1, hd.big || 1); brow(ctx, x, y, face, i, i === 1 ? 0.78 : 1, false, hd.browW || 3.6); });
    if (hd.extrasQ) hd.extrasQ(ctx);
    mouth(ctx, hd.mouthQ[0], hd.mouthQ[1], face, m, 0.9);
    if (hd.cheeks !== false) cheek(ctx, hd.cheekQ?.[0] ?? -8, hd.cheekQ?.[1] ?? -452);
    if (hd.overQ) hd.overQ(ctx);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ the characters
// helpers for legs and feet
function legPair(ctx, front, col, colD, x0, w, top, bot, seed, shoe, shoeCol = P.ink, skin) {
  const legs = front ? [[[-w - x0, top], [-x0 + 2, top], [-x0 - 4, bot], [-w - x0 + 6, bot]], [[x0 - 2, top], [w + x0, top], [w + x0 - 6, bot], [x0 + 4, bot]]]
    : [[[-w + 2, top], [6, top], [-2, bot], [-w + 10, bot]], [[-4, top], [w + 4, top], [w - 6, bot], [8, bot]]];
  legs.forEach((L, i) => {
    const ax = (L[2][0] + L[3][0]) / 2;
    if (skin) shape(ctx, rect(ax - 7, bot - 4, 14, 20), { fill: skin, line: 0, seed: seed + 9 + i, grain: 0 });
    shape(ctx, L, { fill: col, line: 3.8, seed: seed + i, grain: 0.3, breaks: 0.15, shade: i === 1 && !front ? [{ pts: [[w - 18, top - 4], [w + 30, top - 4], [w + 30, 0], [w - 22, 0]], color: colD, alpha: 0.7 }] : null });
    const sh = front ? ellipse(ax, -8, 19, 9, 16) : spline([[ax - 16, -14], [ax + 8, -17], [ax + 30, -7], [ax + 26, 0], [ax - 16, 0]], true, 4);
    shape(ctx, sh, { fill: shoe || shoeCol, line: shoe ? 3 : 0, off: shoe ? undefined : [0, 0], grain: 0, seed: seed + 5 + i });
  });
}
function shadowOf(ctx, rx = 88) { ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = P.ink; ctx.beginPath(); ctx.ellipse(6, 2, rx, 11, 0, 0, TAU); ctx.fill(); ctx.restore(); }
function begin(ctx, pose) { ctx.save(); ctx.translate(pose.x, pose.y); ctx.scale((pose.s ?? 1) * (pose.dir ?? 1), pose.s ?? 1); if (pose.shadow !== false) shadowOf(ctx, pose.shadowR || 88); }
function torsoTilt(ctx, pose, view) { const sl = pose.slump || 0; if (view === 'q' && sl) { ctx.translate(0, -280); ctx.rotate(sl * 0.06); ctx.translate(0, 280); } else if (sl) ctx.translate(0, sl * 6); }

// ---- बेटा (the son): mustard half-sleeve shirt, umber trousers, side parting, thin moustache
const SON = {
  skin: P.skin.son, sleeve: 'half', sleeveCol: P.mustard, ua: 104, fa: 96,
  head: {
    skin: P.skin.son,
    chain: [[52, -488], [50, -514], [32, -542], [-6, -558], [-46, -542], [-62, -502], [-58, -458], [-40, -424], [-10, -408], [22, -410], [40, -424], [46, -442], [52, -458]],
    tip: [80, -470], ear: [-24, -470],
    hairQ: spline([[48, -530], [32, -552], [-8, -568], [-50, -552], [-68, -506], [-62, -464], [-48, -470], [-44, -500], [-26, -522], [4, -530], [30, -528], [44, -524]], true, 6),
    eyeQ: [[16, -490], [44, -493]], mouthQ: [36, -430], cheekQ: [-2, -452],
    extrasQ(ctx) { shape(ctx, spline([[34, -452], [50, -460], [70, -454], [64, -446], [50, -449], [36, -445]], true, 4), { fill: HAIR, line: 0, seed: 171, grain: 0.2 }); },
    frontR: [56, 70], hairF: spline([[-58, -500], [-50, -546], [-6, -566], [46, -552], [60, -508], [52, -500], [40, -526], [10, -532], [-22, -526], [-48, -506]], true, 6),
    eyeF: [[-22, -486], [22, -486]], mouthF: [0, -436],
    extrasF(ctx) { shape(ctx, spline([[-24, -450], [-6, -458], [0, -454], [6, -458], [24, -450], [14, -444], [0, -447], [-14, -444]], true, 4), { fill: HAIR, line: 0, seed: 172, grain: 0.2 }); },
  },
};
export function drawSon(ctx, pose, t = 0) {
  const view = pose.view === 'front' ? 'front' : 'q', front = view === 'front';
  begin(ctx, pose);
  if (!front) drawArm(ctx, pose, 'B', SON, 70);
  legPair(ctx, front, P.umber, P.umberD, 6, 46, -292, -24, 42, null, P.inkSoft);
  ctx.save(); torsoTilt(ctx, pose, view);
  const torso = front ? spline([[-60, -384], [-46, -404], [46, -404], [60, -384], [56, -300], [58, -270], [-58, -270], [-56, -300]], true, 6)
    : spline([[-54, -384], [-42, -404], [44, -404], [56, -384], [52, -300], [54, -270], [-52, -270], [-54, -300]], true, 6);
  shape(ctx, torso, { fill: P.mustard, line: 4.2, seed: 50, grain: 0.35, breaks: 0.2, shade: front ? null : [{ pts: [[24, -410], [70, -410], [70, -262], [28, -262]], color: P.mustardD, alpha: 0.55 }] });
  shape(ctx, rect(-11, -420, 22, 22), { fill: SON.skin, line: 0, seed: 53, grain: 0 });
  // collar points + placket
  const cx = front ? 0 : 10;
  shape(ctx, [[cx - 22, -404], [cx - 2, -404], [cx - 6, -384]], { fill: P.mustardL, line: 3, seed: 54, grain: 0.1 });
  shape(ctx, [[cx + 2, -404], [cx + 22, -404], [cx + 6, -384]], { fill: P.mustardL, line: 3, seed: 55, grain: 0.1 });
  ink(ctx, [[cx, -392], [cx, -274]], 2.6, { seed: 56, taper: false, color: P.mustardD });
  [-360, -320].forEach((y, i) => shape(ctx, ellipse(cx + 6, y, 3.4, 3.4, 8), { fill: P.white, line: 0, grain: 0, seed: 57 + i }));
  drawHead(ctx, pose, SON.head);
  if (pose.held) pose.held(ctx);
  drawArm(ctx, pose, 'F', SON, 60);
  if (front) drawArm(ctx, pose, 'B', SON, 70);
  ctx.restore(); ctx.restore();
}

// ---- माँ (mother): coral sari with a mustard border, pallu over the head, grey hair, round specs, bindi, bangles
const MAA = {
  skin: P.skin.maa, sleeve: 'half', sleeveCol: P.plum, ua: 92, fa: 86, bangles: true, hk: 0.92,
  sh: { q: { F: [36, -352], B: [-34, -354] }, front: { F: [48, -352], B: [-48, -352] } },
  head: {
    skin: P.skin.maa, pivot: [0, -392],
    chain: [[46, -452], [44, -478], [28, -504], [-6, -516], [-40, -502], [-54, -464], [-50, -424], [-34, -394], [-8, -382], [20, -384], [36, -396], [40, -412], [46, -426]],
    tip: [62, -436], ear: null,
    hairQ: spline([[40, -484], [26, -506], [-6, -514], [-26, -506], [-14, -496], [8, -494], [30, -488]], true, 6), hairCol: P.grey,
    eyeQ: [[14, -456], [40, -459]], mouthQ: [32, -402], cheekQ: [-4, -422],
    behind(ctx, view) {          // the pallu around the head
      const pts = view === 'front' ? spline([[-74, -460], [-60, -530], [0, -556], [60, -530], [74, -460], [80, -380], [60, -350], [-60, -350], [-80, -380]], true, 6)
        : spline([[34, -500], [10, -528], [-36, -528], [-70, -496], [-82, -440], [-80, -380], [-56, -348], [20, -360], [-20, -420], [-30, -470]], true, 6);
      shape(ctx, pts, { fill: P.coral, line: 4, seed: 180, grain: 0.3, breaks: 0.18 });
      const edge = view === 'front' ? spline([[-62, -470], [-44, -524], [0, -544], [44, -524], [62, -470]], false, 6) : spline([[30, -500], [6, -522], [-34, -522], [-64, -492]], false, 6);
      ink(ctx, edge, 9, { color: P.mustard, seed: 181, taper: false });
    },
    extrasQ(ctx) {
      ink(ctx, ellipse(14, -456, 13, 12, 20), 3, { closed: true, seed: 182 }); ink(ctx, ellipse(40, -458, 10, 11, 20), 3, { closed: true, seed: 183 });
      ink(ctx, [[27, -458], [30, -458]], 2.6, { seed: 184, taper: false }); ink(ctx, [[1, -458], [-20, -462]], 2.6, { seed: 185, taper: false });
      shape(ctx, ellipse(30, -478, 3.6, 3.6, 10), { fill: P.tomato, line: 0, grain: 0, off: [0, 0] });
    },
    frontR: [48, 60], frontCY: -450, hairF: spline([[-46, -470], [-30, -504], [0, -510], [30, -504], [46, -470], [30, -486], [0, -490], [-30, -486]], true, 6),
    eyeF: [[-19, -452], [19, -452]], mouthF: [0, -410],
    extrasF(ctx) {
      [-19, 19].forEach((x, i) => ink(ctx, ellipse(x, -452, 13, 12, 20), 3, { closed: true, seed: 186 + i }));
      ink(ctx, [[-6, -454], [6, -454]], 2.6, { seed: 188, taper: false });
      shape(ctx, ellipse(0, -476, 3.8, 3.8, 10), { fill: P.tomato, line: 0, grain: 0, off: [0, 0] });
    },
  },
};
export function drawMaa(ctx, pose, t = 0) {
  const view = pose.view === 'front' ? 'front' : 'q', front = view === 'front';
  begin(ctx, { ...pose, shadowR: 80 });
  if (!front) drawArm(ctx, pose, 'B', MAA, 270);
  // sari skirt, flared, with border and pleats
  const skirt = front ? spline([[-52, -262], [52, -262], [66, -120], [76, -10], [-76, -10], [-66, -120]], true, 6)
    : spline([[-50, -262], [50, -262], [70, -120], [84, -10], [-66, -10], [-60, -120]], true, 6);
  shape(ctx, skirt, { fill: P.coral, line: 4, seed: 272, grain: 0.35, breaks: 0.18, shade: front ? null : [{ pts: [[26, -270], [96, -270], [96, 0], [36, 0]], color: P.coralD, alpha: 0.5 }] });
  ink(ctx, front ? [[-74, -26], [74, -26]] : [[-64, -26], [82, -26]], 14, { color: P.mustard, seed: 273, taper: false, wob: 0.1 });
  [0, 14, 28].forEach((dx, i) => ink(ctx, [[(front ? -8 : 14) + dx, -230], [(front ? -12 : 18) + dx * 1.3, -40]], 2.6, { seed: 274 + i, color: P.coralD, taper: true }));
  [-26, 26].forEach((x, i) => shape(ctx, ellipse(x + (front ? 0 : 14), -6, 16, 7, 12), { fill: P.umber, line: 2.6, seed: 277 + i, grain: 0 }));
  ctx.save(); torsoTilt(ctx, pose, view);
  // blouse + pallu band across the chest
  const torso = spline([[-46, -350], [-34, -368], [34, -368], [46, -350], [44, -276], [46, -258], [-46, -258], [-44, -276]], true, 6);
  shape(ctx, torso, { fill: P.plum, line: 4, seed: 279, grain: 0.3, breaks: 0.2 });
  shape(ctx, rect(-10, -382, 20, 18), { fill: MAA.skin, line: 0, seed: 280, grain: 0 });
  const band = front ? [[-46, -360], [-14, -370], [50, -280], [46, -250], [14, -250]] : [[-40, -364], [-8, -370], [52, -290], [50, -256], [18, -256]];
  shape(ctx, band, { fill: P.coral, line: 3.6, seed: 281, grain: 0.3, breaks: 0.15 });
  ink(ctx, [band[1], band[2]], 7, { color: P.mustard, seed: 282, taper: false });
  drawHead(ctx, pose, MAA.head);
  if (pose.held) pose.held(ctx);
  drawArm(ctx, pose, 'F', MAA, 260);
  if (front) drawArm(ctx, pose, 'B', MAA, 270);
  ctx.restore(); ctx.restore();
}

// ---- छोटा भाई (younger brother): tomato T-shirt, khaki trousers, sneakers, a tuft of hair
const BHAI = {
  skin: P.skin.bhai, sleeve: 'half', sleeveCol: P.tomato, ua: 90, fa: 84, hk: 0.92,
  sh: { q: { F: [34, -346], B: [-32, -348] }, front: { F: [46, -346], B: [-46, -346] } },
  head: {
    skin: P.skin.bhai, pivot: [0, -380], big: 1.12,
    chain: [[46, -440], [46, -468], [30, -498], [-4, -512], [-42, -498], [-58, -460], [-54, -418], [-36, -384], [-8, -370], [20, -372], [36, -384], [42, -400], [46, -414]],
    tip: [68, -426], ear: [-20, -430],
    hairQ: spline([[44, -488], [28, -508], [-6, -520], [-46, -504], [-62, -462], [-56, -428], [-44, -434], [-40, -466], [-20, -484], [8, -490], [30, -488], [42, -482]], true, 6),
    eyeQ: [[14, -446], [40, -449]], mouthQ: [32, -394], cheekQ: [-2, -414],
    overQ(ctx) { shape(ctx, spline([[-10, -510], [-2, -540], [10, -548], [8, -530], [16, -536], [12, -512]], true, 4), { fill: HAIR, line: 0, seed: 190, grain: 0.2 }); },
    frontR: [52, 62], frontCY: -440, hairF: spline([[-54, -456], [-44, -498], [0, -510], [44, -498], [54, -456], [44, -470], [10, -480], [-20, -476], [-44, -462]], true, 6),
    eyeF: [[-20, -442], [20, -442]], mouthF: [0, -400],
    overF(ctx) { shape(ctx, spline([[-8, -504], [-2, -534], [10, -544], [8, -526], [16, -530], [10, -506]], true, 4), { fill: HAIR, line: 0, seed: 191, grain: 0.2 }); },
  },
};
export function drawBhai(ctx, pose, t = 0) {
  const view = pose.view === 'front' ? 'front' : 'q', front = view === 'front';
  begin(ctx, { ...pose, shadowR: 76 });
  if (!front) drawArm(ctx, pose, 'B', BHAI, 290);
  legPair(ctx, front, P.khaki, P.khakiD, 4, 40, -250, -24, 292, P.white);
  ctx.save(); torsoTilt(ctx, pose, view);
  const torso = spline([[-50, -344], [-38, -362], [38, -362], [50, -344], [46, -268], [48, -244], [-48, -244], [-46, -268]], true, 6);
  shape(ctx, torso, { fill: P.tomato, line: 4, seed: 296, grain: 0.35, breaks: 0.2, shade: front ? null : [{ pts: [[22, -370], [64, -370], [64, -236], [26, -236]], color: P.tomatoD, alpha: 0.5 }] });
  shape(ctx, rect(-10, -376, 20, 18), { fill: BHAI.skin, line: 0, seed: 297, grain: 0 });
  ink(ctx, spline([[-18, -362], [0, -350], [18, -362]], false, 4), 6, { color: P.mustard, seed: 298, taper: false });
  // a star on the T-shirt
  shape(ctx, [[0, -322], [6, -308], [20, -308], [9, -299], [13, -285], [0, -294], [-13, -285], [-9, -299], [-20, -308], [-6, -308]].map(([x, y]) => [x + (front ? 0 : 8), y]), { fill: P.mustardL, line: 2.4, seed: 299, grain: 0.1 });
  drawHead(ctx, pose, BHAI.head);
  if (pose.held) pose.held(ctx);
  drawArm(ctx, pose, 'F', BHAI, 300);
  if (front) drawArm(ctx, pose, 'B', BHAI, 290);
  ctx.restore(); ctx.restore();
}

// ---- दोस्त (friend): olive kurta, cream pyjama, broad moustache, easy smile
const DOST = {
  skin: P.skin.dost, sleeve: 'full', sleeveCol: P.olive, sleeveColD: P.oliveD, ua: 108, fa: 100,
  sh: { q: { F: [44, -410], B: [-40, -412] }, front: { F: [58, -410], B: [-58, -410] } },
  head: {
    skin: P.skin.dost, pivot: [0, -440],
    chain: [[56, -512], [54, -538], [36, -566], [-4, -580], [-48, -566], [-66, -526], [-62, -480], [-46, -444], [-14, -428], [22, -430], [44, -444], [50, -462], [56, -480]],
    tip: [84, -494], ear: [-26, -494],
    hairQ: spline([[52, -552], [34, -574], [-6, -590], [-52, -574], [-72, -530], [-66, -488], [-52, -494], [-48, -526], [-30, -546], [4, -554], [32, -552], [50, -546]], true, 6),
    eyeQ: [[18, -514], [48, -517]], mouthQ: [40, -450], cheekQ: [0, -476], browW: 4.6,
    extrasQ(ctx) {
      shape(ctx, spline([[26, -476], [48, -486], [76, -478], [84, -464], [72, -470], [52, -470], [34, -464], [20, -468]], true, 5), { fill: HAIR, line: 0, seed: 192, grain: 0.2 });
      ink(ctx, [[-60, -500], [-56, -520]], 6, { color: P.grey, seed: 193, taper: true });
    },
    frontR: [60, 74], frontCY: -506, hairF: spline([[-62, -526], [-52, -572], [0, -592], [52, -572], [62, -526], [50, -540], [0, -556], [-50, -540]], true, 6),
    eyeF: [[-24, -510], [24, -510]], mouthF: [0, -454],
    extrasF(ctx) { shape(ctx, spline([[-40, -466], [-12, -480], [0, -476], [12, -480], [40, -466], [30, -458], [0, -468], [-30, -458]], true, 5), { fill: HAIR, line: 0, seed: 194, grain: 0.2 }); },
  },
};
export function drawDost(ctx, pose, t = 0) {
  const view = pose.view === 'front' ? 'front' : 'q', front = view === 'front';
  begin(ctx, { ...pose, shadowR: 92 });
  if (!front) drawArm(ctx, pose, 'B', DOST, 320);
  legPair(ctx, front, P.cream, P.creamD, 4, 40, -200, -24, 322, null, P.umber, DOST.skin);
  ctx.save(); torsoTilt(ctx, pose, view);
  // the kurta: long, to the knee, side slits
  const kurta = spline([[-58, -404], [-46, -426], [46, -426], [58, -404], [56, -300], [62, -170], [-62, -170], [-56, -300]], true, 6);
  shape(ctx, kurta, { fill: P.olive, line: 4.2, seed: 325, grain: 0.35, breaks: 0.2, shade: front ? null : [{ pts: [[26, -434], [76, -434], [76, -160], [30, -160]], color: P.oliveD, alpha: 0.55 }] });
  ink(ctx, [[-60, -230], [-56, -172]], 3, { seed: 326, color: P.oliveD, taper: false }); ink(ctx, [[60, -230], [58, -172]], 3, { seed: 327, color: P.oliveD, taper: false });
  shape(ctx, rect(-12, -442, 24, 22), { fill: DOST.skin, line: 0, seed: 328, grain: 0 });
  const cx = front ? 0 : 12;
  shape(ctx, rrect(cx - 16, -430, 32, 14, 5), { fill: P.oliveL, line: 2.8, seed: 329, grain: 0.1 });
  ink(ctx, [[cx, -418], [cx, -340]], 2.6, { seed: 330, color: P.oliveD, taper: false });
  [-400, -376, -352].forEach((y, i) => shape(ctx, ellipse(cx + 5, y, 3.4, 3.4, 8), { fill: P.mustardL, line: 0, grain: 0, seed: 331 + i }));
  drawHead(ctx, pose, DOST.head);
  if (pose.held) pose.held(ctx);
  drawArm(ctx, pose, 'F', DOST, 340);
  if (front) drawArm(ctx, pose, 'B', DOST, 320);
  ctx.restore(); ctx.restore();
}

// ---- संचालक (operator): pale blue shirt, teal Nehru jacket (the shop's colour), rectangular specs. Usually seen above a counter.
const OP = {
  skin: P.skin.op, sleeve: 'full', sleeveCol: P.shirtBlue, sleeveColD: P.shirtBlueD, ua: 102, fa: 94,
  head: {
    skin: P.skin.op,
    chain: [[50, -486], [48, -512], [32, -540], [-6, -556], [-46, -540], [-62, -500], [-58, -456], [-40, -424], [-10, -408], [22, -410], [40, -424], [46, -442], [50, -458]],
    tip: [76, -470], ear: [-24, -470],
    hairQ: spline([[48, -526], [30, -550], [-8, -568], [-50, -552], [-68, -504], [-62, -462], [-48, -468], [-44, -498], [-24, -522], [6, -532], [34, -528], [46, -520]], true, 6),
    eyeQ: [[16, -490], [44, -493]], mouthQ: [34, -432], cheekQ: [-2, -452],
    extrasQ(ctx) { ink(ctx, rrect(2, -502, 28, 22, 6), 3, { closed: true, seed: 195 }); ink(ctx, rrect(36, -503, 18, 22, 5), 3, { closed: true, seed: 196 }); ink(ctx, [[30, -494], [36, -494]], 2.4, { seed: 197, taper: false }); ink(ctx, [[2, -494], [-20, -486]], 2.4, { seed: 198, taper: false }); },
    frontR: [56, 70], hairF: spline([[-58, -500], [-50, -548], [-6, -568], [46, -552], [60, -508], [52, -500], [30, -530], [-10, -534], [-40, -522], [-52, -504]], true, 6),
    eyeF: [[-22, -486], [22, -486]], mouthF: [0, -436],
    extrasF(ctx) { [-22, 22].forEach((x, i) => ink(ctx, rrect(x - 16, -498, 32, 24, 7), 3, { closed: true, seed: 199 + i })); ink(ctx, [[-6, -488], [6, -488]], 2.4, { seed: 201, taper: false }); },
  },
};
export function drawOperator(ctx, pose, t = 0) {
  const view = pose.view === 'front' ? 'front' : 'q', front = view === 'front';
  begin(ctx, { ...pose, shadow: false });
  if (!front) drawArm(ctx, pose, 'B', OP, 350);
  ctx.save();
  const torso = front ? spline([[-62, -384], [-48, -404], [48, -404], [62, -384], [58, -250], [-58, -250]], true, 6) : spline([[-56, -384], [-44, -404], [46, -404], [58, -384], [54, -250], [-54, -250]], true, 6);
  shape(ctx, torso, { fill: P.shirtBlue, line: 4.2, seed: 352, grain: 0.3, breaks: 0.2 });
  // Nehru jacket: two front panels with a mandarin collar
  const jl = front ? [[-62, -384], [-48, -404], [-14, -404], [-4, -260], [-58, -250]] : [[-56, -384], [-44, -404], [-4, -404], [4, -260], [-54, -250]];
  const jr = front ? [[14, -404], [48, -404], [62, -384], [58, -250], [4, -260]] : [[22, -404], [46, -404], [58, -384], [54, -250], [12, -260]];
  shape(ctx, jl, { fill: P.teal, line: 4, seed: 353, grain: 0.35, breaks: 0.18 });
  shape(ctx, jr, { fill: P.teal, line: 4, seed: 354, grain: 0.35, breaks: 0.18, shade: front ? null : [{ pts: [[30, -410], [70, -410], [70, -240], [34, -240]], color: P.tealD, alpha: 0.6 }] });
  shape(ctx, rect(-11, -420, 22, 18), { fill: OP.skin, line: 0, seed: 355, grain: 0 });
  shape(ctx, rrect(front ? -18 : -8, -412, 36, 12, 4), { fill: P.teal, line: 2.8, seed: 356, grain: 0.1 });
  [-370, -334, -298].forEach((y, i) => shape(ctx, ellipse(front ? -6 : 2, y, 3.4, 3.4, 8), { fill: P.mustardL, line: 0, grain: 0, seed: 357 + i }));
  shape(ctx, rrect(front ? 24 : 30, -380, 18, 6, 2), { fill: P.mustard, line: 0, seed: 360, grain: 0 });   // a pen in the pocket
  drawHead(ctx, pose, OP.head);
  if (pose.held) pose.held(ctx);
  drawArm(ctx, pose, 'F', OP, 362);
  if (front) drawArm(ctx, pose, 'B', OP, 350);
  ctx.restore(); ctx.restore();
}

export const DRAW = { son: drawSon, maa: drawMaa, bhai: drawBhai, dost: drawDost, op: drawOperator };
export const RIGS = { son: SON, maa: MAA, bhai: BHAI, dost: DOST, op: OP };
// screen position of a joint (for props and call-out leaders): local point → screen (without camera)
export function toScreen(pose, p) { const s = pose.s ?? 1, d = pose.dir ?? 1; return [pose.x + p[0] * s * d, pose.y + p[1] * s]; }
export function handPos(who, pose, which = 'F') { return toScreen(pose, armJoints(pose, which, RIGS[who]).ha); }

// pose blending: arms by angle, the rest switches at the half (limited animation: one in-between)
export function blendPose(a, b, k) {
  const out = { ...(k < 0.5 ? a : b) };
  for (const arm of ['armF', 'armB']) if (a[arm] && b[arm]) out[arm] = { a1: lerp(a[arm].a1, b[arm].a1, k), a2: lerp(a[arm].a2, b[arm].a2, k) };
  for (const key of ['x', 'y', 's', 'slump', 'bow']) if (typeof a[key] === 'number' && typeof b[key] === 'number') out[key] = lerp(a[key], b[key], k);
  if (a.look && b.look) out.look = [lerp(a.look[0], b.look[0], k), lerp(a.look[1], b.look[1], k)];
  return out;
}

// two-bone IK in local units: arm angles that put the hand at local point (tx,ty). bend +1 = elbow below the line
export function ikArm(who, pose, which, tx, ty, bend = 1) {
  const rig = RIGS[who], view = pose.view === 'front' ? 'front' : 'q';
  const sh = rig.sh?.[view]?.[which] || DEF[view][which].sh;
  const L1 = (rig.ua || 102) * (pose[which === 'F' ? 'usF' : 'usB'] ?? 1), L2 = (rig.fa || 94) * (pose[which === 'F' ? 'fsF' : 'fsB'] ?? 1);
  const dx = tx - sh[0], dy = ty - sh[1], D = Math.min(L1 + L2 - 0.5, Math.max(1, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx), c = clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1), al = Math.acos(c);
  const a1 = base + bend * al, ex = sh[0] + Math.cos(a1) * L1, ey = sh[1] + Math.sin(a1) * L1;
  const hx = sh[0] + Math.cos(base) * D, hy = sh[1] + Math.sin(base) * D;
  return { a1, a2: Math.atan2(hy - ey, hx - ex) };
}
// world point -> a character's local units
export function toLocal(pose, wx, wy) { const s = pose.s ?? 1, d = pose.dir ?? 1; return [(wx - pose.x) / (s * d), (wy - pose.y) / s]; }
