// Props and places for the film, drawn in the style (off-register fills, broken ink, flat shade planes).
// Every prop draws around its own anchor (noted per function) at scale s.
import { shape, ink, ellipse, spline, xform, move, rrect, rect, TAU, clamp, lerp, seg, ss, eo, back, text, star, sparkle, rays, dashed, subpath, starPts, kidney } from './toon.js';
import { P } from './cast.js';

const S = (ctx, x, y, s, rot = 0) => { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(s, s); };
const E = ctx => ctx.restore();

// ---- paperwork -------------------------------------------------------------------------------
// a sheet of paper with ruled lines (anchor: centre)
export function sheet(ctx, x, y, s, o = {}) {
  const { w = 150, h = 190, col = P.white, rot = 0, lines = 6, head = null, seed = 400 } = o;
  S(ctx, x, y, s, rot);
  shape(ctx, rect(-w / 2, -h / 2, w, h), { fill: col, line: 3.4, seed, grain: 0.18, breaks: 0.15 });
  if (head) shape(ctx, rect(-w / 2 + 12, -h / 2 + 12, w - 24, 22), { fill: head, line: 0, seed: seed + 1, grain: 0.1 });
  for (let i = 0; i < lines; i++) ink(ctx, [[-w / 2 + 16, -h / 2 + 50 + i * 20], [w / 2 - 16 - (i % 3) * 18, -h / 2 + 50 + i * 20]], 2.4, { seed: seed + 2 + i, color: P.inkSoft, taper: false, alpha: 0.7 });
  E(ctx);
}
// the stack the son carries (anchor: bottom centre). k = droop 0..1
export function paperStack(ctx, x, y, s, o = {}) {
  const { droop = 0 } = o;
  S(ctx, x, y, s, droop * 0.08);
  const cols = [P.powder, P.white, P.coralL, P.lime, P.white, P.mustardL, P.white];
  cols.forEach((c, i) => {
    const dx = Math.sin(i * 1.7) * 9, rot = Math.sin(i * 2.3) * 0.05;
    S(ctx, dx, -14 - i * 16, 1, rot);
    shape(ctx, rect(-82, -12, 164, 22), { fill: c, line: 3, seed: 410 + i, grain: 0.15, breaks: 0.2 });
    E(ctx);
  });
  // a clip and a folder edge
  shape(ctx, rrect(-90, -10, 180, 18, 4), { fill: P.umber, line: 3.2, seed: 418, grain: 0.3 });
  shape(ctx, rrect(-16, -126, 32, 16, 4), { fill: P.greyD, line: 2.6, seed: 419, grain: 0 });
  E(ctx);
}
// the mother's pension passbook (anchor: centre)
export function passbook(ctx, x, y, s, rot = 0) {
  S(ctx, x, y, s, rot);
  shape(ctx, rrect(-46, -30, 92, 60, 6), { fill: P.plum, line: 3.4, seed: 420, grain: 0.3 });
  ink(ctx, [[-30, -10], [30, -10]], 6, { color: P.mustard, seed: 421, taper: false });
  shape(ctx, ellipse(0, 12, 9, 9, 12), { fill: P.mustard, line: 0, seed: 422, grain: 0 });
  E(ctx);
}
// a neat folder (the son at the end; anchor: centre)
export function folder(ctx, x, y, s, rot = 0) {
  S(ctx, x, y, s, rot);
  shape(ctx, rrect(-70, -88, 140, 176, 8), { fill: P.teal, line: 3.6, seed: 425, grain: 0.3, shade: [{ pts: rect(30, -95, 50, 190), color: P.tealD, alpha: 0.5 }] });
  shape(ctx, rrect(-40, -54, 80, 30, 5), { fill: P.paper, line: 2.8, seed: 426, grain: 0.1 });
  check(ctx, 0, 30, 0.7, 1, P.mustardL);
  E(ctx);
}
// ink check mark drawn on (u 0..1); anchor: centre
export function check(ctx, x, y, s = 1, u = 1, col = P.ink) {
  if (u <= 0) return;
  S(ctx, x, y, s);
  ink(ctx, [[-34, -2], [-10, 24], [38, -30]], 13, { color: col, seed: 430, taper: false, upto: clamp(u), wob: 0.1 });
  E(ctx);
}

