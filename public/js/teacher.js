// 교사용 대시보드 로직
const socket = io();
let teacherMap = null;

// 백제 공주 명소 뱃지 메타데이터
const HERITAGE_BADGES = {
  'ri_127': { name: '공산성 수호자', icon: '🏰', desc: '백제 웅진 천도 수도 공산성을 지키는 명예 수호자!' },
  'ri_131': { name: '무령왕의 후예', icon: '👑', desc: '백제 제25대 무령왕릉의 숨겨진 지혜를 계승한 왕의 후예!' },
  'ri_51': { name: '마곡사 산신령', icon: '🌲', desc: '유네스코 세계유산 태화산 마곡사의 맑은 기운을 품은 수호자!' },
  'ri_148': { name: '구석기 탐험대장', icon: '🪨', desc: '한국 구석기 역사의 요람 석장리 유적을 탐험한 대장!' },
  'ri_2': { name: '수국 꽃의 요정', icon: '🌸', desc: '유구천 10만 송이 수국정원을 만발하게 만든 꽃의 요정!' },
  'ri_21': { name: '정안 알밤 대왕', icon: '🌰', desc: '달콤 고소한 대한민국 최고 공주 정안알밤의 지배자!' },
  'ri_91': { name: '갑사 단풍 지킴이', icon: '🍁', desc: '춘마곡 추갑사! 계룡산의 황금빛 단풍을 수호하는 지킴이!' }
};

document.addEventListener('DOMContentLoaded', () => {
  initTeacherMap();
  initSocket();
  initControls();
});

function initTeacherMap() {
  teacherMap = new window.GongjuMap('teacher-map-container', {
    isTeacher: true,
    onRegionClick: (regionId, data) => {
      handleTeacherRegionClick(regionId, data);
    },
    onBossClick: (boss) => {
      if (boss && boss.regionId) {
        teacherMap?.focusRegion(boss.regionId, 360);
      }
    }
  });

  // 초기 렌더링 직후 컨테이너 크기에 맞춰 공주시 150곳 최적 크기로 꽉 채움
  setTimeout(() => {
    teacherMap?.fitToContainer();
  }, 60);
}

// 교사용 영토 팝아웃 및 상세 카드 인터랙션 핸들러
function handleTeacherRegionClick(regionId, data, allowToggle = true) {
  const card = document.getElementById('teacher-region-card');
  if (!card) return;

  // 같은 영토를 다시 누르면 팝아웃 해제 및 카드 닫기 (토글)
  if (allowToggle && teacherMap.selectedRegionId === regionId && card.style.display !== 'none') {
    teacherMap.setSelectedRegion(null);
    card.style.display = 'none';
    return;
  }

  // 1. 지도상에서 3D 팝아웃 및 스케일업 효과 적용
  teacherMap.setSelectedRegion(regionId);

  // 2. 영토 데이터 추출
  const regInfo = data || teacherMap.getRegion(regionId) || {};
  const isConquered = !!regInfo.ownerId;

  // 3. 플로팅 카드 UI 요소 바인딩
  const iconEl = document.getElementById('tr-card-icon');
  const nameEl = document.getElementById('tr-card-name');
  const ownerEl = document.getElementById('tr-card-owner');
  const shieldEl = document.getElementById('tr-card-shield');
  const playerEl = document.getElementById('tr-card-player');
  const heritageRow = document.getElementById('tr-card-heritage-row');
  const heritageEl = document.getElementById('tr-card-heritage');

  if (iconEl) iconEl.textContent = isConquered ? (regInfo.ownerAvatar || '👑') : (regInfo.icon || '📍');
  if (nameEl) nameEl.textContent = regInfo.fullName || `${regInfo.town || ''} ${regInfo.name || ''}`;

  if (ownerEl) {
    if (isConquered) {
      ownerEl.textContent = `🚩 ${regInfo.ownerName} 점령`;
      ownerEl.style.background = regInfo.ownerColor || '#2563EB';
      ownerEl.style.color = '#FFFFFF';
    } else {
      ownerEl.textContent = '⚪ 아직 미점령 (자유 영토)';
      ownerEl.style.background = '#334155';
      ownerEl.style.color = '#94A3B8';
    }
  }

  if (shieldEl) {
    if (isConquered) {
      shieldEl.textContent = `레벨 ${regInfo.shield || 1} / 5 (최대 5)`;
      shieldEl.style.color = (regInfo.shield >= 3) ? '#F59E0B' : '#38BDF8';
    } else {
      shieldEl.textContent = '방어막 없음';
      shieldEl.style.color = '#64748B';
    }
  }

  if (playerEl) {
    if (regInfo.capturedBy) {
      playerEl.textContent = `${regInfo.capturedBy} 학생`;
      playerEl.style.color = '#F1F5F9';
    } else {
      playerEl.textContent = '아직 없음';
      playerEl.style.color = '#64748B';
    }
  }

  const heritage = HERITAGE_BADGES[regionId];
  if (heritageRow && heritageEl) {
    if (heritage) {
      heritageRow.style.display = 'flex';
      heritageEl.textContent = `${heritage.icon} ${heritage.name}`;
      heritageEl.title = heritage.desc;
    } else {
      heritageRow.style.display = 'none';
    }
  }

  card.style.display = 'flex';
}

