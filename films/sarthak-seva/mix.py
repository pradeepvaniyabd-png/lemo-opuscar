"""Mix: score (music/score.wav) + Hindi voice + foley by material + ambience -> out/mix.wav
Run from the library root:  .venv/bin/python films/sarthak-seva/mix.py
Needs events.json (core/render/events.mjs), voice/*.wav (tools/tts_hi.py + tools/tighten.py), music/score.wav.
Layers: ambience (a Budni street; then the shop: room tone, ceiling fan, a wall clock on the beat), foley (paper,
passbook, rubber stamps, scanner pips, banknotes, keys, printer, cloth), music. Music ducks ~8 dB under the voice.
Silences: 6.95–7.75 everything off (the first sound after it is the friend's hand); 18.0–18.25 everything off (then the
scanner beep); 40.25–40.75 room tone only (then the vibraphone glissando)."""
import sys, os, json
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, LIB)
import numpy as np, soundfile as sf, soxr
from core.audio.sfx import SR, t_, env_exp, bp, lp, hp, norm, brown, clack, whoosh, thump, ding, pop, add, compress, limit
D = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(D, 'events.json')))
DUR = E['dur']; N = int(round(DUR * SR)); EV = E['ev']
BEAT, T0 = 0.5, -0.25
rng = np.random.default_rng(91)
def nz(d): return rng.standard_normal(len(t_(d)))
def env_ad(d, a=.004, tau=.1):
    x = env_exp(d, tau); n = int(a * SR)
    if n: x[:n] *= np.linspace(0, 1, n)
    return x
def M(*xs):
    n = max(len(x) for x in xs); return sum(np.pad(x, (0, n - len(x))) for x in xs)
def sine(f, d): return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(f, len(t_(d))).astype(float)) / SR)

# ---------------- foley by material ----------------
def paper_swish(d=.3): return norm(bp(nz(d), 1800, 8000)) * np.sin(np.pi * t_(d) / d) ** 2
def paper_slip():                  # a passbook sliding off a paper stack: papery hiss with a flutter
    d = .32; return norm(bp(nz(d), 1500, 7000) * (0.6 + .4 * np.sin(2 * np.pi * 23 * t_(d)))) * np.sin(np.pi * t_(d) / d) ** 1.2
def book_thump():                  # a small booklet on a hard floor: dull card thud + slap
    d = .3; tt = t_(d)
    return norm(M(sine(120 * (1 - .3 * tt), d) * env_exp(d, .04), lp(nz(d), 1100) * env_exp(d, .025) * .9, bp(nz(d), 1800, 5000) * env_exp(d, .008) * .35))
def pen_write(d=.5): x = bp(nz(d), 2000, 7000) * (0.5 + .5 * np.abs(np.sin(2 * np.pi * 11 * t_(d)))); return norm(x) * np.sin(np.pi * t_(d) / d)
def scribble(d=1.0):               # a frantic pen scratch for the tangle
    tt = t_(d); mod = 0.5 + .5 * np.abs(np.sin(2 * np.pi * (14 + 6 * np.sin(2 * np.pi * 1.3 * tt)) * tt))
    return norm(bp(nz(d), 1800, 7500) * mod) * np.minimum(1, tt / .05) * np.minimum(1, (d - tt) / .15)
def pat():                         # a hand landing on a cotton shirt: soft low thump + cloth
    d = .22; return norm(M(sine(105, d) * env_exp(d, .035), lp(nz(d), 900) * env_exp(d, .03) * .8, bp(nz(d), 500, 3000) * env_ad(d, .006, .05) * .4))
def cloth(d=.28): return norm(bp(nz(d), 400, 3200)) * np.sin(np.pi * t_(d) / d) ** 1.5
def tick(): return norm(clack(1.3, 1)[:int(.1 * SR)])
def stamp():                       # rubber stamp: thick, damped, a little paper smack
    d = .3; tt = t_(d); return norm(sine(140 * (1 - .4 * tt), d) * env_exp(d, .035) + lp(nz(d), 1800) * env_exp(d, .012) * .9)
