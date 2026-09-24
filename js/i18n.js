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
      this.currentLang = lang || this.currentLang;
      localStorage.setItem('app_lang', this.currentLang);
      window.currentLang = this.currentLang; // Expose globally for map popups

      try {
        // 1. Load UI labels and Content guides simultaneously
        const [uiRes, contentRes] = await Promise.all([
          fetch(`./locators/ui/${this.currentLang}.json`),
          fetch(`./locators/content/guides_${this.currentLang}.json`)
        ]);

        if (uiRes.ok) {
          this.translations = await uiRes.json();
        } else {
          console.warn(`Failed to load UI JSON for [${this.currentLang}]: Status ${uiRes.status}`);
        }

        if (contentRes.ok) {
          this.contentData = await contentRes.json();
          // Instantly trigger guide rendering with fetched content
          if (window.guideRenderer) {
            window.guideRenderer.render(this.contentData);
          }
        } else {
          console.warn(`Failed to load Content JSON for [${this.currentLang}]: Status ${contentRes.status}`);
        }

        // 2. Update static HTML elements with data-i18n attributes
        this.updateDOM();

        // 3. Re-render map shelter popups in new language if map exists
        if (window.evacuationMap && this.shelterData) {
          window.evacuationMap.renderShelters();
        }

      } catch (err) {
        console.error(`Error switching language to [${this.currentLang}]:`, err);
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
          window.evacuationMap.initMap('mapArea');
          window.evacuationMap.setShelterData(this.shelterData);
        }
      } catch (err) {
        console.error('Error fetching shelter dataset:', err);
      }
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

  // Auto-initialize default language and shelter data on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    if (window.i18n) {
      const savedLang = localStorage.getItem('app_lang') || 'en';
      window.i18n.setLanguage(savedLang);
      window.i18n.loadShelterData();
    }
  });
}