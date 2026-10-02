const fs = require('fs');
const path = require('path');

const SEASON_FILE_PATH = path.join(__dirname, 'public', 'data', 'season_data.json');

// KST(한국 표준시) 기준 이번 주 일요일 23:59:59 계산
function getKSTDate(d = new Date()) {
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (9 * 60 * 60000));
}

function getNextSundayEnd(fromDate = new Date()) {
  const kst = getKSTDate(fromDate);
  const day = kst.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
  const daysUntilSunday = (7 - day) % 7; // 오늘이 일요일이면 0일 남음 (오늘 23:59:59 마감)
  
  const sunday = new Date(kst);
  sunday.setDate(kst.getDate() + daysUntilSunday);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

function getWeekKey(date = new Date()) {
  const kst = getKSTDate(date);
  const target = new Date(kst.valueOf());
  const dayNr = (kst.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
  return `${kst.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

class SeasonManager {
  constructor() {
    this.data = this.loadSeasonData();
    this.checkAndInitSeason();
  }

  loadSeasonData() {
    try {
      if (fs.existsSync(SEASON_FILE_PATH)) {
        const raw = fs.readFileSync(SEASON_FILE_PATH, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[시즌 관리] 기존 시즌 데이터 로드 실패, 새로 생성합니다:', e.message);
    }

    const nextSunday = getNextSundayEnd();
    const initialData = {
      currentSeason: 1,
      seasonName: '제 1시즌 (2학년 반 대항전)',
      seasonStart: new Date().toISOString(),
      seasonEnd: nextSunday.toISOString(),
      lastResetKey: getWeekKey(),
      hallOfFame: []
    };
    this.saveSeasonData(initialData);
    return initialData;
  }

  saveSeasonData(dataToSave = this.data) {
    try {
      const dir = path.dirname(SEASON_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SEASON_FILE_PATH, JSON.stringify(dataToSave, null, 2), 'utf8');
    } catch (e) {
      console.error('[시즌 관리] 시즌 데이터 저장 실패:', e);
    }
  }

  // 서버 시작 시 지난 주 일요일이 지났는지 검사하여 자동 초기화
  checkAndInitSeason(gameState = null, calculateRankingFn = null) {
    const now = new Date();
    const seasonEndDate = new Date(this.data.seasonEnd);

    if (now > seasonEndDate) {
      console.log('⏰ [시즌 마감 감지] 지난 시즌 종료일이 지났습니다. 새 시즌으로 전환합니다.');
      return this.concludeSeasonAndStartNew(gameState, calculateRankingFn);
    }
    return null;
  }

  // 남은 시간(초) 계산
  getRemainingSeconds() {
    const now = new Date();
    const end = new Date(this.data.seasonEnd);
    const diffSec = Math.max(0, Math.floor((end - now) / 1000));
    return diffSec;
  }

  getSeasonInfo() {
    const remainingSec = this.getRemainingSeconds();
    const days = Math.floor(remainingSec / 86400);
    const hours = Math.floor((remainingSec % 86400) / 3600);
    const mins = Math.floor((remainingSec % 3600) / 60);
    const secs = remainingSec % 60;

    return {
      currentSeason: this.data.currentSeason,
      seasonName: this.data.seasonName,
      seasonStart: this.data.seasonStart,
      seasonEnd: this.data.seasonEnd,
      remainingSeconds: remainingSec,
      remainingFormatted: `D-${days}일 ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
      hallOfFame: this.data.hallOfFame || []
    };
  }

  // 시즌 마감 및 다음 시즌 전환 (일요일 밤 23:59:59 자동 or 교사 수동)
  concludeSeasonAndStartNew(gameState, calculateRankingFn) {
    const ranking = calculateRankingFn ? calculateRankingFn() : null;
    let winningClass = null;
    let classRankings = [];
    let mvpStudent = null;

    if (ranking && ranking.teams && ranking.teams.length > 0) {
      classRankings = ranking.teams.map(t => ({
        id: t.id,
        name: t.name,
        avatar: t.avatar,
        color: t.color,
        territories: t.territories,
        score: t.score,
        memberCount: t.members ? t.members.length : 0
      }));
      winningClass = classRankings[0];
    }

    if (ranking && ranking.players && ranking.players.length > 0) {
      const topP = ranking.players[0];
      mvpStudent = {
        name: topP.name,
        score: topP.score,
        territories: topP.territories,
        badgesCount: topP.badges ? topP.badges.length : 0
      };
    }

    // 명예의 전당 레코드 생성
    const finishedSeasonRecord = {
      season: this.data.currentSeason,
      seasonName: this.data.seasonName,
      startedAt: this.data.seasonStart,
      endedAt: new Date().toISOString(),
      winningClass: winningClass || { name: '집계 없음', territories: 0, score: 0 },
      classRankings: classRankings,
      mvpStudent: mvpStudent || { name: '집계 없음', score: 0, territories: 0 }
    };

    if (!this.data.hallOfFame) this.data.hallOfFame = [];
    this.data.hallOfFame.unshift(finishedSeasonRecord);

    // 다음 시즌(제 N+1 시즌) 설정
    this.data.currentSeason += 1;
    this.data.seasonName = `제 ${this.data.currentSeason}시즌 (2학년 반 대항전)`;
    this.data.seasonStart = new Date().toISOString();
    this.data.seasonEnd = getNextSundayEnd(new Date(Date.now() + 86400000)).toISOString();
    this.data.lastResetKey = getWeekKey();

    this.saveSeasonData();
    console.log(`🏆 [시즌 마감 완료] 제 ${finishedSeasonRecord.season}시즌 우승: ${finishedSeasonRecord.winningClass.name}! -> 새 시즌: ${this.data.seasonName}`);

    return finishedSeasonRecord;
  }
}

module.exports = {
  SeasonManager,
  getNextSundayEnd,
  getWeekKey
};
