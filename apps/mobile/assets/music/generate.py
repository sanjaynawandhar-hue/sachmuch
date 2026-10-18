"""Original 96-second soft piano-style instrumental, no third-party samples.
Sparse felt-like attacks, decaying overtones and stereo room echoes.
"""
import math, wave, array
from pathlib import Path
rate, duration = 22050, 96
size = rate * duration
left = array.array('f', [0]) * size
right = array.array('f', [0]) * size
chords = [(48,55,59,64),(45,52,55,60),(41,48,52,57),(43,50,55,62)] * 2
melody = [72,71,67,64,69,67,64,60,65,64,60,57,67,62,59,62,
          76,72,71,67,72,69,67,64,69,65,64,60,67,62,59,67]
def note(midi, start, gain, pan):
    frequency = 440 * 2 ** ((midi-69)/12)
    for j in range(rate*6):
        t = j/rate
        attack = 1-math.exp(-t*65)
        release = min(1, (6-t)/0.4)
        tone = 0
        for harmonic, strength in [(1,1),(2,.28),(3,.11),(4,.035)]:
            tone += strength*math.sin(2*math.pi*frequency*harmonic*t)*math.exp(-t*(.7+harmonic*.28))
        value = gain*attack*release*tone
        at = (int(start*rate)+j)%size
        left[at] += value*(1-pan)
        right[at] += value*pan
        for delay, decay in [(.19,.12),(.37,.07),(.61,.035)]:
            echo = (at+int(delay*rate))%size
            left[echo] += value*decay*pan
            right[echo] += value*decay*(1-pan)
for bar, chord in enumerate(chords):
    for n, pitch in enumerate(chord):
        note(pitch,bar*12+n*.09,.12 if n else .09,.35+n*.09)
    for beat in range(4):
        note(melody[bar*4+beat],bar*12+beat*3+.45,.13,.57)
peak = max(max(map(abs,left)),max(map(abs,right)))
output = array.array('h')
for l,r in zip(left,right):
    output.extend((int(l/peak*12000),int(r/peak*12000)))
with wave.open(str(Path(__file__).with_name('wonder.wav')), 'wb') as out:
    out.setnchannels(2); out.setsampwidth(2); out.setframerate(rate)
    out.writeframes(output.tobytes())
print('Created 96-second stereo piano-style loop; peak below -8 dBFS.')
