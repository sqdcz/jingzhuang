# 上架微软应用商店指南（净装）

> 目标：把净装以 **MSIX（APPX）** 形式提交到 Microsoft Store。
> 本文假设你第一次上架，按步骤走即可。

---

## 0. 先说清楚两件现实的事

### ① 需要一笔费用
微软合作伙伴中心**个人开发者账号一次性 19 美元**（公司账号更高）。这是上架的硬门槛，绕不开。

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

1. 合作伙伴中心 → **应用和游戏** → 新建产品
2. 产品类型选 **MSIX**（我们是 `.appx/.msix` 容器）
   > ⚠️ 别选 EXE/MSI 那种类型：那条产品线走另一套 API，
   > **不支持上传安装包本体**，只能给一个公网下载直链，没法做自动提交。
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

- 图标资产已生成好，就在仓库里：`build/store-assets/`（44/50/71/150/310 及 310×150 宽幅，符合商店要求）。
  要重新生成就跑（需要 Python + Pillow）：
  ```
  python scripts/gen-store-assets.py
  ```
- 商店截图：至少 1 张 1366×768（建议截主页、名单风险提示、安装指导卡三个界面）

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

**关于受限能力申报**：包内声明了 `runFullTrust`（完全信任）能力——这是 Electron / 桌面桥应用的必需项。提交时若被要求填写用途，这样说明：

```
本产品为基于 Electron 的桌面应用（Windows.FullTrustApplication），
需要 runFullTrust 能力以作为原生 Win32 桌面程序运行。
本版本未使用任何受限文件系统能力（未申请 broadFileSystemAccess），
下载文件默认写入应用自身私有目录。
```

### 10.4 认证前自查

```bash
npm run dist:appx          # 确认打出的是商店版
npm run store:check        # 确认凭据与产品 ID 可用
```

- 确认「设置 → 关于」显示的是 **🏪 商店版**
- 确认商店版界面**没有**「开始安装」按钮、Geek 按钮不可用
- 确认隐私政策链接可访问：https://sqdcz.github.io/jingzhuang/privacy.html
- 确认包内 `MinVersion` 与商店表单填的操作系统要求一致
