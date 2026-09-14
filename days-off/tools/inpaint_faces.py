import os,json,base64,urllib.request,time,io
from PIL import Image, ImageDraw
KEY=os.environ["PIXELLAB_KEY"]; URL="https://api.pixellab.ai/v1/inpaint"
BASE='assets/scene_base.png'
# crop box, then the expressive bands only: brows/eyes and mouth
REGION={
 "linh": ((112,70,212,190), [(136,123,176,142),(146,148,172,157)]),
 "minh": ((214,68,314,188), [(236,122,280,142),(244,151,274,162)]),
}
STYLE=("pixel art, warm cozy palette, clean readable pixels, warm afternoon light, "
       "sitting at a cafe table, facing the camera, front view")
def b64(img):
    b=io.BytesIO(); img.save(b,format='PNG'); return base64.b64encode(b.getvalue()).decode()
def inpaint(name, who, desc, seed, GUID=3.0):
    scene=Image.open(BASE).convert('RGB')
    cb, bands = REGION[who]
    crop=scene.crop(cb); cw,ch=crop.size
    m=Image.new('RGB',(cw,ch),(0,0,0)); d=ImageDraw.Draw(m)
    for (x0,y0,x1,y1) in bands:
        d.rectangle((x0-cb[0],y0-cb[1],x1-cb[0],y1-cb[1]),fill=(255,255,255))
    body={"description":f"{desc}, {STYLE}","image_size":{"width":cw,"height":ch},
          "text_guidance_scale":GUID,"seed":seed,
          "inpainting_image":{"type":"base64","base64":b64(crop)},
          "mask_image":{"type":"base64","base64":b64(m)},
          "outline":"selective outline","shading":"medium shading","detail":"highly detailed"}
    for a in range(6):
        try:
            req=urllib.request.Request(URL,data=json.dumps(body).encode(),
                headers={"Authorization":f"Bearer {KEY}","Content-Type":"application/json"})
            with urllib.request.urlopen(req,timeout=300) as r: j=json.load(r)
            patch=Image.open(io.BytesIO(base64.b64decode(j["image"]["base64"].split(",")[-1]))).convert('RGB')
            out=scene.copy(); out.paste(patch,(cb[0],cb[1])); out.save(f"assets/{name}.png")
            return f"OK {name}"
        except urllib.error.HTTPError as e:
            if a==5: return f"FAIL {name}: {e.read().decode()[:220]}"
            time.sleep(4*(a+1))
        except Exception as e:
            if a==5: return f"FAIL {name}: {str(e)[:200]}"
            time.sleep(4*(a+1))
