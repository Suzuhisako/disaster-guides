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

      // Extract array whether it's wrapped in { events: [...] } or top-level [...]
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
   * Gets localized UI labels via window.i18n or language fallback
   */
  getLabels() {
    const lang = (window.i18n && window.i18n.currentLang) || 'en';
    const labels = {
      en: {
        jpPhrase: 'Japanese Phrase:',
        detail: 'Detail:',
        immediateAction: '⚡ Immediate Action:',
        actionSteps: 'Action Steps:',
        alertIdentifier: 'Alert Identifier'
      },
      zh: {
        jpPhrase: '日文短语：',
        detail: '详细信息：',
        immediateAction: '⚡ 紧急应对：',
        actionSteps: '应对步骤：',
        alertIdentifier: '警报标识'
      },
      ja: {
        jpPhrase: '日本語フレーズ:',
        detail: '詳細:',
        immediateAction: '⚡ 緊急行動:',
        actionSteps: '行動手順:',
        alertIdentifier: '警報識別'
      },
      vi: {
        jpPhrase: 'Cụm từ tiếng Nhật:',
        detail: 'Chi tiết:',
        immediateAction: '⚡ Hành động khẩn cấp:',
        actionSteps: 'Các bước thực hiện:',
        alertIdentifier: 'Tên cảnh báo'
      },
      ko: {
        jpPhrase: '일본어 표현:',
        detail: '상세 내용:',
        immediateAction: '⚡ 긴급 대응:',
        actionSteps: '대피 및 행동 절차:',
        alertIdentifier: '경보 식별'
      },
      tl: {
        jpPhrase: 'Pariralang Hapon:',
        detail: 'Mga Detalye:',
        immediateAction: '⚡ Agarang Aksyon:',
        actionSteps: 'Mga Hakbang sa Pag-iingat:',
        alertIdentifier: 'Pagtukoy ng Babala'
      },
      pt: {
        jpPhrase: 'Frase em japonês:',
        detail: 'Detalhes:',
        immediateAction: '⚡ Ação Imediata:',
        actionSteps: 'Passos de Ação:',
        alertIdentifier: 'Identificador do alerta'
      },     
      'zh-TW': {
        jpPhrase: '日文短語：',
        detail: '詳細資訊：',
        immediateAction: '⚡ 緊急應對：',
        actionSteps: '應對步驟：',
        alertIdentifier: '警報識別'
      },
      es: {
        jpPhrase: 'Frase en japonés:',
        detail: 'Detalles:',
        immediateAction: '⚡ Acción Inmediata:',
        actionSteps: 'Pasos a seguir:',
        alertIdentifier: 'Identificador de alerta'
      },
      th: {
        jpPhrase: 'ประโยคภาษาญี่ปุ่น:',
        detail: 'รายละเอียด:',
        immediateAction: '⚡ การปฏิบัติทันที:',
        actionSteps: 'ขั้นตอนการปฏิบัติ:',
        alertIdentifier: 'รหัสการแจ้งเตือน'
      }
    };

    return labels[lang] || labels.en;
  }

  /**
   * Creates markup for an individual disaster guide card
   */
  createGuideCard(guide) {
    const labels = this.getLabels();
    const iconSpan = guide.icon ? `<span class="guide-icon">${guide.icon}</span> ` : '';

    // 1. Contextual Cell Broadcast Note (For Earthquake)
    const cellBroadcastNote = guide.show_cell_broadcast_note ? `
      <div class="cell-broadcast-box">
        <span class="broadcast-icon">📲</span>
        <p class="broadcast-text" data-i18n="emergency_contacts.cell_broadcast_note"></p>
      </div>
    ` : '';
  
    // 2. Contextual Emergency Dialer Banner (For Heatstroke)
    const emergencyDialer = guide.show_emergency_dialer ? `
      <div class="emergency-call-banner">
        <p class="banner-text" data-i18n="emergency_contacts.severe_warning"></p>
        <div class="banner-buttons">
          <a href="tel:119" class="btn-emergency btn-119">
            <span class="icon-badge">📞</span>
            <span data-i18n="emergency_contacts.call_119">119</span>
          </a>
          <a href="tel:110" class="btn-emergency btn-110">
            <span class="icon-badge">📞</span>
            <span data-i18n="emergency_contacts.call_110">110</span>
          </a>
        </div>
      </div>
    ` : '';

    // Support sound_description, meaning, or direct fallback
    const alarmDesc = guide.alarm
      ? (guide.alarm.sound_description || guide.alarm.meaning || '')
      : '';

    const alarmSection = guide.alarm ? `
      <div class="guide-alarm-box">
        <div class="alarm-header">
          <strong>📢 ${this.escapeHtml(guide.alarm.title || labels.alertIdentifier)}</strong>
        </div>
        ${guide.alarm.jp_phrase ? `
          <div class="alarm-jp-phrase">
            <span>${labels.jpPhrase}</span> <code>${this.escapeHtml(guide.alarm.jp_phrase)}</code>
          </div>
        ` : ''}
        ${alarmDesc ? `
          <p class="alarm-description">
            <strong>${labels.detail}</strong>${this.escapeHtml(alarmDesc)}
          </p>
        ` : ''}
      </div>
    ` : '';

    const immediateAction = guide.immediate_action ? `
      <div class="guide-immediate-action">
        <strong>${labels.immediateAction}</strong> ${this.escapeHtml(guide.immediate_action)}
      </div>
    ` : '';

    const stepsList = (guide.steps || []).map(step => `
      <li>${this.escapeHtml(step)}</li>
    `).join('');

    return `
      <article class="guide-card" id="guide-${this.escapeHtml(guide.id)}">
        <h3 class="guide-title">${iconSpan}${this.escapeHtml(guide.title)}</h3>

        <!-- Injected contextually right below the title -->
        ${cellBroadcastNote}
        ${emergencyDialer}
        
        ${immediateAction}
        ${alarmSection}
        ${stepsList ? `
          <div class="guide-steps">
            <h4>${labels.actionSteps}</h4>
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
    if (!this.container) return;
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

// Global & Module Export Setup
window.EmergencyGuides = EmergencyGuides;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmergencyGuides;
}
