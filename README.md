# Shobdo Aura, Test Release 2

A static, browser-based prototype for the Shobdo Aura vocabulary and Bangladesh examination reference platform.

## Open the project

1. Extract the ZIP file.
2. Open `index.html` in a modern browser.
3. The page works without an account or backend.

For browser notifications, some browsers require the site to be served from `localhost` or HTTPS rather than opened directly as a `file://` URL. The in-app reminder panel still works locally.

## Files

- `index.html`: core prototype and original application code.
- `v2-addon.css`: incremental styling for the second test release.
- `v2-addon.js`: additional interactions and local features.
- `assets/`: supplied SA monogram and favicon sizes.
- `manifest.webmanifest`: basic web app metadata.

## Included in this release

- Original Shobdo Aura look and core prototype features.
- SA browser favicon and Apple touch icon.
- Light and dark themes.
- Settings for text size and navigation placement.
- Hideable navigation, with left/right/top/bottom placement.
- Alphabetical Idioms & Phrases library, separate from Aura Dictionary.
- Smart search suggestions and approximate typo matching.
- Collocations and usage examples for the current starter words.
- Personal collections, saved words and difficult words.
- Manual Recall, scheduled revision, reveal-answer flashcards and quick revision.
- In-app reminders and optional browser notifications.
- Import/export of user data as versioned JSON.
- Aura Insights with active-time estimates and activity breakdowns.
- Examination appearance counts, separating verified records from provisional records.
- Report an Issue forms and local data-integrity checks.
- Reading Mode and supporting information/legal pages.
- Developer and credits placeholders.

## Important limitations

- This is a static prototype. It does not include accounts, a database, cloud backup or cross-device synchronisation.
- User data is stored in the current browser's local storage. Export a backup before clearing browser data or changing devices.
- Time tracking is an estimate of active, visible use. It pauses when the page is hidden or there has been no recent interaction. It is not an operating-system-level screen-time measurement.
- Browser notifications require user permission and may require HTTPS or localhost. The site must remain open for its in-page reminder checks to run. This prototype does not provide background push notifications.
- Examination records are starter transcriptions. Records lacking primary-source verification are marked provisional. The frequency dashboard counts only records explicitly marked verified. Check original question papers and answer keys before relying on or publishing question data.
- The site may load fonts from Google Fonts when internet access is available.

## Data safety

Import merges with locally stored information rather than silently replacing it. Review the import summary and keep a separate exported backup before restoring a large dataset.

## Future architecture

The data model and local export format are intended to provide a starting point for a future dynamic version with authentication, database storage and device synchronisation. Those services are not connected in this release.
