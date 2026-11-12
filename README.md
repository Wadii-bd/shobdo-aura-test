# Shobdo Aura, Test Version 2

**Tagline:** Explore Words. Expand Minds.

This is a static front-end prototype. No login, backend, account system or cloud sync is included. Personal preferences, saved words, revision schedules, collections, issue reports and activity analytics are stored locally in the browser.

## Open the website

1. Keep the `index.html`, `medical-data.js`, `v2-addon.js`, `v2-addon.css`, `manifest.webmanifest` and `assets` folder together.
2. Open `index.html` in a modern browser.
3. For browser notifications and PWA installation features, use HTTPS or localhost rather than opening the file directly.

A separate standalone HTML preview is also supplied. It embeds the assets and scripts so it can be opened directly.

## Features

- A–Z English dictionary and word detail pages.
- English definitions, Bangla definitions and meanings, synonyms, antonyms, word forms, collocations and synonym clusters where available.
- Smart search with partial matching and typo-tolerant suggestions.
- Aura PYQ categories with medical admission session index from 1991–92 to 2025–26.
- Medical-admission vocabulary records linked to words or phrases.
- Separate A–Z Idioms & Phrases library.
- My Lexicon, difficult words and user-created collections.
- Recall flashcards, manual quick revision, saved-word and difficult-word revision, custom scheduling.
- Word Arena practice quizzes.
- Light/dark mode, five colour palettes, adjustable text size and four navigation positions.
- Palette-matched SA logo and browser favicon.
- Reading mode, study-time insights, in-app due reminders and optional browser notifications.
- Report an issue, local JSON export/import and a data-integrity checker.
- Developer, sources, privacy and terms placeholder pages.

## Examination data quality

The medical-admission question archive currently contains **80 linked medical-admission vocabulary/phrase records** across sessions represented in the dataset. The year/session index shows 1991–92 through 2025–26, but this does **not** mean all papers or all question items from every year have been recovered.

Many question records are secondary transcriptions. Some question prompts or answer options are condensed/paraphrased for study, while other records retain the transcribed options. Each record carries a source URL, status and note. Records marked `Answer disputed`, `Needs answer verification`, `Needs option verification`, `Options unavailable` or `Options incomplete` should not be treated as confirmed official answers. No record is marked officially verified by this prototype.

The 1995–96 SmartPrep year-specific page lists **Panacea** (meaning “cure all”) among its currently indexed questions. Older reports that attribute “Custodian” to 1995–96 have not been carried into this corrected dataset. The 1997–98 year-specific page did not substantiate the previously mentioned “Authentic” item, so it is not represented as a confirmed 1997–98 appearance.

### Main source directories

- SmartPrep MBBS historical archive: https://smartprepbd.com/bn/question-bank/medical
- SmartPrep 1995–96: https://smartprepbd.com/bn/question-bank/medical/1995-96
- SmartPrep 1997–98: https://smartprepbd.com/bn/question-bank/medical/1997-98
- SmartPrep 2025–26: https://smartprepbd.com/bn/question-bank/medical/2025-26
- Somadhan MBBS English archive: https://somadhan.app/admission-questions/medical
- 10 Minute School 2015–16 question bank: https://10minuteschool.com/content/medical-admission-test-question-bank-2015-16/
- Babar English 2020–21: https://www.babarenglish.com/post/medical-college-admission-test-english-2020-2021-session-english-questions-answers-with-explana
- Englearners 2025–26: https://englearners.com/index.php/medical-admission-test-2025-26/

## Local data and backup

Settings → Data Management → Export My Data downloads a JSON backup. Import previews the number of records and merges data after confirmation. Conflicting revision schedules keep the later next-review date. Import does not silently overwrite local data.

Study-time analytics estimate active on-page use while the tab is visible and recent user interaction has occurred. It excludes long idle periods and hidden tabs, but it is not a precise device screen-time measurement.

Browser notifications require permission. A static file-only website cannot reliably send scheduled notifications while fully closed. In-app reminders work while the page is open; browser notifications are checked while the site is open and permission is granted.

## Future architecture

The data is kept in structured JavaScript objects and the user data is stored separately in versioned local storage keys. This provides a starting point for a future database, authentication and synchronisation layer, but no server connection is configured in this version.

## Important

Privacy Policy, Terms of Use and Content Accuracy pages are prototype starter copy. Review and replace them before public deployment. Developer and Honourable Mentions fields are placeholders for information supplied by the site owner.


## Data exports included

- `medical-admission-questions.json`: medical-admission question records only, with linked word and phrase records and indexed sessions.
- `exam-questions.json`: the full initial examination-question catalogue used by the prototype, including university and other admission items.

The standalone preview is `shobdo-aura-test-v2-preview.html` outside this project folder. It embeds local CSS, scripts and palette logos so it can be opened as one file. The ZIP version keeps source files and assets separate for editing.


## Data exports included

- `medical-admission-questions.json`: medical-admission question records only, with linked word and phrase records and indexed sessions.
- `exam-questions.json`: the full initial examination-question catalogue used by the prototype, including university and other admission items.

The standalone preview is `shobdo-aura-test-v2-preview.html` outside this project folder. It embeds local CSS, scripts and palette logos so it can be opened as one file. The ZIP version keeps source files and assets separate for editing.
