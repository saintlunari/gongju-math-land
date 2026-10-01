/**
 * 공주시 곱셈 땅따먹기 대작전 - 초등 2학년 2학기 7대 곱셈 개념 문제 은행 (Question Bank)
 * 
 * [초등 2학년 2학기 7대 핵심 개념]
 * 1. skip_count: 몇씩 뛰어 세기
 * 2. group_count: 묶어 세기
 * 3. count_one_by_one: 하나씩 세어 보기
 * 4. groups_of: 몇씩 몇 묶음
 * 5. times_of: 몇의 몇 배
 * 6. addition_to_multiplication: 덧셈식을 곱셈식으로
 * 7. times_to_multiplication: 몇의 몇 배를 곱셈식으로
 */

// 공주시 및 친근한 시각화 과일/사물 아이템
const VISUAL_ITEMS = [
  { name: '공주 알밤', icon: '🌰', unit: '개' },
  { name: '우성 멜론', icon: '🍈', unit: '개' },
  { name: '새콤 딸기', icon: '🍓', unit: '개' },
  { name: '빨간 사과', icon: '🍎', unit: '개' },
  { name: '계룡 도토리', icon: '🐿️', unit: '개' },
  { name: '달콤 감', icon: '🍊', unit: '개' },
  { name: '반포 포도', icon: '🍇', unit: '송이' },
  { name: '유구 복숭아', icon: '🍑', unit: '개' }
];

/**
 * 한국어 받침 유무에 따른 자연스러운 조사(이/가, 을/를) 반환
 */
function getJosa(word, josaType) {
  const charCode = word.charCodeAt(word.length - 1);
  const hasJongseong = (charCode - 0xAC00) % 28 > 0;
  if (josaType === '이/가') {
    return hasJongseong ? `${word}이` : `${word}가`;
  } else if (josaType === '을/를') {
    return hasJongseong ? `${word}을` : `${word}를`;
  }
  return word;
}

/**
 * 4지선다 보기 생성기 (초등 2학년 맞춤형 매력적 오답 생성)
 * - 중복 없음 (Set 크기 4)
 * - 정답 반드시 포함
 * - 모든 보기는 1 이상의 양의 정수
 * - 연산 실수나 구구단 인접 오답(±dan, ±1, ±2 등) 반영
 */
function generateOptions(answer, dan, isMultiplierQuestion = false) {
  const optionsSet = new Set([answer]);

  let candidateDeltas;
  if (isMultiplierQuestion) {
    // 빈칸 □ (곱하는 수) 문제인 경우 (보통 2~9)
    candidateDeltas = [1, -1, 2, -2, 3, -3];
  } else {
    // 곱셈 결과인 경우
    const d = dan || 2;
    candidateDeltas = [
      d, -d,           // 단 간격 오답 (구구단 한 번 덜 외우거나 더 외움)
      1, -1,           // 단순 계산 실수
      2, -2,           // 짝/홀 오차
      d * 2, -d * 2,
      10, -10
    ];
  }

  for (const delta of candidateDeltas) {
    const val = answer + delta;
    if (val > 0 && val !== answer && !optionsSet.has(val)) {
      optionsSet.add(val);
      if (optionsSet.size === 4) break;
    }
  }

  // 여전히 4개가 안 채워진 경우 (예: answer가 매우 작은 경우)
  let fallback = 1;
  while (optionsSet.size < 4) {
    if (fallback !== answer && !optionsSet.has(fallback)) {
      optionsSet.add(fallback);
    }
    fallback++;
  }

  // 보기 셔플
  const options = Array.from(optionsSet);
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}

/**
 * 문제 은행 전체 데이터 빌드
 */
