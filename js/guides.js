/* ==========================================================================
   Action Guides Renderer & Audio Synthesizer
   ========================================================================== */
class GuideRenderer {
  constructor() {
    this.container = document.getElementById('contentArea');
    this.audioCtx = null;
    this.activeOscillators = []; // Tracks playing audio nodes to allow stopping
    this.currentlyPlayingId = null;
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

    // Show a neutral loading indicator while waiting for fetch
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
            this.toggleAlarm(item.alarm.sound_id, playBtn);
          });
        }
      }

      section.appendChild(card);
    });

    this.container.appendChild(section);
  }

  /**
   * Stops any currently playing audio and resets all alarm button labels.
   */
  stopAllAudio() {
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    this.activeOscillators = [];
    this.currentlyPlayingId = null;

    // Reset button states
    document.querySelectorAll('.btn-play-alarm').forEach(btn => {
      btn.textContent = `🔊 ${(window.i18n && window.i18n.t) ? window.i18n.t('labels.listen_sound') : 'Play Sound'}`;
      btn.classList.remove('playing');
    });
  }

  /**
   * Toggles alarm playback on/off.
   */
  toggleAlarm(soundId, btnElement) {
    if (this.currentlyPlayingId === soundId) {
      this.stopAllAudio();
      return;
    }

    this.stopAllAudio();
    this.currentlyPlayingId = soundId;
    btnElement.textContent = '⏹️ Stop Sound';
    btnElement.classList.add('playing');

    this.playSynthesizedAlarm(soundId);
  }

  /**
   * Synthesizes distinct emergency warning alarms using Web Audio API (~6-second duration)
   * @param {string} soundId - 'earthquake_j_alert', 'tsunami_siren', or 'town_broadcast'
   */
  playSynthesizedAlarm(soundId) {
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;

    if (soundId === 'earthquake_j_alert') {
      // 1. Earthquake Early Warning: Repeating 3-Tone Chime Pattern ("Ponyon")
      const triad = [440, 554.37, 659.25];
      const repeatCount = 8; // ~6 seconds

      for (let i = 0; i < repeatCount; i++) {
        const cycleStart = now + (i * 0.75);

        triad.forEach((freq, index) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const noteStart = cycleStart + (index * 0.18);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteStart);

          gain.gain.setValueAtTime(0.01, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.35, noteStart + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.16);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(noteStart);
          osc.stop(noteStart + 0.17);
          this.activeOscillators.push(osc);
        });
      }

    } else if (soundId === 'tsunami_siren') {
      // 2. Tsunami Warning: Coastal Undulating Pitch Siren
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      const duration = 6;

      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(800, now + 1.0);
      osc.frequency.linearRampToValueAtTime(400, now + 2.0);
      osc.frequency.linearRampToValueAtTime(800, now + 3.0);
      osc.frequency.linearRampToValueAtTime(400, now + 4.0);
      osc.frequency.linearRampToValueAtTime(800, now + 5.0);
      osc.frequency.linearRampToValueAtTime(400, now + 6.0);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration);
      this.activeOscillators.push(osc);

    } else {
      // 3. Town Broadcast / Evacuation Radio: Municipal Outdoor Speaker Chime
      // Classic 4-tone bell chime sequence: C5 -> E5 -> G5 -> C6
      const chimeNotes = [523.25, 659.25, 783.99, 1046.50];
      const repeatCount = 3;

      for (let i = 0; i < repeatCount; i++) {
        const sequenceStart = now + (i * 2.0);

        chimeNotes.forEach((freq, index) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const noteStart = sequenceStart + (index * 0.4);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteStart);

          gain.gain.setValueAtTime(0.01, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.3, noteStart + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.38);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(noteStart);
          osc.stop(noteStart + 0.39);
          this.activeOscillators.push(osc);
        });
      }
    }

    // Auto-reset button state after playback
    setTimeout(() => {
      this.stopAllAudio();
    }, 6200);
  }
}

// Instantiate globally
if (typeof window !== 'undefined') {
  window.GuideRenderer = GuideRenderer;
  window.guideRenderer = new GuideRenderer();
}
