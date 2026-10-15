const fs = require('fs');
const path = require('path');

const SEASON_FILE_PATH = path.join(__dirname, 'public', 'data', 'season_data.json');

// 공주시 테마 시즌 보스 몬스터 템플릿 (4대 수호신 및 전설 몬스터)
const SEASON_BOSS_TEMPLATES = [
  {
    bossId: 'boss_dragon',
    name: "금강의 수호신 '금강대룡'",
    shortName: '금강대룡',
    title: '🌊 공주시 금강을 뒤흔드는 푸른 전설의 용',
    icon: '🐉',
    badgeId: 'badge_boss_dragon',
    badgeName: '금강룡 토벌 영웅',
    badgeDesc: '금강을 지키는 거대 수호용과의 곱셈 대결에서 승리한 영웅!',
    defaultHp: 10000,
    regionId: 'ri_134',
    targetX: 614.1,
    targetY: 507.4,
    cx: 575,
    cy: 465,
    location: '공주시 금강 본류 (신관동·금성동 사이)',
    story: '공주시 한가운데를 흐르는 금강에서 깨어난 거대 수호용 금강대룡! 2학년 친구들의 단합된 구구단 주문으로 용을 감동시켜 공주시를 수호하게 만들어야 합니다!',
    rewardScore: 100
  },
  {
    bossId: 'boss_goblin',
    name: "정안 숲의 '대왕 알밤 도깨비'",
    shortName: '알밤 도깨비',
    title: '🌰 정안면 알밤을 몽땅 탐내는 거대 도깨비',
    icon: '🌰👹',
    badgeId: 'badge_boss_goblin',
    badgeName: '알밤 도깨비 퇴치단',
    badgeDesc: '정안 알밤을 지키기 위해 알밤 도깨비를 물리친 용감한 수호대!',
    defaultHp: 10000,
    regionId: 'ri_21',
    targetX: 658.9,
    targetY: 203.4,
    cx: 708,
    cy: 185,
    location: '정안면 평정리 (알밤특구)',
    story: '정안면의 달콤한 알밤을 모두 가져가려는 장난꾸러기 거대 도깨비! 구구단 문제를 척척 풀어 도깨비의 방망이를 멈추게 하세요!',
    rewardScore: 100
  },
  {
    bossId: 'boss_golem',
    name: "계룡산 삼불봉 '바위 골렘'",
    shortName: '계룡 바위골렘',
    title: '🗿 계룡산 갑사 숲길을 지키는 바위 거인',
    icon: '🗿⚡',
    badgeId: 'badge_boss_golem',
    badgeName: '계룡산 수호 대장',
    badgeDesc: '계룡산의 거대한 바위 골렘을 지혜로운 곱셈 연타로 통과한 대장!',
    defaultHp: 10000,
    regionId: 'ri_91',
    targetX: 730.1,
    targetY: 748.5,
    cx: 785,
    cy: 730,
    location: '계룡면 중장리 (갑사)',
    story: '계룡산 삼불봉에서 내려온 단단한 바위 골렘! 곱셈 콤보 공격으로 바위 방패를 깨고 계룡산의 평화를 되찾으세요!',
    rewardScore: 100
  },
  {
    bossId: 'boss_phoenix',
    name: "공산성 수호 '황금 불사조'",
    shortName: '황금 불사조',
    title: '🦅 백제 웅진성 상공을 비행하는 황금빛 불사조',
    icon: '🦅🔥',
    badgeId: 'badge_boss_phoenix',
    badgeName: '공산성 불사조 마스터',
    badgeDesc: '공산성의 하늘을 밝히는 황금 불사조의 지혜 시험을 통과한 마스터!',
    defaultHp: 10000,
    regionId: 'ri_127',
    targetX: 627.7,
    targetY: 528.6,
    cx: 668,
    cy: 490,
    location: '중학동 (공산성 성벽)',
    story: '공산성 진남루 위로 날아오른 백제의 전설 불사조! 뜨거운 지혜의 불꽃 구구단 문제를 모두 맞혀 불사조의 축복을 받으세요!',
    rewardScore: 100
  }
];

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
  constructor(filePath = SEASON_FILE_PATH) {
    this.filePath = filePath;
    this.corruptionSettings = {
      enabled: true,
      intervalSec: 300, // 기본 5분마다 1곳씩 (300초)
      maxCount: 8       // 기본 최대 8곳 안전 제한
    };
    this.nextCorruptionCountdown = 300;
    this.autoSummonSettings = {
      enabled: true,
      intervalSec: 3 * 3600, // 기본 3시간 (10,800초)
      defaultHp: 10000
    };
    this.data = this.loadSeasonData();
    this.checkAndInitSeason();
    this.ensureBossInitialized();
    this.initAutoSummonSettings();
  }

  loadSeasonData() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
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
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
    } catch (e) {
      console.error('[시즌 관리] 시즌 데이터 저장 실패:', e);
    }
  }

  // 시즌 보스 템플릿 조회
  getBossTemplateForSeason(seasonNum = this.data.currentSeason) {
    const idx = (seasonNum - 1) % SEASON_BOSS_TEMPLATES.length;
    return SEASON_BOSS_TEMPLATES[idx];
  }

  // 시즌 보스 기본 구조 초기화
  initBossForSeason(seasonNum = this.data.currentSeason, templateOverride = null) {
    const tmpl = templateOverride || this.getBossTemplateForSeason(seasonNum);
    return {
      bossId: tmpl.bossId,
      name: tmpl.name,
      shortName: tmpl.shortName,
      title: tmpl.title,
      icon: tmpl.icon,
      badgeId: tmpl.badgeId,
      badgeName: tmpl.badgeName,
      badgeDesc: tmpl.badgeDesc,
      maxHp: tmpl.defaultHp,
      currentHp: tmpl.defaultHp,
      regionId: tmpl.regionId,
      targetX: tmpl.targetX || tmpl.cx,
      targetY: tmpl.targetY || tmpl.cy,
      cx: tmpl.cx,
      cy: tmpl.cy,
      isDefeated: false,
      status: 'sleeping', // 'sleeping' (소환 대기), 'raging' (토벌전 진행 중), 'defeated' (토벌 완료)
      location: tmpl.location,
      story: tmpl.story,
      rewardScore: tmpl.rewardScore,
      summonedAt: null,
      defeatedAt: null,
      totalDamageDealt: 0,
      contributors: {},
      teamDamage: { team_1: 0, team_2: 0, team_3: 0, team_4: 0 },
      lastHitLog: [],
      corruptedTerritories: []
    };
  }

  // 보스 데이터 누락 시 안전 보정 및 4대 보스 동시 관리 초기화
  ensureBossInitialized() {
    if (!this.data.activeBosses || !Array.isArray(this.data.activeBosses)) {
      this.data.activeBosses = [];
    }

    SEASON_BOSS_TEMPLATES.forEach(tmpl => {
      let existing = this.data.activeBosses.find(b => b.bossId === tmpl.bossId);
      if (!existing) {
        if (this.data.currentBoss && this.data.currentBoss.bossId === tmpl.bossId) {
          existing = this.data.currentBoss;
        } else {
          existing = {
            bossId: tmpl.bossId,
            name: tmpl.name,
            shortName: tmpl.shortName,
            title: tmpl.title,
            icon: tmpl.icon,
            badgeId: tmpl.badgeId,
            badgeName: tmpl.badgeName,
            badgeDesc: tmpl.badgeDesc,
            maxHp: tmpl.defaultHp,
            currentHp: tmpl.defaultHp,
            regionId: tmpl.regionId,
            targetX: tmpl.targetX || tmpl.cx,
            targetY: tmpl.targetY || tmpl.cy,
            cx: tmpl.cx,
            cy: tmpl.cy,
            isDefeated: false,
            status: 'sleeping',
            location: tmpl.location,
            story: tmpl.story,
            rewardScore: tmpl.rewardScore,
            summonedAt: null,
            defeatedAt: null,
            totalDamageDealt: 0,
            contributors: {},
            teamDamage: { team_1: 0, team_2: 0, team_3: 0, team_4: 0 },
            lastHitLog: [],
            corruptedTerritories: []
          };
        }
        this.data.activeBosses.push(existing);
      }
      if (!existing.corruptedTerritories) {
        existing.corruptedTerritories = [];
      }
    });

    const raging = this.data.activeBosses.find(b => b.status === 'raging' && !b.isDefeated);
    this.data.currentBoss = raging || this.data.activeBosses[0];
  }

  // 특정 보스 검색 헬퍼
  findBoss(bossId = null) {
    this.ensureBossInitialized();
    if (!bossId) {
      const raging = this.data.activeBosses.find(b => b.status === 'raging' && !b.isDefeated);
      return raging || this.data.currentBoss || this.data.activeBosses[0];
    }
    return this.data.activeBosses.find(b => b.bossId === bossId) || this.data.currentBoss;
  }

  // 현재 출현(raging) 중인 모든 보스 목록
  getActiveRagingBosses() {
    this.ensureBossInitialized();
    return this.data.activeBosses.filter(b => b && b.status === 'raging' && !b.isDefeated);
  }

  // 3시간 보스 자동 소환 설정 및 스케줄 초기화/동기화
  initAutoSummonSettings() {
    if (this.data.autoSummonSettings) {
      if (typeof this.data.autoSummonSettings.enabled === 'boolean') {
        this.autoSummonSettings.enabled = this.data.autoSummonSettings.enabled;
      }
      if (typeof this.data.autoSummonSettings.intervalSec === 'number' && this.data.autoSummonSettings.intervalSec >= 5) {
        this.autoSummonSettings.intervalSec = this.data.autoSummonSettings.intervalSec;
      }
      if (typeof this.data.autoSummonSettings.defaultHp === 'number' && this.data.autoSummonSettings.defaultHp > 0) {
        this.autoSummonSettings.defaultHp = this.data.autoSummonSettings.defaultHp;
      }
    } else {
      this.data.autoSummonSettings = { ...this.autoSummonSettings };
    }
    this.ensureAutoSummonSchedule();
  }

  // 다음 자동 소환 예정 시각 보정 (없거나 과거 시각이면 현재+3시간으로 설정)
  ensureAutoSummonSchedule(forceReset = false) {
    const now = Date.now();
    let nextTime = this.data.nextAutoSummonAt ? new Date(this.data.nextAutoSummonAt).getTime() : 0;

    if (forceReset || !nextTime || isNaN(nextTime) || nextTime <= now) {
      nextTime = now + (this.autoSummonSettings.intervalSec * 1000);
      this.data.nextAutoSummonAt = new Date(nextTime).toISOString();
      this.data.autoSummonSettings = { ...this.autoSummonSettings };
      this.saveSeasonData();
    }
  }

  // 다음 자동 소환까지 남은 초(Countdown)
  getNextAutoSummonCountdown() {
    if (!this.data.nextAutoSummonAt) {
      return this.autoSummonSettings.intervalSec;
    }
    const diff = Math.floor((new Date(this.data.nextAutoSummonAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
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
      hallOfFame: this.data.hallOfFame || [],
      boss: this.getBossInfo()
    };
  }

  // 보스 실시간 정보 요약 (클라이언트 전송용, 특정 보스 또는 주 보스)
  getBossInfo(bossId = null) {
    this.ensureBossInitialized();
    const b = this.findBoss(bossId);
    const hpPercent = b.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((b.currentHp / b.maxHp) * 1000) / 10)) : 0;

    // 기여자 랭킹 상위 정렬
    const sortedContributors = Object.values(b.contributors || {}).sort((x, y) => y.damage - x.damage);

    return {
      bossId: b.bossId,
      name: b.name,
      shortName: b.shortName,
      title: b.title,
      icon: b.icon,
      badgeId: b.badgeId,
      badgeName: b.badgeName,
      badgeDesc: b.badgeDesc,
      maxHp: b.maxHp,
      currentHp: b.currentHp,
      hpPercent,
      isDefeated: !!b.isDefeated,
      status: b.status,
      location: b.location,
      story: b.story,
      rewardScore: b.rewardScore,
      summonedAt: b.summonedAt,
      regionId: b.regionId || 'ri_137',
      targetX: (typeof b.targetX === 'number') ? b.targetX : 565,
      targetY: (typeof b.targetY === 'number') ? b.targetY : 512,
      cx: (typeof b.cx === 'number') ? b.cx : 520,
      cy: (typeof b.cy === 'number') ? b.cy : 445,
      defeatedAt: b.defeatedAt,
      totalDamageDealt: b.totalDamageDealt || 0,
      teamDamage: b.teamDamage || { team_1: 0, team_2: 0, team_3: 0, team_4: 0 },
      lastHitLog: b.lastHitLog || [],
      topContributors: sortedContributors.slice(0, 5),
      mvp: sortedContributors[0] || null,
      corruptedTerritories: b.corruptedTerritories || [],
      corruptedCount: (b.corruptedTerritories || []).length,
      corruptionSettings: { ...this.corruptionSettings },
      nextCorruptionCountdown: this.nextCorruptionCountdown,
      autoSummonSettings: this.getAutoSummonSettings(),
      nextAutoSummonCountdown: this.getNextAutoSummonCountdown(),
      nextAutoSummonAt: this.data.nextAutoSummonAt
    };
  }

  // 4대 보스 전체 정보 목록 (교사 대시보드 및 다중 보스 레이드 UI용)
  getAllBossesInfo() {
    this.ensureBossInitialized();
    return SEASON_BOSS_TEMPLATES.map(tmpl => this.getBossInfo(tmpl.bossId));
  }

  // 교사: 보스 토벌전 소환 / 시작 (특정 보스 출격)
  summonBoss(maxHp = null, bossTemplateId = null) {
    this.ensureBossInitialized();

    let tmpl = null;
    if (bossTemplateId) {
      tmpl = SEASON_BOSS_TEMPLATES.find(t => t.bossId === bossTemplateId);
    }
    if (!tmpl) {
      tmpl = this.getBossTemplateForSeason(this.data.currentSeason);
    }

    const hp = (typeof maxHp === 'number' && maxHp > 0) ? maxHp : (this.autoSummonSettings.defaultHp || tmpl.defaultHp);

    let targetBoss = this.data.activeBosses.find(b => b.bossId === tmpl.bossId);
    if (!targetBoss) {
      targetBoss = {
        bossId: tmpl.bossId,
        name: tmpl.name,
        shortName: tmpl.shortName,
        title: tmpl.title,
        icon: tmpl.icon,
        badgeId: tmpl.badgeId,
        badgeName: tmpl.badgeName,
        badgeDesc: tmpl.badgeDesc,
        maxHp: hp,
        currentHp: hp,
        regionId: tmpl.regionId,
        targetX: tmpl.targetX || tmpl.cx,
        targetY: tmpl.targetY || tmpl.cy,
        cx: tmpl.cx,
        cy: tmpl.cy,
        isDefeated: false,
        status: 'raging',
        location: tmpl.location,
        story: tmpl.story,
        rewardScore: tmpl.rewardScore,
        summonedAt: new Date().toISOString(),
        defeatedAt: null,
        totalDamageDealt: 0,
        contributors: {},
        teamDamage: { team_1: 0, team_2: 0, team_3: 0, team_4: 0 },
        lastHitLog: [],
        corruptedTerritories: []
      };
      this.data.activeBosses.push(targetBoss);
    } else {
      targetBoss.status = 'raging';
      targetBoss.isDefeated = false;
      targetBoss.maxHp = hp;
      targetBoss.currentHp = hp;
      targetBoss.summonedAt = new Date().toISOString();
      targetBoss.defeatedAt = null;
      targetBoss.totalDamageDealt = 0;
      targetBoss.contributors = {};
      targetBoss.teamDamage = { team_1: 0, team_2: 0, team_3: 0, team_4: 0 };
      targetBoss.lastHitLog = [];
      if (!targetBoss.corruptedTerritories) targetBoss.corruptedTerritories = [];
    }

    this.data.currentBoss = targetBoss;
    this.nextCorruptionCountdown = this.corruptionSettings.intervalSec;
    this.ensureAutoSummonSchedule(true);
    this.saveSeasonData();
    console.log(`🐉 [시즌 보스 소환] [${tmpl.name}] (HP: ${hp}) 출격 완료! (침식 주기: ${this.corruptionSettings.intervalSec}초)`);
    return this.getBossInfo(tmpl.bossId);
  }

  // 4대 보스 중 미소환된 보스 1종 랜덤 추가 소환 (최대 4마리까지 동시 출현 가능)
  summonRandomBoss(maxHp = null) {
    this.ensureBossInitialized();
    // 현재 raging 중이지 않거나 이미 토벌된 보스 풀 탐색
    const availableTemplates = SEASON_BOSS_TEMPLATES.filter(t => {
      const b = this.findBoss(t.bossId);
      return !b || b.status !== 'raging' || b.isDefeated;
    });

    if (availableTemplates.length === 0) {
      console.log(`⚠️ [보스 소환 한도] 이미 4대 보스가 모두 출현 중입니다. (최대 4마리 한도)`);
      return null;
    }

    const selectedTemplate = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
    const hp = (typeof maxHp === 'number' && maxHp > 0) ? maxHp : (this.autoSummonSettings.defaultHp || selectedTemplate.defaultHp);

    const summoned = this.summonBoss(hp, selectedTemplate.bossId);
    console.log(`🎲 [보스 자동/랜덤 추가 출현] [${selectedTemplate.name}] (HP: ${hp}) 전장 참전! 다음 소환 예정: ${this.data.nextAutoSummonAt}`);
    return summoned;
  }

  // 매 1초마다 보스 자동 소환 타이머 검사 (시간 만료 시 기존 보스 및 영토는 유지, 새 보스 추가 리젠)
  tickAutoSummon(gameState) {
    if (!this.autoSummonSettings.enabled) {
      return null;
    }

    const countdown = this.getNextAutoSummonCountdown();
    if (countdown <= 0) {
      console.log(`⏰ [보스 자동 소환 주기 도래] 기존 보스를 유지한 채 새로운 전설 보스를 추가 리젠합니다!`);
      const summoned = this.summonRandomBoss();
      this.ensureAutoSummonSchedule(true);
      return summoned;
    }
    return null;
  }

  // 3시간 보스 자동 소환 설정 변경 (교사 제어)
  setAutoSummonSettings(newSettings = {}) {
    if (typeof newSettings.enabled === 'boolean') {
      this.autoSummonSettings.enabled = newSettings.enabled;
    }
    if (typeof newSettings.intervalSec === 'number' && newSettings.intervalSec >= 5) {
      this.autoSummonSettings.intervalSec = newSettings.intervalSec;
      const now = Date.now();
      const currentNext = this.data.nextAutoSummonAt ? new Date(this.data.nextAutoSummonAt).getTime() : now;
      if (currentNext - now > newSettings.intervalSec * 1000 || currentNext <= now) {
        this.data.nextAutoSummonAt = new Date(now + newSettings.intervalSec * 1000).toISOString();
      }
    }
    if (typeof newSettings.defaultHp === 'number' && newSettings.defaultHp > 0) {
      this.autoSummonSettings.defaultHp = newSettings.defaultHp;
    }
    this.data.autoSummonSettings = { ...this.autoSummonSettings };
    this.saveSeasonData();
    return this.getAutoSummonSettings();
  }

  getAutoSummonSettings() {
    return {
      enabled: this.autoSummonSettings.enabled,
      intervalSec: this.autoSummonSettings.intervalSec,
      defaultHp: this.autoSummonSettings.defaultHp,
      countdown: this.getNextAutoSummonCountdown(),
      nextAutoSummonAt: this.data.nextAutoSummonAt
    };
  }

  // 교사: 특정 보스 또는 전체 보스 토벌전 강제 종료(퇴각)
  dismissBoss(bossId = null) {
    this.ensureBossInitialized();
    if (bossId) {
      const b = this.findBoss(bossId);
      if (b) {
        b.status = 'sleeping';
        console.log(`⚔️ [보스 개별 퇴각] [${b.name}]이(가) 교사 권한으로 퇴각했습니다.`);
      }
    } else {
      this.data.activeBosses.forEach(b => {
        b.status = 'sleeping';
      });
      console.log(`⚔️ [시즌 보스 전체 퇴각] 모든 보스 토벌전이 교사 권한으로 종료되었습니다.`);
    }
    const raging = this.data.activeBosses.find(b => b.status === 'raging' && !b.isDefeated);
    this.data.currentBoss = raging || this.data.activeBosses[0];
    this.saveSeasonData();
    return this.getBossInfo(bossId);
  }

  // 침식 설정 변경 (교사 제어)
  setCorruptionSettings(newSettings = {}) {
    if (typeof newSettings.enabled === 'boolean') {
      this.corruptionSettings.enabled = newSettings.enabled;
    }
    if (typeof newSettings.intervalSec === 'number' && newSettings.intervalSec >= 10) {
      this.corruptionSettings.intervalSec = newSettings.intervalSec;
      if (this.nextCorruptionCountdown > newSettings.intervalSec) {
        this.nextCorruptionCountdown = newSettings.intervalSec;
      }
    }
    if (typeof newSettings.maxCount === 'number' && newSettings.maxCount >= 1) {
      this.corruptionSettings.maxCount = newSettings.maxCount;
    }
    return {
      ...this.corruptionSettings,
      nextCorruptionCountdown: this.nextCorruptionCountdown
    };
  }

  getCorruptionSettings() {
    return { ...this.corruptionSettings };
  }

  getCorruptionCountdown() {
    return this.nextCorruptionCountdown;
  }

  getCorruptedCount(bossId = null) {
    this.ensureBossInitialized();
    if (bossId) {
      const b = this.findBoss(bossId);
      return (b?.corruptedTerritories || []).length;
    }
    let total = 0;
    (this.data.activeBosses || []).forEach(b => {
      total += (b.corruptedTerritories || []).length;
    });
    return total;
  }

  getMaxCorrupted() {
    return this.corruptionSettings.maxCount;
  }

  // 매 1초마다 호출되는 침식 타이머 틱 (모든 활성 보스가 침식 주기마다 각각 1곳씩 동시 침식)
  tickCorruption(gameState) {
    this.ensureBossInitialized();
    if (!this.corruptionSettings.enabled) {
      return null;
    }

    const ragingBosses = this.getActiveRagingBosses();
    if (ragingBosses.length === 0) {
      return null;
    }

    this.nextCorruptionCountdown -= 1;
    if (this.nextCorruptionCountdown <= 0) {
      this.nextCorruptionCountdown = this.corruptionSettings.intervalSec;
      const results = [];
      for (const b of ragingBosses) {
        const res = this.corruptNextTerritory(gameState, b.bossId);
        if (res) results.push(res);
      }
      return results.length > 0 ? results : null;
    }
    return null;
  }

  // 다음 인접 영토 잠식 실행 (보스별 독립 거점/침식지 기반 BFS 인접 탐색 & 방어막 상호작용)
  corruptNextTerritory(gameState, targetBossId = null) {
    this.ensureBossInitialized();
    const b = this.findBoss(targetBossId);
    if (!b || b.status !== 'raging' || b.isDefeated) {
      return null;
    }
    if (!gameState || !gameState.regions) {
      return null;
    }

    if (!b.corruptedTerritories) b.corruptedTerritories = [];

    // 보스 1마리당 최대 잠식 한도 체크
    if (b.corruptedTerritories.length >= this.corruptionSettings.maxCount) {
      return {
        action: 'max_limit_reached',
        totalCorrupted: b.corruptedTerritories.length,
        maxCount: this.corruptionSettings.maxCount,
        boss: this.getBossInfo(b.bossId)
      };
    }

    const allRegions = Object.values(gameState.regions);
    // 모든 활성 보스가 이미 잠식한 전체 영토 ID 수집 (다른 보스의 침식지는 중복 침식 불가)
    const allCorruptedIds = new Set();
    (this.data.activeBosses || []).forEach(bossObj => {
      (bossObj.corruptedTerritories || []).forEach(t => allCorruptedIds.add(t.regionId));
    });

    const thisBossCorruptedIds = new Set(b.corruptedTerritories.map(t => t.regionId));

    let candidate = null;

    // 1순위: 이 보스의 출현 거점 영토 자체 (아직 아무도 잠식 안 했으면 최우선 침식)
    const originId = b.regionId || 'ri_134';
    const originRegion = gameState.regions[originId];
    if (originRegion && !originRegion.isCorrupted && !allCorruptedIds.has(originId) && originRegion.ownerId !== 'boss') {
      candidate = originRegion;
    } else {
      // 2순위: 이 보스의 거점 영토 또는 이 보스가 이미 침식한 영토와 맞닿아 있는 인접 영토 탐색
      const sourceRegions = [];
      if (originRegion) sourceRegions.push(originRegion);
      thisBossCorruptedIds.forEach(id => {
        if (gameState.regions[id] && !sourceRegions.some(sr => sr.id === id)) {
          sourceRegions.push(gameState.regions[id]);
        }
      });

      const adjacentCandidates = [];
      allRegions.forEach(reg => {
        if (reg.isCorrupted || allCorruptedIds.has(reg.id) || reg.ownerId === 'boss') return;
        if (typeof reg.cx !== 'number' || typeof reg.cy !== 'number') return;

        // sourceRegions 중 적어도 하나와 인접한지 확인 (거리 85 이하 또는 같은 읍면동)
        const isAdj = sourceRegions.some(src => {
          if (typeof src.cx !== 'number' || typeof src.cy !== 'number') return false;
          const dist = Math.hypot(reg.cx - src.cx, reg.cy - src.cy);
          return dist <= 85 || (reg.town && src.town && reg.town === src.town);
        });

        if (isAdj) {
          adjacentCandidates.push(reg);
        }
      });

      if (adjacentCandidates.length > 0) {
        const bossX = (typeof b.targetX === 'number') ? b.targetX : (b.cx || 600);
        const bossY = (typeof b.targetY === 'number') ? b.targetY : (b.cy || 500);

        adjacentCandidates.sort((a, bReg) => {
          const aShield = a.shield || 0;
          const bShield = bReg.shield || 0;
          if (aShield !== bShield) {
            return aShield - bShield;
          }
          const distA = Math.hypot(a.cx - bossX, a.cy - bossY);
          const distB = Math.hypot(bReg.cx - bossX, bReg.cy - bossY);
          return distA - distB;
        });

        candidate = adjacentCandidates[0];
      } else {
        // 인접 후보가 없을 시: 남은 미잠식 영토 중 보스 위치와 가장 가까운 곳
        const uncorrupted = allRegions.filter(r => !r.isCorrupted && !allCorruptedIds.has(r.id) && r.ownerId !== 'boss');
        if (uncorrupted.length > 0) {
          const bossX = (typeof b.targetX === 'number') ? b.targetX : (b.cx || 600);
          const bossY = (typeof b.targetY === 'number') ? b.targetY : (b.cy || 500);
          uncorrupted.sort((a, bReg) => {
            const distA = Math.hypot(a.cx - bossX, a.cy - bossY);
            const distB = Math.hypot(bReg.cx - bossX, bReg.cy - bossY);
            return distA - distB;
          });
          candidate = uncorrupted[0];
        }
      }
    }

    if (!candidate) {
      return null;
    }

    // 방어막 상호작용 검사:
    // 방어막이 2단계 이상이면, 방어막 1단계를 소모하여 침식을 막아냄!
    if (candidate.shield > 1) {
      candidate.shield -= 1;
      return {
        action: 'defended_by_shield',
        region: candidate,
        regionId: candidate.id,
        regionName: candidate.name,
        town: candidate.town,
        shieldRemaining: candidate.shield,
        boss: this.getBossInfo(b.bossId)
      };
    }

    // 침식 진행 (방어막 1단계 이하 또는 빈 땅)
    const prevData = {
      ownerId: candidate.ownerId || null,
      ownerName: candidate.ownerName || null,
      ownerColor: candidate.ownerColor || null,
      ownerAvatar: candidate.ownerAvatar || null,
      capturedBy: candidate.capturedBy || null,
      capturedById: candidate.capturedById || null,
      shield: candidate.shield || 0
    };

    candidate.isCorrupted = true;
    candidate.corruptedByBoss = b.bossId;
    candidate.corruptedTheme = b.bossId;
    candidate.ownerId = 'boss';
    candidate.ownerName = b.shortName;
    candidate.ownerColor = '#4C1D95';
    candidate.ownerAvatar = b.icon;
    candidate.shield = 0;

    b.corruptedTerritories.push({
      regionId: candidate.id,
      regionName: candidate.name,
      town: candidate.town,
      prevData,
      corruptedAt: new Date().toISOString()
    });

    this.saveSeasonData();
    console.log(`⚠️ [영토 잠식] 보스 [${b.name}]이(가) [${candidate.name}]을 잠식했습니다! (누적: ${b.corruptedTerritories.length}곳)`);

    return {
      action: 'corrupted',
      region: candidate,
      prevData,
      totalCorrupted: b.corruptedTerritories.length,
      boss: this.getBossInfo(b.bossId)
    };
  }

  // 특정 보스의 침식 영토 정화 (makeEmpty=true 시 보스 격퇴 후 빈 영토(중립)로 해방!)
  purifyTerritoriesForBoss(gameState, bossId, makeEmpty = true) {
    this.ensureBossInitialized();
    const b = this.findBoss(bossId);
    if (!b || !b.corruptedTerritories || b.corruptedTerritories.length === 0) {
      return [];
    }

    const purifiedList = [];

    b.corruptedTerritories.forEach(entry => {
      const region = gameState?.regions ? gameState.regions[entry.regionId] : null;
      if (region) {
        region.isCorrupted = false;
        region.corruptedByBoss = null;
        region.corruptedTheme = null;

        if (makeEmpty) {
          // 🌟 보스 퇴치 성공 시: 해당 침식 영토는 완전히 '빈 영토(중립)'로 초기화!
          region.ownerId = null;
          region.ownerName = null;
          region.ownerColor = null;
          region.ownerAvatar = null;
          region.capturedBy = null;
          region.capturedById = null;
          region.shield = 0;
          region.isUnderAttack = false;
        } else {
          // 교사 수동 정화 시: 원래 소유팀으로 안전 복원 + 보너스 방어막 +1
          if (entry.prevData && entry.prevData.ownerId && entry.prevData.ownerId !== 'boss') {
            region.ownerId = entry.prevData.ownerId;
            region.ownerName = entry.prevData.ownerName;
            region.ownerColor = entry.prevData.ownerColor;
            region.ownerAvatar = entry.prevData.ownerAvatar;
            region.capturedBy = entry.prevData.capturedBy;
            region.capturedById = entry.prevData.capturedById;
            region.shield = Math.min(5, Math.max(2, (entry.prevData.shield || 1) + 1));
          } else {
            region.ownerId = null;
            region.ownerName = null;
            region.ownerColor = null;
            region.ownerAvatar = null;
            region.capturedBy = null;
            region.capturedById = null;
            region.shield = 0;
          }
        }

        purifiedList.push(region);
      }
    });

    const count = b.corruptedTerritories.length;
    b.corruptedTerritories = [];
    this.saveSeasonData();
    console.log(`✨ [영토 정화 완료] 보스 [${b.name}]의 ${count}곳 영토 정화 완료 (빈 영토 모드: ${makeEmpty})`);

    return purifiedList;
  }

  // 교사 전체 수동 정화 시: 모든 활성 보스의 잠식 영토 일괄 정화 (기존 소유팀으로 복원)
  purifyAllTerritories(gameState, makeEmpty = false) {
    this.ensureBossInitialized();
    let allPurified = [];
    (this.data.activeBosses || []).forEach(b => {
      if (b.corruptedTerritories && b.corruptedTerritories.length > 0) {
        const list = this.purifyTerritoriesForBoss(gameState, b.bossId, makeEmpty);
        allPurified = allPurified.concat(list);
      }
    });
    return allPurified;
  }

  // 학생: 특정 보스 또는 주 보스 타격 기록
  recordBossHit(player, damage = 10, isCrit = false, targetBossId = null) {
    this.ensureBossInitialized();
    const b = this.findBoss(targetBossId);

    if (!b || b.status !== 'raging' || b.isDefeated) {
      return null;
    }

    const actualDamage = Math.max(1, Math.min(damage, b.currentHp));
    b.currentHp = Math.max(0, b.currentHp - actualDamage);
    b.totalDamageDealt = (b.totalDamageDealt || 0) + actualDamage;

    // 개인 기여도 누적
    const key = player.id || player.name;
    if (!b.contributors[key]) {
      b.contributors[key] = {
        id: player.id,
        name: player.name,
        avatar: player.avatar || '🐯',
        color: player.color || '#2563EB',
        teamId: player.teamId || null,
        damage: 0,
        hits: 0
      };
    }
    b.contributors[key].damage += actualDamage;
    b.contributors[key].hits += 1;

    // 학급(반) 기여도 누적
    if (player.teamId && b.teamDamage[player.teamId] !== undefined) {
      b.teamDamage[player.teamId] += actualDamage;
    }

    // 최근 타격 로그
    if (!b.lastHitLog) b.lastHitLog = [];
    b.lastHitLog.unshift({
      studentName: player.name,
      avatar: player.avatar || '🐯',
      teamId: player.teamId || null,
      damage: actualDamage,
      isCrit: !!isCrit,
      time: Date.now()
    });
    if (b.lastHitLog.length > 8) b.lastHitLog.pop();

    // 토벌 성공 판정
    if (b.currentHp <= 0) {
      b.currentHp = 0;
      b.isDefeated = true;
      b.status = 'defeated';
      b.defeatedAt = new Date().toISOString();

      const sorted = Object.values(b.contributors).sort((x, y) => y.damage - x.damage);
      const mvp = sorted[0] || null;

      let winningTeamId = null;
      let maxTeamDmg = -1;
      Object.entries(b.teamDamage).forEach(([tid, dmg]) => {
        if (dmg > maxTeamDmg) {
          maxTeamDmg = dmg;
          winningTeamId = tid;
        }
      });

      this.saveSeasonData();
      console.log(`🎉 [시즌 보스 토벌 성공!] ${b.name} 격퇴 완료! MVP: ${mvp ? mvp.name : '없음'}`);

      return {
        defeated: true,
        actualDamage,
        isCrit,
        boss: this.getBossInfo(b.bossId),
        mvp,
        winningTeamId,
        rewardBadge: {
          id: b.badgeId,
          name: b.badgeName,
          icon: b.icon,
          desc: b.badgeDesc
        },
        rewardScore: b.rewardScore || 100
      };
    }

    this.saveSeasonData();
    return {
      defeated: false,
      actualDamage,
      isCrit,
      boss: this.getBossInfo(b.bossId)
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

    // 시즌 보스 토벌 전적 요약
    const bossSummary = this.data.currentBoss ? {
      name: this.data.currentBoss.name,
      icon: this.data.currentBoss.icon,
      isDefeated: !!this.data.currentBoss.isDefeated,
      defeatedAt: this.data.currentBoss.defeatedAt,
      mvp: this.getBossInfo().mvp
    } : null;

    // 명예의 전당 레코드 생성
    const finishedSeasonRecord = {
      season: this.data.currentSeason,
      seasonName: this.data.seasonName,
      startedAt: this.data.seasonStart,
      endedAt: new Date().toISOString(),
      winningClass: winningClass || { name: '집계 없음', territories: 0, score: 0 },
      classRankings: classRankings,
      mvpStudent: mvpStudent || { name: '집계 없음', score: 0, territories: 0 },
      bossRecord: bossSummary
    };

    if (!this.data.hallOfFame) this.data.hallOfFame = [];
    this.data.hallOfFame.unshift(finishedSeasonRecord);

    // 다음 시즌(제 N+1 시즌) 설정
    this.data.currentSeason += 1;
    this.data.seasonName = `제 ${this.data.currentSeason}시즌 (2학년 반 대항전)`;
    this.data.seasonStart = new Date().toISOString();
    this.data.seasonEnd = getNextSundayEnd(new Date(Date.now() + 86400000)).toISOString();
    this.data.lastResetKey = getWeekKey();

    // 다음 시즌 신규 보스 세팅
    this.data.activeBosses = [];
    this.data.currentBoss = this.initBossForSeason(this.data.currentSeason);
    this.ensureBossInitialized();
    this.ensureAutoSummonSchedule(true);

    this.saveSeasonData();
    console.log(`🏆 [시즌 마감 완료] 제 ${finishedSeasonRecord.season}시즌 우승: ${finishedSeasonRecord.winningClass.name}! -> 새 시즌: ${this.data.seasonName}`);

    return finishedSeasonRecord;
  }
}

module.exports = {
  SeasonManager,
  SEASON_BOSS_TEMPLATES,
  getNextSundayEnd,
  getWeekKey
};
