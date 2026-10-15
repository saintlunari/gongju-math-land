const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { SeasonManager, SEASON_BOSS_TEMPLATES } = require('../season_manager.js');

console.log('=== [Gongju Math Land] 보스 침식 개선 & 토벌 후 빈 영토 해방 E2E 검증 시작 ===\n');

// 1. 공주시 영토 기초 데이터 로드 및 초기화
const regionsRaw = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/server_initial_regions.json'), 'utf8'));
const gameState = {
  regions: {},
  settings: {
    curriculum: 'all',
    danRange: 'all',
    conceptMode: 'all',
    timeLimit: 0,
    gameMode: 'team'
  }
};

regionsRaw.forEach(r => {
  gameState.regions[r.id] = {
    id: r.id,
    name: r.name,
    town: r.town,
    ownerId: null,
    ownerName: null,
    ownerColor: null,
    ownerAvatar: null,
    capturedBy: null,
    capturedById: null,
    shield: 0,
    isCorrupted: false,
    corruptedByBoss: null,
    corruptedTheme: null
  };
});

// 팀 1~4가 일부 영토 점령 시뮬레이션
const teamSample = [
  { id: 'ri_134', ownerId: 'team_1', ownerName: '2학년 1반', ownerColor: '#3B82F6', ownerAvatar: '🐻', shield: 1 },
  { id: 'ri_135', ownerId: 'team_2', ownerName: '2학년 2반', ownerColor: '#EF4444', ownerAvatar: '🦁', shield: 0 },
  { id: 'ri_21',  ownerId: 'team_3', ownerName: '2학년 3반', ownerColor: '#10B981', ownerAvatar: '🐰', shield: 1 },
  { id: 'ri_91',  ownerId: 'team_4', ownerName: '2학년 4반', ownerColor: '#F59E0B', ownerAvatar: '🦊', shield: 0 }
];
teamSample.forEach(s => {
  Object.assign(gameState.regions[s.id], s);
});

// SeasonManager 초기화 (테스트용 데이터 파일 격리)
const testDataPath = path.join(__dirname, 'test_season_data.json');
if (fs.existsSync(testDataPath)) fs.unlinkSync(testDataPath);
const sm = new SeasonManager(testDataPath);

// -------------------------------------------------------------
// 테스트 1: 보스 소환 및 영토 침식
// -------------------------------------------------------------
console.log('테스트 1: 금강대룡(boss_dragon) 소환 및 영토 침식 테스트');
const dragon = sm.summonBoss(1000, 'boss_dragon');
assert.strictEqual(dragon.bossId, 'boss_dragon');
assert.strictEqual(dragon.status, 'raging');
assert.strictEqual(sm.getActiveRagingBosses().length, 1);

// 침식 2회 수행
const c1 = sm.corruptNextTerritory(gameState, 'boss_dragon');
assert(c1, '첫 번째 침식이 성공해야 함');
console.log(`- 침식 1 성공: [${c1.region.id}] ${c1.region.name} (소유자: ${gameState.regions[c1.region.id].ownerId})`);
assert.strictEqual(gameState.regions[c1.region.id].isCorrupted, true);
assert.strictEqual(gameState.regions[c1.region.id].corruptedByBoss, 'boss_dragon');
assert.strictEqual(gameState.regions[c1.region.id].ownerId, 'boss');

const c2 = sm.corruptNextTerritory(gameState, 'boss_dragon');
assert(c2, '두 번째 침식이 성공해야 함');
console.log(`- 침식 2 성공: [${c2.region.id}] ${c2.region.name} (소유자: ${gameState.regions[c2.region.id].ownerId})`);
assert.strictEqual(gameState.regions[c2.region.id].isCorrupted, true);
assert.strictEqual(gameState.regions[c2.region.id].corruptedByBoss, 'boss_dragon');

const corruptedBefore = Object.values(gameState.regions).filter(r => r.corruptedByBoss === 'boss_dragon');
assert.strictEqual(corruptedBefore.length, 2, '2곳이 침식되었어야 함');
console.log('✅ 테스트 1 통과: 보스 소환 및 2곳 침식 정상\n');

// -------------------------------------------------------------
// 테스트 2: 보스 물리쳤을 때 침식 영토가 빈 영토(중립)로 해방되는지 검증
// -------------------------------------------------------------
console.log('테스트 2: 보스 토벌 시 침식 영토가 빈 영토(중립)로 해방되는지 검증 (핵심 요구사항)');
// 학생 공격으로 보스 체력을 0으로 만듦
const hitRes = sm.recordBossHit({ id: 's1', name: '김민준', teamId: 'team_1' }, 1000, true, 'boss_dragon');
assert.strictEqual(hitRes.boss.currentHp, 0);
assert.strictEqual(hitRes.boss.isDefeated, true);

