# GPT Knowledge Base

[简体中文](README.md) | [English](README_EN.md) | [Privacy Policy](PRIVACY_EN.md)

> Unify AI conversations into a RAG knowledge base

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
- Stores all data locally with `chrome.storage.local`.
- Automatically groups conversations by platform.
- Provides a live-backup switch in the popup so capture can be paused for the current browsing session.
- Supports Chinese and English interfaces, open-source font stacks, and Morandi-inspired themes.
- Combines browser backups with a user-selected external backup folder while clearly marking each source.
- Renders role-based bubbles, Markdown, tables, code blocks, LaTeX formulas, copyable code, collapsed thinking, and user-question navigation in the workstation.
- Exports individual conversations as Markdown, JSON, or HTML.
- Exports all local conversations as merged Markdown, JSON, or HTML, or as a per-conversation ZIP archive.
- Deletes individual or all browser-stored conversations.
- Links supported platform names and available official logos to their respective websites for nominative reference only.

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

These are logical groups inside extension storage, not operating-system folders.

## Install from a Private Release

1. Download the latest `gpt-knowledge-base-*.zip` and `.sha256` files from the private repository's [Releases](https://github.com/Arislan-x/gpt-knowledge-base/releases) page.
2. Verify the SHA-256 value, then fully extract the ZIP to a stable folder. Chrome cannot load the ZIP directly.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the extracted directory.
6. Open or refresh a supported AI conversation page.
7. Select the extension icon to review backup status and open the workstation.

The private commercial product page is available at [`product/index.html`](product/index.html). It is not publicly deployed.

## Development Installation

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `gpt-knowledge-base` directory.
5. Open or refresh a supported AI conversation page.
6. Click the extension icon to check live-backup status.
7. Click **Open Workstation** to open the full conversation workstation.

## Import External Backups

The workstation can read a ZIP backup or an external backup folder after explicit user authorization.

- Open the workstation.
- Click **Import**, then choose **ZIP** or **Folder** in the dialog.
- ZIP import supports archives exported by this extension and common Store/Deflate ZIP files containing `.json`, `.md`, or `.markdown` backups.
- Folder import reads `.json`, `.md`, or `.markdown` backup files from the selected folder.
- Browser-stored and folder-based backups are displayed together.
- Every conversation is marked as coming from browser storage or a folder.

Chrome extensions cannot silently access arbitrary local paths. The user must explicitly select and authorize the ZIP or external folder. Files inside ZIP archives are read only as backup data; code inside them is not executed.

## Privacy Model

Data is stored in the local browser profile by default. The extension does not upload conversation content to any cloud endpoint.

Only the currently open conversation is backed up. The extension does not proactively fetch historical conversation lists. External folders are read only after the user explicitly selects them.

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

Copyright © 2026 Arislan-x. All rights reserved.

This project is currently private proprietary software. Access to the private repository or an official Release grants only a limited right to install and use the software as authorized. Except where applicable law expressly permits otherwise or with prior written permission, reproduction, modification, redistribution, resale, and derivative works are prohibited. See [`LICENSE`](LICENSE) for the complete notice. Third-party components and trademarks remain subject to their respective terms.

## Technical Notes

AI conversation websites change their page structures frequently, so each platform uses its own capture strategy.

- ChatGPT: Prefers structured conversation data. Intermediate assistant and tool steps within one user turn are combined into a collapsed thinking block, while only the final assistant message is shown as the visible answer.
- Claude: Uses a DOM-range fallback to extract assistant content between adjacent user bubbles.
- Kimi: Detects user bubbles through controls such as `Edit / Copy / Share` and removes trailing Timeline, Panel, note, folder, and LaTeX-copy UI text.
- Qwen: Uses dedicated cleanup and message-boundary handling for answer text, citations, sources, and video cards.
- Perplexity: Prefers explicit query/answer markers. When a new page omits answer markers, it extracts the DOM range from one query to the next and repairs older merged records using the title and first-paragraph boundary. Complex source cards may still prevent exact visual reconstruction.
- Poe: Supports current and legacy `ChatMessage` / `MessageBubble` layouts and uses left/right bubble signals to determine roles.
- DeepSeek: Supports backup, capture, and role-based segmentation. It prioritizes reconstruction of the active branch; the visual layout may still differ from the source site.
- Doubao: Uses `AI-generated content may be inaccurate` and `Completed...` status text as fallback boundaries to recover titles, user prompts, and assistant answers where possible.
- Yuanbao: Captures human and AI bubble containers independently so earlier messages are not replaced by the last detected message.
- Qingyan: Reads the `cid` conversation identifier, question containers, and final-answer regions while excluding thinking blocks.
- Hugging Face Chat: Reads explicit user and assistant message attributes exposed by the page instead of inferring roles from layout.
- Other platforms: Use platform-specific selectors first, generic message selectors second, and a main-transcript fallback last.

If Chrome reports `Extension context invalidated` or runtime messaging errors after reloading the extension, refresh any already-open chat pages. An old content script cannot reconnect to the newly loaded background service worker.