// ---- offices and buildings (front-view icons, anchor: bottom centre) --------------------------------
export function office(ctx, kind, x, y, s, o = {}) {
  S(ctx, x, y, s);
  const wall = o.wall || P.sand;
  if (kind === 'bank') {
    shape(ctx, [[-110, -150], [0, -214], [110, -150]], { fill: P.mustard, line: 3.6, seed: 440, grain: 0.3 });
    text(ctx, '₹', 0, -158, { font: '400 44px Title', fill: P.ink, align: 'center' });
    shape(ctx, rect(-100, -150, 200, 20), { fill: P.paper, line: 3.2, seed: 441 });
    for (let i = 0; i < 4; i++) shape(ctx, rect(-84 + i * 50, -130, 18, 108), { fill: P.paper, line: 3, seed: 442 + i, grain: 0.15 });
    shape(ctx, rect(-110, -22, 220, 22), { fill: P.paperD, line: 3.2, seed: 446 });
  } else if (kind === 'samagra') {
    shape(ctx, rect(-100, -170, 200, 170), { fill: wall, line: 3.6, seed: 450, grain: 0.3, shade: [{ pts: rect(50, -180, 60, 190), color: P.sandD, alpha: 0.6 }] });
    shape(ctx, rect(-110, -186, 220, 24), { fill: P.coral, line: 3.2, seed: 451 });
    // an ID card on the facade
    shape(ctx, rrect(-58, -144, 116, 74, 8), { fill: P.white, line: 3, seed: 452 });
    shape(ctx, rect(-46, -132, 36, 44), { fill: P.powder, line: 2.4, seed: 453 });
    for (let i = 0; i < 3; i++) ink(ctx, [[0, -126 + i * 16], [44, -126 + i * 16]], 3, { seed: 454 + i, color: P.inkSoft, taper: false });
    shape(ctx, rect(-26, -56, 52, 56), { fill: P.umber, line: 3, seed: 458 });
  } else if (kind === 'pf') {
    shape(ctx, rect(-96, -200, 192, 200), { fill: P.powder, line: 3.6, seed: 460, grain: 0.3, shade: [{ pts: rect(46, -210, 60, 220), color: P.powderD, alpha: 0.6 }] });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) shape(ctx, rect(-72 + c * 52, -180 + r * 46, 36, 30), { fill: P.paper, line: 2.6, seed: 461 + r * 3 + c, grain: 0.1 });
    shape(ctx, rrect(-50, -248, 100, 44, 8), { fill: P.ink, line: 0, seed: 470, off: [0, 0] });
    text(ctx, 'PF', 0, -214, { font: '400 34px Title', fill: P.paper, align: 'center' });
    shape(ctx, rect(-22, -40, 44, 40), { fill: P.umber, line: 3, seed: 471 });
  } else if (kind === 'home') {
    shape(ctx, [[-90, -110], [0, -190], [90, -110]], { fill: P.tomato, line: 3.6, seed: 480, grain: 0.3 });
    shape(ctx, rect(-76, -110, 152, 110), { fill: P.mustardL, line: 3.6, seed: 481, grain: 0.3 });
    shape(ctx, rect(-20, -64, 40, 64), { fill: P.umber, line: 3, seed: 482 });
    shape(ctx, rect(30, -86, 32, 30), { fill: P.powder, line: 2.6, seed: 483 });
  } else if (kind === 'shop') {      // the shop as a small icon (plan view and CTA)
    shape(ctx, rect(-110, -150, 220, 150), { fill: P.sand, line: 3.6, seed: 490, grain: 0.3 });
    shape(ctx, rect(-124, -214, 248, 70), { fill: P.teal, line: 3.8, seed: 491, grain: 0.25 });
    text(ctx, 'सार्थक', 0, -166, { font: '400 46px Title', fill: P.paper, align: 'center' });
    shape(ctx, rect(-80, -120, 160, 120), { fill: P.inkSoft, line: 3, seed: 492 });
    shape(ctx, rect(-80, -120, 160, 18), { fill: P.greyD, line: 2.6, seed: 493 });
    shape(ctx, rect(-70, -60, 140, 60), { fill: P.umber, line: 2.6, seed: 494 });
  }
  E(ctx);
}

