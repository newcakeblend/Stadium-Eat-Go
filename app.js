/**
 * 야구장 먹거리 최적화 서비스 - 메인 애플리케이션 오케스트레이터 (KBO 구장 확장 & 장바구니 고도화)
 */

import { 
  getStadiumData,
  getReports, 
  addReport, 
  getCalculatedWaitTimes, 
  saveUserSeat, 
  getUserSeat, 
  saveUserLogin, 
  getUserLogin, 
  updateUserPoints, 
  logoutUser,
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart
} from './data.js';

import { GameSimulator } from './game.js';
import { StadiumMap } from './map.js';

// KBO 구단 상징 명칭 매핑
const CLUB_TEAM_NAMES = {
  jamsil: "LG 트윈스 / 두산 베어스",
  munhak: "SSG 랜더스",
  sajik: "롯데 자이언츠",
  gocheok: "키움 히어로즈",
  daejeon: "한화 이글스",
  daegu: "삼성 라이온즈",
  changwon: "NC 다이노스",
  suwon: "kt 위즈",
  gwangju: "KIA 타이거즈"
};

// 전역 상태
let activeStadiumId = 'jamsil';
let activeSeatId = getUserSeat();
let activeStallId = null;
let activeCategory = 'all';

let waitTimes = {};
let currentUser = {};

// 클래스 인스턴스
let gameSim = null;
let stadiumMap = null;

// DOM 요소 헬퍼
const $ = (id) => document.getElementById(id);

window.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  currentUser = getUserLogin();
  waitTimes = getCalculatedWaitTimes(activeStadiumId);
  
  // 경기 시뮬레이터 초기화
  gameSim = new GameSimulator();
  gameSim.addListener(onGameStateChange);
  
  // 지도 모듈 초기화
  stadiumMap = new StadiumMap(
    'stadium-map-svg', 
    onSeatSelectFromMap, 
    onStallSelectFromMap
  );
  
  const stadiumData = getStadiumData(activeStadiumId);
  stadiumMap.init(stadiumData, activeSeatId, activeStallId);

  // UI 구성요소 빌드 및 렌더링
  populateSeatDropdown(stadiumData);
  renderUserPanel();
  renderStallsList();
  renderReportsFeed();
  renderCartUI();
  updateRecommendationUI();
  updateStadiumHeaderBadge(stadiumData);

  // 이벤트 바인딩
  setupEventListeners();

  // 초기 상태 표시
  const initialSeat = stadiumData.seats.find(s => s.id === activeSeatId);
  if (initialSeat) {
    $('seat-select').value = activeSeatId;
    $('selected-seat-name').textContent = initialSeat.name;
  }
}

// 구장 헤더 배지 및 테마 컬러 동기화
function updateStadiumHeaderBadge(stadiumData) {
  const badge = $('current-stadium-badge');
  badge.innerHTML = `<span>📍</span> ${stadiumData.name}`;
  
  // 구단별 시그니처 색상을 헤더 보더 및 배지 섀도우에 반영하여 현장감 향상
  badge.style.borderColor = stadiumData.color;
  badge.style.color = stadiumData.color;
  badge.style.boxShadow = `0 0 10px ${stadiumData.color}25`;
}

// 1. 좌석 선택 드롭다운 채우기
function populateSeatDropdown(stadiumData) {
  const select = $('seat-select');
  select.innerHTML = '';
  
  const zones = {
    'home_1f': '중앙 1층 복도 부근',
    '1b_1f': '1루 내야 지정석 1층',
    '3b_1f': '3루 내야 지정석 1층',
    'home_2f': '중앙 프리미엄 2층',
    '1b_2f': '1루 내야 지정석 2층',
    '3b_2f': '3루 내야 지정석 2층',
    'outfield': '외야 그린석 구역'
  };

  Object.entries(zones).forEach(([zoneId, zoneName]) => {
    const optGroup = document.createElement('optgroup');
    optGroup.label = zoneName;

    const zoneSeats = stadiumData.seats.filter(s => s.zone === zoneId);
    zoneSeats.forEach(seat => {
      const option = document.createElement('option');
      option.value = seat.id;
      option.textContent = `${seat.block}블록 (${seat.name.split(' ').pop()})`;
      optGroup.appendChild(option);
    });

    select.appendChild(optGroup);
  });
}

