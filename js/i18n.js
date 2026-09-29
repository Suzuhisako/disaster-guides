/* ==========================================================================
   i18n Manager Class
   - Handles multilingual UI & disaster guide switching (en, zh, jp)
   - Dynamic DOM updates for data-i18n attributes & prefecture dropdown
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

    // Attach click listeners to language switch buttons
    this.setupEventListeners();

    await this.setLanguage(initialLang);
  }

  /**
   * Binds click events to language toggle buttons
   */
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.lang-btn, [data-lang]');
      if (btn) {
        const targetLang = btn.getAttribute('data-lang');
        if (targetLang && targetLang !== this.currentLang) {
          this.setLanguage(targetLang);
        }
      }
    });
  }

  /**
   * Switches active language and re-renders UI + shelters map + disaster guides
   */
     async setLanguage(lang) {
     const targetLang = ['en', 'zh', 'jp'].includes(lang) ? lang : 'en';
   
     try {
       const uiUrl = `./locators/ui/${targetLang}.json`;
   
       // Fetch UI translations (EmergencyGuides handles its own guide JSON fetch)
       const uiRes = await fetch(uiUrl).catch(() => null);
   
       if (uiRes && uiRes.ok) {
         this.translations = await uiRes.json();
       } else {
         console.warn(`UI translation file missing for [${targetLang}] at ${uiUrl}`);
       }
   
       // Persist language state globally
       this.currentLang = targetLang;
       window.currentLang = targetLang;
       localStorage.setItem('app_lang', targetLang);
   
       // 1. Update static UI elements & dropdowns
       this.updateUI();
   
       // 2. Refresh active map markers/popups
       if (window.evacuationMap && typeof window.evacuationMap.renderShelters === 'function') {
         window.evacuationMap.renderShelters();
       }
   
       // 3. Delegation: Pass content path to EmergencyGuides instance
       const guidePath = `locators/content/guides_${targetLang}.json`;
   
       if (window.emergencyGuides && typeof window.emergencyGuides.setLanguage === 'function') {
         await window.emergencyGuides.setLanguage(guidePath);
       } else if (window.guideRenderer && typeof window.guideRenderer.setLanguage === 'function') {
         await window.guideRenderer.setLanguage(guidePath);
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
   * Dynamically updates the prefecture select dropdown option labels
   */
  updatePrefectureDropdown() {
    const select = document.getElementById('prefectureSelect');
    if (!select) return;

    const prefDict = this.t('prefectures');
    if (!prefDict || typeof prefDict !== 'object') return;

    Array.from(select.options).forEach((option) => {
      const slug = option.value;
      if (prefDict[slug]) {
        option.textContent = prefDict[slug];
      }
    });
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

    // Translate prefecture dropdown option labels
    this.updatePrefectureDropdown();

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
