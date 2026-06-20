/**
 * 야구장 먹거리 최적화 서비스 - KBO 9대 구장 확장 및 상태 관리
 */

// 구단별 정보 정의 (네온 테마 컬러 포함)
export const KBO_CLUBS = {
  jamsil: { id: "jamsil", name: "서울 잠실 야구장 (LG/두산)", color: "#00ffff", subColor: "#ff0055" },
  munhak: { id: "munhak", name: "인천 SSG 랜더스필드 (SSG)", color: "#ff003c", subColor: "#ffffff" },
  sajik: { id: "sajik", name: "부산 사직 야구장 (롯데)", color: "#002f6c", subColor: "#df0024" },
  gocheok: { id: "gocheok", name: "서울 고척 스카이돔 (키움)", color: "#8c1d40", subColor: "#cda250" },
  daejeon: { id: "daejeon", name: "대전 한화생명이글스파크 (한화)", color: "#ff6600", subColor: "#333333" },
  daegu: { id: "daegu", name: "대구 삼성 라이온즈 파크 (삼성)", color: "#0080ff", subColor: "#ffffff" },
  changwon: { id: "changwon", name: "창원 NC 파크 (NC)", color: "#072240", subColor: "#af9154" },
  suwon: { id: "suwon", name: "수원 kt위즈파크 (kt)", color: "#ef4444", subColor: "#2b2b2a" },
  gwangju: { id: "gwangju", name: "광주-기아 챔피언스 필드 (KIA)", color: "#c41230", subColor: "#000000" }
};

