# -*- coding: utf-8 -*-
"""按分镜子段自动配速生成解说；165 秒版（8 段）"""
import asyncio
import json
import os
import subprocess

import edge_tts

VOICE = 'zh-CN-YunxiNeural'
OUT = 'audio'
FFPROBE = 'node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe'
TOTAL = 165.0

# (段名, 段起, 段止, [台词...])
BLOCKS = [
    ('S1', 0.0, 8.0, ['你点的那个「下载」，真的是官网吗？']),

    ('S2A', 8.0, 15.33, ['搜索结果的第一条，可能只是买来的广告。', '域名差一个点，装进去的就是别人的程序。']),
    ('S2B', 15.33, 22.67, ['安装向导的「下一步」里，默认勾着三个你不想装的东西。']),
    ('S2C', 22.67, 30.0, ['破解补丁，从来都是木马最爱的外壳。']),

    ('S3', 30.0, 40.0, ['净装。把「下载」这一步，变得可验证。', '查来源，验签名，比哈希。']),

    ('S4A', 40.0, 52.67, ['第一级，内置名单。常见软件直接命中，秒出官方地址。', '不联网，也不花钱。']),
    ('S4B', 52.67, 65.33, ['第二级，读微软的程序包管理器官方索引。', '拿到的是官方直链，和官方声明的哈希。']),
    ('S4C', 65.33, 78.0, ['第三级，可选。前两级都没命中，才让 AI 出候选。', 'AI 只给候选，核实由程序自己做。']),

    ('S5A', 78.0, 88.67, ['接下来是三重校验。', '一，数字签名。看签名状态和证书发布者。']),
    ('S5B', 88.67, 99.33, ['二，哈希。官方声明一个值，下载完自己再算一遍，差一位就拦下。']),
    ('S5C', 99.33, 110.0, ['三，云查杀。七十多个引擎一起看，只发哈希，不发文件。']),

    ('S6A', 110.0, 120.0, ['合规，但你不一定想要。捆绑、弹窗，都明确告诉你。']),
    ('S6B', 120.0, 130.0, ['激活工具、破解补丁，直接拦。口令在主进程校验，改页面也绕不过。']),

    ('S7A', 130.0, 134.5, ['你可能会问，它自己会不会又是一个全家桶？']),
    ('S7B', 134.5, 139.0, ['源码全部公开，MIT 协议，可以自己审计。']),
    ('S7C', 139.0, 143.5, ['不加驱动，不装服务，不改系统设置。']),
    ('S7D', 143.5, 148.0, ['不配 AI 也能用，前两级完全免费。']),

    ('S8A', 148.0, 154.0, ['不设账号，没有遥测，不收集个人信息。']),
    ('S8B', 154.0, 160.0, ['完全免费开源。微软商店搜「净装」，或者 GitHub。']),
    ('S8C', 160.0, 165.0, ['找官网，验安全，干净装。']),
]

HEAD = 0.35
GAP = 0.18


def probe(path):
    r = subprocess.run(
        [FFPROBE, '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'default=noprint_wrappers=1:nokey=1', path],
        capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


async def synth(text, rate_pct, path):
    await edge_tts.Communicate(text, VOICE, rate='%+d%%' % rate_pct).save(path)
    return probe(path)


async def fit_block(name, start, end, lines):
    span = end - start
    budget = span - HEAD - 0.12
    rate = 8
    durs = []
    for _ in range(4):
        durs = []
        for i, text in enumerate(lines):
            p = os.path.join(OUT, '%s_%d.mp3' % (name, i + 1))
            durs.append(await synth(text, rate, p))
        need = sum(durs) + GAP * (len(lines) - 1)
        if need <= budget:
            break
        rate = min(40, int(round(rate * (need / budget) + 4)))
    rows = []
    t = start + HEAD
    for i, text in enumerate(lines):
        rows.append({'block': name, 'file': '%s_%d.mp3' % (name, i + 1),
                     'start': round(t, 2), 'dur': round(durs[i], 2),
                     'text': text, 'rate': rate})
        t += durs[i] + GAP
    print('%-4s 语速%+3d%%  用量 %.1fs / 预算 %.1fs  %s' % (
        name, rate, need, budget, 'OK' if need <= budget else '仍超'))
    return rows


async def main():
    os.makedirs(OUT, exist_ok=True)
    all_rows = []
    for name, s, e, lines in BLOCKS:
        all_rows += await fit_block(name, s, e, lines)
    with open(os.path.join(OUT, 'timing.json'), 'w', encoding='utf-8') as f:
        json.dump(all_rows, f, ensure_ascii=False, indent=2)
    total = sum(r['dur'] for r in all_rows)
    print('\n共 %d 句，语音 %.1fs / 片长 %.0fs（占比 %.0f%%）' % (
        len(all_rows), total, TOTAL, total / TOTAL * 100))
    print('越界句数:', len([r for r in all_rows if r['start'] + r['dur'] > TOTAL]))


asyncio.run(main())