def stamp_big(): return norm(M(stamp(), thump(.8, 70)[:int(.3 * SR)] * .7))
def sign_stamp():                  # a wooden signboard slapping into place
    return norm(M(stamp_big(), np.pad(clack(.7, 1)[:int(.12 * SR)], (int(.01 * SR), 0)) * .5))
def iris(d=.4): tt = t_(d); return norm(bp(nz(d), 1000, 6000) * np.linspace(1, .2, len(tt))) * np.sin(np.pi * tt / d)
def palm_tap(): return norm(lp(nz(.09), 1400) * env_exp(.09, .012))
def beep_ok():                     # the fingerprint scanner: a click, then two rising pips
    out = np.zeros(int(.42 * SR)); c = norm(clack(1.6, 1)[:int(.05 * SR)]) * .5; out[:len(c)] += c
    for k, (f, at) in enumerate(((1760, .02), (2349, .15))):
        d = .16; x = sine(f, d) * env_ad(d, .004, .06) + .15 * sine(2 * f, d) * env_exp(d, .02); o = int(at * SR); out[o:o + len(x)] += x * .8
    return norm(out)
def note_flick():                  # a banknote snapped between fingers
    d = .12; tt = t_(d); return norm(hp(nz(d), 2500) * env_exp(d, .012) + bp(nz(d), 600, 2500) * env_exp(d, .03) * .4)
def check(): return norm(M(pen_write(.16) * .7, np.pad(ding(.4)[:int(.3 * SR)], (int(.08 * SR), 0)) * .25))
def keys(d=.6):                    # keyboard: plastic clicks, ~12 per second
    out = np.zeros(int(d * SR)); t = 0.0
    while t < d - .05:
        c = norm(clack(1.8 + rng.uniform(-.2, .2), 1)[:int(.04 * SR)]) * rng.uniform(.4, .8); o = int(t * SR); out[o:o + len(c)] += c[:len(out) - o]; t += rng.uniform(.06, .11)
    return norm(out)
def pip(n): d = .2; f = [1318.5, 1568, 2093][n % 3]; return norm(sine(f, d) * env_ad(d, .004, .06) + sine(f * 2.01, d) * env_exp(d, .03) * .2)
def plastic(p=1.0, d=.18):
    return norm(hp(nz(d), 1500) * env_exp(d, .003) + sine(620 * p, d) * env_exp(d, .025) * .6 + sine(1340 * p, d) * env_exp(d, .015) * .3)
def card_snap(): return norm(M(plastic(1.5, .14), pop(.6)[:int(.14 * SR)] * .5))
def sparkle():
    d = .7; tt = t_(d); return norm(sum(sine(f, d) * env_exp(d, .12 + .05 * k) * (.6 ** k) for k, f in enumerate((3520, 4699, 5274))) * np.minimum(1, tt / .01))
def rubber_stamp(): return norm(M(stamp(), paper_swish(.12) * .4))
def lock(): return norm(M(clack(1.9, 1)[:int(.08 * SR)], np.pad(ding(.5)[:int(.25 * SR)], (int(.03 * SR), 0)) * .25))
def printer(d=1.5):                # motor hum + roller whirr + paper feed
    tt = t_(d); f = 92 * (1 + .015 * np.sin(2 * np.pi * 6 * tt)); saw = (np.cumsum(f) / SR) % 1 * 2 - 1
    x = bp(saw, 150, 1800) * .5 + bp(nz(d), 2500, 7000) * .25 * (0.6 + .4 * np.sin(2 * np.pi * 17 * tt))
    return norm(x) * np.minimum(1, tt / .08) * np.minimum(1, (d - tt) / .12)
def paper_out(): return norm(M(paper_swish(.35) * .8, bp(nz(.35), 300, 1200) * env_exp(.35, .08) * .3))
def clock_tick(): return norm(clack(1.1, 1)[:int(.1 * SR)])
def straighten(n):                 # a taut thread pulled straight: a short rising zip
    d = .22; tt = t_(d); f = np.linspace(900, 2600, len(tt)); x = bp(nz(d), 1200, 6000) * (0.5 + .5 * np.sin(2 * np.pi * np.cumsum(f) / SR))
    return norm(x) * np.sin(np.pi * tt / d) ** 1.5