// 각 구장별 시그니처 입점 맛집 리스트 및 메뉴
const STADIUM_STALLS_RAW = {
  jamsil: [
    {
      id: "j_pork", name: "삼겹살 돼지킹 (1루 2층)", category: "korean", rating: 4.8, waitTime: 25, r: 240, a: 45, node: "node_1b_2f_mid",
      desc: "1루 내야 복도 끝 (야구장에서 즐기는 뜨거운 즉석 구이 삼겹살)",
      menus: [
        { name: "즉석 삼겹살 도시락 (중)", price: 24000 },
        { name: "즉석 삼겹살 도시락 (대)", price: 30000 },
        { name: "불닭발 구이", price: 18000 }
      ]
    },
    {
      id: "j_bhc", name: "BHC 치킨 (1루 1층)", category: "chicken", rating: 4.6, waitTime: 20, r: 205, a: 50, node: "node_1b_1f_mid",
      desc: "1루 내야 1층 복도 중앙 (야구장 관람 필수 치맥의 왕좌)",
      menus: [
        { name: "뿌링클 순살 치킨", price: 23000 },
        { name: "바삭클 순살 치킨", price: 21000 },
        { name: "생맥주 1L", price: 9000 }
      ]
    },
    {
      id: "j_sinjeon", name: "신전떡볶이 (3루 1층)", category: "snack", rating: 4.4, waitTime: 15, r: 205, a: 130, node: "node_3b_1f_mid",
      desc: "3루 내야 1층 중앙 (매운 떡볶이와 튀김의 환상 조합)",
      menus: [
        { name: "신전떡볶이 (매운맛)", price: 4500 },
        { name: "모듬튀김 1세트", price: 6000 },
        { name: "신전치즈김밥", price: 4000 }
      ]
    },
    {
      id: "j_baskin", name: "배스킨라빈스 (3루 2층)", category: "cafe", rating: 4.7, waitTime: 8, r: 240, a: 135, node: "node_3b_2f_mid",
      desc: "3루 내야 2층 (경기가 달아오를 때 시원한 아이스크림)",
      menus: [
        { name: "싱글 레귤러 컵", price: 4000 },
        { name: "더블 주니어 컵", price: 5400 },
        { name: "아이스 아메리카노", price: 3500 }
      ]
    }
  ],
  munhak: [
    {
      id: "m_shrimp", name: "스테이션 크림새우 (1루 1층)", category: "fastfood", rating: 4.9, waitTime: 35, r: 205, a: 50, node: "node_1b_1f_mid",
      desc: "1루 복도 (랜더스필드 최고의 명물, 줄이 매우 기므로 서둘러야 함)",
      menus: [
        { name: "원조 크림새우", price: 16000 },
        { name: "칠리새우", price: 16000 },
        { name: "마라크림새우", price: 17000 },
        { name: "맥주 500ml", price: 5000 }
      ]
    },
    {
      id: "m_rora", name: "로라방앗간 떡볶이 (3루 1층)", category: "snack", rating: 4.5, waitTime: 15, r: 205, a: 130, node: "node_3b_1f_mid",
      desc: "3루 복도 (방앗간에서 직접 뽑은 쫀득한 가래떡 떡볶이)",
      menus: [
        { name: "방앗간 떡볶이", price: 5000 },
        { name: "모듬 튀김세트", price: 6500 },
        { name: "납작만두 (5개)", price: 4000 }
      ]
    },
    {
      id: "m_starbucks", name: "스타벅스 (외야 관람석 뒤)", category: "cafe", rating: 4.8, waitTime: 10, r: 170, a: 270, node: "node_out_center",
      desc: "세계 최초 야구장 입점 스타벅스 (좌석 배달 서비스 가능)",
      menus: [
        { name: "아메리카노 T", price: 4500 },
        { name: "자몽 허니 블랙티 L", price: 5700 },
        { name: "랜더스 레드 파워 패션 티", price: 6500 }
      ]
    }
  ],
  sajik: [
    {
      id: "s_makguksu", name: "소문난 주문진막국수 (3루 1층)", category: "korean", rating: 4.8, waitTime: 25, r: 205, a: 130, node: "node_3b_1f_mid",
      desc: "3루 내야 복도 (사직구장 직관 시 무조건 먹어야 하는 시원한 막국수)",
      menus: [
        { name: "주문진 수육막국수", price: 12000 },
        { name: "메밀 막국수 (곱빼기)", price: 10000 },
        { name: "한방 수육 (소)", price: 18000 }
      ]
    },
    {
      id: "s_samjin", name: "삼진어묵 (1루 1층)", category: "snack", rating: 4.6, waitTime: 10, r: 205, a: 50, node: "node_1b_1f_mid",
      desc: "1루 내야 중앙 복도 (부산 대표 어묵 브랜드의 다양한 수제어묵)",
      menus: [
        { name: "모듬 수제어묵 고로케 (6개)", price: 10000 },
        { name: "어묵바 세트", price: 8000 },
        { name: "따끈한 국물어묵 (1그릇)", price: 5000 }
      ]
    },
    {
      id: "s_potato", name: "자이언츠 감자 (외야)", category: "fastfood", rating: 4.4, waitTime: 12, r: 200, a: 230, node: "node_out_left",
      desc: "외야 좌측 게이트 부근 (바삭하게 튀겨 낸 대용량 양념감자튀김)",
      menus: [
        { name: "자이언츠 대용량 쉐이크 감자", price: 7000 },
        { name: "치즈 베이컨 포테이토", price: 9000 },
        { name: "컵 맥주 1L", price: 9000 }
      ]
    }
  ],
  gocheok: [
    {
      id: "g_shrimp", name: "쉬림프셰프 크림새우 (외야 1층)", category: "fastfood", rating: 4.9, waitTime: 30, r: 200, a: 310, node: "node_out_right",
      desc: "외야 우측 복도 (고척돔 최고의 마약 푸드, 겉바속촉 크림새우)",
      menus: [
        { name: "크림새우 오리지널", price: 16000 },
        { name: "마라크림새우", price: 17500 },
        { name: "불닭크림새우", price: 17000 }
      ]
    },
    {
      id: "g_nyburger", name: "뉴욕버거 (1루 2층)", category: "fastfood", rating: 4.4, waitTime: 18, r: 240, a: 45, node: "node_1b_2f_mid",
      desc: "1루 2층 복도 (수제버거 전문점, 든든한 경기 관람을 위한 버거 세트)",
      menus: [
        { name: "뉴욕버거 세트", price: 9500 },
        { name: "통살스파이시치킨버거 세트", price: 9900 },
        { name: "어니언링", price: 3500 }
      ]
    },
    {
      id: "g_tteok", name: "올떡 떡볶이 (중앙 1층)", category: "snack", rating: 4.2, waitTime: 12, r: 210, a: 95, node: "node_home_1f",
      desc: "중앙 홈 플레이트 뒤쪽 복도 (매콤달콤한 국물떡볶이와 순대)",
      menus: [
        { name: "국물 떡볶이 세트", price: 11000 },
        { name: "순대와 모듬튀김", price: 9000 },
        { name: "슬러시 🥤", price: 3000 }
      ]
    }
  ],
  daejeon: [
    {
      id: "d_nongshim", name: "농심가락 우동/떡볶이 (3루 1층)", category: "snack", rating: 4.9, waitTime: 28, r: 205, a: 130, node: "node_3b_1f_mid",
      desc: "3루 중앙 복도 (이글스파크 역사와 함께한 전설의 가래떡 떡볶이)",
      menus: [
        { name: "농심가락 가래떡 떡볶이", price: 5500 },
        { name: "원조 어묵 가락국수", price: 7000 },
        { name: "야채 튀김만두 (5개)", price: 4000 }
      ]
    },
    {
      id: "d_mannyeon", name: "만년닭강정 (1루 2층)", category: "chicken", rating: 4.7, waitTime: 20, r: 240, a: 45, node: "node_1b_2f_mid",
      desc: "1루 2층 복도 (식어도 맛있는 대전 대표 닭강정 브랜드)",
      menus: [
        { name: "순살 닭강정 (한마리 - 순한맛)", price: 23000 },
        { name: "순살 닭강정 (반마리 - 매운맛)", price: 13000 },
        { name: "양념 감자칩", price: 5000 }
      ]
    },
    {
      id: "d_brewery", name: "이글스 브루어리 (중앙 1층)", category: "cafe", rating: 4.5, waitTime: 8, r: 210, a: 95, node: "node_home_1f",
      desc: "중앙 1층 복도 (대전 시그니처 크래프트 비어와 소시지)",
      menus: [
        { name: "이글스 에일 맥주 1L", price: 10000 },
        { name: "수제 소시지 꼬치", price: 5000 },
        { name: "나초 치즈 세트", price: 6000 }
      ]
    }
  ],
  daegu: [
    {
      id: "dg_ttang", name: "땅땅치킨 (1루 1층)", category: "chicken", rating: 4.7, waitTime: 22, r: 205, a: 50, node: "node_1b_1f_mid",
      desc: "1루 복도 (대구에서 시작한 로컬 치킨 브랜드, 세트 3번 강추)",
      menus: [
        { name: "허브순살 치킨 세트", price: 22000 },
        { name: "땅땅 불갈비 치킨", price: 23000 },
        { name: "생맥주 1L", price: 9500 }
      ]
    },
    {
      id: "dg_happy", name: "해피치즈스마일 (3루 2층)", category: "snack", rating: 4.6, waitTime: 18, r: 240, a: 135, node: "node_3b_2f_mid",
      desc: "3루 2층 복도 (대구 힙플 떡볶이 맛집의 라팍 입점 버젼)",
      menus: [
        { name: "스마일 떡볶이 (감자튀김 토핑)", price: 9500 },
        { name: "돈까스 플레이트", price: 15000 },
        { name: "통모짜렐라 치즈튀김 (4개)", price: 6000 }
      ]
    },
    {
      id: "dg_sotteok", name: "라팍 소떡소떡 (외야)", category: "snack", rating: 4.3, waitTime: 8, r: 170, a: 270, node: "node_out_center",
      desc: "외야 잔디석 뒤편 매점 (휴게소보다 맛있는 특제 소떡소떡)",
      menus: [
        { name: "치즈 소떡소떡", price: 4500 },
        { name: "불닭 소떡소떡", price: 4500 },
        { name: "레몬 에이드", price: 4000 }
      ]
    }
  ],
  changwon: [
    {
      id: "c_altong", name: "알통떡강정 (1루 1층)", category: "chicken", rating: 4.6, waitTime: 15, r: 205, a: 50, node: "node_1b_1f_mid",
      desc: "1루 내야 복도 (바삭한 강정과 떡 튀김에 달콤한 소스 버무림)",
      menus: [
        { name: "알통떡강정 (커플)", price: 11000 },
        { name: "알통떡강정 (여럿이)", price: 19000 },
        { name: "고구마 맛사탕 튀김", price: 4000 }
      ]
    },
    {
      id: "c_coa", name: "코아양과 (3루 1층)", category: "cafe", rating: 4.8, waitTime: 10, r: 205, a: 130, node: "node_3b_1f_mid",
      desc: "3루 중앙 복도 (창원 마산의 유서 깊은 빵집, 단팥빵과 밀크쉐이크 명물)",
      menus: [
        { name: "코아 수제 단팥빵 (4개)", price: 9000 },
        { name: "오리지널 밀크쉐이크", price: 5500 },
        { name: "생크림 소보로 빵", price: 3000 }
      ]
    },
    {
      id: "c_piazza", name: "피아모레 화덕피자 (외야)", category: "fastfood", rating: 4.5, waitTime: 22, r: 200, a: 230, node: "node_out_left",
      desc: "외야 중앙 잔디밭 근처 (주문 즉시 화덕에서 구워 내는 고소한 피자)",
      menus: [
        { name: "페퍼로니 화덕피자 M", price: 16900 },
        { name: "치즈 가득 피자 M", price: 15900 },
        { name: "치즈 오븐 스파게티", price: 8000 }
      ]
    }
  ],
  suwon: [
    {
      id: "sw_boyoung", name: "보영만두 (3루 1층)", category: "snack", rating: 4.9, waitTime: 32, r: 205, a: 130, node: "node_3b_1f_mid",
      desc: "3루 중앙 복도 (수원 최고 랜드마크 맛집, 매운 쫄면과 군만두 필수)",
      menus: [
        { name: "바삭 군만두 (10개)", price: 9000 },
        { name: "안매운/중간/매운 쫄면", price: 9000 },
        { name: "고기 찐만두 (10개)", price: 8000 }
      ]
    },
    {
      id: "sw_jinmi", name: "진미통닭 (1루 1층)", category: "chicken", rating: 4.8, waitTime: 28, r: 205, a: 50, node: "node_1b_1f_mid",
      desc: "1루 내야 복도 (수원 통닭골목의 강자, 가마솥에 튀겨 낸 시장 통닭 KBO 버젼)",
      menus: [
        { name: "가마솥 후라이드 치킨", price: 22000 },
        { name: "가마솥 양념통닭", price: 23000 },
        { name: "모듬 닭똥집 튀김", price: 12000 }
      ]
    },
    {
      id: "sw_papa", name: "파파존스 피자 (2층 중앙)", category: "fastfood", rating: 4.5, waitTime: 15, r: 250, a: 95, node: "node_home_2f",
      desc: "중앙 2층 복도 (뜨끈뜨끈한 수퍼 파파스 피자를 박스째로 테이크아웃)",
      menus: [
        { name: "수퍼 파파스 피자 L", price: 28500 },
        { name: "존스 페이버릿 피자 L", price: 29500 },
        { name: "갈릭 디핑소스 추가", price: 500 }
      ]
    }
  ],
  gwangju: [
    {
      id: "gw_yangdong", name: "광주 양동시장 통닭 (1루 1층)", category: "chicken", rating: 4.8, waitTime: 25, r: 205, a: 50, node: "node_1b_1f_mid",
      desc: "1루 복도 (광주 전통 시장 통닭의 맛 그대로, 고소하고 넉넉한 닭튀김)",
      menus: [
        { name: "양동시장 후라이드 순살", price: 22000 },
        { name: "양동시장 반반 순살", price: 23000 },
        { name: "생맥주 1L", price: 9000 }
      ]
    },
    {
      id: "gw_mawang", name: "마왕족발 (3루 2층)", category: "korean", rating: 4.7, waitTime: 20, r: 240, a: 135, node: "node_3b_2f_mid",
      desc: "3루 2층 복도 (단짠단짠 마왕 바베큐 소스 족발, 야구장에서 맛보는 이색 먹거리)",
      menus: [
        { name: "마왕보쌈/족발 도시락", price: 13000 },
        { name: "미니 족발구이", price: 18000 },
        { name: "비빔 막국수", price: 8000 }
      ]
    },
    {
      id: "gw_homerun", name: "챔필 광주 홈런볼 (중앙 1층)", category: "cafe", rating: 4.4, waitTime: 8, r: 210, a: 95, node: "node_home_1f",
      desc: "중앙 매점 (바로 구워 제공하는 바삭하고 달콤한 대형 슈 홈런볼)",
      menus: [
        { name: "챔필 즉석 홈런볼 (초코)", price: 6500 },
        { name: "챔필 즉석 홈런볼 (커스터드)", price: 6500 },
        { name: "아이스 아메리카노", price: 3500 }
      ]
    }
  ]
};

