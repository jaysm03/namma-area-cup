"""Namma Area Cup backend: static files + tiny JSON API on SQLite. Stdlib only."""
import json, os, re, sqlite3, time, threading, secrets
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.expanduser(os.environ.get("NAMMA_DATA", "~/sites/namma-data"))
os.makedirs(DATA, exist_ok=True)
DB = os.path.join(DATA, "db.sqlite")
RESULTS = os.path.join(DATA, "results.json")  # {"winners": [63 x null|areaIndex]}
TOKF = os.path.join(DATA, "admin_token")
if not os.path.exists(TOKF):
    with open(TOKF, "w") as f: f.write(secrets.token_urlsafe(24))
    os.chmod(TOKF, 0o600)
ADMIN = open(TOKF).read().strip()
PORT = int(os.environ.get("PORT", "8790"))
STARTS, PTS = [0, 32, 48, 56, 60, 62], [1, 2, 4, 8, 16, 32]
STATIC_EXT = {".html", ".js", ".css", ".png", ".svg", ".ico", ".jpg", ".webp"}
HANDLE_RE = re.compile(r"[A-Za-z0-9._]{1,30}")
lock, hits = threading.Lock(), {}

SCHEMA = """create table if not exists preds(id integer primary key, platform text, handle text collate nocase,
  note text, picks text, token text, created real, updated real, ip text, hidden int default 0,
  unique(platform, handle))"""

def db():
    c = sqlite3.connect(DB, timeout=10); c.row_factory = sqlite3.Row
    c.execute("pragma journal_mode=wal"); c.execute(SCHEMA); return c

def rnd(m): return max(i for i, s in enumerate(STARTS) if m >= s)

def parse_picks(code):
    """Full 63-pick bracket where every pick is a legal entrant of its match, else None."""
    if not isinstance(code, str) or not re.fullmatch(r"[0-9a-z]{126}", code): return None
    p = [int(code[i:i + 2], 36) for i in range(0, 126, 2)]
    for m, v in enumerate(p):
        r = rnd(m)
        if r == 0: legal = (2 * m, 2 * m + 1)
        else:
            i = m - STARTS[r]; legal = (p[STARTS[r - 1] + 2 * i], p[STARTS[r - 1] + 2 * i + 1])
        if v not in legal: return None
    return p

def winners():
    try: w = json.load(open(RESULTS)).get("winners", [])
    except Exception: w = []
    return (w + [None] * 63)[:63]

def score(p, w):
    pts = correct = settled = 0
    for m, win in enumerate(w):
        if win is None: continue
        settled += 1
        if p[m] == win: correct += 1; pts += PTS[rnd(m)]
    return pts, correct, settled