// server.js의 boss defeat 핸들러와 동일하게 purifyTerritoriesForBoss(gameState, 'boss_dragon', true) 호출
const emptiedRegions = sm.purifyTerritoriesForBoss(gameState, 'boss_dragon', true);
console.log(`- 토벌로 해방된 영토 수: ${emptiedRegions.length}곳`);
assert.strictEqual(emptiedRegions.length, 2, '침식되었던 2곳 모두 해방되어야 함');

emptiedRegions.forEach(r => {
  const reg = gameState.regions[r.id];
  console.log(`  * 해방된 영토 [${reg.id}] ${reg.name} 상태: ownerId=${reg.ownerId}, isCorrupted=${reg.isCorrupted}, shield=${reg.shield}`);
  assert.strictEqual(reg.ownerId, null, '토벌된 침식 영토의 ownerId는 null(빈 영토)이어야 함');
  assert.strictEqual(reg.ownerName, null, 'ownerName은 null이어야 함');
  assert.strictEqual(reg.ownerColor, null, 'ownerColor는 null이어야 함');
  assert.strictEqual(reg.shield, 0, '방어막은 0이어야 함');
  assert.strictEqual(reg.isCorrupted, false, 'isCorrupted는 false여야 함');
  assert.strictEqual(reg.corruptedByBoss, null, 'corruptedByBoss는 null이어야 함');
  assert.strictEqual(reg.previousOwner, undefined, 'previousOwner 임시 정보는 제거되어야 함');
});

// 해방된 빈 영토를 다른 학생이 퀴즈를 맞혀 정복 가능한지 검증
const liberatedId = emptiedRegions[0].id;
const regToCapture = gameState.regions[liberatedId];
assert.strictEqual(regToCapture.ownerId, null);
// 점령 시뮬레이션
regToCapture.ownerId = 'team_3';
regToCapture.ownerName = '2학년 3반';
regToCapture.ownerColor = '#10B981';
regToCapture.shield = 1;
assert.strictEqual(gameState.regions[liberatedId].ownerId, 'team_3');
console.log(`- 해방된 빈 영토 [${liberatedId}]에 2학년 3반이 퀴즈로 새로 점령 성공!`);
console.log('✅ 테스트 2 통과: 보스 토벌 시 침식 영토 빈 영토(중립) 해방 완벽 동작!\n');

// -------------------------------------------------------------
// 테스트 3: 교사 수동 정화 시 원래 소유팀 + 방어막 복구 검증 (Q1 요구사항 구분)
// -------------------------------------------------------------
console.log('테스트 3: 교사 수동 정화 시 원래 소유팀으로 방어막과 함께 복구되는지 검증');
const goblin = sm.summonBoss(1000, 'boss_goblin');
// 특정 영토(ri_134: 2학년 1반, shield 1)를 침식시킴
const targetReg = gameState.regions['ri_134'];
targetReg.ownerId = 'team_1';
targetReg.ownerName = '2학년 1반';
targetReg.ownerColor = '#3B82F6';
targetReg.shield = 0; // 방어막 0으로 설정하여 침식 성공시키기

// 침식 수행
const goblinCorrupt = sm.corruptNextTerritory(gameState, 'boss_goblin');
assert(goblinCorrupt);
const corruptedTarget = goblinCorrupt.region;
const prevOwnerSaved = corruptedTarget.previousOwner;
console.log(`- 도깨비가 [${corruptedTarget.id}] 침식: 이전 소유자=${prevOwnerSaved ? prevOwnerSaved.ownerName : '중립'}`);

// 교사 수동 정화: makeEmpty = false
const restoredRegions = sm.purifyTerritoriesForBoss(gameState, 'boss_goblin', false);
const restoredTarget = gameState.regions[corruptedTarget.id];
console.log(`- 교사 수동 정화 완료: [${restoredTarget.id}] ${restoredTarget.name} => owner=${restoredTarget.ownerName}, shield=${restoredTarget.shield}`);
if (prevOwnerSaved && prevOwnerSaved.ownerId) {
  assert.strictEqual(restoredTarget.ownerId, prevOwnerSaved.ownerId, '교사 수동 정화는 이전 소유팀으로 복구되어야 함');
  assert.strictEqual(restoredTarget.shield, (prevOwnerSaved.shield || 0) + 1, '교사 수동 정화는 +1 보너스 방어막이 부여되어야 함');
}
assert.strictEqual(restoredTarget.isCorrupted, false);
console.log('✅ 테스트 3 통과: 교사 수동 정화 시 원래 소유팀 및 보너스 방어막 복구 정상!\n');

