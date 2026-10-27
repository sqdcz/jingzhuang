# -*- coding: utf-8 -*-
"""测量并统一音频电平：人声目标 -18 dBFS RMS，BGM 压制到明显低于人声"""
import glob
import json
import os
import subprocess
import wave

import numpy as np

FF = 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
TMP = 'out/_m'


def decode(path, ar=16000):
    os.makedirs(TMP, exist_ok=True)
    out = os.path.join(TMP, 'x.wav')
    subprocess.run([FF, '-v', 'error', '-y', '-i', path, '-ac', '1', '-ar', str(ar), out],
                   check=True, capture_output=True)
    with wave.open(out, 'rb') as w:
        d = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768
    return d


def stats(d):
    r = 20 * np.log10(np.sqrt((d ** 2).mean()) + 1e-9)
    p = 20 * np.log10(np.abs(d).max() + 1e-9)
    return r, p


print('%-14s %8s %8s' % ('文件', 'RMS', '峰值'))
targets = {}
for f in ['S1_1', 'S2A_1', 'S4B_1', 'S5B_1', 'S7A_1', 'S8C_1']:
    d = decode('audio/%s.mp3' % f)
    r, p = stats(d)
    print('%-14s %8.1f %8.1f' % (f, r, p))
    targets[f] = (r, p)

b = decode('public/audio/bgm.wav', 16000)
br, bp = stats(b)
print('%-14s %8.1f %8.1f' % ('bgm.wav', br, bp))

rows = [stats(decode('audio/%s.mp3' % os.path.basename(p)[:-4])) for p in glob.glob('audio/S*_*.mp3')]
arr = np.array([r for r, _ in rows])
print('\n全部 %d 句：RMS 中位 %.1f dB，最小 %.1f，最大 %.1f' % (
    len(rows), np.median(arr), arr.min(), arr.max()))