def shimmer(): d = 1.4; tt = t_(d); return norm(bp(nz(d), 4000, 11000)) * np.sin(np.pi * tt / d) ** 2 * .6

fx = np.zeros((N, 2)); vo = np.zeros((N, 2)); amb = np.zeros((N, 2))
for e in EV:
    t, ty, gn, pan = e['t'], e['type'], e.get('gain', 1.0), e.get('pan', 0.0)
    if ty == 'vo': continue
    if ty == 'paper_slip': add(fx, paper_slip(), t, .4, .15)
    elif ty == 'book_thump': add(fx, book_thump(), t, .75, pan)
    elif ty == 'pop': add(fx, pop(1), t, .3 * gn, pan)
    elif ty == 'pen': add(fx, pen_write(e.get('dur', .5)), t, .16, pan)
    elif ty == 'scribble': add(fx, scribble(e.get('dur', 1.0)), t, .2 * gn, 0)
    elif ty == 'pat': add(fx, pat(), t, .8 * gn, -.2)
    elif ty == 'swish': add(fx, paper_swish(.3), t, .32 * gn, pan)
    elif ty == 'tick': add(fx, tick(), t, .15, .1)
    elif ty == 'cloth': add(fx, cloth(), t, .28 * gn, 0)
    elif ty == 'snap': pass                                   # the score plays the snap
    elif ty == 'whoosh': add(fx, whoosh(e.get('dur', .4), 1), t, .3 * gn, 0)
    elif ty == 'sign_stamp': add(fx, sign_stamp(), t, .75, .1)
    elif ty == 'iris': add(fx, iris(e.get('dur', .4)), t, .25, 0)
    elif ty == 'namaste': add(fx, palm_tap(), t, .3, 0)
    elif ty == 'stamp': add(fx, stamp(), t, .7, 0)
    elif ty == 'beep_ok': add(fx, beep_ok(), t, .42, -.1)
    elif ty == 'note_flick': add(fx, note_flick(), t, .35, pan)
    elif ty == 'check': add(fx, check(), t, .3, .2)
    elif ty == 'keys': add(fx, keys(e.get('dur', .6)), t, .22, .25)
    elif ty == 'pip': add(fx, pip(e.get('n', 0)), t, .22, -.2 + .2 * e.get('n', 0))
    elif ty == 'ding': add(fx, ding(1), t, .3, .2)
    elif ty == 'card_snap': add(fx, card_snap(), t, .45, -.1)
    elif ty == 'sparkle': add(fx, sparkle(), t, .12, .3)
    elif ty == 'rubber_stamp': add(fx, rubber_stamp(), t, .8, 0)
    elif ty == 'lock': add(fx, lock(), t, .35, .2)
    elif ty == 'printer': add(fx, printer(e.get('dur', 1.5)), t, .2, .2)
    elif ty == 'paper_out': add(fx, paper_out(), t, .3 * gn, .2)
    elif ty == 'clock_tick': add(fx, clock_tick(), t, .35, .4)
    elif ty == 'straighten': add(fx, straighten(e.get('n', 0)), t, .1, pan)
    elif ty == 'shimmer': add(fx, shimmer(), t, .12, 0)
    elif ty == 'stamp_big': add(fx, stamp_big(), t, .8, 0)

# ---------------- voice ----------------
vo_env = np.zeros(N)
for e in EV:
    if e['type'] != 'vo': continue
    y, sr = sf.read(os.path.join(D, 'voice', e['id'] + '.wav'), dtype='float64')
    if y.ndim > 1: y = y.mean(1)
    if sr != SR: y = soxr.resample(y, sr, SR)
    y = compress(norm(y, .9), thr=.3, ratio=3.0)
    pan = -.08 if e['id'] in ('p1', 'p2') else .1 if e['id'] == 'f1' else 0.0
    add(vo, y, e['t'], .8, pan)
    s = int(e['t'] * SR); vo_env[s:s + len(y)] = 1