// ---- the Janpad Panchayat gate (anchor: bottom centre of the arch, width ~ 420) -----------------
export function gate(ctx, x, y, s, label = 'जनपद पंचायत बुधनी', reg) {
  S(ctx, x, y, s);
  [-170, 170].forEach((px, i) => {
    shape(ctx, rect(px - 34, -440, 68, 440), { fill: P.sand, line: 3.8, seed: 500 + i, grain: 0.3, shade: [{ pts: rect(px + 6, -450, 40, 460), color: P.sandD, alpha: 0.6 }] });
    shape(ctx, rect(px - 46, -470, 92, 36), { fill: P.mustard, line: 3.4, seed: 502 + i });
    shape(ctx, ellipse(px, -486, 22, 18, 20), { fill: P.mustard, line: 3, seed: 504 + i });
  });
  shape(ctx, rect(-210, -560, 420, 92), { fill: P.coral, line: 4, seed: 506, grain: 0.3 });
  ink(ctx, [[-200, -478], [200, -478]], 6, { color: P.mustard, seed: 507, taper: false });
  const r = text(ctx, label, 0, -500, { font: '400 50px Title', fill: P.paper, align: 'center', maxW: 390, plate: P.coralD, off: [3, 3] });
  E(ctx);
  return r;
}
// a neem tree (anchor: trunk base)
export function tree(ctx, x, y, s, seed = 510) {
  S(ctx, x, y, s);
  shape(ctx, [[-14, 0], [-10, -160], [10, -160], [16, 0]], { fill: P.umber, line: 3.4, seed, grain: 0.3 });
  shape(ctx, kidney(0, -250, 150, 0.2), { fill: P.olive, line: 3.6, seed: seed + 1, grain: 0.35, shade: [{ pts: kidney(40, -230, 120, 0.2), color: P.oliveD, alpha: 0.5 }] });
  E(ctx);
}
// the shop front (anchor: bottom centre; width ~ 620). signK = stamp-in scale of the board
export function shopFront(ctx, x, y, s, o = {}) {
  const { signK = 1, inside = null } = o;
  S(ctx, x, y, s);
  shape(ctx, rect(-310, -470, 620, 470), { fill: P.sand, line: 4, seed: 520, grain: 0.3, shade: [{ pts: rect(210, -480, 110, 490), color: P.sandD, alpha: 0.6 }] });
  // the open shop: dark interior, shutter rolled up at the top
  shape(ctx, rect(-250, -360, 500, 360), { fill: P.inkSoft, line: 3.6, seed: 521, grain: 0.2 });
  if (inside) { ctx.save(); ctx.beginPath(); ctx.rect(-250, -340, 500, 340); ctx.clip(); inside(ctx); ctx.restore(); }
  shape(ctx, rect(-262, -392, 524, 40), { fill: P.greyD, line: 3.4, seed: 522, grain: 0.2 });
  for (let i = 0; i < 3; i++) ink(ctx, [[-250, -382 + i * 10], [250, -382 + i * 10]], 2.2, { seed: 523 + i, color: P.ink, taper: false, alpha: 0.6 });
  // step
  shape(ctx, rect(-280, -16, 560, 16), { fill: P.paperDD, line: 3, seed: 527 });
  E(ctx);
  // the board stamps on above
  if (signK > 0) {
    S(ctx, x, y - 540 * s, s * signK, (1 - signK) * 0.3);
    shape(ctx, rrect(-330, -96, 660, 192, 14), { fill: P.teal, line: 4.4, seed: 530, grain: 0.3, off: [8, 6] });
    E(ctx);
  }
}
export function shopBoardText(ctx, x, y, s, k = 1) {
  if (k <= 0) return [];
  S(ctx, x, y, s * k, (1 - k) * 0.3);
  text(ctx, 'सार्थक', 0, -6, { font: '400 92px Title', fill: P.paper, align: 'center', plate: P.tealDD, off: [4, 4] });
  text(ctx, 'ऑनलाइन सेवा केंद्र', 0, 64, { font: '400 50px Title', fill: P.mustardL, align: 'center', plate: P.tealDD, off: [3, 3] });
  E(ctx);
}

