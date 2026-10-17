# 商店列表文案（中文 / English）

> 用于合作伙伴中心 → 提交选项 → **Store 一览**。每个语言需分别填写，文本与图片不会自动共享。
> 字段限制：说明 ≤ 10000 字符；新增功能 ≤ 1500 字符；产品功能最多 20 条、每条 ≤ 200 字符；
> 截图至少 1 张（建议 4 张以上）；搜索词最多 7 个（不含价格词、不含他人产品名）。

---

## 中文（中国）

**产品名称**（下拉里选已保留的名称）：`净装`

**简短说明**（约 90 字）：

```
输入软件名，自动定位官方下载来源，校验安装包的数字签名与哈希，并给出干净安装建议。
全程本地运行，不收集个人信息。
```

**说明**：

```
净装是一款面向 Windows 的软件来源查询与安装包安全校验工具。

很多安全问题并不是系统漏洞，而是从「下载软件」这一步开始的：搜索结果里是仿冒站，
下载按钮是推广链接，安装包里夹着捆绑软件。净装把这一步变得可验证。

【官方来源，优先零成本渠道】
· 内置白名单与风险清单，常见软件直接给出官方地址；
· 接入 Windows 程序包管理器官方索引，直接读取微软审核维护的清单，取得官方下载地址
  与官方声明的 SHA-256 摘要值；
· 以上均未命中时，可选接入你自行配置的 AI 服务给出候选来源，程序再独立访问核实。

【三重校验，结论与证据一并呈现】
· 数字签名：读取安装包的 Authenticode 签名状态与证书发布者；
· 哈希比对：与官方声明的 SHA-256 逐字节比对，不一致即判定为高风险并阻断；
· 云查杀（可选）：接入 VirusTotal 多引擎检测，仅上传文件哈希，不上传文件本身。

【风险软件提示】
对存在捆绑推广、常驻弹窗、资源占用或卸载困难等行为的软件，明确提示风险并推荐同类
开源或轻量替代方案；对激活工具、破解补丁、外挂等恶意软件予以拦截。

【隐私】
不设账号体系，不收集、不上传个人信息，无遥测、无统计、无广告组件。
所有对外请求均发生在你主动发起检索或下载时。

【说明】
· 商店版本仅提供来源查询、安装包校验与安装建议，不代为运行任何安装程序。
· AI 辅助检索为可选项，需你自行填写第三方服务商的接口地址与密钥。
· 支持 Windows 10 版本 1809（内部版本 17763）及以上 / Windows 11，64 位系统。
```

**产品功能**（每条 ≤ 200 字符）：

```
优先使用内置名单与官方索引，常见软件无需任何配置即可定位官方下载地址
读取安装包的 Authenticode 数字签名与证书发布者，识别来源是否可信
与官方声明的 SHA-256 摘要逐字节比对，不一致即判定高风险并阻断
对捆绑推广、弹窗常驻、卸载困难的软件给出明确风险提示与开源替代方案
拦截激活工具、破解补丁、外挂等恶意软件，需二次确认方可继续
对支持分段请求的下载源启用多连接并行传输，单块中断可自动续传
全程本地运行，不设账号、不收集个人信息，无统计与广告组件
可选接入你自行配置的 AI 服务，用于名单与索引均未命中时的来源查找
```

**搜索词**（最多 7 个）：

```
软件来源查询
官方下载地址
安装包校验
数字签名验证
哈希校验
流氓软件
干净安装
```

**新增功能**：

```
首个版本。支持内置名单、Windows 程序包管理器官方索引与可选的 AI 辅助检索三种来源
渠道；提供数字签名核验、SHA-256 哈希比对与可选的云端多引擎检测；对风险软件与恶意
软件分级提示；下载支持多连接并行与断点重试；全程本地运行，不收集个人信息。
```

---

## English (United States)

**Product name**: `JingZhuang`

**Short description**：

```
Look up official download sources for Windows software, verify installers by digital
signature and SHA-256, and get clean-install guidance. Fully local; no data collected.
```

**Description**：

```
JingZhuang is a Windows tool for locating official software download sources and
verifying the integrity of installers.

Many security incidents do not start with a system vulnerability. They start with the
step of downloading software: search results lead to copycat sites, download buttons are
promotional links, and installers carry bundled software. JingZhuang makes that step
verifiable.

OFFICIAL SOURCES, ZERO-COST CHANNELS FIRST
- A built-in allow-list and risk list resolve common software to its official address directly.
- The Windows Package Manager official index is queried to retrieve the official download
  URL and the official SHA-256 digest published in Microsoft-reviewed manifests.
- Only if neither matches, an optional AI service that you configure yourself can propose
  candidate sources; the app then independently visits and verifies them.

THREE LAYERS OF VERIFICATION, WITH EVIDENCE
- Digital signature: reads the installer's Authenticode status and certificate publisher.
- Hash comparison: compares the SHA-256 digest byte for byte with the official value and
  blocks the flow on any mismatch.
- Optional cloud scanning: VirusTotal multi-engine lookup. Only the file hash is sent; the
  file itself is never uploaded.

RISK SOFTWARE NOTICES
For software that bundles promotions, runs persistent pop-ups, consumes background
resources, or is hard to uninstall, the app states the specific risk and suggests open-source
or lightweight alternatives. Activation tools, cracks and cheats are blocked outright.

PRIVACY
No account system. No telemetry, no analytics, no advertising components. Personal
information is never collected or uploaded. All outbound requests occur only when you
explicitly start a lookup or a download.

NOTES
- The Store version provides source lookup, installer verification and installation guidance
  only. It does not run any installer on your behalf.
- AI-assisted lookup is optional and requires you to supply your own third-party endpoint
  and API key.
- Requires Windows 10 version 1809 (build 17763) or later, or Windows 11; 64-bit.
```

**Product features**：

```
Resolves common software to official download addresses with no configuration required
Reads Authenticode signature status and certificate publisher to judge source trustworthiness
Compares the installer's SHA-256 digest with the official value and blocks mismatches
Warns about bundled promotions, persistent pop-ups and hard-to-remove software
Blocks activation tools, cracks and cheats behind a secondary confirmation step
Uses parallel segmented downloads where supported, with automatic retry per segment
Runs fully locally with no account, no telemetry, no analytics and no ads
Optional AI-assisted lookup when neither the built-in lists nor the official index match
```

**Search terms**：

```
software source lookup
official download
installer verification
digital signature
sha256
clean install
bloatware
```

**What's new**：

```
First release. Three source channels: built-in lists, the Windows Package Manager official
index, and an optional AI-assisted lookup. Digital signature checks, SHA-256 hash comparison
and optional cloud multi-engine scanning. Tiered warnings for risk and malware. Parallel
segmented downloads with retry. Runs fully locally and collects no personal data.
```
