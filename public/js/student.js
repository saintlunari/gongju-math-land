// 학생용 클라이언트 로직
const socket = io();

// 전역 상태
let myProfile = {
  name: '',
  avatar: '🐯',
  color: '#2563EB',
  teamId: 'team_1',
  items: {
    eraser: 1, // 오답 지우개 기본 1개 제공
    shield: 0  // 황금 방패
  },
  badges: []
};

let serverGameMode = 'team'; // 'team' (반 대항전) 기본값
let serverTeams = {
  team_1: { id: 'team_1', name: '2학년 1반', shortName: '1반', avatar: '1️⃣', color: '#2563EB' },
  team_2: { id: 'team_2', name: '2학년 2반', shortName: '2반', avatar: '2️⃣', color: '#EA580C' },
  team_3: { id: 'team_3', name: '2학년 3반', shortName: '3반', avatar: '3️⃣', color: '#DC2626' },
  team_4: { id: 'team_4', name: '2학년 4반', shortName: '4반', avatar: '4️⃣', color: '#16A34A' }
};

let myStats = {
  solved: 0,
  correct: 0,
  captured: 0,
  streak: 0,
  maxStreak: 0,
  score: 0
};

let currentQuizzes = [];
let currentQuizIndex = 0;
let currentRegionId = null;
let currentInputMode = 'multiple'; // 'multiple' or 'keypad'
let userInputValue = '';
let gongjuMap = null;
let activeShieldItem = false;
let currentChallengeWrongCount = 0; // 한 영토 5문제 중 오답 횟수 (3번 틀리면 1분 잠금)
const lockedRegions = {}; // { [regionId]: { unlockTime, regionName, intervalId } }

// [시즌 보스 레이드 전역 상태]
let currentBossState = null;
let currentBossQuiz = null;
let bossStreak = 0;
let myBossDamageDealt = 0;
let bossInputMode = 'multiple'; // 'multiple' or 'keypad'
let bossUserInputValue = '';
let isBossSubmitting = false; // 보스 퀴즈 연타 중복 제출 방지 플래그
let isCheckingAnswer = false; // 일반 영토 퀴즈 연타 방지 플래그

// 아바타 목록 16종
const AVATARS = ['🐯', '🐻', '🐰', '🦊', '🐼', '🐶', '🐱', '🦁', '🦄', '👑', '🤴', '🧙', '🐿️', '🐸', '🦉', '🐨'];

// 색상 목록 24색 (초등학생 눈높이 알록달록 팔레트)
const COLORS = [
  '#FF5252', '#FF7043', '#FFA726', '#FFD54F',
  '#66BB6A', '#26A69A', '#26C6DA', '#42A5F5',
  '#5C6BC0', '#7E57C2', '#AB47BC', '#EC407A',
  '#8D6E63', '#D4E157', '#FF8A80', '#FFB74D',
  '#81C784', '#4DB6AC', '#64B5F6', '#7986CB',
  '#BA68C8', '#F06292', '#AED581', '#A1887F'
];

document.addEventListener('DOMContentLoaded', () => {
  initLobby();
  initMap();
  initKeypad();
  initMapControls();
  initStatsAndFeatures();
  initItemsAndBadges();
  initBossRaid();
});

