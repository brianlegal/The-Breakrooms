/**
 * Hybrid AI Music & Multi-Layer Sound Engine for Backrooms Wall Breaker 3D
 * ("Liminal Arcade Smashcore" Aesthetic).
 *
 * Features:
 * - 6 Seamless AI Background Music (BGM) tracks generated with Google DeepMind Lyria RealTime (`bgm_*.wav`)
 *   with automatic equal-power crossfading across Lobby, Level 0, Poolrooms, Pipe Dreams, Hospital Boss & Jackpot Vault.
 * - Dynamic Interactive Mixing: Low-pass filter ducking on Pause/Modals, tempo/pitch urgency under 5s,
 *   and automatic sidechain-style BGM ducking on major stingers.
 * - 4 AI Musical Stingers (Lyria RealTime) + 4 AI Arcade Announcer Callouts (Gemini TTS).
 * - 30 High-Definition Multi-Layer Foley & Physical-Modeling WAV SFX (`sfx_*.wav`, `ui_*.wav`) with
 *   anti-machine-gun pitch/pan randomization, Coin-Streak pentatonic pitch escalator, Biome-reactive footsteps,
 *   Wall-material-aware impacts, and instant procedural fallback before async buffer decode completes.
 */

export type MusicTrackId =
  | 'lobby'
  | 'level0'
  | 'poolrooms'
  | 'pipedreams'
  | 'hospital'
  | 'jackpot';

export type SfxId =
  | 'ui_click'
  | 'ui_hover'
  | 'ui_modal_open'
  | 'ui_modal_close'
  | 'ui_upgrade_buy'
  | 'ui_error'
  | 'ui_wheel_tick'
  | 'ui_skin_equip'
  | 'sfx_punch_whoosh'
  | 'sfx_punch_impact'
  | 'sfx_concrete_hit'
  | 'sfx_concrete_break'
  | 'sfx_hit_drywall'
  | 'sfx_hit_reinforced'
  | 'sfx_hit_golden'
  | 'sfx_wall_collapse'
  | 'sfx_tile_shatter'
  | 'sfx_clang_indestructible'
  | 'sfx_electric_shock'
  | 'sfx_meteor_fury'
  | 'sfx_super_smash'
  | 'sfx_rage_ready'
  | 'sfx_step_carpet'
  | 'sfx_step_water'
  | 'sfx_step_metal'
  | 'sfx_jump'
  | 'sfx_land'
  | 'sfx_dash'
  | 'sfx_ball_pickup'
  | 'sfx_ball_throw'
  | 'sfx_ball_bounce'
  | 'sfx_coin_pickup'
  | 'sfx_coin_drop'
  | 'sfx_powerup_water'
  | 'sfx_powerup_mega'
  | 'sfx_powerup_gold'
  | 'sfx_entity_build'
  | 'sfx_entity_hit'
  | 'sfx_entity_death'
  | 'sfx_timer_urgent'
  | 'stinger_room_clear'
  | 'stinger_boss_alert'
  | 'stinger_jackpot_win'
  | 'stinger_game_over'
  | 'vox_super_smash'
  | 'vox_jackpot'
  | 'vox_boss_ko'
  | 'vox_rebirth';

export type SoundCategory =
  | 'PUNCH_SWING'
  | 'PUNCH_IMPACT'
  | 'MATERIAL_IMPACT'
  | 'WALL_COLLAPSE'
  | 'COIN_PICKUP'
  | 'COIN_DROP'
  | 'DEFAULT';

export const CATEGORY_COOLDOWNS: Record<SoundCategory, number> = {
  PUNCH_SWING: 85,
  PUNCH_IMPACT: 75,
  MATERIAL_IMPACT: 75,
  WALL_COLLAPSE: 35,
  COIN_PICKUP: 70,
  COIN_DROP: 80,
  DEFAULT: 20,
};

const SFX_CATEGORY_MAP: Partial<Record<SfxId, SoundCategory>> = {
  sfx_punch_whoosh: 'PUNCH_SWING',
  sfx_punch_impact: 'PUNCH_IMPACT',
  sfx_hit_drywall: 'MATERIAL_IMPACT',
  sfx_hit_reinforced: 'MATERIAL_IMPACT',
  sfx_hit_golden: 'MATERIAL_IMPACT',
  sfx_concrete_hit: 'MATERIAL_IMPACT',
  sfx_wall_collapse: 'WALL_COLLAPSE',
  sfx_concrete_break: 'WALL_COLLAPSE',
  sfx_tile_shatter: 'WALL_COLLAPSE',
  sfx_coin_pickup: 'COIN_PICKUP',
  sfx_coin_drop: 'COIN_DROP',
};

const BGM_URLS: Record<MusicTrackId, string> = {
  lobby: './audio/bgm/bgm_lobby.wav',
  level0: './audio/bgm/bgm_level0.wav',
  poolrooms: './audio/bgm/bgm_poolrooms.wav',
  pipedreams: './audio/bgm/bgm_pipedreams.wav',
  hospital: './audio/bgm/bgm_hospital.wav',
  jackpot: './audio/bgm/bgm_jackpot.wav',
};