def rows():
    with db() as c:
        return [dict(r) for r in c.execute("select id,platform,handle,note,picks,created from preds where hidden=0 order by created desc")]

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
    def ip(self): return self.headers.get("CF-Connecting-IP") or self.client_address[0]
    def send_json(self, obj, code=200):
        b = json.dumps(obj).encode()
        self.send_response(code); self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store"); self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        try: return self._get()
        except Exception as e:
            print("GET error", self.path, repr(e), flush=True)
            try: self.send_json({"error": "Server error. Try again."}, 500)
            except Exception: pass

    def do_POST(self):
        try: return self._post()
        except Exception as e:
            print("POST error", self.path, repr(e), flush=True)
            try: self.send_json({"error": "Server error. Try again."}, 500)
            except Exception: pass

    def _get(self):
        u = urlparse(self.path); q = {k: v[0] for k, v in parse_qs(u.query).items()}
        if u.path == "/api/stats": return self.stats()
        if u.path == "/api/predictions": return self.listing(q)
        if u.path.startswith("/api/"): return self.send_json({"error": "not found"}, 404)
        path = u.path if u.path != "/" else "/index.html"
        if ".." in path or "/." in path or os.path.splitext(path)[1] not in STATIC_EXT:
            return self.send_json({"error": "not found"}, 404)
        return super().do_GET()

    def stats(self):
        rs, w = rows(), winners(); champs = {}
        good = 0
        for r in rs:
            p = parse_picks(r["picks"])
            if p is None: continue
            good += 1; champs[p[62]] = champs.get(p[62], 0) + 1
        top = sorted(champs.items(), key=lambda kv: -kv[1])
        self.send_json({"total": good, "champions": [{"area": a, "n": n} for a, n in top],
                        "settled": sum(x is not None for x in w)})

    def listing(self, q):
        w, needle = winners(), q.get("q", "").lstrip("@").lower().strip()
        out = []
        for r in rows():
            if needle and needle not in r["handle"].lower(): continue
            p = parse_picks(r["picks"])
            if p is None: continue
            pts, cor, st = score(p, w)
            out.append({**r, "champion": p[62], "points": pts, "correct": cor, "settled": st})
        if q.get("sort") == "points": out.sort(key=lambda x: (-x["points"], x["created"]))
        for i, x in enumerate(out): x["rank"] = i + 1 if q.get("sort") == "points" else None
        off = max(0, int(q.get("offset", "0") or 0))
        self.send_json({"total": len(out), "items": out[off:off + 25]})

    def _post(self):
        u = urlparse(self.path)
        try:
            n = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(min(n, 20000)) or b"{}")
        except Exception: return self.send_json({"error": "Bad request"}, 400)
        if u.path == "/api/prediction": return self.submit(body)
        if u.path == "/api/admin/results":
            if not secrets.compare_digest(str(body.get("token", "")), ADMIN): return self.send_json({"error": "forbidden"}, 403)
            w = body.get("winners")
            if not (isinstance(w, list) and len(w) == 63 and all(x is None or (isinstance(x, int) and 0 <= x < 64) for x in w)):
                return self.send_json({"error": "winners must be 63 x null|0-63"}, 400)
            tmp = RESULTS + ".tmp"; json.dump({"winners": w}, open(tmp, "w")); os.replace(tmp, RESULTS)
            return self.send_json({"ok": True, "settled": sum(x is not None for x in w)})
        if u.path == "/api/admin/hide":
            if not secrets.compare_digest(str(body.get("token", "")), ADMIN): return self.send_json({"error": "forbidden"}, 403)
            with db() as c: c.execute("update preds set hidden=1 where id=?", (int(body.get("id", 0)),))
            return self.send_json({"ok": True})
        self.send_json({"error": "not found"}, 404)

    def submit(self, b):
        platform = b.get("platform"); handle = str(b.get("handle", "")).strip().lstrip("@")
        note = " ".join(str(b.get("note", "")).split())[:280]; p = parse_picks(b.get("picks"))
        if platform not in ("instagram", "x"): return self.send_json({"error": "Pick Instagram or X."}, 400)
        if not HANDLE_RE.fullmatch(handle): return self.send_json({"error": "Username can only have letters, numbers, dots and underscores."}, 400)
        if p is None: return self.send_json({"error": "Finish all 63 picks before submitting."}, 400)
        now, ip = time.time(), self.ip()
        with lock:
            hits[ip] = [t for t in hits.get(ip, []) if now - t < 3600]
            if len(hits[ip]) >= 10: return self.send_json({"error": "Too many submissions. Try again in an hour."}, 429)
            hits[ip].append(now)
            with db() as c:
                ex = c.execute("select id, token from preds where platform=? and lower(handle)=lower(?)", (platform, handle)).fetchone()
                if ex:
                    if not secrets.compare_digest(str(b.get("token") or ""), ex["token"]):
                        return self.send_json({"error": "@%s already has a bracket. Use a different username." % handle}, 409)
                    c.execute("update preds set picks=?, note=?, updated=?, ip=? where id=?", (b["picks"], note, now, ip, ex["id"]))
                    return self.send_json({"ok": True, "id": ex["id"], "token": ex["token"], "updated": True})
                tok = secrets.token_urlsafe(16)
                cur = c.execute("insert into preds(platform,handle,note,picks,token,created,updated,ip) values(?,?,?,?,?,?,?,?)",
                                (platform, handle, note, b["picks"], tok, now, now, ip))
                return self.send_json({"ok": True, "id": cur.lastrowid, "token": tok, "updated": False})

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
