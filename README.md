# GPT 知识库

[简体中文](README.md) | [English](README_EN.md) | [产品网站](https://arislan-x.github.io/gpt-knowledge-base/) | [隐私政策](PRIVACY.md) | [GPL-3.0 许可](LICENSE)

**开源许可：GNU General Public License v3.0**

> 跨平台汇聚对话，构建 RAG 知识库
>
> Unify AI conversations into a RAG knowledge base

GPT 知识库是一个原创 Chrome Manifest V3 扩展，用于跨平台汇聚 AI 对话，让用户选择真正有价值的会话，并将它们整理为本地、可追溯、面向 RAG 检索的知识资产。

实时备份是知识采集入口，不是产品终点。当前版本已完成 **跨平台采集、会话浏览、来源合并、选择与导出** 这一数据层；后续版本将在这些结构化会话之上继续实现分块、索引、检索和 RAG 知识库生成。

## 产品定位

核心工作流：

1. 打开 ChatGPT、Claude、DeepSeek、Kimi、豆包等 AI 对话页面。
2. 插件实时采集当前打开会话中的对话内容。
3. 不同平台的会话自动进入各自的本地分组。
4. 在 GPT 知识库中选择需要沉淀的会话。
5. 将精选会话清洗、组织并接入 RAG 知识库流程；当前版本可导出 JSON / Markdown / HTML 作为结构化数据来源。

一句话定位：

> 选择跨平台 AI 会话，将它们沉淀为本地、可追溯的 RAG 知识库。

## 当前功能

- 监听支持的 AI 对话页面。
- 从页面 DOM 中捕获当前可见会话消息。
- ChatGPT 可用时优先使用结构化 conversation JSON，以获得更可靠的角色与顺序。
- 使用 `chrome.storage.local` 将实时捕获的会话永久保存在浏览器本地；外部文件、ZIP 和文件夹仅供当前工作站页面临时读取。
- 按平台自动分组，形成本地会话库。
- 弹窗提供实时备份开关，可暂停当前会话继续备份。
- 弹窗和完整库页支持中文 / 英文界面、开源字体栈、莫兰迪主题色。
- 支持浏览器内置备份与用户手动选择的外部文件、ZIP、备份文件夹合并显示，并标记来源。
- 完整库页支持角色气泡、Markdown / 表格 / 代码块 / LaTeX 公式渲染、代码复制、思考折叠、用户问题跳转栏。
- 支持单个会话导出 Markdown / JSON / HTML。
- 支持会话多选，并将所选或全部会话合并导出 Markdown / JSON / HTML，或按会话导出 ZIP。
- 支持删除浏览器本地保存的单个、所选或全部会话；不会删除外部文件夹中的原文件。
- 支持的平台名称和可用官方图标会链接到各自官网；这些商标和图标仅作指示性使用。

## 备份范围与限制

> **重要：** 本扩展仅备份会话中可识别的文本信息和内容结构，不会下载或保存会话中的图片、视频、音频、上传附件、模型生成文件及其二进制内容。备份中即使保留了文件名、链接或说明文字，也不代表对应资源文件已经备份。请使用原平台提供的下载功能，及时自行保存这些资源。

## 支持的平台

当前会为以下平台创建独立的逻辑分组：

- ChatGPT: `chatgpt.com`, `chat.openai.com`
- Claude: `claude.ai`, `claude.com`
- Grok: `grok.com`, `x.com/i/grok`
- DeepSeek: `chat.deepseek.com`, `deepseek.com`
- Kimi: `kimi.com`, `www.kimi.com`, `kimi.moonshot.cn`
- Gemini: `gemini.google.com`
- Perplexity: `perplexity.ai`, `www.perplexity.ai`
- Poe: `poe.com`, `www.poe.com`
- 千问 / Qwen: `chat.qwen.ai`, `qianwen.com`, `www.qianwen.com`
- 豆包 / Doubao: `doubao.com`, `www.doubao.com`
- 腾讯元宝 / Yuanbao: `yuanbao.tencent.com`
- 文心一言 / Yiyan: `chat.baidu.com`, `yiyan.baidu.com`, `wenxin.baidu.com`
- 智谱清言 / Qingyan: `chatglm.cn`, `*.chatglm.cn`, `z.ai`, `*.z.ai`
- Hugging Face Chat: `huggingface.co/chat`, `hf.co/chat`

这些分组是浏览器扩展储存中的逻辑分组，不是操作系统文件夹。

## 安装方式

本扩展提供两种安装方式：

### 方式一：Chrome Web Store

Chrome Web Store 版本将在审核上架后提供一键安装链接。商店版与 GitHub 公开源码使用相同的 GPL-3.0 许可；商店链接开放后会更新在[产品网站](https://arislan-x.github.io/gpt-knowledge-base/)和本 README 中。

### 方式二：GitHub Release 离线安装

1. 在公开仓库的 [Releases](https://github.com/Arislan-x/gpt-knowledge-base/releases/latest) 页面下载最新的 `gpt-knowledge-base-*.zip` 和 `.sha256` 文件。
2. 可选择先做 SHA-256 完整性校验，然后将 ZIP 完整解压到固定文件夹；Chrome 不能直接加载 ZIP。
3. 打开 Chrome，进入 `chrome://extensions`。
4. 开启开发者模式。
5. 点击“加载已解压的扩展程序”，选择刚才的解压目录。
6. 打开或刷新一个受支持的 AI 对话页面。
7. 点击扩展图标，查看实时备份状态并进入工作站。

#### SHA-256 完整性校验（可选）

`.sha256` 不是安装文件，只用于确认 ZIP 下载完整、未发生意外损坏。**普通用户可以只下载 ZIP 并直接解压安装；校验不是必需步骤。** 如果希望校验，请把 ZIP 和 `.sha256` 放在同一文件夹，在该文件夹打开 PowerShell：

```powershell
$expected = (Get-Content .\gpt-knowledge-base-1.3.6.zip.sha256).Split()[0].ToLower()
$actual = (Get-FileHash .\gpt-knowledge-base-1.3.6.zip -Algorithm SHA256).Hash.ToLower()
$actual -eq $expected
```

- 返回 `True`：校验通过，可以继续解压安装。
- 返回 `False`：不要安装，删除两个文件后从 GitHub Release 重新下载。

Linux 可以运行：

```bash
sha256sum -c gpt-knowledge-base-1.3.6.zip.sha256
```

macOS 可以运行：

```bash
shasum -a 256 -c gpt-knowledge-base-1.3.6.zip.sha256
```

公开产品介绍页：[https://arislan-x.github.io/gpt-knowledge-base/](https://arislan-x.github.io/gpt-knowledge-base/)。

## 源码开发安装

1. 打开 Chrome，进入 `chrome://extensions`。
2. 开启 `Developer mode`。
3. 点击 `Load unpacked`。
4. 选择本目录：`gpt-knowledge-base`。
5. 打开或刷新一个受支持的 AI 对话页面。
6. 点击扩展图标，查看实时备份状态。
7. 点击 `打开工作站 / Open Workstation` 进入完整工作站页面。

## 导入外部备份

工作站提供 `文件`、`ZIP`、`文件夹` 三种导入入口，且都必须由用户主动选择：

1. **单个或多个文件：** 可直接选择一个或多个 `.json`、`.md`、`.markdown` 文件。
2. **本工具导出的备份：** 支持重新导入本工具生成的 ZIP，也支持导入解压后的备份文件夹。
3. **ChatGPT 官方导出：** 支持包含会话 JSON 分片和 `.dat` 附件的完整导出文件夹。

- 点击 `打开工作站`。
- 点击 `导入`，在弹窗中选择 `文件`、`ZIP` 或 `文件夹`。
- `文件`支持一次选择一个或多个 JSON、MD、Markdown 备份文件。
- ZIP 支持本工具导出的备份包，以及使用 Store / Deflate 压缩、内含 `.json`、`.md` 或 `.markdown` 的常见压缩包。
- 文件夹模式支持本工具导出的解压目录、普通 `.json` / `.md` / `.markdown` 备份目录，以及 ChatGPT 官方导出的完整目录。
- 对 ChatGPT 官方导出，工作站会合并读取 `conversations.json` 或 `conversations-000.json` 等分片，沿当前分支还原用户、助手和思考消息。
- `conversation_asset_file_names.json` 会用于恢复 `.dat` 附件的原始文件名与类型；导出目录中仍存在的图片可以预览，PDF、文档等附件可以从消息卡片打开。
- **大型 ChatGPT 官方导出应先解压，再使用“文件夹”导入并选择最外层导出目录；不建议直接导入数 GB 的 ZIP。** ZIP 导入设有防止浏览器内存耗尽的安全上限。
- 浏览器内置备份和外部文件夹备份会合并显示。
- 每个会话都会标记为 `浏览器储存` 或 `文件夹` 来源。

> **持久化说明：** 外部文件、ZIP 和文件夹仅供当前工作站页面临时读取，不会复制进扩展的浏览器永久储存。刷新、关闭工作站或重启浏览器后，需要重新选择对应文件、ZIP 或文件夹。电脑中的原文件不会被修改；插件实时捕获的会话仍会正常永久保存在浏览器储存中。

> **附件说明：** `.dat` 解析只读取用户主动选择的 ChatGPT 官方导出目录。附件本身不会被复制进浏览器储存，也不会被嵌入 JSON、Markdown 或 HTML 知识库导出；离开工作站后仍应保留原始 ChatGPT 导出文件夹。

Chrome 不允许扩展静默读取任意本地路径，所以外部文件、ZIP 和文件夹都必须由用户主动授权选择。导入内容只按备份数据读取，不会执行其中的代码。

## 隐私模型

数据默认保存在本机浏览器配置文件中。本扩展不会上传对话内容到任何云端接口。

扩展只备份当前打开会话中的对话信息，不会主动抓取历史会话列表。外部文件夹也只有在用户手动选择后才会被读取。

完整的数据处理和权限说明见[隐私政策](PRIVACY.md)。

## RAG 知识库方向

这个项目的主线不是单纯保存备份，而是把跨平台 AI 对话变成可复用知识资产。

后续 RAG 层建议基于当前结构继续实现：

- 会话多选与集合管理。
- 自动清洗无关 UI 文本、重复回答和临时思考片段。
- 生成知识库条目、元数据和来源链接。
- 分块、去重、标签、摘要和向量化导出。
- 对接本地或自定义 RAG 工具链。

## 商标和品牌声明

本项目不是 OpenAI、Anthropic、xAI、DeepSeek、Moonshot AI、Google、Perplexity AI、Quora、Alibaba Cloud、ByteDance、Tencent、Baidu、Zhipu AI、Hugging Face 或其他支持平台的官方产品，也未获得其赞助、背书或合作授权。

所有产品名称、Logo、图标、商标和品牌标识均归各自所有者所有。本项目仅将这些名称和图标作为指示性链接使用，用于说明支持的网站和跳转到对应官网。如果某个平台的品牌规范要求不同处理，发布者应在发布前替换或移除相关图标。

## 版权与许可

Copyright © 2026 Arislan-x.

本项目原创代码和文档依据 **GNU General Public License v3.0（GPL-3.0）** 开源。你可以使用、研究、修改和再分发本项目；如果分发修改版或衍生版，必须继续依照 GPL-3.0 提供对应源码和许可声明。完整条款见 [`LICENSE`](LICENSE)。第三方组件仍适用其各自许可证；第三方平台名称、Logo 和商标归各自权利人所有，不因本项目采用 GPL-3.0 而改变权属。