// 2. 사용자 프로필 패널 렌더링
function renderUserPanel() {
  const panel = $('user-panel');
  panel.innerHTML = '';

  if (currentUser.loggedIn) {
    const initial = currentUser.email.charAt(0).toUpperCase();
    panel.innerHTML = `
      <div class="user-profile">
        <div class="user-avatar">${initial}</div>
        <div class="user-info">
          <span class="user-name">${currentUser.email.split('@')[0]}</span>
          <span class="user-points">⭐ ${currentUser.points} P</span>
        </div>
      </div>
      <button class="guest-mode-btn" id="btn-logout">로그아웃</button>
    `;
    $('btn-logout').addEventListener('click', handleLogout);
    toggleReportButtons(true);
  } else {
    panel.innerHTML = `
      <button class="guest-mode-btn" id="btn-login-trigger">👥 제보자 로그인</button>
    `;
    $('btn-login-trigger').addEventListener('click', () => toggleLoginModal(true));
    toggleReportButtons(false);
  }
}

// 제보 버튼 활성/비활성 설정
function toggleReportButtons(enable) {
  const buttons = ['btn-report-empty', 'btn-report-normal', 'btn-report-busy'];
  buttons.forEach(id => {
    const btn = $(id);
    if (enable && activeStallId) {
      btn.removeAttribute('disabled');
    } else {
      btn.setAttribute('disabled', 'true');
    }
  });
}

// 3. 음식점 목록 렌더링
function renderStallsList() {
  const listContainer = $('stall-list');
  listContainer.innerHTML = '';

  const stadiumData = getStadiumData(activeStadiumId);
  const userSeat = stadiumData.seats.find(s => s.id === activeSeatId);

  let stalls = stadiumData.stalls;
  if (activeCategory !== 'all') {
    stalls = stalls.filter(s => s.category === activeCategory);
  }

  // 매장별 도보 거리 계산 후 정렬
  const stallsWithDistance = stalls.map(stall => {
    const dist = stadiumMap.getPathDistance(userSeat.node, stall.node);
    return { ...stall, distance: dist };
  });

  stallsWithDistance.sort((a, b) => a.distance - b.distance);

  if (stallsWithDistance.length === 0) {
    listContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:30px 0;">해당 카테고리의 매장이 구장에 없습니다.</div>`;
    return;
  }

  stallsWithDistance.forEach(stall => {
    const waitInfo = waitTimes[stall.id] || { current: stall.waitTime, status: 'normal' };
    const isActive = stall.id === activeStallId;

    const card = document.createElement('div');
    card.className = `stall-card ${isActive ? 'active' : ''}`;
    card.dataset.id = stall.id;

    // 구장 상징 컬러 보더 포인트 적용 (활성화 시)
    if (isActive) {
      card.style.borderColor = stadiumData.color;
      card.style.boxShadow = `inset 0 0 10px ${stadiumData.color}15`;
    } else {
      card.style.borderColor = '';
      card.style.boxShadow = '';
    }

    let catEmoji = '🍗';
    if (stall.category === 'snack') catEmoji = '🍜';
    else if (stall.category === 'fastfood') catEmoji = '🍔';
    else if (stall.category === 'cafe') catEmoji = '☕';
    else if (stall.category === 'korean') catEmoji = '🥩';

    let statusText = '보통';
    if (waitInfo.status === 'empty') statusText = '여유';
    else if (waitInfo.status === 'busy') statusText = '혼잡';

    card.innerHTML = `
      <div class="stall-info">
        <div class="stall-name-row">
          <span class="stall-name">${stall.name}</span>
          <span class="stall-cat-tag">${catEmoji} ${getCategoryNameKo(stall.category)}</span>
        </div>
        <div class="stall-rating">★ ${stall.rating.toFixed(1)} <span style="color:var(--text-muted); font-size:11px;">(${stall.desc})</span></div>
      </div>
      <div class="stall-status">
        <span class="wait-badge ${waitInfo.status}">${statusText} ${waitInfo.current}분</span>
        <span class="stall-dist-label">🚶 ${stall.distance}m (약 ${Math.round(stall.distance / 80)}분)</span>
      </div>
    `;

    card.addEventListener('click', () => handleStallSelect(stall.id));
    listContainer.appendChild(card);
  });
}

