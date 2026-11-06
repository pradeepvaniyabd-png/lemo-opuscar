"""Hindi speech-to-text check of every voice line (the library's asr_check.py compares Hindi word by word,
which fails on spelling variants such as ज़/ज or बी-1 / बी वन). Compares what Whisper hears with the line's
spoken text ("say", else "text") by character similarity after normalising nukta, punctuation and spaces.
    python tools/check_hi.py voice/lines.json voice/ [--model large-v3-turbo] [--threshold 0.80]
Writes voice/words.json (word timestamps per line) and voice/asr.txt. Exit 1 if any line falls below the threshold."""
import sys, os, json, re, argparse, difflib, unicodedata
import numpy as np, soundfile as sf

def norm(s):
    s = unicodedata.normalize('NFC', s.lower())
    s = s.replace('़', '')                       # nukta: ज़ → ज
    s = re.sub(r'[ँं]', 'ं', s)            # chandrabindu ~ anusvara
    s = re.sub(r'[^\wऀ-ॿ]', '', s)          # punctuation and spaces out
    return s

ap = argparse.ArgumentParser()
ap.add_argument('lines'); ap.add_argument('dir')
ap.add_argument('--model', default=os.environ.get('WHISPER_MODEL', 'large-v3-turbo'))
ap.add_argument('--threshold', type=float, default=0.80)
a = ap.parse_args()
from faster_whisper import WhisperModel
m = WhisperModel(a.model, device='cpu', compute_type='int8')
L = json.load(open(a.lines)); words, bad, rep = {}, 0, []
for x in L:
    y, sr = sf.read(os.path.join(a.dir, x['id'] + '.wav'), dtype='float32')
    if y.ndim > 1: y = y.mean(1)
    if sr != 16000:
        import soxr; y = soxr.resample(y, sr, 16000)
    pad = np.zeros(8000, np.float32)                   # 0.5 s each side
    segs, _ = m.transcribe(np.concatenate([pad, y, pad]), language='hi', beam_size=5, word_timestamps=True,
                           initial_prompt='यह हिंदी में एक विज्ञापन है।')
    segs = list(segs); got = ''.join(s.text for s in segs).strip()
    want = x.get('asr') or x.get('say') or x['text']
    r = difflib.SequenceMatcher(None, norm(want), norm(got)).ratio()
    ok = r >= a.threshold; bad += not ok
    words[x['id']] = [dict(w=w.word.strip(), t0=round(max(0, w.start - .5), 3), t1=round(max(0, w.end - .5), 3)) for s in segs for w in (s.words or [])]
    line = f"{'ok ' if ok else 'BAD'} {x['id']:4s} {r:.2f}  want: {want}\n               got:  {got}"
    print(line, flush=True); rep.append(line)
json.dump(words, open(os.path.join(a.dir, 'words.json'), 'w'), ensure_ascii=False, indent=1)
open(os.path.join(a.dir, 'asr.txt'), 'w').write('\n'.join(rep) + f'\nmismatches: {bad} (model={a.model})\n')
print('mismatches:', bad, f'(model={a.model})'); sys.exit(1 if bad else 0)
