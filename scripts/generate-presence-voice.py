"""Offline asset preparation only; not a runtime or build dependency.
pip install kokoro-onnx==0.6.1 soundfile imageio-ffmpeg numpy
Export guidedSessions with Node --experimental-strip-types to a JSON file.
python scripts/generate-presence-voice.py sessions.json MODEL.onnx VOICES.bin
Model: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1
Voice ff_siwis; model Kokoro-82M Apache-2.0, runtime MIT.
"""
import sys, pathlib, json, re, subprocess
import numpy as np
import soundfile as sf
import imageio_ffmpeg
from kokoro_onnx import Kokoro
sessions=json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf8'))
model=Kokoro(sys.argv[2],sys.argv[3])
dest=pathlib.Path('public/presence/voice');dest.mkdir(parents=True,exist_ok=True)
manifest=[]
for session in sessions:
 for index,cue in enumerate(session['guidance']):
  chunks=[]
  for sentence in re.split(r'(?<=[.!?])\s+',cue['text']):
   samples,sr=model.create(sentence,voice='ff_siwis',speed=0.80,lang='fr-fr')
   chunks.extend([samples,np.zeros(int(sr*1.0),dtype=np.float32)])
  samples=np.concatenate(chunks)
  end=session['guidance'][index+1]['at'] if index+1<len(session['guidance']) else session['minutes']*60
  if len(samples)/sr/0.9 >= end-cue['at']:raise ValueError('Overlapping cue')
  name=f"{session['id']}-{index}.mp3"
  import tempfile
  with tempfile.TemporaryDirectory() as tmp:
   wav=pathlib.Path(tmp)/'cue.wav';sf.write(wav,samples,sr)
   subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-loglevel','error','-i',str(wav),'-c:a','libmp3lame','-b:a','96k',str(dest/name)],check=True)
  manifest.append(dict(file=name,seconds=round(len(samples)/sr,2)))
pathlib.Path('public/presence/voice-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