function initSocket() {
  socket.emit('join_as_teacher', { origin: window.location.origin });

  socket.on('init_teacher', (data) => {
    // QR코드 및 접속 주소 렌더링
    document.getElementById('teacher-qr-img').src = data.qrDataUrl;
    document.getElementById('teacher-connect-url').textContent = data.studentUrl;

    // 게임 모드 설정 반영
    const mode = data.gameState.settings.gameMode || 'individual';
    const modeSelect = document.getElementById('select-game-mode');
    if (modeSelect) modeSelect.value = mode;
    updateModeBadge(mode);

    // 구구단 단원 및 타이머 설정 반영
    if (document.getElementById('select-dan-range')) {
      document.getElementById('select-dan-range').value = data.gameState.settings.danRange || 'all';
    }
    if (document.getElementById('select-concept-mode')) {
      document.getElementById('select-concept-mode').value = data.gameState.settings.conceptMode || 'all';
    }

    // 지도 렌더링
    teacherMap.updateRegions(data.gameState.regions);

    // 랭킹 렌더링
    renderRanking(data.ranking);

    // 주간 시즌 정보 렌더링
    if (data.season) {
      updateSeasonDisplay(data.season);
    }

    // 시즌 보스 정보 초기 렌더링
    if (data.boss) {
      updateBossHUD(data.boss);
    }
  });

  // 시즌 실시간 틱 동기화 (보스 정보 포함)
  socket.on('season_tick', (seasonInfo) => {
    updateSeasonDisplay(seasonInfo);
    if (seasonInfo.boss) {
      updateBossHUD(seasonInfo.boss);
    }
  });

  // [시즌 보스 레이드] 보스 소환 이벤트 수신
  socket.on('boss_summoned', (data) => {
    updateBossHUD(data.boss);
    window.soundManager.playBossRoar();
    addBattleLog(`⚠️ [긴급 출동] 공주시에 거대 시즌 보스 [${data.boss.icon} ${data.boss.name}] 출현! (HP: ${data.boss.maxHp})`);
  });

  // [시즌 보스 레이드] 보스 타격 피격 수신
  socket.on('boss_hit', (data) => {
    const overlay = document.getElementById('teacher-boss-overlay');
    const bar = document.getElementById('tb-hp-bar');
    const nums = document.getElementById('tb-hp-nums');
    const pct = document.getElementById('tb-hp-pct');
    const tickerText = document.getElementById('tb-ticker-text');

    if (bar) bar.style.width = `${data.hpPercent}%`;
    if (nums) nums.textContent = `${data.currentHp} / ${data.maxHp} HP`;
    if (pct) pct.textContent = `${data.hpPercent}%`;

    const critText = data.isCrit ? ' 🔥 [크리티컬!]' : '';
    if (tickerText) {
      tickerText.innerHTML = `💥 <b>[${data.studentName}]</b> 학생의 곱셈 공격! <b>-${data.damage} HP</b>${critText}`;
    }

    // 보스 HUD 타격 흔들림 연출
    if (overlay) {
      overlay.classList.remove('boss-shake');
      void overlay.offsetWidth;
      overlay.classList.add('boss-shake');
      setTimeout(() => overlay.classList.remove('boss-shake'), 600);
    }

    window.soundManager.playBossHit(data.isCrit);

    // MVP 표시 갱신
    if (data.topContributors && data.topContributors.length > 0) {
      const top = data.topContributors[0];
      const mvpNameEl = document.getElementById('tb-mvp-name');
      const mvpDmgEl = document.getElementById('tb-mvp-dmg');
      if (mvpNameEl) mvpNameEl.textContent = top.name;
      if (mvpDmgEl) mvpDmgEl.textContent = top.damage;
    }
  });

  // [시즌 보스 레이드] 보스 토벌 성공 수신
  socket.on('boss_defeated', (data) => {
    updateBossHUD(data.boss);
    window.soundManager.playBossVictory();
    showBossDefeatedVictory(data);
    addBattleLog(`🎉 [토벌 대성공] ${data.text}`);
  });

  // [시즌 보스 레이드] 보스 중지 수신
  socket.on('boss_dismissed', (data) => {
    updateBossHUD(data.boss);
    addBattleLog('🛡️ 교사 권한으로 보스 토벌전이 일시 종료되었습니다.');
  });

  // 시즌 종료 & 새 시즌 자동/수동 리셋
  socket.on('season_ended_and_reset', (data) => {
    teacherMap.setSelectedRegion(null);
    const card = document.getElementById('teacher-region-card');
    if (card) card.style.display = 'none';

    teacherMap.updateRegions(data.regions);
    renderRanking(data.ranking);
    updateSeasonDisplay(data.newSeason);
    window.soundManager.playConquer();

    const winnerName = data.finishedSeason?.winningClass?.name || '집계 완료';
    const alertMsg = `🏆 [제 ${data.finishedSeason.season}시즌 마감]\n영예의 우승반: ${winnerName}!\n새로운 ${data.newSeason.seasonName}이 시작되어 모든 영토가 0으로 초기화되었습니다!`;
    alert(alertMsg);
    addBattleLog(`👑 [시즌 마감] 우승: ${winnerName}! 역대 우승 기록이 명예의 전당에 보존되었습니다.`);
  });

  // 명예의 전당 데이터 수신
  socket.on('hall_of_fame_data', (data) => {
    renderHallOfFame(data.hallOfFame || []);
  });

  // 실시간 영토 변화
  socket.on('region_updated', (data) => {
    teacherMap.updateSingleRegion(data.region);
    addBattleLog(data.text);

    // 1. 실시간 대형 전자칠판 3D 팝아웃 애니메이션 & 황금/네온 글로우 발동
    if (data.region && data.region.id) {
      teacherMap.triggerRealtimePop(data.region.id, data.event);

      // 2. 현재 교사 화면에 열려있는 카드 정보의 영토라면 실시간 자동 동기화
      if (teacherMap.selectedRegionId === data.region.id) {
        handleTeacherRegionClick(data.region.id, teacherMap.getRegion(data.region.id), false);
      }
    }

    if (data.event === 'captured' || data.event === 'conquered') {
      window.soundManager.playConquer();
    } else if (data.event === 'defended') {
      window.soundManager.playShield();
    } else if (data.event === 'attacked') {
      window.soundManager.playWrong();
    }
  });

  // 전체 영토 리셋
  socket.on('regions_reset', (data) => {
    teacherMap.setSelectedRegion(null);
    const card = document.getElementById('teacher-region-card');
    if (card) card.style.display = 'none';

    teacherMap.updateRegions(data.regions);
    renderRanking(data.ranking);
    addBattleLog('📢 교사 권한으로 모든 영토가 깨끗하게 초기화되었습니다!');
  });

  // 게임 모드 전환 이벤트 수신
  socket.on('game_mode_changed', (data) => {
    teacherMap.setSelectedRegion(null);
    const card = document.getElementById('teacher-region-card');
    if (card) card.style.display = 'none';

    const modeSelect = document.getElementById('select-game-mode');
    if (modeSelect) modeSelect.value = data.gameMode;
    updateModeBadge(data.gameMode);
    teacherMap.updateRegions(data.regions);
    renderRanking(data.ranking);
    addBattleLog(`📢 게임 모드가 [${data.gameMode === 'team' ? '2학년 반 대항전 (1~4반)' : '개인전'}]으로 전환되었습니다!`);
  });

  // 랭킹 업데이트
  socket.on('ranking_updated', (data) => {
    renderRanking(data.ranking);
  });

  socket.on('player_list_updated', (data) => {
    renderRanking(data.ranking);
  });
}

