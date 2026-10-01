const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const QRCode = require('qrcode');
const { validateQuestionBank, getQuestionsForRegion } = require('./question_bank');

// 서버 시작 시 문제 은행 100% 무결성 검증 (불변식 검사)
validateQuestionBank();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// 정적 파일 제공
app.use(express.static('public'));

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

// 게임 상태
let gameState = {
  status: 'playing', // 'ready', 'playing', 'paused', 'ended'
  settings: {
    danRange: 'all', // '2to5', '6to9', 'all'
    conceptMode: 'all', // 'all', 'visual', 'concept', 'formula'
    inputMode: 'both', // 'keypad', 'multiple', 'both'
    questionsPerConquer: 5,
    questionsPerDefense: 3,
    maxShield: 5
  },
  timer: {
    running: false,
    remainingSeconds: 600, // 10분
    initialSeconds: 600
  },
  regions: {},
  players: {}, // socketId -> playerInfo
  stats: {
    totalSolved: 0,
    totalConquered: 0
  }
};

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
      shield: 0, // 0 = 중립, 1~5 = 방어막
      isUnderAttack: false
    };
  });
}
resetRegions();

// 퀴즈 문제 출제: 초등 2학년 2학기 7대 개념 검증 문제 은행에서 지역별 무작위 추출
function generateQuiz(settings, count = 5, regionId = '') {
  return getQuestionsForRegion(settings, count, regionId);
}

// 타이머 인터벌
let timerInterval = null;
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  gameState.timer.running = true;
  timerInterval = setInterval(() => {
    if (gameState.timer.remainingSeconds > 0) {
      gameState.timer.remainingSeconds--;
      io.emit('timer_tick', {
        remainingSeconds: gameState.timer.remainingSeconds
      });
    } else {
      gameState.timer.running = false;
      gameState.status = 'ended';
      clearInterval(timerInterval);
      io.emit('game_ended', {
        ranking: calculateRanking()
      });
    }
  }, 1000);
}

function pauseTimer() {
  gameState.timer.running = false;
  if (timerInterval) clearInterval(timerInterval);
  io.emit('timer_paused', { remainingSeconds: gameState.timer.remainingSeconds });
}

function resetTimer(seconds = 600) {
  if (timerInterval) clearInterval(timerInterval);
  gameState.timer.running = false;
  gameState.timer.remainingSeconds = seconds;
  gameState.timer.initialSeconds = seconds;
  io.emit('timer_reset', { remainingSeconds: seconds });
}

// 랭킹 계산 (영토 수 > 방어막 총합 > 정답 수)
function calculateRanking() {
  const rankingMap = {};
  
  // 플레이어 기본 정보 매핑
  Object.values(gameState.players).forEach(p => {
    rankingMap[p.id] = {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      territories: 0,
      totalShield: 0,
      score: p.score || 0
    };
  });

  // 영토 집계
  Object.values(gameState.regions).forEach(r => {
    if (r.ownerId && rankingMap[r.ownerId]) {
      rankingMap[r.ownerId].territories++;
      rankingMap[r.ownerId].totalShield += r.shield;
    }
  });

  const sorted = Object.values(rankingMap).sort((a, b) => {
    if (b.territories !== a.territories) return b.territories - a.territories;
    if (b.totalShield !== a.totalShield) return b.totalShield - a.totalShield;
    return b.score - a.score;
  });

  return sorted;
}