// 방사형 수식을 통한 KBO 야구장 데이터 생성 함수 (Radial Map Template Generator)
export function getStadiumData(stadiumId) {
  const club = KBO_CLUBS[stadiumId] || KBO_CLUBS.jamsil;
  
  // 중심점 및 기본 사이즈 설정
  const cx = 400;
  const cy = 310;
  
  // 1. 야구장 그라운드 기본 모델 생성
  const field = {
    home: { x: cx, y: cy + 150 },
    first: { x: cx + 70, y: cy + 80 },
    second: { x: cx, y: cy + 10 },
    third: { x: cx - 70, y: cy + 80 },
    outfieldBoundary: `M ${cx - 150},${cy - 30} C ${cx - 150},${cy - 160} ${cx + 150},${cy - 160} ${cx + 150},${cy - 30} L ${cx},${cy + 150} Z`
  };

  // 2. 고정된 방사형 노드 설정 (중심 cx, cy 기준 반지름 r, 각도 a 도(degree) 적용)
  const angleToRad = (deg) => (deg * Math.PI) / 180;
  const calcCoords = (r, a) => {
    return {
      x: Math.round(cx + r * Math.cos(angleToRad(a))),
      y: Math.round(cy + r * Math.sin(angleToRad(a)))
    };
  };

  // 복도 그래프 노드 동적 빌드
  const baseNodesConfig = {
    // 1층 복도
    "node_home_1f": { name: "중앙 1층 복도", r: 210, a: 95 },
    "node_1b_1f_mid": { name: "1루 1층 중앙", r: 205, a: 50 },
    "node_1b_1f_out": { name: "1루 1층 외야측", r: 210, a: -10 },
    "node_3b_1f_mid": { name: "3루 1층 중앙", r: 205, a: 130 },
    "node_3b_1f_out": { name: "3루 1층 외야측", r: 210, a: 190 },

    // 2층 복도
    "node_home_2f": { name: "중앙 2층 복도", r: 250, a: 95 },
    "node_1b_2f_mid": { name: "1루 2층 중앙", r: 240, a: 45 },
    "node_1b_2f_out": { name: "1루 2층 외야측", r: 250, a: -15 },
    "node_3b_2f_mid": { name: "3루 2층 중앙", r: 240, a: 145 },
    "node_3b_2f_out": { name: "3루 2층 외야측", r: 250, a: 205 },

    // 외야 복도
    "node_out_left": { name: "외야 좌측 복도", r: 200, a: 230 },
    "node_out_center": { name: "외야 중앙 복도", r: 170, a: 270 },
    "node_out_right": { name: "외야 우측 복도", r: 200, a: 310 },

    // 계단/게이트 수직 연결 노드
    "node_stair_1b": { name: "1루 내야 계단", r: 220, a: 47 },
    "node_stair_3b": { name: "3루 내야 계단", r: 220, a: 138 },
    "node_stair_home": { name: "중앙 게이트 계단", r: 230, a: 95 }
  };

  const nodes = {};
  Object.entries(baseNodesConfig).forEach(([id, conf]) => {
    const coords = calcCoords(conf.r, conf.a);
    nodes[id] = {
      id,
      name: conf.name,
      x: coords.x,
      y: coords.y
    };
  });

  // 3. 복도 연결선(Edges) 정의 (거리는 가중치에 매핑)
  const edges = [
    { from: "node_home_1f", to: "node_1b_1f_mid", weight: 75 },
    { from: "node_1b_1f_mid", to: "node_1b_1f_out", weight: 85 },
    { from: "node_home_1f", to: "node_3b_1f_mid", weight: 75 },
    { from: "node_3b_1f_mid", to: "node_3b_1f_out", weight: 85 },

    { from: "node_home_2f", to: "node_1b_2f_mid", weight: 85 },
    { from: "node_1b_2f_mid", to: "node_1b_2f_out", weight: 95 },
    { from: "node_home_2f", to: "node_3b_2f_mid", weight: 85 },
    { from: "node_3b_2f_mid", to: "node_3b_2f_out", weight: 95 },

    { from: "node_3b_1f_out", to: "node_out_left", weight: 110 },
    { from: "node_out_left", to: "node_out_center", weight: 100 },
    { from: "node_out_center", to: "node_out_right", weight: 100 },
    { from: "node_out_right", to: "node_1b_1f_out", weight: 110 },

    { from: "node_home_1f", to: "node_stair_home", weight: 15 },
    { from: "node_home_2f", to: "node_stair_home", weight: 15 },
    
    { from: "node_1b_1f_mid", to: "node_stair_1b", weight: 25 },
    { from: "node_1b_2f_mid", to: "node_stair_1b", weight: 35 },

    { from: "node_3b_1f_mid", to: "node_stair_3b", weight: 25 },
    { from: "node_3b_2f_mid", to: "node_stair_3b", weight: 35 }
  ];

  // 4. 좌석(Seats) 목록 동적 배치 설정
  const baseSeatsConfig = [
    { id: "seat_101", block: "101", zone: "1b_1f", name: "1루 내야석 101블록", r: 180, a: 30, node: "node_1b_1f_out" },
    { id: "seat_104", block: "104", zone: "1b_1f", name: "1루 응원석 104블록", r: 180, a: 65, node: "node_1b_1f_mid" },
    { id: "seat_108", block: "108", zone: "home_1f", name: "중앙 지정석 108블록", r: 185, a: 95, node: "node_home_1f" },
    { id: "seat_112", block: "112", zone: "3b_1f", name: "3루 응원석 112블록", r: 180, a: 125, node: "node_3b_1f_mid" },
    { id: "seat_116", block: "116", zone: "3b_1f", name: "3루 내야석 116블록", r: 180, a: 160, node: "node_3b_1f_out" },

    { id: "seat_201", block: "201", zone: "1b_2f", name: "1루 2층석 201블록", r: 270, a: 30, node: "node_1b_2f_out" },
    { id: "seat_204", block: "204", zone: "1b_2f", name: "1루 2층 응원석 204블록", r: 270, a: 65, node: "node_1b_2f_mid" },
    { id: "seat_208", block: "208", zone: "home_2f", name: "중앙 VIP석 208블록", r: 275, a: 95, node: "node_home_2f" },
    { id: "seat_212", block: "212", zone: "3b_2f", name: "3루 2층 응원석 212블록", r: 270, a: 125, node: "node_3b_2f_mid" },
    { id: "seat_216", block: "216", zone: "3b_2f", name: "3루 2층석 216블록", r: 270, a: 160, node: "node_3b_2f_out" },

    { id: "seat_out_l", block: "외야(좌)", zone: "outfield", name: "외야석 좌측 구역", r: 220, a: 235, node: "node_out_left" },
    { id: "seat_out_c", block: "외야(중)", zone: "outfield", name: "외야석 중앙 구역", r: 190, a: 270, node: "node_out_center" },
    { id: "seat_out_r", block: "외야(우)", zone: "outfield", name: "외야석 우측 구역", r: 220, a: 305, node: "node_out_right" }
  ];

  const seats = baseSeatsConfig.map(seat => {
    const coords = calcCoords(seat.r, seat.a);
    return {
      id: seat.id,
      block: seat.block,
      zone: seat.zone,
      name: seat.name,
      x: coords.x,
      y: coords.y,
      node: seat.node
    };
  });

  // 5. 음식점(Stalls) 목록 동적 배치 설정
  const rawStalls = STADIUM_STALLS_RAW[stadiumId] || STADIUM_STALLS_RAW.jamsil;
  const stalls = rawStalls.map(stall => {
    const coords = calcCoords(stall.r, stall.a);
    return {
      id: stall.id,
      name: stall.name,
      category: stall.category,
      rating: stall.rating,
      waitTime: stall.waitTime,
      x: coords.x,
      y: coords.y,
      node: stall.node,
      desc: stall.desc,
      menus: stall.menus
    };
  });

  return {
    id: club.id,
    name: club.name,
    color: club.color,
    subColor: club.subColor,
    width: 800,
    height: 600,
    field,
    nodes,
    edges,
    seats,
    stalls
  };
}

