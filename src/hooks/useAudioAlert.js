import { useState, useEffect, useRef, useCallback } from 'react';

export const useAudioAlert = () => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('menuflow_sound_enabled') !== 'false';
  });
  const audioRef = useRef(null);

  useEffect(() => {
    // Preload audio
    try {
      const audio = new Audio('/sounds/new-order.mp3');
      audio.preload = 'auto';
      audioRef.current = audio;
    } catch (err) {
      console.warn('Audio element initialization error:', err);
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('menuflow_sound_enabled', String(next));
      return next;
    });
  }, []);

  // Web Audio chime synthesizer fallback
  const playSynthesizedChime = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const playTone = (freq, time, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

        gain.gain.setValueAtTime(0.3, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + duration);
      };

      // Play pleasant multi-tone chime (C5 -> E5 -> G5)
      playTone(523.25, 0, 0.25);
      playTone(659.25, 0.12, 0.25);
      playTone(783.99, 0.24, 0.45);
    } catch (err) {
      console.warn('Web Audio synthesis error:', err);
    }
  }, []);

  const playAlert = useCallback(() => {
    if (!soundEnabled) return;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn('Audio play error, falling back to Web Audio:', err.message);
        playSynthesizedChime();
      });
    } else {
      playSynthesizedChime();
    }
  }, [soundEnabled, playSynthesizedChime]);

  return {
    soundEnabled,
    toggleSound,
    playAlert,
  };
};

export default useAudioAlert;