// 1. 로비 초기화 (프로필 및 반 설정)
function renderTeamGrid() {
  const teamGrid = document.getElementById('team-grid');
  if (!teamGrid) return;

  const colorLabels = {
    'team_1': '🔵 파란색 팀',
    'team_2': '🟠 주황색 팀',
    'team_3': '🔴 빨간색 팀',
    'team_4': '🟢 초록색 팀'
  };

  teamGrid.innerHTML = Object.values(serverTeams).map((t, idx) => {
    const isActive = (t.id === myProfile.teamId) || (idx === 0 && !myProfile.teamId);
    const colorLabel = colorLabels[t.id] || `🎨 ${t.color} 팀`;
    return `
      <div class="team-item ${isActive ? 'active' : ''}" data-team="${t.id}" style="--team-color: ${t.color}; border-color: ${t.color};">
        <span class="team-avatar">${t.avatar}</span>
        <div class="team-text-box">
          <span class="team-name">${t.name}</span>
          <span class="team-color-badge" style="background: ${t.color}22; color: ${t.color}; border: 1px solid ${t.color}55;">
            ${colorLabel}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function initLobby() {
  const avatarGrid = document.getElementById('avatar-grid');
  const colorGrid = document.getElementById('color-grid');
  const teamGrid = document.getElementById('team-grid');

  renderTeamGrid();

  // 학급(반) 선택 그리드 클릭 이벤트
  if (teamGrid) {
    teamGrid.addEventListener('click', (e) => {
      const item = e.target.closest('.team-item');
      if (!item) return;
      document.querySelectorAll('.team-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      myProfile.teamId = item.dataset.team;

      const team = serverTeams[myProfile.teamId];
      if (team) {
        myProfile.avatar = team.avatar;
        myProfile.color = team.color;
      }
      window.soundManager.playClick();
    });
  }

  // 아바타 렌더링
  avatarGrid.innerHTML = AVATARS.map((av, idx) => `
    <div class="avatar-item ${idx === 0 ? 'active' : ''}" data-avatar="${av}">${av}</div>
  `).join('');

  avatarGrid.addEventListener('click', (e) => {
    const item = e.target.closest('.avatar-item');
    if (!item) return;
    document.querySelectorAll('.avatar-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    myProfile.avatar = item.dataset.avatar;
    window.soundManager.playClick();
  });

  // 색상 렌더링
  colorGrid.innerHTML = COLORS.map((col, idx) => `
    <div class="color-item ${idx === 0 ? 'active' : ''}" data-color="${col}" style="background-color: ${col};"></div>
  `).join('');

  colorGrid.addEventListener('click', (e) => {
    const item = e.target.closest('.color-item');
    if (!item) return;
    document.querySelectorAll('.color-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    myProfile.color = item.dataset.color;
    window.soundManager.playClick();
  });

  // 시작 버튼
  document.getElementById('btn-join-game').addEventListener('click', () => {
    const nameInput = document.getElementById('input-student-name');
    const name = nameInput.value.trim() || `학생${Math.floor(Math.random() * 90 + 10)}`;
    myProfile.name = name;

    // 반 대항전 모드일 때 해당 반 기본 색상/아바타 자동 반영
    if (serverGameMode === 'team' && serverTeams[myProfile.teamId]) {
      const t = serverTeams[myProfile.teamId];
      myProfile.avatar = myProfile.avatar || t.avatar;
      myProfile.color = t.color;
    }

    window.soundManager.playClick();

    // 서버로 입장 전송
    socket.emit('join_student', myProfile);

    // 모달 닫기 및 내 정보 갱신
    document.getElementById('lobby-modal').style.display = 'none';
    updateProfileUI();
  });
}

// 내 정보 UI 업데이트
function updateProfileUI() {
  document.getElementById('my-avatar-display').textContent = myProfile.avatar;
  document.getElementById('my-color-dot').style.backgroundColor = myProfile.color;

  const nameDisplay = document.getElementById('my-name-display');
  const territoryLabel = document.getElementById('hud-territory-label');

  if (serverGameMode === 'team' && serverTeams[myProfile.teamId]) {
    const t = serverTeams[myProfile.teamId];
    nameDisplay.innerHTML = `<span style="color:${t.color}; font-weight:800;">[${t.name}]</span> ${myProfile.name}`;
    if (territoryLabel) territoryLabel.innerHTML = `🚩 우리 반 땅: <b id="my-territory-count">0</b>곳`;
  } else {
    nameDisplay.textContent = myProfile.name;
    if (territoryLabel) territoryLabel.innerHTML = `🚩 내 땅: <b id="my-territory-count">0</b>곳`;
  }

  updateItemBadges();
  renderBadgePouch();
}

// 2. 지도 초기화
function initMap() {
  gongjuMap = new window.GongjuMap('map-container', {
    onRegionClick: handleRegionClick,
    onBossClick: (boss) => {
      enterBossRaid();
    }
  });

  // 새로고침 시 이전에 걸려있던 1분 잠금 상태 복원
  setTimeout(() => {
    restoreLockedRegionsFromStorage();
  }, 100);
}

// 영토 클릭 시 처리
function handleRegionClick(regionId, regionData) {
  // 1분 잠금 상태 확인 (3스트라이크 오답 페널티)
  if (isRegionLocked(regionId)) {
    const remainSec = getRemainingLockSeconds(regionId);
    const regName = (regionData && (regionData.fullName || regionData.name)) || (gongjuMap?.regionsData?.[regionId]?.name) || '이 영토';
    showLockoutModal(regName, remainSec, regionId);
    window.soundManager.playWrong();
    showTicker(`⛔ [${regName}] 3번 오답 페널티로 ${remainSec}초 동안 도전할 수 없습니다!`);
    return;
  }

  currentRegionId = regionId;
  gongjuMap.setSelectedRegion(regionId);

  // 서버에 퀴즈 문제 요청
  socket.emit('request_quiz', { regionId });
}

// 퀴즈 수신
socket.on('receive_quiz', (data) => {
  currentQuizzes = data.quizzes;
  currentQuizIndex = 0;
  userInputValue = '';
  currentChallengeWrongCount = 0; // 새 영토 도전 시작 시 오답 수 초기화
  updateStrikeDots(0);

  const modal = document.getElementById('quiz-modal');
  modal.style.display = 'flex';

  // 헤더 정보
  document.getElementById('quiz-region-name').textContent = `${data.regionIcon} ${data.regionName}`;
  
  let actionTitle = '';
  if (data.isOwner) {
    const nextShield = Math.min(5, (data.targetShield || 1) + 1);
    actionTitle = `🛡️ 내 땅 지키기! (방어막 강화 Lv.${data.targetShield || 1} ➔ Lv.${nextShield})`;
  } else if (!data.targetShield) {
    actionTitle = '🚩 새로운 땅 점령 도전! (방어막 Lv.1 획득)';
  } else {
    actionTitle = `⚔️ 상대방 땅 공격! (현재 상대 방어막: Lv.${data.targetShield})`;
  }
  document.getElementById('quiz-action-type').textContent = actionTitle;

  renderCurrentQuiz();
});

// 현재 문제 렌더링
function renderCurrentQuiz() {
  const quiz = currentQuizzes[currentQuizIndex];
  if (!quiz) return;

  // 진행 점 렌더링
  const progressContainer = document.getElementById('quiz-progress');
  progressContainer.innerHTML = currentQuizzes.map((_, idx) => {
    let cls = 'progress-dot';
    if (idx < currentQuizIndex) cls += ' done';
    else if (idx === currentQuizIndex) cls += ' active';
    return `<div class="${cls}"></div>`;
  }).join('');

  // 7대 개념 및 시각화 데이터 렌더링
  const conceptBadge = document.getElementById('quiz-concept-badge');
  const questionText = document.getElementById('quiz-question-text');
  const visualBox = document.getElementById('quiz-visual-box');

  if (conceptBadge) conceptBadge.textContent = quiz.category || '곱셈구구';
  if (questionText) questionText.textContent = quiz.title || '문제를 풀어보세요!';

  if (visualBox) {
    if (quiz.visual) {
      visualBox.style.display = 'block';
      visualBox.textContent = quiz.visual;
    } else {
      visualBox.style.display = 'none';
    }
  }

  document.getElementById('quiz-subtitle').textContent = quiz.subTitle || '다음 식의 답을 구해보세요';
  document.getElementById('quiz-formula').textContent = quiz.formula;

  userInputValue = '';
  document.getElementById('quiz-user-input').textContent = '?';

  // 모드에 따라 UI 전환
  const multipleContainer = document.getElementById('multiple-options');
  const keypadContainer = document.getElementById('keypad-container');

  if (currentInputMode === 'multiple') {
    multipleContainer.style.display = 'grid';
    keypadContainer.style.display = 'none';

    multipleContainer.innerHTML = quiz.options.map(opt => `
      <button class="multiple-btn" data-val="${opt}">${opt}</button>
    `).join('');

    multipleContainer.querySelectorAll('.multiple-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        checkAnswer(parseInt(btn.dataset.val, 10));
      });
    });
  } else {
    multipleContainer.style.display = 'none';
    keypadContainer.style.display = 'block';
  }
}

// 키패드 초기화
function initKeypad() {
  const keypad = document.getElementById('keypad-container');
  keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('.key-btn');
    if (!btn) return;
    window.soundManager.playClick();

    const val = btn.dataset.val;
    if (val === 'clear') {
      userInputValue = '';
    } else if (val === 'submit') {
      if (userInputValue) {
        checkAnswer(parseInt(userInputValue, 10));
      }
      return;
    } else {
      if (userInputValue.length < 3) {
        userInputValue += val;
      }
    }
    document.getElementById('quiz-user-input').textContent = userInputValue || '?';
  });

  // 모드 전환 토글
  document.getElementById('btn-mode-multiple').addEventListener('click', () => {
    currentInputMode = 'multiple';
    toggleModeButtons();
    renderCurrentQuiz();
  });

  document.getElementById('btn-mode-keypad').addEventListener('click', () => {
    currentInputMode = 'keypad';
    toggleModeButtons();
    renderCurrentQuiz();
  });

  // 퀴즈 닫기
  document.getElementById('btn-close-quiz').addEventListener('click', () => {
    document.getElementById('quiz-modal').style.display = 'none';
    gongjuMap.setSelectedRegion(null);
  });
}

function toggleModeButtons() {
  document.getElementById('btn-mode-multiple').classList.toggle('active', currentInputMode === 'multiple');
  document.getElementById('btn-mode-keypad').classList.toggle('active', currentInputMode === 'keypad');
}

// 정답 체크
function checkAnswer(chosenVal) {
  if (isCheckingAnswer) return;
  isCheckingAnswer = true;

  // 정답 연타 방지: 보기 버튼 및 키패드 즉시 비활성화
  document.querySelectorAll('#quiz-multiple-options .multiple-btn').forEach(btn => {
    btn.disabled = true;
    btn.style.pointerEvents = 'none';
  });

  const quiz = currentQuizzes[currentQuizIndex];
  if (!quiz) {
    isCheckingAnswer = false;
    return;
  }

  const isCorrect = (chosenVal === quiz.answer);
  socket.emit('solve_single_quiz', { isCorrect });

  myStats.solved++;
  if (isCorrect) {
    myStats.correct++;
    myStats.streak++;
    if (myStats.streak > myStats.maxStreak) {
      myStats.maxStreak = myStats.streak;
    }
    // 콤보 보너스 점수
    const comboBonus = myStats.streak >= 2 ? (myStats.streak * 5) : 0;
    myStats.score += 10 + comboBonus;

    if (myStats.streak >= 2) {
      window.soundManager.playCombo(myStats.streak);
      showComboPopup(myStats.streak, comboBonus);
    }

    // 3의 배수 연속 콤보 달성 시 찬스 아이템 획득!
    if (myStats.streak > 0 && myStats.streak % 3 === 0) {
      const isEraser = Math.random() < 0.6;
      if (isEraser) {
        myProfile.items.eraser++;
        showTicker(`🎁 ${myStats.streak}연속 콤보 달성! 🪄 [오답 지우개] 찬스를 획득했습니다!`);
      } else {
        myProfile.items.shield++;
        showTicker(`🎁 ${myStats.streak}연속 콤보 달성! 🛡️ [황금 방패] 찬스를 획득했습니다!`);
      }
      updateItemBadges();
    }
    updateStatsUI();

    showFeedback(true, () => {
      isCheckingAnswer = false;
      currentQuizIndex++;
      if (currentQuizIndex >= currentQuizzes.length) {
        // 모든 문제 정답! 정복/방어 성공
        completeChallengeSuccess();
      } else {
        renderCurrentQuiz();
      }
    });
  } else {
    // 오답 처리 (찍기 방지 3스트라이크)
    myStats.streak = 0;
    currentChallengeWrongCount++;
    updateStatsUI();
    updateStrikeDots(currentChallengeWrongCount);

    if (currentChallengeWrongCount >= 3) {
      // 3번 오답 페널티 발동! 1분 동안 잠금
      showFeedback(false, () => {
        isCheckingAnswer = false;
        handleThreeStrikesLockout(currentRegionId);
      }, '⛔ 3번 오답! 1분간 도전이 제한됩니다!');
      return;
    }

    const remainStrikes = 3 - currentChallengeWrongCount;
    showFeedback(false, () => {
      // 오답 시 숫자 초기화하고 다시 도전
      userInputValue = '';
      document.getElementById('quiz-user-input').textContent = '?';
      document.querySelectorAll('#quiz-multiple-options .multiple-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
      });
      isCheckingAnswer = false;
      showTicker(`⚠️ 오답입니다! (남은 기회: ${remainStrikes}번, 3번 틀리면 1분간 잠김)`);
    }, `오답입니다! (남은 기회: ${remainStrikes}번)`);
  }
}

// 정답/오답 애니메이션 피드백
function showFeedback(isCorrect, callback, customText) {
  const feedbackEl = document.getElementById('feedback-overlay');
  const iconEl = document.getElementById('feedback-icon');
  const textEl = document.getElementById('feedback-text');

  if (isCorrect) {
    window.soundManager.playCorrect();
    iconEl.textContent = '⭐';
    textEl.textContent = customText || '정답입니다! 참 잘했어요!';
    textEl.className = 'feedback-text feedback-correct';
  } else {
    window.soundManager.playWrong();
    iconEl.textContent = '💦';
    textEl.textContent = customText || '다시 한 번 생각해볼까요?';
    textEl.className = 'feedback-text feedback-wrong';
  }

  feedbackEl.style.display = 'flex';
  setTimeout(() => {
    feedbackEl.style.display = 'none';
    if (callback) callback();
  }, 900);
}

// 챌린지 성공 완료
function completeChallengeSuccess() {
  myStats.captured++;
  updateStatsUI();
  window.soundManager.playConquer();
  fireConfetti(); // 축하 폭죽 연출

  socket.emit('complete_quiz_challenge', {
    regionId: currentRegionId,
    success: true,
    bonusShield: activeShieldItem
  });

  activeShieldItem = false;
  document.getElementById('quiz-modal').style.display = 'none';
  gongjuMap.setSelectedRegion(null);
}

// 3. 지도 조작 컨트롤 바 초기화
function initMapControls() {
  document.getElementById('map-btn-zoom-in')?.addEventListener('click', () => {
    window.soundManager.playClick();
    if (gongjuMap) gongjuMap.zoomIn();
  });

  document.getElementById('map-btn-zoom-out')?.addEventListener('click', () => {
    window.soundManager.playClick();
    if (gongjuMap) gongjuMap.zoomOut();
  });

  document.getElementById('map-btn-home')?.addEventListener('click', () => {
    window.soundManager.playClick();
    if (!gongjuMap || !gongjuMap.regionsData) return;
    const targetOwnerId = (serverGameMode === 'team' && myProfile.teamId) ? myProfile.teamId : socket.id;
    const myRegions = Object.values(gongjuMap.regionsData).filter(r => r.ownerId === targetOwnerId);
    if (myRegions.length > 0) {
      gongjuMap.focusRegion(myRegions[0].id);
      showTicker(`🏠 ${serverGameMode === 'team' ? '우리 반' : '내'} 영토 [${myRegions[0].name}]로 이동했습니다!`);
    } else {
      showTicker('🚩 아직 차지한 땅이 없어요! 빈 땅을 눌러 문제를 풀어보세요!');
    }
  });

  document.getElementById('map-btn-reset')?.addEventListener('click', () => {
    window.soundManager.playClick();
    if (gongjuMap) gongjuMap.resetView();
  });

  // 사운드 On/Off 토글
  document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
    const isUnmuted = window.soundManager.toggleMute();
    document.getElementById('btn-sound-toggle').textContent = isUnmuted ? '🔊' : '🔇';
    showTicker(isUnmuted ? '🔊 효과음이 켜졌습니다.' : '🔇 효과음이 꺼졌습니다.');
  });
}

// 4. 탐험 대시보드 및 추천 기능 초기화
function initStatsAndFeatures() {
  document.getElementById('btn-suggest-region')?.addEventListener('click', () => {
    window.soundManager.playClick();
    suggestNextRegion();
  });
}

// 다음 추천 영토 찾기
function suggestNextRegion() {
  if (!gongjuMap || !gongjuMap.regionsData) return;
  const allRegions = Object.values(gongjuMap.regionsData);
  // 잠겨있지 않은 영토만 후보로 선정
  const unlocked = allRegions.filter(r => !isRegionLocked(r.id));
  if (unlocked.length === 0) {
    showTicker('🔒 모든 도전 가능한 땅이 잠겨 있습니다. 잠시 후 다시 시도해보세요!');
    return;
  }
  // 아직 빈 땅(중립) 우선 추천
  const neutral = unlocked.filter(r => !r.ownerId);
  const targetPool = neutral.length > 0 ? neutral : unlocked;

  const target = targetPool[Math.floor(Math.random() * targetPool.length)];
  if (!target) return;

  gongjuMap.focusRegion(target.id, 400);
  gongjuMap.highlightSuggest(target.id);
  showTicker(`🎯 [추천 영토] ${target.fullName || target.name}를 공략해보세요!`);
}

// 연속 콤보 팝업 연출
function showComboPopup(streak, bonus) {
  const popup = document.getElementById('combo-popup');
  const textEl = document.getElementById('combo-text');
  if (!popup || !textEl) return;

  textEl.textContent = `${streak}연속 콤보!`;
  popup.style.display = 'flex';
  popup.classList.add('combo-bounce');

  setTimeout(() => {
    popup.style.display = 'none';
    popup.classList.remove('combo-bounce');
  }, 1400);
}

// 탐험 기록 UI 갱신
function updateStatsUI() {
  const solvedEl = document.getElementById('stat-solved');
  const correctEl = document.getElementById('stat-correct');
  const capturedEl = document.getElementById('stat-captured');
  const streakEl = document.getElementById('stat-best-streak');

  if (solvedEl) solvedEl.textContent = myStats.solved;
  if (correctEl) correctEl.textContent = myStats.correct;
  if (capturedEl) capturedEl.textContent = myStats.captured;
  if (streakEl) streakEl.textContent = myStats.maxStreak;

  // 헤더 streak 뱃지
  const streakBadge = document.getElementById('hud-streak-badge');
  const streakVal = document.getElementById('hud-streak-val');
  if (streakBadge && streakVal) {
    if (myStats.streak >= 2) {
      streakVal.textContent = myStats.streak;
      streakBadge.style.display = 'inline-flex';
    } else {
      streakBadge.style.display = 'none';
    }
  }
}

// 축하 폭죽(Confetti) 연출
function fireConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const particles = [];
  const colors = ['#FF5252', '#FFD54F', '#4CAF50', '#2196F3', '#AB47BC', '#FF4081', '#00E676'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * 180,
      y: canvas.height * 0.45,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.75) * 18,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      alpha: 1
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.38; // 중력
      p.rotation += p.vRot;
      p.alpha -= 0.012;

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    frame++;
    if (alive && frame < 120) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }
  requestAnimationFrame(animate);
}

// 5. 아이템 및 백제 명소 뱃지 기능 초기화
function initItemsAndBadges() {
  updateItemBadges();

  // 오답 지우개 찬스 버튼
  document.getElementById('btn-use-eraser')?.addEventListener('click', () => {
    if (myProfile.items.eraser <= 0) {
      showTicker('🪄 지우개 찬스가 없습니다! 3연속 콤보를 달성해 획득해보세요!');
      return;
    }
    const currentQuiz = currentQuizzes[currentQuizIndex];
    if (!currentQuiz || currentInputMode !== 'multiple') {
      showTicker('🪄 오답 지우개는 4지선다형 모드에서 사용할 수 있습니다!');
      return;
    }

    const buttons = Array.from(document.querySelectorAll('.multiple-btn:not(.item-eliminated)'));
    const wrongButtons = buttons.filter(btn => parseInt(btn.dataset.val, 10) !== currentQuiz.answer);

    if (wrongButtons.length <= 1) {
      showTicker('🪄 이미 오답이 지워졌거나 정답만 남아있습니다!');
      return;
    }

    // 2개 랜덤 제거
    const toEliminate = wrongButtons.sort(() => 0.5 - Math.random()).slice(0, 2);
    toEliminate.forEach(btn => {
      btn.classList.add('item-eliminated');
      btn.disabled = true;
    });

    myProfile.items.eraser--;
    updateItemBadges();
    window.soundManager.playCorrect();
    showTicker('🪄 오답 지우개 찬스 발동! 4지선다 오답 2개가 사라졌습니다!');
  });

  // 황금 방패 찬스 버튼
  document.getElementById('btn-use-shield')?.addEventListener('click', () => {
    if (myProfile.items.shield <= 0) {
      showTicker('🛡️ 황금 방패 찬스가 없습니다! 3연속 콤보를 달성해 획득해보세요!');
      return;
    }
    if (activeShieldItem) {
      showTicker('🛡️ 이미 황금 방패 찬스가 적용 중입니다!');
      return;
    }
    myProfile.items.shield--;
    activeShieldItem = true;
    updateItemBadges();
    window.soundManager.playShield();
    showTicker('🛡️ 황금 방패 활성화! 이번 도전 성공 시 방어막 레벨이 +1 추가 강화됩니다!');
  });

  // 뱃지 모달 닫기 버튼
  document.getElementById('btn-close-badge-modal')?.addEventListener('click', () => {
    document.getElementById('badge-modal').style.display = 'none';
    window.soundManager.playClick();
  });
}

function updateItemBadges() {
  const eraserBadge = document.getElementById('badge-item-eraser');
  const shieldBadge = document.getElementById('badge-item-shield');
  if (eraserBadge) eraserBadge.textContent = myProfile.items.eraser;
  if (shieldBadge) shieldBadge.textContent = myProfile.items.shield;
}

// 명소 뱃지 획득 축하 팝업 모달
function showBadgeUnlockModal(badge) {
  if (!badge) return;
  const modal = document.getElementById('badge-modal');
  const icon = document.getElementById('badge-modal-icon');
  const name = document.getElementById('badge-modal-name');
  const desc = document.getElementById('badge-modal-desc');

  if (icon) icon.textContent = badge.icon;
  if (name) name.textContent = badge.name;
  if (desc) desc.textContent = `${badge.desc} (${badge.region})`;

  if (modal) {
    modal.style.display = 'flex';
    window.soundManager.playConquer();
    fireConfetti();
  }
}

// 획득한 뱃지 파우치 헤더에 렌더링
function renderBadgePouch() {
  const pouch = document.getElementById('my-badge-pouch');
  if (!pouch) return;
  if (!myProfile.badges || myProfile.badges.length === 0) {
    pouch.innerHTML = '';
    return;
  }
  pouch.innerHTML = myProfile.badges.map(b => `
    <span class="badge-ribbon-item" title="${b.name}: ${b.desc} (${b.region})">
      <span class="badge-ribbon-icon">${b.icon}</span>
      <span class="badge-ribbon-name">${b.name}</span>
    </span>
  `).join('');
}

// 영토 연계 보너스 축하 HUD 연출
function showChainBonusPopup() {
  const chainBadge = document.getElementById('hud-chain-badge');
  if (chainBadge) {
    chainBadge.style.display = 'inline-flex';
    chainBadge.classList.add('combo-bounce');
    setTimeout(() => {
      chainBadge.classList.remove('combo-bounce');
    }, 1500);
  }
  showTicker('🔗 영토 연계 성공! 내 세력과 이어져 +20점 보너스를 받았습니다!');
}

// 게임 모드에 따른 로비 및 HUD 조정
function adaptGameModeUI(mode) {
  const teamGroup = document.getElementById('team-select-group');
  const avatarGroup = document.getElementById('individual-avatar-group');
  const colorGroup = document.getElementById('individual-color-group');

  if (mode === 'team') {
    if (teamGroup) teamGroup.style.display = 'block';
    if (avatarGroup) avatarGroup.style.display = 'block';
    if (colorGroup) colorGroup.style.display = 'none';
  } else {
    if (teamGroup) teamGroup.style.display = 'none';
    if (avatarGroup) avatarGroup.style.display = 'block';
    if (colorGroup) colorGroup.style.display = 'block';
  }
  updateProfileUI();
}

// 서버 접속 즉시 현재 게임 모드 및 팀 목록 동기화 (로비 화면 준비)
socket.on('init_game_info', (data) => {
  if (data.gameMode) serverGameMode = data.gameMode;
  if (data.teams) serverTeams = data.teams;
  renderTeamGrid();
  adaptGameModeUI(serverGameMode);
  if (data.boss) {
    updateStudentBossBanner(data.boss);
  }
});

// 소켓 실시간 이벤트 수신 (입장 완료)
socket.on('joined_success', (data) => {
  serverGameMode = data.gameState.settings.gameMode || 'team';
  if (data.teams) serverTeams = data.teams;
  renderTeamGrid();
  adaptGameModeUI(serverGameMode);
  gongjuMap.updateRegions(data.gameState.regions);
  if (data.season) {
    updateStudentSeasonDisplay(data.season);
  }
  if (data.boss) {
    updateStudentBossBanner(data.boss);
  }
});

// 시즌 실시간 틱 수신
socket.on('season_tick', (seasonInfo) => {
  updateStudentSeasonDisplay(seasonInfo);
  if (seasonInfo.boss) {
    updateStudentBossBanner(seasonInfo.boss);
  }
});

// [시즌 보스 레이드] 보스 소환 이벤트 수신
socket.on('boss_summoned', (data) => {
  updateStudentBossBanner(data.boss);
  updateBossModalUI(data.boss);
  window.soundManager.playBossRoar();
  showTicker(`⚠️ [긴급] 공주시에 시즌 보스 [${data.boss.icon} ${data.boss.name}] 출현! 협동 토벌전에 참여하세요!`);
});

// [시즌 보스 레이드] 보스 피격 동기화
socket.on('boss_hit', (data) => {
  updateStudentBossBanner(data);
  updateBossModalUI(data);
  const fill = document.getElementById('boss-card-hp-fill');
  const nums = document.getElementById('boss-card-hp-text');
  const pct = document.getElementById('boss-card-hp-pct');
  if (fill) fill.style.width = `${data.hpPercent}%`;
  if (nums) nums.textContent = `${data.currentHp} / ${data.maxHp} HP`;
  if (pct) pct.textContent = `${data.hpPercent}%`;
});

// [시즌 보스 레이드] 보스 퀴즈 수신
socket.on('receive_boss_quiz', (data) => {
  currentBossQuiz = data.quiz;
  updateBossModalUI(data.boss);
  renderBossQuiz();
});

// [시즌 보스 레이드] 보스 공격 결과 수신
socket.on('boss_attack_result', (data) => {
  if (data.isCorrect) {
    bossStreak++;
    myBossDamageDealt += data.damage;
    const streakEl = document.getElementById('boss-my-streak');
    const dmgEl = document.getElementById('boss-my-dmg');
    if (streakEl) streakEl.textContent = `${bossStreak}연타`;
    if (dmgEl) dmgEl.textContent = `${myBossDamageDealt} HP`;

    showBossHitFx(data.damage, data.isCrit);
    window.soundManager.playBossHit(data.isCrit);
    updateBossModalUI(data.boss);
    updateStudentBossBanner(data.boss);

    if (data.myScore !== undefined) {
      document.getElementById('my-score-display').textContent = data.myScore;
    }

    if (data.nextQuiz) {
      currentBossQuiz = data.nextQuiz;
      setTimeout(renderBossQuiz, 350);
    } else {
      isBossSubmitting = false;
    }
  } else {
    bossStreak = 0;
    const streakEl = document.getElementById('boss-my-streak');
    if (streakEl) streakEl.textContent = '0연타';
    window.soundManager.playWrong();

    showFeedback(false, () => {
      // 오답 피드백 완료 후 보기 버튼 및 키패드 재활성화
      document.querySelectorAll('#boss-multiple-options .boss-opt-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
      });
      const padSubmit = document.querySelector('#boss-keypad-container .key-btn[data-val="submit"]');
      if (padSubmit) {
        padSubmit.disabled = false;
        padSubmit.style.pointerEvents = 'auto';
      }
      isBossSubmitting = false;
    }, '공격이 빗나갔습니다! 다시 조준해보세요!');

    bossUserInputValue = '';
    const display = document.getElementById('boss-user-input');
    if (display) display.textContent = '?';
  }
});

// [시즌 보스 레이드] 보스 토벌 성공 수신
socket.on('boss_defeated', (data) => {
  const modal = document.getElementById('boss-raid-modal');
  if (modal) modal.style.display = 'none';
  showStudentBossVictory(data);
  updateStudentBossBanner(data.boss);
  showTicker(data.text);
});

// [시즌 보스 레이드] 보스 중지 수신
socket.on('boss_dismissed', (data) => {
  const modal = document.getElementById('boss-raid-modal');
  if (modal) modal.style.display = 'none';
  updateStudentBossBanner(data.boss);
  showTicker('🛡️ 보스 토벌전이 일시 종료되었습니다.');
});

socket.on('boss_not_active', (data) => {
  showTicker('⚔️ 현재 진행 중인 보스 토벌전이 없습니다.');
  const modal = document.getElementById('boss-raid-modal');
  if (modal) modal.style.display = 'none';
});

// 시즌 정기/수동 마감 및 새 시즌 개막
socket.on('season_ended_and_reset', (data) => {
  gongjuMap.updateRegions(data.regions);
  updateStudentSeasonDisplay(data.newSeason);

  document.getElementById('my-territory-count').textContent = '0';
  showSeasonConcludeModal(data.finishedSeason, data.newSeason);
  fireConfetti();
  window.soundManager.playConquer();
});

// 명예의 전당 데이터 수신
socket.on('hall_of_fame_data', (data) => {
  renderStudentHallOfFame(data.hallOfFame || []);
});

socket.on('region_updated', (data) => {
  if (data.event === 'captured' || data.event === 'conquered') {
    window.soundManager.playConquer();
  } else if (data.event === 'defended') {
    window.soundManager.playShield();
  } else if (data.event === 'attacked') {
    window.soundManager.playWrong();
  }
  gongjuMap.updateSingleRegion(data.region);
  if (data.region && data.region.id) {
    gongjuMap.triggerRealtimePop(data.region.id, data.event);
  }
  showTicker(data.text);
});

socket.on('game_mode_changed', (data) => {
  serverGameMode = data.gameMode;
  gongjuMap.updateRegions(data.regions);
  adaptGameModeUI(data.gameMode);
  showTicker(`📢 게임 모드가 [${data.gameMode === 'team' ? '2학년 반 대항전 (1~4반)' : '개인전'}]으로 전환되었습니다!`);
});

socket.on('challenge_result', (data) => {
  if (data.isChained) {
    showChainBonusPopup();
  }
  if (data.badge) {
    showBadgeUnlockModal(data.badge);
  }
  if (data.badges) {
    myProfile.badges = data.badges;
    renderBadgePouch();
  }
});

socket.on('regions_reset', (data) => {
  gongjuMap.updateRegions(data.regions);
});

socket.on('broadcast_notice', (data) => {
  showTicker(data.text);
});

socket.on('ranking_updated', (data) => {
  const isTeam = (serverGameMode === 'team');
  if (isTeam && data.ranking.teams) {
    const myTeam = data.ranking.teams.find(t => t.id === myProfile.teamId);
    if (myTeam) {
      document.getElementById('my-territory-count').textContent = myTeam.territories;
      document.getElementById('my-score-display').textContent = myTeam.score;
    }
  } else {
    const players = data.ranking.players || data.ranking;
    const myRank = players.find(r => r.id === socket.id);
    if (myRank) {
      document.getElementById('my-territory-count').textContent = myRank.territories;
      document.getElementById('my-score-display').textContent = myRank.score;
    }
  }
});

// 티커 메시지 표시
function showTicker(msg) {
  const ticker = document.getElementById('news-ticker');
  if (!ticker) return;
  ticker.textContent = msg;
  ticker.style.backgroundColor = '#FFE082';
  setTimeout(() => {
    ticker.style.backgroundColor = '#FFF3E0';
  }, 1800);
}

// 학생 상단 시즌 및 D-Day 타이머 갱신
function updateStudentSeasonDisplay(season) {
  if (!season) return;
  const titleEl = document.getElementById('student-season-title');
  const ddayEl = document.getElementById('student-season-dday');

  if (titleEl) {
    titleEl.textContent = `👑 제 ${season.currentSeason}시즌`;
  }
  if (ddayEl) {
    ddayEl.textContent = `⏳ 일요일 23:59 리셋 (${season.remainingFormatted || '계산 중...'})`;
  }
}

// 학생 명예의 전당 모달 열기 및 렌더링
function renderStudentHallOfFame(hallOfFame) {
  const modal = document.getElementById('student-hof-modal');
  const container = document.getElementById('student-hof-list');
  if (!modal || !container) return;

  if (!hallOfFame || hallOfFame.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #64748B; padding: 36px 12px;">
        <div style="font-size: 3rem; margin-bottom: 8px;">🏆</div>
        <div style="font-size: 1.05rem; font-weight: bold; color: #1E293B; margin-bottom: 4px;">아직 마감된 시즌 기록이 없습니다.</div>
        <div style="font-size: 0.85rem;">이번 주 일요일 밤 23:59:59에 첫 번째 우승반이 탄생합니다! 열심히 땅을 넓혀보세요!</div>
      </div>
    `;
  } else {
    container.innerHTML = hallOfFame.map((record) => {
      const winner = record.winningClass || { name: '집계 없음', avatar: '🏫', color: '#3B82F6', territories: 0, score: 0 };
      const endedDate = record.endedAt ? new Date(record.endedAt).toLocaleDateString('ko-KR') : '';

      return `
        <div style="background: #F8FAFC; border: 2px solid #F59E0B; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 800; font-size: 1rem; color: #D97706;">👑 제 ${record.season}시즌 우승</span>
            <span style="font-size: 0.75rem; color: #94A3B8;">${endedDate} 마감</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; background: white; border-radius: 10px; padding: 10px; border: 1px solid #E2E8F0;">
            <span style="font-size: 1.8rem;">${winner.avatar || '🏫'}</span>
            <div style="flex: 1;">
              <div style="font-size: 1.1rem; font-weight: 900; color: ${winner.color || '#2563EB'};">${winner.name}</div>
              <div style="font-size: 0.8rem; color: #475569; margin-top: 2px;">
                🚩 점령한 땅: <b>${winner.territories}곳</b> / 150곳 | ⭐ 점수: <b>${winner.score}점</b>
              </div>
            </div>
          </div>
          ${record.mvpStudent && record.mvpStudent.name !== '집계 없음' ? `
            <div style="font-size: 0.75rem; color: #0284C7; background: #E0F2FE; padding: 5px 8px; border-radius: 6px;">
              🎖️ <b>시즌 MVP:</b> ${record.mvpStudent.name} (${record.mvpStudent.territories}곳 점령, ${record.mvpStudent.score}점)
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  modal.style.display = 'flex';
}

// 시즌 종료 팝업 모달 표시
function showSeasonConcludeModal(finishedSeason, newSeason) {
  const modal = document.getElementById('season-conclude-modal');
  const title = document.getElementById('conclude-modal-title');
  const winner = document.getElementById('conclude-modal-winner');
  const desc = document.getElementById('conclude-modal-desc');

  if (!modal) return;

  if (title) title.textContent = `👑 제 ${finishedSeason.season}시즌 마감!`;
  if (winner) {
    const w = finishedSeason.winningClass || { name: '집계 완료' };
    winner.innerHTML = `🥇 <span style="color:${w.color || '#2563EB'}">${w.name}</span> 최종 우승!`;
  }
  if (desc) {
    desc.innerHTML = `한 주간의 치열했던 영토 대항전이 종료되었습니다!<br>새로운 <b>${newSeason.seasonName || `제 ${newSeason.currentSeason}시즌`}</b>이 시작되어 모든 영토가 0으로 리셋되었습니다!`;
  }

  modal.style.display = 'flex';
}

// 시즌 관련 학생 버튼 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
  // 명예의 전당 열기
  document.getElementById('btn-student-hof')?.addEventListener('click', () => {
    window.soundManager.playClick();
    socket.emit('request_hall_of_fame');
  });

  // 명예의 전당 닫기
  document.getElementById('btn-close-student-hof')?.addEventListener('click', () => {
    window.soundManager.playClick();
    const modal = document.getElementById('student-hof-modal');
    if (modal) modal.style.display = 'none';
  });

  // 시즌 종료 팝업 닫기
  document.getElementById('btn-close-conclude-modal')?.addEventListener('click', () => {
    window.soundManager.playClick();
    const modal = document.getElementById('season-conclude-modal');
    if (modal) modal.style.display = 'none';
  });

  // 1분 잠금 안내 모달 닫기
  document.getElementById('btn-close-lockout-modal')?.addEventListener('click', () => {
    window.soundManager.playClick();
    const modal = document.getElementById('lockout-modal');
    if (modal) modal.style.display = 'none';
  });
});

// ==========================================================
// 찍기 방지 3스트라이크 1분 쿨타임 잠금 관련 함수
// ==========================================================

// 찍기 방지 3스트라이크 기회 표시기 갱신
function updateStrikeDots(wrongCount) {
  const dotsEl = document.getElementById('quiz-strike-dots');
  if (!dotsEl) return;
  if (wrongCount <= 0) {
    dotsEl.textContent = '🟢 🟢 🟢';
  } else if (wrongCount === 1) {
    dotsEl.textContent = '🟢 🟢 🔴';
  } else if (wrongCount === 2) {
    dotsEl.textContent = '🟢 🔴 🔴';
  } else {
    dotsEl.textContent = '🔴 🔴 🔴';
  }
}

// 3번 오답 시 1분 쿨타임 잠금 처리
function handleThreeStrikesLockout(regionId) {
  if (!regionId) return;

  // 퀴즈 모달 닫기 및 지도 선택 해제
  const quizModal = document.getElementById('quiz-modal');
  if (quizModal) quizModal.style.display = 'none';
  if (gongjuMap) gongjuMap.setSelectedRegion(null);

  const regionData = gongjuMap?.regionsData?.[regionId];
  const regionName = regionData?.fullName || regionData?.name || '해당 영토';

  // 서버에 쿨타임 등록 요청
  socket.emit('trigger_region_lockout', { regionId });

  // 클라이언트 60초 잠금 및 타이머 개시
  lockRegionForOneMinute(regionId, regionName, 60);

  // 안내 모달 표시
  showLockoutModal(regionName, 60, regionId);

  window.soundManager.playWrong();
  showTicker(`⛔ [${regionName}] 3번 오답 페널티로 1분 동안 잠깁니다! (빨간색 표시)`);
}

// 영토 1분 잠금 실행 (빨간색 표시 및 카운트다운 타이머)
function lockRegionForOneMinute(regionId, regionName, durationSec = 60) {
  if (!regionId) return;
  const unlockTime = Date.now() + (durationSec * 1000);

  // 기존 타이머가 작동 중이면 정리
  if (lockedRegions[regionId] && lockedRegions[regionId].intervalId) {
    clearInterval(lockedRegions[regionId].intervalId);
  }

  // 지도에 빨간색 및 타이머 뱃지 적용
  if (gongjuMap) {
    gongjuMap.setRegionLockout(regionId, true, durationSec);
  }

  const intervalId = setInterval(() => {
    const now = Date.now();
    const remainSec = Math.max(0, Math.ceil((unlockTime - now) / 1000));

    // 잠금 모달이 열려있고 해당 영토일 때 모달 타이머 텍스트 갱신
    const modal = document.getElementById('lockout-modal');
    if (modal && modal.style.display !== 'none' && modal.dataset.regionId === regionId) {
      const timerEl = document.getElementById('lockout-modal-timer');
      if (timerEl) timerEl.textContent = `${remainSec}초 남음 (빨간색 표시)`;
    }

    // 지도 뱃지 카운트다운 갱신
    if (gongjuMap) {
      gongjuMap.updateLockoutTimer(regionId, remainSec);
    }

    if (remainSec <= 0) {
      // 1분 만료 -> 잠금 해제!
      clearInterval(intervalId);
      delete lockedRegions[regionId];
      saveLockedRegionsToStorage();

      if (gongjuMap) {
        gongjuMap.setRegionLockout(regionId, false);
      }

      if (modal && modal.dataset.regionId === regionId) {
        modal.style.display = 'none';
      }

      showTicker(`🔓 [${regionName}] 1분 잠금이 해제되었습니다! 이제 다시 도전할 수 있습니다!`);
      window.soundManager.playCorrect();
    }
  }, 1000);

  lockedRegions[regionId] = {
    unlockTime,
    regionName,
    intervalId
  };

  saveLockedRegionsToStorage();
}

// 해당 영토가 잠겨있는지 여부 판정
function isRegionLocked(regionId) {
  if (!regionId || !lockedRegions[regionId]) return false;
  if (Date.now() >= lockedRegions[regionId].unlockTime) {
    if (lockedRegions[regionId].intervalId) {
      clearInterval(lockedRegions[regionId].intervalId);
    }
    delete lockedRegions[regionId];
    saveLockedRegionsToStorage();
    if (gongjuMap) gongjuMap.setRegionLockout(regionId, false);
    return false;
  }
  return true;
}

// 잠금 남은 시간(초) 반환
function getRemainingLockSeconds(regionId) {
  if (!regionId || !lockedRegions[regionId]) return 0;
  return Math.max(0, Math.ceil((lockedRegions[regionId].unlockTime - Date.now()) / 1000));
}

// 1분 잠금 안내 모달 표시
function showLockoutModal(regionName, remainSec = 60, regionId = '') {
  const modal = document.getElementById('lockout-modal');
  if (!modal) return;
  modal.dataset.regionId = regionId || currentRegionId || '';
  const nameEl = document.getElementById('lockout-modal-region-name');
  const timerEl = document.getElementById('lockout-modal-timer');
  if (nameEl) nameEl.textContent = regionName || '해당 영토';
  if (timerEl) timerEl.textContent = `${remainSec}초 남음 (빨간색 표시)`;
  modal.style.display = 'flex';
}

// 세션 스토리지 저장 (새로고침 F5 꼼수 방지)
function saveLockedRegionsToStorage() {
  try {
    const data = {};
    const now = Date.now();
    for (const [rid, item] of Object.entries(lockedRegions)) {
      if (item.unlockTime > now) {
        data[rid] = {
          unlockTime: item.unlockTime,
          regionName: item.regionName
        };
      }
    }
    sessionStorage.setItem('gongju_locked_regions', JSON.stringify(data));
  } catch (e) {
    // sessionStorage 오류 무시
  }
}

// 세션 스토리지에서 잠금 목록 복원
function restoreLockedRegionsFromStorage() {
  try {
    const raw = sessionStorage.getItem('gongju_locked_regions');
    if (!raw) return;
    const data = JSON.parse(raw);
    const now = Date.now();
    for (const [rid, item] of Object.entries(data)) {
      if (item && item.unlockTime > now) {
        const remainSec = Math.ceil((item.unlockTime - now) / 1000);
        lockRegionForOneMinute(rid, item.regionName || '영토', remainSec);
      }
    }
  } catch (e) {
    // 파싱 오류 무시
  }
}

// 서버에서 잠금 알림 수신 (중복/서버 검증 응답)
socket.on('challenge_locked', (data) => {
  const regionId = data.regionId;
  const remainSec = data.remainSec || data.remainingSeconds || 60;
  const regName = gongjuMap?.regionsData?.[regionId]?.fullName || gongjuMap?.regionsData?.[regionId]?.name || '해당 영토';
  lockRegionForOneMinute(regionId, regName, remainSec);
  showLockoutModal(regName, remainSec, regionId);
  showTicker(data.message || `⛔ [${regName}] 3번 오답 페널티로 ${remainSec}초 동안 도전할 수 없습니다!`);
  window.soundManager.playWrong();
});

// ==========================================================
// [시즌 보스 레이드 (PVE 협동 모드)] 클라이언트 로직
// ==========================================================

function initBossRaid() {
  // 참전 버튼
  document.getElementById('btn-enter-boss-raid')?.addEventListener('click', () => {
    window.soundManager.playClick();
    enterBossRaid();
  });

  // 닫기 / 후퇴 버튼
  document.getElementById('btn-close-boss-modal')?.addEventListener('click', () => {
    window.soundManager.playClick();
    const modal = document.getElementById('boss-raid-modal');
    if (modal) modal.style.display = 'none';
  });

  // 모드 전환 버튼
  document.getElementById('btn-boss-mode-mul')?.addEventListener('click', () => {
    window.soundManager.playClick();
    bossInputMode = 'multiple';
    toggleBossModeButtons();
    renderBossQuiz();
  });
  document.getElementById('btn-boss-mode-pad')?.addEventListener('click', () => {
    window.soundManager.playClick();
    bossInputMode = 'keypad';
    toggleBossModeButtons();
    renderBossQuiz();
  });

  // 오답 지우개 찬스
  document.getElementById('btn-boss-eraser')?.addEventListener('click', () => {
    if (myProfile.items.eraser <= 0) {
      showTicker('🪄 지우개 찬스가 부족합니다! 콤보를 달성해 획득해보세요!');
      return;
    }
    if (!currentBossQuiz || bossInputMode !== 'multiple') {
      showTicker('🪄 오답 지우개는 4지선다형 모드에서 사용할 수 있습니다!');
      return;
    }
    const buttons = Array.from(document.querySelectorAll('#boss-multiple-options .multiple-btn:not(.item-eliminated)'));
    const wrongButtons = buttons.filter(btn => parseInt(btn.dataset.val, 10) !== currentBossQuiz.answer);
    if (wrongButtons.length <= 1) return;

    wrongButtons.sort(() => 0.5 - Math.random()).slice(0, 2).forEach(btn => {
      btn.classList.add('item-eliminated');
      btn.disabled = true;
    });

    myProfile.items.eraser--;
    updateItemBadges();
    updateBossEraserCount();
    window.soundManager.playCorrect();
    showTicker('🪄 오답 지우개 찬스 발동! 오답 2개가 사라졌습니다!');
  });

  // 보스 전용 키패드 터치 바인딩
  const keypad = document.getElementById('boss-keypad-container');
  if (keypad) {
    keypad.addEventListener('click', (e) => {
      const btn = e.target.closest('.key-btn');
      if (!btn) return;
      window.soundManager.playClick();
      const val = btn.dataset.val;
      if (val === 'clear') {
        bossUserInputValue = '';
      } else if (val === 'submit') {
        if (bossUserInputValue) {
          submitBossAttackAnswer(parseInt(bossUserInputValue, 10));
        }
        return;
      } else {
        if (bossUserInputValue.length < 3) {
          bossUserInputValue += val;
        }
      }
      const display = document.getElementById('boss-user-input');
      if (display) display.textContent = bossUserInputValue || '?';
    });
  }

  // 승리 모달 닫기
  document.getElementById('btn-close-student-boss-vic')?.addEventListener('click', () => {
    window.soundManager.playClick();
    const modal = document.getElementById('student-boss-victory-modal');
    if (modal) modal.style.display = 'none';
  });
}

// 상단 보스 배너 UI 및 지도 위 보스 마커 갱신
function updateStudentBossBanner(boss) {
  if (!boss) return;
  currentBossState = boss;

  // 지도 위에 출현 지역 보스 마커 실시간 표시/동기화
  if (gongjuMap) {
    gongjuMap.setBoss(boss);
  }

  const banner = document.getElementById('student-boss-banner');
  if (!banner) return;

  const isRaging = (boss.status === 'raging');
  banner.style.display = isRaging ? 'flex' : 'none';

  if (isRaging) {
    const iconEl = document.getElementById('sbb-icon');
    const titleEl = document.getElementById('sbb-title');
    const fillEl = document.getElementById('sbb-hp-fill');
    const textEl = document.getElementById('sbb-hp-text');

    if (iconEl) iconEl.textContent = boss.icon || '🐉';
    if (titleEl) titleEl.textContent = boss.name || '시즌 보스';
    if (fillEl) fillEl.style.width = `${boss.hpPercent || 0}%`;
    if (textEl) textEl.textContent = `${boss.currentHp} / ${boss.maxHp} HP (${boss.hpPercent}%)`;
  }
}

// 보스 모달 상단 정보 갱신
function updateBossModalUI(boss) {
  if (!boss) return;
  const iconEl = document.getElementById('boss-card-icon');
  const nameEl = document.getElementById('boss-card-name');
  const locEl = document.getElementById('boss-card-loc');
  const fillEl = document.getElementById('boss-card-hp-fill');
  const textEl = document.getElementById('boss-card-hp-text');
  const pctEl = document.getElementById('boss-card-hp-pct');

  if (iconEl) iconEl.textContent = boss.icon || '🐉';
  if (nameEl) nameEl.textContent = boss.name || '시즌 보스';
  if (locEl) locEl.textContent = boss.location || '공주시';
  if (fillEl) fillEl.style.width = `${boss.hpPercent || 0}%`;
  if (textEl) textEl.textContent = `${boss.currentHp} / ${boss.maxHp} HP`;
  if (pctEl) pctEl.textContent = `${boss.hpPercent || 0}%`;
}

// 보스 토벌전 입장
function enterBossRaid() {
  const modal = document.getElementById('boss-raid-modal');
  if (!modal) return;
  updateBossModalUI(currentBossState);
  updateBossEraserCount();
  modal.style.display = 'flex';
  socket.emit('request_boss_quiz');
}

// 지우개 개수 갱신
function updateBossEraserCount() {
  const el = document.getElementById('boss-eraser-count');
  if (el) el.textContent = myProfile.items.eraser;
}

// 모드 토글 버튼 UI
function toggleBossModeButtons() {
  document.getElementById('btn-boss-mode-mul')?.classList.toggle('active', bossInputMode === 'multiple');
  document.getElementById('btn-boss-mode-pad')?.classList.toggle('active', bossInputMode === 'keypad');
}

// 보스 퀴즈 렌더링
function renderBossQuiz() {
  isBossSubmitting = false; // 새 문제 렌더링 시 연타 방지 플래그 해제
  if (!currentBossQuiz) return;
  const quiz = currentBossQuiz;

  const conceptBadge = document.getElementById('boss-quiz-concept');
  const formulaEl = document.getElementById('boss-quiz-formula');
  const visualEl = document.getElementById('boss-quiz-visual');
  const inputDisplay = document.getElementById('boss-user-input');
  const mulGrid = document.getElementById('boss-multiple-options');
  const padContainer = document.getElementById('boss-keypad-container');

  if (conceptBadge) conceptBadge.textContent = quiz.category || '곱셈구구';
  if (formulaEl) formulaEl.textContent = quiz.formula || '식을 계산하세요';
  if (visualEl) {
    if (quiz.visual) {
      visualEl.textContent = quiz.visual;
      visualEl.style.display = 'block';
    } else {
      visualEl.style.display = 'none';
    }
  }

  bossUserInputValue = '';
  if (inputDisplay) inputDisplay.textContent = '?';

  if (bossInputMode === 'multiple') {
    if (mulGrid) {
      mulGrid.style.display = 'grid';
      mulGrid.innerHTML = (quiz.options || []).map(opt => `
        <button class="multiple-btn boss-opt-btn" data-val="${opt}">${opt}</button>
      `).join('');

      mulGrid.querySelectorAll('.multiple-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          submitBossAttackAnswer(parseInt(btn.dataset.val, 10));
        });
      });
    }
    if (padContainer) padContainer.style.display = 'none';
    if (inputDisplay) inputDisplay.style.display = 'none';
  } else {
    if (mulGrid) mulGrid.style.display = 'none';
    if (padContainer) padContainer.style.display = 'block';
    if (inputDisplay) inputDisplay.style.display = 'block';
  }
}

