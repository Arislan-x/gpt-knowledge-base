# GPT 知识库 v1.3.5

本版本针对 Chrome Web Store 首次审核进一步收紧权限和隐私披露。

## 改进

- 删除冗余的 `activeTab` 权限。
- 保留仅覆盖受支持 AI 会话网站的主机访问范围，用于当前打开会话的实时备份。
- 更新双语隐私政策、产品网站、权限理由、商店检查清单和上架指南。
- 重新生成 Chrome Web Store 与 GitHub Release 共用的 Manifest V3 安装包。

## Chrome Web Store

上传文件为 `dist/gpt-knowledge-base-1.3.5.zip`。后台权限理由仅需填写 `storage`、`unlimitedStorage` 和主机权限；远程代码选择“否”。

数据使用应如实披露网站内容、个人通讯和网络记录。对话数据默认仅保存在用户本机浏览器，不上传开发者服务器。

## 许可

本项目继续依据 GNU General Public License v3.0（GPL-3.0）发布。
