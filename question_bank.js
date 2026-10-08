/**
 * 공주시 곱셈 땅따먹기 대작전 - 문제 은행 (Question Bank)
 * 
 * [교육과정 구성]
 * 1. 📘 초등 2학년 1학기 복습: 곱셈 기초 개념 형성 (7대 개념)
 *    - skip_count: 몇씩 뛰어 세기
 *    - group_count: 묶어 세기
 *    - count_one_by_one: 하나씩 세어 보기
 *    - groups_of: 몇씩 몇 묶음
 *    - times_of: 몇의 몇 배
 *    - addition_to_multiplication: 덧셈식을 곱셈식으로 (빈칸 & 계산)
 *    - times_to_multiplication: 몇의 몇 배를 곱셈식으로 (빈칸 & 계산)
 * 
 * 2. 📕 초등 2학년 2학기 곱셈구구: 2단~9단 곱셈구구와 활용 (6대 영역)
 *    - gugu_calc: ⚡ 구구단 기본 연산 (2단 ~ 9단 × 1 ~ 9)
 *    - gugu_blank: 🔍 빈칸 구구단 (곱하는 수 □ or 앞의 단 □ 거꾸로 구구단)
 *    - gugu_word_problem: 🌰 실생활 문장제 (공주 특산물 & 생활 속 곱셈)
 *    - gugu_rule: 📏 곱셈구구 규칙과 성질 (증가 규칙, 인접 곱 비교, 교환법칙 성질)
 *    - zero_one_mul: 🎯 0과 1의 곱셈구구 (1의 단, 0의 곱)
 *    - gugu_table: 📊 곱셈표와 수 배열 (곱셈구구표 가로×세로 칸 찾기)
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
 * 한국어 받침 유무에 따른 자연스러운 조사 반환
 */
function getJosa(word, josaType) {
  const charCode = word.charCodeAt(word.length - 1);
  const hasJongseong = (charCode - 0xAC00) % 28 > 0;
  if (josaType === '이/가') {
    return hasJongseong ? `${word}이` : `${word}가`;
  } else if (josaType === '을/를') {
    return hasJongseong ? `${word}을` : `${word}를`;
  } else if (josaType === '은/는') {
    return hasJongseong ? `${word}은` : `${word}는`;
  } else if (josaType === '과/와') {
    return hasJongseong ? `${word}과` : `${word}와`;
  }
  return word;
}

/**
 * 4지선다 보기 생성기 (초등 2학년 맞춤형 매력적 오답 생성)
 * - 중복 없음 (Set 크기 4)
 * - 정답 반드시 포함
 * - 0 이상의 정수 (0의 곱 포함)
 * - 연산 실수나 구구단 인접 오답(±dan, ±1, ±2 등) 반영
 */
