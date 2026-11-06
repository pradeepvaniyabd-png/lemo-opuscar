"""Score for "सार्थक ऑनलाइन सेवा केंद्र": an original West-Coast cool-jazz combo (STYLE §7) —
vibraphone (chords, tremolo, glissandi), flute (theme and fills), pizzicato jazz bass, brushes + suspended-cymbal
"ride", bongos in an eight-beat keherwa-like groove, glockenspiel as celesta, a muted-trumpet sigh.
120 BPM, swung eighths, bar 1 starts at -0.25 s. Key path: D minor (the wandering) → F major (friend, shop,
one vibraphone chord per service) → silence → D major (the paths straighten: the circling bass motif becomes
an ascending D-major scale, one note per straightened path) → CTA in D.
Run from the library root:  .venv/bin/python films/sarthak-seva/music/score.py
Writes music/score.wav, music/stems/*.wav, music/hits.json, music/CREDITS_music.txt."""
import sys, os, json
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
from core.audio import sampler as S
from core.audio.sfx import SR, add

OUT = os.path.dirname(os.path.abspath(__file__))
S.seed(77)
rng = np.random.default_rng(77)
B, BAR, T0, DUR, SW = 0.5, 2.0, -0.25, 59.7, 0.60
N = int(round(DUR * SR))


def T(bar, beat=0.0, swing=SW):
    whole = np.floor(beat + 1e-9); frac = beat - whole
    if abs(frac - .5) < 1e-6: frac = swing
    return T0 + (bar - 1) * BAR + (whole + frac) * B


def M(p): return S.midi(p) if isinstance(p, str) else p


stems = {k: np.zeros((N, 2), np.float32) for k in ('drums', 'perc', 'bass', 'vib', 'lead')}
hits = []
def hit(t, label): hits.append(dict(t=round(float(t), 4), label=label))
def jit(ms=5): return float(rng.uniform(-ms, ms)) / 1000
def put(stem, x, t, g=1.0, pan=0.0):
    if t < 0:
        k = int(-t * SR)
        if k >= len(x): return
        x, t = x[k:], 0.0
    add(stems[stem], x, t, g, pan)


def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def motor(x, rate=5.0, depth=.3, t0=0.0):
    t = np.arange(len(x)) / SR + t0
    return x * (1 - depth * (.5 + .5 * np.sin(2 * np.pi * rate * t))).astype(np.float32)


def vib(t, pitches, dur, vel=.45, pan=-.2, hard=False, trem=0.0, gain=1.0):
    for i, p in enumerate(pitches):
        x = S.note('vibraphone_hard' if hard else 'vibraphone', M(p), dur, vel=vel)
        if trem: x = motor(x, depth=trem, t0=i * .013)
        put('vib', x, t + i * .004, gain, pan + (i - 1.5) * .07)


def vib_run(t0, pitches, step, vel0=.3, vel1=.6, ring=1.0, pan=-.1):
    n = len(pitches)
    for i, p in enumerate(pitches):
        put('vib', S.note('vibraphone_hard', M(p), ring, vel=vel0 + (vel1 - vel0) * i / max(1, n - 1)), t0 + i * step, 1.0, pan + .5 * i / n - .25)


def flute(t, p, beats, vel=.5, stac=False, pan=.18, gain=1.0):
    if stac and M(p) >= 69: x = S.note('flute_stac', M(p), .2, vel=vel)
    else: x = S.note('flute', M(p), max(.12, beats * B * .92), vel=vel, release=.09)
    put('lead', x, t - .02, gain, pan)


def glock(t, p, vel=.45, pan=.35, gain=.8):
    put('lead', S.note('glockenspiel', M(p), 1.6, vel=vel), t, gain, pan)


def bass(t, p, beats=.9, vel=.6, gain=1.0):
    put('bass', S.note('jazz_bass', M(p), max(.1, beats * B), vel=vel, release=.08), t - .012, gain, 0)