function buildQuestionBank() {
  const bank = [];
  let idCounter = 1;

  // 단: 2단 ~ 9단
  for (let dan = 2; dan <= 9; dan++) {
    // 곱하는 수: 2 ~ 9
    for (let num = 2; num <= 9; num++) {
      const ans = dan * num;
      const itemIndex = (dan + num) % VISUAL_ITEMS.length;
      const item = VISUAL_ITEMS[itemIndex];

      // =========================================================
      // [1] 몇씩 뛰어 세기 (skip_count)
      // 초2 인지 부하를 고려해 뛰어 세기 횟수는 3~6회 사이에서 최적화
      // =========================================================
      if (num >= 3 && num <= 6) {
        const steps = [];
        for (let s = 1; s <= num; s++) {
          if (s === num) {
            steps.push('❓');
          } else {
            steps.push(dan * s);
          }
        }

        const skipOptions = generateOptions(ans, dan, false);
        bank.push({
          id: `QB_${idCounter++}`,
          dan,
          num,
          category: '🦘 몇씩 뛰어 세기',
          typeKey: 'skip_count',
          title: `${dan}씩 ${num}번 뛰어 세어 볼까요?`,
          subTitle: `뛰어 센 마지막 빈칸(❓)에 들어갈 알맞은 수는?`,
          formula: `${dan}씩 ${num}번 뛰어 센 수 = ?`,
          visual: steps.join('  ➔  '),
          answer: ans,
          options: skipOptions,
          explanation: `${dan}씩 ${num}번 뛰어 세면 ${dan * 1}, ${dan * 2}... 순서로 커져 마지막 수는 ${ans}이 됩니다.`
        });
      }

      // =========================================================
      // [2] 묶어 세기 (group_count)
      // 아이콘 개수와 정답이 100% 일치해야 하므로 화면에 들어가는 2~6개 × 2~5묶음
      // =========================================================
      if (dan <= 6 && num <= 5) {
        const groupVisual = [];
        const singleGroup = Array(dan).fill(item.icon).join('');
        for (let g = 0; g < num; g++) {
          groupVisual.push(`[ ${singleGroup} ]`);
        }

        const groupOptions = generateOptions(ans, dan, false);
        bank.push({
          id: `QB_${idCounter++}`,
          dan,
          num,
          category: '📦 묶어 세기',
          typeKey: 'group_count',
          itemIcon: item.icon,
          title: `${getJosa(item.name, '을/를')} ${dan}개씩 묶어 세어 보세요.`,
          subTitle: `${dan}개씩 ${num}묶음은 모두 몇 개일까요?`,
          formula: `${dan}개씩 ${num}묶음 = ?`,
          visual: groupVisual.join('  '),
          answer: ans,
          options: groupOptions,
          explanation: `[ ${singleGroup} ]이/가 ${num}묶음 있으므로, ${dan}을 ${num}번 묶어 세면 모두 ${ans}개입니다.`
        });
      }

      // =========================================================
      // [3] 하나씩 세어 보기 (count_one_by_one)
      // 한 줄에 dan개씩 num줄 정렬 (아이콘 개수 = dan * num 100% 일치!)
      // =========================================================
      if (dan <= 6 && num <= 5) {
        const rows = [];
        const singleRow = Array(dan).fill(item.icon).join(' ');
        for (let r = 0; r < num; r++) {
          rows.push(singleRow);
        }

        const countOptions = generateOptions(ans, dan, false);
        bank.push({
          id: `QB_${idCounter++}`,
          dan,
          num,
          category: '👆 하나씩 세어 보기',
          typeKey: 'count_one_by_one',
          itemIcon: item.icon,
          title: `${getJosa(item.name, '이/가')} 가지런히 놓여 있습니다. 모두 몇 개일까요?`,
          subTitle: `하나씩 세어 보거나 곱셈(${dan} × ${num})으로 빠르게 세어보세요!`,
          formula: `한 줄에 ${dan}개씩 ${num}줄 = ?`,
          visual: rows.join('\n'),
          answer: ans,
          options: countOptions,
          explanation: `한 줄에 ${dan}개씩 ${num}줄이 있으므로 하나씩 세어도, 곱셈식 ${dan} × ${num}으로 계산해도 ${ans}개입니다.`
        });
      }

      // =========================================================
      // [4] 몇씩 몇 묶음 (groups_of)
      // 2~9단 전 범위 포괄
      // =========================================================
      const groupsVisual = `${item.icon} ${dan}개씩 × ${num}묶음`;
      const groupsOptions = generateOptions(ans, dan, false);
      bank.push({
        id: `QB_${idCounter++}`,
        dan,
        num,
        category: '🎁 몇씩 몇 묶음',
        typeKey: 'groups_of',
        title: `${getJosa(item.name, '이/가')} ${dan}개씩 ${num}묶음 있습니다.`,
        subTitle: `전체 개수는 모두 몇 개인지 구해보세요.`,
        formula: `${dan}개씩 ${num}묶음 = ?`,
        visual: groupsVisual,
        answer: ans,
        options: groupsOptions,
        explanation: `${dan}개씩 ${num}묶음은 ${dan} × ${num} = ${ans}개입니다.`
      });

      // =========================================================
      // [5] 몇의 몇 배 (times_of)
      // 2~9단 전 범위 포괄
      // =========================================================
      const timesOptions = generateOptions(ans, dan, false);
      bank.push({
        id: `QB_${idCounter++}`,
        dan,
        num,
        category: '🌱 몇의 몇 배',
        typeKey: 'times_of',
        title: `${dan}의 ${num}배는 얼마일까요?`,
        subTitle: `${dan}의 ${num}배는 ${dan}을 ${num}번 더한 크기예요.`,
        formula: `${dan}의 ${num}배 = ?`,
        visual: `${dan}을 ${num}번 더한 크기`,
        answer: ans,
        options: timesOptions,
        explanation: `${dan}의 ${num}배는 ${dan} × ${num} = ${ans}입니다.`
      });

      // =========================================================
      // [6] 덧셈식을 곱셈식으로 (addition_to_multiplication)
      // 동수누가식: dan + dan + ... (num번)
      // 유형 A: 빈칸 □ (곱하는 수) 구하기
      // 유형 B: 곱셈식 결과 계산하기
      // =========================================================
      const addExpr = Array(num).fill(dan).join(' + ');

      // 유형 6-A: 빈칸 채우기 (정답: num)
      bank.push({
        id: `QB_${idCounter++}`,
        dan,
        num,
        category: '➕ 덧셈식을 곱셈식으로',
        typeKey: 'addition_to_multiplication',
        title: `덧셈식을 곱셈식으로 바꿀 때 빈칸에 들어갈 수는?`,
        subTitle: `${dan}을 ${num}번 더한 식입니다. 곱하는 수 □는 얼마일까요?`,
        formula: `${addExpr} = ${dan} × □`,
        visual: `${addExpr} = ${dan} × [ □ ]`,
        answer: num, // 곱하는 수
        options: generateOptions(num, dan, true),
        explanation: `${dan}을 ${num}번 더했으므로 곱셈식으로는 ${dan} × ${num}이 됩니다. 따라서 □ = ${num}입니다.`
      });

      // 유형 6-B: 계산 결과 구하기 (정답: ans)
      bank.push({
        id: `QB_${idCounter++}`,
        dan,
        num,
        category: '➕ 덧셈식을 곱셈식으로',
        typeKey: 'addition_to_multiplication',
        title: `같은 수를 여러 번 더한 식을 곱셈으로 계산해 보세요.`,
        subTitle: `${dan}을 ${num}번 더한 계산 결과는 얼마일까요?`,
        formula: `${addExpr} = ?`,
        visual: `${addExpr} ➔ ${dan} × ${num} = ?`,
        answer: ans,
        options: generateOptions(ans, dan, false),
        explanation: `${dan}을 ${num}번 더한 식은 ${dan} × ${num}과 같으므로 계산 결과는 ${ans}입니다.`
      });

      // =========================================================
      // [7] 몇의 몇 배를 곱셈식으로 (times_to_multiplication)
      // 유형 A: 'a의 b배'를 곱셈식 a × □ 로 나타낼 때 빈칸 □ 구하기
      // 유형 B: 'a의 b배'를 곱셈식으로 나타내고 계산 결과 구하기
      // =========================================================
      // 유형 7-A: 빈칸 채우기 (정답: num)
      bank.push({
        id: `QB_${idCounter++}`,
        dan,
        num,
        category: '✨ 몇의 몇 배를 곱셈식으로',
        typeKey: 'times_to_multiplication',
        title: `'${dan}의 ${num}배'를 곱셈식으로 나타낼 때 빈칸에 들어갈 수는?`,
        subTitle: `'몇의 몇 배'를 곱셈 기호(×)로 바꾸어 보세요.`,
        formula: `${dan}의 ${num}배 = ${dan} × □`,
        visual: `${dan}의 ${num}배 = ${dan} × [ □ ]`,
        answer: num, // 곱하는 수
        options: generateOptions(num, dan, true),
        explanation: `'${dan}의 ${num}배'는 곱셈식으로 '${dan} × ${num}'으로 씁니다. 따라서 □ = ${num}입니다.`
      });

      // 유형 7-B: 계산 결과 구하기 (정답: ans)
      bank.push({
        id: `QB_${idCounter++}`,
        dan,
        num,
        category: '✨ 몇의 몇 배를 곱셈식으로',
        typeKey: 'times_to_multiplication',
        title: `'${dan}의 ${num}배'를 곱셈식으로 계산해 보세요.`,
        subTitle: `${dan}의 ${num}배는 곱셈식으로 ${dan} × ${num}입니다.`,
        formula: `${dan} × ${num} = ?`,
        visual: `${dan}의 ${num}배 ➔ ${dan} × ${num} = ?`,
        answer: ans,
        options: generateOptions(ans, dan, false),
        explanation: `'${dan}의 ${num}배'는 ${dan} × ${num} = ${ans}입니다.`
      });
    }
  }

  return bank;
}

