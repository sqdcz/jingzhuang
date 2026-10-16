# 生成微软商店所需的图标资产（从 build/icon.png 缩放）
# 用法: python scripts/gen-store-assets.py
# 需要 Pillow: 本机系统 Python 3.8.6 自带
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', 'icon.png')
OUT = os.path.join(ROOT, 'build', 'store-assets')

# 合作伙伴中心要求的标准尺寸
SIZES = {
    'Square44x44Logo.png': (44, 44),
    'Square50x50Logo.png': (50, 50),
    'Square71x71Logo.png': (71, 71),
    'Square150x150Logo.png': (150, 150),
    'Square310x310Logo.png': (310, 310),
    'StoreLogo.png': (50, 50),
}
WIDE = {
    'Wide310x150Logo.png': (310, 150),
}

def main():
    if not os.path.exists(SRC):
        raise SystemExit('缺少 build/icon.png，请先准备图标')
    os.makedirs(OUT, exist_ok=True)
    img = Image.open(SRC).convert('RGBA')

    for name, size in SIZES.items():
        img.resize(size, Image.LANCZOS).save(os.path.join(OUT, name))
        print('OK', name, size)

    for name, (w, h) in WIDE.items():
        # 宽幅：图标居中，透明背景
        canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        side = int(h * 0.86)
        small = img.resize((side, side), Image.LANCZOS)
        canvas.paste(small, ((w - side) // 2, (h - side) // 2), small)
        canvas.save(os.path.join(OUT, name))
        print('OK', name, (w, h))

    print('\n资产输出目录:', OUT)

if __name__ == '__main__':
    main()
