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
   * @param {string} soundId - 'earthquake_j_alert', 'tsunami_siren', 'town_broadcast', or 'evacuation_chime'
   */
  playSynthesizedAlarm(soundId) {
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;

    if (soundId === 'earthquake_j_alert' || soundId === 'earthquake') {
      // -------------------------------------------------------------
      // 1. Japanese EEW (緊急地震速報): Authentic 3-Chord Alternating Triad
      // Alternates between C5-E5-G5 and A4-C#5-E5 with crisp square/sine overlay
      // -------------------------------------------------------------
      const chord1 = [523.25, 659.25, 783.99]; // C5, E5, G5
      const chord2 = [440.00, 554.37, 659.25]; // A4, C#5, E5
      const totalRounds = 6; // ~6 seconds

      for (let r = 0; r < totalRounds; r++) {
        const roundStart = now + (r * 0.95);
        
        // Play Chord 1
        chord1.forEach(freq => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, roundStart);
          gain.gain.setValueAtTime(0.2, roundStart);
          gain.gain.exponentialRampToValueAtTime(0.001, roundStart + 0.4);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(roundStart);
          osc.stop(roundStart + 0.4);
          this.activeOscillators.push(osc);
        });

        // Play Chord 2
        chord2.forEach(freq => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, roundStart + 0.45);
          gain.gain.setValueAtTime(0.2, roundStart + 0.45);
          gain.gain.exponentialRampToValueAtTime(0.001, roundStart + 0.85);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(roundStart + 0.45);
          osc.stop(roundStart + 0.85);
          this.activeOscillators.push(osc);
        });
      }

    } else if (soundId === 'town_broadcast' || soundId === 'evacuation_chime') {
      // -------------------------------------------------------------
      // 2. Municipal Outdoor Broadcast (防災行政無線): 4-Note Loudspeaker Chime
      // High-pitched, warm Westminster-style bell sequence (A4 -> C#5 -> E5 -> A5)
      // -------------------------------------------------------------
      const bellNotes = [440.00, 554.37, 659.25, 880.00]; // Do - Mi - Sol - Do
      const repeatCount = 3;

      for (let i = 0; i < repeatCount; i++) {
        const sequenceStart = now + (i * 2.0);

        bellNotes.forEach((freq, index) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const noteStart = sequenceStart + (index * 0.42);

          osc.type = 'sine'; // Pure bell tone
          osc.frequency.setValueAtTime(freq, noteStart);

          // Smooth bell decay envelope
          gain.gain.setValueAtTime(0.01, noteStart);
          gain.gain.linearRampToValueAtTime(0.35, noteStart + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.8);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(noteStart);
          osc.stop(noteStart + 0.82);
          this.activeOscillators.push(osc);
        });
      }

    } else if (soundId === 'tsunami_siren') {
      // -------------------------------------------------------------
      // 3. Tsunami Coastal Siren: Undulating Long Pitch Wave
      // -------------------------------------------------------------
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
      // -------------------------------------------------------------
      // 4. Default Emergency Beep (Fallback)
      // -------------------------------------------------------------
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 2.0);
      this.activeOscillators.push(osc);
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