# ---------------- ambience ----------------
def fade_in_out(n, a, b):
    m = np.ones(n); k = int(a * SR); m[:k] = np.linspace(0, 1, k); k = int(b * SR); m[-k:] = np.linspace(1, 0, k); return m
def street(t0, t1):
    d = t1 - t0; x = lp(brown(d), 500) * .02
    for at, dur in ((1.2, 2.6), (8.6, 3.0)):          # a distant scooter passing
        if at < t0 or at > t1: continue
        tt = t_(dur); f = 110 * (1 + .25 * np.sin(np.pi * tt / dur) * 0) + 18 * np.sin(2 * np.pi * .4 * tt)
        sc = bp((np.cumsum(f) / SR) % 1 * 2 - 1, 120, 900) * np.sin(np.pi * tt / dur) ** 2 * .012
        o = int((at - t0) * SR); x[o:o + len(sc)] += sc[:len(x) - o]
    for at in np.arange(t0 + .9, t1 - .3, 2.3):        # a mynah somewhere
        c = sine(np.linspace(1700, 2600, int(.09 * SR)), .09) * env_ad(.09, .005, .04) * .006
        o = int((at - t0 + rng.uniform(0, .5)) * SR); x[o:o + len(c)] += c[:len(x) - o]
    x *= fade_in_out(len(x), .05, .25); add(amb, x, t0, 1.0, 0)
def shop(t0, t1, fan=True):
    d = t1 - t0; tt = t_(d); x = lp(brown(d), 600) * .016
    if fan: x += bp(rng.standard_normal(len(tt)), 200, 900) * (0.6 + .4 * np.sin(2 * np.pi * 3.3 * tt)) * .004
    x *= fade_in_out(len(x), .5, .4); add(amb, x, t0, 1.0, 0)
    for k in range(int(np.ceil((t0 - T0) / (2 * BEAT))), int((t1 - T0) / (2 * BEAT))):     # wall clock on the half-note grid
        t = T0 + k * 2 * BEAT
        if t0 + .2 < t < t1 - .2: add(amb, clack(1.1, 1)[:int(.08 * SR)], t, .022, .5)
street(0.0, 7.0); street(7.75, 15.3); shop(14.65, 41.6); shop(41.2, DUR, fan=False)

# ---------------- music + ducking ----------------
mus, msr = sf.read(os.path.join(D, 'music', 'score.wav'), dtype='float64')
if msr != SR: mus = soxr.resample(mus, msr, SR)
mus = mus[:N] if len(mus) >= N else np.pad(mus, ((0, N - len(mus)), (0, 0)))
k = int(.12 * SR); sm = np.convolve(vo_env, np.ones(k) / k, 'same')
mus = mus * (1 - sm * (1 - 10 ** (-8 / 20)))[:, None]

# ---------------- silences ----------------
def gate(buf, a, b, fade=.025):
    s, e, f = int(a * SR), int(b * SR), int(fade * SR); m = np.ones(N); m[s:e] = 0
    m[max(0, s - f):s] = np.linspace(1, 0, s - max(0, s - f)); m[e:e + f] = np.linspace(0, 1, len(m[e:e + f])); buf *= m[:, None]
for buf in (amb, fx, mus): gate(buf, 6.95, 7.75)          # silence 1
for buf in (amb, fx, mus): gate(buf, 18.0, 18.25)         # the hush before the thumb
for buf in (fx, mus): gate(buf, 40.25, 40.75)             # silence 2: room tone only

mix = mus * 1.2 + fx * .8 + vo + amb
mix = limit(mix, .95)
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out', 'mix.wav'), mix.astype(np.float32), SR)
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
vmask = vo_env > 0
print('mix.wav', mix.shape, 'peak', round(float(np.abs(mix).max()), 3),
      '| voice RMS (where speaking)', round(rms_db(vo[vmask]), 1), 'dB | music under voice', round(rms_db(mus[vmask] * 1.2), 1), 'dB')
