/* ==========================================================================
   i18n Manager Class
   - Handles multilingual UI & disaster guide switching (en, zh, jp)
   - Dynamic DOM updates for data-i18n attributes
   ========================================================================== */

class I18nManager {
  constructor() {
    this.currentLang = 'en';
    this.translations = {};
    this.guideData = null;
    this.shelterData = null;
  }

  /**
   * Initializes language based on saved preference or browser settings
   */
  async init() {
    const savedLang = localStorage.getItem('app_lang');
    const browserLang = navigator.language ? navigator.language.slice(0, 2) : 'en';
    
    let initialLang = savedLang || browserLang;
    if (!['en', 'zh', 'jp'].includes(initialLang)) {
      initialLang = 'en';
    }

    await this.setLanguage(initialLang);
  }

  /**
   * Switches active language and re-renders UI + shelters map
   */
  async setLanguage(lang) {
    const targetLang = ['en', 'zh', 'jp'].includes(lang) ? lang : 'en';

    try {
      const uiUrl = `./locators/ui/${targetLang}.json`;
      const guideUrl = `./locators/content/guides_${targetLang}.json`;

      const [uiRes, guideRes] = await Promise.all([
        fetch(uiUrl),
        fetch(guideUrl)
      ]);

      if (!uiRes.ok) throw new Error(`HTTP status ${uiRes.status} loading ${uiUrl}`);
      if (!guideRes.ok) throw new Error(`HTTP status ${guideRes.status} loading ${guideUrl}`);

      const uiText = await uiRes.text();
      const guideText = await guideRes.text();

      this.translations = JSON.parse(uiText);
      this.guideData = JSON.parse(guideText);

      this.currentLang = targetLang;
      window.currentLang = targetLang;
      localStorage.setItem('app_lang', targetLang);

      // 1. Update text elements across the page
      this.updateUI();

      // 2. Re-render shelter map layer if map instance exists
      if (window.evacuationMap) {
        window.evacuationMap.renderShelters();
      }

      // 3. Re-render disaster guide cards if guide manager exists
      if (window.guideManager && typeof window.guideManager.renderGuides === 'function') {
        window.guideManager.renderGuides(this.guideData);
      }

    } catch (error) {
      console.error(`Error switching language to [${targetLang}]:`, error);
    }
  }

  /**
   * Resolves nested translation keys (e.g., "alarms.earthquake_early.title")
   */
  t(key) {
    if (!key) return '';
    const keys = key.split('.');
    let value = this.translations;

    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        return key; // Fallback to key string if translation missing
      }
    }
    return value;
  }

  /**
   * Scans DOM for elements with [data-i18n] and updates their inner text or attributes
   */
  updateUI() {
    // Translate text content
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const translatedValue = this.t(key);
      if (translatedValue && typeof translatedValue === 'string') {
        el.textContent = translatedValue;
      }
    });

    // Translate input placeholders
    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translatedValue = this.t(key);
      if (translatedValue && typeof translatedValue === 'string') {
        el.placeholder = translatedValue;
      }
    });

    // Highlight active language button in UI
    const langBtns = document.querySelectorAll('.lang-btn, [data-lang]');
    langBtns.forEach((btn) => {
      const btnLang = btn.getAttribute('data-lang');
      if (btnLang === this.currentLang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}

// Global instance setup
window.i18n = new I18nManager();

document.addEventListener('DOMContentLoaded', () => {
  window.i18n.init();
});
