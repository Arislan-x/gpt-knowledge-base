# Chrome Web Store privacy practices draft

Use this document as the source of truth when filling out the Chrome Web Store **Privacy practices** tab. Keep the dashboard answers consistent with `PRIVACY.md` and the shipped extension.

## Single purpose

Back up the AI conversation currently open by the user, store it locally, and provide one workstation for browsing, organizing, importing, archiving to a user-authorized local folder, and exporting those conversations as traceable knowledge and RAG source material.

## Permission justifications

### `storage`

Stores extension preferences, the local conversation index, captured conversation content in `chrome.storage.local`, and the user's local-archive settings. When the user explicitly authorizes a local archive folder, conversation JSON files are also written to that folder through the browser's file-system picker.

### `unlimitedStorage`

Conversation archives can exceed the default extension storage quota, especially when users preserve long conversations. This permission prevents user-requested local backups from silently failing because of quota limits.

### Content-script site access

The extension runs content scripts only on the AI conversation sites listed in `manifest.json`. Access is required to read the DOM or same-origin current-conversation data of the open conversation and extract its title, message roles, order, text, citations, and source URL for the advertised live-backup feature. It does not scan unrelated sites, proactively read historical conversation lists, or transmit conversation data to developer servers. File, ZIP, folder import, and local archive folder access always require explicit user selection or authorization in the browser UI.

## Remote code

Select **No, I am not using remote code**. All executable JavaScript, KaTeX code, styles, and assets are bundled in the extension package. The extension does not download or execute code from remote servers.

## Data-use disclosures

The extension handles data locally even though it does not transmit that data. The dashboard disclosure should include the categories that apply to captured conversations:

- Website content;
- Web browsing activity, including the source URL of a captured conversation;
- Personal communications;
- User-generated content.

The extension does not sell data, use it for advertising or credit assessment, transfer it to third parties, or allow humans to read it. Select all Limited Use certifications that accurately describe these practices.

## Privacy policy URL

Public privacy-policy URL for Chrome Web Store review: <https://arislan-x.github.io/gpt-knowledge-base/product/privacy.html>