const ALL_SFX_IDS: SfxId[] = [
  'ui_click',
  'ui_hover',
  'ui_modal_open',
  'ui_modal_close',
  'ui_upgrade_buy',
  'ui_error',
  'ui_wheel_tick',
  'ui_skin_equip',
  'sfx_punch_whoosh',
  'sfx_punch_impact',
  'sfx_concrete_hit',
  'sfx_concrete_break',
  'sfx_hit_drywall',
  'sfx_hit_reinforced',
  'sfx_hit_golden',
  'sfx_wall_collapse',
  'sfx_tile_shatter',
  'sfx_clang_indestructible',
  'sfx_electric_shock',
  'sfx_meteor_fury',
  'sfx_super_smash',
  'sfx_rage_ready',
  'sfx_step_carpet',
  'sfx_step_water',
  'sfx_step_metal',
  'sfx_jump',
  'sfx_land',
  'sfx_dash',
  'sfx_ball_pickup',
  'sfx_ball_throw',
  'sfx_ball_bounce',
  'sfx_coin_pickup',
  'sfx_coin_drop',
  'sfx_powerup_water',
  'sfx_powerup_mega',
  'sfx_powerup_gold',
  'sfx_entity_build',
  'sfx_entity_hit',
  'sfx_entity_death',
  'sfx_timer_urgent',
  'stinger_room_clear',
  'stinger_boss_alert',
  'stinger_jackpot_win',
  'stinger_game_over',
  'vox_super_smash',
  'vox_jackpot',
  'vox_boss_ko',
  'vox_rebirth',
];

interface ActiveVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  startTime: number;
}

interface ActiveBgmChannel {
  trackId: MusicTrackId;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private bgmBusGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private sfxBusGain: GainNode | null = null;

  // Subtle liminal Backrooms fluorescent hum layer underneath BGM
  private humGain: GainNode | null = null;
  private humOsc1: OscillatorNode | null = null;
  private humOsc2: OscillatorNode | null = null;

  private isMuted = false;
  private isInitialized = false;
  private isAdActive = false;
  private preloadStarted = false;

  // Buffer caches
  private sfxBuffers = new Map<SfxId, AudioBuffer>();
  private bgmBuffers = new Map<MusicTrackId, AudioBuffer>();
  private bgmLoading = new Map<MusicTrackId, Promise<AudioBuffer | null>>();

  // BGM State
  private desiredTrack: MusicTrackId = 'lobby';
  private activeBgm: ActiveBgmChannel | null = null;
  private isMuffled = false;
  private isUrgent = false;

  // Throttle & streak state
  private lastPlayedAt = new Map<string, number>();
  private coinStreakCount = 0;
  private lastCoinTime = 0;
  private lastVoiceTime = 0;

