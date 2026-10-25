# DermaLogic

A private, on-device skincare web app. It estimates skin tone and visible concerns from a face photo, builds a personalized routine, tracks complaints, progress photos and lifestyle, explains why products worked or didn't from their ingredients, and includes a voice-enabled assistant for visually impaired users.

> **Not medical advice.** DermaLogic gives general skin-care information and camera-based estimates. It is not a medical device and does not diagnose or treat any condition.

## Run it

### Easiest: no terminal needed

1. Unzip the download (right-click the zip, then **Extract All**). Don't run it from inside the zip.
2. Open the extracted folder and double-click **`DermaLogic.html`**.
3. It opens in your browser. Chrome or Edge works best, since they support the camera and voice.

That file is the whole app in one page and needs nothing installed.

### Alternative: double-click the starter

- **Windows:** double-click **`start.bat`**. It uses Node.js or Python if you have one, and opens the app at http://localhost:5173. Keep the black window open while you use the app. If you have neither, it opens `DermaLogic.html` instead.
- **Mac:** double-click **`start.command`**. The first time, you may need to right-click it and choose **Open**.

### From a terminal (developers)

Nothing needs installing. You only need Node.js 18 or newer.

```bash
node tools/serve.mjs     # or: npm start
npm test                 # unit tests
npm run build            # rebuilds DermaLogic.html (run `npm install` first to get esbuild)
```

### If something goes wrong

| What you see | Fix |
| --- | --- |
| `'npm' is not recognized` or `'node' is not recognized` | Node.js isn't installed. Use `DermaLogic.html` or `start.bat` instead. |
| `ENOENT` / `Could not read package.json` | The terminal isn't in the DermaLogic folder. Use `cd` to go to the extracted folder first, or just double-click `start.bat`. |
| `EADDRINUSE` / port already in use | Another copy is already running. Close the other window, or use the address it printed. |
| Blank page when opening `index.html` directly | Browsers block `index.html` opened straight from the folder. Open `DermaLogic.html` instead, or use `start.bat`. |
| Camera or microphone doesn't work | Allow access when the browser asks. Voice input needs Chrome, Edge or Safari. |

## Features

| Area | What it does |
| --- | --- |
| **Face scan** | Camera or upload. Detects the face on-device (browser FaceDetector, else MediaPipe BlazeFace downloaded once and run locally, else the guide oval). Samples forehead, cheeks, nose, chin and under-eyes, converts to CIELAB, and reports skin tone (ITA°, approximate Fitzpatrick type, undertone) plus scores for redness, uneven tone, shine, blemishes and dark circles. Warns about poor lighting. |
| **Body type** | Not inferred from the face, because a face photo can't reliably show it. The user chooses it (optional) and it is used only for body-care tips such as sweat and friction areas. |
| **Skin profile** | Skin type, concerns, age range, pregnancy, allergies, and skin-bleaching history (products used, when last used). |
| **My routine** | Morning, evening and weekly steps, key ingredients, ingredients to avoid, concern tips and body care. Pregnancy removes retinoids and similar ingredients. |
| **Bleaching history** | A three-phase soothing and barrier-repair plan (centella, panthenol, allantoin, oat, ceramides, cholesterol, niacinamide, mineral tinted SPF), a list of things to avoid, personal notes (for example, tapering steroid creams, mercury exposure, ochronosis) and warning signs that need a dermatologist. Strong actives are left out of the routine. |
| **Complaints** | Log itching, burning, breakouts, rashes, swelling and more. You get self-care steps and red flags. Follow-ups are scheduled automatically and the advice escalates if things get worse or don't change. |
| **Reminders** | Morning and evening routine, daily check-in, and optional sunscreen top-ups. Shown as system notifications (if allowed) and in-app alerts while the app is open or installed. |
| **Today** | Tick-off checklist for the day's routine, with a streak counter. |
| **Progress photos** | Daily photos stored in IndexedDB. Before/after comparison with an accessible slider or side by side, plus a score comparison that re-analyzes both photos. |
| **Lifestyle** | Sleep, water, food tags, exercise, stress and a daily skin rating. Charts with table alternatives. After 7 rated days, it looks for patterns between habits and your skin (same day and next day). |
| **Ingredient checker** | Paste an INCI list and the result (worked, no change, breakout, irritation, allergy, dryness). It explains likely reasons using pore-clogging and irritancy ratings, position in the list (concentration), purging versus a real reaction, and your profile. It finds ingredients that keep showing up in products that went badly (likely triggers) and ones that keep working. Always flags mercury, hydroquinone and steroids. |
| **Assistant** | Rule-based chatbot on the device. It reads routines, explains ingredients, gives concern and complaint advice, covers bleaching recovery, and opens pages by voice ("open progress"). Has speech input, spoken replies, adjustable speed and a hands-free conversation mode. Press **Alt+V** on any page to ask by voice. |
| **Animated icon** | Floating serum-droplet icon in burgundy, pink and white (inline SVG in `js/icon.js`). Used as the logo, the home banner, the analysis loader and the assistant's avatar. It stops moving when the system's reduce-motion setting is on. |
| **Settings & privacy** | High contrast, larger text, read-aloud, export/import JSON, delete all data. |

## Accessibility

- Skip link, landmarks, one `h1` per view, and focus moved to the heading on every page change.
- Live regions announce results, saves and errors. Urgent safety messages use `role="alert"`.
- Every control has a label. Targets are 44px or larger. Visible focus rings. Respects `prefers-reduced-motion` and dark mode. High-contrast and large-text options.
- Charts and meters have text alternatives. The scan results include a plain-language summary.
- Checked with axe-core on every view with no violations.

## Privacy

- All data stays in the browser (localStorage for records, IndexedDB for photos). There is no server.
- Photos are analyzed on the device. The MediaPipe model and WASM are downloaded from public CDNs (jsDelivr, Google Storage); images are never uploaded.
- Voice input uses the browser's Web Speech API. In Chrome, speech audio is sent to Google to be turned into text. Spoken replies are generated locally.

## Limitations

- Camera estimates depend heavily on lighting, white balance and camera quality. Scores are relative indicators to track over time, not clinical measurements.
- The tone classification uses the ITA° colorimetric angle. Fitzpatrick type is about how skin reacts to sun, so it can only be approximated from color.
- The chatbot is rule-based and offline. An LLM-backed assistant would need a server and API key.
- Reminders only fire while the app is open or installed. Background push would need a push server.

## Project structure

```
DermaLogic.html       All-in-one build that opens with a double-click
start.bat / .command  Double-click launchers
tools/serve.mjs       Zero-dependency local server
tools/build-standalone.mjs  Builds DermaLogic.html
index.html            App shell, nav, disclaimer dialog, live regions
css/styles.css        Styles, themes, high contrast
js/app.js             Router, reminders loop, global voice button
js/analysis.js        Color science and skin metrics (pure, tested)
js/camera.js          Camera, face detection, pixel sampling
js/recommend.js       Routine builder, including the bleaching path
js/ingredients.js     INCI parser and "why it worked or didn't" explainer
js/chatbot.js         Assistant intents
js/voice.js           Speech recognition and synthesis
js/icon.js            Animated droplet icon (SVG)
js/reminders.js       Reminder and follow-up scheduling
js/lifestyle.js       Habit and skin pattern finding
js/data/              Ingredient database and skin-care knowledge
js/views/             One module per page
tests/                Node unit tests
sw.js                 Offline cache
```
