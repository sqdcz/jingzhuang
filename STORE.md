# 上架微软应用商店指南（净装）

> 目标：把净装以 **MSIX（APPX）** 形式提交到 Microsoft Store。
> 本文假设你第一次上架，按步骤走即可。

---

## 0. 先说清楚两件现实的事

### ① 费用：个人开发者已免费（2025-09 起）

> **旧信息作废**：以前个人开发者需一次性缴纳 19 美元，**现在已免除**。
> 微软官方公告（[Free developer registration for individual developers](https://learn.microsoft.com/en-us/windows/apps/publish/whats-new-individual-developer)）：
> 「The $19 registration fee is waived in the new flow.」
>
> - 入口必须是 **https://storedeveloper.microsoft.com**（唯一支持新流程的入口；直接从 Partner Center / Xbox / Visual Studio 进会走到老的收费流程）
> - 流程：选「Individual developer (free)」→ MSA 登录 → 手机拍摄政府证件 + 自拍完成实名 → 自动填充资料 → 进 Partner Center
> - 全球近 200 个市场已生效，无需绑定信用卡
> - 公司账号另走企业验证流程（需 DUNS 或营业执照等）

### ② 政策风险（重要，别跳过）
微软商店政策里有一条：**应用不得下载并执行外部代码**（"Apps may not download or install executable code"）。
而净装的核心流程正是「下载安装包并指导/启动安装」，所以**直接提交完整版有被拒风险**。

**对策：本软件已内置「商店模式」**（见下文第 5 步）。商店版只做：
- 查官方来源（winget / AI）
- 下载并校验安装包（哈希、签名、云查杀）
- 给出安装指引

**不代用户运行安装程序、不启动 Geek 卸载器**，把这两项留给侧载的 NSIS 完整版。
这样商店版将自己定位为「软件来源查询与安全校验工具」，过审概率大幅提升。

---

## 1. 注册开发者账号

1. 打开 https://partner.microsoft.com/dashboard
2. 用微软账号登录 → 注册**个人开发者**（一次性 19 美元）
3. 完成身份验证（邮箱 + 手机号），等待几分钟到几小时生效

## 2. 创建应用并保留名称

1. 合作伙伴中心 → **应用和游戏** → **新建产品**
2. **产品类型选「MSIX 或 PWA 应用」**（列表里的第一项）
   - 「MSIX 或 PWA 应用」= UWP、**桌面桥应用**、PWA，**上架后由微软托管并签名** ← 选这个
   - ❌ 不要选「EXE 或 MSI 应用」：那条路要求自备代码签名证书、且包 URL 不得重定向，我们两个条件都不满足（详见第 11 节）
   - ❌ 不要选「游戏」
3. 名称填 **净装**，点「检查可用性」后**保留名称**
4. 进入该产品 → **产品标识（Product Identity）** 页面，记下：
   - **Package/Identity/Name**（形如 `12345YourName.JingZhuang`）
   - **Publisher**（形如 `CN=A1B2C3D4-...`）
   - **Product ID**（形如 `9NXXXXXXXXXX`，第 9 节自动提交要用这个，别和 Identity Name 搞混）

## 3. 把标识填进打包配置

编辑 `electron-builder.yml` 的 `appx` 段：

```yaml
appx:
  applicationId: JingZhuang
  identityName: 12345YourName.JingZhuang     # ← 第 2 步的 Identity Name
  publisher: CN=A1B2C3D4-...                  # ← 第 2 步的 Publisher
  publisherDisplayName: 衰气的船只
  displayName: 净装
```

## 4. 准备图标与截图

- 包内磁贴素材：`build/store-assets/`（44/50/71/150/310 及 310×150 宽幅）
- Store 一览徽标（可选上传）：`build/store-logos/StoreLogo-{300,150,71}x*.png`
  —— 透明底、8% 留白，由 `build/icon-master-310.png` 生成
- 商店截图：至少 1 张 1366×768（建议截主页、名单风险提示、安装指导卡三个界面）

### 4.1 Store 徽标哪些是必填

| 位置 | 尺寸 | 是否必须 |
|---|---|---|
| 9:16 招贴画 | 720×1080 / 1440×2160 | **仅 Xbox 显示需要** → 我们只面向 Windows 桌面，不用传 |
| 1:1 酷图 | 1080×1080 / 2160×2160 | 同上，Xbox 用 → 不用传 |
| 1:1 应用磁贴图标 | **300×300** | 可选。默认取包内徽标，想更精致就传 |
| 1:1 | 150×150 / 71×71 | 可选，同上 |

> 即：**只做 Windows 桌面时，徽标全都可以不传**（页面里那句「默认情况下，Microsoft Store
> 将使用软件包中的徽标图像」就是这个意思）。

### 4.2 ⚠️ 图标里可能有 AI 水印（已踩过）

早期图标由 AI 生成，**右下角带一枚很淡的「AI」水印**，256px 看不出来，300px 一眼能看到，
会出现在任务栏、开始菜单和商店页上。已用「按圆角矩形掩膜填充中位色 + 局部模糊」修补，
源图见 `build/icon-master-310.png`。

**教训**：AI 生成的图标/素材在出包前务必放大四角逐个检查；水印往往压得很淡，
但商店页和任务栏会被用户看得一清二楚。

## 5. 打 MSIX 包（商店模式）

```bash
npm run dist:appx
```

这条命令会：
1. 自动下载内置 Geek（`scripts/fetch-geek.js`）
2. 通过 `--config.extraMetadata.storeMode=true` 把 **storeMode** 打进产物

**商店模式下的差异**（代码里已实现）：
- 终审卡片不显示「▶ 开始安装」，改为提示手动双击安装包
- 顶栏 Geek 按钮不可用，提示用 Windows 设置卸载
- **默认下载目录改为应用私有目录**（MSIX 沙箱对用户「下载」文件夹没有直接写权限，
  这样不用额外申请 `broadFileSystemAccess`，少一个审核卡点）；用户仍可在设置里改成任意目录
- 设置 → 关于页会显示当前运行模式，方便你确认打的是哪一版

> 完整功能版继续用：`npm run dist`（NSIS，侧载分发，无政策限制）

## 6. 上传与提交

1. 合作伙伴中心 → 该产品 → **包** → 上传 `dist/` 下的 `.appx`/`.msix`
2. **商店列表** → 填写：
   - 描述（可参考 README 的功能说明）
   - 关键词：`软件下载 官方 安全 校验 卸载 安装 干净`
   - 分类建议：`Developer tools` 或 `Utilities`
   - 图标资产：上传 `build/store-assets/` 里的文件
   - 截图：第 4 步的图
3. **属性** → 年龄分级问卷（选 3+ / 无暴力无成人内容即可）
4. **隐私政策 URL**：填这个（已上线，纯静态页，无需登录即可访问）
   ```
   https://sqdcz.github.io/jingzhuang/privacy.html
   ```
   > 仓库里还留了一份 markdown 版 `PRIVACY.md`，改内容时两处同步（页面源码在 `docs/privacy.html`，GitHub Pages 源为 `main` 分支 `/docs` 目录）
5. 提交认证 → 通常 1–3 个工作日出结果

## 7. 认证常见问题预判

| 可能的问题 | 应对 |
|---|---|
| 「下载并执行代码」政策 | 已用商店模式规避；如果被拒可在回复里说明：商店版仅下载到本地并展示校验信息，不执行任何下载内容 |
| 需要 `broadFileSystemAccess` | 已规避：商店版默认把安装包存到应用私有目录，不申请该能力；用户主动改到别处时才需要，属用户自主选择 |
| 未签名 SmartScreen 警告 | 商店会自动签名，上架后无此问题；侧载的 NSIS 版会有提示，属正常 |
| 包名/Publisher 不匹配 | 必须是第 2 步保留名称后拿到的真实值，填错会上传失败 |

## 8. 命令行自动提交（第一次之后就不用再进网页了）

> 前提：**这个产品在网页端已经完成过至少一次提交**（包含年龄分级问卷）。
> 微软的 API **不能创建新产品**，第一次必须在网页端走完。之后每次发新版交给脚本。

### 一次性配置

1. **注册一个 Entra ID 应用**（Azure 门户 → Microsoft Entra ID → 应用注册 → 新注册）
   - 记下：租户 ID、应用程序(客户端) ID
   - 建一个「客户端机密」，**立刻复制保存**（离开页面就不再显示，最长 2 年有效）
2. **把它挂到合作伙伴中心**：合作伙伴中心 → 账户设置 → 用户管理 → 添加 Azure AD 应用，
   角色给 **Manager**
3. 复制一份配置填好（这一步的 `.store.json` 已被 gitignore，密钥不会进 GitHub）：
   ```bash
   copy scripts\.store.example.json scripts\.store.json
   ```
   填 `tenantId` / `clientId` / `clientSecret` / `applicationId`（= 第 2 步记下的 **Product ID**）

### 日常使用

```bash
npm run store:check     # 先验证：令牌能不能拿、产品 ID 对不对、列出历史提交
npm run dist:appx       # 打商店包
npm run store:submit    # 上传并提交认证（提交前会让你输 yes 确认）
```

脚本会依次：拿令牌 → 创建 in-progress 提交 → 把包打成 zip 直传 Azure Blob
→ 更新发布模式/包文件名 → commit → 轮询认证状态直到 Published 或 Failed。

CI 里用 `node scripts/store-submit.js submit --yes` 跳过确认。
凭据也支持环境变量（适合 CI 里不落盘）：
`JZ_STORE_TENANT_ID` / `JZ_STORE_CLIENT_ID` / `JZ_STORE_CLIENT_SECRET` / `JZ_STORE_APP_ID`。

> 脚本零依赖，纯 Node 内置 fetch；ZIP 打包是手写的 store 模式实现，
> 已用 PowerShell 解压比对哈希验证过字节级正确。

## 9. 上架后

- 商店版与 GitHub 上的侧载版共用同一套代码，`storeMode` 是唯一开关
- 更新版本：改 `package.json` 的 `version` → `npm run dist:appx` → `npm run store:submit`
- 认证失败时脚本会打印最终状态，去合作伙伴中心看详细报告

---

## 10. 提交表单填写指引（产品声明 / 认证说明）

合作伙伴中心「提交选项 → 产品声明」和「认证说明」两处。**声明要如实填**，勾了等于向微软承诺，认证阶段可能被要求提供佐证材料。

### 10.1 产品声明（四个复选框）

| 声明项 | 是否勾选 | 理由 |
|---|---|---|
| 此产品依赖于非 Microsoft 驱动程序或 NT 服务 | **不勾** | 净装不安装驱动、不注册 NT 服务、不注入其他进程。内置的 Geek Uninstaller 是普通应用，不是驱动或服务 |
| 此产品已经过测试，符合辅助功能准则 | **不勾** | 未做过无障碍专项测试（屏幕阅读器、键盘全流程导航、对比度等）。勾了可能被要求提交 Accessibility Conformance Report。**除非真做了测试，否则不要勾** |
| 本产品支持触笔输入 | **不勾** | 本产品为键鼠工具，无笔迹输入相关功能 |
| 本产品整合了生成式 AI 功能 | **勾选** | 本产品确实调用大语言模型：解析用户需求、判定候选来源、生成安装建议文本。虽由用户自带密钥、且结果为中间数据，但功能客观存在。<br>**隐瞒的风险远大于披露**——认证人员打开「设置 → AI 服务」即可见。如实勾选属合规披露 |

> 若勾了生成式 AI 一项，商店可能对产品附加 AI 相关标注。我们的隐私政策已完整披露 AI 数据流向（第 2.2.2 条），两者一致，不会自相矛盾。

### 10.2 认证说明（现成文本，直接复制）

> 该字段仅认证人员可见，用户看不到。中英双语是稳妥做法（认证团队可能不读中文）。

**中文版：**

```
【产品定位】
本应用为「软件官方来源查询与安装包安全校验工具」。商店版本仅提供三项能力：
来源检索、安装包数字签名与哈希完整性校验、安装配置建议。
商店版本不代用户执行任何下载的内容——不启动安装程序、不启动外部卸载工具，
因此不涉及「下载并执行外部代码」。

【无需测试账户】
下列用例均无需登录、无需任何配置即可验证（每条对应一条不同的功能分支）：

1. 在搜索框输入「curl」，点击搜索
   → 该名称不在任何内置名单中，将转由 Windows 程序包管理器官方索引检索，
     返回官方下载地址与官方 SHA-256，自动下载并比对哈希，
     随后给出安装建议卡片（应为「哈希与官方清单完全一致」）。

2. 输入「微信」，点击搜索
   → 命中内置白名单，直接给出官方下载地址。

3. 输入「2345好压」，点击搜索
   → 命中内置风险软件清单，展示具体风险说明与开源替代方案，
     并设有等待确认环节后方可继续。

4. 输入「kms激活」，点击搜索
   → 命中内置恶意软件清单，予以拦截，需输入预设口令方可继续
     （该口令由程序主进程校验，用于防止误装）。

> 说明：内置名单是「未命中才继续往下查」的优先链路。
> 像 7-Zip、微信这类常见软件都在白名单内，检索时会直接命中名单，
> 不会走索引链路——这是设计如此，不是功能缺失。

【关于可选的 AI 功能】
应用可选接入第三方大语言模型（OpenAI 兼容协议），接口地址与密钥由用户自行填写。
出于成本与安全考虑，我们不向认证团队提供测试密钥。
该功能为可选增强项：不配置时，上述用例 1—4 的功能完全不受影响。
如需验证 AI 流程，可在「设置 → AI 服务」中填写任意兼容服务商的密钥。

【网络要求】
验证过程需要联网：应用会访问 Windows 程序包管理器官方索引，
以及所查询软件的官方下载站点。

【权限说明】
本版本未申请 broadFileSystemAccess 等受限能力。
下载的安装包默认保存到应用自身的私有目录；
用户也可在设置中指定其他目录，届时由系统文件选择器向用户确认授权。

【已下载安装包的处理方式】
商店版本不会自动运行已下载的安装包。
用户在结果卡片中只能选择「打开所在文件夹」，是否安装由用户自行决定。
这是为符合商店政策而做的有意设计，并非功能缺失。
```

**English version（建议一并附上）：**

```
Product positioning
This app is a software source lookup and installer verification tool. The Store build
provides only three capabilities: official source lookup, digital signature and
SHA-256 integrity verification of installers, and installation guidance.
The Store build never executes downloaded content — it does not launch installers and
does not start any external uninstaller. It therefore does not download or execute
external code.

No test account required
All cases below can be verified with no sign-in and no configuration
(each one exercises a different functional branch):

1. Search "curl" and click search
   -> Not present in any built-in list, so it is resolved via the Windows Package Manager
      official index; the official download URL and official SHA-256 are shown, the package
      is downloaded and the hash compared automatically, then an installation guidance card
      is displayed (it should report a full match with the official hash).

2. Search "微信" (WeChat) and click search
   -> Matched against the built-in allow-list; the official download URL is shown.

3. Search "2345好压" and click search
   -> Matched against the built-in risk list; specific risk details and open-source
      alternatives are shown, with a confirmation delay before proceeding.

4. Search "kms激活" and click search
   -> Matched against the built-in malware list and blocked; a preset passphrase is
      required to proceed (validated in the main process, not in the UI layer).

Note: the built-in lists are a "checked first, continue only on miss" chain.
Well-known software such as 7-Zip or WeChat is already in the allow-list and will be
resolved directly without reaching the index lookup - this is by design.

Optional AI feature
The app can optionally connect to a third-party large language model (OpenAI-compatible
API). The endpoint and API key are supplied by the user. For cost and security reasons we
do not provide a test key. This is an optional enhancement: all cases 1-4 above work
without it. To verify the AI flow, enter any compatible provider's key under
Settings -> AI Service.

Network access required
The app accesses the Windows Package Manager official index and the official download
sites of the software being looked up.

Capabilities
This build does not request broadFileSystemAccess or any other restricted capability.
Downloaded installers are saved to the app's own private folder by default; the user may
choose another folder, in which case Windows confirms the authorization through the
system file picker.

Handling of downloaded installers
The Store build never runs a downloaded installer. From the result card the user can only
choose "Open containing folder"; whether to install is entirely the user's decision.
This is an intentional design for Store policy compliance, not a missing feature.
```

### 10.3 系统要求（可以直接照抄）

关键原则：**商店表单里填的要求，必须和包内清单声明的一致**，否则会出现「商店说支持、装上却打不开」。
包内真实声明从 `AppxManifest.xml` 读（可用解压工具打开 `.appx` 查看）：

```xml
<Dependencies>
  <TargetDeviceFamily Name="Windows.Desktop"
    MinVersion="10.0.17763.0"          <!-- Windows 10 版本 1809 -->
    MaxVersionTested="10.0.19045.0" /> <!-- 实际测试环境 Windows 10 22H2 -->
</Dependencies>
```

| 字段 | 填写内容 | 依据 |
|---|---|---|
| 操作系统 | **Windows 10 版本 1809（内部版本 17763）或更高**，含 Windows 11 | 与包内 `MinVersion` 一致。Electron 33 / Chromium 130 已不支持 Win7/8/8.1，1809 是稳妥下限 |
| 体系结构 | **x64** | 包内 `ProcessorArchitecture="x64"`，仅提供 64 位包 |
| 内存 | 最低 **4 GB** / 推荐 **8 GB** | Electron 内置 Chromium，空载占用约 300–500 MB；4 GB 是 Chromium 系应用的通行下限 |
| 处理器 | 最低 **1 GHz 双核 64 位** / 推荐 **2 GHz 及以上** | 检索与哈希校验都是轻负载，无特殊要求 |
| 图形 | **不作要求**（填最低档） | 应用启动时主动调用 `app.disableHardwareAcceleration()` 禁用硬件加速，正是为了在老显卡上稳定运行，因此不依赖 GPU |
| DirectX | **9.0**（填最低档） | 同上：不走硬件加速渲染，不需要 D3D 特性等级 |
| 视频内存 | **不作要求** | 同上 |
| 网络 | **需要联网** | 检索官方来源、下载安装包、云端安全检测均需网络 |
| 支持的语言 | **中文（简体）** | 包内 `<Resource Language="zh-CN" />` |

> **不要照抄 7-Zip / 记事本这类软件的"极低要求"**：Electron 应用自带整个 Chromium 运行时，内存与磁盘占用天然高于原生小程序。填得过低，用户装在 2 GB 老机器上体验会很差，差评也会算到你头上。

**关于受限能力申报**：包内声明了 `runFullTrust`（完全信任）能力——这是 Electron / 桌面桥应用的必需项。

上传包后商店会给一条**警告**（不是错误，可以继续）：

> 程序包接受警告：The following restricted capabilities require approval before you can use them in your app: runFullTrust.

提交时需要填写用途说明（页面位置：**提交选项 → 受限的功能**，字段「为何需要使用 runFullTrust 功能，如何在产品中使用？」），**直接复制这段**：

```
本产品「净装」是一个基于 Electron 构建的 Windows 桌面应用程序，以入口点
Windows.FullTrustApplication 运行，因此需要 runFullTrust 能力。

一、为什么需要
Electron 应用由一个原生主进程和一个 Chromium 渲染进程组成，必须运行在完整信任
级别下才能创建桌面窗口、加载本地界面资源并访问用户配置目录；若以较低信任级别
运行，应用将无法启动。

二、在产品中如何使用
1. 界面运行：创建应用主窗口、读取随包分发的本地 HTML/CSS/JS 资源，将用户设置
   与软件名单读写到 %APPDATA%\jingzhuang；
2. 安全校验：调用 Windows 系统接口读取安装包的 Authenticode 数字签名与证书
   发布者，并计算其 SHA-256 哈希，用于判断下载来源是否可信；
3. 文件保存：将用户主动请求下载的官方安装包保存到应用自身的私有目录，或保存到
   用户在设置中显式指定的目录（经系统文件选择器授权）。

三、权限最小化说明
本产品未申请 broadFileSystemAccess 及其他任何受限能力，不读取与功能无关的用户
文件，不上传用户数据（无遥测、无统计、无广告组件）。商店版本不会运行任何下载到
的可执行文件，是否安装完全由用户自行决定。
```

> ⚠️ 不要试图"把 runFullTrust 从清单里删掉"来绕过审批 —— Electron 应用没有它根本起不来。
> 该能力对桌面桥应用属常规申请，如实说明用途通常即可通过。

### 10.4 认证前自查

```bash
npm run dist:appx          # 确认打出的是商店版
npm run store:check        # 确认凭据与产品 ID 可用
```

- 确认「设置 → 关于」显示的是 **🏪 商店版**
- 确认商店版界面**没有**「开始安装」按钮、Geek 按钮不可用
- 确认隐私政策链接可访问：https://sqdcz.github.io/jingzhuang/privacy.html
- 确认包内 `MinVersion` 与商店表单填的操作系统要求一致

---

## 11. 如果产品类型是 Win32（EXE/MSI）：包 URL 走法

**先判断你属于哪条路**：

| 表单上看到的内容 | 产品类型 | 该怎么做 |
|---|---|---|
| 「包 URL」「安装程序 URL」「安装程序参数」 | **Win32（EXE/MSI）** | **先读 11.1**：需要代码签名证书 + 不重定向的直链，两道都是硬门槛 |
| 「上传包」「选择 .msix/.appx 文件」 | **MSIX** | 不要填 URL；先把 `electron-builder.yml` 的 REPLACEME 换成真实值重打包，再上传 |

### 11.1 ⛔ 走 Win32 的两道硬性门槛（先看这个再决定）

按微软官方要求（[App package requirements for MSI/EXE app](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msi/app-package-requirements)），走 EXE/MSI 提交必须满足：

| 要求 | 原文要点 | 净装现状 |
|---|---|---|
| 必须是 `.exe` 或 `.msi` | 只接受这两种 | ✅ NSIS 产出 .exe |
| **二进制及其所有 PE 文件必须代码签名** | 证书须由 **Microsoft 受信任根计划内的 CA** 签发 | ❌ **未签名 → 会被直接拒绝** |
| **下载 URL 不得重定向** | 表单会直接报「包 URL 重定向到另一个 URL」 | ❌ **GitHub Release 直链会 302 跳转到 CDN（已实测）→ 被拒** |
| 必须用**带版本**的下载 URL | 提交后该 URL 对应二进制不得变更 | ✅ 只要用了带版本号的自有直链即可满足 |
| 安装过程不得显示 UI（静默安装） | UAC 弹窗允许 | ✅ 传 `/S` |
| 必须是独立安装器，**不能是运行时下载的 web 安装器** | 安装期间不得联网下载组件 | ✅ NSIS 自带全部内容（含 Geek） |

**结论：Win32(EXE/MSI) 这条路目前有两道拦路石，都是硬性的：**

1. **必须自备代码签名证书** —— 没有就别提交，会被直接拒
2. **必须是不重定向的直链** —— GitHub Release / 网盘分享页都不行（GitHub 会 302 跳到 `release-assets.githubusercontent.com`，实测确认）

若坚持这条路，需要：买证书签名 → 把安装包放到**对象存储/CDN**上拿直链（如 Cloudflare R2 免费额度无出网流量费、或腾讯云 COS / 阿里云 OSS 开公有读），再填进表单。

### 11.2 ✅ 因此推荐走 MSIX 类型

微软明确说明 MSIX 的优势（同一页文档）：

> MSIX benefits include: **Free Microsoft code signing** and CDN hosting.

也就是：**MSIX 由商店免费签名**，我们无需自己买证书。代价是应用跑在 MSIX 沙箱里，受商店政策约束 —— 这正是本项目已实现 `storeMode` 的原因（商店版只做查询/校验/指导，不代用户运行安装程序）。

| | MSIX 类型 | Win32（EXE/MSI）类型 |
|---|---|---|
| 签名 | **商店免费签** | **必须自备证书**（否则拒绝） |
| 安装包 | 上传 `.msix/.appx` | 只能给**不重定向**的下载直链 |
| 应用能力 | 沙箱，受政策约束 → 用 `storeMode` | 不受沙箱限制、可保留完整能力 |
| 自动提交 | ✅ 经典 API，`npm run store:submit` 已支持 | 另一套 API（`api.store.microsoft.com`），脚本未覆盖 |
| 提交前要做 | 填真实 Identity/Publisher → 重打包 | 先买证书签名 → 再搭对象存储拿直链 |

**行动建议**：改走 MSIX。步骤见第 2 步（创建 MSIX 类型产品）→ 第 5 步（打商店包）→ 第 8 步（脚本自动提交）。

#### 关于「产品名被占用」的正确处理

**先确认一件事，可能压根不用删产品**：打开该产品的 **包** 页面，看是否有「上传包 / 选择文件 / 包类型」之类的入口。
微软支持的商店包格式清单包含 `.msix`、`.msixbundle`、`.msixupload`、`.appx`、`.appxbundle`、`.appxupload`。
若该产品允许直接上传 MSIX 包，就**用它**：无需删除产品、无需改名，直接用该产品的 Identity 打 MSIX 包上传即可。

若确实只能填 EXE/MSI 的下载 URL（即被限定在 MSI/EXE 路径），才需要往下看：

> 常见误解：以为名字一旦保留就永久锁死。**不是的。**

按微软官方文档（[管理应用名称预留](https://learn.microsoft.com/zh-cn/windows/apps/publish/partner-center/msix/manage-app-name-reservations)、[管理产品名称](https://learn.microsoft.com/zh-cn/office/dev/store/manage-solution-names)）：

- **删除草稿产品会释放它保留的所有名称**：「若要从合作伙伴中心删除草稿解决方案（并释放已保留的所有名称），请在**产品设置**页上选择**删除**」
- 也可以只删单个名称释放它：管理应用名称页 → 对应名称 → 删除
- ⚠️ **释放后名称立即回到公共池，别人可以抢注**。所以正确做法是**删完立刻**创建 MSIX 产品并重新保留该名称，不要间隔太久
- 另外：保留的名称若长期未发布，也会被系统回收

**推荐操作顺序**

**如果旧产品还在**（尽量缩短抢注空窗）：

1. 先做好一切准备：`electron-builder.yml` 待填、`npm run dist:appx` 随时可跑
2. 新建「MSIX 或 PWA 应用」类型产品时，名称先填一个**临时名**（如 `净装测试`）避免中途卡住
3. 拿到该产品的 Identity Name / Publisher → 填进配置 → 打出 `.appx`
4. 删除旧的 EXE/MSI 草稿产品 → **立即**回到新产品「管理应用名称」页保留 `净装`
5. 上传包、继续提交

**如果已经删掉了**（正常情况，别慌）：

1. 名称释放可能有几分钟延迟 → 若暂时搜不到，等 5–10 分钟刷新重试
2. 立即新建「MSIX 或 PWA 应用」产品，名称填 `净装`，点「检查可用性」
3. 可用就**当场保留**（创建产品这一步就会把名称占住）
4. 若确实已被他人抢注，改用备选名，按推荐顺序：`净装助手` → `净装 · 软件净装助手` → `JingZhuang`

> 产品名不影响应用内部功能，只影响商店显示名，换名无需改代码。

#### 建产品时提示「名称不可用」怎么办

报错原文形如：

> 名称不可用。如果已保留此名称用于其他产品，请将其更改为其他名称。
> 请与 reportapp@microsoft.com 联系以获取帮助。

**按顺序排查：**

**① 最常见原因：删的是「提交草稿」，不是「产品」**
在合作伙伴中心这是**两个不同的操作**：
- 删除**提交草稿**（submission）→ 只清掉这一次提交，**产品还在、名称仍被占着**
- 删除**产品**（产品设置 / Product setup 页 → 删除）→ 才会**释放该产品保留的所有名称**

去「应用和游戏」总览页看那个旧产品**是否还在列表里**。若还在 → 就是没删干净。

**② 若旧产品还在，用「只释放名称」的精准做法**（不必删整个产品）

1. 打开旧产品 → 左侧「**产品管理 → 管理应用名称**」（Manage app names）
2. 该页面能看到它占用的所有名称，`净装` 就在里面
3. **先给这个产品保留一个占位名**（如 `净装旧`）—— 因为「应用必须至少保留一个名称」，不能删到空
4. 再删除 `净装` 这一条 → 名称立即释放
5. 回到新建产品页面重新检查可用性

> 若确定不要这个旧产品了，也可以直接在「产品设置」页把**整个产品删除**，它会一次性释放所有保留名称。

**③ 若旧产品确实已不存在 → 属于释放延迟**
名称释放可能需要几分钟到若干小时（极端情况到 24 小时）。等 10–30 分钟刷新重试。

**④ 一直不行**：说明该名称可能已被他人抢注。
可发邮件到 **reportapp@microsoft.com** 咨询（报错里给的官方求助邮箱）；
或改用备选名，按推荐顺序：`净装助手` → `净装 · 软件净装助手` → `JingZhuang`。

> 另外注意页面上那句提示：「必须在三个月内将此应用提交到 Microsoft Store，否则将会丢失保留的名称」——
> 名称保留有 3 个月时效，别拖太久。

> 💡 应急思路：先用备选名把 MSIX 产品建起来（Package Identity 会带上备选名，属于技术标识，
> 用户看不到）；等 `净装` 释放后，再到「管理应用名称」保留 `净装`，并在 **商店列表 → 产品名称** 下拉里选它。
> 商店里展示的名字可以后改，产品标识不会变。

**备选名清单**（按推荐顺序，直接挨个粘进「名称」框点「检查可用性」最快）：

| 名称 | 说明 |
|---|---|
| `净装助手` | 与原品牌最接近，加「助手」大幅降低撞名概率 |
| `净装软件管家` | 含「软件」关键词，商店搜索更易命中；「管家」为通用词，不涉侵权 |
| `净装 · 安装包校验` | 描述性最强，几乎不会撞名，且名称本身就说明核心能力（对审核友好） |
| `净装 CleanInstall` | 中英混排，独特性高 |
| `净装工具箱` | 通用后缀，保守方案 |
| `JingZhuang` | 纯拼音，基本必定可用 |

> ⚠️ **改名的连带影响**：MSIX 包的**内部显示名需与商店保留名一致**，否则认证可能报名称不匹配。
> 换名后要同步改 `electron-builder.yml` 的 `appx.displayName`（必要时连 `productName` 一起改，后者影响 exe 与快捷方式名）。

### 11.3 若仍要走 Win32：包信息怎么填

> 前提：已解决 11.1 的两道门槛（**已签名** + **不重定向的直链**）。
> GitHub Release 的链接会被表单直接拒绝，必须换成对象存储/CDN 直链。

| 字段 | 填写值 | 说明 |
|---|---|---|
| 包 URL | 你的对象存储直链（形如 `https://<bucket>.<域名>/JingZhuang-Setup-1.0.0.exe`） | 带版本号；**不得重定向**；**不要网盘分享页**（需登录/跳转） |
| **安装程序在无提示模式下运行，但不需要切换** | **不勾** | 「切换」是 switch 的机器翻译，意为命令行参数。我们的安装器需要 `/S` 才静默，不能勾 |
| 安装程序参数（静默安装） | `/S` | NSIS 标准静默开关。微软会实际运行安装程序抓取安装内容，不给参数会卡在向导界面 |
| 架构 | x64 | 只有 64 位包 |
| 语言 | zh-CN | 安装向导为中文 |
| 静默安装 | 是 | 本安装器为单用户安装（`perMachine: false`），静默不需要提权 |
| 签名 | 用受信任 CA 的证书对 `.exe` 及包内所有 PE 文件签名 | `electron-builder` 配置 `win.sign` / 环境变量 `CSC_LINK` + `CSC_KEY_PASSWORD` 即可 |

### 11.4 Win32 类型下的行为差异

若走 Win32，提交的是**完整版 NSIS 安装包**，**不带 storeMode**：

- 应用保留「代启动安装程序」与 Geek 卸载器 —— 这是完整版设计
- 不需要 `npm run dist:appx`
- 隐私政策链接不变：https://sqdcz.github.io/jingzhuang/privacy.html

---

## 12. 政策版本核对（文档 7.20，2026-10-22 生效）

合作伙伴中心会提示「Microsoft Store 政策已更新」。核实结果：

### 12.1 本次 7.20 的改动与我们无关

据[政策变更历史](https://learn.microsoft.com/en-us/windows/uwp/publish/store-policies-change-history)，7.20（发布 2026-09-15、生效 2026-10-22）的变更是：

- 全文 Xbox → XBOX 品牌更新
- 新增 10.13.12 / 10.13.13 / 10.13.14（均为 **Xbox 游戏**相关：跨设备支持、跨平台权益、游戏元数据与本地化）
- 更新 11.11 年龄分级：须在产品全生命周期保持准确、及时更新
- 更新 11.12 用户生成内容：第三方模组/UGC 平台的举报与审核预期

→ **对净装无新增约束**（非游戏、无 UGC）。

### 12.2 但必须满足的既有政策条款（逐条自查）

| 政策 | 要求 | 净装状态 |
|---|---|---|
| **11.16 实时生成式 AI 内容** | ① 在元数据中披露使用生成式 AI ② 在提交时勾选注明 ③ 生成内容须符合商店政策 ④ **为用户提供举报不当内容的途径**并据举报处理 | ①→ 隐私政策 2.2.2 条已披露；②→ 提交表单勾选「整合生成式 AI」；③→ AI 仅用于来源判定，不产出违规内容；④→ **已在软件「设置 → 关于」加入「反馈与举报」入口**（2026-10-17 补） |
| 10.2.2 动态引入代码 | 不得下载远程脚本执行来根本改变功能 | ✅ 不下载执行任何脚本 |
| 10.2.3 次级软件 | 不得提供安装非你开发、且不增强本产品功能的次级软件 | ⚠️ **最大风险点**。净装帮用户获取第三方安装包 → 已用 `storeMode` 缓解：商店版**不代运行**安装程序，只做来源查询与校验，安装与否由用户自行决定 |
| 10.2.9 HTTPS 下载 URL | （仅适用于 EXE/MSI 提交路径）须签名、不重定向、静默安装 | ✅ 本项不适用，因为走 MSIX 上传 |
| 10.5.1 隐私政策 | Desktop Bridge / Win32 产品必须**始终**提供隐私政策 | ✅ 已上线 https://sqdcz.github.io/jingzhuang/privacy.html |
| 10.1.5 初次下载后获取的内容 | 须经用户同意 | ✅ 每次检索都由用户主动发起 |

### 12.3 提交表单里的勾选与政策的对应

- 「整合了生成式 AI 功能」→ 对应政策 **11.16**，必勾，且要保证上面 ④ 满足
- 「依赖非 Microsoft 驱动程序或 NT 服务」→ 对应政策 **10.2.4**，我们不依赖，不勾

---

## 13. 提交实录（2026-10-17，首次上架）

### 13.1 本产品真实标识（已填入 electron-builder.yml）

| 项 | 值 |
|---|---|
| 产品显示名 | 净装 |
| Package/Identity/Name | `31096ADE.1281421F2F1D5` |
| Publisher | `CN=EDFD9F3C-211F-42CA-B6B9-3A9E55BEEEBC` |
| 期望的 Package Family Name | `31096ADE.1281421F2F1D5_gxff8jaa3y6r0` |
| Product ID（`scripts/.store.json` 用） | 见合作伙伴中心「产品标识」页 |

> 中文产品名无法直接进入 Identity Name（只允许字母数字/点/短横线），
> 合作伙伴中心会自动转成哈希形式 —— 这是正常的，不是出错。

### 13.2 上传包时踩到的坑（按出现顺序）

1. **占位符包被拒**：用 `REPLACEME` 占位打的包上传后报三条错误
   （无效的标识名称 / 系列名称 / 发布者名称）。
   💡 **报错会直接给出正确值**，照着改 `electron-builder.yml` 重打包即可。
2. **旧包必须删掉**：只要列表里还留着一个校验失败的包，
   页面会一直提示「提交之前必须修复所有程序包验证错误」，挡住提交。
   点该包行尾的 **Delete** 删除。
3. **设备系列只能勾 Desktop**：勾了 Xbox/Mobile/Team 会报
   「必须支持选定的每个设备系列…请面向 Xbox 设备系列」。
   我们的 `TargetDeviceFamily` 只有 `Windows.Desktop`，只勾 **Windows 10/11 Desktop**。
4. **runFullTrust 警告**：属警告非错误，提交时按要求填用途说明（话术见 10.3）。

### 13.3 提交前检查清单

- [ ] 包列表中只剩**一个**包，且无红色错误
- [ ] 设备系列仅勾选 Windows 10/11 Desktop
- [ ] 商店列表：描述、6 张以上截图、商店徽标
- [ ] 年龄分级问卷已完成
- [ ] 产品声明四项已按第 10.1 节勾选
- [ ] 隐私政策 URL 已填：https://sqdcz.github.io/jingzhuang/privacy.html
- [ ] 系统要求已按 10.3 节填写
- [ ] 认证说明已粘贴 10.2 节的双语文案