function generateOptions(answer, dan, isSmallNumber = false) {
  const optionsSet = new Set([answer]);

  let candidateDeltas;
  if (answer === 0) {
    candidateDeltas = [1, 2, 3, dan || 4, (dan || 4) + 1, 5];
  } else if (isSmallNumber) {
    candidateDeltas = [1, -1, 2, -2, 3, -3, 4, -4];
  } else {
    const d = dan || 2;
    candidateDeltas = [
      d, -d,           // 단 간격 오답 (구구단 한 번 덜/더 외움)
      1, -1,           // 단순 계산 실수
      2, -2,           // 짝/홀 오차
      d * 2, -d * 2,
      10, -10
    ];
  }

  for (const delta of candidateDeltas) {
    const val = answer + delta;
    if (val >= 0 && val !== answer && !optionsSet.has(val)) {
      optionsSet.add(val);
      if (optionsSet.size === 4) break;
    }
  }

  // 여전히 4개가 안 채워진 경우
  let fallback = 0;
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

// 2학년 2학기 실생활 문장제 소재 템플릿 (2단 ~ 9단)
const WORD_PROBLEMS = {
  2: [
    { title: (d, n) => `제민천 자전거 도로에 자전거가 ${n}대 지나가고 있습니다.`, sub: (d, n) => `자전거 1대당 바퀴는 2개입니다. 바퀴는 모두 몇 개일까요?`, icon: '🚲' },
    { title: (d, n) => `공주 정안알밤으로 만든 밤빵을 한 봉지에 2개씩 담았습니다.`, sub: (d, n) => `${n}봉지에 들어 있는 알밤빵은 모두 몇 개일까요?`, icon: '🍞' },
    { title: (d, n) => `체육 시간에 신을 양말을 2짝씩 한 켤레로 묶어 놓았습니다.`, sub: (d, n) => `양말 ${n}켤레는 모두 몇 짝일까요?`, icon: '🧦' }
  ],
  3: [
    { title: (d, n) => `공원 놀이터에 어린이 세발자전거가 ${n}대 있습니다.`, sub: (d, n) => `세발자전거 1대당 바퀴는 3개입니다. 바퀴는 모두 몇 개일까요?`, icon: '🚲' },
    { title: (d, n) => `무령왕릉 기념관에서 공주 역사 엽서를 1명에게 3장씩 주려고 합니다.`, sub: (d, n) => `학생 ${n}명에게 나누어 줄 엽서는 모두 몇 장일까요?`, icon: '📜' },
    { title: (d, n) => `횡단보도 신호등 1개에는 신호 불빛이 3개(빨강, 노랑, 초록) 있습니다.`, sub: (d, n) => `신호등 ${n}개에 있는 신호 불빛은 모두 몇 개일까요?`, icon: '🚦' }
  ],
  4: [
    { title: (d, n) => `마곡사 솔바람길 전통 찻집에 탁자가 ${n}개 놓여 있습니다.`, sub: (d, n) => `탁자 하나마다 의자가 4개씩 있다면 의자는 모두 몇 개일까요?`, icon: '🪑' },
    { title: (d, n) => `귀여운 강아지 ${n}마리가 공산성 잔디밭에서 뛰어놀고 있습니다.`, sub: (d, n) => `강아지 1마리당 발이 4개라면 발은 모두 몇 개일까요?`, icon: '🐶' },
    { title: (d, n) => `자동차 1대에는 바퀴가 4개씩 달려 있습니다.`, sub: (d, n) => `주차장에 있는 자동차 ${n}대의 바퀴는 모두 몇 개일까요?`, icon: '🚗' }
  ],
  5: [
    { title: (d, n) => `공주 우성 멜론을 선물 상자에 5개씩 담아 포장했습니다.`, sub: (d, n) => `${n}상자에 들어 있는 멜론은 모두 몇 개일까요?`, icon: '🍈' },
    { title: (d, n) => `겨울 장갑 한 짝에는 손가락이 5개 들어갑니다.`, sub: (d, n) => `장갑 ${n}짝에 있는 손가락 구멍은 모두 몇 개일까요?`, icon: '🧤' },
    { title: (d, n) => `색연필을 필통 하나에 5자루씩 꽂아 놓았습니다.`, sub: (d, n) => `필통 ${n}개에 꽂혀 있는 색연필은 모두 몇 자루일까요?`, icon: '✏️' }
  ],
  6: [
    { title: (d, n) => `신선한 유정란 달걀을 한 판에 6개씩 담았습니다.`, sub: (d, n) => `${n}판에 들어 있는 달걀은 모두 몇 개일까요?`, icon: '🥚' },
    { title: (d, n) => `달콤한 공주 정안 밤파이를 한 상자에 6개씩 넣었습니다.`, sub: (d, n) => `${n}상자에 들어 있는 밤파이는 모두 몇 개일까요?`, icon: '🥧' },
    { title: (d, n) => `수학 시간에 정육각형 모양 블록을 만들고 있습니다.`, sub: (d, n) => `정육각형 1개당 변이 6개라면, 정육각형 ${n}개의 변은 모두 몇 개일까요?`, icon: '🔷' }
  ],
  7: [
    { title: (d, n) => `일주일은 월요일부터 일요일까지 7일입니다.`, sub: (d, n) => `${n}주일은 모두 며칠일까요?`, icon: '📅' },
    { title: (d, n) => `지우는 매일 수학 문제를 7문제씩 꾸준히 풀고 있습니다.`, sub: (d, n) => `${n}일 동안 푼 수학 문제는 모두 몇 문제일까요?`, icon: '📖' },
    { title: (d, n) => `알록달록 아름다운 무지개는 7가지 색깔을 가지고 있습니다.`, sub: (d, n) => `무지개 그림 ${n}장에 쓰인 색깔의 총합은 몇 개일까요?`, icon: '🌈' }
  ],
  8: [
    { title: (d, n) => `바닷속에 살고 있는 문어 1마리는 다리가 8개 있습니다.`, sub: (d, n) => `문어 ${n}마리의 다리는 모두 몇 개일까요?`, icon: '🐙' },
    { title: (d, n) => `공주 특산물 정안알밤 만주 선물 세트 한 상자에 8개씩 들어 있습니다.`, sub: (d, n) => `${n}상자에 들어 있는 알밤 만주는 모두 몇 개일까요?`, icon: '🌰' },
    { title: (d, n) => `거미 1마리는 다리가 8개씩 있습니다.`, sub: (d, n) => `거미 ${n}마리의 다리는 모두 몇 개일까요?`, icon: '🕷️' }
  ],
  9: [
    { title: (d, n) => `유구천 수국 축제 행사장에 화분을 한 줄에 9개씩 놓았습니다.`, sub: (d, n) => `${n}줄에 놓인 화분은 모두 몇 개일까요?`, icon: '🌸' },
    { title: (d, n) => `미술 시간에 모둠마다 색종이를 9장씩 나누어 주었습니다.`, sub: (d, n) => `${n}모둠에게 나누어 준 색종이는 모두 몇 장일까요?`, icon: '🎨' },
    { title: (d, n) => `공주 계룡산 도자기 마을에서 예쁜 찻잔을 9개씩 상자에 담았습니다.`, sub: (d, n) => `${n}상자에 들어 있는 찻잔은 모두 몇 개일까요?`, icon: '🍵' }
  ]
};

/**
 * [1] 2학년 1학기 복습 문제 생성기 (총 456문제)
 * - skip_count: 몇씩 뛰어 세기
 * - group_count: 묶어 세기
 * - count_one_by_one: 하나씩 세어 보기
 * - groups_of: 몇씩 몇 묶음
 * - times_of: 몇의 몇 배
 * - addition_to_multiplication: 덧셈식을 곱셈식으로 (빈칸 & 계산)
 * - times_to_multiplication: 몇의 몇 배를 곱셈식으로 (빈칸 & 계산)
 */
function buildSemester2_1Questions(startId = 1) {
  const list = [];
  let id = startId;

  for (let dan = 2; dan <= 9; dan++) {
    for (let num = 2; num <= 9; num++) {
      const ans = dan * num;
      const itemIndex = (dan + num) % VISUAL_ITEMS.length;
      const item = VISUAL_ITEMS[itemIndex];

      // 1. 몇씩 뛰어 세기 (skip_count)
      if (num >= 3 && num <= 6) {
        const steps = [];
        for (let s = 1; s <= num; s++) {
          if (s === num) {
            steps.push('❓');
          } else {
            steps.push(dan * s);
          }
        }
        list.push({
          id: `QB_2_1_${id++}`,
          semester: '2-1',
          semesterTitle: '2학년 1학기 복습',
          dan,
          num,
          category: '🦘 몇씩 뛰어 세기',
          badgeText: '[1학기 복습] 🦘 몇씩 뛰어 세기',
          typeKey: 'skip_count',
          title: `${dan}씩 ${num}번 뛰어 세어 볼까요?`,
          subTitle: `뛰어 센 마지막 빈칸(❓)에 들어갈 알맞은 수는?`,
          formula: `${dan}씩 ${num}번 뛰어 센 수 = ?`,
          visual: steps.join('  ➔  '),
          answer: ans,
          options: generateOptions(ans, dan, false),
          explanation: `${dan}씩 ${num}번 뛰어 세면 ${dan * 1}, ${dan * 2}... 순서로 커져 마지막 수는 ${ans}이 됩니다.`
        });
      }

      // 2. 묶어 세기 (group_count)
      if (dan <= 6 && num <= 5) {
        const groupVisual = [];
        const singleGroup = Array(dan).fill(item.icon).join('');
        for (let g = 0; g < num; g++) {
          groupVisual.push(`[ ${singleGroup} ]`);
        }
        list.push({
          id: `QB_2_1_${id++}`,
          semester: '2-1',
          semesterTitle: '2학년 1학기 복습',
          dan,
          num,
          category: '📦 묶어 세기',
          badgeText: '[1학기 복습] 📦 묶어 세기',
          typeKey: 'group_count',
          itemIcon: item.icon,
          title: `${getJosa(item.name, '을/를')} ${dan}개씩 묶어 세어 보세요.`,
          subTitle: `${dan}개씩 ${num}묶음은 모두 몇 개일까요?`,
          formula: `${dan}개씩 ${num}묶음 = ?`,
          visual: groupVisual.join('  '),
          answer: ans,
          options: generateOptions(ans, dan, false),
          explanation: `[ ${singleGroup} ]이/가 ${num}묶음 있으므로, ${dan}을 ${num}번 묶어 세면 모두 ${ans}개입니다.`
        });
      }

      // 3. 하나씩 세어 보기 (count_one_by_one)
      if (dan <= 6 && num <= 5) {
        const rows = [];
        const singleRow = Array(dan).fill(item.icon).join(' ');
        for (let r = 0; r < num; r++) {
          rows.push(singleRow);
        }
        list.push({
          id: `QB_2_1_${id++}`,
          semester: '2-1',
          semesterTitle: '2학년 1학기 복습',
          dan,
          num,
          category: '👆 하나씩 세어 보기',
          badgeText: '[1학기 복습] 👆 하나씩 세어 보기',
          typeKey: 'count_one_by_one',
          itemIcon: item.icon,
          title: `${getJosa(item.name, '이/가')} 가지런히 놓여 있습니다. 모두 몇 개일까요?`,
          subTitle: `하나씩 세어 보거나 곱셈(${dan} × ${num})으로 빠르게 세어보세요!`,
          formula: `한 줄에 ${dan}개씩 ${num}줄 = ?`,
          visual: rows.join('\n'),
          answer: ans,
          options: generateOptions(ans, dan, false),
          explanation: `한 줄에 ${dan}개씩 ${num}줄이 있으므로 하나씩 세어도, 곱셈식 ${dan} × ${num}으로 계산해도 ${ans}개입니다.`
        });
      }

      // 4. 몇씩 몇 묶음 (groups_of)
      list.push({
        id: `QB_2_1_${id++}`,
        semester: '2-1',
        semesterTitle: '2학년 1학기 복습',
        dan,
        num,
        category: '🎁 몇씩 몇 묶음',
        badgeText: '[1학기 복습] 🎁 몇씩 몇 묶음',
        typeKey: 'groups_of',
        title: `${getJosa(item.name, '이/가')} ${dan}개씩 ${num}묶음 있습니다.`,
        subTitle: `전체 개수는 모두 몇 개인지 구해보세요.`,
        formula: `${dan}개씩 ${num}묶음 = ?`,
        visual: `${item.icon} ${dan}개씩 × ${num}묶음`,
        answer: ans,
        options: generateOptions(ans, dan, false),
        explanation: `${dan}개씩 ${num}묶음은 ${dan} × ${num} = ${ans}개입니다.`
      });

      // 5. 몇의 몇 배 (times_of)
      list.push({
        id: `QB_2_1_${id++}`,
        semester: '2-1',
        semesterTitle: '2학년 1학기 복습',
        dan,
        num,
        category: '🌱 몇의 몇 배',
        badgeText: '[1학기 복습] 🌱 몇의 몇 배',
        typeKey: 'times_of',
        title: `${dan}의 ${num}배는 얼마일까요?`,
        subTitle: `${dan}의 ${num}배는 ${dan}을 ${num}번 더한 크기예요.`,
        formula: `${dan}의 ${num}배 = ?`,
        visual: `${dan}을 ${num}번 더한 크기`,
        answer: ans,
        options: generateOptions(ans, dan, false),
        explanation: `${dan}의 ${num}배는 ${dan} × ${num} = ${ans}입니다.`
      });

      // 6. 덧셈식을 곱셈식으로 (addition_to_multiplication)
      const addExpr = Array(num).fill(dan).join(' + ');
      // 6-A 빈칸
      list.push({
        id: `QB_2_1_${id++}`,
        semester: '2-1',
        semesterTitle: '2학년 1학기 복습',
        dan,
        num,
        category: '➕ 덧셈식을 곱셈식으로',
        badgeText: '[1학기 복습] ➕ 덧셈식을 곱셈식으로',
        typeKey: 'addition_to_multiplication',
        subType: 'blank',
        title: `덧셈식을 곱셈식으로 바꿀 때 빈칸에 들어갈 수는?`,
        subTitle: `${dan}을 ${num}번 더한 식입니다. 곱하는 수 □는 얼마일까요?`,
        formula: `${addExpr} = ${dan} × □`,
        visual: `${addExpr} = ${dan} × [ □ ]`,
        answer: num,
        options: generateOptions(num, dan, true),
        explanation: `${dan}을 ${num}번 더했으므로 곱셈식으로는 ${dan} × ${num}이 됩니다. 따라서 □ = ${num}입니다.`
      });
      // 6-B 결과 계산
      list.push({
        id: `QB_2_1_${id++}`,
        semester: '2-1',
        semesterTitle: '2학년 1학기 복습',
        dan,
        num,
        category: '➕ 덧셈식을 곱셈식으로',
        badgeText: '[1학기 복습] ➕ 덧셈식을 곱셈식으로',
        typeKey: 'addition_to_multiplication',
        subType: 'calc',
        title: `같은 수를 여러 번 더한 식을 곱셈으로 계산해 보세요.`,
        subTitle: `${dan}을 ${num}번 더한 계산 결과는 얼마일까요?`,
        formula: `${addExpr} = ?`,
        visual: `${addExpr} ➔ ${dan} × ${num} = ?`,
        answer: ans,
        options: generateOptions(ans, dan, false),
        explanation: `${dan}을 ${num}번 더한 식은 ${dan} × ${num}과 같으므로 계산 결과는 ${ans}입니다.`
      });

      // 7. 몇의 몇 배를 곱셈식으로 (times_to_multiplication)
      // 7-A 빈칸
      list.push({
        id: `QB_2_1_${id++}`,
        semester: '2-1',
        semesterTitle: '2학년 1학기 복습',
        dan,
        num,
        category: '✨ 몇의 몇 배를 곱셈식으로',
        badgeText: '[1학기 복습] ✨ 몇의 몇 배를 곱셈식으로',
        typeKey: 'times_to_multiplication',
        subType: 'blank',
        title: `'${dan}의 ${num}배'를 곱셈식으로 나타낼 때 빈칸에 들어갈 수는?`,
        subTitle: `'몇의 몇 배'를 곱셈 기호(×)로 바꾸어 보세요.`,
        formula: `${dan}의 ${num}배 = ${dan} × □`,
        visual: `${dan}의 ${num}배 = ${dan} × [ □ ]`,
        answer: num,
        options: generateOptions(num, dan, true),
        explanation: `'${dan}의 ${num}배'는 곱셈식으로 '${dan} × ${num}'으로 씁니다. 따라서 □ = ${num}입니다.`
      });
      // 7-B 결과 계산
      list.push({
        id: `QB_2_1_${id++}`,
        semester: '2-1',
        semesterTitle: '2학년 1학기 복습',
        dan,
        num,
        category: '✨ 몇의 몇 배를 곱셈식으로',
        badgeText: '[1학기 복습] ✨ 몇의 몇 배를 곱셈식으로',
        typeKey: 'times_to_multiplication',
        subType: 'calc',
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

  return list;
}

/**
 * [2] 2학년 2학기 곱셈구구 문제 생성기 (총 484문제)
 * - gugu_calc: ⚡ 구구단 기본 연산 (2단~9단 × 1~9)
 * - gugu_blank: 🔍 빈칸 구구단 (곱하는 수 □ or 앞의 단 □)
 * - gugu_word_problem: 🌰 실생활 문장제 (공주 특산물 & 일상생활)
 * - gugu_rule: 📏 곱셈구구 규칙과 성질 (증가 규칙, 차이 비교, 자리바꿈)
 * - zero_one_mul: 🎯 0과 1의 곱셈구구
 * - gugu_table: 📊 곱셈표와 수 배열
 */
function buildSemester2_2Questions(startId = 1) {
  const list = [];
  let id = startId;

  // 1. 구구단 기본 계산 (gugu_calc: 2단 ~ 9단 × 1 ~ 9)
  for (let dan = 2; dan <= 9; dan++) {
    for (let num = 1; num <= 9; num++) {
      const ans = dan * num;
      list.push({
        id: `QB_2_2_${id++}`,
        semester: '2-2',
        semesterTitle: '2학년 2학기 곱셈구구',
        dan,
        num,
        category: '⚡ 구구단 계산',
        badgeText: '[2-2 곱셈구구] ⚡ 구구단 계산',
        typeKey: 'gugu_calc',
        title: `${dan} × ${num}의 계산 결과는 얼마일까요?`,
        subTitle: `${dan}의 단 곱셈구구를 외워 정답을 맞춰보세요!`,
        formula: `${dan} × ${num} = ?`,
        visual: `⭐ [ ${dan}의 단 곱셈구구 ]   ${dan} × ${num} = ?`,
        answer: ans,
        options: generateOptions(ans, dan, false),
        explanation: `${dan}의 단 곱셈구구에서 ${dan} × ${num} = ${ans}입니다.`
      });
    }
  }

  // 2. 빈칸 구구단 (gugu_blank: 곱하는 수 □ or 곱해지는 수 □)
  for (let dan = 2; dan <= 9; dan++) {
    for (let num = 2; num <= 9; num++) {
      const ans = dan * num;

      // 2-A. 곱하는 수 빈칸: dan × □ = ans
      list.push({
        id: `QB_2_2_${id++}`,
        semester: '2-2',
        semesterTitle: '2학년 2학기 곱셈구구',
        dan,
        num,
        category: '🔍 빈칸 구구단',
        badgeText: '[2-2 곱셈구구] 🔍 빈칸 구구단',
        typeKey: 'gugu_blank',
        subType: 'blank_multiplier',
        title: `곱셈구구를 생각하며 빈칸(□)에 들어갈 알맞은 수를 구해보세요.`,
        subTitle: `${dan}에 어떤 수를 곱해야 ${ans}이/가 될까요?`,
        formula: `${dan} × □ = ${ans}`,
        visual: `${dan} × [ □ ] = ${ans}`,
        answer: num,
        options: generateOptions(num, dan, true),
        explanation: `${dan}의 단에서 ${dan} × ${num} = ${ans}이므로 빈칸 □에 들어갈 수는 ${num}입니다.`
      });

      // 2-B. 앞의 단(곱해지는 수) 빈칸: □ × num = ans
      list.push({
        id: `QB_2_2_${id++}`,
        semester: '2-2',
        semesterTitle: '2학년 2학기 곱셈구구',
        dan,
        num,
        category: '🔍 빈칸 구구단',
        badgeText: '[2-2 곱셈구구] 🔍 빈칸 구구단',
        typeKey: 'gugu_blank',
        subType: 'blank_dan',
        title: `곱셈구구를 생각하며 앞의 빈칸(□)에 들어갈 알맞은 단을 구해보세요.`,
        subTitle: `어떤 수에 ${num}을(를) 곱하면 ${ans}이/가 될까요?`,
        formula: `□ × ${num} = ${ans}`,
        visual: `[ □ ] × ${num} = ${ans}`,
        answer: dan,
        options: generateOptions(dan, num, true),
        explanation: `${dan} × ${num} = ${ans}이므로 빈칸 □에 들어갈 단은 ${dan}입니다.`
      });
    }
  }

  // 3. 실생활 문장제 (gugu_word_problem: 공주 테마 & 일상 생활)
  for (let dan = 2; dan <= 9; dan++) {
    const templates = WORD_PROBLEMS[dan] || [];
    for (let num = 2; num <= 9; num++) {
      const ans = dan * num;
      const tIndex = (num - 2) % templates.length;
      const tmpl = templates[tIndex];

      list.push({
        id: `QB_2_2_${id++}`,
        semester: '2-2',
        semesterTitle: '2학년 2학기 곱셈구구',
        dan,
        num,
        category: '🌰 실생활 문장제',
        badgeText: '[2-2 곱셈구구] 🌰 실생활 문장제',
        typeKey: 'gugu_word_problem',
        title: tmpl.title(dan, num),
        subTitle: tmpl.sub(dan, num),
        formula: `${dan} × ${num} = ?`,
        visual: `${tmpl.icon} ${dan}개씩 × ${num} = ?`,
        answer: ans,
        options: generateOptions(ans, dan, false),
        explanation: `1개(모둠)에 ${dan}씩 ${num}개 있으므로 곱셈식은 ${dan} × ${num} = ${ans}입니다.`
      });
    }
  }

  // 4. 곱셈구구의 규칙과 성질 (gugu_rule)
  for (let dan = 2; dan <= 9; dan++) {
    // 4-A. 단의 증가 규칙 (곱하는 수가 1씩 커지면 곱은 얼마씩 커지는가? -> dan)
    list.push({
      id: `QB_2_2_${id++}`,
      semester: '2-2',
      semesterTitle: '2학년 2학기 곱셈구구',
      dan,
      num: 1,
      category: '📏 곱셈구구 규칙과 성질',
      badgeText: '[2-2 곱셈구구] 📏 규칙과 성질',
      typeKey: 'gugu_rule',
      subType: 'rule_increase',
      title: `${dan}의 단 곱셈구구에서 곱하는 수가 1씩 커지면, 그 곱은 얼마씩 커질까요?`,
      subTitle: `${dan}씩 뛰어 세는 구구단의 규칙을 생각해보세요.`,
      formula: `${dan}의 단 곱의 증가 규칙 = ?`,
      visual: `${dan}×1=${dan} ➔ ${dan}×2=${dan * 2} ➔ ${dan}×3=${dan * 3} ... (+${dan}씩 커짐)`,
      answer: dan,
      options: generateOptions(dan, dan, true),
      explanation: `${dan}의 단 곱셈구구는 곱하는 수가 1씩 커질 때마다 곱이 ${dan}씩 커집니다.`
    });

    // 4-B. 인접 곱 차이 비교: dan * num 은 dan * (num - 1) 보다 얼마 더 클까요? (정답: dan)
    for (let num = 3; num <= 9; num++) {
      list.push({
        id: `QB_2_2_${id++}`,
        semester: '2-2',
        semesterTitle: '2학년 2학기 곱셈구구',
        dan,
        num,
        category: '📏 곱셈구구 규칙과 성질',
        badgeText: '[2-2 곱셈구구] 📏 규칙과 성질',
        typeKey: 'gugu_rule',
        subType: 'rule_diff',
        title: `${dan} × ${num}의 값은 ${dan} × ${num - 1}의 값보다 얼마 더 클까요?`,
        subTitle: `${dan}을 ${num}번 더한 값과 ${num - 1}번 더한 값의 차이를 구해보세요.`,
        formula: `(${dan} × ${num}) - (${dan} × ${num - 1}) = ?`,
        visual: `${dan} × ${num - 1} = ${dan * (num - 1)}  ➔  ${dan} × ${num} = ${dan * num}`,
        answer: dan,
        options: generateOptions(dan, dan, true),
        explanation: `${dan} × ${num}은 ${dan}을 ${num}번 더한 것이고, ${dan} × ${num - 1}은 ${dan}을 ${num - 1}번 더한 것이므로 차이는 ${dan}입니다.`
      });
    }

    // 4-C. 자리바꿈(교환법칙) 성질: dan * num = ans 일 때 num * dan = ?
    for (let num = 2; num <= 9; num++) {
      if (dan !== num) {
        const ans = dan * num;
        list.push({
          id: `QB_2_2_${id++}`,
          semester: '2-2',
          semesterTitle: '2학년 2학기 곱셈구구',
          dan,
          num,
          category: '📏 곱셈구구 규칙과 성질',
          badgeText: '[2-2 곱셈구구] 📏 규칙과 성질',
          typeKey: 'gugu_rule',
          subType: 'rule_swap',
          title: `${dan} × ${num} = ${ans}일 때, 순서를 바꾼 ${num} × ${dan}의 값은 얼마일까요?`,
          subTitle: `곱하는 두 수의 순서를 바꾸어 곱해도 그 결과는 같습니다.`,
          formula: `${dan} × ${num} = ${num} × ${dan} = ?`,
          visual: `${dan} × ${num} = ${ans}  ➔  ${num} × ${dan} = [ ? ]`,
          answer: ans,
          options: generateOptions(ans, dan, false),
          explanation: `곱셈에서는 두 수의 순서를 바꾸어 곱해도 계산 결과가 같으므로 ${num} × ${dan} = ${ans}입니다.`
        });
      }
    }
  }

  // 5. 0과 1의 곱셈구구 (zero_one_mul)
  for (let n = 1; n <= 9; n++) {
    // 5-A: 1 × n = n
    list.push({
      id: `QB_2_2_${id++}`,
      semester: '2-2',
      semesterTitle: '2학년 2학기 곱셈구구',
      dan: 1,
      num: n,
      category: '🎯 0과 1의 곱',
      badgeText: '[2-2 곱셈구구] 🎯 0과 1의 곱',
      typeKey: 'zero_one_mul',
      subType: 'one_times_n',
      title: `1 × ${n}의 계산 결과는 얼마일까요?`,
      subTitle: `1을 ${n}번 더한 크기를 생각해보세요.`,
      formula: `1 × ${n} = ?`,
      visual: Array(n).fill('1').join(' + ') + ` = ?`,
      answer: n,
      options: generateOptions(n, 1, true),
      explanation: `1을 ${n}번 더하면 ${n}이므로 1 × ${n} = ${n}입니다.`
    });

    // 5-B: n × 1 = n
    list.push({
      id: `QB_2_2_${id++}`,
      semester: '2-2',
      semesterTitle: '2학년 2학기 곱셈구구',
      dan: n,
      num: 1,
      category: '🎯 0과 1의 곱',
      badgeText: '[2-2 곱셈구구] 🎯 0과 1의 곱',
      typeKey: 'zero_one_mul',
      subType: 'n_times_one',
      title: `${n} × 1의 계산 결과는 얼마일까요?`,
      subTitle: `어떤 수에 1을 곱하면 그 수 자신이 됩니다.`,
      formula: `${n} × 1 = ?`,
      visual: `${n}의 1배 = ?`,
      answer: n,
      options: generateOptions(n, 1, true),
      explanation: `어떤 수에 1을 곱하면 항상 그 수 자신이 되므로 ${n} × 1 = ${n}입니다.`
    });

    // 5-C: 0 × n = 0
    list.push({
      id: `QB_2_2_${id++}`,
      semester: '2-2',
      semesterTitle: '2학년 2학기 곱셈구구',
      dan: 0,
      num: n,
      category: '🎯 0과 1의 곱',
      badgeText: '[2-2 곱셈구구] 🎯 0과 1의 곱',
      typeKey: 'zero_one_mul',
      subType: 'zero_times_n',
      title: `0 × ${n}의 계산 결과는 얼마일까요?`,
      subTitle: `0을 ${n}번 더하면 얼마가 될까요?`,
      formula: `0 × ${n} = ?`,
      visual: Array(n).fill('0').join(' + ') + ` = ?`,
      answer: 0,
      options: generateOptions(0, 2, true),
      explanation: `0을 아무리 여러 번 더해도 항상 0이므로 0 × ${n} = 0입니다.`
    });

    // 5-D: n × 0 = 0
    list.push({
      id: `QB_2_2_${id++}`,
      semester: '2-2',
      semesterTitle: '2학년 2학기 곱셈구구',
      dan: n,
      num: 0,
      category: '🎯 0과 1의 곱',
      badgeText: '[2-2 곱셈구구] 🎯 0과 1의 곱',
      typeKey: 'zero_one_mul',
      subType: 'n_times_zero',
      title: `${n} × 0의 계산 결과는 얼마일까요?`,
      subTitle: `어떤 수에 0을 곱하면 항상 0이 됩니다.`,
      formula: `${n} × 0 = ?`,
      visual: `접시 ${n}개에 알밤이 0개씩 있습니다 ➔ 전체 개수는?`,
      answer: 0,
      options: generateOptions(0, 2, true),
      explanation: `어떤 수에 0을 곱하면 그 결과는 항상 0이 되므로 ${n} × 0 = 0입니다.`
    });
  }

  // 6. 곱셈표와 수 배열 (gugu_table)
  for (let dan = 2; dan <= 9; dan++) {
    for (let num = 2; num <= 9; num++) {
      const ans = dan * num;
      list.push({
        id: `QB_2_2_${id++}`,
        semester: '2-2',
        semesterTitle: '2학년 2학기 곱셈구구',
        dan,
        num,
        category: '📊 곱셈표와 수 배열',
        badgeText: '[2-2 곱셈구구] 📊 곱셈표와 수 배열',
        typeKey: 'gugu_table',
        title: `곱셈구구표에서 ${dan}의 단 가로줄과 ${num}의 세로줄이 만나는 칸의 수는?`,
        subTitle: `곱셈표에서 두 수가 만나는 칸의 곱을 찾아보세요.`,
        formula: `${dan}단 × 세로 ${num}칸 = ?`,
        visual: `[ 곱셈구구표 ]\n  × | ... ${num} ...\n----+---------\n ${dan}  | [ ? ]`,
        answer: ans,
        options: generateOptions(ans, dan, false),
        explanation: `곱셈표에서 ${dan}의 단과 ${num}이 만나는 칸의 곱은 ${dan} × ${num} = ${ans}입니다.`
      });
    }
  }

  return list;
}

/**
 * 전체 문제 은행 빌드 (2-1 복습 456개 + 2-2 곱셈구구 484개 = 총 940개)
 */
function buildQuestionBank() {
  const p1 = buildSemester2_1Questions(1);
  const p2 = buildSemester2_2Questions(1);
  return [...p1, ...p2];
}

const QUESTIONS_2_1 = buildSemester2_1Questions(1);
const QUESTIONS_2_2 = buildSemester2_2Questions(1);
const ALL_QUESTIONS = [...QUESTIONS_2_1, ...QUESTIONS_2_2];

/**
 * 100% 무오류 수학 검증 함수 (불변식 검사)
 */
function validateQuestionBank() {
  console.log(`[문제 은행 검증 시작] 총 ${ALL_QUESTIONS.length}개 문제 검증 중... (2학년 1학기 복습: ${QUESTIONS_2_1.length}개, 2학년 2학기 곱셈구구: ${QUESTIONS_2_2.length}개)`);

  let errorCount = 0;
  ALL_QUESTIONS.forEach((q, idx) => {
    // 1. 필수 필드 검사
    if (!q.formula || q.answer === undefined || !q.title || !q.options || !q.semester) {
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
      if (typeof opt !== 'number' || opt < 0 || !Number.isInteger(opt)) {
        console.error(`[오류] 문제 #${idx} 보기에 유효하지 않은 정수가 있음: ${opt}`);
        errorCount++;
      }
    }

    // 3. 수학적 정답 검사
    if (q.typeKey === 'skip_count' || q.typeKey === 'group_count' || q.typeKey === 'count_one_by_one' ||
        q.typeKey === 'groups_of' || q.typeKey === 'times_of' || q.typeKey === 'gugu_calc' ||
        q.typeKey === 'gugu_word_problem' || q.typeKey === 'gugu_table') {
      if (q.answer !== q.dan * q.num) {
        console.error(`[오류] 연산 문제 #${idx} 정답 불일치: ${q.dan} * ${q.num} != ${q.answer}`);
        errorCount++;
      }
    } else if (q.typeKey === 'addition_to_multiplication' || q.typeKey === 'times_to_multiplication') {
      if (q.subType === 'blank') {
        if (q.answer !== q.num) {
          console.error(`[오류] 식 변환 빈칸 문제 #${idx} 정답 불일치: expected ${q.num}, got ${q.answer}`);
          errorCount++;
        }
      } else {
        if (q.answer !== q.dan * q.num) {
          console.error(`[오류] 식 변환 계산 문제 #${idx} 정답 불일치: ${q.dan} * ${q.num} != ${q.answer}`);
          errorCount++;
        }
      }
    } else if (q.typeKey === 'gugu_blank') {
      if (q.subType === 'blank_multiplier') {
        if (q.answer !== q.num) {
          console.error(`[오류] 빈칸 곱하는 수 정답 불일치 #${idx}: expected ${q.num}, got ${q.answer}`);
          errorCount++;
        }
      } else if (q.subType === 'blank_dan') {
        if (q.answer !== q.dan) {
          console.error(`[오류] 빈칸 앞의 단 정답 불일치 #${idx}: expected ${q.dan}, got ${q.answer}`);
          errorCount++;
        }
      }
    } else if (q.typeKey === 'gugu_rule') {
      if (q.subType === 'rule_increase' || q.subType === 'rule_diff') {
        if (q.answer !== q.dan) {
          console.error(`[오류] 규칙 정답 불일치 #${idx}: expected ${q.dan}, got ${q.answer}`);
          errorCount++;
        }
      } else if (q.subType === 'rule_swap') {
        if (q.answer !== q.dan * q.num) {
          console.error(`[오류] 교환법칙 정답 불일치 #${idx}: expected ${q.dan * q.num}, got ${q.answer}`);
          errorCount++;
        }
      }
    } else if (q.typeKey === 'zero_one_mul') {
      if (q.subType === 'one_times_n' || q.subType === 'n_times_one') {
        const expected = (q.subType === 'one_times_n') ? q.num : q.dan;
        if (q.answer !== expected) {
          console.error(`[오류] 1의 곱 정답 불일치 #${idx}: expected ${expected}, got ${q.answer}`);
          errorCount++;
        }
      } else if (q.subType === 'zero_times_n' || q.subType === 'n_times_zero') {
        if (q.answer !== 0) {
          console.error(`[오류] 0의 곱 정답 불일치 #${idx}: expected 0, got ${q.answer}`);
          errorCount++;
        }
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
    console.log(`✅ [문제 은행 검증 완료] 총 ${ALL_QUESTIONS.length}개 문제 (1학기 복습 456개, 2학기 곱셈구구 484개) 모두 100% 수학적 무오류 통과!`);
    return true;
  } else {
    console.error(`❌ [문제 은행 검증 실패] 총 ${errorCount}개의 오류가 발견되었습니다!`);
    return false;
  }
}

/**
 * 특정 지역 및 교사 설정에 따른 문제 무작위 추출 함수 (Random Sampling)
 * @param {Object} settings - { curriculum: 'all'|'2-1'|'2-2', danRange: 'all'|'2to5'|'6to9', conceptMode: 'all'|... }
 * @param {number} count - 추출할 문제 수 (기본 5개)
 * @param {string} regionId - 지역 고유 ID
 */
function getQuestionsForRegion(settings = {}, count = 5, regionId = '') {
  // 1. 교육과정 / 학기 필터링 (curriculum)
  let filtered = ALL_QUESTIONS;
  if (settings.curriculum === '2-1') {
    filtered = filtered.filter(q => q.semester === '2-1');
  } else if (settings.curriculum === '2-2') {
    filtered = filtered.filter(q => q.semester === '2-2');
  }

  // 2. 단 범위 필터링 (danRange)
  if (settings.danRange === '2to5') {
    filtered = filtered.filter(q => q.dan <= 5);
  } else if (settings.danRange === '6to9') {
    filtered = filtered.filter(q => q.dan >= 6 && q.dan <= 9);
  }

  // 3. 개념/유형 모드 필터링 (conceptMode)
  if (settings.conceptMode === 'visual') {
    filtered = filtered.filter(q => ['skip_count', 'group_count', 'count_one_by_one'].includes(q.typeKey));
  } else if (settings.conceptMode === 'concept') {
    filtered = filtered.filter(q => ['groups_of', 'times_of'].includes(q.typeKey));
  } else if (settings.conceptMode === 'formula') {
    filtered = filtered.filter(q => ['addition_to_multiplication', 'times_to_multiplication'].includes(q.typeKey));
  } else if (settings.conceptMode === 'gugu_calc') {
    filtered = filtered.filter(q => q.typeKey === 'gugu_calc');
  } else if (settings.conceptMode === 'gugu_blank') {
    filtered = filtered.filter(q => q.typeKey === 'gugu_blank');
  } else if (settings.conceptMode === 'gugu_word') {
    filtered = filtered.filter(q => q.typeKey === 'gugu_word_problem');
  } else if (settings.conceptMode === 'gugu_rule') {
    filtered = filtered.filter(q => q.typeKey === 'gugu_rule');
  } else if (settings.conceptMode === 'zero_one') {
    filtered = filtered.filter(q => q.typeKey === 'zero_one_mul');
  } else if (settings.conceptMode === 'gugu_table') {
    filtered = filtered.filter(q => q.typeKey === 'gugu_table');
  }

  // 필터링 결과가 부족할 경우 학기별 기본 풀 또는 전체 풀로 복원
  if (filtered.length < count) {
    if (settings.curriculum === '2-1') {
      filtered = ALL_QUESTIONS.filter(q => q.semester === '2-1');
    } else if (settings.curriculum === '2-2') {
      filtered = ALL_QUESTIONS.filter(q => q.semester === '2-2');
    } else {
      filtered = ALL_QUESTIONS;
    }
  }

  // 4. 다양한 개념 유형이 골고루 섞이도록 셔플
  const shuffled = [...filtered];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 5. 다양한 개념 유형이 중복되지 않고 골고루 포함되도록 우선 추출
  const selected = [];
  const usedTypes = new Set();

  for (const q of shuffled) {
    if (!usedTypes.has(q.typeKey)) {
      selected.push(q);
      usedTypes.add(q.typeKey);
      if (selected.length === count) break;
    }
  }

  // 부족하면 나머지 중에서 추가
  if (selected.length < count) {
    for (const q of shuffled) {
      if (!selected.some(s => s.id === q.id)) {
        selected.push(q);
        if (selected.length === count) break;
      }
    }
  }

  // 6. 각 문제의 options 복사 및 무작위 셔플
  return selected.slice(0, count).map(q => {
    const opts = [...q.options];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return {
      ...q,
      options: opts
    };
  });
}

module.exports = {
  ALL_QUESTIONS,
  QUESTIONS_2_1,
  QUESTIONS_2_2,
  buildQuestionBank,
  validateQuestionBank,
  getQuestionsForRegion
};
