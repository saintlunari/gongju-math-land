const io = require('socket.io-client');
const assert = require('assert');

console.log('=== [실제 구동 중인 서버 Live Socket E2E 통합 테스트 시작] ===\n');

const SERVER_URL = 'http://127.0.0.1:3000';

const teacherSocket = io(SERVER_URL);
const studentSocket = io(SERVER_URL);

let studentProfile = null;
let corruptedRegionId = null;

async function runLiveTest() {
  await Promise.all([
    new Promise(resolve => teacherSocket.on('connect', resolve)),
    new Promise(resolve => studentSocket.on('connect', resolve))
  ]);
  console.log('1. 교사 및 학생 소켓 서버 연결 성공!');

  // 교사 및 학생 소켓 역할 등록
  await Promise.all([
    new Promise(resolve => {
      teacherSocket.emit('join_as_teacher');
      teacherSocket.once('init_teacher', resolve);
    }),
    new Promise(resolve => {
      studentSocket.emit('join_student', {
        name: '테스트민준',
        avatar: '🐱',
        teamId: 'team_1'
      });
      studentSocket.once('joined_success', (data) => {
        studentProfile = data.player;
        console.log(`2. 학생 [${studentProfile.name}] 2학년 1반 등록 완료!`);
        resolve();
      });
    })
  ]);

  // 2. 교사 화면: 기존 보스 정리 후 금강대룡(boss_dragon, HP: 100) 소환
  await new Promise(resolve => {
    teacherSocket.emit('teacher_control', { action: 'dismiss_boss' });
    setTimeout(resolve, 300);
  });

  await new Promise(resolve => {
    teacherSocket.emit('teacher_control', {
      action: 'summon_boss',
      payload: { bossTemplateId: 'boss_dragon', maxHp: 50 }
    });
    teacherSocket.once('boss_summoned', (data) => {
      console.log(`3. 교사: [${data.boss.name}] 소환 성공 (HP: ${data.boss.maxHp})`);
      assert.strictEqual(data.boss.bossId, 'boss_dragon');
      resolve();
    });
  });

  // 3. 교사: 1곳 즉시 침식 테스트
  await new Promise(resolve => {
    const onCorrupted = (data) => {
      corruptedRegionId = data.region.id;
      console.log(`4. 보스 침식 발생: [${data.region.id}] ${data.region.name} (침식 보스: ${data.boss.name})`);
      assert.strictEqual(data.region.isCorrupted, true);
      assert.strictEqual(data.region.ownerId, 'boss');
      teacherSocket.off('boss_territory_corrupted', onCorrupted);
      resolve();
    };
    teacherSocket.on('boss_territory_corrupted', onCorrupted);
    teacherSocket.emit('teacher_control', {
      action: 'trigger_instant_corruption',
      payload: { bossId: 'boss_dragon' }
    });
  });

  // 4. 학생: 보스 퀴즈 요청 및 공격 (HP 100을 깎아 격퇴)
  const quiz = await new Promise(resolve => {
    studentSocket.emit('request_boss_quiz', { bossId: 'boss_dragon' });
    studentSocket.once('receive_boss_quiz', (data) => {
      const q = data.quiz;
      console.log(`5. 학생: 보스 레이드 퀴즈 수신: "${q.formula}" (정답: ${q.answer})`);
      resolve(q);
    });
  });

  // 학생 답안 제출 및 토벌 확인 (보스 격퇴, 영토 정화, 빈 영토 갱신 3개 동시 수신)
  await new Promise(resolve => {
    let defeated = false;
    let territoryLiberated = false;
    let regionEmptied = false;

    studentSocket.on('boss_defeated', (data) => {
      console.log(`6. 🎉 보스 토벌 성공 브로드캐스트 수신: [${data.boss.name}] 토벌 완료!`);
      assert.strictEqual(data.boss.isDefeated, true);
      defeated = true;
      if (defeated && territoryLiberated && regionEmptied) resolve();
    });

    studentSocket.on('boss_territory_purified', (data) => {
      console.log(`7. ✨ 침식 영토 해방 수신: isEmptied=${data.isEmptied}, 해방 영토 수=${data.count}`);
      assert.strictEqual(data.isEmptied, true, '학생 토벌 시 isEmptied는 true(빈 영토 모드)여야 함');
      territoryLiberated = true;
      if (defeated && territoryLiberated && regionEmptied) resolve();
    });

    studentSocket.on('region_updated', (data) => {
      if (data.event === 'liberated_empty') {
        console.log(`8. 실시간 영토 갱신 수신: [${data.region.id}] ${data.region.name} (소유자: ${data.region.ownerId}, 방어막: ${data.region.shield}, 이벤트: ${data.event})`);
        assert.strictEqual(data.region.ownerId, null, '토벌된 침식 영토는 빈 영토(null)이어야 함');
        assert.strictEqual(data.region.shield, 0, '방어막은 0이어야 함');
        assert.strictEqual(data.region.isCorrupted, false, 'isCorrupted는 false여야 함');
        regionEmptied = true;
        if (defeated && territoryLiberated && regionEmptied) resolve();
      }
    });

    studentSocket.emit('submit_boss_attack', {
      bossId: 'boss_dragon',
      quizId: quiz.id,
      answer: quiz.answer,
      chosenVal: quiz.answer,
      streak: 10
    });
  });

  // 6. 교사 수동 정화 시 원래 소유팀으로 복구(isEmptied: false)되는지 테스트
  console.log('\n--- 교사 수동 정화 테스트 ---');
  await new Promise(resolve => {
    teacherSocket.emit('teacher_control', {
      action: 'summon_boss',
      payload: { bossTemplateId: 'boss_goblin', maxHp: 1000 }
    });
    teacherSocket.once('boss_summoned', resolve);
  });

  await new Promise(resolve => {
    teacherSocket.once('boss_territory_corrupted', resolve);
    teacherSocket.emit('teacher_control', {
      action: 'trigger_instant_corruption',
      payload: { bossId: 'boss_goblin' }
    });
  });

  await new Promise(resolve => {
    teacherSocket.once('boss_territory_purified', (data) => {
      console.log(`9. 교사 수동 정화 수신: isEmptied=${data.isEmptied}`);
      assert.strictEqual(data.isEmptied, false, '교사 수동 정화 시 isEmptied는 false(원래 소유팀 복구)여야 함');
      resolve();
    });
    teacherSocket.emit('teacher_control', {
      action: 'trigger_instant_purification',
      payload: { bossId: 'boss_goblin' }
    });
  });

  console.log('\n=================================================================');
  console.log('🎉 Live Socket E2E 테스트 100% 성공! 모든 요구사항 완벽 작동!');
  console.log('=================================================================');

  teacherSocket.disconnect();
  studentSocket.disconnect();
  process.exit(0);
}

runLiveTest().catch(err => {
  console.error('❌ Live Socket 테스트 실패:', err);
  process.exit(1);
});