// 싱글톤 문제 은행 생성
const ALL_QUESTIONS = buildQuestionBank();

/**
 * 100% 무오류 수학 검증 함수 (불변식 검사)
 * - 정답 일치 검사
 * - 시각화 아이콘 개수 일치 검사
 * - 4지선다 보기 유효성 (정답 포함, 중복 없음, 양수)
 */
function validateQuestionBank() {
  console.log(`[문제 은행 검증 시작] 총 ${ALL_QUESTIONS.length}개 문제 검증 중...`);

  let errorCount = 0;
  ALL_QUESTIONS.forEach((q, idx) => {
    // 1. 기본 필드 검사
    if (!q.formula || q.answer === undefined || !q.title || !q.options) {
      console.error(`[오류] 문제 #${idx} 필수 필드 누락`, q);
      errorCount++;
    }

    // 2. 4지선다 검사
    if (q.options.length !== 4) {
      console.error(`[오류] 문제 #${idx} 보기 개수가 4개가 아님: ${q.options.length}`, q);
      errorCount++;
    }
    const uniqueOptions = new Set(q.options);
    if (uniqueOptions.size !== 4) {
      console.error(`[오류] 문제 #${idx} 보기에 중복이 있음:`, q.options);
      errorCount++;
    }
    if (!uniqueOptions.has(q.answer)) {
      console.error(`[오류] 문제 #${idx} 보기에 정답(${q.answer})이 없음:`, q.options);
      errorCount++;
    }
    for (const opt of q.options) {
      if (typeof opt !== 'number' || opt <= 0 || !Number.isInteger(opt)) {
        console.error(`[오류] 문제 #${idx} 보기에 유효하지 않은 정수가 있음: ${opt}`);
        errorCount++;
      }
    }

    // 3. 수학적 정답 검사
    if (q.formula.includes('□')) {
      // 빈칸 문제의 경우 정답은 num이어야 함
      if (q.answer !== q.num) {
        console.error(`[오류] 빈칸 문제 #${idx} 정답 불일치: expected ${q.num}, got ${q.answer}`);
        errorCount++;
      }
    } else {
      // 일반 연산 문제의 경우 정답은 dan * num이어야 함
      if (q.answer !== q.dan * q.num) {
        console.error(`[오류] 연산 문제 #${idx} 정답 불일치: ${q.dan} * ${q.num} != ${q.answer}`);
        errorCount++;
      }
    }

    // 4. 시각화 아이콘 개수 검증 (group_count)
    if (q.typeKey === 'group_count') {
      const match = q.visual.match(new RegExp(q.itemIcon, 'g'));
      const actualCount = match ? match.length : 0;
      const expectedCount = q.dan * q.num;
      if (actualCount !== expectedCount) {
        console.error(`[오류] 묶어 세기 #${idx} 아이콘 개수 불일치! 기대: ${expectedCount}, 실제: ${actualCount}`);
        errorCount++;
      }
    }

    // 5. 시각화 아이콘 개수 검증 (count_one_by_one)
    if (q.typeKey === 'count_one_by_one') {
      const match = q.visual.match(new RegExp(q.itemIcon, 'g'));
      const actualCount = match ? match.length : 0;
      const expectedCount = q.dan * q.num;
      if (actualCount !== expectedCount) {
        console.error(`[오류] 하나씩 세기 #${idx} 아이콘 개수 불일치! 기대: ${expectedCount}, 실제: ${actualCount}`);
        errorCount++;
      }
    }
  });

  if (errorCount === 0) {
    console.log(`✅ [문제 은행 검증 완료] 총 ${ALL_QUESTIONS.length}개 문제 모두 100% 수학적 무오류 통과!`);
    return true;
  } else {
    console.error(`❌ [문제 은행 검증 실패] 총 ${errorCount}개의 오류가 발견되었습니다!`);
    return false;
  }
}

