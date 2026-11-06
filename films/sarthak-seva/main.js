// Page contract: window.READY, window.render(t), window.DUR, window.EV, window.TEXTS(t), window.SRT
import { textures } from './engine/toon.js';
import { W, H, DUR } from './timeline.js';
const Q = new URLSearchParams(location.search);
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const g = cv.getContext('2d');
const sample = 'अआइ सार्थक AePS 0123 ₹ …';
await Promise.all(['400 80px Title', '400 80px Kicker', '500 40px Body', '600 40px Body'].map(f => document.fonts.load(f, sample)));
textures();
const get = async (u, d) => { try { return await (await fetch(u)).json(); } catch (e) { return d; } };
const [lines, durs, words, env] = await Promise.all([get('voice/lines.json', []), get('voice/dur.json', {}), get('voice/words.json', {}), get('voice/env.json', {})]);
const film = await import('./film.js');
film.setup(lines, durs, words, env);
window.DUR = DUR; window.EV = film.events(); window.SRT = film.cues();
window.render = t => { g.setTransform(1, 0, 0, 1, 0, 0); film.renderFilm(g, t, Q); };
window.TEXTS = t => { window.render(t); return film.texts(); };
window.READY = true;
