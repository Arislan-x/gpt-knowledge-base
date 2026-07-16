# GPT 知识库 v1.3.3

本版本完成公开开源发布准备，并统一采用 GNU GPL v3.0。

## 新增与改进

- 项目原创代码和文档改用 GNU General Public License v3.0（GPL-3.0）。
- 支持两种安装渠道：GitHub Release 离线安装，以及审核通过后的 Chrome Web Store 一键安装。
- 发布公开产品网站和隐私政策页面。
- README 明确说明不备份图片、视频、音频、附件和模型生成文件本体，请用户自行保存。
- 弹窗中的 JSON、MD、HTML 导出按钮增加悬浮、聚焦和按下反馈。

## 离线安装

1. 下载 `gpt-knowledge-base-1.3.3.zip` 及对应的 `.sha256` 文件。
2. 可选择先校验 SHA-256，然后将 ZIP 完整解压到固定文件夹。
3. 在 Chrome 打开 `chrome://extensions` 并启用开发者模式。
4. 点击“加载已解压的扩展程序”，选择解压目录。
5. 打开受支持的 AI 会话页面并刷新一次。

Chrome Web Store 链接将在商店审核上架后公布。

## 安装包校验（可选）

普通用户只需下载 ZIP；`.sha256` 不是安装文件。需要校验时，将两个文件放在同一文件夹并在 PowerShell 运行：

```powershell
$expected = (Get-Content .\gpt-knowledge-base-1.3.3.zip.sha256).Split()[0].ToLower()
$actual = (Get-FileHash .\gpt-knowledge-base-1.3.3.zip -Algorithm SHA256).Hash.ToLower()
$actual -eq $expected
```

返回 `True` 才表示校验通过；返回 `False` 时请重新下载。

## 许可与隐私

本项目依据 GPL-3.0 开源。对话数据默认保存在用户本机浏览器，不上传到开发者服务器。第三方平台名称、Logo 和商标归各自权利人所有。
