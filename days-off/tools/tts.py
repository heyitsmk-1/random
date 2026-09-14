import os, json, urllib.request, time, concurrent.futures as cf
EL=os.environ["EL"]
VOICE={"minh":"bIHbv24MWmeRgasZH58o","linh":"cgSgspJ2msm6clMCkdW9"}
lines=json.load(open("lines.json"))
def render(item):
    key,(who,text)=item
    body={"text":text,"model_id":"eleven_multilingual_v2",
          "voice_settings":{"stability":0.40,"similarity_boost":0.75,"style":0.35,"use_speaker_boost":True}}
    req=urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE[who]}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),
        headers={"xi-api-key":EL,"Content-Type":"application/json"})
    for a in range(4):
        try:
            with urllib.request.urlopen(req,timeout=180) as r: data=r.read()
            open(f"audio/{key}.mp3","wb").write(data)
            return f"OK {key} ({len(data)}b)"
        except Exception as e:
            if a==3: return f"FAIL {key}: {str(e)[:90]}"
            time.sleep(2*(a+1))
with cf.ThreadPoolExecutor(4) as ex:
    for l in ex.map(render, lines.items()): print(l,flush=True)
