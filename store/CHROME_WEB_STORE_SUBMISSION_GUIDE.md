# Chrome Web Store 上架操作指南

本指南对应 GPT 知识库 `v1.3.3`。首次上架必须在 Chrome Web Store Developer Dashboard 中手动完成。

## 1. 注册并检查开发者账号

1. 打开 <https://chrome.google.com/webstore/devconsole/>，登录用于长期维护扩展的 Google 账号。
2. 首次使用时同意开发者协议并支付一次性开发者注册费。
3. 在 **Account / 账号** 页面填写 Publisher name，并完成联系邮箱验证。
4. 确保该 Google 账号已启用两步验证；未启用时无法发布或更新扩展。

建议使用能够长期访问、经常检查邮件的专用账号。开发者账号创建后不能直接更换账号邮箱。

## 2. 新建项目并上传 ZIP

1. 在 Dashboard 点击 **Add new item / 添加新项目**。
2. 只上传：`dist/gpt-knowledge-base-1.3.3.zip`。
3. 不要上传 `.sha256`；它只供 GitHub 离线下载用户做可选完整性校验。
4. 上传后确认 Dashboard 成功读取名称 `GPT 知识库`、版本 `1.3.3` 和 Manifest V3。

ZIP 已满足：`manifest.json` 位于压缩包根目录，全部可执行代码随包提供，不使用远程代码。

## 3. 填写 Store listing / 商店详情

- **Primary language / 主要语言**：简体中文。
- **Category / 分类**：Productivity / 生产力工具。
- **Name、Summary、Detailed description**：复制 `store/STORE_LISTING.md` 中对应中文内容；再添加 English 本地化并复制英文内容。
- **Store icon / 商店图标**：`assets/icons/icon128.png`。
- **Screenshot / 截图**：`store/assets/screenshot-workstation-1280x800.png`。
- **Small promo tile / 小型宣传图**：`store/assets/promo-small-440x280.png`，如果后台要求或希望展示时上传。
- **Homepage URL / 主页**：<https://arislan-x.github.io/gpt-knowledge-base/>
- **Support URL / 支持**：<https://github.com/Arislan-x/gpt-knowledge-base/issues>

商店描述必须保留以下事实：只备份当前打开会话；数据默认留在本机；不会备份图片、视频、音频和附件本体；不是各 AI 平台的官方产品。

## 4. 填写 Privacy practices / 隐私权规范

以 `store/PRIVACY_PRACTICES.md` 为填写依据：

- **Single purpose / 单一用途**：备份用户当前打开的 AI 会话，保存在本机，并提供统一工作站用于浏览、整理、导入和导出可追溯知识资料。
- **Remote code / 远程代码**：选择 **No, I am not using remote code**。
- **处理的数据类别**：Website content、Web browsing activity、Personal communications、User-generated content。
- 声明这些数据只在本机处理，不出售、不用于广告、不转移给第三方，也不允许人员读取。
- 勾选与上述事实一致的 Limited Use 认证。
- **Privacy policy URL**：<https://arislan-x.github.io/gpt-knowledge-base/product/privacy.html>

权限理由：

- `activeTab`：识别当前受支持会话，并在用户点击刷新时重新采集。
- `storage`：保存本地设置、会话索引和备份正文。
- `unlimitedStorage`：防止长会话超过默认本地扩展储存额度。
- 支持网站访问范围：仅用于读取清单内 AI 网站当前会话的 DOM，以完成实时备份。

## 5. 设置 Distribution / 分发

1. **Visibility / 可见性**：选择 **Public**。
2. **Regions / 地区**：希望全球提供时选择 **All regions**。
3. 不包含应用内购买，相关选项选择无。

Public、Unlisted 和 Private 都需要经过相同政策审核。正式发布建议直接选择 Public；如果想先让少量账号测试，可先选 Private 并配置 trusted testers。

## 6. 提交审核

1. 确认 Package、Store listing、Privacy practices、Distribution 各页不再显示必填错误。
2. 点击 **Submit for Review / 提交审核**。
3. 希望审核通过后自动上架，就保留自动发布；希望自己选择上线时间，则选择 deferred / staged publishing。
4. 提交后关注开发者邮箱和 Dashboard 状态。

官方说明通常预计多数扩展在数天内完成审核，但可能延长至数周。若超过三周仍无结果，可联系 Chrome Web Store Developer Support。

## 7. 审核通过后

1. 取得正式 Chrome Web Store 商品 URL。
2. 将商品 URL 补入 `README.md`、`README_EN.md` 和 `product/index.html`，替换“审核后开放”。
3. 更新仓库主页和 Release 说明。
4. 后续上传更新时必须提高 `manifest.json` 的版本号，并上传包含全部文件的新 ZIP。

## 官方参考

- 注册开发者账号：<https://developer.chrome.com/docs/webstore/register>
- 首次上传与发布：<https://developer.chrome.com/docs/webstore/publish/>
- 商店详情填写：<https://developer.chrome.com/docs/webstore/cws-dashboard-listing/>
- 可见性与地区：<https://developer.chrome.com/docs/webstore/cws-dashboard-distribution>
- 隐私与项目政策：<https://developer.chrome.com/docs/webstore/program-policies/policies>
- 审核流程：<https://developer.chrome.com/docs/webstore/review-process>
