/**
   * Synthesizes distinct emergency warning alarms using Web Audio API (~6-second duration)
   * @param {string} soundId - 'earthquake_j_alert', 'tsunami_siren', or 'town_broadcast'
   */
  playSynthesizedAlarm(soundId) {
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;

    if (soundId === 'earthquake_j_alert') {
      // -------------------------------------------------------------
      // 1. Earthquake Early Warning: Distinctive 3-Tone Chime Pattern ("Ponyon")
      // Tone triad: 440Hz -> 554.37Hz -> 659.25Hz
      // -------------------------------------------------------------
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
      // -------------------------------------------------------------
      // 2. Tsunami Warning: Coastal Undulating Pitch Siren
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
      // 3. Town Broadcast / Evacuation Radio: Municipal Outdoor Speaker Chime
      // Classic Westminster-style 4-tone sequence: Do - Mi - Sol - Do (High)
      // -------------------------------------------------------------
      const chimeNotes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const repeatCount = 3;

      for (let i = 0; i < repeatCount; i++) {
        const sequenceStart = now + (i * 2.0);

        chimeNotes.forEach((freq, index) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const noteStart = sequenceStart + (index * 0.4);

          osc.type = 'sine'; // Soft, warm chime bell sound
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
