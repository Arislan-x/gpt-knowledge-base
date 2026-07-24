# GPT Knowledge Base

[简体中文](README.md) | [English](README_EN.md) | [Product Website](https://arislan-x.github.io/gpt-knowledge-base/) | [Privacy Policy](PRIVACY_EN.md) | [GPL-3.0 License](LICENSE)

**Open-source license: GNU General Public License v3.0**

> Unify AI conversations into a RAG knowledge base

## Product Demo

[![Watch the GPT Knowledge Base v1.3.8 English demo](https://img.youtube.com/vi/7l7YAmvcEK0/maxresdefault.jpg)](https://www.youtube.com/watch?v=7l7YAmvcEK0)

[Watch the GPT Knowledge Base v1.3.8 English demo on YouTube](https://www.youtube.com/watch?v=7l7YAmvcEK0)

GPT Knowledge Base is an original Chrome Manifest V3 extension that collects conversations across AI platforms. It helps users select valuable conversations and organize them into local, traceable knowledge assets prepared for RAG retrieval.

Live backup is the capture layer, not the final product. The current version provides the data foundation for **cross-platform capture, conversation browsing, source merging, selection, and export**. Future versions will build chunking, indexing, retrieval, and RAG knowledge-base generation on top of these structured conversations.

## Product Positioning

Core workflow:

1. Open a conversation in ChatGPT, Claude, DeepSeek, Kimi, Doubao, or another supported platform.
2. The extension captures messages from the currently open conversation in real time.
3. Conversations from different platforms are stored in separate local groups.
4. Select the conversations worth preserving in GPT Knowledge Base.
5. Clean and organize the selected conversations for a RAG workflow. The current version exports JSON, Markdown, and HTML as structured source data.

In one sentence:

> Select conversations across AI platforms and turn them into a local, traceable RAG knowledge base.

## Current Features

- Monitors supported AI conversation pages.
- Captures messages from the currently open conversation DOM.
- Uses structured conversation JSON for ChatGPT when available, improving role and message-order accuracy.
- Stores live-captured conversations in `chrome.storage.local`; when Archive locally is enabled, it can also sync them into a user-authorized local folder.
- Automatically groups conversations by platform.
- Provides a live-backup switch in the popup so capture can be paused for the current browsing session.
- Supports Chinese and English interfaces, open-source font stacks, and Morandi-inspired themes.
- Combines browser backups, the user-authorized local archive, external files, ZIP archives, and backup folders while clearly marking each source.
- Archives imports locally by default when Archive locally is enabled; repeated copies of the same conversation keep the latest version.
- Renders role-based bubbles, Markdown, tables, code blocks, LaTeX formulas, copyable code, collapsed thinking, and user-question navigation in the workstation.
- Exports individual conversations as Markdown, JSON, or HTML.
- Supports conversation multi-selection and exports selected or all conversations as merged Markdown, JSON, or HTML, or as a per-conversation ZIP archive.
- Deletes individual, selected, or all browser-stored conversations without deleting source files in external folders.
- Links supported platform names and available official logos to their respective websites for nominative reference only.

## Backup Scope and Limitations

> **Important:** This extension backs up recognizable conversation text and content structure only. It does not download or preserve images, videos, audio, uploaded attachments, model-generated files, or their binary contents. A retained filename, link, or description does not mean that the corresponding resource file has been backed up. Use the original platform's download function to save these resources separately.

## Supported Platforms

The extension creates a separate logical group for each supported platform:

- ChatGPT: `chatgpt.com`, `chat.openai.com`
- Claude: `claude.ai`, `claude.com`
- Grok: `grok.com`, `x.com/i/grok`
- DeepSeek: `chat.deepseek.com`, `deepseek.com`
- Kimi: `kimi.com`, `www.kimi.com`, `kimi.moonshot.cn`
- Gemini: `gemini.google.com`
- Perplexity: `perplexity.ai`, `www.perplexity.ai`
- Poe: `poe.com`, `www.poe.com`
- Qwen: `chat.qwen.ai`, `qianwen.com`, `www.qianwen.com`
- Doubao: `doubao.com`, `www.doubao.com`
- Yuanbao: `yuanbao.tencent.com`
- Yiyan: `chat.baidu.com`, `yiyan.baidu.com`, `wenxin.baidu.com`
- Qingyan: `chatglm.cn`, `*.chatglm.cn`, `z.ai`, `*.z.ai`
- Hugging Face Chat: `huggingface.co/chat`, `hf.co/chat`

These are logical groups inside extension storage. When Archive locally is enabled, the authorized archive folder also contains matching per-platform directories.

## Installation Methods

The extension supports two installation methods:

### Method 1: Chrome Web Store

[Install GPT Knowledge Base from the Chrome Web Store](https://chromewebstore.google.com/detail/gpt-%E7%9F%A5%E8%AF%86%E5%BA%93/edjcpeckhehobbjalbkgblcghgiecmjd) for one-click installation and Chrome-managed updates. The store build and the public GitHub source use the same GPL-3.0 license.

### Method 2: Offline Installation from GitHub Releases

1. Download the latest `gpt-knowledge-base-*.zip` and `.sha256` files from the public repository's [Releases](https://github.com/Arislan-x/gpt-knowledge-base/releases/latest) page.
2. Optionally verify the SHA-256 value, then fully extract the ZIP to a stable folder. Chrome cannot load the ZIP directly.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the extracted directory.
6. Open or refresh a supported AI conversation page.
7. Select the extension icon to review backup status and open the workstation.

#### Optional SHA-256 Integrity Check

The `.sha256` file is not an installer. It only verifies that the ZIP was downloaded intact. **Most users can download the ZIP alone and install it without performing this optional check.** To verify on Windows, place the ZIP and `.sha256` file in the same folder and run PowerShell there:

```powershell
$expected = (Get-Content .\gpt-knowledge-base-1.3.8.zip.sha256).Split()[0].ToLower()
$actual = (Get-FileHash .\gpt-knowledge-base-1.3.8.zip -Algorithm SHA256).Hash.ToLower()
$actual -eq $expected
```

- `True`: verification passed; continue with extraction and installation.
- `False`: do not install; delete both files and download them again from GitHub Releases.

On Linux, run:

```bash
sha256sum -c gpt-knowledge-base-1.3.8.zip.sha256
```

On macOS, run:

```bash
shasum -a 256 -c gpt-knowledge-base-1.3.8.zip.sha256
```

Public product website: [https://arislan-x.github.io/gpt-knowledge-base/](https://arislan-x.github.io/gpt-knowledge-base/).

## Development Installation

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `gpt-knowledge-base` directory.
5. Open or refresh a supported AI conversation page.
6. Click the extension icon to check live-backup status.
7. Click **Open Workstation** to open the full conversation workstation.

## Import External Backups

The workstation provides three explicitly user-selected import options: **Files**, **ZIP**, and **Folder**.

1. **One or more files:** directly select one or more `.json`, `.md`, or `.markdown` files.
2. **Backups exported by this extension:** re-import the generated ZIP or its extracted folder.
3. **Official ChatGPT exports:** import the complete folder containing conversation JSON shards and `.dat` assets.

- Open the workstation.
- Click **Import**, then choose **Files**, **ZIP**, or **Folder** in the dialog.
- **Files** accepts one or more JSON, MD, or Markdown backup files in one selection.
- ZIP import supports archives exported by this extension and common Store/Deflate ZIP files containing `.json`, `.md`, or `.markdown` backups.
- Folder import supports an extracted export from this extension, ordinary `.json` / `.md` / `.markdown` backup directories, and complete official ChatGPT export directories.
- For an official ChatGPT export, the workstation merges `conversations.json` or sharded files such as `conversations-000.json`, then follows the active branch to reconstruct user, assistant, and thinking messages.
- `conversation_asset_file_names.json` restores the original names and types of `.dat` assets. Images that are still present can be previewed, while PDFs and other documents can be opened from attachment cards.
- **Extract large official ChatGPT exports first, then use Folder import and select the top-level export directory. Direct import of a multi-gigabyte ZIP is not recommended.** ZIP import has defensive browser-memory limits.
- If Archive locally is enabled and authorized, imported conversations are written to the local archive folder by default; repeated copies of the same conversation keep the latest version.
- Browser-stored, locally archived, and folder-based backups are displayed together.
- Every conversation is marked as coming from browser storage, Archive locally, or a folder.

> **Persistence notice:** After Archive locally is enabled and authorized, the workstation and popup both try to sync browser backups into the user-selected local folder, and imports are written there by default. Without a configured local archive, external file, ZIP, and folder imports remain temporary for the current workstation session. Original imported files on the computer are not modified; archive JSON files are copies created or overwritten inside the authorized folder.

> **Asset notice:** `.dat` parsing only reads an official ChatGPT export directory explicitly selected by the user. Asset binaries are not copied into browser storage or embedded in JSON, Markdown, or HTML knowledge-base exports. Keep the original ChatGPT export folder after leaving the workstation.

Chrome extensions cannot silently access arbitrary local paths. The user must explicitly select and authorize external files, ZIP archives, folders, and the local archive location. Imported content is read only as backup data; code inside it is not executed.

## Privacy Model

Data is stored in the local browser profile by default. When Archive locally is enabled, it is also stored in the user-authorized local folder. The extension does not upload conversation content to any cloud endpoint.

Only the currently open conversation is backed up. The extension does not proactively fetch historical conversation lists. External folders and the local archive folder are read only after the user explicitly selects or authorizes them.

See the [Privacy Policy](PRIVACY_EN.md) for the complete data-handling and permission disclosures.

## RAG Knowledge-Base Direction

This project is not limited to preserving backups. Its main direction is turning cross-platform AI conversations into reusable knowledge assets.

Planned RAG-layer capabilities include:

- Multi-conversation selection and collection management.
- Automatic removal of unrelated UI text, duplicate answers, and temporary reasoning fragments.
- Knowledge entries with metadata and source links.
- Chunking, deduplication, tagging, summaries, and vector-ready exports.
- Integration with local or user-defined RAG toolchains.

## Trademark and Brand Notice

This project is not an official product of, sponsored by, endorsed by, or affiliated with OpenAI, Anthropic, xAI, DeepSeek, Moonshot AI, Google, Perplexity AI, Quora, Alibaba Cloud, ByteDance, Tencent, Baidu, Zhipu AI, Hugging Face, or any other supported platform.

All product names, logos, icons, trademarks, and brand assets belong to their respective owners. This project uses names and icons only as nominative links to identify supported websites and open their official pages. Publishers should replace or remove an asset before release if a platform's brand guidelines require different handling.

## Copyright and License

Copyright © 2026 Arislan-x.

The project's original code and documentation are open source under the **GNU General Public License v3.0 (GPL-3.0)**. You may use, study, modify, and redistribute the project. If you distribute a modified or derivative version, you must continue to provide the corresponding source and license notices under GPL-3.0. See [`LICENSE`](LICENSE) for the complete terms. Third-party components retain their own licenses; third-party platform names, logos, and trademarks remain the property of their respective owners and are not relicensed by GPL-3.0.
