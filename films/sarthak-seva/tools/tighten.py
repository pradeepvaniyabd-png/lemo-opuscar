"""Shorten long pauses inside each voice line (edge-tts leaves 0.5–0.9 s at commas and ellipses; a 60 s ad
can't afford them). Every silent stretch (20 ms RMS below -38 dB relative to the line's peak) longer than the
line's cap is cut down to the cap with 15 ms fades. Reads voice/<id>.wav, keeps the untouched copy as
voice/raw/<id>.wav, rewrites dur.json.   python tools/tighten.py voice/lines.json voice/"""
import sys, os, json, shutil
import numpy as np, soundfile as sf
lines, d = json.load(open(sys.argv[1])), sys.argv[2]
os.makedirs(os.path.join(d, 'raw'), exist_ok=True)
dur = {}
for L in lines:
    src, raw = os.path.join(d, L['id'] + '.wav'), os.path.join(d, 'raw', L['id'] + '.wav')
    if not os.path.exists(raw) or os.path.getmtime(src) > os.path.getmtime(raw): shutil.copy2(src, raw)
    y, sr = sf.read(raw, dtype='float32')
    cap = L.get('pause', 0.30)
    hop = int(.02 * sr); n = len(y) // hop
    rms = np.array([np.sqrt(np.mean(y[i*hop:(i+1)*hop] ** 2) + 1e-12) for i in range(n)])
    quiet = 20 * np.log10(rms / (np.abs(y).max() + 1e-9)) < -38
    keep = np.ones(len(y), bool); i = 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]: j += 1
            a, b = i * hop, j * hop
            if 0 < a and b < len(y) and (b - a) > cap * sr:      # internal pause only
                cut = (b - a) - int(cap * sr); m = a + (b - a) // 2
                keep[m - cut // 2: m - cut // 2 + cut] = False
            i = j
        else: i += 1
    # 15 ms fades around each cut
    out = []; segs = np.flatnonzero(np.diff(np.r_[0, keep.astype(int), 0]))
    f = int(.015 * sr)
    for s, e in zip(segs[::2], segs[1::2]):
        z = y[s:e].copy()
        if s > 0: z[:f] *= np.linspace(0, 1, min(f, len(z)))[:len(z[:f])]
        if e < len(y): z[-f:] *= np.linspace(1, 0, min(f, len(z)))[:len(z[-f:])]
        out.append(z)
    y2 = np.concatenate(out); sf.write(src, y2, sr)
    dur[L['id']] = round(len(y2) / sr, 3)
    print(f"{L['id']:4s} {len(y)/sr:6.3f} -> {dur[L['id']]:6.3f}")
json.dump(dur, open(os.path.join(d, 'dur.json'), 'w'), indent=1)
print('total', round(sum(dur.values()), 2))