// 실시간 사용자의 제보 내역 및 장바구니 저장 스토리지 키
const STORAGE_KEY_REPORTS = "stadium_food_reports_v2";
const STORAGE_KEY_SEAT = "stadium_food_user_seat_v2";
const STORAGE_KEY_LOGIN = "stadium_food_user_login_v2";
const STORAGE_KEY_CART = "stadium_food_user_cart_v2";

// 제보 데이터 초기화 및 반환
export function getReports() {
  const data = localStorage.getItem(STORAGE_KEY_REPORTS);
  if (data) {
    return JSON.parse(data);
  }
  const defaultReports = [
    { id: 1, stallId: "j_bhc", status: "busy", minutes: 22, timestamp: Date.now() - 3 * 60 * 1000, user: "lg_twins_fan" },
    { id: 2, stallId: "m_shrimp", status: "busy", minutes: 35, timestamp: Date.now() - 5 * 60 * 1000, user: "incheon_ssg" },
    { id: 3, stallId: "sw_boyoung", status: "busy", minutes: 32, timestamp: Date.now() - 8 * 60 * 1000, user: "suwon_kt" },
    { id: 4, stallId: "s_makguksu", status: "normal", minutes: 22, timestamp: Date.now() - 10 * 60 * 1000, user: "busan_lotte" },
    { id: 5, stallId: "dg_ttang", status: "empty", minutes: 8, timestamp: Date.now() - 15 * 60 * 1000, user: "lion_king" }
  ];
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(defaultReports));
  return defaultReports;
}

