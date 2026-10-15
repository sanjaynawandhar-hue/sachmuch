"""Original 48-second seamless ambient instrumental; no third-party samples."""
import math, wave, array
from pathlib import Path
rate, duration = 22050, 48
samples = array.array('f', [0]) * (rate * duration)
# Slow Cmaj7 / Am7 / Fmaj7 / Gsus progression with soft bell arpeggios.
chords = [(48,55,59,64),(45,52,55,60),(41,48,52,57),(43,50,55,60)]
for chord_index, chord in enumerate(chords):
    for beat in range(8):
        note = chord[beat % 4] + (12 if beat % 2 else 0)
        freq = 440 * 2 ** ((note-69)/12)
        start = int((chord_index*12 + beat*1.5)*rate)
        for j in range(rate*8):
            t = j/rate
            env = (1-math.exp(-t*12))*math.exp(-t/2.0)*(1-min(1,t/8))
            tone = math.sin(2*math.pi*freq*t)+0.18*math.sin(2*math.pi*2*freq*t)+0.05*math.sin(2*math.pi*3*freq*t)
            samples[(start+j)%len(samples)] += env*tone*0.15
peak=max(abs(v) for v in samples)
with wave.open(str(Path(__file__).with_name('wonder.wav')), 'wb') as out:
    out.setnchannels(1); out.setsampwidth(2); out.setframerate(rate)
    out.writeframes(array.array('h',(int(v/peak*19000) for v in samples)).tobytes())
