/**
 * I18n Manager
 * Handles dynamic fetching of localized JSON files, shelter data, and DOM updates.
 */
if (typeof window.I18n === 'undefined') {
  class I18n {
    constructor() {
      this.currentLang = 'en';
      this.translations = {};
      this.contentData = null;
      this.shelterData = null;
    }

    /**
     * Sets the current language and fetches matching JSON files.
     * @param {string} lang - Language code (e.g. 'en', 'zh', 'jp')
     */
    async setLanguage(lang) {
      this.currentLang = lang;
      window.currentLang = lang; // Expose globally for map.js popups

      try {
        // 1. Fetch UI labels (e.g. locators/ui/en.json)
        const uiRes = await fetch(`./locators/ui/${lang}.json`);
        if (uiRes.ok) {
          this.translations = await uiRes.json();
        } else {
          console.warn(`Failed to load UI JSON for [${lang}]: Status ${uiRes.status}`);
        }

        // 2. Fetch Content guides (e.g. locators/content/guides_en.json)
        const contentRes = await fetch(`./locators/content/guides_${lang}.json`);
        if (contentRes.ok) {
          this.contentData = await contentRes.json();
          if (window.guideRenderer) {
            window.guideRenderer.render();
          }
        } else {
          console.warn(`Failed to load Content JSON for [${lang}]: Status ${contentRes.status}`);
        }

        // 3. Update static HTML elements with data-i18n attributes
        this.updateDOM();

        // 4. Re-render dynamic guide cards if container exists
        const contentArea = document.getElementById('contentArea');
        if (window.guideRenderer && contentArea && contentArea.style.display !== 'none') {
          window.guideRenderer.render();
        }

        // 5. Re-render map shelter popups in the new language if map exists
        if (window.evacuationMap && this.shelterData) {
          window.evacuationMap.renderShelters();
        }

      } catch (err) {
        console.error(`Error switching language to [${lang}]:`, err);
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
          // Initialize map instance if needed and populate shelter layer
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
          return key; // Return raw key if translation missing
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
  window.i18n = new I18n();

  // Auto-initialize default language and shelter data on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    if (window.i18n) {
      window.i18n.setLanguage('en');
      window.i18n.loadShelterData();
    }
  });
}