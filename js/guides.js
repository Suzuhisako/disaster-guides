/**
 * Emergency Guides Module
 * Renders disaster preparation/response guide content and phonetic sound descriptions.
 */
class EmergencyGuides {
  constructor(containerId, contentPath) {
    this.container = document.getElementById(containerId);
    this.contentPath = this.normalizePath(contentPath || 'locators/content/guides_en.json');
    this.guidesData = [];
    
    // UI Label Translations matching current language
    this.labels = this.getLabelsForPath(this.contentPath);
  }

  /**
   * Normalizes path format to ensure reliable comparison
   */
  normalizePath(path) {
    if (!path) return 'locators/content/guides_en.json';
    return path.replace(/^\.\//, '');
  }

  /**
   * Returns localized card headers based on current file path
   */
  getLabelsForPath(path) {
    if (path.includes('_zh')) {
      return {
        alertTitle: '警报标识',
        jpPhrase: '日语短语:',
        detail: '详情:',
        immediateAction: '⚡ 立即采取动作:',
        actionSteps: '应对步骤:'
      };
    } else if (path.includes('_jp')) {
      return {
        alertTitle: '警報識別',
        jpPhrase: '日本語フレーズ:',
        detail: '詳細:',
        immediateAction: '⚡ 緊急行動:',
        actionSteps: '行動手順:'
      };
    }
    // Default English
    return {
      alertTitle: 'Alert Identifier',
      jpPhrase: 'Japanese Phrase:',
      detail: 'Detail:',
      immediateAction: '⚡ Immediate Action:',
      actionSteps: 'Action Steps:'
    };
  }

  /**
   * Initializes the module by fetching JSON guide content and rendering to DOM
   */
  async init() {
    if (!this.container) {
      console.warn('EmergencyGuides: Container element not found in DOM.');
      return;
    }

    try {
      const response = await fetch(this.contentPath);
      if (!response.ok) {
        throw new Error(`Failed to load guide data: ${response.status}`);
      }
      const data = await response.json();
      
      // Extract the array whether it's wrapped in { events: [...] } or top-level [...]
      this.guidesData = Array.isArray(data) ? data : (data.events || []);
      
      this.render();
    } catch (error) {
      console.error('Error initializing Emergency Guides:', error);
      this.renderError();
    }
  }

  /**
   * Updates content path and re-initializes view (for language switching)
   */
  async setLanguage(newContentPath) {
    const normalized = this.normalizePath(newContentPath);
    
    // Always update labels and re-fetch when setLanguage is explicitly called
    this.contentPath = normalized;
    this.labels = this.getLabelsForPath(normalized);
    await this.init();
  }

  /**
   * Renders the emergency guides into the container
   */
  render() {
    if (!this.guidesData || this.guidesData.length === 0) {
      this.renderError();
      return;
    }

    const html = this.guidesData.map(guide => this.createGuideCard(guide)).join('');
    this.container.innerHTML = `<div class="guides-grid">${html}</div>`;
  }

  /**
   * Creates markup for an individual disaster guide card
   */
  createGuideCard(guide) {
    const iconSpan = guide.icon ? `<span class="guide-icon">${guide.icon}</span> ` : '';
    
    // Support both sound_description and meaning fields
    const alarmDesc = guide.alarm 
      ? (guide.alarm.sound_description || guide.alarm.meaning || '')
      : '';

    const alarmSection = guide.alarm ? `
      <div class="guide-alarm-box">
        <div class="alarm-header">
          <strong>📢 ${this.escapeHtml(guide.alarm.title || this.labels.alertTitle)}</strong>
        </div>
        ${guide.alarm.jp_phrase ? `
          <div class="alarm-jp-phrase">
            <span>${this.labels.jpPhrase}</span> <code>${this.escapeHtml(guide.alarm.jp_phrase)}</code>
          </div>
        ` : ''}
        ${alarmDesc ? `
          <p class="alarm-description">
            <strong>${this.labels.detail}</strong>${this.escapeHtml(alarmDesc)}
          </p>
        ` : ''}
      </div>
    ` : '';

    const immediateAction = guide.immediate_action ? `
      <div class="guide-immediate-action">
        <strong>${this.labels.immediateAction}</strong> ${this.escapeHtml(guide.immediate_action)}
      </div>
    ` : '';

    const stepsList = (guide.steps || []).map(step => `
      <li>${this.escapeHtml(step)}</li>
    `).join('');

    return `
      <article class="guide-card" id="guide-${this.escapeHtml(guide.id)}">
        <h3 class="guide-title">${iconSpan}${this.escapeHtml(guide.title)}</h3>
        ${immediateAction}
        ${alarmSection}
        ${stepsList ? `
          <div class="guide-steps">
            <h4>${this.labels.actionSteps}</h4>
            <ol>${stepsList}</ol>
          </div>
        ` : ''}
      </article>
    `;
  }

  /**
   * Renders fallback UI in case of data fetching errors
   */
  renderError() {
    this.container.innerHTML = `
      <div class="guides-error">
        <p>Unable to load emergency guides at this time. Please check your connection.</p>
      </div>
    `;
  }

  /**
   * Helper to sanitize text content for safe rendering
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Export for module or global use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmergencyGuides;
}
