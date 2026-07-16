# Chrome Web Store release checklist

## Package

- [x] Manifest V3
- [x] Version set to `1.3.5`
- [x] Redundant `activeTab` permission removed
- [x] Source and documentation licensed under GPL-3.0
- [x] Localized name, short name, and description (`zh_CN`, `en`)
- [x] PNG manifest icons at 16, 32, 48, and 128 pixels
- [x] Toolbar icon declared in `action.default_icon`
- [x] No remote executable code
- [x] Reproducible ZIP packaging script
- [x] `manifest.json` stored at the root of the ZIP
- [ ] Final manual test with the unpacked extension on every supported platform

## Store listing

- [x] Chinese and English listing copy drafted in `STORE_LISTING.md`
- [x] 128 x 128 store icon available at `assets/icons/icon128.png`
- [x] 1280 x 800 workstation screenshot prepared in `store/assets/screenshot-workstation-1280x800.png`
- [x] 440 x 280 small promotional tile prepared in `store/assets/promo-small-440x280.png`
- [ ] Optional additional screenshots showing the popup, import/export dialog, and source merging
- [ ] Optional 1400 x 560 marquee promotional tile
- [ ] Optional YouTube demonstration video

## Privacy and policy

- [x] Single-purpose statement drafted
- [x] Permission justifications drafted
- [x] Local data-use disclosures drafted
- [x] Remote-code answer documented
- [x] Chinese and English privacy policies written
- [x] Publish the privacy policy at a public HTTPS URL through GitHub Pages
- [ ] Verify that the developer account has current contact details and 2-Step Verification enabled
- [ ] Complete the dashboard Limited Use certifications
- [ ] Publish the Chrome Web Store listing publicly after review

## Final submission

- [x] Run `powershell -ExecutionPolicy Bypass -File scripts/package-extension.ps1`
- [ ] Load the generated ZIP's extracted contents as an unpacked extension and smoke-test it
- [ ] Upload `dist/gpt-knowledge-base-1.3.5.zip`
- [ ] Upload the store icon, screenshot, and small promotional tile
- [ ] Paste the listing and privacy-practice copy into the dashboard
- [ ] Submit for review
