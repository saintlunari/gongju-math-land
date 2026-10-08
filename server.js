const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const QRCode = require('qrcode');
const { validateQuestionBank, getQuestionsForRegion } = require('./question_bank');
const { SeasonManager, SEASON_BOSS_TEMPLATES } = require('./season_manager');

// 서버 시작 시 문제 은행 100% 무결성 검증 (불변식 검사)
validateQuestionBank();

// 주간 일요일 초기화 시즌 매니저 인스턴스 생성
const seasonManager = new SeasonManager();

const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// 정적 파일 제공
app.use(express.static('public'));

// 교사용 대시보드 전용 경로 (/teacher 로 바로 접속 가능)
app.get('/teacher', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

// 로컬 IP 주소 감지
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIpAddress();

// 공주시 150개 영토 정의 (16개 읍·면·동 전역의 모든 법정동 및 법정리)
const INITIAL_REGIONS = require('./public/data/server_initial_regions.json');

// 2학년 반 대항전 (1반 ~ 4반) 팀 정의
const TEAMS = {
  team_1: { id: 'team_1', name: '2학년 1반', shortName: '1반', avatar: '1️⃣', color: '#2563EB', textColor: '#FFFFFF', desc: '지혜롭고 씩씩한 1반' },
  team_2: { id: 'team_2', name: '2학년 2반', shortName: '2반', avatar: '2️⃣', color: '#EA580C', textColor: '#FFFFFF', desc: '열정 가득 활기찬 2반' },
  team_3: { id: 'team_3', name: '2학년 3반', shortName: '3반', avatar: '3️⃣', color: '#DC2626', textColor: '#FFFFFF', desc: '용기 있고 당당한 3반' },
  team_4: { id: 'team_4', name: '2학년 4반', shortName: '4반', avatar: '4️⃣', color: '#16A34A', textColor: '#FFFFFF', desc: '단합 최고 멋진 4반' }
};

// 백제 공주 대표 명소 특별 뱃지 정의 (150개 실제 영토 ID 매핑)
const HERITAGE_BADGES = {
  'ri_127': { id: 'ri_127', name: '공산성 수호자', icon: '🏰', region: '중학동 (공산성)', desc: '백제 웅진 천도 수도 공산성을 지키는 명예 수호자!' },
  'ri_131': { id: 'ri_131', name: '무령왕의 후예', icon: '👑', region: '웅진동 (무령왕릉원)', desc: '백제 제25대 무령왕릉의 숨겨진 지혜를 계승한 왕의 후예!' },
  'ri_51': { id: 'ri_51', name: '마곡사 산신령', icon: '🌲', region: '사곡면 운암리 (마곡사)', desc: '유네스코 세계유산 태화산 마곡사의 맑은 기운을 품은 수호자!' },
  'ri_148': { id: 'ri_148', name: '구석기 탐험대장', icon: '🪨', region: '월송동 석장리동', desc: '한국 구석기 역사의 요람 석장리 유적을 탐험한 대장!' },
  'ri_2': { id: 'ri_2', name: '수국 꽃의 요정', icon: '🌸', region: '유구읍 유구리 (수국공원)', desc: '유구천 10만 송이 수국정원을 만발하게 만든 꽃의 요정!' },
  'ri_21': { id: 'ri_21', name: '정안 알밤 대왕', icon: '🌰', region: '정안면 평정리 (알밤특구)', desc: '달콤 고소한 대한민국 최고 공주 정안알밤의 지배자!' },
  'ri_91': { id: 'ri_91', name: '갑사 단풍 지킴이', icon: '🍁', region: '계룡면 중장리 (갑사)', desc: '춘마곡 추갑사! 계룡산의 황금빛 단풍을 수호하는 지킴이!' }
};

// 게임 상태
let gameState = {
  status: 'playing', // 'ready', 'playing', 'paused', 'ended'
  settings: {
    gameMode: 'team', // 기본 모드를 'team' (2학년 반 대항전)으로 설정!
    curriculum: 'all', // 'all' (전체), '2-1' (2학년 1학기 복습), '2-2' (2학년 2학기 곱셈구구)
    danRange: 'all', // '2to5', '6to9', 'all'
    conceptMode: 'all', // 'all', or specific concept types
    inputMode: 'both', // 'keypad', 'multiple', 'both'
    questionsPerConquer: 5,
    questionsPerDefense: 3,
    maxShield: 5
  },
  regions: {},
  players: {}, // socketId -> playerInfo
  teams: TEAMS,
  stats: {
    totalSolved: 0,
    totalConquered: 0
  }
};

// 학생별 찍기 방지 1분 쿨타임 잠금 관리 (socketId -> { regionId: unlockTimestamp })
const playerLockouts = {};

// 지역 상태 초기화
function resetRegions() {
  gameState.regions = {};
  INITIAL_REGIONS.forEach(r => {
    gameState.regions[r.id] = {
      ...r,
      ownerId: null,
      ownerName: null,
      ownerColor: null,
      ownerAvatar: null,
      capturedBy: null, // 실제 문제를 맞힌 학생 이름
      capturedById: null,
      shield: 0, // 0 = 중립, 1~5 = 방어막
      isUnderAttack: false
    };
  });
}
resetRegions();

// 영토 인접성 검사 (영토 연계 보너스 +20점 판정)
function checkTerritoryChain(targetRegionId, ownerId) {
  if (!ownerId) return false;
  const target = gameState.regions[targetRegionId];
  if (!target || typeof target.cx !== 'number' || typeof target.cy !== 'number') return false;

  // 이미 내가 차지하고 있는 다른 영토들과의 유클리드 거리 검사
  const myOtherRegions = Object.values(gameState.regions).filter(
    r => r.id !== targetRegionId && r.ownerId === ownerId
  );

  for (const r of myOtherRegions) {
    if (typeof r.cx === 'number' && typeof r.cy === 'number') {
      const dist = Math.hypot(target.cx - r.cx, target.cy - r.cy);
      // 같은 읍면동이거나 중심간 거리가 85 미만이면 인접 판정
      if (dist <= 85 || (target.town && r.town && target.town === r.town)) {
        return true;
      }
    }
  }
  return false;
}

// 퀴즈 문제 출제: 초등 2학년 2학기 7대 개념 검증 문제 은행에서 지역별 무작위 추출
function generateQuiz(settings, count = 5, regionId = '') {
  return getQuestionsForRegion(settings, count, regionId);
}

// 랭킹 계산 (개인전: 개인별 / 반 대항전: 학급별 + 개인 기여도)
function calculateRanking() {
  const isTeamMode = gameState.settings.gameMode === 'team';

  // 1. 플레이어 기본 정보 매핑
  const playerMap = {};
  Object.values(gameState.players).forEach(p => {
    playerMap[p.id] = {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      teamId: p.teamId || null,
      territories: 0,
      totalShield: 0,
      score: p.score || 0,
      badges: p.badges || []
    };
  });

  // 2. 반(학급) 정보 매핑
  const teamMap = {};
  Object.values(TEAMS).forEach(t => {
    teamMap[t.id] = {
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      avatar: t.avatar,
      color: t.color,
      desc: t.desc,
      territories: 0,
      totalShield: 0,
      score: 0,
      members: []
    };
  });

  // 팀원 및 팀 점수 합산
  Object.values(gameState.players).forEach(p => {
    if (p.teamId && teamMap[p.teamId]) {
      teamMap[p.teamId].members.push(p.name);
      teamMap[p.teamId].score += (p.score || 0);
    }
  });

  // 3. 영토 집계
  Object.values(gameState.regions).forEach(r => {
    if (r.ownerId) {
      if (playerMap[r.ownerId]) {
        playerMap[r.ownerId].territories++;
        playerMap[r.ownerId].totalShield += r.shield;
      }
      if (teamMap[r.ownerId]) {
        teamMap[r.ownerId].territories++;
        teamMap[r.ownerId].totalShield += r.shield;
      }
      // 반 대항전 모드일 때 해당 땅을 우리 반을 위해 정복한 학생 개인 기여도 합산
      if (isTeamMode && r.capturedById && playerMap[r.capturedById]) {
        playerMap[r.capturedById].territories++;
      }
    }
  });

  const sortedPlayers = Object.values(playerMap).sort((a, b) => {
    if (b.territories !== a.territories) return b.territories - a.territories;
    if (b.totalShield !== a.totalShield) return b.totalShield - a.totalShield;
    return b.score - a.score;
  });

  const sortedTeams = Object.values(teamMap).sort((a, b) => {
    if (b.territories !== a.territories) return b.territories - a.territories;
    if (b.totalShield !== a.totalShield) return b.totalShield - a.totalShield;
    return b.score - a.score;
  });

  return {
    gameMode: gameState.settings.gameMode,
    isTeamMode,
    teams: sortedTeams,
    players: sortedPlayers,
    list: isTeamMode ? sortedTeams : sortedPlayers
  };
}

// Socket.io 통신 이벤트
io.on('connection', (socket) => {
  console.log(`[접속] 새 소켓 연결: ${socket.id}`);

  // 접속 즉시 현재 게임 모드와 팀 목록 및 시즌 보스 정보를 전송
  socket.emit('init_game_info', {
    gameMode: gameState.settings.gameMode,
    teams: TEAMS,
    boss: seasonManager.getBossInfo()
  });

  // 교사인지 학생인지 등록
  socket.on('join_as_teacher', async (data = {}) => {
    socket.join('teachers');

    let studentUrl = process.env.RENDER_EXTERNAL_URL || `http://${localIp}:${PORT}`;
    if (data.origin && !data.origin.includes('localhost') && !data.origin.includes('127.0.0.1')) {
      studentUrl = data.origin;
    }

    const qrDataUrl = await QRCode.toDataURL(studentUrl);

    socket.emit('init_teacher', {
      localIp,
      port: PORT,
      studentUrl,
      qrDataUrl,
      gameState,
      teams: TEAMS,
      season: seasonManager.getSeasonInfo(),
      boss: seasonManager.getBossInfo(),
      bossTemplates: SEASON_BOSS_TEMPLATES,
      ranking: calculateRanking()
    });
  });

  // 학생 등록
  socket.on('join_student', (profile = {}) => {
    const isTeamMode = gameState.settings.gameMode === 'team';
    const team = (profile.teamId && TEAMS[profile.teamId]) ? TEAMS[profile.teamId] : null;

    const player = {
      id: socket.id,
      name: profile.name || `학생${socket.id.slice(0, 4)}`,
      avatar: profile.avatar || (team ? team.avatar : '🐯'),
      color: (isTeamMode && team) ? team.color : (profile.color || '#FF5252'),
      teamId: team ? team.id : null,
      score: 0,
      solvedCount: 0,
      items: { eraser: 1, shield: 0 },
      badges: []
    };

    gameState.players[socket.id] = player;
    socket.join('students');

    console.log(`[학생 입장] ${player.name} (${player.avatar}, ${player.color}, team: ${player.teamId || '개인'})`);

    // 개인에게 입장 성공 전송 (시즌 정보 및 보스 정보 포함)
    socket.emit('joined_success', {
      player,
      gameState,
      teams: TEAMS,
      season: seasonManager.getSeasonInfo(),
      boss: seasonManager.getBossInfo()
    });

    // 전체에게 상태 갱신 방송
    io.emit('player_list_updated', {
      players: gameState.players,
      ranking: calculateRanking()
    });

    io.emit('broadcast_notice', {
      type: 'join',
      text: (isTeamMode && team) 
        ? `🎉 [${team.name}]에 [${player.name}] 학생이 합류했습니다!`
        : `🎉 [${player.name}] 학생이 입장했습니다!`
    });
  });

  // 역대 명예의 전당 요청
  socket.on('request_hall_of_fame', () => {
    socket.emit('hall_of_fame_data', {
      hallOfFame: seasonManager.data.hallOfFame || []
    });
  });

  // 퀴즈 요청 (어떤 땅을 선택했을 때)
  // 퀴즈 요청 (어떤 땅을 선택했을 때)
  socket.on('request_quiz', ({ regionId }) => {
    // 3스트라이크 오답 쿨타임(1분) 잠금 검사
    const lockedUntil = playerLockouts[socket.id]?.[regionId];
    if (lockedUntil && lockedUntil > Date.now()) {
      const remainSec = Math.ceil((lockedUntil - Date.now()) / 1000);
      socket.emit('challenge_locked', { regionId, remainSec });
      return;
    }

    const region = gameState.regions[regionId];
    if (!region) return;

    const player = gameState.players[socket.id];
    if (!player) return;

    const isTeamMode = (gameState.settings.gameMode === 'team');
    const effectivePlayerKey = (isTeamMode && player.teamId) ? player.teamId : player.id;
    const isOwner = (region.ownerId === effectivePlayerKey);

    const count = isOwner 
      ? gameState.settings.questionsPerDefense 
      : gameState.settings.questionsPerConquer;

    const quizzes = generateQuiz(gameState.settings, count, regionId);

    socket.emit('receive_quiz', {
      regionId,
      regionName: region.name,
      regionIcon: region.icon,
      isOwner,
      isTeamMode,
      targetShield: region.shield,
      quizzes
    });
  });

  // 찍기 방지 3스트라이크 1분 쿨타임 등록
  socket.on('trigger_region_lockout', ({ regionId }) => {
    if (!regionId) return;
    if (!playerLockouts[socket.id]) playerLockouts[socket.id] = {};
    playerLockouts[socket.id][regionId] = Date.now() + 60000;
  });

  // 퀴즈 문제 1개 풀이 완료 기록
  socket.on('solve_single_quiz', ({ isCorrect }) => {
    const player = gameState.players[socket.id];
    if (!player) return;

    if (isCorrect) {
      player.score += 10;
      player.solvedCount += 1;
      gameState.stats.totalSolved += 1;
      io.emit('stats_updated', { stats: gameState.stats, ranking: calculateRanking() });
    }
  });

  // [시즌 보스 레이드] 보스 공격 퀴즈 요청
  socket.on('request_boss_quiz', () => {
    const boss = seasonManager.getBossInfo();
    if (boss.status !== 'raging' || boss.isDefeated) {
      socket.emit('boss_not_active', { boss });
      return;
    }

    const quizzes = generateQuiz(gameState.settings, 1, 'boss');
    socket.emit('receive_boss_quiz', {
      quiz: quizzes[0],
      boss
    });
  });

  // [시즌 보스 레이드] 보스 공격 답안 제출
  socket.on('submit_boss_attack', ({ quizId, answer, chosenVal, streak = 0 }) => {
    const player = gameState.players[socket.id];
    if (!player) return;

    // 연타/광클로 인한 콤보 및 데미지 중복 누적 방지 (동일 퀴즈 1회만 처리)
    if (quizId && player.lastBossQuizId === quizId) {
      return;
    }
    player.lastBossQuizId = quizId;

    const boss = seasonManager.getBossInfo();
    if (boss.status !== 'raging' || boss.isDefeated) {
      socket.emit('boss_not_active', { boss });
      return;
    }

    const isCorrect = (chosenVal === answer);
    if (!isCorrect) {
      socket.emit('boss_attack_result', {
        isCorrect: false,
        damage: 0,
        isCrit: false,
        boss: seasonManager.getBossInfo()
      });
      return;
    }

    // 정답 시 데미지 산출 (7500~13000 HP 레이드 스케일링):
    // 기본 25 데미지 + 연속 콤보 크리티컬 보너스 (2연타: 45, 3연타: 55, 4연타: 65, 5연타 이상: 75~80)
    const currentStreak = (streak || 0) + 1;
    const isCrit = (currentStreak >= 2);
    const damage = isCrit ? Math.min(80, 25 + currentStreak * 10) : 25;

    player.score += Math.min(25, damage);
    player.solvedCount += 1;
    gameState.stats.totalSolved += 1;

    const hitResult = seasonManager.recordBossHit(player, damage, isCrit);
    if (!hitResult) return;

    if (hitResult.defeated) {
      // 🏆 보스 토벌 대성공! 모든 접속 학생에게 특별 뱃지 및 보너스 점수 일괄 수여
      Object.values(gameState.players).forEach(p => {
        p.score += (hitResult.rewardScore || 100);
        if (!p.badges) p.badges = [];
        if (hitResult.rewardBadge && !p.badges.some(b => b.id === hitResult.rewardBadge.id)) {
          p.badges.push(hitResult.rewardBadge);
        }
      });

      io.emit('boss_defeated', {
        boss: hitResult.boss,
        mvp: hitResult.mvp,
        winningTeamId: hitResult.winningTeamId,
        rewardBadge: hitResult.rewardBadge,
        rewardScore: hitResult.rewardScore || 100,
        text: `🎉 [시즌 보스 대격퇴!] 공주시 전역의 학생들이 힘을 합쳐 [${hitResult.boss.name}]을 물리쳤습니다! MVP: [${hitResult.mvp ? hitResult.mvp.name : '공주시 수호대'}]`
      });

      io.emit('ranking_updated', { ranking: calculateRanking() });
      io.emit('stats_updated', { stats: gameState.stats, ranking: calculateRanking() });

      socket.emit('boss_attack_result', {
        isCorrect: true,
        damage: hitResult.actualDamage,
        isCrit: hitResult.isCrit,
        boss: hitResult.boss,
        myScore: player.score,
        nextQuiz: null
      });

    } else {
      // 일반 타격 피격 방송
      io.emit('boss_hit', {
        studentName: player.name,
        avatar: player.avatar,
        color: player.color,
        teamId: player.teamId,
        damage: hitResult.actualDamage,
        isCrit: hitResult.isCrit,
        currentHp: hitResult.boss.currentHp,
        maxHp: hitResult.boss.maxHp,
        hpPercent: hitResult.boss.hpPercent,
        lastHitLog: hitResult.boss.lastHitLog,
        topContributors: hitResult.boss.topContributors,
        teamDamage: hitResult.boss.teamDamage
      });

      io.emit('stats_updated', { stats: gameState.stats, ranking: calculateRanking() });

      const nextQuizzes = generateQuiz(gameState.settings, 1, 'boss');
      socket.emit('boss_attack_result', {
        isCorrect: true,
        damage: hitResult.actualDamage,
        isCrit: hitResult.isCrit,
        boss: hitResult.boss,
        myScore: player.score,
        nextQuiz: nextQuizzes[0]
      });
    }
  });

  // 영토 정복/방어 세트 완료
  socket.on('complete_quiz_challenge', ({ regionId, success, bonusShield }) => {
    // 잠금 상태인 경우 무시
    const lockedUntil = playerLockouts[socket.id]?.[regionId];
    if (lockedUntil && lockedUntil > Date.now()) return;

    const region = gameState.regions[regionId];
    const player = gameState.players[socket.id];
    if (!region || !player || !success) return;

    const isTeamMode = (gameState.settings.gameMode === 'team');
    const team = (isTeamMode && player.teamId) ? TEAMS[player.teamId] : null;

    const effectiveOwnerId = (isTeamMode && team) ? team.id : player.id;
    const effectiveOwnerName = (isTeamMode && team) ? team.name : player.name;
    const effectiveOwnerColor = (isTeamMode && team) ? team.color : player.color;
    const effectiveOwnerAvatar = (isTeamMode && team) ? team.avatar : player.avatar;

    const oldOwnerName = region.ownerName;
    const isOwner = (region.ownerId === effectiveOwnerId);

    let eventType = '';
    let noticeText = '';
    let earnedScore = 0;
    let isChained = false;
    let newlyUnlockedBadge = null;

    if (isOwner) {
      // 1. 자기 땅 (또는 우리 반 땅) 방어력 강화
      if (region.shield < gameState.settings.maxShield) {
        region.shield += 1;
      }
      earnedScore = 50;
      player.score += earnedScore;
      eventType = 'defended';

      noticeText = (isTeamMode && team)
        ? `🛡️ [${player.name}] 학생이 [${team.name}]의 [${region.name}] 방어막을 레벨 ${region.shield}로 올렸습니다!`
        : `🛡️ [${player.name}] 학생이 [${region.name}]의 방어막을 레벨 ${region.shield}로 올렸습니다!`;

    } else if (!region.ownerId) {
      // 2. 빈 땅 새로 점령
      region.ownerId = effectiveOwnerId;
      region.ownerName = effectiveOwnerName;
      region.ownerColor = effectiveOwnerColor;
      region.ownerAvatar = effectiveOwnerAvatar;
      region.capturedBy = player.name;
      region.capturedById = player.id;
      region.shield = 1;

      // 영토 연계 보너스 검사 (+20점)
      isChained = checkTerritoryChain(regionId, effectiveOwnerId);
      earnedScore = 100 + (isChained ? 20 : 0);
      player.score += earnedScore;
      gameState.stats.totalConquered += 1;
      eventType = 'conquered';

      const chainSuffix = isChained ? ' 🔗 [영토 연계 보너스 +20점!]' : '';
      noticeText = (isTeamMode && team)
        ? `🚩 [${team.name}]의 [${player.name}] 학생이 [${region.name}]을 점령했습니다!${chainSuffix}`
        : `🚩 [${player.name}] 학생이 [${region.name}]을 처음으로 점령했습니다!${chainSuffix}`;

    } else {
      // 3. 상대방 땅 공격
      if (region.shield > 1) {
        region.shield -= 1;
        earnedScore = 60;
        player.score += earnedScore;
        eventType = 'attacked';

        noticeText = `💥 [${player.name}] 학생이 [${region.name}]의 방어막을 깎았습니다! (남은 방어막: ${region.shield})`;
      } else {
        // 탈환 성공
        region.ownerId = effectiveOwnerId;
        region.ownerName = effectiveOwnerName;
        region.ownerColor = effectiveOwnerColor;
        region.ownerAvatar = effectiveOwnerAvatar;
        region.capturedBy = player.name;
        region.capturedById = player.id;
        region.shield = 1;

        isChained = checkTerritoryChain(regionId, effectiveOwnerId);
        earnedScore = 150 + (isChained ? 20 : 0);
        player.score += earnedScore;
        gameState.stats.totalConquered += 1;
        eventType = 'captured';

        const chainSuffix = isChained ? ' 🔗 [영토 연계 보너스 +20점!]' : '';
        noticeText = (isTeamMode && team)
          ? `⚡ [${team.name}]의 [${player.name}] 학생이 [${oldOwnerName}]의 [${region.name}]을 빼앗았습니다!${chainSuffix}`
          : `⚡ [${player.name}] 학생이 [${oldOwnerName}] 학생의 [${region.name}]을 빼앗았습니다!${chainSuffix}`;
      }
    }

    // 황금 방패 아이템 사용 시 추가 방어막 +1 부여
    if (bonusShield && (eventType === 'conquered' || eventType === 'captured' || eventType === 'defended')) {
      if (region.shield < gameState.settings.maxShield) {
        region.shield += 1;
        noticeText += ' 🛡️ [황금 방패로 방어막 +1 추가 강화!]';
      }
    }

    // 백제 문화 명소 뱃지 획득 검사
    if ((eventType === 'conquered' || eventType === 'captured') && HERITAGE_BADGES[regionId]) {
      const badgeInfo = HERITAGE_BADGES[regionId];
      if (!player.badges.some(b => b.id === regionId)) {
        player.badges.push(badgeInfo);
        newlyUnlockedBadge = badgeInfo;

        io.emit('broadcast_notice', {
          type: 'badge',
          text: `🏛️ [${player.name}] 학생이 [${region.name}]을 정복하여 명예 [${badgeInfo.icon} ${badgeInfo.name}] 뱃지를 획득했습니다!`
        });
      }
    }

    // 도전 완료한 학생에게 결과 전달 (연계 보너스 & 뱃지)
    socket.emit('challenge_result', {
      success: true,
      regionId,
      eventType,
      earnedScore,
      isChained,
      badge: newlyUnlockedBadge,
      myScore: player.score,
      badges: player.badges
    });

    // 전체 영토 갱신 방송
    io.emit('region_updated', {
      region,
      event: eventType,
      text: noticeText,
      isChained
    });

    // 전체 랭킹 재계산 후 전송
    io.emit('ranking_updated', {
      ranking: calculateRanking()
    });
  });

  // 교사 제어 명령
  socket.on('teacher_control', (data) => {
    const { action, payload } = data;

    switch (action) {
      case 'change_game_mode':
        gameState.settings.gameMode = payload?.gameMode || 'individual';
        resetRegions();
        io.emit('game_mode_changed', {
          gameMode: gameState.settings.gameMode,
          settings: gameState.settings,
          regions: gameState.regions,
          ranking: calculateRanking()
        });
        io.emit('broadcast_notice', {
          type: 'mode_change',
          text: `📢 게임 모드가 [${gameState.settings.gameMode === 'team' ? '2학년 반 대항전 (1~4반)' : '개인전'}]으로 전환되었습니다!`
        });
        break;

      case 'update_settings':
        gameState.settings = { ...gameState.settings, ...payload };
        io.emit('settings_updated', { settings: gameState.settings });
        if (payload.curriculum) {
          const cName = payload.curriculum === '2-1'
            ? '📘 2학년 1학기 복습 (개념 중심)'
            : (payload.curriculum === '2-2' ? '📕 2학년 2학기 곱셈구구 (구구단 중심)' : '🌟 2학년 전체 (1학기 복습 + 2학기 곱셈구구)');
          io.emit('broadcast_notice', {
            type: 'settings_change',
            text: `📢 출제 교육과정이 [${cName}]으로 변경되었습니다!`
          });
        }
        break;

      case 'reset_all_regions':
        resetRegions();
        io.emit('regions_reset', { regions: gameState.regions, ranking: calculateRanking() });
        io.emit('broadcast_notice', { type: 'alert', text: '📢 교사 권한으로 모든 영토가 초기화되었습니다!' });
        break;

      case 'clear_players':
        gameState.players = {};
        resetRegions();
        io.emit('game_reset_full', { gameState });
        break;

      case 'conclude_season':
        const record = seasonManager.concludeSeasonAndStartNew(gameState, calculateRanking);
        resetRegions();
        io.emit('season_ended_and_reset', {
          finishedSeason: record,
          newSeason: seasonManager.getSeasonInfo(),
          regions: gameState.regions,
          ranking: calculateRanking()
        });
        io.emit('broadcast_notice', {
          type: 'season',
          text: `🏆 [제 ${record.season}시즌 마감] 우승: [${record.winningClass.name}]! 새 시즌이 시작되었습니다!`
        });
        break;

      case 'get_hall_of_fame':
        socket.emit('hall_of_fame_data', { hallOfFame: seasonManager.data.hallOfFame || [] });
        break;

      case 'summon_boss': {
        const { maxHp, bossTemplateId } = payload || {};
        const summonedBoss = seasonManager.summonBoss(maxHp, bossTemplateId);
        io.emit('boss_summoned', {
          boss: summonedBoss,
          templates: SEASON_BOSS_TEMPLATES
        });
        io.emit('broadcast_notice', {
          type: 'boss_summon',
          text: `⚠️ [긴급 출동] 공주시에 시즌 보스 [${summonedBoss.icon} ${summonedBoss.name}] 출현! 모든 학생은 지금 바로 협동 토벌전에 참전하세요!`
        });
        break;
      }

      case 'dismiss_boss': {
        const dismissedBoss = seasonManager.dismissBoss();
        io.emit('boss_dismissed', { boss: dismissedBoss });
        io.emit('broadcast_notice', {
          type: 'boss_dismiss',
          text: `🛡️ 선생님에 의해 보스 토벌전이 일시 종료되었습니다.`
        });
        break;
      }

      case 'get_boss_templates':
        socket.emit('boss_templates_data', {
          templates: SEASON_BOSS_TEMPLATES,
          currentBoss: seasonManager.getBossInfo()
        });
        break;
    }
  });

  // 연결 종료
  socket.on('disconnect', () => {
    delete playerLockouts[socket.id];
    if (gameState.players[socket.id]) {
      console.log(`[퇴장] ${gameState.players[socket.id].name}`);
      delete gameState.players[socket.id];
      io.emit('player_list_updated', {
        players: gameState.players,
        ranking: calculateRanking()
      });
    }
  });
});

// 매 10초마다 일요일 시즌 마감 자동 검사 & 시즌 타이머 틱 동기화
setInterval(() => {
  const expiredRecord = seasonManager.checkAndInitSeason(gameState, calculateRanking);
  if (expiredRecord) {
    resetRegions();
    io.emit('season_ended_and_reset', {
      finishedSeason: expiredRecord,
      newSeason: seasonManager.getSeasonInfo(),
      regions: gameState.regions,
      ranking: calculateRanking()
    });
    io.emit('broadcast_notice', {
      type: 'season',
      text: `🏆 [제 ${expiredRecord.season}시즌 정기 마감] 우승: [${expiredRecord.winningClass.name}]! 새로운 ${seasonManager.data.seasonName}이 시작되었습니다!`
    });
  } else {
    io.emit('season_tick', seasonManager.getSeasonInfo());
  }
}, 10000);

// 서버 기동 (듀얼 스택 바인딩으로 IPv4 및 IPv6 localhost 지연 완전 해소)
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  🏰 공주시 곱셈 땅따먹기 대작전 서버 가동 완료!`);
  console.log(`  --------------------------------------------------`);
  console.log(`  [교사용 전자칠판 화면]`);
  console.log(`  👉 http://127.0.0.1:${PORT}/teacher.html`);
  console.log(`  --------------------------------------------------`);
  console.log(`  [학생 접속 주소 (같은 Wi-Fi 접속)]`);
  console.log(`  👉 http://${localIp}:${PORT}`);
  console.log(`====================================================`);
});
