# GPT 知识库 v1.3.4

本版本增强外部知识资料导入，重点支持 ChatGPT 官方导出目录和独立备份文件。

## 新增与改进

- 支持直接导入一个或多个 JSON、MD、Markdown 文件。
- 支持读取 ChatGPT 官方导出的 `conversations.json` 或分片会话 JSON，并沿活动分支还原消息顺序和角色。
- 支持通过 `conversation_asset_file_names.json` 识别 `.dat` 附件的原始名称和类型。
- 当前工作站会话中可预览仍存在的图片，并可通过附件卡片打开 PDF、文档等本地资源。
- 导入的附件保持为临时会话资源，不复制到浏览器永久储存，也不嵌入知识库导出文件。
- 更新双语 README、产品网站、Chrome Web Store 文案和上架指南。

## 离线安装

1. 下载 `gpt-knowledge-base-1.3.4.zip` 及可选的 `.sha256` 校验文件。
2. 将 ZIP 完整解压到固定文件夹。
3. 在 Chrome 打开 `chrome://extensions` 并启用开发者模式。
4. 点击“加载已解压的扩展程序”，选择解压目录。

## Chrome Web Store

上传文件为 `dist/gpt-knowledge-base-1.3.4.zip`。ZIP 根目录已包含 `manifest.json`，版本为 `1.3.4`，使用 Manifest V3，不包含远程可执行代码。

## 许可与隐私

本项目依据 GPL-3.0 开源。实时备份数据默认保存在用户本机浏览器；外部文件、ZIP 和文件夹仅在用户主动选择后于当前工作站会话中读取，不上传到开发者服务器。