function getCategoryNameKo(category) {
  const map = {
    chicken: '치킨/맥주',
    snack: '분식',
    fastfood: '패스트푸드',
    cafe: '카페',
    korean: '한식/시그니처'
  };
  return map[category] || category;
}

// 4. 최근 제보 피드 렌더링
function renderReportsFeed() {
  const feed = $('reports-feed');
  feed.innerHTML = '';

  const reports = getReports();
  const stadiumData = getStadiumData(activeStadiumId);

  // 현재 구장의 매장에 해당하는 제보만 피드로 필터링
  const currentStallIds = stadiumData.stalls.map(s => s.id);
  const filteredReports = reports.filter(r => currentStallIds.includes(r.stallId));

  if (filteredReports.length === 0) {
    feed.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:11px; padding: 20px 0;">이 구장에 등록된 제보가 없습니다. 첫 제보자가 되어보세요!</div>`;
    return;
  }

  filteredReports.slice(0, 5).forEach(rep => {
    const stall = stadiumData.stalls.find(s => s.id === rep.stallId);
    if (!stall) return;

    const timeDiff = Math.max(0, Date.now() - rep.timestamp);
    let timeText = '방금 전';
    if (timeDiff > 60 * 1000) {
      timeText = `${Math.floor(timeDiff / (60 * 1000))}분 전`;
    }

    let statusText = '보통';
    if (rep.status === 'empty') statusText = '여유';
    else if (rep.status === 'busy') statusText = '혼잡';

    const item = document.createElement('div');
    item.className = 'feed-item';
    item.innerHTML = `
      <div class="feed-left">
        <span class="feed-user">@${rep.user}</span>
        <span class="feed-action">제보:</span>
        <span class="feed-stall">${stall.name.split(' (')[0]}</span>
        <span class="feed-status-badge ${rep.status}">${statusText}(${rep.minutes}분)</span>
      </div>
      <span class="feed-time">${timeText}</span>
    `;
    feed.appendChild(item);
  });
}

