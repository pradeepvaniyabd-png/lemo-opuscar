// Caption cues from the same timeline the page uses → cues.json (for core/render/srt.py)
//   node tools/cues.mjs [out.json]
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { captionCues } from '../timeline.js';
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = f => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
const cues = captionCues(J('voice/lines.json'), J('voice/dur.json'), J('voice/words.json')).map(({ t0, t1, text }) => ({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), text }));
fs.writeFileSync(process.argv[2] || path.join(D, 'out/cues.json'), JSON.stringify(cues, null, 1));
// the reading rules (DIRECTOR §7): every cue ≥ 1.8 s; every line's captions last ≥ its speech + 0.6 s; no overlaps
const dur = J('voice/dur.json'); let bad = 0;
cues.forEach((c, i) => { if (c.t1 - c.t0 < 1.8 - 1e-6) { bad++; console.log('short cue', c); } if (i && cues[i - 1].t1 > c.t0 + 1e-6) { bad++; console.log('overlap', c); } });
console.log(`${cues.length} cues, ${bad} problems`);