// 보스 공격 답안 전송 (연타 및 콤보 중복 누적 완벽 방지)
function submitBossAttackAnswer(chosenVal) {
  if (isBossSubmitting || !currentBossQuiz) return;
  isBossSubmitting = true;

  // 버튼 즉시 비활성화 (정답을 빠르게 여러 번 눌러 콤보가 중복 쌓이는 현상 차단)
  document.querySelectorAll('#boss-multiple-options .boss-opt-btn').forEach(btn => {
    btn.disabled = true;
    btn.style.pointerEvents = 'none';
  });
  const padSubmit = document.querySelector('#boss-keypad-container .key-btn[data-val="submit"]');
  if (padSubmit) {
    padSubmit.disabled = true;
    padSubmit.style.pointerEvents = 'none';
  }

  socket.emit('submit_boss_attack', {
    quizId: currentBossQuiz.id,
    answer: currentBossQuiz.answer,
    chosenVal,
    streak: bossStreak
  });
}

// 보스 타격 피격 이펙트
function showBossHitFx(damage, isCrit) {
  const fx = document.getElementById('boss-hit-fx');
  const text = document.getElementById('boss-hit-text');
  const avatarBox = document.getElementById('boss-avatar-box');
  if (!fx || !text) return;

  text.textContent = isCrit ? `🔥 -${damage} HP! 크리티컬!!` : `💥 -${damage} HP!`;
  text.className = isCrit ? 'boss-hit-text crit-hit' : 'boss-hit-text';
  fx.style.display = 'flex';

  if (avatarBox) {
    avatarBox.classList.remove('boss-avatar-shake');
    void avatarBox.offsetWidth;
    avatarBox.classList.add('boss-avatar-shake');
    setTimeout(() => avatarBox.classList.remove('boss-avatar-shake'), 600);
  }

  setTimeout(() => {
    fx.style.display = 'none';
  }, 900);
}

