/**
 * Emergency Guides Module
 * Renders disaster preparation/response guide content and phonetic sound descriptions.
 */
class EmergencyGuides {
  constructor(containerId, contentPath) {
    this.container = document.getElementById(containerId);
    this.contentPath = contentPath || 'locators/content/guides_en.json';
    this.guidesData = [];
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
    if (this.contentPath === newContentPath) return;
    this.contentPath = newContentPath;
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
          <strong>📢 ${this.escapeHtml(guide.alarm.title || 'Alert Identifier')}</strong>
        </div>
        ${guide.alarm.jp_phrase ? `
          <div class="alarm-jp-phrase">
            <span>Japanese Phrase:</span> <code>${this.escapeHtml(guide.alarm.jp_phrase)}</code>
          </div>
        ` : ''}
        ${alarmDesc ? `
          <p class="alarm-description">
            <strong>Detail:</strong> ${this.escapeHtml(alarmDesc)}
          </p>
        ` : ''}
      </div>
    ` : '';

    const immediateAction = guide.immediate_action ? `
      <div class="guide-immediate-action">
        <strong>⚡ Immediate Action:</strong> ${this.escapeHtml(guide.immediate_action)}
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
            <h4>Action Steps:</h4>
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