// ---- the counter and its machines -------------------------------------------------------------
// counter (anchor: top-left of the top surface; w wide, h tall)
export function counter(ctx, x, y, w, h) {
  shape(ctx, rect(x, y, w, 26), { fill: P.umber, line: 4, seed: 540, grain: 0.3 });
  shape(ctx, rect(x + 10, y + 26, w - 20, h - 26), { fill: P.sandD, line: 4, seed: 541, grain: 0.3, shade: [{ pts: rect(x + w - 90, y + 20, 100, h), color: P.umber, alpha: 0.25 }] });
  ink(ctx, [[x + 10, y + 70], [x + w - 10, y + 70]], 14, { color: P.teal, seed: 542, taper: false, wob: 0.05 });
}
// monitor (anchor: bottom centre of the stand). screen(ctx, w, h) draws inside the screen rect centred at 0,0
export function monitor(ctx, x, y, s, screen) {
  S(ctx, x, y, s);
  shape(ctx, [[-50, 0], [50, 0], [24, -14], [-24, -14]], { fill: P.inkSoft, line: 3, seed: 550 });
  shape(ctx, rect(-10, -60, 20, 48), { fill: P.inkSoft, line: 3, seed: 551 });
  shape(ctx, rrect(-150, -250, 300, 196, 12), { fill: P.ink, line: 0, seed: 552, off: [0, 0] });
  shape(ctx, rect(-136, -238, 272, 168), { fill: P.powder, line: 0, seed: 553, grain: 0.1 });
  if (screen) { ctx.save(); ctx.beginPath(); ctx.rect(-136, -238, 272, 168); ctx.clip(); ctx.translate(0, -154); screen(ctx, 272, 168); ctx.restore(); }
  E(ctx);
}
// fingerprint scanner (anchor: bottom centre); lit 0..1 → green glass
export function scanner(ctx, x, y, s, lit = 0, press = 0) {
  S(ctx, x, y, s);
  shape(ctx, spline([[-70, 0], [-64, -46], [-40, -60], [40, -60], [64, -46], [70, 0]], true, 4), { fill: P.inkSoft, line: 3.6, seed: 560, grain: 0.2 });
  shape(ctx, rrect(-34, -56 + press * 3, 68, 34, 8), { fill: lit > 0.5 ? '#7BC47F' : P.slate, line: 3, seed: 561, grain: 0.1 });
  if (lit > 0.5) for (let i = 0; i < 3; i++) ink(ctx, ellipse(0, -39 + press * 3, 8 + i * 7, 6 + i * 5, 20, 0.3, TAU - 0.3), 2, { seed: 562 + i, color: P.white, taper: false, alpha: 0.8 });
  shape(ctx, ellipse(48, -24, 6, 6, 10), { fill: lit > 0.5 ? '#7BC47F' : P.coral, line: 2, seed: 566, grain: 0 });
  E(ctx);
}
// printer (anchor: bottom centre). feed(ctx) draws the sheet coming out (in printer space, slot at y=-120)
export function printer(ctx, x, y, s, o = {}) {
  S(ctx, x, y, s);
  if (o.behind) o.behind(ctx);
  shape(ctx, rrect(-120, -120, 240, 120, 12), { fill: P.paperD, line: 3.8, seed: 570, grain: 0.25, shade: [{ pts: rect(70, -130, 60, 140), color: P.paperDD, alpha: 0.7 }] });
  shape(ctx, rect(-90, -128, 180, 16), { fill: P.inkSoft, line: 3, seed: 571 });
  shape(ctx, ellipse(86, -60, 8, 8, 12), { fill: o.busy ? '#7BC47F' : P.slate, line: 2, seed: 572, grain: 0 });
  shape(ctx, rect(-70, -40, 140, 14), { fill: P.inkSoft, line: 2.6, seed: 573 });
  E(ctx);
}
// banknotes, generic (no real design): anchor centre
export function note(ctx, x, y, s, rot = 0, col = P.lime) {
  S(ctx, x, y, s, rot);
  shape(ctx, rrect(-70, -34, 140, 68, 6), { fill: col, line: 3, seed: 580, grain: 0.2 });
  ink(ctx, rrect(-60, -24, 120, 48, 4), 2, { closed: true, seed: 581, color: P.oliveD, taper: false, alpha: 0.7 });
  text(ctx, '₹', 0, 13, { font: '400 36px Title', fill: P.oliveD, align: 'center' });
  E(ctx);
}
export function coin(ctx, x, y, r) {
  shape(ctx, ellipse(x, y, r, r, 30), { fill: P.mustard, line: 3.4, seed: 585, grain: 0.2 });
  ink(ctx, ellipse(x, y, r * 0.76, r * 0.76, 30), 2.2, { closed: true, seed: 586, color: P.mustardD, taper: false });
  text(ctx, '₹', x, y + r * 0.38, { font: `400 ${Math.round(r * 1.1)}px Title`, fill: P.ink, align: 'center' });
}
// Sambal card (anchor centre)
export function card(ctx, x, y, s, rot = 0, label = 'संबल') {
  S(ctx, x, y, s, rot);
  shape(ctx, rrect(-110, -70, 220, 140, 12), { fill: P.white, line: 3.6, seed: 590, grain: 0.15 });
  shape(ctx, rrect(-110, -70, 220, 44, 12), { fill: P.coral, line: 0, seed: 591 });
  text(ctx, label, 0, -36, { font: '400 34px Title', fill: P.white, align: 'center' });
  shape(ctx, rect(-92, -14, 56, 66), { fill: P.powder, line: 2.6, seed: 592 });
  shape(ctx, ellipse(-64, 8, 14, 16, 14), { fill: P.skin.bhai, line: 2.2, seed: 593 });
  for (let i = 0; i < 3; i++) ink(ctx, [[-20, -4 + i * 20], [88 - i * 16, -4 + i * 20]], 3, { seed: 594 + i, color: P.inkSoft, taper: false });
  E(ctx);
}
// PF form (anchor centre)
export function pfForm(ctx, x, y, s, rot = 0) {
  S(ctx, x, y, s, rot);
  shape(ctx, rect(-120, -160, 240, 320), { fill: P.white, line: 3.6, seed: 600, grain: 0.15 });
  shape(ctx, rect(-104, -144, 208, 50), { fill: P.powder, line: 2.6, seed: 601 });
  text(ctx, 'PF', -60, -106, { font: '400 40px Title', fill: P.ink, align: 'center' });
  for (let i = 0; i < 6; i++) ink(ctx, [[-100, -60 + i * 30], [100 - (i % 2) * 40, -60 + i * 30]], 2.6, { seed: 603 + i, color: P.inkSoft, taper: false, alpha: 0.75 });
  E(ctx);
}
// padlock (anchor centre). open 0..1 lifts the shackle
export function padlock(ctx, x, y, s, open = 0) {
  S(ctx, x, y, s);
  ink(ctx, ellipse(open * 18, -44 - open * 30, 30, 34, 26, Math.PI, TAU), 10, { seed: 610, taper: false });
  ink(ctx, [[-30 + open * 18, -44 - open * 30], [-30 + open * 18, -20 - open * 30 + (open > 0.5 ? -10 : 0)]], 10, { seed: 611, taper: false });
  ink(ctx, [[30 + open * 18, -44 - open * 30], [30 + open * 18, -18]], 10, { seed: 612, taper: false });
  shape(ctx, rrect(-46, -24, 92, 70, 10), { fill: P.mustard, line: 3.8, seed: 613, grain: 0.25 });
  shape(ctx, ellipse(0, 6, 8, 8, 10), { fill: P.ink, line: 0, off: [0, 0] });
  shape(ctx, rect(-3, 8, 6, 18), { fill: P.ink, line: 0, off: [0, 0] });
  E(ctx);
}
// rubber stamp (anchor: bottom of the rubber)
export function rubberStamp(ctx, x, y, s) {
  S(ctx, x, y, s);
  shape(ctx, rect(-40, -24, 80, 24), { fill: P.coralD, line: 3.2, seed: 620 });
  shape(ctx, rect(-30, -40, 60, 18), { fill: P.umber, line: 3, seed: 621 });
  shape(ctx, rect(-10, -110, 20, 72), { fill: P.umber, line: 3, seed: 622 });
  shape(ctx, ellipse(0, -122, 26, 18, 18), { fill: P.umberD, line: 3, seed: 623 });
  E(ctx);
}
// khasra map sheet (anchor centre)
export function khasra(ctx, x, y, s, rot = 0) {
  S(ctx, x, y, s, rot);
  shape(ctx, rect(-130, -170, 260, 340), { fill: P.white, line: 3.6, seed: 630, grain: 0.15 });
  const parcels = [[[-110, -150], [-10, -150], [-20, -40], [-110, -60]], [[-10, -150], [110, -150], [110, -70], [-20, -40]], [[-110, -60], [-20, -40], [-30, 60], [-110, 40]],
    [[-20, -40], [110, -70], [110, 50], [-30, 60]], [[-110, 40], [-30, 60], [-40, 150], [-110, 150]], [[-30, 60], [110, 50], [110, 150], [-40, 150]]];
  const cols = [P.lime, P.mustardL, P.oliveL, P.sand, P.lime, P.mustardL];
  parcels.forEach((p, i) => { shape(ctx, p, { fill: cols[i], line: 2.4, seed: 631 + i, grain: 0.2, alpha: 0.9 }); text(ctx, String(12 + i * 7), p.reduce((a, q) => a + q[0], 0) / 4, p.reduce((a, q) => a + q[1], 0) / 4 + 10, { font: '400 26px Title', fill: P.inkSoft, align: 'center' }); });
  E(ctx);
}
// certificate with a seal (anchor centre)
export function certificate(ctx, x, y, s, rot = 0) {
  S(ctx, x, y, s, rot);
  shape(ctx, rect(-130, -170, 260, 340), { fill: P.paper, line: 3.6, seed: 640, grain: 0.15 });
  ink(ctx, rect(-114, -154, 228, 308), 3, { closed: true, seed: 641, color: P.teal, taper: false });
  for (let i = 0; i < 5; i++) ink(ctx, [[-90, -110 + i * 34], [90 - (i % 2) * 30, -110 + i * 34]], 3, { seed: 642 + i, color: P.inkSoft, taper: false, alpha: 0.8 });
  star(ctx, 60, 110, 40, { n: 16, inner: 0.8, fill: P.coral, off: [0, 0] });
  shape(ctx, ellipse(60, 110, 24, 24, 20), { fill: P.coralD, line: 2.4, seed: 648 });
  E(ctx);
}

