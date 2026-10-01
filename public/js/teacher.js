// 교사용 대시보드 로직
const socket = io();
let teacherMap = null;

document.addEventListener('DOMContentLoaded', () => {
  initTeacherMap();
  initSocket();
  initControls();
});

function initTeacherMap() {
  teacherMap = new window.GongjuMap('teacher-map-container', {
    isTeacher: true,
    onRegionClick: (regionId, data) => {
      console.log('교사 맵 클릭:', regionId, data);
    }
  });
}

function initSocket() {
  socket.emit('join_as_teacher', { origin: window.location.origin });

  socket.on('init_teacher', (data) => {
    // QR코드 및 접속 주소 렌더링
    document.getElementById('teacher-qr-img').src = data.qrDataUrl;
    document.getElementById('teacher-connect-url').textContent = data.studentUrl;

    // 지도 렌더링
    teacherMap.updateRegions(data.gameState.regions);

    // 랭킹 렌더링
    renderRanking(data.ranking);

    // 타이머 렌더링
    updateTimerDisplay(data.gameState.timer.remainingSeconds);
  });

  // 실시간 영토 변화
  socket.on('region_updated', (data) => {
    teacherMap.updateSingleRegion(data.region);
    addBattleLog(data.text);

    if (data.event === 'captured' || data.event === 'conquered') {
      window.soundManager.playConquer();
    } else if (data.event === 'defended') {
      window.soundManager.playShield();
    }
  });

  // 전체 영토 리셋
  socket.on('regions_reset', (data) => {
    teacherMap.updateRegions(data.regions);
    renderRanking(data.ranking);
    addBattleLog('📢 교사 권한으로 모든 영토가 깨끗하게 초기화되었습니다!');
  });

  // 랭킹 업데이트
  socket.on('ranking_updated', (data) => {
    renderRanking(data.ranking);
  });

  socket.on('player_list_updated', (data) => {
    renderRanking(data.ranking);
  });

  // 타이머 틱
  socket.on('timer_tick', (data) => {
    updateTimerDisplay(data.remainingSeconds);
  });

  socket.on('timer_paused', (data) => {
    updateTimerDisplay(data.remainingSeconds);
  });

  socket.on('timer_reset', (data) => {
    updateTimerDisplay(data.remainingSeconds);
  });

  // 게임 종료
  socket.on('game_ended', (data) => {
    window.soundManager.playConquer();
    addBattleLog('🏆 게임 시간이 종료되었습니다! 최종 승자를 확인하세요!');
    renderRanking(data.ranking);
  });
}

// 랭킹 렌더링
function renderRanking(ranking) {
  const container = document.getElementById('ranking-list');
  if (!ranking || ranking.length === 0) {
    container.innerHTML = '<div style="color: #64748B; text-align: center; padding: 20px;">아직 참가한 학생이 없습니다.</div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];

  container.innerHTML = ranking.map((p, idx) => {
    const medalOrNum = medals[idx] || `${idx + 1}`;
    const rankClass = idx < 3 ? `rank-${idx + 1}` : '';

    return `
      <div class="ranking-item ${rankClass}" style="border-left-color: ${p.color};">
        <div class="rank-left">
          <span class="rank-num">${medalOrNum}</span>
          <span class="rank-avatar">${p.avatar}</span>
          <span class="rank-name" style="color: ${p.color};">${p.name}</span>
        </div>
        <div class="rank-stats">
          <span class="badge-lands">🚩 ${p.territories}곳</span>
          <span class="badge-shields">🛡️ ${p.totalShield}</span>
          <span style="color: #FCD34D;">⭐ ${p.score}점</span>
        </div>
      </div>
    `;
  }).join('');
}

// 타이머 표시 포맷팅
function updateTimerDisplay(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const str = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  document.getElementById('timer-display').textContent = str;
}

// 실시간 격전 로그 추가
function addBattleLog(text) {
  const ticker = document.getElementById('battle-ticker');
  ticker.textContent = text;
}

// 교사 컨트롤 버튼 초기화
function initControls() {
  // 타이머 컨트롤
  document.getElementById('btn-timer-start').addEventListener('click', () => {
    window.soundManager.playClick();
    socket.emit('teacher_control', { action: 'start_timer' });
  });

  document.getElementById('btn-timer-pause').addEventListener('click', () => {
    window.soundManager.playClick();
    socket.emit('teacher_control', { action: 'pause_timer' });
  });

  document.getElementById('btn-timer-reset').addEventListener('click', () => {
    window.soundManager.playClick();
    const sel = document.getElementById('select-timer-duration');
    const seconds = parseInt(sel.value, 10) * 60;
    socket.emit('teacher_control', { action: 'reset_timer', payload: { seconds } });
  });

  // 구구단 단원 변경
  document.getElementById('select-dan-range').addEventListener('change', (e) => {
    window.soundManager.playClick();
    socket.emit('teacher_control', {
      action: 'update_settings',
      payload: { danRange: e.target.value }
    });
  });

  // 곱셈 개념 출제 모드 변경
  document.getElementById('select-concept-mode').addEventListener('change', (e) => {
    window.soundManager.playClick();
    socket.emit('teacher_control', {
      action: 'update_settings',
      payload: { conceptMode: e.target.value }
    });
  });

  // 모든 영토 초기화
  document.getElementById('btn-reset-regions').addEventListener('click', () => {
    if (confirm('정말로 모든 학생의 영토 점령 상태를 초기화하시겠습니까?')) {
      window.soundManager.playClick();
      socket.emit('teacher_control', { action: 'reset_all_regions' });
    }
  });
}
