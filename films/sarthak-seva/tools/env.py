"""Lip-sync envelopes: for every voice line, mouth openness 0..1 at 24 fps (RMS in 40 ms windows,
normalised to the line's 95th percentile, gated). Writes voice/env.json.   python tools/env.py voice/lines.json voice/"""
import sys, os, json
import numpy as np, soundfile as sf
L, d = json.load(open(sys.argv[1])), sys.argv[2]
out = {}
for x in L:
    y, sr = sf.read(os.path.join(d, x['id'] + '.wav'), dtype='float32')
    if y.ndim > 1: y = y.mean(1)
    hop = sr // 24; win = int(.04 * sr); n = int(np.ceil(len(y) / hop))
    r = np.array([np.sqrt(np.mean(y[max(0, i * hop - win // 2): i * hop + win // 2] ** 2) + 1e-12) for i in range(n)])
    r = r / (np.percentile(r, 95) + 1e-9)
    r = np.clip((r - 0.12) / 0.88, 0, 1) ** 0.8
    out[x['id']] = [round(float(v), 2) for v in r]
json.dump(out, open(os.path.join(d, 'env.json'), 'w'))
print('env', {k: len(v) for k, v in out.items()})
