"""Hindi voice: runs the library's edge-tts tool (core/tts/tts_zh.py) unchanged.
    python tools/tts_hi.py voice/lines.json voice/
If SSL_CERT_FILE is set (a TLS-inspecting proxy, as in a cloud sandbox), edge-tts is given that CA bundle,
because it otherwise trusts only certifi's list. On a normal machine nothing changes."""
import os, ssl, sys, runpy
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
ca = os.environ.get('SSL_CERT_FILE')
if ca and os.path.exists(ca):
    import edge_tts.communicate as C
    C._SSL_CTX = ssl.create_default_context(cafile=ca)
sys.argv = [os.path.join(LIB, 'core/tts/tts_zh.py')] + sys.argv[1:]
runpy.run_path(sys.argv[0], run_name='__main__')