// ---- the wall clock (anchor centre). time in hours (10.1 = 10:06) ---------------------------------
export function clock(ctx, x, y, r, hours = 10.15, sec = 0) {
  shape(ctx, ellipse(x, y, r + 10, r + 10, 48), { fill: P.teal, line: 4.2, seed: 650, grain: 0.25 });
  shape(ctx, ellipse(x, y, r, r, 48), { fill: P.paper, line: 3.4, seed: 651, grain: 0.15 });
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ink(ctx, [[x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78], [x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9]], i % 3 ? 3 : 5, { seed: 652 + i, taper: false }); }
  const ha = (hours % 12) / 12 * TAU - Math.PI / 2, ma = (hours % 1) * TAU - Math.PI / 2, sa = sec / 60 * TAU - Math.PI / 2;
  ink(ctx, [[x, y], [x + Math.cos(ha) * r * 0.5, y + Math.sin(ha) * r * 0.5]], 8, { seed: 665, taper: true });
  ink(ctx, [[x, y], [x + Math.cos(ma) * r * 0.74, y + Math.sin(ma) * r * 0.74]], 5, { seed: 666, taper: true });
  ink(ctx, [[x - Math.cos(sa) * r * 0.12, y - Math.sin(sa) * r * 0.12], [x + Math.cos(sa) * r * 0.8, y + Math.sin(sa) * r * 0.8]], 2.4, { seed: 667, taper: false, color: P.coralD });
  shape(ctx, ellipse(x, y, 7, 7, 10), { fill: P.ink, line: 0, off: [0, 0] });
}

// ---- small icons -------------------------------------------------------------------------------
export function pin(ctx, x, y, s, col = P.coral) {
  S(ctx, x, y, s);
  shape(ctx, spline([[0, 0], [-26, -40], [-30, -66], [-16, -90], [16, -90], [30, -66], [26, -40]], true, 6), { fill: col, line: 3.4, seed: 670, grain: 0.2 });
  shape(ctx, ellipse(0, -62, 12, 12, 14), { fill: P.paper, line: 2.6, seed: 671 });
  E(ctx);
}
export function phoneIcon(ctx, x, y, s, col = P.ink) {
  S(ctx, x, y, s);
  const h = spline([[-30, -34], [-14, -40], [-6, -22], [-16, -12], [-4, 8], [12, 18], [22, 6], [40, 14], [36, 32], [18, 40], [-10, 26], [-32, 2]], true, 5);
  shape(ctx, h, { fill: col, line: 0, seed: 675, grain: 0.1 });
  E(ctx);
}
