/**
 * 야구장 먹거리 최적화 서비스 - 경기 상태 관리 및 타이밍 추천 엔진
 */

export class GameSimulator {
  constructor() {
    this.state = this.loadState() || this.getDefaultState();
    this.autoPlayInterval = null;
    this.listeners = [];
  }

  getDefaultState() {
    return {
      inning: 5,
      isTop: false, // false = 말 (Bottom), true = 초 (Top)
      outs: 1,
      strikes: 1,
      balls: 2,
      runners: [false, false, false], // 1루, 2루, 3루 주자 여부
      batterIndex: 4, // 1~9번 타자 (현재 4번 타자)
      homeScore: 3,
      awayScore: 2,
      isPlaying: false // 자동 경기 진행 여부
    };
  }

  loadState() {
    const saved = localStorage.getItem("stadium_game_state");
    return saved ? JSON.parse(saved) : null;
  }

  saveState() {
    localStorage.setItem("stadium_game_state", JSON.stringify(this.state));
    this.notifyListeners();
  }

  reset() {
    this.state = this.getDefaultState();
    this.saveState();
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.state));
  }

  // 아웃카운트 증가
  addOut() {
    this.state.balls = 0;
    this.state.strikes = 0;
    this.state.outs += 1;

    if (this.state.outs >= 3) {
      this.nextHalfInning();
    } else {
      this.nextBatter();
    }
    this.saveState();
  }

  // 볼 판정
  addBall() {
    this.state.balls += 1;
    if (this.state.balls >= 4) {
      this.walkBatter();
    } else {
      this.saveState();
    }
  }

  // 스트라이크 판정
  addStrike() {
    this.state.strikes += 1;
    if (this.state.strikes >= 3) {
      this.addOut();
    } else {
      this.saveState();
    }
  }

  // 안타 시뮬레이션
  addHit(bases = 1) {
    this.state.balls = 0;
    this.state.strikes = 0;

    // 주자 이동
    const newRunners = [false, false, false];
    let runsScored = 0;

    // 3루 주자
    if (this.state.runners[2]) {
      runsScored++;
    }
    // 2루 주자
    if (this.state.runners[1]) {
      if (bases >= 2) runsScored++;
      else newRunners[2] = true;
    }
    // 1루 주자
    if (this.state.runners[0]) {
      if (bases >= 3) runsScored++;
      else if (bases === 2) newRunners[2] = true;
      else newRunners[1] = true;
    }

    // 타자 주자
    if (bases === 1) newRunners[0] = true;
    else if (bases === 2) newRunners[1] = true;
    else if (bases === 3) newRunners[2] = true;
    else if (bases === 4) runsScored++; // 홈런

    if (runsScored > 0) {
      if (this.state.isTop) {
        this.state.awayScore += runsScored;
      } else {
        this.state.homeScore += runsScored;
      }
    }

    this.state.runners = newRunners;
    this.nextBatter();
    this.saveState();
  }

  // 사사구(볼넷)로 출루
  walkBatter() {
    this.state.balls = 0;
    this.state.strikes = 0;

    const runners = [...this.state.runners];
    let runsScored = 0;

    if (!runners[0]) {
      runners[0] = true;
    } else if (!runners[1]) {
      runners[1] = true;
    } else if (!runners[2]) {
      runners[2] = true;
    } else {
      runsScored = 1;
    }

    if (runsScored > 0) {
      if (this.state.isTop) {
        this.state.awayScore += runsScored;
      } else {
        this.state.homeScore += runsScored;
      }
    }

    this.state.runners = runners;
    this.nextBatter();
    this.saveState();
  }

  // 다음 타자로 전환
  nextBatter() {
    this.state.batterIndex = (this.state.batterIndex % 9) + 1;
  }

  // 이닝 교대
  nextHalfInning() {
    this.state.outs = 0;
    this.state.balls = 0;
    this.state.strikes = 0;
    this.state.runners = [false, false, false];
    
    if (this.state.isTop) {
      this.state.isTop = false;
    } else {
      this.state.isTop = true;
      this.state.inning += 1;
    }

    // 이닝 교대 시 다음 타순은 대략 랜덤 또는 연속으로
    this.state.batterIndex = Math.floor(Math.random() * 9) + 1;

    // 만약 9회 말이 끝나고 경기가 종료되는 상황 예외 처리
    if (this.state.inning > 9 && !this.state.isTop && this.state.homeScore !== this.state.awayScore) {
      // 경기 종료 리셋
      alert("경기가 종료되었습니다! 새 게임을 시작합니다.");
      this.reset();
    }
  }

  // 자동 진행 켜기/끄기
  toggleAutoPlay() {
    this.state.isPlaying = !this.state.isPlaying;
    this.saveState();

    if (this.state.isPlaying) {
      this.autoPlayInterval = setInterval(() => {
        this.simulatePitch();
      }, 8000); // 8초마다 1구씩 진행
    } else {
      if (this.autoPlayInterval) {
        clearInterval(this.autoPlayInterval);
        this.autoPlayInterval = null;
      }
    }
  }

  // 랜덤한 투구 시뮬레이션
  simulatePitch() {
    const rand = Math.random();
    if (rand < 0.45) {
      // 스트라이크 (헛스윙/파울/루킹)
      this.addStrike();
    } else if (rand < 0.75) {
      // 볼
      this.addBall();
    } else {
      // 인플레이 타구 (안타 또는 아웃)
      const hitRand = Math.random();
      if (hitRand < 0.3) {
        // 단타
        this.addHit(1);
      } else if (hitRand < 0.36) {
        // 2루타 이상 또는 홈런
        const extraBases = Math.random() < 0.15 ? 4 : (Math.random() < 0.4 ? 3 : 2);
        this.addHit(extraBases);
      } else {
        // 아웃 (플라이/땅볼)
        this.addOut();
      }
    }
  }

  /**
   * 음식 구매 타이밍 추천 엔진 알고리즘
   * @param {number} totalTime 총 소요시간 (왕복 이동시간 + 매장 대기시간, 분 단위)
   * @returns {object} { recommendLevel: 'go'|'caution'|'wait', message: string, detail: string }
   */
  getRecommendation(totalTime) {
    // 1. 현재 하프이닝 남은 시간 대략적 추정 (분 단위)
    // 아웃카운트당 평균 3분으로 가정
    // 주자가 많거나 풀카운트일수록 이닝이 길어짐
    let remainingMinutes = (3 - this.state.outs) * 3;
    
    // 주자 상황에 따른 추가 시간 (주자 누적 시 경기 지연)
    const runnersCount = this.state.runners.filter(Boolean).length;
    remainingMinutes += runnersCount * 1.5;

    // 현재 타순 가중치 (상위 타선 1-5번은 출루율이 높아 이닝이 길어짐, 하위 타선 7-9번은 빨리 끝남)
    if (this.state.batterIndex >= 7) {
      remainingMinutes -= 1.0;
    } else if (this.state.batterIndex <= 4) {
      remainingMinutes += 1.5;
    }

    // 스트라이크/볼 카운트에 의한 미세 조정
    remainingMinutes += (this.state.balls * 0.4) - (this.state.strikes * 0.2);
    
    // 최솟값 보정
    remainingMinutes = Math.max(remainingMinutes, 1.0);

    // 공수교대 브레이크 타임 (약 2.5분)
    const inningBreakTime = 2.5;

    let recommendLevel = "caution";
    let message = "";
    let detail = "";

    // 홈팬 기준 시뮬레이션:
    // 홈 팀이 공격 중(말 이닝)일 때 음식을 사러 나가면 우리 팀의 득점 장면을 놓치게 됨.
    // 따라서 홈 팀 수비 중(초 이닝)에 나가는 것이 좋음.
    // 만약 경기 진행이 상대방 공격(초)이고, 상대 타순이 하위타선(7-9번)이며, 남은 시간이 충분할 때가 최적!
    
    const isHomeAttack = !this.state.isTop; // 말 이닝 = 홈팀 공격
    
    // 디버깅용 로그
    // console.log(`Total Time: ${totalTime}min, Est Remaining: ${remainingMinutes}min, Home Attack: ${isHomeAttack}`);

    if (totalTime <= remainingMinutes + inningBreakTime) {
      // 1. 총 소요 시간이 현재 하프 이닝 종료 전에 복귀할 수 있을 정도로 짧을 때
      if (isHomeAttack) {
        // 홈팀 공격 중이나, 시간이 넉넉하여 금방 다녀올 수 있음
        recommendLevel = "go";
        message = "지금 바로 다녀오세요!";
        detail = `소요 시간(${Math.round(totalTime)}분)이 짧아 홈 팀 공격이 끝나기 전에 복귀 가능합니다.`;
      } else {
        // 홈팀 수비 중이고 소요 시간이 짧음 (최적)
        recommendLevel = "go";
        message = "최적의 구매 타이밍!";
        detail = `소요 시간(${Math.round(totalTime)}분)이 충분히 짧으며, 현재 수비 이닝 내에 여유롭게 복귀합니다.`;
      }
    } else {
      // 2. 소요 시간이 남은 이닝 시간보다 길 때 (이닝을 일부 놓쳐야 함)
      if (isHomeAttack) {
        // 우리 팀 공격이 한창인데 나가면 결정적 장면을 놓칠 수 있음
        recommendLevel = "wait";
        message = "잠시 대기 후 수비 이닝에 출발하세요";
        detail = `현재 홈 팀 공격 중입니다. 대기 및 이동시간(${Math.round(totalTime)}분)이 길어 득점 찬스를 놓칠 수 있습니다. 다음 이닝 초(수비 시)에 출발을 추천합니다.`;
      } else {
        // 홈팀 수비 중이나, 시간이 오래 걸려 다음 공격 이닝 초반까지 놓칠 가능성이 있음
        if (this.state.outs === 2) {
          // 2아웃이므로 곧 이닝교대(공수교대)가 일어남
          // 지금 출발하면 이닝 교대 시간(2.5분) 동안 이동하여 대기하므로, 우리 팀 공격 첫 타석을 놓치게 됨
          recommendLevel = "wait";
          message = "이닝 교대 직후 출발 추천";
          detail = `현재 2아웃 수비 중입니다. 지금 가시면 이닝교대 시간과 겹쳐 우리 팀 홈런/득점 찬스(이닝 초반)를 놓칩니다. 차라리 다음 하프이닝 중간에 가시는 것을 추천합니다.`;
        } else {
          // 0~1아웃 수비 중
          // 비록 다음 공격을 일부 놓치더라도, 지금 출발하는 것이 가장 덜 아까운 타이밍
          recommendLevel = "caution";
          message = "구매 고려 가능 (조금 서두르세요)";
          detail = `소요 시간(${Math.round(totalTime)}분)이 다소 길어 다음 우리 팀 공격의 앞 타석을 놓칠 수 있습니다. 가신다면 지금 서둘러 출발하세요.`;
        }
      }
    }

    // 초단시간 (예: 5분 이내) 메뉴의 경우 무조건 Go 추천
    if (totalTime <= 5) {
      recommendLevel = "go";
      message = "지금 바로 구매 가능!";
      detail = `매우 가까운 매장이거나 대기 줄이 없습니다. 즉시 다녀오셔도 경기 흐름에 지장이 없습니다.`;
    }

    return {
      recommendLevel,
      message,
      detail,
      estimatedRemaining: Math.round(remainingMinutes)
    };
  }
}