// 보스 토벌 승리 모달
function showStudentBossVictory(data) {
  const modal = document.getElementById('student-boss-victory-modal');
  if (!modal) return;

  const iconEl = document.getElementById('sb-vic-icon');
  const titleEl = document.getElementById('sb-vic-title');
  const descEl = document.getElementById('sb-vic-desc');
  const badgeIcon = document.getElementById('sb-vic-badge-icon');
  const badgeName = document.getElementById('sb-vic-badge-name');

  if (iconEl && data.boss) iconEl.textContent = data.boss.icon || '🐉';
  if (titleEl && data.boss) titleEl.textContent = `${data.boss.name} 토벌 완료!`;
  if (descEl) {
    const mvpText = data.mvp ? `시즌 MVP: <b>${data.mvp.name}</b> (${data.mvp.damage} DMG)` : '';
    descEl.innerHTML = `모든 친구들이 힘을 합쳐 거대 보스를 격퇴했습니다!<br>${mvpText}`;
  }
  if (data.rewardBadge) {
    if (badgeIcon) badgeIcon.textContent = data.rewardBadge.icon;
    if (badgeName) badgeName.textContent = data.rewardBadge.name;

    // 내 프로필에 뱃지 추가
    if (!myProfile.badges) myProfile.badges = [];
    if (!myProfile.badges.some(b => b.id === data.rewardBadge.id)) {
      myProfile.badges.push(data.rewardBadge);
      renderBadgePouch();
    }
  }

  modal.style.display = 'flex';
  fireConfetti();
  window.soundManager.playBossVictory();
}
