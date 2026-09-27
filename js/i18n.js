/**
 * I18n Manager
 * Handles dynamic fetching of localized JSON files, shelter data, and DOM updates.
 */
if (typeof window.I18nManager === 'undefined') {
  class I18nManager {
    constructor() {
      this.currentLang = localStorage.getItem('app_lang') || 'en';
      this.translations = null; // Holds UI labels
      this.contentData = null;  // Holds guides data
      this.shelterData = null;  // Holds shelter GeoJSON data
    }

    /**
     * Sets the current language, updates local storage, and fetches matching JSON files.
     * @param {string} lang - Language code (e.g. 'en', 'zh', 'jp')
     */
    async setLanguage(lang) {
      try {
        const uiUrl = `./locators/ui/${lang}.json`;
        const guideUrl = `./locators/content/guides_${lang}.json`;
    
        // Fetch as raw text first to inspect before parsing
        const [uiRes, guideRes] = await Promise.all([
          fetch(uiUrl),
          fetch(guideUrl)
        ]);
    
        if (!uiRes.ok) throw new Error(`HTTP ${uiRes.status} loading ${uiUrl}`);
        if (!guideRes.ok) throw new Error(`HTTP ${guideRes.status} loading ${guideUrl}`);
    
        const uiText = await uiRes.text();
        const guideText = await guideRes.text();
    
        try {
          this.translations = JSON.parse(uiText);
        } catch (e) {
          console.error(`[i18n Error] Failed parsing ${uiUrl}. Content received:`, uiText);
          throw e;
        }
    
        try {
          this.guideData = JSON.parse(guideText);
        } catch (e) {
          console.error(`[i18n Error] Failed parsing ${guideUrl}. Content received:`, guideText);
          throw e;
        }
    
        this.currentLang = lang;
        window.currentLang = lang;
        this.updateUI();
        
        if (window.evacuationMap) {
          window.evacuationMap.renderShelters();
        }
      } catch (error) {
        console.error(`Error switching language to [${lang}]:`, error);
      }
    }

    /**
     * Fetches shelter GeoJSON data and passes it to the evacuation map instance.
     */
    async loadShelterData() {
      try {
        const res = await fetch('./locators/content/shelters.json');
        if (!res.ok) {
          console.warn(`Failed to load shelters.json: Status ${res.status}`);
          return;
        }

        this.shelterData = await res.json();

        if (window.evacuationMap) {
          // Initialize map if not already initialized
          if (typeof window.evacuationMap.initMap === 'function' && !window.evacuationMap.map) {
            window.evacuationMap.initMap('mapArea');
          }
          if (typeof window.evacuationMap.setShelterData === 'function') {
            window.evacuationMap.setShelterData(this.shelterData);
          }
        }

        // Attach disaster category listener after shelter setup
        this.setupDisasterDropdownListener();

      } catch (err) {
        console.error('Error fetching shelter dataset:', err);
      }
    }

    async fetchJson(url) {
      const response = await fetch(url);
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (err) {
        console.error(`[i18n] JSON Syntax Error in file: ${url}`, err);
        throw err;
      }
    }

    /**
     * Listens for disaster hazard selection changes in the UI dropdown.
     */
    setupDisasterDropdownListener() {
      const disasterSelect = document.getElementById('disasterSelect');
      if (!disasterSelect) return;

      // Remove prior listener by replacing node if re-run
      const newSelect = disasterSelect.cloneNode(true);
      disasterSelect.parentNode.replaceChild(newSelect, disasterSelect);

      newSelect.addEventListener('change', (event) => {
        const selectedCategory = event.target.value;

        if (window.evacuationMap && typeof window.evacuationMap.filterByDisaster === 'function') {
          window.evacuationMap.filterByDisaster(selectedCategory);
        }
      });
    }

    /**
     * Helper function to fetch nested translation keys (e.g., 'app.title')
     */
    t(key) {
      if (!key) return '';
      const keys = key.split('.');
      let val = this.translations;

      for (const k of keys) {
        if (val && val[k] !== undefined) {
          val = val[k];
        } else {
          return key; // Return raw key if translation is missing
        }
      }
      return val;
    }

    /**
     * Updates all HTML elements with a `data-i18n` attribute.
     */
    updateDOM() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = this.t(key);
        if (val && val !== key) {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = val;
          } else {
            el.textContent = val;
          }
        }
      });
    }
  }

  // Global instance initialization
  window.I18nManager = I18nManager;
  window.i18n = new I18nManager();

  // Auto-initialize default language, shelter data, and tab listeners on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    if (window.i18n) {
      const savedLang = localStorage.getItem('app_lang') || 'en';
      window.i18n.setLanguage(savedLang);
      window.i18n.loadShelterData();
    }

    // Tab switch listener: Force Leaflet map resize when map tab becomes active
    const mapTabBtn = document.querySelector('[data-tab="mapSection"]') || document.getElementById('mapTabBtn');
    if (mapTabBtn) {
      mapTabBtn.addEventListener('click', () => {
        if (window.evacuationMap && typeof window.evacuationMap.refreshMapSize === 'function') {
          window.evacuationMap.refreshMapSize();
        }
      });
    }
  });
}
