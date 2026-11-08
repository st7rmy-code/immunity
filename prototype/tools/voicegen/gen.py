"""Озвучка реплик тренажёра голосами Silero (CC BY-NC 4.0).
Вход: tools/voicegen/lines.json  [{k, spk, text}]
Выход: public/v/<k>.mp3 и src/03c-voices.js (ключ -> длительность)."""
import json, os, re, subprocess, sys, wave, time
import numpy as np
import torch

SP = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(SP))
MODEL_URL = os.environ.get('SILERO_URL', 'https://models.silero.ai/models/tts/ru/v5_6_ru.pt')
MODEL = os.path.join(SP, os.path.basename(MODEL_URL))
SR = 48000
OUT = os.path.join(ROOT, 'public', 'v')
os.makedirs(OUT, exist_ok=True)

# числа в репликах — словами, как их произносят
SPOKEN = {
    'табельный номер 4471': 'табельный номер сорок четыре семьдесят один',
    'номер 0471-ДМ': 'номер ноль четыре семь один, дэ эм',
}

def spoken(t):
    for a, b in SPOKEN.items():
        t = t.replace(a, b)
    t = t.replace('—', ',').replace('…', '...')
    if re.search(r'\d', t):
        print('  ! digits left:', t, file=sys.stderr)
    return t

if not os.path.isfile(MODEL):
    print('downloading', MODEL_URL)
    torch.hub.download_url_to_file(MODEL_URL, MODEL)
torch.set_num_threads(max(1, os.cpu_count() or 1))
model = torch.package.PackageImporter(MODEL).load_pickle('tts_models', 'model')
model.to(torch.device('cpu'))

lines = json.load(open(os.path.join(SP, 'lines.json'), encoding='utf-8'))
only = set(sys.argv[1:])
man = {}
t0 = time.time()
for i, x in enumerate(lines):
    if only and x['spk'] not in only and x['k'] not in only:
        continue
    mp3 = os.path.join(OUT, x['k'] + '.mp3')
    wav = os.path.join(OUT, x['k'] + '.wav')
    if not os.path.isfile(mp3):
        audio = model.apply_tts(text=spoken(x['text']), speaker=x['spk'], sample_rate=SR, put_accent=True, put_yo=True)
        a = audio.numpy() if hasattr(audio, 'numpy') else np.asarray(audio)
        a = np.clip(a / max(1e-6, float(np.abs(a).max())) * 0.89, -1, 1)
        pad = np.zeros(int(SR * 0.12), dtype=np.float32)
        a = np.concatenate([pad, a.astype(np.float32), pad])
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((a * 32767).astype('<i2').tobytes())
        # мягкая «телефонная» полоса не нужна — голос чистый; лёгкая компрессия и громкость под речь
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-af', 'highpass=f=70,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=80,loudnorm=I=-17:TP=-1.5:LRA=9',
                        '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', mp3], check=True)
        os.remove(wav)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3], capture_output=True, text=True).stdout.strip() or 0)
    man[x['k']] = round(dur, 2)
    if i % 20 == 0:
        print(f'{i+1}/{len(lines)}  {time.time()-t0:.0f}s', flush=True)

# манифест — только файлы, которые реально есть
prev = {}
path = os.path.join(ROOT, 'src', '03c-voices.js')
with open(path, 'w', encoding='utf-8') as f:
    f.write('/* Заранее озвученные реплики (Silero TTS, CC BY-NC 4.0): ключ → длительность, с. Генерируется voicegen/gen.py. */\n')
    f.write('const VOICE_FILES=' + json.dumps(man, separators=(',', ':')) + ';\n')
print('done', len(man), 'files', round(sum(man.values())), 's audio', round(sum(os.path.getsize(os.path.join(OUT, k + '.mp3')) for k in man) / 1e6, 2), 'MB')
