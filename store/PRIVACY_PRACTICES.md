# Chrome Web Store privacy practices draft

Use this document as the source of truth when filling out the Chrome Web Store **Privacy practices** tab. Keep the dashboard answers consistent with `PRIVACY.md` and the shipped extension.

## Single purpose

Back up the AI conversation currently open by the user, store it locally, and provide one workstation for browsing, organizing, importing, and exporting those conversations as traceable knowledge and RAG source material.

## Permission justifications

### `activeTab`

Used after the user opens the extension popup to identify the currently open supported conversation and to request a fresh capture when the user presses refresh. It is not used to inspect unrelated tabs in the background.

### `storage`

Stores extension preferences, the local conversation index, and captured conversation content in `chrome.storage.local`.

### `unlimitedStorage`

Conversation archives can exceed the default extension storage quota, especially when users preserve long conversations. This permission prevents user-requested local backups from silently failing because of quota limits.

### Content-script site access

The extension runs content scripts only on the AI conversation sites listed in `manifest.json`. Access is required to read the DOM of the currently open conversation and extract message roles, text, formatting, and the source URL for the advertised live-backup feature.

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

Before submission, host `PRIVACY.md` at a publicly accessible HTTPS URL. A private GitHub repository URL is not sufficient for Chrome Web Store reviewers or users.
