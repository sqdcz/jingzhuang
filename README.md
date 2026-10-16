# 净装

**Windows 软件官方来源查询与安装包安全校验工具**

以自然语言描述需求，净装将定位该软件的官方下载来源，对下载的安装包执行数字签名与哈希完整性校验，并提供安装配置建议。全部处理在本地完成，不收集个人信息。

[![下载](https://img.shields.io/badge/下载-最新版本-0e8a6d?style=flat-square)](https://github.com/sqdcz/jingzhuang/releases/latest)
[![许可](https://img.shields.io/badge/许可-MIT-0e8a6d?style=flat-square)](./LICENSE)
[![平台](https://img.shields.io/badge/平台-Windows%2010%20%2F%2011%20x64-0e8a6d?style=flat-square)](#规格与说明)

## 下载

**[前往 Releases 下载最新版本](https://github.com/sqdcz/jingzhuang/releases/latest)**（约 82 MB，标准 Windows 安装向导）

要求 Windows 10 / 11（64 位）。当前版本未申请代码签名证书，首次运行可能出现 SmartScreen「未知发布者」提示，如对来源存疑可先校验安装包 SHA-256 摘要值。

## 功能说明

### 来源检索

按可靠性由高至低依次检索，优先采用零成本、可溯源的官方渠道：

| 优先级 | 渠道 | 说明 |
|---|---|---|
| 1 | **内置名单** | 经过整理的白名单与风险软件清单，命中后直接给出官方地址，不发起外部请求 |
| 2 | **Windows 程序包管理器官方索引** | 读取微软审核维护的公开清单，直接获取官方下载地址与官方声明的 SHA-256 摘要值。可在设置中关闭 |
| 3 | **AI 辅助检索** | 上述渠道未命中时，由您自行配置的 AI 服务解析需求并给出候选来源，程序随后独立核验，信息不足时列出候选项交由您确认 |

未配置 AI 服务时，前两级渠道仍可正常使用。

### 安全校验

校验由程序侧与模型侧双重执行，结论与原始证据一并呈现，最终决定权始终在用户。

- **数字签名核验**：读取安装包的 Authenticode 签名状态与证书发布者，并与预期发布者比对（强制性校验）
- **哈希完整性比对**：与官方索引声明的 SHA-256 摘要值逐字节比对，不一致将判定为高风险并阻断流程
- **云端多引擎检测**：可选接入 VirusTotal，仅传输文件的哈希摘要，不上传文件本身
- **传输与下载**：全程 HTTPS；对支持分段请求的下载源启用多连接并行传输，单块中断可自动续传重试

### 风险软件提示

| 类别 | 处理方式 |
|---|---|
| 白名单 | 直接提供官方下载地址 |
| 风险清单 | 展示具体风险说明并提供同类开源或轻量替代方案；继续安装前设有等待确认环节 |
| 恶意软件清单 | 予以拦截，需输入预设口令方可继续，口令由程序侧校验 |

### 其他

- 内置 Geek Uninstaller，用于唤起软件卸载
- 主题支持亮色、暗色、跟随系统及多种主题色，可自定义背景

## 隐私

本产品不设账号体系，不收集、不存储、不上传个人信息，未集成任何形式的统计或广告组件。

政策全文：https://sqdcz.github.io/jingzhuang/privacy.html （源码 `docs/privacy.html`，仓库内另存 `PRIVACY.md`）

## 开发

```bash
npm install         # 依赖已配置国内镜像
npm start           # 开发运行
npm run smoke       # 无头核心链路测试
npm run dist        # 打包 NSIS 安装包 → dist/
npm run dist:appx   # 打包微软商店 MSIX
```

> Windows 环境下若出现 `ELECTRON_RUN_AS_NODE` 相关异常，启动前执行 `unset ELECTRON_RUN_AS_NODE`。

## 名单配置

名单与口令的默认值位于 `defaults/lists.json`，修改后重新打包即可：

```bash
npm run dist
```

安装包将携带新的默认名单。用户本机已生成的名单不会被覆盖，可在设置页使用「恢复默认名单」拉取新默认值。

## 发版

```bash
# 1. 更新 package.json 中的 version
npm run dist
git tag v1.0.1 && git push origin v1.0.1
gh release create v1.0.1 "dist/JingZhuang-Setup-1.0.1.exe" --title "净装 v1.0.1" --notes "更新说明"
```

微软应用商店上架流程另见 [STORE.md](STORE.md)。

## 目录结构

```
├── defaults/lists.json      # 默认名单（白名单/风险清单/恶意软件清单 + 口令）
├── resources/geek.exe       # 内置 Geek Uninstaller（未入库，由 fetch-geek 自动获取）
├── src/main/                # 主进程（检索/校验/安全/下载/名单/索引/IPC）
├── src/preload/             # 预加载桥
├── src/renderer/            # 界面（原生 HTML/CSS/JS，无框架）
├── build/                   # 图标与微软商店素材
├── docs/                    # 落地页与隐私政策页（GitHub Pages）
├── scripts/                 # 打包与商店提交辅助脚本
└── test/smoke.js            # 冒烟测试
```

## 技术栈

Electron 33 + 原生 HTML/CSS/JS 渲染层，**无运行时 npm 依赖**（仅有 `electron` 与 `electron-builder` 两个开发依赖）。

主进程中 `verify`、`security`、`download`、`ai`、`winget` 五个模块不引入 Electron，可直接以 Node 环境进行单元测试。

## 规格与说明

| 项目 | 内容 |
|---|---|
| 支持系统 | Windows 10 / 11（64 位） |
| 安装包大小 | 约 82 MB，标准 Windows 安装向导 |
| 运行方式 | 全程本地运行，不设账号体系，不含统计与广告组件 |
| 许可 | MIT，见 [LICENSE](./LICENSE) |
| 第三方组件 | 内置 Geek Uninstaller 用于软件卸载，其著作权归原作者所有 |

## 免责声明

本产品的检索结果均经过程序侧多重校验并展示原始证据，但最终安装决定权在用户。各 AI 服务商的价格与免费额度以其官方网站公布为准。
