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
4. **隐私政策 URL**：把 `PRIVACY.md` 推到 GitHub 后填
   `https://github.com/sqdcz/jingzhuang/blob/main/PRIVACY.md`
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