/**
 * 특정 지역 및 교사 설정에 따른 문제 무작위 추출 함수 (Random Sampling)
 * @param {Object} settings - { danRange: 'all'|'2to5'|'6to9', conceptMode: 'all'|'visual'|'concept'|'formula' }
 * @param {number} count - 추출할 문제 수 (보통 5개 또는 3개)
 * @param {string} regionId - 지역 고유 ID (지역별 일관성 및 무작위성 확보)
 */
function getQuestionsForRegion(settings = {}, count = 5, regionId = '') {
  // 1. 단 범위 필터링
  let filtered = ALL_QUESTIONS;
  if (settings.danRange === '2to5') {
    filtered = filtered.filter(q => q.dan >= 2 && q.dan <= 5);
  } else if (settings.danRange === '6to9') {
    filtered = filtered.filter(q => q.dan >= 6 && q.dan <= 9);
  }

  // 2. 개념 모드 필터링
  if (settings.conceptMode === 'visual') {
    filtered = filtered.filter(q => ['skip_count', 'group_count', 'count_one_by_one'].includes(q.typeKey));
  } else if (settings.conceptMode === 'concept') {
    filtered = filtered.filter(q => ['groups_of', 'times_of'].includes(q.typeKey));
  } else if (settings.conceptMode === 'formula') {
    filtered = filtered.filter(q => ['addition_to_multiplication', 'times_to_multiplication'].includes(q.typeKey));
  }

  // 필터링 결과가 부족할 경우 전체 풀로 복원
  if (filtered.length < count) {
    filtered = ALL_QUESTIONS;
  }

  // 3. 다양한 개념 유형이 골고루 섞이도록 셔플
  const shuffled = [...filtered];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 4. 7대 개념이 중복되지 않고 골고루 포함되도록 우선 추출
  const selected = [];
  const usedTypes = new Set();

  for (const q of shuffled) {
    if (!usedTypes.has(q.typeKey)) {
      selected.push(q);
      usedTypes.add(q.typeKey);
      if (selected.length === count) break;
    }
  }

  // 아직 count개에 미치지 못하면 나머지 중에서 무작위 추가
  if (selected.length < count) {
    for (const q of shuffled) {
      if (!selected.some(s => s.id === q.id)) {
        selected.push(q);
        if (selected.length === count) break;
      }
    }
  }

  // 최종 문제 목록에서 보기들을 매번 새롭게 셔플하여 학생에게 반환
  return selected.slice(0, count).map(q => ({
    ...q,
    options: [...q.options].sort(() => Math.random() - 0.5)
  }));
}

module.exports = {
  ALL_QUESTIONS,
  buildQuestionBank,
  validateQuestionBank,
  getQuestionsForRegion
};
