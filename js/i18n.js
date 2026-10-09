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
   * Initializes language based on URL query parameters, saved preference, or browser settings
   */
  async init() {
    const supportedLangs = ['en', 'zh', 'zh-TW', 'ja', 'vi', 'ko', 'tl', 'pt', 'es', 'th'];

    // 1. Extract ?lang= parameter from URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');

    // Normalize URL language string if present
    let formattedUrlLang = null;
    if (urlLang) {
      const lower = urlLang.toLowerCase();
      if (lower === 'zh-tw' || lower === 'zh_tw') {
        formattedUrlLang = 'zh-TW';
      } else {
        formattedUrlLang = lower.slice(0, 2);
      }
    }

    const savedLang = localStorage.getItem('app_lang');
    const browserLang = navigator.language ? navigator.language.slice(0, 2) : 'en';

    // 2. Precedence: URL parameter > Saved preference > Browser language > Fallback 'en'
    let initialLang = formattedUrlLang || savedLang || browserLang;

    if (!supportedLangs.includes(initialLang)) {
      initialLang = 'en';
    }

    // Attach click listeners to language switch buttons
    this.setupEventListeners();

    await this.setLanguage(initialLang);

    // Signal that i18n is initialized and ready
    document.body.classList.add('i18n-ready');
  }

  /**
   * Switches active language and re-renders UI + shelters map + disaster guides
   */
   async setLanguage(lang) {
     const targetLang = ['en', 'zh', 'zh-TW', 'ja', 'vi', 'ko', 'tl', 'pt', 'es', 'th'].includes(lang) ? lang : 'en';
   
     try {
       const cleanLang = (targetLang || 'ja').toLowerCase();
       const uiUrl = `./locators/ui/${cleanLang}.json`;
   
       // 1. Fetch UI translations
       const uiRes = await fetch(uiUrl).catch(() => null);
   
       if (uiRes && uiRes.ok) {
         this.translations = await uiRes.json();
       } else {
         console.warn(`UI translation file missing for [${targetLang}] at ${uiUrl}`);
       }
   
       // 2. Persist language state globally
       this.currentLang = targetLang;
       window.currentLang = targetLang;
       localStorage.setItem('app_lang', targetLang);
   
       // 3. Delegation: Pass content path to EmergencyGuides instance and wait for card rendering
       const guidePath = `locators/content/guides_${targetLang}.json`;        
   
       if (window.emergencyGuides && typeof window.emergencyGuides.setLanguage === 'function') {
         await window.emergencyGuides.setLanguage(guidePath);
       } else if (window.guideRenderer && typeof window.guideRenderer.setLanguage === 'function') {
         await window.guideRenderer.setLanguage(guidePath);
       }
   
       // 4. Update all static & dynamic DOM elements with data-i18n attributes
       this.updateUI();
   
       // 5. Refresh active map markers/popups now that translations and language state are completely ready
       if (window.evacuationMap && typeof window.evacuationMap.renderShelters === 'function') {
         window.evacuationMap.renderShelters();
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
