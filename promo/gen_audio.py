# -*- coding: utf-8 -*-
"""合成 165s 原创 BGM（含解说自动避让）+ 音效，全部程序生成，无版权素材"""
import json
import os
import wave

import numpy as np

SR = 44100
TOTAL = 165.0
N = int(SR * TOTAL)
rng = np.random.default_rng(20261027)

BPM = 128.0
BEAT = 60.0 / BPM
BAR = BEAT * 4


# ---------- 基础工具 ----------
def env_exp(n, tau, attack=0.004):
    t = np.arange(n) / SR
    e = np.exp(-t / tau)
    a = int(attack * SR)
    if a > 1:
        e[:a] *= np.linspace(0, 1, a)
    return e


def lp(x, cutoff):
    """一阶低通"""
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def lp_fast(x, cutoff):
    """用 scipy 不可用时的近似：滑窗均值"""
    w = max(1, int(SR / max(cutoff, 40) / 3))
    k = np.ones(w) / w
    return np.convolve(x, k, mode='same')


def hp(x, cutoff):
    return x - lp_fast(x, cutoff)


def saw(freq, n, detune=0.0):
    f = freq * (1 + detune)
    t = np.arange(n) / SR
    out = np.zeros(n)
    hmax = int(min(20, (SR / 2) / f))
    for h in range(1, hmax + 1):
        out += np.sin(2 * np.pi * f * h * t) / h
    return out * 0.55


def square(freq, n):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for h in range(1, 15, 2):
        out += np.sin(2 * np.pi * freq * h * t) / h
    return out * 0.6


# ---------- 乐器 ----------
def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 118 * np.exp(-t / 0.035) + 46
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env_exp(n, 0.10)
    click = rng.normal(0, 1, n) * env_exp(n, 0.004) * 0.35
    return (body + click) * 0.9


def hat(open_=False):
    n = int((0.22 if open_ else 0.06) * SR)
    nz = rng.normal(0, 1, n)
    return hp(nz, 6500) * env_exp(n, 0.055 if open_ else 0.014) * 0.5


def clap():
    n = int(0.3 * SR)
    out = np.zeros(n)
    for d in (0.0, 0.011, 0.022):
        s = int(d * SR)
        seg = rng.normal(0, 1, n - s) * env_exp(n - s, 0.012)
        out[s:] += seg * 0.6
    out += rng.normal(0, 1, n) * env_exp(n, 0.09) * 0.5
    return hp(out, 900) * 0.5


def bass_note(freq, dur):
    n = int(dur * SR)
    x = saw(freq, n)
    x = lp_fast(x, 260)
    return x * env_exp(n, dur * 0.8, attack=0.008) * 0.8


def pad_note(freq, dur):
    n = int(dur * SR)
    x = saw(freq, n, 0.002) + saw(freq, n, -0.0025) + saw(freq * 2, n, 0.001)
    x = lp_fast(x, 1500)
    a = int(0.5 * SR)
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    r = int(0.6 * SR)
    if n > r:
        e[-r:] = np.linspace(1, 0, r)
    return x * e * 0.3


def arp_note(freq, dur):
    n = int(dur * SR)
    return square(freq, n) * env_exp(n, 0.075) * 0.28


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = rng.normal(0, 1, n)
    sweep = np.sin(2 * np.pi * (200 + 1800 * (t / dur) ** 2) * t) * 0.3
    env = (t / dur) ** 2
    return (hp(nz, 400) * 0.5 + sweep) * env * 0.5


def impact():
    n = int(1.3 * SR)
    t = np.arange(n) / SR
    f = 70 * np.exp(-t / 0.28) + 28
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env_exp(n, 0.45)
    nz = lp_fast(rng.normal(0, 1, n), 900) * env_exp(n, 0.25) * 0.5
    return (body + nz) * 0.85


# ---------- 音高 ----------
NOTE = {'A2': 110.0, 'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F2': 87.31,
        'G2': 98.0, 'B3': 246.94, 'A3': 220.0, 'C4': 261.63, 'D4': 293.66,
        'E4': 329.63, 'F4': 349.23, 'G4': 392.0, 'A4': 440.0, 'C5': 523.25,
        'E5': 659.26}

PROG = [
    ('Am', ['A2'], ['A3', 'C4', 'E4']),
    ('F', ['F2'], ['F4', 'A3', 'C4']),
    ('C', ['C3'], ['C4', 'E4', 'G4']),
    ('G', ['G2'], ['G4', 'B3', 'D4']),
]

buf = np.zeros(N)


def put(sig, at, gain=1.0):
    i = int(at * SR)
    if i >= N:
        return
    j = min(N, i + len(sig))
    buf[i:j] += sig[: j - i] * gain