// 새로운 제보 추가
export function addReport(stallId, status, userEmail) {
  const reports = getReports();
  let minutes = 15;
  if (status === "empty") minutes = Math.floor(Math.random() * 5) + 3; // 3~7분
  else if (status === "normal") minutes = Math.floor(Math.random() * 8) + 12; // 12~19분
  else if (status === "busy") minutes = Math.floor(Math.random() * 15) + 22; // 22~37분

  const newReport = {
    id: Date.now(),
    stallId,
    status,
    minutes,
    timestamp: Date.now(),
    user: userEmail.split("@")[0]
  };

  reports.unshift(newReport);
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));

  return newReport;
}

// 실시간 평균 대기 시간 계산
export function getCalculatedWaitTimes(activeStadiumId) {
  const reports = getReports();
  const halfHourAgo = Date.now() - 30 * 60 * 1000;
  const recentReports = reports.filter(r => r.timestamp > halfHourAgo);

  const waitTimes = {};
  const stadiumData = getStadiumData(activeStadiumId);
  
  // 기본값 복사
  stadiumData.stalls.forEach(s => {
    waitTimes[s.id] = {
      base: s.waitTime,
      current: s.waitTime,
      status: s.waitTime >= 22 ? "busy" : (s.waitTime < 12 ? "empty" : "normal"),
      reportsCount: 0
    };
  });

  // 최근 제보가 있는 경우 갱신
  recentReports.forEach(r => {
    if (waitTimes[r.stallId]) {
      if (waitTimes[r.stallId].reportsCount === 0) {
        waitTimes[r.stallId].current = r.minutes;
        waitTimes[r.stallId].reportsCount = 1;
      } else {
        const count = waitTimes[r.stallId].reportsCount;
        waitTimes[r.stallId].current = Math.round((waitTimes[r.stallId].current * count + r.minutes) / (count + 1));
        waitTimes[r.stallId].reportsCount += 1;
      }
      
      const c = waitTimes[r.stallId].current;
      waitTimes[r.stallId].status = c >= 22 ? "busy" : (c <= 11 ? "empty" : "normal");
    }
  });

  return waitTimes;
}