def brush_tap(t, v=.5, pan=-.1):
    d = .16; tt = np.arange(int(d * SR)) / SR; n = rng.standard_normal(len(tt))
    x = bp(n, 1500, 9000) * np.exp(-tt / .045) + .5 * bp(n, 300, 1200) * np.exp(-tt / .02) + .25 * np.sin(2 * np.pi * 190 * tt) * np.exp(-tt / .03)
    put('drums', (x / 3.2 * v).astype(np.float32), t, 1, pan)


def brush_sweep(t, d, v=.3, pan=-.15, kind='arc'):
    tt = np.arange(int(d * SR)) / SR; n = rng.standard_normal(len(tt))
    x = bp(n, 1800, 7500) + .35 * bp(n, 500, 1800)
    env = np.sin(np.pi * tt / d) ** 1.5 if kind == 'arc' else np.minimum(1, tt / .012) * np.exp(-tt / (d * .35))
    put('drums', (x * env / 4 * v).astype(np.float32), t, 1, pan)


def brushes(bar0, bar1, v=.3, half=False, taps=True):
    for bar in range(bar0, bar1):
        for h in ((0,) if half else (0, 2)): brush_sweep(T(bar, h) + jit(4), (4 if half else 2) * B * 1.05, v * .8)
        for bt in ((2,) if half else (1, 3)):
            if taps: brush_tap(T(bar, bt) + jit(4), v * 1.25)
            if not half: put('drums', S.hit('hihat', 'pedal', min(1, .35 * v / .3), .3), T(bar, bt) + .004, .45, .45)


def ride(bar0, bar1, vel=.3):
    for bar in range(bar0, bar1):
        for b in (0, 1, 1.5, 2, 3, 3.5):
            acc = 1.0 if b in (1, 3) else .7
            put('drums', S.hit('sus_cymbal', 'stick', vel * acc, 1.2), T(bar, b) + jit(4), .5, .35)


def bongos(bar0, bar1, v=.4):
    """an eight-beat keherwa-like figure on bongos: dha ge na ti | na ka dhi na"""
    pat = [('bongo_low_high_velocity', 1.0), ('bongo_high', .6), ('bongo_muted', .5), ('bongo_high', .7),
           ('bongo_muted', .5), ('bongo_low_low_velocity', .7), ('bongo_high', .8), ('bongo_muted', .5)]
    for bar in range(bar0, bar1):
        for k, (var, a) in enumerate(pat):
            put('perc', S.hit('world_perc', var, v * a, .4), T(bar, k * .5) + jit(6), .8, .3 if 'high' in var else -.1)


def snap(t, v=.6, pan=.2):
    d = .09; tt = np.arange(int(d * SR)) / SR; n = rng.standard_normal(len(tt))
    x = bp(n, 1800, 6500) * np.exp(-tt / .012) + .4 * np.sin(2 * np.pi * 2200 * tt) * np.exp(-tt / .006)
    put('perc', (x / np.abs(x).max() * v).astype(np.float32), t, .9, pan)


def walk(bar, notes, vel=.58):
    for k, p in enumerate(notes):
        if p: bass(T(bar, k) + jit(3), p, .9, vel * (1.0 if k % 2 == 0 else .92))


V = {
    'Dm9': ['F3', 'A3', 'C4', 'E4'], 'Dm#11': ['F3', 'A3', 'D4', 'G#4'],
    'Fmaj9': ['A3', 'C4', 'E4', 'G4'], 'F69': ['F3', 'A3', 'D4', 'G4'], 'F6': ['A3', 'C4', 'D4', 'F4'], 'Eb/F': ['G3', 'Bb3', 'Eb4'],
    'Gm9': ['F3', 'Bb3', 'D4', 'A4'], 'C13': ['Bb3', 'E4', 'A4'], 'C9sus': ['Bb3', 'D4', 'F4', 'A4'],
    'Bbmaj9': ['A3', 'C4', 'D4', 'F4'], 'Bb6': ['G3', 'Bb3', 'D4', 'F4'], 'C7sus': ['Bb3', 'F4', 'G4'],
    'Am7': ['G3', 'C4', 'E4'], 'A7b9': ['G3', 'C#4', 'E4', 'Bb4'],
    'Dmaj9': ['F#3', 'A3', 'C#4', 'E4'], 'Dmaj9+': ['F#3', 'A3', 'C#4', 'E4', 'A4'], 'Bm9': ['A3', 'D4', 'F#4', 'C#5'],
    'Em9': ['G3', 'B3', 'D4', 'F#4'], 'A13': ['G3', 'C#4', 'F#4'], 'Gmaj7': ['F#3', 'B3', 'D4', 'G4'],
}