# ---------- 编曲 ----------
def groove(t0, t1, drums=True, arp=False, hat16=False, pad=True):
    bar = 0
    t = t0
    while t < t1 - 1e-6:
        prog = PROG[bar % 4]
        # 低音：每拍一下
        for b in range(4):
            bt = t + b * BEAT
            if bt < t1:
                root = NOTE[prog[1][0]]
                f = root * (2 if b % 2 == 1 else 1)
                put(bass_note(f, BEAT * 0.85), bt, 0.30)
        # 底鼓：四拍
        if drums:
            for b in range(4):
                bt = t + b * BEAT
                if bt < t1:
                    put(kick(), bt, 0.55)
            # 拍手 2、4
            put(clap(), t + BEAT, 0.4)
            put(clap(), t + 3 * BEAT, 0.4)
        # 踩镲
        step = BEAT / 4 if hat16 else BEAT / 2
        k = 0
        while t + k * step < t1:
            put(hat(open_=(k % 4 == 2 and hat16)), t + k * step, 0.20 if k % 2 else 0.13)
            k += 1
        # Pad
        if pad:
            for nm in prog[2]:
                put(pad_note(NOTE[nm], BAR * 0.98), t, 0.10)
        # 琶音
        if arp:
            notes = prog[2] + [prog[2][0]]
            for k in range(16):
                if t + k * BEAT / 4 < t1:
                    put(arp_note(NOTE[notes[k % 4]] * 2, BEAT / 4 * 0.9), t + k * BEAT / 4, 0.15)
        t += BAR
        bar += 1


# 0–8 intro：pad + 上升音
for nm in ['A3', 'C4', 'E4']:
    put(pad_note(NOTE[nm], 8.2), 0.0, 0.12)
put(riser(7.0), 1.0, 0.35)
put(impact(), 0.0, 0.35)

# 8–30 主歌
groove(8.0, 30.0)
put(riser(4.0), 26.0, 0.32)

# 30–40 抬升（加琶音）
put(impact(), 30.0, 0.7)
groove(30.0, 40.0, arp=True, hat16=True)

# 40–78 主段
groove(40.0, 78.0, arp=True, hat16=True)
put(riser(3.2), 74.8, 0.3)

# 78–110 校验段
put(impact(), 78.0, 0.55)
groove(78.0, 110.0, arp=True, hat16=True)

# 110–130 加重
put(impact(), 110.0, 0.75)
groove(110.0, 130.0, arp=True, hat16=True)
put(riser(2.5), 127.5, 0.3)

# 130–148 信任段：撤掉鼓，只留 pad + 低音，营造"讲事实"的静
put(impact(), 130.0, 0.5)
groove(130.0, 148.0, drums=False, arp=False, hat16=False)

# 148–165 收尾：回来一点，最后 5 秒收住
put(impact(), 148.0, 0.6)
groove(148.0, 160.0, arp=True, hat16=False)
for nm in ['A3', 'C4', 'E4', 'A4']:
    put(pad_note(NOTE[nm], 5.2), 160.0, 0.13)
put(impact(), 160.0, 0.8)

# ---------- 解说避让（ducking）：按段连续压制，避免句间空隙音乐"抬回来" ----------
with open('audio/duck.json', encoding='utf-8') as f:
    spans = json.load(f)

duck = np.ones(N)
RAMP = int(0.20 * SR)
FLOOR = 0.32          # 说话时压到 32%（约 -10 dB）
for sp in spans:
    s = int(max(0, sp['from']) * SR)
    e = int(min(TOTAL, sp['to']) * SR)
    duck[s:e] = FLOOR
k = np.ones(RAMP) / RAMP
duck = np.convolve(duck, k, mode='same')

buf *= duck

# ---------- 归一化 ----------
peak = np.max(np.abs(buf))
if peak > 0:
    buf = buf / peak * 0.82
# 轻微软削波，避免爆音
buf = np.tanh(buf * 1.05) * 0.92

stereo = np.stack([buf, buf], axis=1)
pcm = (np.clip(stereo, -1, 1) * 32767).astype('<i2')

os.makedirs('public/audio', exist_ok=True)
with wave.open('public/audio/bgm.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('BGM 已生成 public/audio/bgm.wav  %.1fs  峰值归一 %.2f' % (TOTAL, 0.82))

# ---------- 音效 ----------
def save(name, sig, gain=1.0):
    x = np.clip(sig * gain, -1, 1)
    p = (x * 32767).astype('<i2')
    st = np.stack([p, p], axis=1)
    with wave.open('public/audio/%s.wav' % name, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(st.tobytes())
    print('  %-12s %.2fs' % (name, len(sig) / SR))


whoosh_n = int(0.55 * SR)
wt = np.arange(whoosh_n) / SR
wenv = np.sin(np.pi * (wt / 0.55)) ** 2
whoosh = hp(rng.normal(0, 1, whoosh_n), 500) * wenv * 0.9
save('whoosh', whoosh, 0.5)
save('impact', impact(), 0.75)

tick_n = int(0.05 * SR)
tt = np.arange(tick_n) / SR
tick = (np.sin(2 * np.pi * 2600 * tt) * 0.6 + rng.normal(0, 1, tick_n) * 0.4) * env_exp(tick_n, 0.006)
save('tick', tick, 0.5)

ok_n = int(0.7 * SR)
ot = np.arange(ok_n) / SR
ok = (np.sin(2 * np.pi * 880 * ot) * 0.5 + np.sin(2 * np.pi * 1320 * ot) * 0.35) * env_exp(ok_n, 0.22)
save('ok', ok, 0.45)

gl_n = int(0.3 * SR)
gl = np.zeros(gl_n)
for i in range(6):
    s = int(i * 0.045 * SR)
    seg = int(0.035 * SR)
    gl[s:s + seg] += square(1200 + i * 400, seg)[:seg] * (0.5 if i % 2 else 0.25)
save('glitch', gl * env_exp(gl_n, 0.18), 0.5)

print('全部音频生成完成')