  // 5-Tier Audio Anti-Spam state
  private activeVoices = new Map<SoundCategory, ActiveVoice[]>();
  private categoryLastTrigger = new Map<SoundCategory, number>();
  private categoryBurstCount = new Map<SoundCategory, number>();
  private categoryLastBurstTime = new Map<SoundCategory, number>();

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) {
          this.ctx.suspend().catch(() => {});
        } else if (!this.isAdActive && !this.isMuted) {
          this.ctx.resume().catch(() => {});
        }
      });

      window.addEventListener('blur', () => {
        if (this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
      });

      window.addEventListener('focus', () => {
        if (this.ctx && !document.hidden && !this.isAdActive && !this.isMuted) {
          this.ctx.resume().catch(() => {});
        }
      });

      // Unlock AudioContext on first pointer/key gesture anywhere in the window
      const unlockOnce = () => {
        this.init();
      };
      window.addEventListener('pointerdown', unlockOnce, { once: true, passive: true });
      window.addEventListener('keydown', unlockOnce, { once: true, passive: true });
    }
  }

  public init() {
    if (this.isAdActive || (typeof document !== 'undefined' && document.hidden)) return;
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended' && !this.isMuted) {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.isInitialized = true;

      // Master Mastering Chain: MasterGain -> Compressor -> Destination
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-10, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.16, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.92, this.ctx.currentTime);

      // BGM Sub-bus with Interactive Low-Pass Filter
      this.bgmFilter = this.ctx.createBiquadFilter();
      this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.setValueAtTime(18000, this.ctx.currentTime);
      this.bgmFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

      this.bgmBusGain = this.ctx.createGain();
      this.bgmBusGain.gain.setValueAtTime(0.60, this.ctx.currentTime);

      // SFX Sub-bus
      this.sfxBusGain = this.ctx.createGain();
      this.sfxBusGain.gain.setValueAtTime(0.50, this.ctx.currentTime);

      this.bgmBusGain.connect(this.bgmFilter);
      this.bgmFilter.connect(this.masterGain);
      this.sfxBusGain.connect(this.masterGain);
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.startFluorescentHum();
      this.preloadAudioAssets();
      this.ensureDesiredBgmPlaying();
    } catch {
      console.warn('Web Audio not supported');
    }
  }

  private preloadAudioAssets() {
    if (this.preloadStarted || !this.ctx) return;
    this.preloadStarted = true;

    // Preload all crisp SFX buffers immediately (cache-busted so updated WAVs always load fresh)
    for (const id of ALL_SFX_IDS) {
      fetch(`./audio/sfx/${id}.wav?v=4`, { cache: 'no-cache' })
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('404'))))
        .then((ab) => this.ctx!.decodeAudioData(ab))
        .then((decoded) => {
          this.sfxBuffers.set(id, decoded);
        })
        .catch(() => {
          // Graceful procedural fallback remains active
        });
    }

    // Priority preload Lobby & Level 0 BGM, then prefetch remaining biomes seamlessly
    void this.loadBgmBuffer('lobby').then(() => {
      this.ensureDesiredBgmPlaying();
      void this.loadBgmBuffer('level0');
      setTimeout(() => {
        void this.loadBgmBuffer('poolrooms');
        void this.loadBgmBuffer('pipedreams');
        void this.loadBgmBuffer('hospital');
        void this.loadBgmBuffer('jackpot');
      }, 1200);
    });
  }

  private loadBgmBuffer(trackId: MusicTrackId): Promise<AudioBuffer | null> {
    if (this.bgmBuffers.has(trackId)) {
      return Promise.resolve(this.bgmBuffers.get(trackId)!);
    }
    if (this.bgmLoading.has(trackId)) {
      return this.bgmLoading.get(trackId)!;
    }
    if (!this.ctx) return Promise.resolve(null);

    const p = fetch(`${BGM_URLS[trackId]}?v=4`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('404'))))
      .then((ab) => this.ctx!.decodeAudioData(ab))
      .then((buf) => {
        this.bgmBuffers.set(trackId, buf);
        return buf;
      })
      .catch(() => null)
      .finally(() => {
        this.bgmLoading.delete(trackId);
      });

    this.bgmLoading.set(trackId, p);
    return p;
  }

  /**
   * Synchronizes the AI Background Music track & interactive filter with the live game state!
   */
  public setMusicContext(
    mode: 'lobby' | 'playing' | 'paused' | 'revive' | 'gameover',
    biome = 'level0',
    isJackpot = false,
    isModalOpen = false
  ) {
    let nextTrack: MusicTrackId = 'lobby';
    if (mode === 'lobby' || mode === 'gameover') {
      nextTrack = 'lobby';
    } else if (isJackpot) {
      nextTrack = 'jackpot';
    } else if (biome === 'poolrooms') {
      nextTrack = 'poolrooms';
    } else if (biome === 'pipedreams') {
      nextTrack = 'pipedreams';
    } else if (biome === 'hospital') {
      nextTrack = 'hospital';
    } else {
      nextTrack = 'level0';
    }

    const shouldMuffle = mode === 'paused' || mode === 'revive' || (mode === 'lobby' && isModalOpen);
    if (this.isMuffled !== shouldMuffle) {
      this.isMuffled = shouldMuffle;
      this.applyBgmFilterState();
    }

    if (this.desiredTrack !== nextTrack) {
      this.desiredTrack = nextTrack;
      this.ensureDesiredBgmPlaying();
    } else if (!this.activeBgm && this.isInitialized) {
      this.ensureDesiredBgmPlaying();
    }
  }

  public setUrgencyMode(urgent: boolean) {
    if (this.isUrgent === urgent) return;
    this.isUrgent = urgent;
    if (this.ctx && this.activeBgm) {
      const rate = urgent ? 1.045 : 1.0;
      this.activeBgm.source.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.25);
    }
  }

  private applyBgmFilterState() {
    if (!this.ctx || !this.bgmFilter || !this.bgmBusGain) return;
    const now = this.ctx.currentTime;
    const cutoff = this.isMuffled ? 1450 : 18500;
    const busVol = this.isMuffled ? 0.38 : 0.60;
    this.bgmFilter.frequency.setTargetAtTime(cutoff, now, 0.14);
    this.bgmBusGain.gain.setTargetAtTime(busVol, now, 0.14);
  }

  private duckBgm(durationSec = 0.75, duckedGain = 0.12) {
    if (!this.ctx || !this.bgmBusGain) return;
    const now = this.ctx.currentTime;
    const restoreVol = this.isMuffled ? 0.38 : 0.60;
    this.bgmBusGain.gain.cancelScheduledValues(now);
    this.bgmBusGain.gain.setTargetAtTime(duckedGain, now, 0.03);
    this.bgmBusGain.gain.setTargetAtTime(restoreVol, now + durationSec, 0.25);
  }

  private ensureDesiredBgmPlaying() {
    if (!this.ctx || !this.bgmBusGain) return;
    const target = this.desiredTrack;
    if (this.activeBgm && this.activeBgm.trackId === target) return;

    const buf = this.bgmBuffers.get(target);
    if (!buf) {
      void this.loadBgmBuffer(target).then((loaded) => {
        if (loaded && this.desiredTrack === target) {
          this.crossfadeToBuffer(target, loaded);
        }
      });
      return;
    }
    this.crossfadeToBuffer(target, buf);
  }

  private crossfadeToBuffer(trackId: MusicTrackId, buffer: AudioBuffer) {
    if (!this.ctx || !this.bgmBusGain) return;
    if (this.activeBgm && this.activeBgm.trackId === trackId) return;

    const now = this.ctx.currentTime;
    const fadeDur = 0.75;

    // Fade out previous BGM channel smoothly
    if (this.activeBgm) {
      const prev = this.activeBgm;
      try {
        prev.gain.gain.cancelScheduledValues(now);
        prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
        prev.gain.gain.linearRampToValueAtTime(0.0001, now + fadeDur);
        prev.source.stop(now + fadeDur + 0.05);
      } catch {
        // ignore stopped source
      }
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.playbackRate.setValueAtTime(this.isUrgent && trackId !== 'lobby' ? 1.045 : 1.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(1.0, now + fadeDur);

    src.connect(gain);
    gain.connect(this.bgmBusGain);
    src.start(now);

    this.activeBgm = { trackId, source: src, gain };
  }

  public suspendForAd() {
    this.isAdActive = true;
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public resumeAfterAd() {
    this.isAdActive = false;
    if (this.ctx && !document.hidden && !this.isMuted) {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.92, this.ctx.currentTime, 0.04);
    }
    if (this.humGain && this.ctx) {
      this.humGain.gain.setTargetAtTime(muted ? 0 : 0.018, this.ctx.currentTime, 0.08);
    }
    if (this.ctx) {
      if (muted) {
        this.ctx.suspend().catch(() => {});
      } else if (!document.hidden && !this.isAdActive) {
        this.ctx.resume().catch(() => {});
      }
    }
  }

  public toggleMute(): boolean {
    this.init();
    this.setMuted(!this.isMuted);
    if (!this.isMuted) {
      this.playUiClick();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Core sample player with 5-tier anti-spam controller:
   * 1. Category-specific cooldowns (85ms swing, 75ms impact, 100ms collapse, 70ms coin pickup, 80ms coin drop)
   * 2. Strict polyphony limiter (max 2 active voices per category) with smooth 15ms zero-crossing fade stealing
   * 3. Rapid burst gain decay curve (1.0 -> 0.82 -> 0.68 -> 0.55) within 280ms window
   * 4. Stochastic dynamic pitch variation (±12% to ±16%) on rapid triggers to eliminate monotony & machine-gun effect
   * 5. Stereo panning & procedural fallback dispatch
   */
  private playSample(
    id: SfxId,
    options: {
      volume?: number;
      rate?: number;
      rateJitter?: number;
      panJitter?: number;
      minIntervalMs?: number;
      category?: SoundCategory;
    } = {}
  ): boolean {
    if (this.isMuted || this.isAdActive) return false;
    this.init();
    if (!this.ctx || !this.sfxBusGain) return false;

    const category: SoundCategory = options.category ?? SFX_CATEGORY_MAP[id] ?? 'DEFAULT';
    const nowMs = performance.now();

    // Tier 1: Category & ID Cooldown Check
    const catCooldown = CATEGORY_COOLDOWNS[category] ?? 20;
    const minInterval = options.minIntervalMs !== undefined
      ? Math.max(options.minIntervalMs, catCooldown)
      : catCooldown;

    const idThrottled = this.lastPlayedAt.has(id) && (nowMs - (this.lastPlayedAt.get(id) ?? 0) < minInterval);
    const catThrottled = this.categoryLastTrigger.has(category) && (nowMs - (this.categoryLastTrigger.get(category) ?? 0) < minInterval);
    if (idThrottled || catThrottled) {
      return true; // Throttled cleanly to prevent stacking
    }
    this.lastPlayedAt.set(id, nowMs);
    this.categoryLastTrigger.set(category, nowMs);

    // Tier 3: Burst Gain Decay Curve (1.0 -> 0.82 -> 0.68 -> 0.55 within 280ms)
    const lastBurst = this.categoryLastBurstTime.get(category) ?? 0;
    let burstCount = 0;
    if (nowMs - lastBurst < 280) {
      burstCount = Math.min(3, (this.categoryBurstCount.get(category) ?? 0) + 1);
    } else {
      burstCount = 0;
    }
    this.categoryBurstCount.set(category, burstCount);
    this.categoryLastBurstTime.set(category, nowMs);

    const BURST_DECAY = [1.0, 0.82, 0.68, 0.55];
    const burstDecay = BURST_DECAY[burstCount] ?? 0.55;

    const buf = this.sfxBuffers.get(id);
    if (!buf) {
      this.playProceduralFallback(id);
      return false;
    }

    const nowSec = this.ctx.currentTime;

    // Tier 2: Strict Polyphony Limiter (Max 2 concurrent voices per category) with 15ms Fade-Out Stealing
    if (category !== 'DEFAULT') {
      let voiceList = this.activeVoices.get(category);
      if (!voiceList) {
        voiceList = [];
        this.activeVoices.set(category, voiceList);
      }

      // Evict ended or stale voices (older than 1.5s)
      for (let i = voiceList.length - 1; i >= 0; i--) {
        if (nowSec >= voiceList[i].startTime + 1.5) {
          voiceList.splice(i, 1);
        }
      }

      // Max 2 active voices: steal oldest voice with smooth 15ms zero-crossing fade-out
      while (voiceList.length >= 2) {
        const oldest = voiceList.shift();
        if (oldest) {
          try {
            oldest.gain.gain.cancelScheduledValues(nowSec);
            oldest.gain.gain.setValueAtTime(oldest.gain.gain.value, nowSec);
            oldest.gain.gain.linearRampToValueAtTime(0.0001, nowSec + 0.015);
            oldest.source.stop(nowSec + 0.016);
          } catch {
            // ignore if already stopped
          }
        }
      }
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    // Tier 4: Stochastic Dynamic Pitch Variation (±12% to ±16%) on rapid triggers
    const baseRate = options.rate ?? 1.0;
    let jitter = 0;
    if (burstCount > 0 || (options.rateJitter && options.rateJitter >= 0.06)) {
      const jitterMagnitude = 0.12 + Math.random() * 0.04;
      jitter = (Math.random() * 2 - 1) * jitterMagnitude;
    } else if (options.rateJitter) {
      jitter = (Math.random() * 2 - 1) * options.rateJitter;
    }
    src.playbackRate.value = Math.max(0.45, Math.min(2.4, baseRate * (1 + jitter)));

    const baseVol = Math.max(0.01, Math.min(1.6, options.volume ?? 0.85));
    const effectiveVol = baseVol * burstDecay;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(effectiveVol, nowSec);

    if (options.panJitter && typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.8, Math.min(0.8, (Math.random() * 2 - 1) * options.panJitter));
      src.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxBusGain);
    } else {
      src.connect(gain);
      gain.connect(this.sfxBusGain);
    }

    if (category !== 'DEFAULT') {
      const voiceRecord: ActiveVoice = { source: src, gain, startTime: nowSec };
      const voiceList = this.activeVoices.get(category)!;
      voiceList.push(voiceRecord);
      src.onended = () => {
        const idx = voiceList.indexOf(voiceRecord);
        if (idx !== -1) voiceList.splice(idx, 1);
      };
    }

    src.start(nowSec);
    return true;
  }

  /**
   * Subtle 60Hz + 120Hz liminal Backrooms fluorescent hum layer underneath BGM.
   */
  private startFluorescentHum() {
    if (!this.ctx || !this.masterGain || this.humGain) return;
    try {
      this.humGain = this.ctx.createGain();
      this.humGain.gain.setValueAtTime(this.isMuted ? 0 : 0.018, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, this.ctx.currentTime);

      this.humOsc1 = this.ctx.createOscillator();
      this.humOsc1.type = 'sawtooth';
      this.humOsc1.frequency.setValueAtTime(60, this.ctx.currentTime);

      this.humOsc2 = this.ctx.createOscillator();
      this.humOsc2.type = 'sine';
      this.humOsc2.frequency.setValueAtTime(120, this.ctx.currentTime);

      this.humOsc1.connect(filter);
      this.humOsc2.connect(filter);
      filter.connect(this.humGain);
      this.humGain.connect(this.masterGain);

      this.humOsc1.start();
      this.humOsc2.start();
    } catch {
      // ignore
    }
  }

  // =========================================================================
  // UI & CARTOON MENU INTERACTIONS
  // =========================================================================

  public playUiClick() {
    if (!this.playSample('ui_click', { volume: 0.72, rateJitter: 0.04, minIntervalMs: 30 })) {
      this.fallbackTone(640, 920, 0.06, 0.18);
    }
  }

  public playUiHover() {
    this.playSample('ui_hover', { volume: 0.32, rateJitter: 0.05, minIntervalMs: 45 });
  }

  public playModalOpen() {
    if (!this.playSample('ui_modal_open', { volume: 0.72, rateJitter: 0.03, minIntervalMs: 60 })) {
      this.fallbackTone(340, 760, 0.14, 0.2);
    }
  }

  public playModalClose() {
    if (!this.playSample('ui_modal_close', { volume: 0.68, rateJitter: 0.03, minIntervalMs: 60 })) {
      this.fallbackTone(640, 260, 0.12, 0.18);
    }
  }

  public playUpgradeBuy() {
    if (!this.playSample('ui_upgrade_buy', { volume: 0.85, rateJitter: 0.03, minIntervalMs: 50 })) {
      this.playPowerup('generic');
    }
  }

  public playUiError() {
    if (!this.playSample('ui_error', { volume: 0.72, minIntervalMs: 80 })) {
      this.fallbackTone(180, 130, 0.18, 0.22);
    }
  }

  public playWheelTick(pitch = 1.0) {
    this.playSample('ui_wheel_tick', { volume: 0.68, rate: pitch, minIntervalMs: 28 });
  }

  public playSkinEquip() {
    if (!this.playSample('ui_skin_equip', { volume: 0.82, rateJitter: 0.03, minIntervalMs: 60 })) {
      this.playUiClick();
    }
  }

  // =========================================================================
  // BOXING COMBAT, WALL MATERIALS & DESTRUCTION
  // =========================================================================

  public playWhoosh(pitchMultiplier = 1.0) {
    if (
      !this.playSample('sfx_punch_whoosh', {
        volume: 0.64,
        rate: pitchMultiplier,
        rateJitter: 0.06,
        panJitter: 0.2,
        minIntervalMs: 85,
        category: 'PUNCH_SWING',
      })
    ) {
      this.fallbackTone(720 * pitchMultiplier, 190 * pitchMultiplier, 0.12, 0.2);
    }
  }

  public playPunchImpact(intensity = 1.0, variant = 'normal', biome = 'level0') {
    const isConcrete = biome === 'pipedreams' || variant === 'reinforced' || variant === 'concrete';
    const vol = Math.min(1.15, 0.72 + (intensity - 1) * 0.2);

    // 1. Tactile boxing glove punch impact layer
    this.playSample('sfx_punch_impact', {
      volume: Math.min(0.95, 0.68 + (intensity - 1) * 0.15),
      rate: 1.0 + Math.min(0.15, (intensity - 1) * 0.05),
      rateJitter: 0.08,
      panJitter: 0.15,
      minIntervalMs: 75,
      category: 'PUNCH_IMPACT',
    });

    // 2. Wall material acoustic impact layer
    const id: SfxId =
      variant === 'golden'
        ? 'sfx_hit_golden'
        : isConcrete
        ? 'sfx_concrete_hit'
        : 'sfx_hit_drywall';

    if (
      !this.playSample(id, {
        volume: vol,
        rate: 0.96 + Math.min(0.18, (intensity - 1) * 0.08),
        rateJitter: 0.06,
        panJitter: 0.18,
        minIntervalMs: 75,
        category: 'MATERIAL_IMPACT',
      })
    ) {
      if (isConcrete) {
        this.fallbackTone(440, 85, 0.18, 0.38);
      } else {
        this.fallbackTone(150, 36, 0.16, 0.45);
      }
    }
  }

  public playPunchSound(intensity = 1.0) {
    this.playSample('sfx_punch_impact', {
      volume: Math.min(0.95, 0.68 + (intensity - 1) * 0.15),
      rateJitter: 0.08,
      panJitter: 0.15,
      minIntervalMs: 75,
      category: 'PUNCH_IMPACT',
    });
  }

  public playWallCollapse(isSpecial = false, biome = 'level0', isConcrete = false) {
    const concreteWall = isConcrete || biome === 'pipedreams';

    if (concreteWall) {
      if (
        !this.playSample('sfx_concrete_break', {
          volume: 0.94,
          rateJitter: 0.08,
          panJitter: 0.25,
          minIntervalMs: 35,
          category: 'WALL_COLLAPSE',
        })
      ) {
        this.playConcreteBreakProcedural();
      }
    } else {
      if (
        !this.playSample('sfx_wall_collapse', {
          volume: 0.92,
          rateJitter: 0.07,
          panJitter: 0.25,
          minIntervalMs: 35,
          category: 'WALL_COLLAPSE',
        })
      ) {
        this.playConcreteBreakProcedural();
      }
    }

    if (biome === 'poolrooms') {
      this.playSample('sfx_tile_shatter', {
        volume: 0.68,
        rateJitter: 0.08,
        panJitter: 0.3,
        minIntervalMs: 100,
        category: 'DEFAULT',
      });
    }

    if (isSpecial) {
      setTimeout(() => {
        this.playSample('sfx_hit_golden', {
          volume: 0.65,
          rate: 1.12,
          minIntervalMs: 80,
          category: 'MATERIAL_IMPACT',
        });
      }, 55);
    }
  }

  public playSuperSmash() {
    this.duckBgm(0.95, 0.12);
    this.playSample('sfx_super_smash', { volume: 1.05, minIntervalMs: 120 });
    this.playSample('sfx_wall_collapse', { volume: 0.82, rate: 0.88, minIntervalMs: 60, category: 'DEFAULT' });
    this.playAnnouncerVoice('vox_super_smash', 0.88);
  }

  public playRageReady() {
    this.playSample('sfx_rage_ready', { volume: 0.85, minIntervalMs: 400 });
  }

  public playMetallicClang() {
    if (
      !this.playSample('sfx_clang_indestructible', {
        volume: 0.84,
        rateJitter: 0.05,
        panJitter: 0.15,
        minIntervalMs: 45,
      })
    ) {
      this.fallbackTone(820, 310, 0.22, 0.35);
    }
  }

  public playElectricShock() {
    this.playSample('sfx_electric_shock', {
      volume: 0.92,
      rateJitter: 0.05,
      minIntervalMs: 60,
    });
  }

  public playWindSlash() {
    this.playSample('sfx_meteor_fury', {
      volume: 0.86,
      rateJitter: 0.06,
      panJitter: 0.16,
      minIntervalMs: 45,
    });
  }

  // =========================================================================
  // BIOME-REACTIVE MOVEMENT & KINEMATICS
  // =========================================================================

  public playFootstep(biome = 'level0') {
    const id: SfxId =
      biome === 'poolrooms'
        ? 'sfx_step_water'
        : biome === 'pipedreams' || biome === 'hospital'
        ? 'sfx_step_metal'
        : 'sfx_step_carpet';

    this.playSample(id, {
      volume: biome === 'poolrooms' ? 0.50 : 0.44,
      rateJitter: 0.09,
      panJitter: 0.22,
      minIntervalMs: 90,
    });
  }

  public playJump() {
    this.playSample('sfx_jump', { volume: 0.72, rateJitter: 0.05, minIntervalMs: 80 });
  }

  public playLand() {
    this.playSample('sfx_land', { volume: 0.62, rateJitter: 0.07, minIntervalMs: 90 });
  }

  public playDash() {
    this.playSample('sfx_dash', { volume: 0.84, rateJitter: 0.05, minIntervalMs: 80 });
  }

  // =========================================================================
  // BALL PHYSICS, COINS, POWER-UPS, ENTITIES & STINGERS
  // =========================================================================

  public playBallPickup() {
    this.playSample('sfx_ball_pickup', { volume: 0.80, rateJitter: 0.04, minIntervalMs: 60 });
  }

  public playBallThrow() {
    this.playSample('sfx_ball_throw', { volume: 0.86, rateJitter: 0.05, minIntervalMs: 50 });
  }

  public playBallBounce(pitchMultiplier = 1.0) {
    this.playSample('sfx_ball_bounce', {
      volume: 0.78,
      rate: pitchMultiplier,
      rateJitter: 0.04,
      panJitter: 0.25,
      minIntervalMs: 32,
    });
  }

  public playCoinDrop() {
    this.playSample('sfx_coin_drop', {
      volume: 0.52,
      rateJitter: 0.08,
      panJitter: 0.25,
      minIntervalMs: 80,
      category: 'COIN_DROP',
    });
  }

  public playCoinPickup() {
    const now = performance.now();
    if (now - this.lastCoinTime < 650) {
      this.coinStreakCount = Math.min(10, this.coinStreakCount + 1);
    } else {
      this.coinStreakCount = 0;
    }
    this.lastCoinTime = now;

    // Calibrated micro-tonal streak step +0.02 with max pitch 1.14x (anti-fatigue curve)
    const streakPitch = Math.min(1.14, 1.0 + this.coinStreakCount * 0.02);
    this.playSample('sfx_coin_pickup', {
      volume: 0.28,
      rate: streakPitch,
      panJitter: 0.16,
      minIntervalMs: 70,
      category: 'COIN_PICKUP',
    });
  }

  public playPowerup(kind: 'mega_gloves' | 'almond_water' | 'golden_fists' | 'generic' = 'generic') {
    const id: SfxId =
      kind === 'almond_water'
        ? 'sfx_powerup_water'
        : kind === 'mega_gloves'
        ? 'sfx_powerup_mega'
        : kind === 'golden_fists'
        ? 'sfx_powerup_gold'
        : 'ui_upgrade_buy';
    this.playSample(id, { volume: 0.86, rateJitter: 0.03, minIntervalMs: 60 });
  }

  public playWin() {
    this.duckBgm(1.1, 0.14);
    if (!this.playSample('stinger_room_clear', { volume: 0.88, minIntervalMs: 250 })) {
      this.fallbackTone(523.25, 1046.5, 0.3, 0.25);
    }
  }

  public playBossAlert() {
    this.duckBgm(1.2, 0.14);
    this.playSample('stinger_boss_alert', { volume: 0.92, minIntervalMs: 500 });
  }

  public playJackpotWin() {
    this.duckBgm(1.3, 0.12);
    this.playSample('stinger_jackpot_win', { volume: 0.92, minIntervalMs: 300 });
    this.playAnnouncerVoice('vox_jackpot', 0.90);
  }

  public playRebirth() {
    this.duckBgm(1.4, 0.12);
    this.playSample('stinger_jackpot_win', { volume: 0.90, rate: 0.92, minIntervalMs: 300 });
    this.playAnnouncerVoice('vox_rebirth', 0.92);
  }

  public playGameOver() {
    this.duckBgm(1.4, 0.10);
    this.playSample('stinger_game_over', { volume: 0.86, minIntervalMs: 400 });
  }

  public playTimerUrgent(secondsLeft: number) {
    const pitch = secondsLeft <= 2 ? 1.24 : secondsLeft <= 3 ? 1.12 : 1.0;
    this.playSample('sfx_timer_urgent', { volume: 0.72, rate: pitch, minIntervalMs: 250 });
  }

  public playEntityBuild() {
    this.playSample('sfx_entity_build', {
      volume: 0.78,
      rateJitter: 0.06,
      panJitter: 0.3,
      minIntervalMs: 90,
    });
  }

  public playEntityHit() {
    this.playSample('sfx_entity_hit', {
      volume: 0.88,
      rateJitter: 0.06,
      panJitter: 0.2,
      minIntervalMs: 35,
    });
  }

  public playEntityDeath(isBoss = false) {
    this.playSample('sfx_entity_death', {
      volume: isBoss ? 1.05 : 0.90,
      rate: isBoss ? 0.82 : 1.0,
      minIntervalMs: 80,
    });
    this.playSample('sfx_wall_collapse', { volume: 0.75, rate: 1.08, minIntervalMs: 50 });
    if (isBoss) {
      this.duckBgm(1.2, 0.12);
      this.playAnnouncerVoice('vox_boss_ko', 0.95);
    }
  }

  private playAnnouncerVoice(id: SfxId, volume = 0.88) {
    const now = performance.now();
    if (now - this.lastVoiceTime < 1400) return; // Avoid overlapping announcer lines
    this.lastVoiceTime = now;
    this.playSample(id, { volume, minIntervalMs: 500 });
  }

  public fallbackTone(fStart: number, fEnd: number, dur: number, gainVal: number) {
    if (!this.ctx || !this.sfxBusGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(fStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), now + dur);
    g.gain.setValueAtTime(gainVal, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + dur);
  }

  private playConcreteBreakProcedural() {
    if (!this.ctx || !this.sfxBusGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Layer 1: Low-frequency structural impact punch (130 Hz -> 38 Hz exponential drop)
    try {
      const punchOsc = this.ctx.createOscillator();
      const punchGain = this.ctx.createGain();
      punchOsc.type = 'triangle';
      punchOsc.frequency.setValueAtTime(130, now);
      punchOsc.frequency.exponentialRampToValueAtTime(38, now + 0.22);
      punchGain.gain.setValueAtTime(0.55, now);
      punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      punchOsc.connect(punchGain);
      punchGain.connect(this.sfxBusGain);
      punchOsc.start(now);
      punchOsc.stop(now + 0.26);
    } catch {
      // ignore if unsupported in test sandbox
    }

    // Layer 2: Resonant mineral crunch & crumbling noise
    try {
      if (typeof this.ctx.createBuffer === 'function') {
        const sampleRate = this.ctx.sampleRate || 44100;
        const dur = 0.45;
        const frameCount = Math.floor(sampleRate * dur);
        const noiseBuf = this.ctx.createBuffer(1, frameCount, sampleRate);
        const data = noiseBuf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < frameCount; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + white * 0.0990460;
          b1 = 0.96300 * b1 + white * 0.2965164;
          b2 = 0.57000 * b2 + white * 1.0526913;
          const pink = b0 + b1 + b2 + white * 0.1848;
          const t = i / frameCount;
          const env = Math.exp(-t * 6.5) * (1 - Math.exp(-t * 80));
          data[i] = Math.max(-1, Math.min(1, pink * 0.15 * env));
        }

        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1600, now);
        filter.frequency.exponentialRampToValueAtTime(750, now + dur);
        filter.Q.setValueAtTime(2.2, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.65, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noiseSrc.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxBusGain);
        noiseSrc.start(now);
        noiseSrc.stop(now + dur);
      } else {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
        g.gain.setValueAtTime(0.35, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(g);
        g.connect(this.sfxBusGain);
        osc.start(now);
        osc.stop(now + 0.36);
      }
    } catch {
      // ignore if unsupported in test sandbox
    }
  }

  private playProceduralFallback(id: SfxId) {
    if (!this.ctx || !this.sfxBusGain || this.isMuted) return;
    if (id === 'sfx_punch_impact') {
      this.fallbackTone(165, 42, 0.14, 0.35);
    } else if (id === 'sfx_concrete_hit') {
      this.fallbackTone(440, 85, 0.18, 0.38);
    } else if (id === 'sfx_concrete_break') {
      this.playConcreteBreakProcedural();
    } else if (id === 'sfx_hit_drywall') {
      this.fallbackTone(150, 36, 0.16, 0.45);
    } else if (id === 'sfx_hit_reinforced') {
      this.fallbackTone(520, 110, 0.20, 0.35);
    } else if (id === 'sfx_hit_golden') {
      this.fallbackTone(880, 440, 0.25, 0.30);
    } else if (id === 'sfx_wall_collapse') {
      this.playConcreteBreakProcedural();
    }
  }
}

export const soundManager = new SoundSynthesizer();