// 내 좌석 저장 및 불러오기
export function saveUserSeat(seatId) {
  localStorage.setItem(STORAGE_KEY_SEAT, seatId);
}

export function getUserSeat() {
  return localStorage.getItem(STORAGE_KEY_SEAT) || "seat_104"; // 기본값 104블록
}

// 로그인 세션 관리
export function saveUserLogin(email) {
  const userObj = {
    email,
    points: 120,
    loggedIn: true
  };
  localStorage.setItem(STORAGE_KEY_LOGIN, JSON.stringify(userObj));
  return userObj;
}

export function getUserLogin() {
  const data = localStorage.getItem(STORAGE_KEY_LOGIN);
  if (data) {
    return JSON.parse(data);
  }
  return { email: "", points: 0, loggedIn: false };
}

export function updateUserPoints(pointsToAdd) {
  const user = getUserLogin();
  if (user.loggedIn) {
    user.points += pointsToAdd;
    localStorage.setItem(STORAGE_KEY_LOGIN, JSON.stringify(user));
  }
  return user;
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_KEY_LOGIN);
}

// 장바구니 관리 기능
export function getCart() {
  const data = localStorage.getItem(STORAGE_KEY_CART);
  if (data) {
    return JSON.parse(data);
  }
  return { stallId: null, items: [] }; // { stallId: string, items: [{name: string, price: number, quantity: number}] }
}

