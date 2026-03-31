const products = [
  {
    id: 1,
    category: "건강보험",
    name: "건강보험 기본형",
    insurers: ["samsung", "db", "hyundai", "meritz", "kb"],
    forGoals: ["보장분석", "건강보장", "보험정리", "가족보장"],
    forInterests: ["암", "뇌혈관", "심장질환", "입원수술", "후유장해"],
    scoreRules: {
      minAge: 20,
      maxAge: 64,
      marriedBonus: 1,
      childBonus: 1,
    },
    points: [
      "암·뇌·심장 진단비 우선 점검",
      "수술비/입원일당 중복 여부 확인",
      "기존 실손 외 부족 담보 보완",
      "가족력 있으면 특정진단비 강조",
    ],
    compareFields: ["진단비", "수술비", "입원일당", "납입기간", "해약환급금"],
  },
  {
    id: 2,
    category: "운전자보험",
    name: "운전자 비용보장형",
    insurers: ["db", "hyundai", "kb", "samsung"],
    forGoals: ["운전자보장", "비용보장", "보험정리"],
    forInterests: ["운전자", "교통사고처리지원금", "벌금", "변호사선임비"],
    scoreRules: {
      drivingRequired: true,
    },
    points: [
      "운전 여부 확인 후 필수 제안",
      "교통사고처리지원금/벌금/변호사선임비 핵심",
      "자동차보험과 운전자보험 차이 설명",
      "업무용·출퇴근 운전 빈도 반드시 체크",
    ],
    compareFields: ["교통사고처리지원금", "변호사선임비", "벌금", "상해입원", "월보험료"],
  },
  {
    id: 3,
    category: "어린이/가족보장",
    name: "가족형 어린이/자녀보장",
    insurers: ["hyundai", "db", "kb", "samsung"],
    forGoals: ["가족보장", "자녀보장", "보험정리"],
    forInterests: ["자녀", "어린이", "암", "입원수술"],
    scoreRules: {
      childRequired: true,
      marriedBonus: 1,
    },
    points: [
      "자녀 유무 확인 후 가족 단위 상담 연결",
      "자녀보험/엄마아빠 보험 동시 점검 포인트 제시",
      "실손 외 진단비/수술비 보완 설명",
      "갱신형/비갱신형 비교 설명 필요",
    ],
    compareFields: ["가입나이", "암진단비", "수술비", "입원일당", "갱신여부"],
  },
  {
    id: 4,
    category: "유병자/간편심사",
    name: "간편심사 건강보험",
    insurers: ["heungkuk", "db", "meritz"],
    forGoals: ["건강보장", "보험정리", "유병자상담"],
    forInterests: ["유병자", "간편심사", "암", "뇌혈관", "심장질환"],
    scoreRules: {
      minAge: 35,
    },
    points: [
      "병력 고지 가능 여부 먼저 확인",
      "간편심사형은 고지항목/할증 여부 체크",
      "기존 계약 인수 가능성부터 점검",
      "무리한 담보 확대보다 핵심담보 우선",
    ],
    compareFields: ["고지조건", "간편심사 문항", "암진단비", "뇌/심장", "보험료"],
  },
  {
    id: 5,
    category: "종신/가족책임보장",
    name: "가족책임 대비형",
    insurers: ["samsung", "kb", "db"],
    forGoals: ["가족보장", "사망보장", "보험정리"],
    forInterests: ["사망", "가족", "종신", "생활비"],
    scoreRules: {
      marriedBonus: 1,
      childBonus: 2,
    },
    points: [
      "가족 부양 책임 여부 중심 상담",
      "사망보장 필요금액 과다설계 주의",
      "기존 종신/정기보험 중복 여부 확인",
      "생활비 관점으로 쉽게 설명",
    ],
    compareFields: ["사망보장", "납입기간", "환급구조", "유지여력", "월보험료"],
  },
];

export default products;
