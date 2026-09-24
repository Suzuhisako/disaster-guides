/**
 * I18n Manager
 * Handles dynamic fetching of localized JSON files and DOM updates.
 */
if (typeof window.I18n === 'undefined') {
  class I18n {
    constructor() {
      this.currentLang = 'en';
      this.translations = {};
      this.contentData = null;
    }

    /**
     * Sets the current language and fetches the matching JSON files.
     * @param {string} lang - Language code (e.g. 'en', 'zh')
     */
    async setLanguage(lang) {
      this.currentLang = lang;

      try {
        // 1. Fetch UI labels (locators/ui/en.json or locators/ui/zh.json)
        const uiRes = await fetch(`./locators/ui/${lang}.json`);
        if (uiRes.ok) {
          this.translations = await uiRes.json();
        } else {
          console.warn(`Failed to load UI JSON for [${lang}]: Status ${uiRes.status}`);
        }

        // 2. Fetch Content guides (locators/content/guides_en.json or locators/content/guides_zh.json)
        const contentRes = await fetch(`./locators/content/guides_${lang}.json`);
        if (contentRes.ok) {
          this.contentData = await contentRes.json();
          // Inside your i18n class after loading guides JSON:
          if (window.guideRenderer) {
            window.guideRenderer.render();
          }
        } else {
          console.warn(`Failed to load Content JSON for [${lang}]: Status ${contentRes.status}`);
        }

        // 3. Update static HTML elements with data-i18n attributes
        this.updateDOM();

        // 4. Re-render dynamic guide cards if guideRenderer exists and tab is active
        const contentArea = document.getElementById('contentArea');
        if (window.guideRenderer && contentArea && contentArea.style.display !== 'none') {
          window.guideRenderer.render();
        }

      } catch (err) {
        console.error(`Error switching language to [${lang}]:`, err);
      }
    }

    /**
     * Helper function to fetch nested translation keys (e.g., 'app.title' or 'labels.key_action')
     * @param {string} key - Dot-separated object path
     * @returns {string} - Translated value or fallback key
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
          // If element is a standard text container
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
}