export function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart));
}

export function clearCart() {
  const empty = { stallId: null, items: [] };
  saveCart(empty);
  return empty;
}

export function addToCart(stallId, menuName, price) {
  const cart = getCart();
  
  // 다른 매장의 음식이 장바구니에 이미 들어있는 경우 체크는 app.js에서 컨펌 창 띄우고 clearCart 후 대처하도록 유도
  if (cart.stallId && cart.stallId !== stallId) {
    return { success: false, reason: "different_stall" };
  }

  cart.stallId = stallId;
  const existingItemIndex = cart.items.findIndex(item => item.name === menuName);
  
  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += 1;
  } else {
    cart.items.push({ name: menuName, price: price, quantity: 1 });
  }

  saveCart(cart);
  return { success: true, cart };
}

export function updateCartItemQuantity(menuName, delta) {
  const cart = getCart();
  const index = cart.items.findIndex(item => item.name === menuName);
  
  if (index > -1) {
    cart.items[index].quantity += delta;
    if (cart.items[index].quantity <= 0) {
      cart.items.splice(index, 1);
    }
    
    // 장바구니가 완전히 비면 매장 매핑도 초기화
    if (cart.items.length === 0) {
      cart.stallId = null;
    }
    
    saveCart(cart);
  }
  return cart;
}

export function removeFromCart(menuName) {
  const cart = getCart();
  const index = cart.items.findIndex(item => item.name === menuName);
  if (index > -1) {
    cart.items.splice(index, 1);
    if (cart.items.length === 0) {
      cart.stallId = null;
    }
    saveCart(cart);
  }
  return cart;
}