def comp(bar, chord, vel=.3, second=None, beat2=1.5):
    vib(T(bar, 0) + jit(3), V[chord], 1.4 * B, vel)
    vib(T(bar, beat2) + jit(3), V[second or chord], .6 * B, vel * .8)


# ============================================================ S1 the problem (bars 1–4): D minor, half-time, wandering
hit(0.75, 'S1: passbook thump = low D')
bass(0.75, 'D2', 2, .7); vib(0.75, V['Dm9'], 2.4, .32, trem=.35)
for bar, a, b in ((2, 'D2', 'E2'), (3, 'F2', 'E2'), (4, 'D2', 'C#2')):
    bass(T(bar, 0), a, 1.9, .55); bass(T(bar, 2), b, 1.9 if bar < 4 else .4, .5)
brushes(1, 5, v=.22, half=True)
vib(T(2, 0), V['Dm9'], 3.6, .26, trem=.3); vib(T(4, 0), V['Dm#11'], 1.1, .26, trem=.35)
# muted-trumpet sigh in the pause after "PF..."
put('lead', S.note('trumpet_mute', 'A4', .26, vel=.42), 5.08, .5, .2); put('lead', S.note('trumpet_mute', 'G#4', .42, vel=.38), 5.36, .5, .2)

# ============================================================ S2 the friend (bars 5–7)
hit(7.75, 'S2: the hand on the shoulder = Fmaj9')
vib(7.75, V['Fmaj9'], 1.8, .5, hard=True); brush_sweep(7.75, .5, .45, kind='hit')
walk(5, ['F2', 'A2', 'C3', 'E3'], .55); walk(6, ['D3', 'C3', 'Bb2', 'A2'], .55)
comp(6, 'Dm9', .26, 'Gm9', beat2=2)
brushes(5, 6, v=.24); brushes(6, 8, v=.28)
hit(11.75, 'S2: snap on "चलो" (bar 7)'); snap(11.75)
bass(T(7, 0), 'C2', .9, .55)
vib_run(11.95, ['F4', 'A4', 'C5', 'E5', 'F5', 'A5', 'C6'], .042, .25, .55, ring=1.0)
# ============================================================ S3 the shop (bars 7–9)
hit(12.25, 'S3: the sign stamps = F6/9 hard')
vib(12.25, V['F69'], 2.0, .55, hard=True); bass(12.25, 'F2', 1.4, .62)
walk(7, [None, None, 'A2', 'C3'], .52)
walk(8, ['F2', 'A2', 'Eb2', 'G2'], .52); walk(9, ['Bb1', 'D2', 'C2', 'E2'], .52)
comp(8, 'F6', .26, 'Eb/F', beat2=2); comp(9, 'Bb6', .26, 'C7sus', beat2=2)
# the theme (flute, F Mixolydian: the flat seventh gives it a Khamaj colour) — enters as the friend's line ends
theme = [(8, 1, 'C5', .5), (8, 1.5, 'D5', .5), (8, 2, 'F5', 1), (8, 3, 'G5', .5), (8, 3.5, 'A5', .5),
         (9, 0, 'G5', 1), (9, 1, 'F5', .5), (9, 1.5, 'Eb5', .5), (9, 2, 'D5', 1), (9, 3, 'C5', .5), (9, 3.5, 'D5', .5)]
for bar, bt, p, d in theme: flute(T(bar, bt), p, d, .52)
flute(T(10, 0), 'F5', .5, .5)
brushes(8, 10, v=.28); bongos(9, 10, .32)

