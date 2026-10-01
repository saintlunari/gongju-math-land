// 학생용 클라이언트 로직
const socket = io();

// 전역 상태
let myProfile = {
  name: '',
  avatar: '🐯',
  color: '#FF5252'
};

let currentQuizzes = [];
let currentQuizIndex = 0;
let currentRegionId = null;
let currentInputMode = 'multiple'; // 'multiple' or 'keypad'
let userInputValue = '';
let gongjuMap = null;

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
});

// 1. 로비 초기화 (프로필 설정)
function initLobby() {
  const avatarGrid = document.getElementById('avatar-grid');
  const colorGrid = document.getElementById('color-grid');

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
  document.getElementById('my-name-display').textContent = myProfile.name;
  document.getElementById('my-color-dot').style.backgroundColor = myProfile.color;
}

// 2. 지도 초기화
function initMap() {
  gongjuMap = new window.GongjuMap('map-container', {
    onRegionClick: handleRegionClick
  });
}

// 영토 클릭 시 처리
function handleRegionClick(regionId, regionData) {
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

  const modal = document.getElementById('quiz-modal');
  modal.style.display = 'flex';

  // 헤더 정보
  document.getElementById('quiz-region-name').textContent = `${data.regionIcon} ${data.regionName}`;
  
  let actionTitle = '';
  if (data.isOwner) {
    actionTitle = '🛡️ 내 땅 지키기! (방어막 강화)';
  } else if (!data.targetShield) {
    actionTitle = '🚩 새로운 땅 점령 도전!';
  } else {
    actionTitle = `⚔️ 상대방 땅 공격! (남은 방패: ${data.targetShield})`;
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
  const quiz = currentQuizzes[currentQuizIndex];
  if (!quiz) return;

  const isCorrect = (chosenVal === quiz.answer);
  socket.emit('solve_single_quiz', { isCorrect });

  showFeedback(isCorrect, () => {
    if (isCorrect) {
      currentQuizIndex++;
      if (currentQuizIndex >= currentQuizzes.length) {
        // 모든 문제 정답! 정복/방어 성공
        completeChallengeSuccess();
      } else {
        renderCurrentQuiz();
      }
    } else {
      // 오답 시 숫자 초기화하고 다시 도전
      userInputValue = '';
      document.getElementById('quiz-user-input').textContent = '?';
    }
  });
}

// 정답/오답 애니메이션 피드백
function showFeedback(isCorrect, callback) {
  const feedbackEl = document.getElementById('feedback-overlay');
  const iconEl = document.getElementById('feedback-icon');
  const textEl = document.getElementById('feedback-text');

  if (isCorrect) {
    window.soundManager.playCorrect();
    iconEl.textContent = '⭐';
    textEl.textContent = '정답입니다! 참 잘했어요!';
    textEl.className = 'feedback-text feedback-correct';
  } else {
    window.soundManager.playWrong();
    iconEl.textContent = '💦';
    textEl.textContent = '다시 한 번 생각해볼까요?';
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
  window.soundManager.playConquer();
  socket.emit('complete_quiz_challenge', {
    regionId: currentRegionId,
    success: true
  });

  document.getElementById('quiz-modal').style.display = 'none';
  gongjuMap.setSelectedRegion(null);
}

// 소켓 실시간 이벤트 수신
socket.on('joined_success', (data) => {
  gongjuMap.updateRegions(data.gameState.regions);
});

socket.on('region_updated', (data) => {
  if (data.event === 'captured' || data.event === 'conquered') {
    window.soundManager.playConquer();
  } else if (data.event === 'defended') {
    window.soundManager.playShield();
  }
  gongjuMap.updateSingleRegion(data.region);
  showTicker(data.text);
});

socket.on('regions_reset', (data) => {
  gongjuMap.updateRegions(data.regions);
});

socket.on('broadcast_notice', (data) => {
  showTicker(data.text);
});

socket.on('ranking_updated', (data) => {
  // 내 순위 및 영토 수 확인
  const myRank = data.ranking.find(r => r.id === socket.id);
  if (myRank) {
    document.getElementById('my-territory-count').textContent = myRank.territories;
    document.getElementById('my-score-display').textContent = myRank.score;
  }
});

// 티커 메시지 표시
function showTicker(msg) {
  const ticker = document.getElementById('news-ticker');
  ticker.textContent = msg;
  ticker.style.backgroundColor = '#FFE082';
  setTimeout(() => {
    ticker.style.backgroundColor = '#FFF3E0';
  }, 1200);
}
