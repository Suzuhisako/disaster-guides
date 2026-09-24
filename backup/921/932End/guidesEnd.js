/* ==========================================================================
   Action Guides Renderer & Audio Synthesizer
   ========================================================================== */
class GuideRenderer {
  constructor() {
    this.container = document.getElementById('contentArea');
    this.audioCtx = null;
  }

  /**
   * Initializes or resumes the Web Audio API context.
   * Browsers require a user gesture (e.g. button click) to start audio.
   */
  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Main render function that populates the #contentArea container.
   * @param {Object} [passedData] Optional direct data object passed from i18n loader
   */
  render(passedData) {
    this.container = document.getElementById('contentArea');
    if (!this.container) return;

    // Resolve data directly from arguments or global i18n state
    const data = passedData || (window.i18n ? window.i18n.contentData : null);

    // Show a neutral loading indicator instead of immediate error while waiting for fetch
    if (!data || !data.events || !Array.isArray(data.events)) {
      this.container.innerHTML = `
        <div class="loading-box" style="text-align: center; padding: 2rem; color: #64748b;">
          <p style="margin: 0;">Loading Action Guides...</p>
        </div>
      `;
      return;
    }

    // Clear existing content
    this.container.innerHTML = '';

    const section = document.createElement('section');
    section.className = 'guide-list';

    data.events.forEach(item => {
      const card = document.createElement('article');
      card.className = 'guide-card';

      // 1. Build Alarm Header Block (if sound exists for this event)
      let alarmBlockHTML = '';
      if (item.alarm) {
        alarmBlockHTML = `
          <div class="alarm-banner">
            <div class="alarm-info">
              <span class="alarm-title">🔊 ${item.alarm.title}</span>
              <p class="jp-phrase">${item.alarm.jp_phrase}</p>
              <p class="alarm-meaning">${item.alarm.meaning}</p>
            </div>
            <button type="button" class="btn-play-alarm" data-sound="${item.alarm.sound_id}">
              🔊 ${(window.i18n && window.i18n.t) ? window.i18n.t('labels.listen_sound') : 'Play Sound'}
            </button>
          </div>
        `;
      }

      // 2. Build Action Steps List
      const stepsList = (item.steps || [])
        .map(step => `<li>${step}</li>`)
        .join('');

      // 3. Assemble Card HTML
      card.innerHTML = `
        <div class="guide-header">
          <span class="guide-icon" aria-hidden="true">${item.icon || '⚠️'}</span>
          <h2>${item.title}</h2>
        </div>

        ${alarmBlockHTML}

        <div class="immediate-box">
          <strong>⚡ ${(window.i18n && window.i18n.t) ? window.i18n.t('labels.key_action') : 'Key Action'}:</strong>
          <p>${item.immediate_action}</p>
        </div>

        <ul class="steps-list">
          ${stepsList}
        </ul>
      `;

      // Attach Audio Event Listener if alarm button exists
      if (item.alarm) {
        const playBtn = card.querySelector('.btn-play-alarm');
        if (playBtn) {
          playBtn.addEventListener('click', () => {
            this.initAudio();
            this.playSynthesizedAlarm(item.alarm.sound_id);
          });
        }
      }

      section.appendChild(card);
    });

    this.container.appendChild(section);
  }

  /**
   * Synthesizes emergency warning alarms using Web Audio API
   */
  playSynthesizedAlarm(soundId) {
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    if (soundId === 'earthquake_j_alert') {
      // Dual-tone J-Alert style sweep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // Default warning beep
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }
}

// Instantiate globally
if (typeof window !== 'undefined') {
  window.GuideRenderer = GuideRenderer;
  window.guideRenderer = new GuideRenderer();
}