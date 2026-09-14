import os, json, base64, urllib.request, concurrent.futures as cf

KEY = os.environ["PIXELLAB_KEY"]
URL = "https://api.pixellab.ai/v1/generate-image-pixflux"
OUT = "assets"

STYLE = ("pixel art, visual novel character portrait, warm cozy palette, "
         "clean readable pixels, soft rim light")

MINH = ("young Vietnamese man, late twenties, short tidy black hair, "
        "olive-green button shirt rolled sleeves, sitting at a cafe table")
LINH = ("young Vietnamese woman, late twenties, shoulder-length black hair "
        "tucked behind one ear, mustard-yellow cardigan over white top, "
        "sitting at a cafe table")

JOBS = [
  ("bg", f"cozy Vietnamese coffee shop interior seen from a seat at the table, "
         f"warm afternoon light through window, plants, wooden counter, "
         f"empty foreground table with two iced coffees, {STYLE}, no people",
   400, 232, dict(view="side", shading="medium shading", detail="highly detailed",
                  outline="selective outline"), 7001),

  ("minh_asking",   f"{MINH}, leaning forward asking a question, eyebrows raised, curious open face, {STYLE}", 200,200, {}, 4210),
  ("minh_listening",f"{MINH}, relaxed listening, gentle attentive half-smile, chin resting on hand, {STYLE}", 200,200, {}, 4210),
  ("minh_correcting",f"{MINH}, thoughtful helpful expression, one index finger raised slightly, kind not stern, {STYLE}", 200,200, {}, 4210),

  ("linh_talking",  f"{LINH}, mid-sentence telling a story, animated warm smile, hands gesturing, {STYLE}", 200,200, {}, 8815),
  ("linh_helping",  f"{LINH}, leaning in with a bright sudden realization, eyes wide, mouth open saying oh, helpful, {STYLE}", 200,200, {}, 8815),
  ("linh_listening",f"{LINH}, attentive encouraging listener, head tilted slightly, soft smile, {STYLE}", 200,200, {}, 8815),
  ("linh_asking",   f"{LINH}, turning to face the viewer directly, friendly inviting smile, eyebrows raised in a question, {STYLE}", 200,200, {}, 8815),
]

def run(job):
    name, desc, w, h, extra, seed = job
    body = {"description": desc, "image_size": {"width": w, "height": h},
            "text_guidance_scale": 8, "seed": seed}
    if name != "bg":
        body.update(no_background=True, view="side", direction="south",
                    outline="selective outline", shading="medium shading",
                    detail="highly detailed")
    body.update(extra)
    req = urllib.request.Request(URL, data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            d = json.load(r)
        b64 = d["image"]["base64"].split(",")[-1]
        open(f"{OUT}/{name}.png", "wb").write(base64.b64decode(b64))
        return f"OK   {name}.png  ({len(base64.b64decode(b64))} bytes)"
    except urllib.error.HTTPError as e:
        return f"FAIL {name}: {e.code} {e.read()[:200]}"
    except Exception as e:
        return f"FAIL {name}: {e}"

with cf.ThreadPoolExecutor(8) as ex:
    for line in ex.map(run, JOBS): print(line, flush=True)
