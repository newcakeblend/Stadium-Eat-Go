/**
 * 야구장 먹거리 최적화 서비스 - SVG 경기장 지도 및 최단 경로 길찾기 엔진
 */

export class StadiumMap {
  constructor(svgElementId, onSeatSelect, onStallSelect) {
    this.svg = document.getElementById(svgElementId);
    this.onSeatSelect = onSeatSelect;
    this.onStallSelect = onStallSelect;
    this.stadiumData = null;
    this.activeSeatId = null;
    this.activeStallId = null;
  }

  // 데이터 로드 및 맵 초기화
  init(stadiumData, activeSeatId, activeStallId) {
    this.stadiumData = stadiumData;
    this.activeSeatId = activeSeatId;
    this.activeStallId = activeStallId;
    this.render();
  }

  // 활성화된 좌석/매장 업데이트
  updateSelection(seatId, stallId) {
    this.activeSeatId = seatId;
    this.activeStallId = stallId;
    this.render();
  }

  // SVG 요소 렌더링
  render() {
    if (!this.stadiumData) return;
    this.svg.innerHTML = ""; // 기존 내용 초기화

    const teamColor = this.stadiumData.color;
    const teamSubColor = this.stadiumData.subColor;

    // 1. 배경 정의 추가 (필터, 그라데이션)
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <!-- 네온 구단 메인 컬러 글로우 필터 -->
      <filter id="glow-stadium" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feColorMatrix type="matrix" values="
          0 0 0 0 ${this.hexToRgbPercent(teamColor).r}
          0 0 0 0 ${this.hexToRgbPercent(teamColor).g}
          0 0 0 0 ${this.hexToRgbPercent(teamColor).b}
          0 0 0 1 0
        " in="blur" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <!-- 네온 오렌지 글로우 필터 (상점) -->
      <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <!-- 그라운드 잔디 그라데이션 -->
      <radialGradient id="field-grass" cx="50%" cy="80%" r="80%">
        <stop offset="0%" stop-color="#144d29" />
        <stop offset="100%" stop-color="#0a2a16" />
      </radialGradient>
    `;
    this.svg.appendChild(defs);

    // 2. 그라운드(야구장 필드) 그리기
    const fieldGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    fieldGroup.setAttribute("class", "map-field");

    // 잔디 구역
    const outfield = document.createElementNS("http://www.w3.org/2000/svg", "path");
    outfield.setAttribute("d", this.stadiumData.field.outfieldBoundary);
    outfield.setAttribute("fill", "url(#field-grass)");
    outfield.setAttribute("stroke", "#1e5e33");
    outfield.setAttribute("stroke-width", "3");
    fieldGroup.appendChild(outfield);

    // 흙(인필드 내야 다이아몬드)
    const infieldDirt = document.createElementNS("http://www.w3.org/2000/svg", "path");
    infieldDirt.setAttribute("d", `M ${this.stadiumData.field.home.x},${this.stadiumData.field.home.y} 
                                   L ${this.stadiumData.field.first.x},${this.stadiumData.field.first.y} 
                                   L ${this.stadiumData.field.second.x},${this.stadiumData.field.second.y} 
                                   L ${this.stadiumData.field.third.x},${this.stadiumData.field.third.y} Z`);
    infieldDirt.setAttribute("fill", "#664124");
    infieldDirt.setAttribute("stroke", "#7a4e2b");
    infieldDirt.setAttribute("stroke-width", "2");
    fieldGroup.appendChild(infieldDirt);

    // 잔디 내야 사각형 (회전시켜 다이아몬드처럼 만듦)
    const infieldGrass = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    infieldGrass.setAttribute("x", (this.stadiumData.field.second.x - 25).toString());
    infieldGrass.setAttribute("y", (this.stadiumData.field.second.y + 45).toString());
    infieldGrass.setAttribute("width", "50");
    infieldGrass.setAttribute("height", "50");
    infieldGrass.setAttribute("transform", `rotate(45 ${this.stadiumData.field.second.x} ${this.stadiumData.field.second.y + 70})`);
    infieldGrass.setAttribute("fill", "url(#field-grass)");
    infieldGrass.setAttribute("stroke", "#1e5e33");
    infieldGrass.setAttribute("stroke-width", "1");
    fieldGroup.appendChild(infieldGrass);

    // 베이스 그리기
    const bases = [
      this.stadiumData.field.home,
      this.stadiumData.field.first,
      this.stadiumData.field.second,
      this.stadiumData.field.third
    ];
    bases.forEach((b, idx) => {
      const baseRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      baseRect.setAttribute("x", (b.x - 4).toString());
      baseRect.setAttribute("y", (b.y - 4).toString());
      baseRect.setAttribute("width", "8");
      baseRect.setAttribute("height", "8");
      baseRect.setAttribute("fill", idx === 0 ? teamColor : "#ffffff"); // 홈 플레이트는 구단 컬러로 매핑!
      baseRect.setAttribute("stroke", "#666");
      baseRect.setAttribute("stroke-width", "1");
      if (idx > 0) baseRect.setAttribute("transform", `rotate(45 ${b.x} ${b.y})`);
      fieldGroup.appendChild(baseRect);
    });

    this.svg.appendChild(fieldGroup);

    // 3. 복도 가이드라인(통로) 백그라운드로 연하게 표시
    const pathsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    pathsGroup.setAttribute("class", "map-concourse-paths");
    this.stadiumData.edges.forEach(edge => {
      const fromNode = this.stadiumData.nodes[edge.from];
      const toNode = this.stadiumData.nodes[edge.to];
      
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", fromNode.x.toString());
      line.setAttribute("y1", fromNode.y.toString());
      line.setAttribute("x2", toNode.x.toString());
      line.setAttribute("y2", toNode.y.toString());
      line.setAttribute("stroke", "#ffffff0c");
      line.setAttribute("stroke-width", "5");
      line.setAttribute("stroke-linecap", "round");
      pathsGroup.appendChild(line);
    });
    this.svg.appendChild(pathsGroup);

    // 4. 좌석 블록들 렌더링
    const seatsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    seatsGroup.setAttribute("class", "map-seats");

    this.stadiumData.seats.forEach(seat => {
      const isSelected = seat.id === this.activeSeatId;
      
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", `seat-block ${isSelected ? 'selected' : ''}`);
      g.setAttribute("cursor", "pointer");
      g.addEventListener("click", () => this.onSeatSelect(seat.id));

      const seatMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      seatMarker.setAttribute("cx", seat.x.toString());
      seatMarker.setAttribute("cy", seat.y.toString());
      seatMarker.setAttribute("r", isSelected ? "10" : "7");
      
      // 기본 좌석 색상 구역별 매핑 (구단 메인 컬러에 맞추어 변형)
      let color = teamColor; 
      if (seat.zone === "outfield") color = "#00ff88"; // 외야는 공통 그린
      else if (seat.zone.includes("3b")) {
        // 3루는 구단 컬러와 대비되는 레드 계열 (구단 컬러가 레드면 오렌지/옐로우 대비)
        color = (teamColor === "#ef4444" || teamColor === "#ff003c" || teamColor === "#c41230") ? "#ffaa00" : "#ff4444";
      } else if (seat.zone.includes("1b")) {
        // 1루는 구단 컬러와 매치
        color = teamColor;
      } else {
        color = "#b800ff"; // 중앙 VIP 퍼플
      }
      
      seatMarker.setAttribute("fill", isSelected ? color : color + "aa");
      seatMarker.setAttribute("stroke", isSelected ? "#ffffff" : "#ffffff44");
      seatMarker.setAttribute("stroke-width", isSelected ? "2.5" : "1");
      if (isSelected) {
        seatMarker.setAttribute("filter", "url(#glow-stadium)");
        seatMarker.setAttribute("class", "pulse-animation");
      }
      
      g.appendChild(seatMarker);

      // 블록 번호 텍스트 추가
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", seat.x.toString());
      text.setAttribute("y", (seat.y - 12).toString());
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", isSelected ? "#ffffff" : "#cccccc");
      text.setAttribute("font-size", isSelected ? "11px" : "9px");
      text.setAttribute("font-weight", isSelected ? "bold" : "normal");
      text.setAttribute("font-family", "Outfit, sans-serif");
      text.textContent = seat.block;
      g.appendChild(text);

      seatsGroup.appendChild(g);
    });
    this.svg.appendChild(seatsGroup);

    // 5. 최단 동선 계산 및 그리기
    let shortestPathNodes = null;
    if (this.activeSeatId && this.activeStallId) {
      const activeSeat = this.stadiumData.seats.find(s => s.id === this.activeSeatId);
      const activeStall = this.stadiumData.stalls.find(s => s.id === this.activeStallId);
      
      if (activeSeat && activeStall) {
        shortestPathNodes = this.findShortestPath(activeSeat.node, activeStall.node);
        if (shortestPathNodes) {
          const routeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
          routeGroup.setAttribute("class", "map-active-route");
          
          let dPath = `M ${activeSeat.x},${activeSeat.y} L `;
          
          shortestPathNodes.forEach((nodeId, idx) => {
            const node = this.stadiumData.nodes[nodeId];
            if (idx === 0) {
              dPath += `${node.x},${node.y}`;
            } else {
              dPath += ` L ${node.x},${node.y}`;
            }
          });

          dPath += ` L ${activeStall.x},${activeStall.y}`;

          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", dPath);
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", teamColor); // 구단 시그니처 네온 라인!
          path.setAttribute("stroke-width", "5");
          path.setAttribute("stroke-linecap", "round");
          path.setAttribute("stroke-linejoin", "round");
          path.setAttribute("stroke-dasharray", "8, 6");
          path.setAttribute("class", "marching-ants-animation"); 
          path.setAttribute("filter", "url(#glow-stadium)");
          routeGroup.appendChild(path);
          
          this.svg.appendChild(routeGroup);
        }
      }
    }

    // 6. 음식점들 렌더링
    const stallsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    stallsGroup.setAttribute("class", "map-stalls");

    this.stadiumData.stalls.forEach(stall => {
      const isSelected = stall.id === this.activeStallId;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", `stall-node ${isSelected ? 'selected' : ''}`);
      g.setAttribute("cursor", "pointer");
      g.addEventListener("click", () => this.onStallSelect(stall.id));

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", stall.x.toString());
      circle.setAttribute("cy", stall.y.toString());
      circle.setAttribute("r", isSelected ? "14" : "11");
      circle.setAttribute("fill", isSelected ? "#ff9f00" : "#ff9f00bb");
      circle.setAttribute("stroke", isSelected ? "#ffffff" : "#ffffff44");
      circle.setAttribute("stroke-width", isSelected ? "2" : "1");
      if (isSelected) {
        circle.setAttribute("filter", "url(#glow-orange)");
      }
      g.appendChild(circle);

      const emojiText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      emojiText.setAttribute("x", stall.x.toString());
      emojiText.setAttribute("y", (stall.y + 4.5).toString());
      emojiText.setAttribute("text-anchor", "middle");
      emojiText.setAttribute("font-size", isSelected ? "14px" : "11px");
      
      let emoji = "🍗";
      if (stall.category === "snack") emoji = "떡";
      else if (stall.category === "fastfood") emoji = "🍔";
      else if (stall.category === "cafe") emoji = "☕";
      else if (stall.category === "korean") emoji = "🥩";

      if (stall.category === "snack") {
        emojiText.textContent = "떡";
        emojiText.setAttribute("fill", "#ffffff");
        emojiText.setAttribute("font-weight", "bold");
        emojiText.setAttribute("font-size", isSelected ? "10px" : "8px");
        emojiText.setAttribute("font-family", "Noto Sans KR, sans-serif");
      } else {
        emojiText.textContent = emoji;
      }
      
      g.appendChild(emojiText);

      // 매장 이름 라벨
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", stall.x.toString());
      label.setAttribute("y", (stall.y + 24).toString());
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", isSelected ? "#ff9f00" : "#cccccc");
      label.setAttribute("font-size", isSelected ? "11px" : "9px");
      label.setAttribute("font-weight", isSelected ? "bold" : "normal");
      label.setAttribute("font-family", "Noto Sans KR, sans-serif");
      label.textContent = stall.name.split(" (")[0];
      g.appendChild(label);

      stallsGroup.appendChild(g);
    });
    this.svg.appendChild(stallsGroup);
  }

  // 16진수 컬러코드를 RGB 비율(0~1)로 반환하는 파서 (SVG 필터 행렬 계산용)
  hexToRgbPercent(hex) {
    let c = hex.substring(1);
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    return { r, g, b };
  }

  // 다익스트라 최단 경로 계산
  findShortestPath(startNodeId, endNodeId) {
    if (!this.stadiumData) return null;
    const nodes = this.stadiumData.nodes;
    const edges = this.stadiumData.edges;

    const adjacencyList = {};
    Object.keys(nodes).forEach(nodeId => {
      adjacencyList[nodeId] = [];
    });

    edges.forEach(edge => {
      adjacencyList[edge.from].push({ to: edge.to, weight: edge.weight });
      adjacencyList[edge.to].push({ to: edge.from, weight: edge.weight });
    });

    const distances = {};
    const previous = {};
    const unvisited = new Set();

    Object.keys(nodes).forEach(nodeId => {
      distances[nodeId] = Infinity;
      previous[nodeId] = null;
      unvisited.add(nodeId);
    });

    distances[startNodeId] = 0;

    while (unvisited.size > 0) {
      let currentNodeId = null;
      let minDistance = Infinity;

      unvisited.forEach(nodeId => {
        if (distances[nodeId] < minDistance) {
          minDistance = distances[nodeId];
          currentNodeId = nodeId;
        }
      });

      if (currentNodeId === null || currentNodeId === endNodeId) {
        break;
      }

      unvisited.delete(currentNodeId);

      adjacencyList[currentNodeId].forEach(neighbor => {
        if (unvisited.has(neighbor.to)) {
          const newDist = distances[currentNodeId] + neighbor.weight;
          if (newDist < distances[neighbor.to]) {
            distances[neighbor.to] = newDist;
            previous[neighbor.to] = currentNodeId;
          }
        }
      });
    }

    const path = [];
    let curr = endNodeId;
    
    if (distances[endNodeId] === Infinity) {
      return null;
    }

    while (curr !== null) {
      path.unshift(curr);
      curr = previous[curr];
    }

    return path;
  }

  // 경로 총 도보 거리 계산
  getPathDistance(startNodeId, endNodeId) {
    const path = this.findShortestPath(startNodeId, endNodeId);
    if (!path) return 0;
    
    let totalDist = 0;
    const edges = this.stadiumData.edges;

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i+1];
      
      const edge = edges.find(e => (e.from === from && e.to === to) || (e.from === to && e.to === from));
      if (edge) {
        totalDist += edge.weight;
      }
    }
    
    totalDist += 30; // 가중치 보정
    return totalDist;
  }
}
