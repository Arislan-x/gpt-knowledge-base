# GPT Knowledge Base Privacy Policy

Effective date: July 24, 2026

GPT Knowledge Base is a Chrome extension that saves the currently open AI conversation on the user's device and provides local browsing and export tools. This policy explains how the extension handles data.

## Data handled

When the user opens a supported AI conversation page, the extension processes:

- The open conversation's title, message text, roles, source URL, and update time;
- Technical metadata required for local grouping, deduplication, and export;
- Local JSON, Markdown, or compatible backup files that the user explicitly chooses to import;
- Conversation archive JSON files in a local archive folder explicitly authorized by the user.

This information may include website content, browsing activity, personal communications, and user-generated content. The extension does not proactively fetch the user's conversation history or read conversations that are not open.

## Purpose

The data is used only for the extension's single purpose: locally backing up, browsing, organizing, and exporting open AI conversations as traceable knowledge material and RAG source data.

## Storage and transfer

- Data is stored in Chrome extension local storage, in a local archive folder explicitly authorized by the user, or in files explicitly exported by the user;
- Conversation content, URLs, and usage data are not uploaded to developer servers or third-party analytics services;
- The extension contains no advertising, tracking, or telemetry;
- User data is not sold, rented, shared, or made available for the developer or other people to read.

Opening a platform link or source page only opens that official website in a new tab. It does not send local backups to that website.

## Permission use

- `storage`: stores settings, the conversation index, and backup content locally;
- `unlimitedStorage`: prevents long conversations and larger local knowledge bases from being constrained by the default extension storage quota;
- Supported-site content script scopes: read only the open conversation DOM or same-origin structured data on the AI chat sites listed in the manifest to provide the advertised live-backup feature; unrelated sites and historical conversation lists are not scanned.

## User control

Users can pause live backup, disable local archiving in the workstation, delete one conversation, clear the local knowledge base, or uninstall the extension at any time. Chrome removes extension-local storage when the extension is uninstalled. Files exported by the user or archived into the selected local folder remain under the user's control.

## Chrome Web Store Limited Use

The use of user data is limited to providing and improving the extension's single user-facing purpose. User data is not used for advertising, credit assessment, data brokerage, or unrelated purposes; it is not transferred to third parties or read by humans. The extension's data use complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Contact

Questions, data requests, and security reports can be submitted at <https://github.com/Arislan-x/gpt-knowledge-base/issues>.
