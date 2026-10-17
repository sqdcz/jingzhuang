#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
从 AI 生成的原始图标生成全平台所需图标资产。

做两件事：
  1. 抹掉右下角的 AI 水印（按圆角矩形掩膜填充中位色 + 局部模糊）
  2. 生成应用图标（含多尺寸 ICO、窗口小图）与 Store 一览徽标（透明底 + 8% 留白）

用法：
    python scripts/make-icons.py

输入：build/store-assets/Square310x310Logo.png   (310×310，白色圆角底 + 绿色砖块)
输出：build/icon-master-310.png   母版（圆角外透明）
      build/icon.png              256×256
      build/icon-window.png       32×32
      build/icon.ico              16/24/32/48/64/128/256 多尺寸
      build/store-logos/StoreLogo-{300,150,71}x*.png

依赖：Python 3 + Pillow（本机用 C:\\Program Files\\python\\python.exe，自带 Pillow 7.2）
"""
import os
import statistics
from PIL import Image, ImageDraw, ImageFilter, ImageChops

SRC = 'build/store-assets/Square310x310Logo.png'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# 水印所在区域（右下角），以及判定「比周围绿明显更亮」的阈值
WM_X0, WM_Y0 = 255, 272
BRIGHT_DELTA = 12
PAD_RATIO = 0.08          # Store 徽标四周留白


def rounded_rect_mask(size, radius, supersample=4):
    """4 倍超采样绘制圆角矩形，缩回原尺寸得到抗锯齿蒙版（Pillow 7 无 rounded_rectangle）"""
    w, h = size
    S = supersample
    W, H, R = w * S, h * S, radius * S
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    d.rectangle([0, R, W - 1, H - 1 - R], fill=255)
    d.rectangle([R, 0, W - 1 - R, H - 1], fill=255)
    d.ellipse([0, 0, R * 2, R * 2], fill=255)
    d.ellipse([W - 1 - R * 2, 0, W - 1, R * 2], fill=255)
    d.ellipse([0, H - 1 - R * 2, R * 2, H - 1], fill=255)
    d.ellipse([W - 1 - R * 2, H - 1 - R * 2, W - 1, H - 1], fill=255)
    return m.resize((w, h), Image.LANCZOS)


def main():
    im = Image.open(SRC).convert('RGBA')
    w, h = im.size
    px = im.load()

    def is_bg(x, y):
        r, g, b, a = px[x, y]
        return a < 12 or (r > 238 and g > 238 and b > 238)

    # 由首行首个非白像素推定圆角半径
    row0 = [x for x in range(w) if not is_bg(x, 0)]
    R = row0[0] if row0 else 44
    print('推定圆角半径 R =', R)

    def inside(x, y):
        ox = min(x, w - 1 - x)
        oy = min(y, h - 1 - y)
        if ox >= R or oy >= R:
            return True
        dx, dy = R - ox, R - oy
        return dx * dx + dy * dy <= R * R

    # ---- 1) 抹掉水印 ----
    samples = [(px[x, y][0], px[x, y][1], px[x, y][2])
               for y in range(WM_Y0, h) for x in range(WM_X0, w) if inside(x, y)]
    if not samples:
        raise SystemExit('水印区域没有采样到砖块内部像素，请检查 WM_X0/WM_Y0')
    med = tuple(int(statistics.median(c[i] for c in samples)) for i in range(3))
    mbase = sum(med) / 3

    fixed = 0
    for y in range(WM_Y0, h):
        for x in range(WM_X0, w):
            if not inside(x, y):
                continue
            r, g, b, a = px[x, y]
            if (r + g + b) / 3 - mbase > BRIGHT_DELTA:
                px[x, y] = (med[0], med[1], med[2], a)
                fixed += 1
    print('水印修补：中位色', med, '替换像素', fixed)

    blurred = im.filter(ImageFilter.GaussianBlur(1.4))
    mask = Image.new('L', (w, h), 0)
    md = ImageDraw.Draw(mask)
    for y in range(WM_Y0, h):
        for x in range(WM_X0, w):
            if inside(x, y):
                md.point((x, y), fill=255)
    im = Image.composite(blurred, im, mask)

    # ---- 2) 圆角外白底改透明 ----
    base = im.copy()
    base.putalpha(ImageChops.multiply(base.split()[3], rounded_rect_mask((w, h), R)))
    base.save('build/icon-master-310.png', 'PNG')
    print('母版 build/icon-master-310.png')

    def scale(size):
        return base.resize((size, size), Image.LANCZOS)

    # ---- 3) 应用图标 ----
    scale(256).save('build/icon.png', 'PNG')
    scale(32).save('build/icon-window.png', 'PNG')
    sizes = [16, 24, 32, 48, 64, 128, 256]
    frames = [scale(s) for s in sizes]
    frames[-1].save('build/icon.ico', format='ICO', sizes=[(s, s) for s in sizes])
    print('icon.png(256) / icon-window.png(32) / icon.ico', sizes)

    # ---- 4) Store 一览徽标 ----
    os.makedirs('build/store-logos', exist_ok=True)
    for size in (300, 150, 71):
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        pad = int(round(size * PAD_RATIO))
        canvas.alpha_composite(base.resize((size - pad * 2, size - pad * 2), Image.LANCZOS), (pad, pad))
        canvas.save('build/store-logos/StoreLogo-%dx%d.png' % (size, size), 'PNG')
        print('StoreLogo-%dx%d.png' % (size, size))

    print('完成')


if __name__ == '__main__':
    main()
