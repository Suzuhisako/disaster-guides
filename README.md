# 🌐 Japan Emergency Disaster Micro-Guide & Evacuation Map PWA

An accessible, fast-loading, mobile-first Progressive Web Application (PWA) designed to assist foreign residents and visitors in Japan during natural disasters (earthquakes, tsunamis, floods, landslides, volcanic eruptions, and typhoons).

Built with multilingual support across 10 major languages, offline capabilities, real-time hazard mapping, and clear localized actionable instructions.

## ✨ Features

* **🌍 Multilingual UI & Content (10 Languages):**

  * English (`en`)

  * Japanese (`ja`)

  * Chinese Simplified (`zh`)

  * Chinese Traditional (`zh-TW`)

  * Vietnamese (`vi`)

  * Korean (`ko`)

  * Tagalog (`tl`)

  * Portuguese (`pt`)

  * Spanish (`es`)

  * Thai (`th`)

* **⚡ Offline-First PWA Architecture:** Pre-caches critical disaster response guides, emergency phrases, and UI assets via Service Worker for reliability during mobile network congestion or outages.

* **🗺️ Interactive Evacuation Map:**

  * Leaflet-powered mapping with real-time shelter and hazard filters.

  * Geolocation support ("Locate Me") with localized pin overlays.

  * Direct access to regional prefecture maps across all 47 prefectures in Japan.

* **🚨 Emergency Alarms & Japanese Audio/Phrases:** Includes clear explanations and phonetic transcriptions for standard Japanese emergency warnings (*Kinkyū Jishin Sokuhō*, *Tsunami Keihō*, *Hinan Shiji*).

* **📱 Responsive Mobile-First Design:** Optimized header layout (`flex-column` scrolling overflow) to prevent title clipping across long character sets (e.g., Thai, Tagalog, Vietnamese).

## 📂 Project Structure

```
disaster-guides/
├── index.html                 # Main PWA HTML shell & entry point
├── manifest.json              # Web App Manifest for PWA installation
├── sw.js                      # Service worker for offline precaching
├── css/
│   └── styles.css             # Main responsive stylesheet
├── js/
│   ├── app.js                 # Core application controller
│   ├── i18n.js                # Dynamic language loading & DOM localization engine
│   ├── map.js                 # Leaflet map instance & marker controls
│   └── guides.js              # Disaster guide switcher & content dynamic renderer
└── locators/                  # Localization assets
    ├── ui/                    # UI dictionary JSON files (en, ja, zh, th, etc.)
    └── content/               # Disaster guides & prefecture mapping JSONs

```

## 🛠️ Technology Stack

* **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3

* **Mapping Engine:** [Leaflet.js](https://leafletjs.com/) & OpenStreetMap tiles

* **Localization Engine:** Custom lightweight JSON-based i18n switcher with key-path fallback handling

* **Hosting & Deployment:** GitHub Pages with GitHub Actions continuous deployment

## 🚀 Getting Started

### Local Development

1. **Clone the repository:**

   ```
   git clone https://github.com/suzuhisako/disaster-guides.git
   cd disaster-guides
   
   ```

2. **Serve locally:**
   Because the app uses dynamic `fetch()` requests for JSON localization files, run it using a local HTTP server:

   ```
   # Using Python
   python3 -m http.server 8000
   
   # Or using Node.js / npx
   npx serve .
   
   ```

3. Open your browser and navigate to `http://localhost:8000`.

## 🧪 Localization Testing & Verification

When adding or editing localized JSON files under `locators/ui/` or `locators/content/`:

1. Ensure all JSON files are formatted as strictly lowercase ISO language codes (e.g., `th.json`, `zh-tw.json`).

2. Validate syntax using a JSON validator before committing to prevent parse errors during `fetch()`.

3. Verify that new asset paths are registered inside `PRECACHE_ASSETS` in `sw.js` for offline PWA functionality.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
