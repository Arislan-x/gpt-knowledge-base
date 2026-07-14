# GPT 知识库

[简体中文](README.md) | [English](README_EN.md)

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
5. 将精选会话清洗、组织并接入 RAG 知识库流程；当前版本可导出 JSON / Markdown 作为结构化数据来源。

一句话定位：

> 选择跨平台 AI 会话，将它们沉淀为本地、可追溯的 RAG 知识库。

## 当前功能

- 监听支持的 AI 对话页面。
- 从页面 DOM 中捕获当前可见会话消息。
- ChatGPT 可用时优先使用结构化 conversation JSON，以获得更可靠的角色与顺序。
- 使用 `chrome.storage.local` 保存在浏览器本地。
- 按平台自动分组，形成本地会话库。
- 弹窗提供实时备份开关，可暂停当前会话继续备份。
- 弹窗和完整库页支持中文 / 英文界面、开源字体栈、莫兰迪主题色。
- 支持浏览器内置备份与用户手动选择的外部备份文件夹合并显示，并标记来源。
- 完整库页支持角色气泡、Markdown / 表格 / 代码块渲染、代码复制、思考折叠、用户问题跳转栏。
- 支持单个会话导出 Markdown / JSON。
- 支持全部本地会话导出 Markdown / JSON。
- 支持删除浏览器本地保存的单个会话或全部会话。
- 支持的平台名称和可用官方图标会链接到各自官网；这些商标和图标仅作指示性使用。

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

## 适配等级

- 完美级适配：ChatGPT、Claude、Gemini、Kimi、千问。
- 可获取较全信息，但不能良好复原：豆包、Perplexity。
- 可备份、获取并按角色分段：DeepSeek。当前分支会优先从当前会话接口重建，DOM 仅作为回退。
- 文心一言的新页面会将一轮回复拆成思考与正式回答；扩展会把前置思考归并为一个默认折叠的区块，并将后续消息识别为正式回答。

其余平台为通用适配，能否完整复原取决于页面结构和站点更新频率。

## 安装测试

1. 打开 Chrome，进入 `chrome://extensions`。
2. 开启 `Developer mode`。
3. 点击 `Load unpacked`。
4. 选择本目录：`gpt-knowledge-base`。
5. 打开或刷新一个受支持的 AI 对话页面。
6. 点击扩展图标，查看实时备份状态。
7. 点击 `打开工作站 / Open Workstation` 进入完整工作站页面。

## 外部备份文件夹

完整库页可以读取电脑上的外部备份文件夹，但必须由用户手动选择。

- 点击 `打开工作站`。
- 点击 `选择文件夹`。
- 选择包含 `.json`、`.md` 或 `.markdown` 备份文件的文件夹。
- 浏览器内置备份和外部文件夹备份会合并显示。
- 每个会话都会标记为 `浏览器储存` 或 `文件夹` 来源。

Chrome 不允许扩展静默读取任意本地路径，所以外部文件夹必须由用户主动授权选择。

## 隐私模型

数据默认保存在本机浏览器配置文件中。本扩展不会上传对话内容到任何云端接口。

扩展只备份当前打开会话中的对话信息，不会主动抓取历史会话列表。外部文件夹也只有在用户手动选择后才会被读取。

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

## 技术说明

AI 对话网站的页面结构会经常变化，因此不同平台使用不同采集策略。

- ChatGPT：优先使用结构化 conversation 数据；同一 user turn 中的中间 assistant/tool 步骤会合并为一个折叠思考块，只保留最后一个 assistant 作为可见回答。
- Claude：增加 DOM range 兜底，会在相邻 user 气泡之间切出 assistant 回答。
- Kimi：针对 `编辑 / 复制 / 分享` 等用户气泡控制文本做专门识别，并清理 Timeline、Panel、闪记、保存到文件夹、LaTeX 复制确认等尾部页面文本。
- 千问：针对正文、引用、来源和视频卡片使用专用清洗与消息边界识别。
- Perplexity：使用用户消息气泡与回答正文容器恢复角色，复杂来源卡片下可能无法完全还原原始布局。
- Poe：兼容新旧版 `ChatMessage` / `MessageBubble` 结构，并使用左右气泡信号区分角色。
- DeepSeek：支持备份、获取和角色分段；优先重建当前活动分支，界面布局仍可能与原站不同。
- 豆包：使用 `AI 生成可能有误 注意核实` 和 `已完成...` 类提示语作为兜底分割信号，尽量还原标题、user 和 assistant。
- 腾讯元宝：按 human / AI 气泡容器采集，避免只保存最后一条识别结果。
- 智谱清言：识别 `cid` 会话 ID、问题容器和正式回答区域，并排除思考区。
- Hugging Face Chat：读取页面提供的明确 user / assistant 消息属性，不再依赖布局猜测。
- 其他平台：先使用平台专用 selector，再使用通用 message selector，最后回退到主会话文本。

如果 Chrome 在扩展重载后显示 `Extension context invalidated` 或 runtime messaging 错误，刷新已打开的聊天页面即可。旧 content script 不能继续连接新的 background worker。