# ============================================================ S4 the five services (bars 10–19½): one vibraphone chord per service
STEPS = [17.75, 21.75, 25.75, 29.25, 32.75]
CH = ['Fmaj9', 'Dm9', 'Bbmaj9', 'C9sus', 'Am7']
ROOT = ['F2', 'D2', 'Bb1', 'C2', 'A1']
for i, (t0, ch) in enumerate(zip(STEPS, CH)):
    hit(t0, f'S4: service {i + 1} = {ch}')
    vib(t0, V[ch], 3.2 if i < 4 else 2.0, .36, trem=.22, hard=(i == 0))
    bass(t0, ROOT[i], 1.0, .62)
vib(30.25, V['C13'], 2.4, .3, trem=.22); vib(34.75, V['A7b9'], 2.0, .32, trem=.25)
hit(18.25, 'S4: the thumb press (after the one-beat hush)')
# walking lines (beats from each step start; bar math via absolute times)
def walk_abs(t0, notes, vel=.55):
    for k, p in enumerate(notes):
        if p: bass(t0 + k * B + jit(3), p, .9, vel)
walk_abs(18.25, ['A2', 'C3', 'E3', 'F2', 'A2', 'C3', 'D3'])                                  # step 1 (after the hush)
walk_abs(22.25, ['F2', 'A2', 'C3', 'D3', 'A2', 'F2', 'E2'])                                   # step 2
walk_abs(26.25, ['D2', 'F2', 'A2', 'Bb2', 'F2', 'D2'])                                        # step 3
walk_abs(29.75, ['E2', 'G2', 'Bb2', 'C3', 'G2'])                                              # step 4
walk_abs(33.25, ['C2', 'E2', 'G2', 'A2', 'A1', 'C#2', 'E2'])                                  # step 5 → A7
for bar in range(10, 19): brushes(bar, bar + 1, v=.26)
ride(14, 19, .26)
bongos(10, 19, .3)
# flute fills only between the narrator's lines
fills = [(21.05, ['A5', 'G5', 'F5']), (25.3, ['D5', 'F5', 'A5']), (28.9, ['F5', 'D5']), (32.2, ['G5', 'A5', 'C6']), (36.15, ['E5', 'G5', 'A5'])]
for t0, ps in fills:
    for k, p in enumerate(ps): flute(t0 + k * .17, p, .34, .46, stac=True)

# ============================================================ S5 relief and the blessing (to 40.25), then silence
hit(36.75, 'S5: relief = Bbmaj9 (deceptive)')
vib(36.75, V['Bbmaj9'], 2.2, .3, trem=.3); bass(36.75, 'Bb1', 3.6, .5)
brush_sweep(36.75, 1.0, .25); brush_sweep(37.75, 1.0, .22)
hit(38.75, 'S5: the blessing = Fmaj9 + glock')
vib(38.75, V['Fmaj9'], 1.6, .3, trem=.32); bass(38.75, 'F2', 2.6, .48); glock(38.75, 'A6', .32); glock(39.0, 'C7', .26)
brush_sweep(38.75, 1.0, .22)

