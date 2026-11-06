"""Every picture hit lands on the music grid and on its music hit.
   python tools/cuecheck.py   (reads events.json and music/hits.json)"""
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
E = json.load(open(os.path.join(D, 'events.json')))['ev']; H = json.load(open(os.path.join(D, 'music', 'hits.json')))
T0, B = H['t0'], H['beat']
GRID = {'book_thump', 'pat', 'sign_stamp', 'stamp', 'stamp_big', 'beep_ok', 'straighten', 'clock_tick', 'swish'}
hits = [h['t'] for h in H['hits']]
off_grid, unmatched = [], []
for e in E:
    if e['type'] not in GRID: continue
    k = (e['t'] - T0) / (B / 2); d = abs(k - round(k)) * B / 2
    if d > 0.001: off_grid.append((e['t'], e['type'], round(d * 1000, 1)))
key = [e for e in E if e['type'] in ('pat', 'sign_stamp', 'beep_ok', 'straighten', 'stamp_big') and e.get('gain', 1) >= 1]
for e in key:
    m = min(abs(e['t'] - h) for h in hits)
    if m > 0.001: unmatched.append((e['t'], e['type'], round(m * 1000, 1)))
print('events on the half-beat grid:', sum(1 for e in E if e['type'] in GRID) - len(off_grid), '/', sum(1 for e in E if e['type'] in GRID))
for x in off_grid: print('  off grid (ms):', x)
print('key hits matched by the score:', len(key) - len(unmatched), '/', len(key))
for x in unmatched: print('  no music hit within 1 ms:', x)
sys.exit(1 if off_grid or unmatched else 0)