// Socket.io 통신 이벤트
io.on('connection', (socket) => {
  console.log(`[접속] 새 소켓 연결: ${socket.id}`);

  // 교사인지 학생인지 등록
  socket.on('join_as_teacher', async (data = {}) => {
    socket.join('teachers');

    // 클라이언트가 넘겨준 origin이 외부 도메인이면 우선 사용
    let studentUrl = `http://${localIp}:${PORT}`;
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
      ranking: calculateRanking()
    });
  });

  // 학생 등록
  socket.on('join_student', (profile) => {
    // profile = { name, avatar, color }
    const player = {
      id: socket.id,
      name: profile.name || `학생${socket.id.slice(0, 4)}`,
      avatar: profile.avatar || '🐯',
      color: profile.color || '#FF5252',
      score: 0,
      solvedCount: 0
    };

    gameState.players[socket.id] = player;
    socket.join('students');

    console.log(`[학생 입장] ${player.name} (${player.avatar}, ${player.color})`);

    // 개인에게 입장 성공 전송
    socket.emit('joined_success', {
      player,
      gameState
    });

    // 전체에게 상태 갱신 방송
    io.emit('player_list_updated', {
      players: gameState.players,
      ranking: calculateRanking()
    });

    io.emit('broadcast_notice', {
      type: 'join',
      text: `🎉 [${player.name}] 학생이 입장했습니다!`
    });
  });

  // 퀴즈 요청 (어떤 땅을 선택했을 때)
  socket.on('request_quiz', ({ regionId }) => {
    const region = gameState.regions[regionId];
    if (!region) return;

    const player = gameState.players[socket.id];
    if (!player) return;

    const isOwner = (region.ownerId === socket.id);
    const count = isOwner 
      ? gameState.settings.questionsPerDefense 
      : gameState.settings.questionsPerConquer;

    const quizzes = generateQuiz(gameState.settings, count, regionId);

    socket.emit('receive_quiz', {
      regionId,
      regionName: region.name,
      regionIcon: region.icon,
      isOwner,
      targetShield: region.shield,
      quizzes
    });
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

  // 영토 정복/방어 세트 완료
  socket.on('complete_quiz_challenge', ({ regionId, success }) => {
    const region = gameState.regions[regionId];
    const player = gameState.players[socket.id];
    if (!region || !player || !success) return;

    const oldOwnerName = region.ownerName;
    const isOwner = (region.ownerId === socket.id);

    if (isOwner) {
      // 1. 자기 땅 방어력 강화
      if (region.shield < gameState.settings.maxShield) {
        region.shield += 1;
      }
      player.score += 50;

      io.emit('region_updated', {
        region,
        event: 'defended',
        text: `🛡️ [${player.name}] 학생이 [${region.name}]의 방어막을 레벨 ${region.shield}로 올렸습니다!`
      });

    } else if (!region.ownerId) {
      // 2. 빈 땅 새로 점령
      region.ownerId = player.id;
      region.ownerName = player.name;
      region.ownerColor = player.color;
      region.ownerAvatar = player.avatar;
      region.shield = 1; // 기본 방어막 1
      player.score += 100;
      gameState.stats.totalConquered += 1;

      io.emit('region_updated', {
        region,
        event: 'conquered',
        text: `🚩 [${player.name}] 학생이 [${region.name}]을 처음으로 점령했습니다!`
      });

    } else {
      // 3. 상대방 땅 공격
      if (region.shield > 1) {
        // 방어막 1단계 차감
        region.shield -= 1;
        player.score += 60;

        io.emit('region_updated', {
          region,
          event: 'attacked',
          text: `💥 [${player.name}] 학생이 [${region.name}]의 방어막을 깎았습니다! (남은 방어막: ${region.shield})`
        });
      } else {
        // 방어막이 1에서 0으로 떨어지며 탈환 성공!
        region.ownerId = player.id;
        region.ownerName = player.name;
        region.ownerColor = player.color;
        region.ownerAvatar = player.avatar;
        region.shield = 1; // 새 점령자 방어막 1
        player.score += 150;
        gameState.stats.totalConquered += 1;

        io.emit('region_updated', {
          region,
          event: 'captured',
          text: `⚡ [${player.name}] 학생이 [${oldOwnerName}] 학생의 [${region.name}]을 빼앗았습니다!`
        });
      }
    }

    // 전체 랭킹 재계산 후 전송
    io.emit('ranking_updated', {
      ranking: calculateRanking()
    });
  });

  // 교사 제어 명령
  socket.on('teacher_control', (data) => {
    const { action, payload } = data;

    switch (action) {
      case 'start_timer':
        startTimer();
        io.emit('timer_started', { remainingSeconds: gameState.timer.remainingSeconds });
        break;

      case 'pause_timer':
        pauseTimer();
        break;

      case 'reset_timer':
        resetTimer(payload.seconds || 600);
        break;

      case 'update_settings':
        gameState.settings = { ...gameState.settings, ...payload };
        io.emit('settings_updated', { settings: gameState.settings });
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
    }
  });

  // 연결 종료
  socket.on('disconnect', () => {
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

// 서버 기동
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  🏰 공주시 곱셈 땅따먹기 대작전 서버 가동 완료!`);
  console.log(`  --------------------------------------------------`);
  console.log(`  [교사용 전자칠판 화면]`);
  console.log(`  👉 http://localhost:${PORT}/teacher.html`);
  console.log(`  --------------------------------------------------`);
  console.log(`  [학생 접속 주소 (같은 Wi-Fi 접속)]`);
  console.log(`  👉 http://${localIp}:${PORT}`);
  console.log(`====================================================`);
});
