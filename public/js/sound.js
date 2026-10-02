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

  // 사운드 토글
  toggleMute() {
    this.muted = !this.muted;
    return !this.muted;
  }
}

window.soundManager = new SoundManager();
