"""Fetch pinned licensed sources and build same-origin audio for GitHub Pages."""
from pathlib import Path
import urllib.request, hashlib, subprocess, zipfile, tempfile
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/audio'; OUT.mkdir(parents=True,exist_ok=True)
SOURCES = {'carefree.mp3': ('https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3', '8433b770a630d9b1594fd484442c677907ece899a4d149954cd2e74fd733e311'), 'engine.mp3': ('https://opengameart.org/sites/default/files/engine_sound.mp3', '6ac9e73a6e4d0ec2a7d70f1f2c833622f60c60f517488600b070708b2b4c2396'), 'hydraulic.mp3': ('https://bigsoundbank.com/UPLOAD/mp3/1491.mp3', '0b76e5ffdd84b8b6f2a184d4687ed7604384ddbf2c45e76388eea8098759c780'), 'steps.zip': ('https://opengameart.org/sites/default/files/%5Bkdd%5DDifferentSteps_0.zip', '987d072b7deaa65177e005ddd8185f2351be7c9a76cd7575dea560549c39b33b')}
with tempfile.TemporaryDirectory() as tmp:
    tmp=Path(tmp)
    for name,(url,sha) in SOURCES.items():
        path=tmp/name
        for attempt in range(3):
            try:
                with urllib.request.urlopen(url,timeout=60) as r: data=r.read()
                assert hashlib.sha256(data).hexdigest()==sha, f'Source checksum changed: {name}'
                path.write_bytes(data); break
            except Exception:
                if attempt==2: raise
    with zipfile.ZipFile(tmp/'steps.zip') as z: (tmp/'gravel.ogg').write_bytes(z.read('gravel.ogg'))
    def convert(name,source,filters,extra=()):
        subprocess.run(['ffmpeg','-v','error','-y',*extra,'-i',str(tmp/source),'-af',filters,'-ac','2' if name=='music' else '1','-c:a','libmp3lame','-b:a','96k',str(OUT/(name+'.mp3'))],check=True)
        subprocess.run(['ffmpeg','-v','error','-i',str(OUT/(name+'.mp3')),'-f','null','-'],check=True)
    convert('music','carefree.mp3','loudnorm=I=-18:TP=-2:LRA=8,afade=t=in:d=1,afade=t=out:st=201:d=3')
    convert('engine','engine.mp3','highpass=f=45,lowpass=f=1800,loudnorm=I=-20:TP=-3:LRA=7,afade=t=in:d=0.03,afade=t=out:st=7.95:d=0.05',('-ss','3','-t','8'))
    convert('hydraulic','hydraulic.mp3','loudnorm=I=-20:TP=-3:LRA=7,afade=t=in:d=0.02,afade=t=out:st=1.5:d=0.1')
    convert('gravel','gravel.ogg','loudnorm=I=-18:TP=-3:LRA=7')
print('Prepared and decoded all four licensed audio files.')
