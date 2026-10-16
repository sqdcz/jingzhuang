# 净装 · AI 软件净装助手

想装什么软件，说人话就行。**优先走 winget 官方索引（不花 AI 的钱）**，找不到再让 AI 帮你找**官方**下载地址、自动校验安全、指导干净安装。

## 下载

**[⬇ 下载最新版 净装-Setup.exe（82 MB）](https://github.com/sqdcz/jingzhuang/releases/latest)**

标准 Windows 安装向导，装完即用。要求 Windows 10/11 x64。
当前版本未做代码签名，SmartScreen 会提示"未知发布者"，点「更多信息 → 仍要运行」即可。

> 不用 AI 也能用：装了 winget 的话，常见软件直接走微软官方索引，不需要配任何 Key。

## 核心功能

### 查找链路（按优先级，省钱又稳）

1. **本地名单**（零成本，秒出结果）
2. **winget 官方索引**（零成本）—— 读微软审核过的官方清单，直接拿到**官方直链 + 官方 SHA256**，下载后比对哈希，一致就是最强官方来源证据
3. **AI agent 查找**（花钱）—— 理解需求 → 给官网候选 → 程序亲自访问核实（HTTPS/页面内容/下载链接/签名发布者）→ 拿不准时弹候选让你选

> winget 命中度不够时，会把候选列表甩给你选，不会自作主张。设置页可一键关掉 winget。

### 三张本地名单

- **白名单**（137 条）→ 直接给官网/直链下载
- **黑名单**（52 条，合规但流氓的软件）→ 大风险提示 + 同类开源替代 + **5 秒倒计时**才能继续
- **病毒名单**（18 条）→ 必须输入暗号才能继续（暗号后端校验，前端绕过无效）

### 安全校验（双重）

- **程序侧**：HTTPS、页面内容核实、下载链接核实、**数字签名 + 发布者匹配**（必查）、**winget 官方 SHA256 哈希比对**
- **AI 侧**：独立判断来源可信度，给针对性安装提醒
- 可配置 VirusTotal 免费 Key，加查 70+ 引擎（只上传文件哈希，不上传文件）

### 其他

- **安装指导**：别装 C 盘、关自启、注意捆绑勾选 + AI 给的针对性提醒
- **内置 Geek Uninstaller** 一键唤起卸载
- **主题**：亮色默认 / 暗色 / 跟随系统 / 6 种主题色 / 自定义背景图

## 用户快速上手

1. 安装后打开，点右上角「设置 → AI 服务」
2. 选一个服务商预设（DeepSeek / 硅基流动 / 智谱等，附注册教程），填 Key 保存
3. 回主页输入软件名或功能描述（如"能压缩文件的软件"）
4. 名单/winget 命中的直接下载；其余走 AI 流程；黑名单会给风险提示

> 其实 winget 装了的话，很多常见软件**不配 AI Key 也能用**。

## 开发

```bash
npm install        # 已配置国内镜像
npm start          # 开发运行
npm run smoke      # 无头冒烟测试
npm run dist       # 打包 NSIS 安装包 → dist/
npm run dist:appx  # 打包微软商店 MSIX（需先填 electron-builder.yml 里的商店身份）
```

> ⚠️ Windows 上若出现 `ELECTRON_RUN_AS_NODE` 相关崩溃，启动前先 `unset ELECTRON_RUN_AS_NODE`。

## 改名单后重新打包（常用）

名单/暗号的默认值在 `defaults/lists.json`，改完后：

```bash
npm run dist
```

安装包会带上新的默认名单（用户本机已生成的名单不会被覆盖，可用设置页里的「恢复默认」拉取新默认值）。

## 发版

```bash
# 1. 改 package.json 里的 version
npm run dist                      # 打 NSIS 安装包 → dist/
git tag v1.0.1 && git push origin v1.0.1
gh release create v1.0.1 "dist/JingZhuang-Setup-1.0.1.exe" --title "净装 v1.0.1" --notes "更新说明"
```

上架微软商店另有 `npm run dist:appx` + `npm run store:submit`，见 [STORE.md](STORE.md)。

## 目录结构

```
├── defaults/lists.json      # 默认名单（白/黑/病毒 + 暗号）
├── resources/geek.exe       # 内置 Geek Uninstaller（不入库，fetch-geek 自动下载）
├── src/main/                # 主进程（AI/验证/安全/下载/名单/winget/IPC）
├── src/preload/             # 预加载桥
├── src/renderer/            # 界面（原生 HTML/CSS/JS，无框架）
├── build/                   # 图标 + 商店素材
├── scripts/                 # 打包辅助脚本
└── test/smoke.js            # 冒烟测试
```

## 技术栈

Electron 33 + **零运行时 npm 依赖**（只有 electron / electron-builder 两个 devDependencies）+ 原生 HTML/CSS/JS 渲染层。
主进程里 `verify / security / download / ai / winget` 五个模块**不 import electron**，可以直接 `node` 单测。

## 微软商店

见 [STORE.md](STORE.md)，隐私政策见 [PRIVACY.md](PRIVACY.md)。

## 说明与免责

- Geek Uninstaller 为免费闭源软件，版权归其作者所有，本软件仅作内置集成便于用户卸载。
- winget 清单、AI 查找结果均经程序侧多重验证，但最终安装决定权在用户。
- 各 AI 服务商的价格与免费额度以其官网为准。

## 许可

MIT，见 [LICENSE](LICENSE)。