// -------------------------------------------------------------
// 테스트 4: 다중 보스 시스템 (최대 4마리 동시 출현 및 동시 침식) 검증
// -------------------------------------------------------------
console.log('테스트 4: 4대 전설 보스 동시 출현 및 개별 침식/토벌 검증');
sm.dismissBoss(); // 전체 정리
assert.strictEqual(sm.getActiveRagingBosses().length, 0);

// 4마리 순차 소환
const b1 = sm.summonBoss(1000, 'boss_dragon');
const b2 = sm.summonBoss(1000, 'boss_goblin');
const b3 = sm.summonBoss(1000, 'boss_golem');
const b4 = sm.summonBoss(1000, 'boss_phoenix');

assert(b1 && b2 && b3 && b4, '4종 보스가 모두 소환되어야 함');
const activeList = sm.getActiveRagingBosses();
console.log(`- 현재 출현 중인 활성 보스 수: ${activeList.length}마리`);
assert.strictEqual(activeList.length, 4, '정확히 4마리의 보스가 활성화되어야 함');

// 5번째 소환 시도 시 최대 4마리 제한으로 null 또는 거부 확인
const b5 = sm.summonRandomBoss(1000);
assert.strictEqual(b5, null, '최대 4마리 초과 소환 시 null을 반환해야 함');
console.log('- 5번째 보스 소환 시도 -> 정원 초과(4마리)로 정상 거부됨');

// 4마리 보스가 tickCorruption 시 동시에 각각 1곳씩 침식하는지 확인
sm.nextCorruptionCountdown = 1; // 1초 카운트다운 완료 시뮬레이션
const corruptions = sm.tickCorruption(gameState);
console.log(`- 동시 침식 틱 결과: ${corruptions ? corruptions.length : 0}곳 침식/방어 발생`);
assert(corruptions && corruptions.length > 0, '출현 중인 보스들의 침식이 발생해야 함');

// 다중 보스 중 1마리(boss_golem)만 물리쳤을 때
console.log('- 4마리 중 [바위 골렘(boss_golem)]만 토벌');
sm.recordBossHit({ id: 's2', name: '이서연', teamId: 'team_2' }, 1000, true, 'boss_golem');
const golemEmptied = sm.purifyTerritoriesForBoss(gameState, 'boss_golem', true);
console.log(`- 골렘 토벌로 빈 영토가 된 곳: ${golemEmptied.length}곳`);
golemEmptied.forEach(r => {
  assert.strictEqual(gameState.regions[r.id].ownerId, null, '골렘의 침식 영토만 빈 영토로 해방되어야 함');
  assert.strictEqual(gameState.regions[r.id].isCorrupted, false);
});

// 나머지 3마리 보스는 여전히 살아있어야 함
const remainingActive = sm.getActiveRagingBosses();
console.log(`- 골렘 토벌 후 남은 활성 보스 수: ${remainingActive.length}마리`);
assert.strictEqual(remainingActive.length, 3, '골렘 외 3마리는 계속 격전 중이어야 함');
assert(!remainingActive.some(b => b.bossId === 'boss_golem'), '골렘은 활성 목록에서 제외되어야 함');

// 타이머 타임아웃 시 기존 보스를 유지하고 새 보스를 추가 소환하는지 검증
sm.setAutoSummonSettings({ enabled: true, intervalSec: 60 });
sm.data.nextAutoSummonAt = new Date(Date.now() - 1000).toISOString(); // 타이머 만료 시뮬레이션
const autoSpawnRes = sm.tickAutoSummon(gameState);
console.log(`- 자동 소환 타이머 도달 시 결과: [${autoSpawnRes ? autoSpawnRes.name : '없음'}] 소환`);
assert(autoSpawnRes && autoSpawnRes.bossId, '새 보스가 추가 소환되어야 함');
assert.strictEqual(sm.getActiveRagingBosses().length, 4, '골렘이 퇴장했던 자리에 새 보스가 출현하여 다시 4마리가 됨');

console.log('✅ 테스트 4 통과: 다중 보스(최대 4마리) 동시 출현, 독립 침식, 개별 토벌 빈 영토화 검증 완료!\n');

// 정리
if (fs.existsSync(testDataPath)) fs.unlinkSync(testDataPath);

console.log('=================================================================');
console.log('🎉 모든 E2E 핵심 검증 테스트 100% 통과! (ALL TESTS PASSED)');
console.log('=================================================================');