# ============================================================ payoff: the clock opens, the paths straighten (D major)
hit(40.75, 'payoff: vibraphone glissando = first sound after the hush')
vib_run(40.75, ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5', 'D6'], .045, .25, .6, ring=1.2)
vib(41.75, V['Dmaj9'], 1.8, .3, trem=.25); bass(41.75, 'D2', .45, .5)
scale_b = ['D2', 'E2', 'F#2', 'G2', 'A2', 'B2', 'C#3', 'D3']
scale_g = ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7', 'D7']
for k in range(8):
    tk = 42.0 + .25 * k
    hit(tk, f'payoff: path {k + 1} straightens = {scale_b[k]}')
    bass(tk, scale_b[k], .45, .6); glock(tk, scale_g[k], .36 + .02 * k, pan=-.5 + k / 7)
hit(43.75, 'payoff: sunburst = Dmaj9 + bell')
vib(43.75, V['Dmaj9+'], 2.2, .5, hard=True, trem=.3); bass(43.75, 'D2', 1.8, .62)
put('drums', S.hit('sus_cymbal', 'roll', .35, .5), 43.25, .5, .2); put('drums', S.hit('sus_cymbal', 'bell', .5, 2.0), 43.75, .6, .3)
flute(43.75, 'A5', 2, .5); flute(44.75, 'F#5', 2, .46)
brushes(23, 24, v=.28); bongos(23, 24, .3)

# ============================================================ S6 the card (bars 24–30)
hit(45.75, 'CTA: the name stamps = Dmaj9 hard')
vib(45.75, V['Dmaj9'], 1.6, .5, hard=True); bass(45.75, 'D2', .9, .62)
walk(24, [None, 'F#2', 'A2', 'B2'], .5); walk(25, ['G2', 'B2', 'D3', 'E3'], .48); walk(26, ['A2', 'G2', 'F#2', 'E2'], .48)
comp(25, 'Gmaj7', .24); comp(26, 'A13', .24)
for bar in range(24, 27): brushes(bar, bar + 1, v=.24)
bongos(24, 27, .24)
flute(50.62, 'A5', .5, .44, stac=True); flute(50.8, 'B5', .5, .44, stac=True); flute(50.98, 'D6', 1.2, .44)
hit(51.25, 'CTA: address = Bm9'); vib(51.25, V['Bm9'], 1.8, .28, trem=.25); bass(51.25, 'B1', 1.8, .5)
vib(52.25, V['Em9'], 1.6, .26, trem=.25); bass(52.25, 'E2', 1.6, .48)
vib(53.25, V['A13'], 1.4, .26, trem=.25); bass(53.25, 'A1', 1.2, .48)
hit(54.75, 'CTA: the number stamps = Dmaj9'); vib(54.75, V['Dmaj9'], 4.0, .34, hard=True, trem=.25); bass(54.75, 'D2', 4.0, .52)
brush_sweep(54.75, 1.0, .2)          # nothing new under the number: one held chord
hit(58.75, 'end: Dmaj9 + snap'); vib(58.75, V['Dmaj9+'], 1.0, .4, trem=.38); bass(58.75, 'D2', 1.0, .55); snap(58.75, .5)

# ============================================================ silences (the picture's), then master
def gate(a, b, fade=.03):
    m = np.ones(N, np.float32); s, e, f = int(a * SR), int(b * SR), int(fade * SR)
    m[s:e] = 0; m[max(0, s - f):s] *= np.linspace(1, 0, s - max(0, s - f)); m[e:e + f] *= np.linspace(0, 1, len(m[e:e + f]))
    for k in stems: stems[k] *= m[:, None]
gate(6.95, 7.75)          # silence 1: everything off before the hand
gate(18.0, 18.25)         # the one-beat hush before the thumb
gate(40.25, 40.75)        # silence 2: room tone only before the payoff
f = int(.35 * SR); m = np.ones(N, np.float32); m[-f:] = np.linspace(1, 0, f) ** 2
for k in stems: stems[k] *= m[:, None]
gains = {'drums': .8, 'perc': .7, 'bass': 1.0, 'vib': .95, 'lead': .9}
for k in stems: stems[k] *= gains[k]
mix = sum(stems.values())
pk = np.abs(mix).max(); g = .89 / pk if pk > 0 else 1
for k in stems: stems[k] *= g
mix = sum(stems.values())
os.makedirs(f'{OUT}/stems', exist_ok=True)
sf.write(f'{OUT}/score.wav', mix.astype(np.float32), SR, subtype='PCM_24')
for k, x in stems.items(): sf.write(f'{OUT}/stems/{k}.wav', x.astype(np.float32), SR, subtype='PCM_24')
hits.sort(key=lambda h: h['t'])
json.dump(dict(bpm=120, beat=B, t0=T0, duration=DUR, silences=[[6.95, 7.75], [18.0, 18.25], [40.25, 40.75]], hits=hits), open(f'{OUT}/hits.json', 'w'), ensure_ascii=False, indent=1)
used = ['vibraphone', 'vibraphone_hard', 'flute', 'flute_stac', 'jazz_bass', 'hihat', 'sus_cymbal', 'world_perc', 'glockenspiel', 'trumpet_mute']
open(f'{OUT}/CREDITS_music.txt', 'w').write('Music: original score, generated in code for this film\n' + '\n'.join(S.credits(used)) + '\n')
print('score.wav', mix.shape, 'peak', float(np.abs(mix).max()), 'hits', len(hits))
