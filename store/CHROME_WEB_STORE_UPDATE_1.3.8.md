# Chrome Web Store 更新文案 - v1.3.8

## Dashboard 更新摘要

新增“归档到本地”：用户在工作站中主动授权本地文件夹后，浏览器备份和导入内容可同步写入该文件夹。工作站和插件弹窗打开时都会触发同步；如果扩展被移除或浏览器缓存丢失，用户重新选择旧归档文件夹即可读取旧归档。

导入功能也已升级：文件、ZIP、文件夹和 ChatGPT 官方导出导入后会默认写入已授权的本地归档；同一会话重复出现时保留更新时间最新的版本。长会话右侧问题进度条现在会在可用空间内滚动，左侧平台筛选新增“全部”入口。

## 审核备注

- 本次更新没有新增 Manifest 权限。
- 本地归档使用浏览器提供的文件夹选择器，必须由用户主动选择并授权位置。
- 扩展不会静默读取任意本地路径，不会上传会话内容到开发者服务器。
- 外部导入文件只按备份数据解析，不执行其中的代码。

## 中文商店“新版变化”短文案

新增“归档到本地”：浏览器备份和导入内容可写入用户授权的本地文件夹，并支持重新选择旧归档文件夹恢复。导入同一会话时保留最新版本。修复长会话右侧进度条越界问题，并新增“全部”平台筛选入口。

## English Update Notes

Added Archive locally: browser backups and imports can be written to a user-authorized local folder, and selecting an existing archive folder can restore archived conversations. Imports now keep the latest version when the same conversation appears more than once. Long conversation progress navigation now scrolls within its available space, and the platform filter includes an All entry.
