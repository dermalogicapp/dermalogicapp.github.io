# DermaLogic

A skincare web app with accounts, onboarding, a dashboard and optional YouCam AI skin analysis. It estimates skin tone and visible concerns from a face photo, builds a personalized routine, tracks complaints, progress photos and lifestyle, explains why products worked or didn't from their ingredients, and includes a voice-enabled assistant for visually impaired users.

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
npm run build:standalone            # rebuilds DermaLogic.html (run `npm install` first to get esbuild)
```

### If something goes wrong

| What you see | Fix |
| --- | --- |
| `'npm' is not recognized` or `'node' is not recognized` | Node.js isn't installed. Use `DermaLogic.html` or `start.bat` instead. |
| `ENOENT` / `Could not read package.json` | The terminal isn't in the DermaLogic folder. Use `cd` to go to the extracted folder first, or just double-click `start.bat`. |
| `EADDRINUSE` / port already in use | Another copy is already running. Close the other window, or use the address it printed. |
| Blank page when opening `index.html` directly | Browsers block `index.html` opened straight from the folder. Open `DermaLogic.html` instead, or use `start.bat`. |
| Camera or microphone doesn't work | Allow access when the browser asks. Voice input needs Chrome, Edge or Safari. |

## What's new in v2

- **Landing page, log in / sign up, onboarding wizard and a redesigned dashboard**, with scroll animations, progress rings, an animated scan screen and a celebratory finish.
- **YouCam AI skin analysis** (opt-in). A serverless function (`api/youcam.js`) keeps your YouCam API key secret. The scan sends a cropped face photo to YouCam and shows its 8 checks (acne, dark spots, dark circles, hydration, oiliness, pores, redness, texture). Skin tone is always measured on the device. If YouCam isn't set up or fails, the app falls back to the on-device analysis and says so.
- **Email and password accounts.** By default these are *demo accounts* stored only in the browser. Add Supabase keys for real accounts (below). Each account has its own data and photos on the device.

### Turn on YouCam (Vercel)

1. Get an API key from the YouCam API console (Perfect Corp.).
2. In Vercel: project, **Settings, Environment Variables**, add `YOUCAM_API_KEY`. Redeploy.
3. Optional but recommended with real accounts: also add `SUPABASE_URL` and `SUPABASE_ANON_KEY` there, so only signed-in users can spend your credits.

Each scan uses 8 standard-definition checks (12 credits on YouCam's standard tier at the time of writing; check your plan). The function allows 6 scans per IP per minute per server instance. Cloud analysis cannot work from `DermaLogic.html`, `start.bat` or GitHub Pages, because those have no server function; they use the on-device analysis.

### Turn on real accounts (Supabase)

1. Create a free project at supabase.com. Under **Authentication, Providers**, keep Email on. For the simplest sign-up, turn off "Confirm email" (otherwise users get a confirmation email first).
2. Copy the project URL and the `anon` public key into `js/config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). The anon key is meant to be public.
3. Redeploy. Log in, sign-up and password reset now use Supabase. Skincare data still stays on the user's device.

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

- Records (localStorage) and progress photos (IndexedDB) stay in the browser, separately for each account.
- Skin tone and face detection run on the device. The MediaPipe model and WASM are downloaded from public CDNs (jsDelivr, Google Storage).
- **Only if the user turns on YouCam analysis**, the cropped face photo of that scan is sent to the DermaLogic serverless function and on to YouCam (Perfect Corp.). DermaLogic does not store it. A face image is sensitive biometric data in many places, so show your own privacy policy and get consent where the law requires it.
- Demo accounts store a salted PBKDF2 password hash in the browser. Real accounts store credentials with Supabase.
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
js/auth.js            Email/password accounts (Supabase or demo mode)
js/youcam.js          Face crop, YouCam client, score mapping
js/score.js, routes.js, fx.js, icons.js   Dashboard maths, routing rules, animations, icons
js/config.js          Supabase and endpoint settings
api/youcam.js         Vercel function that calls YouCam (key stays here)
css/v2.css            Landing, auth, onboarding, dashboard styles
js/reminders.js       Reminder and follow-up scheduling
js/lifestyle.js       Habit and skin pattern finding
js/data/              Ingredient database and skin-care knowledge
js/views/             One module per page
tests/                Node unit tests
sw.js                 Offline cache
```
