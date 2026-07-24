# Chrome Web Store 更新文案 - v1.3.8

## Dashboard 更新摘要

新增“归档到本地”：用户在工作站中主动授权本地文件夹后，浏览器备份和导入内容可同步写入该文件夹。工作站和插件弹窗打开时都会触发同步；如果扩展被移除或浏览器缓存丢失，用户重新选择旧归档文件夹即可读取旧归档。

导入功能也已升级：文件、ZIP、文件夹和 ChatGPT 官方导出导入后会默认写入已授权的本地归档；同一会话重复出现时保留更新时间最新的版本。长会话右侧问题进度条现在会在可用空间内滚动，左侧平台筛选新增“全部”入口。

补充修复：英文工作站中的本地归档来源标签现已完整显示为 `Folder: Archive locally`，不再混用中文。

删除行为已与本地归档保持一致：清空、单条删除和批量删除会同步移除浏览器储存及已授权本地归档中的对应会话；普通外部文件夹中的原文件不会被删除。

## 审核备注

- 本次更新没有新增 Manifest 权限。
- 本地归档使用浏览器提供的文件夹选择器，必须由用户主动选择并授权位置。
- 扩展不会静默读取任意本地路径，不会上传会话内容到开发者服务器。
- 外部导入文件只按备份数据解析，不执行其中的代码。
- 清空和删除只操作浏览器储存及扩展写入授权归档目录的会话 JSON，不删除普通外部文件夹中的原文件。

## 中文商店“新版变化”短文案

新增“归档到本地”：浏览器备份和导入内容可写入用户授权的本地文件夹，并支持重新选择旧归档文件夹恢复。清空、单条删除和批量删除会同步更新浏览器储存与本地归档。导入同一会话时保留最新版本，并修复长会话右侧进度条越界与英文来源标签翻译问题。

## English Update Notes

Added Archive locally: browser backups and imports can be written to a user-authorized local folder, and selecting an existing archive folder can restore archived conversations. Clear, single-delete, and multi-delete actions now update both browser storage and the authorized local archive. Imports keep the latest version when a conversation appears more than once, and long-conversation navigation and English archive labels are fixed.
