// Web Audio API 기반 효과음 생성기 (외부 오디오 파일 없이 100% 무결점 재생)
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, startTime = 0, gainVal = 0.2) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  // 버튼 클릭음
  playClick() {
    this.playTone(600, 'sine', 0.05, 0, 0.15);
  }

  // 정답 딩동댕!
  playCorrect() {
    this.playTone(523.25, 'triangle', 0.15, 0.0, 0.25); // C5 (도)
    this.playTone(659.25, 'triangle', 0.15, 0.1, 0.25); // E5 (미)
    this.playTone(783.99, 'triangle', 0.25, 0.2, 0.3);  // G5 (솔)
    this.playTone(1046.50, 'sine', 0.35, 0.32, 0.25);   // C6 (높은 도)
  }

  // 오답 띠로리~
  playWrong() {
    this.playTone(330, 'sawtooth', 0.2, 0.0, 0.15);
    this.playTone(260, 'sawtooth', 0.35, 0.18, 0.18);
  }

  // 영토 점령 팡파르!
  playConquer() {
    const notes = [
      { f: 523.25, t: 0.0, d: 0.12 }, // 도
      { f: 523.25, t: 0.12, d: 0.12 },// 도
      { f: 523.25, t: 0.24, d: 0.12 },// 도
      { f: 659.25, t: 0.38, d: 0.2 }, // 미
      { f: 783.99, t: 0.58, d: 0.2 }, // 솔
      { f: 1046.50, t: 0.8, d: 0.45 } // 높은도
    ];
    notes.forEach(n => this.playTone(n.f, 'triangle', n.d, n.t, 0.25));
  }

  // 방어막(실드) 강화 사운드
  playShield() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // 주파수가 올라가는 신비로운 실드음
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // 연속 콤보 사운드 (구구땅 스타일 고에너지 아르페지오)
  playCombo(comboCount = 2) {
    if (this.muted) return;
    const baseFreq = 440; // A4
    const semitones = [0, 4, 7, 12, 16]; // 메이저 아르페지오
    const step = Math.min(comboCount - 1, semitones.length - 1);
    const freq = baseFreq * Math.pow(2, semitones[step] / 12);

    this.playTone(freq, 'triangle', 0.12, 0.0, 0.22);
    this.playTone(freq * 1.25, 'sine', 0.2, 0.08, 0.25);
  }

  // [시즌 보스 레이드] 보스 출현 포효 사운드
  playBossRoar() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // 웅장한 저음 신스 스윕
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.8);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.9);

    // 보조 진동음
    setTimeout(() => {
      this.playTone(180, 'triangle', 0.5, 0, 0.2);
    }, 200);
  }

  // [시즌 보스 레이드] 보스 타격 피격 사운드
  playBossHit(isCrit = false) {
    if (this.muted) return;
    if (isCrit) {
      // 크리티컬 히트 (강렬한 타격음)
      this.playTone(320, 'sawtooth', 0.18, 0, 0.3);
      this.playTone(640, 'triangle', 0.25, 0.04, 0.35);
      this.playTone(960, 'sine', 0.3, 0.08, 0.25);
    } else {
      // 일반 타격음
      this.playTone(260, 'sawtooth', 0.15, 0, 0.25);
      this.playTone(520, 'triangle', 0.18, 0.03, 0.2);
    }
  }

  // [시즌 보스 레이드] 보스 토벌 승리 팡파르 사운드
  playBossVictory() {
    if (this.muted) return;
    const notes = [
      { f: 523.25, t: 0.0, d: 0.15 },  // C5
      { f: 659.25, t: 0.15, d: 0.15 }, // E5
      { f: 783.99, t: 0.3, d: 0.18 },  // G5
      { f: 1046.50, t: 0.48, d: 0.25 },// C6
      { f: 783.99, t: 0.75, d: 0.15 }, // G5
      { f: 1046.50, t: 0.92, d: 0.6 }  // 높은 C6 길게
    ];
    notes.forEach(n => this.playTone(n.f, 'triangle', n.d, n.t, 0.3));
  }

  // [보스 영토 침식] 땅을 빼앗길 때 지진/경보음
  playBossInvasion() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // 묵직한 톱니파 하강 진동
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.6);

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);

    // 긴급 경보 비프 2회
    this.playTone(440, 'triangle', 0.12, 0.15, 0.2);
    this.playTone(370, 'triangle', 0.22, 0.32, 0.22);
  }

  // [방어막 수호] 보스의 잠식을 방어막으로 튕겨냈을 때 챙그랑 실드음
  playShieldDefend() {
    if (this.muted) return;
    this.playTone(880, 'sine', 0.12, 0.0, 0.25);
    this.playTone(1320, 'triangle', 0.2, 0.05, 0.28);
    this.playTone(1760, 'sine', 0.3, 0.12, 0.22);
  }

  // [영토 대정화] 보스 격퇴 후 빼앗긴 땅이 황금빛으로 정화될 때 성스러운 축제 벨소리
  playPurification() {
    if (this.muted) return;
    const chimeNotes = [
      { f: 587.33, t: 0.0, d: 0.2 },  // D5
      { f: 739.99, t: 0.1, d: 0.2 },  // F#5
      { f: 880.00, t: 0.2, d: 0.22 }, // A5
      { f: 1174.66, t: 0.32, d: 0.25 },// D6
      { f: 1479.98, t: 0.45, d: 0.35 },// F#6
      { f: 1760.00, t: 0.6, d: 0.55 }  // A6
    ];
    chimeNotes.forEach(n => this.playTone(n.f, 'sine', n.d, n.t, 0.24));
  }

  // 사운드 토글
  toggleMute() {
    this.muted = !this.muted;
    return !this.muted;
  }
}

window.soundManager = new SoundManager();