// 5. 장바구니 렌더링 UI
function renderCartUI() {
  const cart = getCart();
  const list = $('cart-items-list');
  const emptyMsg = $('cart-empty-msg');
  const footer = $('cart-summary-footer');
  
  if (!cart.items || cart.items.length === 0) {
    list.style.display = 'none';
    footer.style.display = 'none';
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';
  list.style.display = 'flex';
  footer.style.display = 'flex';
  
  list.innerHTML = '';
  let totalPrice = 0;
  
  const stadiumData = getStadiumData(activeStadiumId);
  const stall = stadiumData.stalls.find(s => s.id === cart.stallId);
  const stallName = stall ? stall.name.split(' (')[0] : '매장';

  // 장바구니 상단 매장 표시
  const shopIndicator = document.createElement('div');
  shopIndicator.style.fontSize = '11px';
  shopIndicator.style.color = 'var(--neon-orange)';
  shopIndicator.style.marginBottom = '5px';
  shopIndicator.style.fontWeight = 'bold';
  shopIndicator.textContent = `📍 [${shopIndicator.textContent = stallName}]에서 선택한 음식`;
  list.appendChild(shopIndicator);

  cart.items.forEach(item => {
    const subtotal = item.price * item.quantity;
    totalPrice += subtotal;

    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <div class="cart-item-name-col">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-price">${item.price.toLocaleString()}원</span>
      </div>
      <div class="cart-item-controls">
        <button class="btn-cart-qty btn-cart-minus" data-name="${item.name}">-</button>
        <span class="cart-item-qty-val">${item.quantity}</span>
        <button class="btn-cart-qty btn-cart-plus" data-name="${item.name}">+</button>
        <button class="btn-cart-del" data-name="${item.name}">✕</button>
      </div>
    `;
    list.appendChild(row);
  });

  $('cart-total-price-val').textContent = `${totalPrice.toLocaleString()}원`;

  // 수량 조절 버튼 이벤트 바인딩
  list.querySelectorAll('.btn-cart-minus').forEach(btn => {
    btn.addEventListener('click', (e) => handleCartQuantityChange(e.target.dataset.name, -1));
  });
  list.querySelectorAll('.btn-cart-plus').forEach(btn => {
    btn.addEventListener('click', (e) => handleCartQuantityChange(e.target.dataset.name, 1));
  });
  list.querySelectorAll('.btn-cart-del').forEach(btn => {
    btn.addEventListener('click', (e) => handleCartItemRemove(e.target.dataset.name));
  });
}

// 장바구니 아이템 담기
function handleAddToCart(menuName, price) {
  if (!activeStallId) return;
  const cart = getCart();

  // 다른 매장의 음식이 담겨있을 때 경고 창
  if (cart.stallId && cart.stallId !== activeStallId) {
    const stadiumData = getStadiumData(activeStadiumId);
    const existingStall = stadiumData.stalls.find(s => s.id === cart.stallId);
    const currentStall = stadiumData.stalls.find(s => s.id === activeStallId);
    
    const existingName = existingStall ? existingStall.name.split(' (')[0] : '기존 매장';
    const currentName = currentStall ? currentStall.name.split(' (')[0] : '선택 매장';

    const confirmChange = confirm(
      `장바구니에는 한 번에 한 매장의 음식만 담을 수 있습니다.\n\n` +
      `기존 [${existingName}] 장바구니를 비우고,\n[${currentName}] 음식을 새로 담으시겠습니까?`
    );
    
    if (confirmChange) {
      clearCart();
    } else {
      return; // 취소 시 중단
    }
  }

  const res = addToCart(activeStallId, menuName, price);
  if (res.success) {
    renderCartUI();
    // 장바구니 카드로 부드러운 스크롤 효과 유도
    $('cart-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// 장바구니 수량 조정
function handleCartQuantityChange(menuName, delta) {
  updateCartItemQuantity(menuName, delta);
  renderCartUI();
}

// 장바구니 아이템 삭제
function handleCartItemRemove(menuName) {
  removeFromCart(menuName);
  renderCartUI();
}

// 6. 추천 결과 업데이트
function updateRecommendationUI() {
  const panel = $('recommend-panel');
  const badge = $('recommend-badge');
  const title = $('recommend-title');
  const desc = $('recommend-desc');
  const etaContainer = $('inning-eta-container');
  const etaVal = $('inning-eta-val');

  if (!activeStallId) {
    panel.className = 'recommendation-panel status-caution';
    badge.textContent = 'WAIT';
    badge.style.background = 'var(--color-caution)';
    title.textContent = '먹거리 매장을 선택하세요';
    desc.textContent = '지도의 매장 아이콘이나 목록에서 구단별 시그니처 맛집을 선택하면 최적의 최단 동선과 타이밍을 실시간 예측해 드립니다.';
    etaContainer.style.display = 'none';
    
    $('route-distance-val').textContent = '0 m';
    $('route-wait-val').textContent = '0 분';
    $('route-total-time-val').textContent = '0 분';
    return;
  }

  const stadiumData = getStadiumData(activeStadiumId);
  const seat = stadiumData.seats.find(s => s.id === activeSeatId);
  const stall = stadiumData.stalls.find(s => s.id === activeStallId);

  if (!seat || !stall) return;

  const distance = stadiumMap.getPathDistance(seat.node, stall.node);
  const walkTime = parseFloat(((distance * 2) / 80).toFixed(1));
  const waitTime = waitTimes[stall.id]?.current || stall.waitTime;
  const totalTime = walkTime + waitTime;

  $('route-distance-val').textContent = `${distance} m`;
  $('route-wait-val').textContent = `${waitTime} 분`;
  $('route-total-time-val').textContent = `${Math.round(totalTime)} 분`;

  const recommendation = gameSim.getRecommendation(totalTime);
  panel.className = `recommendation-panel status-${recommendation.recommendLevel}`;
  
  badge.textContent = recommendation.recommendLevel.toUpperCase();
  if (recommendation.recommendLevel === 'go') {
    badge.style.background = 'var(--color-go)';
    badge.style.color = 'var(--bg-primary)';
  } else if (recommendation.recommendLevel === 'caution') {
    badge.style.background = 'var(--color-caution)';
    badge.style.color = 'var(--bg-primary)';
  } else {
    badge.style.background = 'var(--color-wait)';
    badge.style.color = '#ffffff';
  }

  title.textContent = recommendation.message;
  desc.textContent = recommendation.detail;

  etaContainer.style.display = 'block';
  etaVal.textContent = `약 ${recommendation.estimatedRemaining}분`;
}

// 7. 이벤트 리스너 설정
function setupEventListeners() {
  // 구장 변경
  $('stadium-select').addEventListener('change', (e) => {
    handleStadiumSelect(e.target.value);
  });

  // 좌석 변경
  $('seat-select').addEventListener('change', (e) => {
    handleSeatSelect(e.target.value);
  });

  // 카테고리 탭
  $('category-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.category-tab');
    if (!tab) return;
    
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    activeCategory = tab.dataset.category;
    renderStallsList();
  });

  // 경기 제어 버튼
  $('btn-sim-strike').addEventListener('click', () => gameSim.addStrike());
  $('btn-sim-ball').addEventListener('click', () => gameSim.addBall());
  $('btn-sim-hit').addEventListener('click', () => gameSim.addHit(1));
  $('btn-sim-out').addEventListener('click', () => gameSim.addOut());
  
  $('btn-toggle-auto').addEventListener('click', () => {
    gameSim.toggleAutoPlay();
    const btn = $('btn-toggle-auto');
    if (gameSim.state.isPlaying) {
      btn.textContent = '자동 경기 진행 중지 🛑';
      btn.classList.add('active');
      $('auto-badge').classList.add('active');
    } else {
      btn.textContent = '자동 경기 진행 시작';
      btn.classList.remove('active');
      $('auto-badge').classList.remove('active');
    }
  });

  // 제보
  $('btn-report-empty').addEventListener('click', () => handleReport('empty'));
  $('btn-report-normal').addEventListener('click', () => handleReport('normal'));
  $('btn-report-busy').addEventListener('click', () => handleReport('busy'));

  // 로그인 모달
  $('login-form').addEventListener('submit', handleLoginSubmit);
  $('btn-close-login').addEventListener('click', () => toggleLoginModal(false));

  // 장바구니 주문 발급 버튼
  $('btn-cart-checkout').addEventListener('click', handleCartCheckout);
  $('btn-close-receipt').addEventListener('click', () => toggleReceiptModal(false));
  $('btn-confirm-receipt').addEventListener('click', () => {
    clearCart();
    renderCartUI();
    toggleReceiptModal(false);
  });
}

// 8. 구장 변경 처리 로직
function handleStadiumSelect(stadiumId) {
  activeStadiumId = stadiumId;
  activeStallId = null; // 구장 변경 시 상점 선택 해제
  
  const stadiumData = getStadiumData(activeStadiumId);
  waitTimes = getCalculatedWaitTimes(activeStadiumId);

  // 104블록 등 공통 아이디 좌석으로 매핑하고, 없으면 첫 번째 좌석 선택
  const seats = stadiumData.seats;
  const matchSeat = seats.find(s => s.id === activeSeatId);
  if (!matchSeat) {
    activeSeatId = seats[0].id;
    saveUserSeat(activeSeatId);
  }

  // UI 리로드
  updateStadiumHeaderBadge(stadiumData);
  populateSeatDropdown(stadiumData);
  
  const activeSeat = stadiumData.seats.find(s => s.id === activeSeatId);
  if (activeSeat) {
    $('seat-select').value = activeSeatId;
    $('selected-seat-name').textContent = activeSeat.name;
  }

  stadiumMap.init(stadiumData, activeSeatId, activeStallId);
  
  renderStallsList();
  renderReportsFeed();
  renderCartUI();
  updateRecommendationUI();
  
  // 구장 변경 알림 피드백
  alert(`🏟️ [${stadiumData.name}]으로 경기장이 전환되었습니다!`);
}

// 9. 좌석 변경 처리 로직
function handleSeatSelect(seatId) {
  activeSeatId = seatId;
  saveUserSeat(seatId);
  
  const stadiumData = getStadiumData(activeStadiumId);
  const seat = stadiumData.seats.find(s => s.id === seatId);
  if (seat) {
    $('selected-seat-name').textContent = seat.name;
    $('seat-select').value = seatId;
  }

  stadiumMap.updateSelection(activeSeatId, activeStallId);
  renderStallsList();
  updateRecommendationUI();
}

// 10. 매장 선택 처리 로직
function handleStallSelect(stallId) {
  if (activeStallId === stallId) {
    activeStallId = null;
  } else {
    activeStallId = stallId;
  }

  stadiumMap.updateSelection(activeSeatId, activeStallId);
  renderStallsList();
  updateRecommendationUI();
  toggleReportButtons(currentUser.loggedIn);
  renderMenuDrawer();
}

// 대표 메뉴판 렌더링 (담기 버튼 연결)
function renderMenuDrawer() {
  const drawer = $('menu-drawer');
  const container = $('menu-items-container');
  
  if (!activeStallId) {
    drawer.style.display = 'none';
    return;
  }

  const stadiumData = getStadiumData(activeStadiumId);
  const stall = stadiumData.stalls.find(s => s.id === activeStallId);
  if (!stall || !stall.menus) {
    drawer.style.display = 'none';
    return;
  }

  drawer.style.display = 'block';
  $('menu-drawer-title').textContent = `📋 ${stall.name} 시그니처 메뉴판`;
  container.innerHTML = '';

  stall.menus.forEach(menu => {
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.innerHTML = `
      <div class="menu-item-info">
        <span class="menu-item-name">${menu.name}</span>
        <span class="menu-item-price">${menu.price.toLocaleString()}원</span>
      </div>
      <button class="btn-add-to-cart" data-name="${menu.name}" data-price="${menu.price}">+ 담기</button>
    `;
    
    // 장바구니 담기 이벤트 연결
    item.querySelector('.btn-add-to-cart').addEventListener('click', (e) => {
      handleAddToCart(e.target.dataset.name, parseInt(e.target.dataset.price));
    });

    container.appendChild(item);
  });
}

// 지도 클릭 콜백
function onSeatSelectFromMap(seatId) {
  handleSeatSelect(seatId);
}

function onStallSelectFromMap(stallId) {
  handleStallSelect(stallId);
}

// 경기 상황판 변경 시 콜백
function onGameStateChange(state) {
  $('away-score').textContent = state.awayScore;
  $('home-score').textContent = state.homeScore;

  const inningHalf = state.isTop ? '초' : '말';
  $('game-inning-text').textContent = `${state.inning}회${inningHalf}`;
  $('current-batter-text').textContent = `${state.batterIndex}번 타자`;

  const bases = ['base-1', 'base-2', 'base-3'];
  bases.forEach((id, idx) => {
    const el = $(id);
    if (state.runners[idx]) el.classList.add('runner-on');
    else el.classList.remove('runner-on');
  });

  for (let i = 1; i <= 3; i++) {
    const el = $(`ball-${i}`);
    if (state.balls >= i) el.classList.add('active');
    else el.classList.remove('active');
  }
  for (let i = 1; i <= 2; i++) {
    const el = $(`strike-${i}`);
    if (state.strikes >= i) el.classList.add('active');
    else el.classList.remove('active');
  }
  for (let i = 1; i <= 2; i++) {
    const el = $(`out-${i}`);
    if (state.outs >= i) el.classList.add('active');
    else el.classList.remove('active');
  }

  updateRecommendationUI();
}

// 제보 등록
function handleReport(status) {
  if (!currentUser.loggedIn) {
    toggleLoginModal(true);
    return;
  }

  if (!activeStallId) {
    alert("제보할 매장을 먼저 선택해 주세요.");
    return;
  }

  const report = addReport(activeStallId, status, currentUser.email);
  currentUser = updateUserPoints(15); // KBO 구장 제보 15포인트 상향 지급
  renderUserPanel();
  
  waitTimes = getCalculatedWaitTimes(activeStadiumId);
  renderStallsList();
  renderReportsFeed();
  updateRecommendationUI();

  const btn = $(`btn-report-${status}`);
  btn.style.transform = 'scale(0.9)';
  setTimeout(() => {
    btn.style.transform = 'scale(1)';
    alert(`🎉 [${getStadiumData(activeStadiumId).name}] 대기 정보 공유 완료! (15 포인트 적립)`);
  }, 150);
}

// 장바구니 주문서 발급(Checkout) 처리
function handleCartCheckout() {
  const cart = getCart();
  if (!cart.items || cart.items.length === 0) {
    alert("장바구니가 비어 있습니다.");
    return;
  }

  const stadiumData = getStadiumData(activeStadiumId);
  const stall = stadiumData.stalls.find(s => s.id === cart.stallId);
  const seat = stadiumData.seats.find(s => s.id === activeSeatId);

  if (!stall || !seat) return;

  // 요약 산정
  const distance = stadiumMap.getPathDistance(seat.node, stall.node);
  const walkTime = parseFloat(((distance * 2) / 80).toFixed(1));
  const waitTime = waitTimes[stall.id]?.current || stall.waitTime;
  const totalTime = walkTime + waitTime;

  // 타이밍 가이드 메시지 산출
  const recommendation = gameSim.getRecommendation(totalTime);

  // 영수증 데이터 매핑
  $('rec-stadium-name').textContent = stadiumData.name;
  $('rec-stall-name').textContent = stall.name;
  
  const recList = $('rec-menu-list');
  recList.innerHTML = '';
  let totalSum = 0;

  cart.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'receipt-menu-row';
    row.innerHTML = `
      <span>${item.name}<span class="receipt-menu-qty">x${item.quantity}</span></span>
      <span>${(item.price * item.quantity).toLocaleString()}원</span>
    `;
    recList.appendChild(row);
    totalSum += item.price * item.quantity;
  });

  $('rec-total-price').textContent = `${totalSum.toLocaleString()}원`;
  
  // 랜덤 대기 번호 부여 (#100 ~ #200)
  const waitNum = Math.floor(Math.random() * 101) + 100;
  $('rec-waiting-num').textContent = `#${waitNum}`;

  // 타이밍 권고문 결합
  $('rec-timing-msg').textContent = `${recommendation.message}. (${recommendation.detail})`;

  // 모달 띄우기
  toggleReceiptModal(true);
}

// 영수증 티켓 모달 토글
function toggleReceiptModal(show) {
  const modal = $('receipt-modal');
  if (show) {
    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
  }
}

// 로그인/로그아웃 모달 제어
function toggleLoginModal(show) {
  const modal = $('login-modal');
  if (show) {
    modal.classList.add('active');
    $('login-email').focus();
  } else {
    modal.classList.remove('active');
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const email = $('login-email').value;
  
  if (email) {
    currentUser = saveUserLogin(email);
    renderUserPanel();
    toggleLoginModal(false);
    if (activeStallId) {
      toggleReportButtons(true);
    }
  }
}

function handleLogout() {
  if (confirm("로그아웃 하시겠습니까?")) {
    logoutUser();
    currentUser = { email: "", points: 0, loggedIn: false };
    renderUserPanel();
    toggleReportButtons(false);
  }
}
