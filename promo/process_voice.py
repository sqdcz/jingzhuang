# -*- coding: utf-8 -*-
"""解说后期：轻压缩 + 响度归一（RMS -18 / 峰值不超 -1），输出 wav 供 Remotion 使用"""
import glob
import json
import os
import subprocess
import wave

import numpy as np

FF = 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
SR = 44100
OUT = 'public/audio/narr'
TARGET_RMS = -18.0
CEIL = -1.0


def decode(path):
    os.makedirs('out/_m', exist_ok=True)
    tmp = 'out/_m/dec.wav'
    subprocess.run([FF, '-v', 'error', '-y', '-i', path, '-ac', '1', '-ar', str(SR), tmp],
                   check=True, capture_output=True)
    with wave.open(tmp, 'rb') as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768


def compress(x, thresh_db=-24.0, ratio=3.0, attack=0.006, release=0.12):
    """简易前馈压缩：包络跟随 + 增益平滑，压掉人声的尖峰，提高平均响度"""
    env = np.abs(x)
    # 包络：快攻慢放
    a = np.exp(-1 / (attack * SR))
    r = np.exp(-1 / (release * SR))
    e = np.empty_like(env)
    acc = 0.0
    for i in range(len(env)):
        c = a if env[i] > acc else r
        acc = c * acc + (1 - c) * env[i]
        e[i] = acc
    e_db = 20 * np.log10(e + 1e-9)
    over = np.maximum(0.0, e_db - thresh_db)
    gain_db = -over * (1 - 1 / ratio)
    g = 10 ** (gain_db / 20)
    return x * g


def normalize(x):
    """先按 RMS 提到目标响度，再用 tanh 软限幅削峰（不整体降增益，避免短句变小声）"""
    ceil = 10 ** (CEIL / 20)
    for _ in range(3):
        rms = np.sqrt((x ** 2).mean()) + 1e-9
        x = x * 10 ** ((TARGET_RMS - 20 * np.log10(rms)) / 20)
        x = ceil * np.tanh(x / ceil)
    return x


def save(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    st = np.stack([pcm, pcm], axis=1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(st.tobytes())


def main():
    os.makedirs(OUT, exist_ok=True)
    files = sorted(glob.glob('audio/S*_*.mp3'))
    rows = []
    for p in files:
        x = decode(p)
        y = normalize(compress(x, thresh_db=-29.0, ratio=4.0))
        name = os.path.basename(p)[:-4] + '.wav'
        save(os.path.join(OUT, name), y)
        rows.append((20 * np.log10(np.sqrt((y ** 2).mean()) + 1e-9),
                     20 * np.log10(np.abs(y).max() + 1e-9)))
    arr = np.array(rows)
    print('已处理 %d 句 → %s' % (len(files), OUT))
    print('RMS  %.1f ~ %.1f dB（目标 %.1f）' % (arr[:, 0].min(), arr[:, 0].max(), TARGET_RMS))
    print('峰值 %.1f ~ %.1f dB（上限 %.1f）' % (arr[:, 1].min(), arr[:, 1].max(), CEIL))

    # 导出按段合并后的避让区间，给 BGM 用
    with open('audio/timing.json', encoding='utf-8') as f:
        lines = json.load(f)
    blocks = {}
    for ln in lines:
        b = blocks.setdefault(ln['block'], [9e9, -9e9])
        b[0] = min(b[0], ln['start'])
        b[1] = max(b[1], ln['start'] + ln['dur'])
    out = [{'block': k, 'from': round(v[0] - 0.12, 2), 'to': round(v[1] + 0.22, 2)}
           for k, v in sorted(blocks.items(), key=lambda kv: kv[1][0])]
    with open('audio/duck.json', 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print('避让区间已导出 audio/duck.json（%d 段）' % len(out))


main()
