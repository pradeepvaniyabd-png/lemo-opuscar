// One timeline drives picture, sound, score and subtitles (TREATMENT.md §6–7).
// 120 BPM, 4/4, bar 1 starts at -0.25 s (the film opens on its second beat).
export const W = 1080, H = 1920, FPS = 24;
export const BPM = 120, BEAT = 0.5, BAR = 2, T0 = -0.25;
export const bar = (n, b = 0) => T0 + (n - 1) * BAR + b * BEAT;   // bar n (from 1), beat b (from 0)
export const DUR = 59.7;
export const HOLD_AT = 55.0;               // CTA dead still from here

// voice lines: id, start (s), speaker on screen (null = narrator)
export const VO = [
  { id: 'p1', t: 0.80, who: 'son' }, { id: 'f1', t: 7.90, who: 'dost' },
  { id: 's1', t: 18.35 }, { id: 's2', t: 22.05 }, { id: 's3', t: 26.05 }, { id: 's4', t: 29.55 }, { id: 's5', t: 33.05 },
  { id: 'p2', t: 36.95, who: 'son' }, { id: 'v2', t: 41.10 }, { id: 'v3', t: 46.10 }, { id: 'v4', t: 51.25 }, { id: 'v5', t: 55.10 },
];
// sections
export const SEC = {
  problem: 0, silence1: 6.95, friend: 7.75, pan: 11.80, shop: 12.25, push: 15.0, inside: 15.6,
  steps: [17.75, 21.75, 25.75, 29.25, 32.75], relief: 36.75, hush2: 40.25, clockIris: 40.75, plan: 41.15, cta: 45.75, end: DUR,
};
// caption cues: one per line; the two long lines split at a phrase (split = the word the second cue starts on)
export const SPLITS = {
  p1: { word: 'मेरा', a: 'अरे यार! माँ की पेंशन, भाई का समग्र-संबल...', b: 'मेरा अटका हुआ PF... कहाँ-कहाँ भटकूँ?' },
  f1: { word: 'चलो', a: 'अरे भाई! जब सब एक ही जगह हो जाता है, तो भटकना क्यों?', b: 'चलो, सार्थक ऑनलाइन सेवा केंद्र!' },
};
export function captionCues(lines, durs, words) {
  const text = Object.fromEntries(lines.map(l => [l.id, l.text]));
  const cues = [];
  VO.forEach((v, i) => {
    const d = durs[v.id] ?? 3, next = VO[i + 1];
    let t1 = Math.max(v.t + 1.8, v.t + d + 0.6);
    if (next) t1 = Math.min(t1, next.t - 0.05);
    t1 = Math.min(t1, DUR - 0.05);
    const sp = SPLITS[v.id], t0 = Math.max(v.t - 0.05, cues.length ? cues[cues.length - 1].t1 : -1);
    if (sp) {
      const w = (words[v.id] || []).find(w => w.w.replace(/[^ऀ-ॿ]/g, '').startsWith(sp.word));
      const ts = v.t + (w ? w.t0 : d * 0.55) - 0.05;
      cues.push({ t0, t1: ts, text: sp.a, id: v.id + 'a' }, { t0: ts, t1, text: sp.b, id: v.id + 'b' });
    } else cues.push({ t0, t1, text: text[v.id], id: v.id });
  });
  return cues;
}