// 모드 뱃지 UI 갱신
function updateModeBadge(mode) {
  const badge = document.getElementById('mode-badge');
  const title = document.getElementById('ranking-title');
  if (!badge) return;
  if (mode === 'team') {
    badge.textContent = '2학년 반 대항전';
    badge.style.background = '#8B5CF6';
    if (title) title.textContent = '🏫 반별 영토 리더보드';
  } else {
    badge.textContent = '개인전';
    badge.style.background = '#3B82F6';
    if (title) title.textContent = '🏆 실시간 영토 랭킹';
  }
}

// 랭킹 렌더링 (반 대항전 vs 개인전)
function renderRanking(ranking) {
  const container = document.getElementById('ranking-list');
  const shareContainer = document.getElementById('team-share-container');
  if (!container) return;

  const isTeamMode = ranking.isTeamMode || (ranking.gameMode === 'team');

  if (isTeamMode && ranking.teams) {
    // 1. 반 대항전 모드
    if (shareContainer) shareContainer.style.display = 'block';

    const teams = ranking.teams;
    const totalConquered = teams.reduce((sum, t) => sum + t.territories, 0);
    const ratioText = document.getElementById('conquered-total-ratio');
    if (ratioText) {
      ratioText.textContent = `${totalConquered} / 150곳 (${Math.round(totalConquered / 150 * 100)}%)`;
    }

    // 4색 게이지 비율 반영 (최소 150칸 기준 또는 점령 비례)
    const baseTotal = Math.max(150, totalConquered);
    teams.forEach(t => {
      const bar = document.getElementById(`bar-${t.id.replace('_', '-')}`);
      if (bar) {
        const pct = (t.territories / baseTotal) * 100;
        bar.style.width = `${pct}%`;
      }
    });

    const medals = ['🥇', '🥈', '🥉', '4위'];

    container.innerHTML = teams.map((team, idx) => {
      const medal = medals[idx] || `${idx + 1}위`;
      const membersText = team.members && team.members.length > 0 
        ? team.members.map(m => `<span class="member-tag">${m}</span>`).join(' ') 
        : '<span style="color:#64748B; font-size:0.75rem;">아직 참가 학생 없음</span>';

      return `
        <div class="ranking-item rank-${idx + 1}" style="border-left-color: ${team.color}; flex-direction: column; align-items: stretch; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="rank-left">
              <span class="rank-num">${medal}</span>
              <span class="rank-avatar">${team.avatar}</span>
              <span class="rank-name" style="color: ${team.color}; font-size: 1.05rem;">${team.name}</span>
            </div>
            <div class="rank-stats">
              <span class="badge-lands">🚩 ${team.territories}곳</span>
              <span class="badge-shields">🛡️ ${team.totalShield}</span>
              <span style="color: #FCD34D; font-weight: bold;">⭐ ${team.score}점</span>
            </div>
          </div>
          <div class="team-members-box" style="font-size: 0.8rem; color: #94A3B8; padding-top: 4px; border-top: 1px dashed rgba(255,255,255,0.1);">
            👥 반 학생: ${membersText}
          </div>
        </div>
      `;
    }).join('');

  } else {
    // 2. 개인전 모드
    if (shareContainer) shareContainer.style.display = 'none';

    const players = ranking.players || ranking;
    if (!players || players.length === 0) {
      container.innerHTML = '<div style="color: #64748B; text-align: center; padding: 20px;">아직 참가한 학생이 없습니다.</div>';
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];

    container.innerHTML = players.map((p, idx) => {
      const medalOrNum = medals[idx] || `${idx + 1}`;
      const rankClass = idx < 3 ? `rank-${idx + 1}` : '';

      // 뱃지 표시
      const badgeList = (p.badges && p.badges.length > 0)
        ? p.badges.map(b => `<span title="${b.name}">${b.icon}</span>`).join('')
        : '';

      return `
        <div class="ranking-item ${rankClass}" style="border-left-color: ${p.color};">
          <div class="rank-left">
            <span class="rank-num">${medalOrNum}</span>
            <span class="rank-avatar">${p.avatar}</span>
            <span class="rank-name" style="color: ${p.color};">${p.name} ${badgeList ? `<small style="font-size:0.8rem;">${badgeList}</small>` : ''}</span>
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
}

// 실시간 격전 로그 추가
function addBattleLog(text) {
  const ticker = document.getElementById('battle-ticker');
  ticker.textContent = text;
}

// 교사 컨트롤 버튼 초기화
function initControls() {
  // 모드 변경 셀렉터
  document.getElementById('select-game-mode')?.addEventListener('change', (e) => {
    const newMode = e.target.value;
    const modeName = newMode === 'team' ? '2학년 반 대항전 (1~4반)' : '개인전';
    if (confirm(`게임을 [${modeName}] 모드로 전환하시겠습니까?\n모든 영토 점령 상태가 초기화됩니다.`)) {
      window.soundManager.playClick();
      socket.emit('teacher_control', {
        action: 'change_game_mode',
        payload: { gameMode: newMode }
      });
    }
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

  // 교사용 지도 줌 컨트롤
  document.getElementById('teacher-zoom-in')?.addEventListener('click', () => {
    window.soundManager.playClick();
    teacherMap?.zoomIn();
  });
  document.getElementById('teacher-zoom-out')?.addEventListener('click', () => {
    window.soundManager.playClick();
    teacherMap?.zoomOut();
  });
  document.getElementById('teacher-zoom-reset')?.addEventListener('click', () => {
    window.soundManager.playClick();
    teacherMap?.resetView();
  });

  // 명예의 전당 모달 열기/닫기
  document.getElementById('btn-open-hall-of-fame')?.addEventListener('click', () => {
    window.soundManager.playClick();
    socket.emit('teacher_control', { action: 'get_hall_of_fame' });
  });

  document.getElementById('btn-close-hof')?.addEventListener('click', () => {
    window.soundManager.playClick();
    const modal = document.getElementById('hall-of-fame-modal');
    if (modal) modal.style.display = 'none';
  });

  // 이번 시즌 수동 마감 & 새 시즌 시작
  document.getElementById('btn-conclude-season')?.addEventListener('click', () => {
    const isConfirmed = confirm(
      '⚠️ [시즌 마감 및 새 시즌 전환]\n\n' +
      '현재 시즌을 공식 마감하고 이번 주 우승반을 [명예의 전당]에 영구 기록하시겠습니까?\n\n' +
      '• 역대 우승 기록은 보존됩니다.\n' +
      '• 다음 시즌이 시작되며 150개 영토가 0으로 초기화됩니다.'
    );
    if (isConfirmed) {
      window.soundManager.playClick();
      socket.emit('teacher_control', { action: 'conclude_season' });
    }
  });

  // 교사용 영토 팝아웃 카드 컨트롤 (닫기 및 포커스)
  document.getElementById('tr-card-close')?.addEventListener('click', () => {
    window.soundManager.playClick();
    teacherMap?.setSelectedRegion(null);
    const card = document.getElementById('teacher-region-card');
    if (card) card.style.display = 'none';
  });

  document.getElementById('tr-btn-focus')?.addEventListener('click', () => {
    window.soundManager.playClick();
    if (teacherMap?.selectedRegionId) {
      teacherMap.focusRegion(teacherMap.selectedRegionId, 360);
    }
  });

  // 지도 극대화 (사이드바 숨김/표시 토글) 핸들러
  const mainEl = document.querySelector('.teacher-main');
  const toggleWideBtn = document.getElementById('btn-toggle-wide');
  const zoomWideBtn = document.getElementById('teacher-zoom-wide');

  function handleToggleWide() {
    if (!mainEl) return;
    window.soundManager.playClick();
    const isWide = mainEl.classList.toggle('wide-map-mode');
    const wideText = document.getElementById('wide-text');
    const wideIcon = document.getElementById('wide-icon');

    if (wideText) wideText.textContent = isWide ? '대시보드 보기' : '지도 극대화';
    if (wideIcon) wideIcon.textContent = isWide ? '📊' : '⛶';

    setTimeout(() => {
      teacherMap?.fitToContainer();
    }, 80);
  }

  toggleWideBtn?.addEventListener('click', handleToggleWide);
  zoomWideBtn?.addEventListener('click', handleToggleWide);

  // [시즌 보스 레이드] 보스 소환 버튼
  document.getElementById('btn-summon-boss')?.addEventListener('click', () => {
    const bossSelect = document.getElementById('teacher-boss-select');
    const hpSelect = document.getElementById('teacher-boss-hp');
    const bossTemplateId = bossSelect ? bossSelect.value : null;
    const maxHp = hpSelect ? parseInt(hpSelect.value, 10) : 10000;

    const bossName = bossSelect ? bossSelect.options[bossSelect.selectedIndex]?.text : '시즌 보스';
    if (confirm(`🐉 [시즌 보스 토벌전 출격]\n\n${bossName} (HP: ${maxHp})\n\n학급 전체가 실시간으로 협동하여 보스를 물리치는 레이드를 시작하시겠습니까?`)) {
      window.soundManager.playClick();
      socket.emit('teacher_control', {
        action: 'summon_boss',
        payload: { bossTemplateId, maxHp }
      });
    }
  });

  // [시즌 보스 레이드] 보스 토벌 중지 버튼
  document.getElementById('btn-dismiss-boss')?.addEventListener('click', () => {
    if (confirm('보스 토벌전을 중지하시겠습니까?')) {
      window.soundManager.playClick();
      socket.emit('teacher_control', { action: 'dismiss_boss' });
    }
  });

  // [시즌 보스 레이드] 승리 모달 닫기
  document.getElementById('btn-close-teacher-boss-vic')?.addEventListener('click', () => {
    window.soundManager.playClick();
    const modal = document.getElementById('teacher-boss-victory-modal');
    if (modal) modal.style.display = 'none';
  });
}

// 주간 시즌 뱃지 및 D-Day 타이머 갱신
function updateSeasonDisplay(season) {
  if (!season) return;
  const titleEl = document.getElementById('teacher-season-title');
  const ddayEl = document.getElementById('teacher-season-dday');

  if (titleEl) {
    titleEl.textContent = `👑 ${season.seasonName || `제 ${season.currentSeason}시즌`}`;
  }
  if (ddayEl) {
    ddayEl.textContent = `⏳ 일요일 23:59 정기 초기화 (${season.remainingFormatted || '계산 중...'})`;
  }
}

// 명예의 전당 모달 렌더링
function renderHallOfFame(hallOfFame) {
  const modal = document.getElementById('hall-of-fame-modal');
  const container = document.getElementById('hof-list-container');
  if (!modal || !container) return;

  if (!hallOfFame || hallOfFame.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #94A3B8; padding: 40px 10px;">
        <div style="font-size: 3rem; margin-bottom: 12px;">🏆</div>
        <div style="font-size: 1.1rem; font-weight: bold; color: #F1F5F9; margin-bottom: 6px;">아직 마감된 시즌 기록이 없습니다.</div>
        <div style="font-size: 0.85rem;">매주 일요일 밤 23:59:59에 1주일간의 영토 점령전 우승반이 여기에 영구 보존됩니다!</div>
      </div>
    `;
  } else {
    container.innerHTML = hallOfFame.map((record) => {
      const winner = record.winningClass || { name: '집계 없음', avatar: '🏫', color: '#CBD5E1', territories: 0, score: 0 };
      const endedDate = record.endedAt ? new Date(record.endedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      
      const rankSummary = (record.classRankings && record.classRankings.length > 0)
        ? record.classRankings.map((c, i) => `${i + 1}위 ${c.name}(${c.territories}곳)`).join(' · ')
        : '';

      return `
        <div style="background: #0F172A; border: 2px solid #F59E0B; border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 800; font-size: 1.1rem; color: #FCD34D;">👑 제 ${record.season}시즌 우승</span>
            <span style="font-size: 0.8rem; color: #94A3B8;">${endedDate} 마감</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 10px; padding: 10px 14px;">
            <span style="font-size: 2rem;">${winner.avatar || '🏫'}</span>
            <div style="flex: 1;">
              <div style="font-size: 1.2rem; font-weight: 900; color: ${winner.color || '#FCD34D'};">${winner.name}</div>
              <div style="font-size: 0.85rem; color: #E2E8F0; margin-top: 2px;">
                🚩 점령 영토: <b>${winner.territories}곳</b> / 150곳 | ⭐ 총점: <b>${winner.score}점</b>
              </div>
            </div>
          </div>
          ${rankSummary ? `<div style="font-size: 0.8rem; color: #94A3B8; padding-top: 4px;">📊 최종 순위: ${rankSummary}</div>` : ''}
          ${record.mvpStudent && record.mvpStudent.name !== '집계 없음' ? `
            <div style="font-size: 0.8rem; color: #38BDF8; background: #1E293B; padding: 6px 10px; border-radius: 6px;">
              🎖️ <b>시즌 MVP:</b> ${record.mvpStudent.name} (${record.mvpStudent.territories}곳 점령, ${record.mvpStudent.score}점)
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  modal.style.display = 'flex';
}

// [시즌 보스 레이드] 교사 화면 보스 HUD 상태 및 지도 위 보스 마커 갱신
function updateBossHUD(boss) {
  if (!boss) return;

  // 지도 위에 출현 지역 보스 마커 실시간 표시/동기화
  if (teacherMap) {
    teacherMap.setBoss(boss);
  }

  const overlay = document.getElementById('teacher-boss-overlay');
  const badgeState = document.getElementById('teacher-boss-state-badge');
  if (!overlay) return;

  const isRaging = (boss.status === 'raging');
  overlay.style.display = isRaging ? 'flex' : 'none';

  if (badgeState) {
    if (isRaging) {
      badgeState.textContent = '🔥 토벌전 진행 중!';
      badgeState.style.background = '#EC4899';
      badgeState.style.color = '#FFFFFF';
    } else if (boss.isDefeated) {
      badgeState.textContent = '👑 토벌 완료';
      badgeState.style.background = '#10B981';
      badgeState.style.color = '#FFFFFF';
    } else {
      badgeState.textContent = '대기 중';
      badgeState.style.background = '#334155';
      badgeState.style.color = '#94A3B8';
    }
  }

  // 엘리먼트 데이터 채우기
  const iconEl = document.getElementById('tb-boss-icon');
  const nameEl = document.getElementById('tb-boss-name');
  const locEl = document.getElementById('tb-boss-location');
  const barEl = document.getElementById('tb-hp-bar');
  const numsEl = document.getElementById('tb-hp-nums');
  const pctEl = document.getElementById('tb-hp-pct');
  const statusEl = document.getElementById('tb-boss-status-text');

  if (iconEl) iconEl.textContent = boss.icon || '🐉';
  if (nameEl) nameEl.textContent = boss.name || '시즌 보스';
  if (locEl) locEl.textContent = boss.location || '공주시';
  if (barEl) barEl.style.width = `${boss.hpPercent || 0}%`;
  if (numsEl) numsEl.textContent = `${boss.currentHp || 0} / ${boss.maxHp || 0} HP`;
  if (pctEl) pctEl.textContent = `${boss.hpPercent || 0}%`;
  if (statusEl) statusEl.textContent = isRaging ? '⚔️ 격전 중!' : (boss.isDefeated ? '👑 토벌 완료' : '대기');

  // MVP 정보
  if (boss.topContributors && boss.topContributors.length > 0) {
    const top = boss.topContributors[0];
    const mvpNameEl = document.getElementById('tb-mvp-name');
    const mvpDmgEl = document.getElementById('tb-mvp-dmg');
    if (mvpNameEl) mvpNameEl.textContent = top.name;
    if (mvpDmgEl) mvpDmgEl.textContent = top.damage;
  }
}

// [시즌 보스 레이드] 보스 토벌 성공 대형 시상 모달
function showBossDefeatedVictory(data) {
  const modal = document.getElementById('teacher-boss-victory-modal');
  if (!modal) return;

  const iconEl = document.getElementById('tb-vic-icon');
  const titleEl = document.getElementById('tb-vic-boss-title');
  const mvpStudentEl = document.getElementById('tb-vic-mvp-student');
  const mvpTeamEl = document.getElementById('tb-vic-mvp-team');
  const rewardBadgeEl = document.getElementById('tb-vic-reward-badge');

  if (iconEl) iconEl.textContent = data.boss ? data.boss.icon : '👑';
  if (titleEl) titleEl.textContent = `${data.boss ? data.boss.name : '시즌 보스'} 토벌 완료!`;

  if (mvpStudentEl) {
    mvpStudentEl.textContent = data.mvp ? `${data.mvp.name} 학생 (${data.mvp.damage} DMG)` : '공주시 전체 학생';
  }

  if (mvpTeamEl) {
    const teamNames = { team_1: '2학년 1반', team_2: '2학년 2반', team_3: '2학년 3반', team_4: '2학년 4반' };
    mvpTeamEl.textContent = data.winningTeamId ? teamNames[data.winningTeamId] || data.winningTeamId : '전체 학급';
  }

  if (rewardBadgeEl && data.rewardBadge) {
    rewardBadgeEl.innerHTML = `🎁 전원 보상: <b>[${data.rewardBadge.icon} ${data.rewardBadge.name}]</b> 한정 뱃지 & +${data.rewardScore || 100}점 지급 완료!`;
  }

  modal.style.display = 'flex';
}
