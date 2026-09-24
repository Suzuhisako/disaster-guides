/**
 * GuideRenderer
 * Handles rendering disaster cards with embedded alarm players and audio synthesis.
 */
if (typeof window.GuideRenderer === 'undefined') {
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
     */
    render() {
      this.container = document.getElementById('contentArea');
      if (!this.container) return;

      // Clear existing content
      this.container.innerHTML = '';

      const data = window.i18n ? window.i18n.contentData : null;
      if (!data || !data.events || !Array.isArray(data.events)) {
        this.container.innerHTML = '<p class="error-msg">No guide data available.</p>';
        return;
      }

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
                🔊 ${window.i18n.t('labels.listen_sound') || 'Play Sound'}
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
            <strong>⚡ ${window.i18n.t('labels.key_action') || 'Key Action'}:</strong>
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
     * Synthesizes audio warning sounds directly via Web Audio API.
     * Works 100% offline without needing external .mp3 files.
     * @param {string} type - 'j_alert', 'tsunami_siren', or 'bousai_speaker'
     */
    playSynthesizedAlarm(type) {
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      if (type === 'j_alert') {
        // Emergency Earthquake Warning: Alternating dual-tone chime
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        // Chime frequencies
        osc1.frequency.setValueAtTime(880, now);        // A5
        osc1.frequency.setValueAtTime(660, now + 0.25);   // E5
        osc1.frequency.setValueAtTime(880, now + 0.5);    // A5

        osc2.frequency.setValueAtTime(1174.66, now);     // D6
        osc2.frequency.setValueAtTime(880, now + 0.25);   // A5
        osc2.frequency.setValueAtTime(1174.66, now + 0.5); // D6

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.9);
        osc2.stop(now + 0.9);

      } else if (type === 'tsunami_siren') {
        // Coastal Tsunami Siren: Long rising tone
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(750, now + 1.2);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 1.5);

      } else if (type === 'bousai_speaker') {
        // Municipal Broadcast Chime: High-low chime pattern
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);       // C5
        osc.frequency.setValueAtTime(659.25, now + 0.3); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.6); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.9);// C6

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 1.5);
      }
    }
  }

  window.GuideRenderer = GuideRenderer;
  window.guideRenderer = new GuideRenderer();
}

// Automatically trigger render when DOM is ready or language switches
document.addEventListener('DOMContentLoaded', () => {
  if (window.guideRenderer) {
    window.guideRenderer.render();
  }
});

// Re-render when i18n data loads or changes language
document.addEventListener('languageChanged', () => {
  if (window.guideRenderer) {
    window.guideRenderer.render();
  }
});


  
