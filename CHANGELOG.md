# Changelog

## Unreleased

## 1.3.8 - 2026-07-24

- Added "Archive locally" for syncing browser backups into a user-authorized local folder, with settings for enablement, permission status, and location.
- Added an archive progress indicator in the workstation sidebar and automatic archive sync from both the workstation and popup.
- Added recovery from an existing archive folder after extension removal, browser cache loss, or workstation reload.
- Changed imports so file, ZIP, and folder imports are archived locally by default when local archiving is enabled.
- Deduplicated repeated copies of the same conversation across browser storage, local archive, and imports, keeping the newest version.
- Fixed the right-side user-question progress rail so long conversations scroll inside the available space without exposing a scrollbar.
- Added an "All" platform filter at the left of the platform filter row.

## 1.3.7 - 2026-07-17

- Fixed the popup incorrectly reporting that the current page had no backup across supported AI platforms after the `activeTab` permission was removed.
- Added a permission-free page-context request from the popup to the existing content script so the current conversation URL remains available.
- Improved current-page matching using platform-aware conversation IDs, equivalent platform domains, and URL variants.
- Published the extension on the Chrome Web Store on 2026-07-21.

## 1.3.6 - 2026-07-16

- Added local-first, real-time backup for the currently open conversation across supported AI platforms.
- Added a unified workstation with platform grouping, source labels, role-based reading, Markdown, code, tables, citations, thinking collapse, LaTeX, and user-question navigation.
- Added individual and multi-conversation JSON, Markdown, HTML, merged-file, and ZIP export.
- Added import for JSON and Markdown files, extension backup ZIP files and folders, and official ChatGPT export folders.
- Added local backup controls, source-aware deletion, responsive layouts, bilingual UI, font choices, and Morandi-inspired themes.
- Added public Chinese and English documentation, privacy policies, Chrome Web Store submission material, and reproducible release packaging.
- Licensed the project under GNU GPL v3.0 and removed the redundant `activeTab` permission before store submission.
- Clarified that images, video, audio, uploaded attachments, and generated files are not backed up and must be saved separately.
