// ==========================================================================
// LG U+ Connected Car E2E 통합 구간 진단 플랫폼 프론트엔드 로직 (app.js)
// 진단 브리프 레이아웃: 왼쪽 노선도(어디서) + 1-2-3 브리프(무슨 일 → 근거 → 복구)
// ==========================================================================

(function () {
  const ORIGINAL_SCENARIOS = JSON.parse(JSON.stringify(window.DASHBOARD_SCENARIOS));
  const BRIEFS = window.DASHBOARD_BRIEFS || {};
  let scenarios = JSON.parse(JSON.stringify(ORIGINAL_SCENARIOS));

  // 역할(RBAC)은 화면에서 전환하지 않고 로그인 세션 권한으로 고정한다.
  // 목업에서는 URL 파라미터로 세션을 시뮬레이션: ?role=l1 → L1 상담원, 기본값 → L2 운영자
  // ?demo=1 → 제안/시연용 MTTR 비교 배너 노출
  const urlParams = new URLSearchParams(window.location.search);
  const SESSION_USERS = {
    L2_OP: { id: "op_lgu_0421", label: "L2 운영 실무자" },
    L1_CS: { id: "cs_agent_102", label: "L1 콜센터 상담원" }
  };
  const roleMode = urlParams.get("role") === "l1" ? "L1_CS" : "L2_OP"; // L2_OP | L1_CS
  const isL1 = roleMode === "L1_CS";
  const isDemoMode = urlParams.get("demo") === "1";

  let currentScenarioIndex = 0;
  let tzMode = "BOTH"; // BOTH | KST | UTC
  let doneActions = {}; // 시나리오 id → 완료한 복구 단계 Set
  let expandedHops = new Set(); // 노선도에서 펼친 Hop 번호

  // 복구 액션 정의 (lockable: 주행 중·복구 완료 시 잠금)
  const ACTIONS = {
    sgsReset: { label: "코어망 SGs 세션 초기화", run: "초기화 실행", lockable: true },
    provision: { label: "본사 프로비저닝 다시 요청", run: "다시 요청", lockable: true },
    wakeup: { label: "Wake-up SMS 다시 보내기", run: "다시 보내기", lockable: false },
    evidence: { label: "L3 증적 팩", run: "증적 팩 열기", lockable: false }
  };

  // DOM Elements
  const $ = (id) => document.getElementById(id);
  const scenarioTabsEl = $("scenarioTabs");
  const universalSearchInput = $("universalSearchInput");
  const btnSearch = $("btnSearch");
  const btnResetScenario = $("btnResetScenario");
  const tzModeSelect = $("tzModeSelect");
  const sessionUserBadge = $("sessionUserBadge");

  const caseTitle = $("caseTitle");
  const caseMeta = $("caseMeta");
  const caseStatus = $("caseStatus");
  const leadtimeBanner = $("leadtimeBanner");

  const hopPipeline = $("hopPipeline");
  const latencyTotalText = $("latencyTotalText");
  const idSummary = $("idSummary");

  const verdictBox = $("verdictBox");
  const evidenceList = $("evidenceList");
  const cautionText = $("cautionText");
  const telemetryInfographicGrid = $("telemetryInfographicGrid");

  const safetyGuardrailBadge = $("safetyGuardrailBadge");
  const primaryActions = $("primaryActions");
  const actionStatusNote = $("actionStatusNote");
  const moreActions = $("moreActions");
  const secondaryActions = $("secondaryActions");
  const csScriptText = $("csScriptText");
  const btnCopyCsScript = $("btnCopyCsScript");
  const actionConsole = $("actionConsole");
  const actionLogCount = $("actionLogCount");

  const idSummaryBadge = $("idSummaryBadge");
  const inspectionWindowText = $("inspectionWindowText");
  const idBridgeGrid = $("idBridgeGrid");
  const txIdLabel = $("txIdLabel");
  const timelineTableBody = $("timelineTableBody");

  const btnOpenEvidenceModal = $("btnOpenEvidenceModal");
  const evidenceModal = $("evidenceModal");
  const modalEvidenceBanner = $("modalEvidenceBanner");
  const evidenceJsonPre = $("evidenceJsonPre");
  const btnCopyEvidenceJson = $("btnCopyEvidenceJson");
  const btnDownloadEvidenceJson = $("btnDownloadEvidenceJson");
  const btnAttachServiceNow = $("btnAttachServiceNow");
  const btnCloseModal = $("btnCloseModal");

  function getCurrentScenario() {
    return scenarios[currentScenarioIndex];
  }

  function getBrief(sc) {
    return BRIEFS[sc.id] || { caseTitle: sc.title, headline: sc.rootCauseVerdict.faultDomain, summary: sc.rootCauseVerdict.technicalExplanation, evidence: [], steps: [] };
  }

  function getDoneSet(sc) {
    if (!doneActions[sc.id]) doneActions[sc.id] = new Set();
    return doneActions[sc.id];
  }

  function isResolved(sc) {
    return sc.rootCauseVerdict.severity === "RESOLVED";
  }

  function isMoving(sc) {
    return sc.vehicle.ignitionState === "IGN_ON_MOVING";
  }

  function formatTimestamp(kstStr, utcStr) {
    if (tzMode === "KST") return `${kstStr} KST`;
    if (tzMode === "UTC") return `${utcStr}`;
    return `${kstStr} KST (${utcStr})`;
  }

  // 괄호 앞 핵심 문구만 남김: "정차 중 (IGN_OFF · 원격 복구 가능)" → "정차 중"
  function shortLabel(str) {
    return (str || "").split(" (")[0];
  }

  // 작업 기록 (감사 로그 포함)
  function appendConsoleLog(msg, isStrong) {
    const now = new Date();
    const ts = now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0");
    const line = document.createElement("div");
    line.className = "console-line";
    line.innerHTML = `<span class="console-ts">${ts}</span><span class="console-msg${isStrong ? " is-strong" : ""}">${msg}</span>`;
    actionConsole.appendChild(line);
    actionConsole.scrollTop = actionConsole.scrollHeight;
    actionLogCount.textContent = `${actionConsole.childElementCount}건`;
  }

  // ========================================================================
  // 컴플라이언스 & 프라이버시 마스킹 헬퍼 함수 (Zero PII & RBAC Compliance)
  // ========================================================================
  function maskVin(vin, isL1) {
    if (!vin) return "-";
    if (vin.length < 10) return vin;
    if (isL1) {
      return vin.substring(0, 5) + "******" + vin.substring(vin.length - 4);
    }
    return vin.substring(0, 7) + "******" + vin.substring(vin.length - 4);
  }

  function maskMsisdn(num) {
    if (!num) return "-";
    return num.replace(/(\d{3})-(\d{3,4})-(\d{4})/, "$1-****-$3");
  }

  function maskImei(imei) {
    if (!imei) return "-";
    if (imei.length < 10) return imei;
    return imei.substring(0, 6) + "******" + imei.substring(imei.length - 3);
  }

  function maskIccid(iccid) {
    if (!iccid) return "-";
    if (iccid.length < 12) return iccid;
    return iccid.substring(0, 6) + "**********" + iccid.substring(iccid.length - 4);
  }

  function maskImsi(imsi, isL1) {
    if (!imsi) return "-";
    if (isL1) return "비인가 권한(L2 전용)";
    if (imsi.length < 10) return imsi;
    return imsi.substring(0, 5) + "******" + imsi.substring(imsi.length - 4);
  }

  function maskEuiccEid(eid, isL1) {
    if (!eid) return "-";
    if (eid.startsWith("NONE")) return eid;
    if (isL1) return "비인가 권한(L2 전용)";
    if (eid.length < 16) return eid;
    return eid.substring(0, 8) + "******************" + eid.substring(eid.length - 4);
  }

  function stripLeadingEmojis(str) {
    if (!str) return "";
    return str.replace(/^[🟢🟡🔴🚨⚠️🔒🛡️✅⚡🔍📋🎯🛠️⏱️📄🔗📌💬👉]+\s*/g, "");
  }

  // ========================================================================
  // 컴플라이언스 감사 추적 (Audit Trail)
  // ========================================================================
  function logAuditEvent(actionType, options = {}) {
    const sc = getCurrentScenario();
    const v = sc.vehicle;
    const maskedVin = maskVin(v.vin, isL1);
    const masked012 = maskMsisdn(v.msisdn012);
    const ticketId = options.ticketId || v.requestId;
    const status = options.status || "SUCCESS";
    const now = new Date();
    const auditEventId = `AUDIT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds()
    ).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const consoleMsg = `[AUDIT: COMPLIANCE_OK] ${auditEventId} | 작업자: ${
      SESSION_USERS[roleMode].id
    }(${roleMode}) | 티켓: ${ticketId} | 대상: ${maskedVin} (${masked012}) | 액션: ${actionType} | 상태: ${status}`;
    appendConsoleLog(consoleMsg, false);
  }

  // 상태 → 색 톤 (대기열 점, 상태 배지)
  function getCaseTone(sc) {
    if (isResolved(sc)) return { tone: "green", label: "복구 완료" };
    if (isMoving(sc)) return { tone: "amber", label: "주행 중, 원격 조치 잠김" };
    if (sc.rootCauseVerdict.severity === "CRITICAL") return { tone: "red", label: "원인 확인됨, 복구 필요" };
    return { tone: "amber", label: "망 정상, 고객 안내로 종결" };
  }

  // 1. 진단 대기열 (시나리오 프리셋)
  function renderScenarioTabs() {
    scenarioTabsEl.innerHTML = "";
    scenarios.forEach((sc, idx) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "queue-item";
      item.title = sc.title;
      if (idx === currentScenarioIndex) item.setAttribute("aria-current", "true");
      item.innerHTML = `
        <span class="queue-dot is-${getCaseTone(sc).tone}" aria-hidden="true"></span>
        <span>${getBrief(sc).caseTitle}</span>
        <small>${sc.oemName.split(" ")[0]}</small>
      `;
      item.addEventListener("click", () => selectScenario(idx, "ID Bridge"));
      scenarioTabsEl.appendChild(item);
    });
  }

  function selectScenario(idx, source) {
    currentScenarioIndex = idx;
    const sc = getCurrentScenario();
    universalSearchInput.value = maskVin(sc.vehicle.vin, isL1);
    expandedHops = new Set(sc.hops.filter((h) => h.status === "RED").map((h) => h.hopNumber));
    renderAll();
    appendConsoleLog(
      `[${source}] '${maskVin(sc.vehicle.vin, isL1)}' (${sc.oemName}) 조회 완료 — LG U+ 코어망 시그널링 프로브 연동 성공.`,
      true
    );
  }

  // 케이스 헤더: 제목 · 대상 · 상태
  function renderCaseBar(sc) {
    const v = sc.vehicle;
    const windowText = tzMode === "UTC" ? `${v.inspectionWindowUtc} UTC` : `${v.inspectionWindowKst} KST`;
    caseTitle.textContent = getBrief(sc).caseTitle;
    caseMeta.innerHTML = `
      <span>${sc.oemName}</span>
      <span>VIN <span class="mono">${maskVin(v.vin, isL1)}</span></span>
      <span>${windowText}</span>
    `;
    const { tone, label } = getCaseTone(sc);
    caseStatus.className = `status-pill is-${tone}`;
    caseStatus.textContent = label;
  }

  // [데모] As-Is vs To-Be MTTR 리드타임 비교
  function renderLeadtimeBanner(sc) {
    let asIsShort = "26시간 (1,560분)";
    let toBeShort = "5분 이내";
    let toBePct = 4;
    let savingRate = "-99.7%";

    if (sc.id === "SCENARIO_B") {
      asIsShort = "8일 (192시간)";
      toBeShort = "당일 첫 턴 (15분)";
      toBePct = 5;
      savingRate = "-99.8%";
    } else if (sc.id === "SCENARIO_C") {
      asIsShort = "4시간 (2차 이관)";
      toBeShort = "30초 (즉시 종결)";
      toBePct = 3;
      savingRate = "-99.8%";
    } else if (sc.id === "SCENARIO_D") {
      asIsShort = "수기 포털 반복 조회";
      toBeShort = "즉시 인지 (10초)";
      toBePct = 4;
      savingRate = "즉시 판별";
    }

    leadtimeBanner.innerHTML = `
      <div>
        <div class="lt-pattern-name">${sc.patternName}</div>
        <div class="lt-sub-caption">장애 진단·복구 리드타임(MTTR) 비교</div>
      </div>
      <div class="lt-bars-col">
        <div class="lt-bar-row">
          <span class="lt-bar-label">기존</span>
          <div class="lt-bar-track"><div class="lt-bar-fill-asis" style="width: 100%;"></div></div>
          <span class="lt-bar-val">${asIsShort}</span>
        </div>
        <div class="lt-bar-row">
          <span class="lt-bar-label">이 화면</span>
          <div class="lt-bar-track"><div class="lt-bar-fill-tobe" style="width: ${toBePct}%;"></div></div>
          <span class="lt-bar-val highlight">${toBeShort}</span>
        </div>
      </div>
      <div>
        <div class="lt-saving-num">${savingRate}</div>
        <div class="lt-saving-label">MTTR 단축</div>
      </div>
    `;
  }

  // 2. 왼쪽 노선도: 5-Hop 상태 + 구간 소요시간, Hop을 누르면 세부 항목을 펼침
  function renderHopPipeline(sc) {
    const { segments, totalLabel } = getLatencySegments(sc);
    const brief = getBrief(sc);
    // 신호가 끊긴 Hop 이후 구간은 '도달하지 못함'(점선)으로 표시
    const breakAfter = isResolved(sc) ? null : brief.brokenAfterHop;
    latencyTotalText.innerHTML = totalLabel;

    hopPipeline.innerHTML = "";
    sc.hops.forEach((h, idx) => {
      const li = document.createElement("li");
      const tone = h.status === "RED" ? "is-red" : h.status === "AMBER" ? "is-amber" : "is-green";
      const afterBreak = breakAfter && h.hopNumber > breakAfter;
      li.className = `stop ${afterBreak ? "after-break" : tone}`;
      const expanded = expandedHops.has(h.hopNumber);
      const seg = segments[idx];
      const detailId = `hopDetail${h.hopNumber}`;

      li.innerHTML = `
        <i class="pin" aria-hidden="true"></i>
        <button type="button" class="stop-toggle" aria-expanded="${expanded}" aria-controls="${detailId}">
          <span class="stop-name"><span>${h.name}</span><span class="chev" aria-hidden="true">▾</span></span>
          <span class="stop-state">${afterBreak ? "정상 대기, 호출 못 받음" : h.statusLabel}</span>
          ${seg ? `<span class="stop-ms">${seg.ms}</span>` : ""}
        </button>
        <dl class="stop-detail" id="${detailId}" ${expanded ? "" : "hidden"}>
          <div class="actor">${h.actor}</div>
          ${h.detailItems
            .map((item) => `<div><dt>${stripLeadingEmojis(item.label)}</dt><dd>${stripLeadingEmojis(item.value)}</dd></div>`)
            .join("")}
        </dl>
      `;
      li.querySelector(".stop-toggle").addEventListener("click", () => {
        if (expandedHops.has(h.hopNumber)) expandedHops.delete(h.hopNumber);
        else expandedHops.add(h.hopNumber);
        renderHopPipeline(getCurrentScenario());
      });
      hopPipeline.appendChild(li);
    });
  }

  // E2E 구간별 소요시간 (노선도 각 정류장에 표시)
  function getLatencySegments(sc) {
    let segments = [];
    let totalLabel = "";

    if (isResolved(sc)) {
      segments = [{ ms: "110 ms" }, { ms: "115 ms" }, { ms: "190 ms" }, { ms: "410 ms" }, { ms: "515 ms" }];
      totalLabel = "전체 응답 <strong>1.34초</strong>, 정상 복구";
    } else if (sc.id === "SCENARIO_A") {
      segments = [{ ms: "110 ms" }, { ms: "113 ms" }, { ms: "188 ms (Spool)" }, { ms: "Paging 0건" }, { ms: "90,000 ms 대기 (ERR_408)" }];
      totalLabel = "총 <strong>90.4초</strong> 경과 후 타임아웃";
    } else if (sc.id === "SCENARIO_B") {
      segments = [{ ms: "120 ms" }, { ms: "TCP_RST 차단" }, { ms: "인입 0건" }, { ms: "240 ms" }, { ms: "상향 14 pkts" }];
      totalLabel = "국내 LG U+ 구간 <strong>0.24초 정상</strong>, 해외 구간 단절";
    } else if (sc.id === "SCENARIO_C") {
      segments = [{ ms: "95 ms" }, { ms: "105 ms" }, { ms: "180 ms" }, { ms: "Paging 3회 송출" }, { ms: "무응답 (96시간 주차)" }];
      totalLabel = "서버와 기지국 송출 <strong>0.6초 정상</strong>";
    } else {
      segments = [{ ms: "110 ms" }, { ms: "125 ms" }, { ms: "1,200 ms" }, { ms: "RSRP -121 dBm" }, { ms: "신호 감쇄" }];
      totalLabel = "외곽 약전계로 <strong>재전송 지연</strong>";
    }

    return { segments, totalLabel };
  }

  // 왼쪽 하단: 차량 · 회선 요약
  function renderIdSummary(sc) {
    const v = sc.vehicle;
    idSummary.innerHTML = `
      <div><dt>VIN</dt><dd class="mono">${maskVin(v.vin, isL1)}</dd></div>
      <div><dt>012 번호</dt><dd class="mono">${maskMsisdn(v.msisdn012)}</dd></div>
      <div><dt>통신사</dt><dd>${v.mnoCode} ${v.ratType}</dd></div>
      <div><dt>시동</dt><dd>${shortLabel(v.ignitionLabel)}</dd></div>
      <div><dt>배터리</dt><dd>${shortLabel(v.batteryVoltage)}</dd></div>
    `;
  }

  // 3. [1단계] 무슨 일이 있었나: 결론 한 문장 + 쉬운 설명
  function renderVerdictBox(sc) {
    const brief = getBrief(sc);
    const rv = sc.rootCauseVerdict;
    const text = isResolved(sc) && brief.resolved ? brief.resolved : brief;

    verdictBox.innerHTML = `
      <h2 class="step-label" id="stepWhatTitle">무슨 일이 있었나</h2>
      <h3 class="headline">${text.headline}</h3>
      <p>${text.summary}</p>
      <p class="headline-sub eng">판정: ${stripLeadingEmojis(rv.faultDomain)}</p>
    `;
  }

  // [2단계] 근거: 판단 근거 3개 + 착시 주의
  function renderEvidence(sc) {
    const brief = getBrief(sc);
    const items = [...(brief.evidence || [])];
    if (isResolved(sc)) {
      const last = sc.timeline[sc.timeline.length - 1];
      items.unshift({ tone: "ok", text: "복구 후 정상 응답을 확인했습니다", sub: last.system, code: last.code });
    }
    evidenceList.innerHTML = items
      .map(
        (e) => `
        <li class="is-${e.tone}">
          <b>${e.text}</b>
          <small>${e.sub}</small>
          <code class="eng">${e.code}</code>
        </li>`
      )
      .join("");
    cautionText.textContent = isResolved(sc) ? stripLeadingEmojis(sc.rootCauseVerdict.illusionWarning) : brief.caution || "";
    cautionText.hidden = !cautionText.textContent;
  }

  // SVG 반원 도넛 게이지 생성 헬퍼
  function createSemiDonutSvg(percent, isCritical) {
    const clamped = Math.max(5, Math.min(100, percent));
    const radius = 38;
    const circumference = Math.PI * radius; // 반원 둘레 (~119.38)
    const offset = circumference - (clamped / 100) * circumference;

    return `
      <svg viewBox="0 0 100 58" width="80" height="46" aria-hidden="true">
        <path d="M 12 48 A 38 38 0 0 1 88 48" class="gauge-track" fill="none" stroke-width="9" />
        <path
          d="M 12 48 A 38 38 0 0 1 88 48"
          class="gauge-fill${isCritical ? " is-critical" : ""}"
          fill="none"
          stroke-width="9"
          stroke-dasharray="${circumference.toFixed(1)}"
          stroke-dashoffset="${offset.toFixed(1)}"
        />
      </svg>
    `;
  }

  // 측정값 자세히 보기: 배터리 · 수신감도 · 코어망 패킷
  function renderTelemetryInfographics(sc) {
    const resolved = isResolved(sc);

    // 1. 배터리 전압 파싱
    const voltMatch = sc.vehicle.batteryVoltage.match(/([\d.]+)\s*V/);
    const voltNum = voltMatch ? parseFloat(voltMatch[1]) : 12.4;
    const isLowBattery = voltNum < 11.8;
    // 10.5V ~ 14.5V 범위를 0~100%로 변환
    const voltPct = Math.round(((voltNum - 10.5) / 4.0) * 100);

    // 2. 기지국 수신감도(RSRP) 및 신호 바 계산
    let rsrpDbm = -84;
    let rsrpStateLabel = "양호 (지상 정상 권역)";
    let signalBars = 4; // 1~5
    let isWeakSignal = false;

    if (sc.id === "SCENARIO_B") {
      rsrpDbm = -78;
      rsrpStateLabel = "우수 (전시장 셀 정상)";
      signalBars = 5;
    } else if (sc.id === "SCENARIO_C") {
      rsrpDbm = -118;
      rsrpStateLabel = "음영 (지하 심층 주차 추정)";
      signalBars = 1;
      isWeakSignal = true;
    } else if (sc.id === "SCENARIO_D") {
      rsrpDbm = -121;
      rsrpStateLabel = "약전계 (산간 셀 경계)";
      signalBars = 1;
      isWeakSignal = true;
    }

    const barsHtml = [1, 2, 3, 4, 5]
      .map((step) => {
        const h = 8 + step * 6;
        const activeClass = step <= signalBars ? (isWeakSignal ? "active-crit" : "active-normal") : "";
        return `<div class="sig-bar ${activeClass}" style="height: ${h}px;"></div>`;
      })
      .join("");

    // 3. 코어망 시그널링 패킷 송수신 지표
    let row1Label = "기지국 RF Paging 송출";
    let row1Val = "0건 (SGs 드롭)";
    let row1Pct = 4;
    let row1Crit = true;

    let row2Label = "단말 → 서버 응답 패킷";
    let row2Val = "0건 (대기 중)";
    let row2Pct = 4;
    let row2Crit = false;

    if (resolved) {
      row1Val = "1건 (정상 송출)";
      row1Pct = 100;
      row1Crit = false;
      row2Val = "TCU_CONN_ACK (200 OK)";
      row2Pct = 100;
      row2Crit = false;
    } else if (sc.id === "SCENARIO_B") {
      row1Label = "단말 상향 HTTPS 송신";
      row1Val = "14 pkts (정상 송신)";
      row1Pct = 100;
      row1Crit = false;
      row2Label = "본사 방화벽 & SMS Hub";
      row2Val = "0건 (TCP_RST 차단)";
      row2Pct = 5;
      row2Crit = true;
    } else if (sc.id === "SCENARIO_C") {
      row1Val = "3회 (기지국 정상 송출)";
      row1Pct = 100;
      row1Crit = false;
      row2Label = "단말 모뎀 Paging 수신";
      row2Val = "0건 (Deep Sleep)";
      row2Pct = 5;
      row2Crit = true;
    } else if (sc.id === "SCENARIO_D") {
      row1Label = "외곽 기지국 Paging 재전송";
      row1Val = "4회 (신호 감쇄 재시도)";
      row1Pct = 80;
      row1Crit = false;
      row2Label = "원격 리셋 가드레일";
      row2Val = "주행 중 잠금 (IGN_ON)";
      row2Pct = 100;
      row2Crit = true;
    }

    telemetryInfographicGrid.innerHTML = `
      <div class="gauge-card ${isLowBattery ? "is-alert" : ""}">
        <div class="gauge-card-header">
          <span>보조배터리 전압</span>
          <span class="gauge-tag">절전 기준 11.8V</span>
        </div>
        <div class="gauge-body">
          ${createSemiDonutSvg(voltPct, isLowBattery)}
          <div>
            <div class="gauge-big-num ${isLowBattery ? "num-critical" : ""}">${voltNum.toFixed(1)}V</div>
            <div class="gauge-sub-desc">${isLowBattery ? "방전 보호 절전 진입" : "정상 전압"}</div>
          </div>
        </div>
        <div class="gauge-threshold-note">
          <span>시동 ${isMoving(sc) ? "IGN_ON (주행)" : "IGN_OFF (정차)"}</span>
        </div>
      </div>

      <div class="gauge-card ${isWeakSignal ? "is-alert" : ""}">
        <div class="gauge-card-header">
          <span>기지국 수신감도</span>
          <span class="gauge-tag">${sc.vehicle.ratType.split(" ")[0]}</span>
        </div>
        <div class="gauge-body">
          <div class="signal-bars-viz" aria-hidden="true">${barsHtml}</div>
          <div>
            <div class="gauge-big-num ${isWeakSignal ? "num-critical" : ""}">${rsrpDbm} dBm</div>
            <div class="gauge-sub-desc">${rsrpStateLabel}</div>
          </div>
        </div>
        <div class="gauge-threshold-note">
          <span>정상 -70 ~ -105</span>
          <span>음영 &lt; -115</span>
        </div>
      </div>

      <div class="gauge-card ${row1Crit || row2Crit ? "is-alert" : ""}">
        <div class="gauge-card-header">
          <span>코어망 패킷 흐름</span>
          <span class="gauge-tag">3GPP Probe</span>
        </div>
        <div class="pkt-chart-rows">
          <div>
            <div class="pkt-row-top"><span>${row1Label}</span><strong class="${row1Crit ? "crit-text" : ""}">${row1Val}</strong></div>
            <div class="pkt-bar-bg"><div class="pkt-bar-fill ${row1Crit ? "fill-crit" : ""}" style="width: ${row1Pct}%;"></div></div>
          </div>
          <div>
            <div class="pkt-row-top"><span>${row2Label}</span><strong class="${row2Crit ? "crit-text" : ""}">${row2Val}</strong></div>
            <div class="pkt-bar-bg"><div class="pkt-bar-fill ${row2Crit ? "fill-crit" : ""}" style="width: ${row2Pct}%;"></div></div>
          </div>
        </div>
      </div>
    `;
  }

  // 액션 잠금 사유 (주행 중 / 복구 완료)
  function getLockReason(sc, actionKey) {
    if (!ACTIONS[actionKey].lockable) return "";
    if (isMoving(sc)) return "주행 중 잠금";
    if (isResolved(sc)) return "복구 완료";
    return "";
  }

  // 4. [3단계] 복구 체크리스트: 다음 할 일 하나만 마젠타, 끝난 단계는 체크
  function renderRecoveryControls(sc) {
    const brief = getBrief(sc);
    const done = getDoneSet(sc);

    if (isMoving(sc)) {
      safetyGuardrailBadge.className = "guardrail is-locked";
      safetyGuardrailBadge.textContent = "차량이 주행 중(IGN_ON)이라 코어망 세션 초기화가 자동으로 잠겼습니다.";
    } else {
      safetyGuardrailBadge.className = "guardrail";
      safetyGuardrailBadge.textContent = `차량이 정차 중이고 배터리가 ${shortLabel(sc.vehicle.batteryVoltage)}라 원격으로 실행해도 안전합니다.`;
    }

    const steps = (brief.steps || []).filter((s) => !(s.l2Only && isL1));
    const visible = new Set(steps.map((s) => s.action));
    // 실행할 원격 조치가 없으면(고객 안내 종결·복구 완료) 안전 문구를 숨김. 주행 중 잠금은 항상 노출
    safetyGuardrailBadge.hidden = !isMoving(sc) && (steps.length === 0 || isResolved(sc));
    let nextMarked = false;

    primaryActions.innerHTML = "";
    steps.forEach((s) => {
      // 복구가 끝났다면 복구를 일으킨 단계(잠금 대상)도 완료로 표시
      const isDone = done.has(s.action) || (ACTIONS[s.action].lockable && isResolved(sc));
      const waiting = s.after && visible.has(s.after) && !done.has(s.after) && !isResolved(sc);
      const lock = isDone ? "" : getLockReason(sc, s.action);
      const isNext = !isDone && !waiting && !lock && !nextMarked;
      if (isNext) nextMarked = true;

      const li = document.createElement("li");
      li.className = (isDone ? "is-done" : "") + (isNext ? " is-next" : "");
      li.innerHTML = `
        <span class="check" aria-hidden="true"></span>
        <span><b>${s.title}</b><small>${waiting ? "앞 단계가 끝나면 실행할 수 있습니다." : s.desc}</small></span>
        <button type="button" class="btn ${isNext ? "btn-primary" : "btn-quiet"}" data-action="${s.action}"
          ${isDone || waiting || lock ? "disabled" : ""}>${isDone ? "완료" : lock || ACTIONS[s.action].run}</button>
      `;
      primaryActions.appendChild(li);
    });

    if (steps.length === 0) {
      actionStatusNote.hidden = false;
      actionStatusNote.textContent = isResolved(sc)
        ? "복구가 끝났습니다. 추가 조치가 필요하지 않습니다."
        : brief.note || "엔지니어(L2) 권한이 필요한 조치입니다. L2 운영자에게 이관하세요.";
      if (isL1 && (brief.steps || []).length) {
        actionStatusNote.textContent = "엔지니어(L2) 권한이 필요한 조치입니다. 아래 안내 문구로 응대한 뒤 L2에 이관하세요.";
      }
    } else {
      actionStatusNote.hidden = true;
    }

    // 다른 조치 (L2 전용): 체크리스트에 없는 복구 액션
    secondaryActions.innerHTML = "";
    const others = ["sgsReset", "provision", "wakeup", "evidence"].filter((k) => !visible.has(k));
    others.forEach((k) => {
      const lock = getLockReason(sc, k);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-quiet";
      btn.dataset.action = k;
      btn.disabled = Boolean(lock);
      btn.textContent = lock ? `${ACTIONS[k].label} (${lock})` : ACTIONS[k].label;
      secondaryActions.appendChild(btn);
    });
    moreActions.hidden = others.length === 0;

    csScriptText.textContent = sc.rootCauseVerdict.csAgentScript;
  }

  // 상세 기록: 식별자 전체 매핑
  function renderIdBridge(sc) {
    const v = sc.vehicle;
    inspectionWindowText.textContent =
      tzMode === "UTC"
        ? `분석 구간 (UTC): ${v.inspectionWindowUtc}`
        : `분석 구간: ${v.inspectionWindowKst} KST (${v.inspectionWindowUtc} UTC)`;

    idSummaryBadge.textContent = `${v.mnoCode} ${maskMsisdn(v.msisdn012)}`;

    idBridgeGrid.innerHTML = `
      <div class="id-cell">
        <div class="id-label"><span>차대번호 (VIN)</span><span>${sc.oemName}</span></div>
        <div class="id-value">${maskVin(v.vin, isL1)}</div>
        <div class="id-sub">${v.model}, 출고 ${v.deliveryDate}</div>
      </div>
      <div class="id-cell">
        <div class="id-label"><span>담당 통신사와 망</span><span>자동 라우팅</span></div>
        <div class="id-value is-text"><span class="mno-badge">${v.mnoCode}</span><span class="id-mno-label">${v.mnoLabel}</span></div>
        <div class="id-sub">RAT: ${v.ratType}</div>
      </div>
      <div class="id-cell">
        <div class="id-label"><span>사물통신 착신번호 (012)</span><span>MNO B2B 키</span></div>
        <div class="id-value">${maskMsisdn(v.msisdn012)}</div>
        <div class="id-sub">IMSI: <span class="${isL1 ? "blind-restricted" : ""}">${maskImsi(v.mnoImsi, isL1)}</span></div>
      </div>
      <div class="id-cell">
        <div class="id-label"><span>유심 ICCID와 eUICC EID</span><span>PDI 대장 자동 연동</span></div>
        <div class="id-value">${maskIccid(v.simIccid)}</div>
        <div class="id-sub">EID: <span class="${isL1 ? "blind-restricted" : ""}">${maskEuiccEid(v.euiccEid, isL1)}</span></div>
      </div>
      <div class="id-cell">
        <div class="id-label"><span>TCU 단말 IMEI</span><span>IMEI-USIM 매칭</span></div>
        <div class="id-value">${maskImei(v.tcuImei)}</div>
      </div>
      <div class="id-cell">
        <div class="id-label"><span>구독과 프로비저닝</span><span>계정 바인딩</span></div>
        <div class="id-value is-text">${stripLeadingEmojis(v.subscriptionLabel)}</div>
      </div>
      <div class="id-cell">
        <div class="id-label"><span>시동과 주행 상태</span><span>배터리 ${v.batteryVoltage}</span></div>
        <div class="id-value is-text${isMoving(sc) ? " is-critical" : ""}">${stripLeadingEmojis(v.ignitionLabel)}</div>
      </div>
      <div class="id-cell">
        <div class="id-label"><span>기지국 행정동 위치</span><span>위치정보법 준수</span></div>
        <div class="id-value is-text">${v.lastLocation}</div>
        <div class="id-sub">TX: ${v.requestId}</div>
      </div>
    `;
  }

  // 상세 기록: 시그널링 타임라인
  function renderTimeline(sc) {
    txIdLabel.textContent = sc.vehicle.requestId;
    timelineTableBody.innerHTML = "";
    sc.timeline.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = row.status === "RED" ? "is-red" : row.status === "AMBER" ? "is-amber" : "";
      tr.innerHTML = `
        <td class="ts-col">${formatTimestamp(row.kst, row.utc)}</td>
        <td>${row.hop}</td>
        <td>${row.system}</td>
        <td>${row.event}</td>
        <td class="code-col">${row.code}</td>
      `;
      timelineTableBody.appendChild(tr);
    });
  }

  function renderAll() {
    const sc = getCurrentScenario();
    renderScenarioTabs();
    renderCaseBar(sc);
    if (isDemoMode) renderLeadtimeBanner(sc);
    renderHopPipeline(sc);
    renderIdSummary(sc);
    renderVerdictBox(sc);
    renderEvidence(sc);
    renderTelemetryInfographics(sc);
    renderRecoveryControls(sc);
    renderIdBridge(sc);
    renderTimeline(sc);
  }

  function handleSearch() {
    const rawQ = universalSearchInput.value.trim();
    if (!rawQ) return;
    const q = rawQ.toUpperCase();
    const cleanQ = q.replace(/[-* ]/g, "");

    const foundIdx = scenarios.findIndex((sc) => {
      const v = sc.vehicle;
      const cleanVin = v.vin.toUpperCase().replace(/[-* ]/g, "");
      const clean012 = v.msisdn012.replace(/[-* ]/g, "");
      const cleanIccid = v.simIccid.toUpperCase().replace(/[-* ]/g, "");
      const cleanImsi = v.mnoImsi.toUpperCase().replace(/[-* ]/g, "");
      const cleanReq = v.requestId.toUpperCase().replace(/[-* ]/g, "");

      return (
        v.vin.toUpperCase().includes(q) ||
        cleanVin.includes(cleanQ) ||
        v.msisdn012.includes(q) ||
        clean012.includes(cleanQ) ||
        v.simIccid.toUpperCase().includes(q) ||
        cleanIccid.includes(cleanQ) ||
        v.mnoImsi.toUpperCase().includes(q) ||
        cleanImsi.includes(cleanQ) ||
        v.requestId.toUpperCase().includes(q) ||
        cleanReq.includes(cleanQ)
      );
    });

    if (foundIdx !== -1) {
      selectScenario(foundIdx, `통합 검색: '${rawQ}'`);
    } else {
      appendConsoleLog(`[검색 알림] '${rawQ}'와 일치하는 차량이 없습니다. VIN, 012 번호, ICCID, IMSI, 요청 ID로 다시 검색하세요.`, false);
      $("actionLogDetails").open = true;
    }
  }

  // Action 1: MNO 코어망 SGs/MME 세션 Soft Reset
  function runSgsReset() {
    const sc = getCurrentScenario();
    logAuditEvent("REMOTE_MME_SGS_RESET", { ticketId: sc.vehicle.requestId, status: "SUCCESS" });
    appendConsoleLog(`[SGs 세션 초기화] LG U+ 코어망 MME/HLR로 'Cancel Location & SGs Association Soft Reset' 호출 중...`, true);

    // 코어망 SGs 단절이 원인인 시나리오에서만 상태가 바뀐다
    if (sc.id !== "SCENARIO_A") {
      setTimeout(() => {
        appendConsoleLog(`[SGs 세션 초기화] 완료 — 이 건은 근본 원인이 코어망 SGs가 아니어서 상태 변화가 없습니다.`, false);
      }, 400);
      return;
    }

    setTimeout(() => {
      sc.hops[2].status = "GREEN";
      sc.hops[2].statusLabel = "배달 완료";
      sc.hops[2].summaryCode = "Submit_SM → Delivered";
      sc.hops[3].status = "GREEN";
      sc.hops[3].statusLabel = "SGs 정상 복구";
      sc.hops[3].summaryCode = "SGs OK · Paging 1회 응답";
      sc.hops[3].detailItems[2].value = "SGS_ASSOCIATED_OK (세션 재결합 완료)";
      sc.hops[3].detailItems[3].value = "기지국 Paging 송출 1건 → 단말 ACK 수신";
      sc.hops[4].status = "GREEN";
      sc.hops[4].statusLabel = "원격시동 성공";
      sc.hops[4].summaryCode = "TCU_CONN_ACK 완료";

      sc.rootCauseVerdict.severity = "RESOLVED";
      sc.rootCauseVerdict.faultDomain = "복구 완료 — LG U+ 코어망 SGs 세션 Soft Reset 및 원격시동 성공 (총 1.34초)";
      sc.rootCauseVerdict.illusionWarning =
        "기존 26시간 걸리던 4자(운영팀↔클라우드↔MNO↔단말연구소) 핑퐁 없이 원격 세션 리셋으로 즉시 해결되었습니다.";

      sc.timeline.push({
        kst: "07:45:20.110",
        utc: "22:45:20.110 Z",
        hop: "Hop 4",
        system: "OEM Dashboard → LG U+ MME",
        event: "운영자 원격 SGs/MME 세션 Soft Reset 실행 → SGs Association 즉시 재결합 및 기지국 Paging 송출 성공",
        code: "SGS_RESET_AND_PAGING_OK",
        status: "GREEN"
      });
      sc.timeline.push({
        kst: "07:45:21.450",
        utc: "22:45:21.450 Z",
        hop: "Hop 5",
        system: "차량 TCU → OEM 클라우드",
        event: "차량 모뎀 깨어남(Wake-up) 및 데이터 세션 연결 · 원격시동 완료",
        code: "TCU_CONN_ACK_200_OK",
        status: "GREEN"
      });

      getDoneSet(sc).add("sgsReset");
      expandedHops.clear();
      renderAll();
      appendConsoleLog(`[복구 완료] LG U+ MME SGs 세션 재결합 성공 — 차량 TCU로부터 'TCU_CONN_ACK' 수신 (원격시동 정상 작동).`, true);
    }, 400);
  }

  // Action 2: Wake-up SMS 재전송
  function runWakeupResend() {
    const sc = getCurrentScenario();
    logAuditEvent("WAKEUP_SMS_RESEND", { ticketId: sc.vehicle.requestId, status: "SUCCESS" });
    appendConsoleLog(
      `[Wake-up SMS 재전송] 착신번호 ${maskMsisdn(sc.vehicle.msisdn012)} 앞으로 SMS-C Spooling 큐 Flush 및 Wake-up SMS 재전송 완료.`,
      true
    );
    getDoneSet(sc).add("wakeup");
    renderRecoveryControls(sc);
  }

  // Action 3: 본사 프로비저닝 Safe Re-trigger
  function runProvisionRetrigger() {
    const sc = getCurrentScenario();
    logAuditEvent("SAFE_PROVISIONING_RETRIGGER", { ticketId: sc.vehicle.requestId, status: "SUCCESS" });
    appendConsoleLog(
      `[프로비저닝 재요청] 영문 증적 팩(${sc.evidencePack.evidence_pack_id}) 서명과 함께 본사 백엔드 'Safe Provisioning Re-trigger' 호출...`,
      true
    );

    // 본사 프로비저닝 고착이 원인인 시나리오에서만 상태가 바뀐다
    if (sc.id !== "SCENARIO_B") {
      setTimeout(() => {
        appendConsoleLog(`[프로비저닝 재요청] 완료 — 이 건은 근본 원인이 본사 프로비저닝이 아니어서 상태 변화가 없습니다.`, false);
      }, 400);
      return;
    }

    setTimeout(() => {
      sc.vehicle.subscriptionLabel = "Active (본사 DB Pending 해제 및 원격 패키지 활성화 완료)";
      sc.hops[1].status = "GREEN";
      sc.hops[1].statusLabel = "방화벽 허용 & DB Active";
      sc.hops[1].summaryCode = "HTTPS 200 OK · Active";
      sc.hops[2].status = "GREEN";
      sc.hops[2].statusLabel = "프로비저닝 완료";
      sc.hops[2].summaryCode = "SGP.32 Enabled · Sync OK";

      sc.rootCauseVerdict.severity = "RESOLVED";
      sc.rootCauseVerdict.faultDomain =
        "복구 완료 — 영문 L3 Technical Evidence 기반 본사 프로비저닝 Re-trigger 및 차량 활성화 성공";
      sc.rootCauseVerdict.illusionWarning =
        "기존 8일(192시간) 걸리던 암호 엑셀 VLOOKUP 및 유럽 본사 L3 반려 없이, 표준 증적 검증과 Safe Re-trigger로 즉시 해결되었습니다.";

      sc.timeline.push({
        kst: "17:06:10.000",
        utc: "08:06:10.000 Z",
        hop: "Hop 2",
        system: "OEM Dashboard → 유럽 본사 백엔드",
        event: "LG U+ 무결성 증적(TEP) 첨부 Safe Re-trigger 실행 → 본사 방화벽 세션 허용 및 DB Provisioning_Pending 해제",
        code: "HQ_PROVISIONING_ACTIVE_200_OK",
        status: "GREEN"
      });

      getDoneSet(sc).add("provision");
      expandedHops.clear();
      renderAll();
      appendConsoleLog(`[프로비저닝 활성화 완료] 차량 IVI 화면이 'Activation Pending'에서 '활성화 완료(Active)'로 전환되었습니다.`, true);
    }, 400);
  }

  // F3: Global L3 Technical Evidence Pack 모달
  function showEvidencePack() {
    const sc = getCurrentScenario();
    logAuditEvent("EVIDENCE_VIEW_ZERO_PII", { ticketId: sc.evidencePack.evidence_pack_id, status: "COMPLIANCE_OK" });

    modalEvidenceBanner.innerHTML = `
      <strong>Zero PII, LG U+ 코어망 시스템 전자 서명</strong><br/>
      차주 개인정보(이름, 전화번호, 정밀 좌표)를 모두 뺀 리포트입니다. 국외 이전 요건을 충족하고, 유럽 본사 L3가 인정하는 3GPP/GSMA 표준 코드만 담았습니다.
    `;
    evidenceJsonPre.textContent = JSON.stringify(sc.evidencePack, null, 2);
    openEvidenceModal();
    appendConsoleLog(`[증적 팩 생성] '${sc.evidencePack.evidence_pack_id}' 영문 표준 기술 증적 패키지(3GPP/GSMA, Zero PII) 생성 완료.`, true);
  }

  const ACTION_HANDLERS = {
    sgsReset: runSgsReset,
    provision: runProvisionRetrigger,
    wakeup: runWakeupResend,
    evidence: showEvidencePack
  };

  function handleActionClick(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn || btn.disabled) return;
    ACTION_HANDLERS[btn.dataset.action]();
  }

  primaryActions.addEventListener("click", handleActionClick);
  secondaryActions.addEventListener("click", handleActionClick);
  btnOpenEvidenceModal.addEventListener("click", showEvidencePack);

  // 클립보드 복사 공통 (HTTPS 아닌 환경 대비)
  function copyText(btn, text, idleLabel) {
    const showResult = (label) => {
      btn.textContent = label;
      setTimeout(() => {
        btn.textContent = idleLabel;
      }, 1500);
    };
    if (!navigator.clipboard) {
      showResult("복사 불가 (HTTPS 필요)");
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => showResult("복사 완료"))
      .catch(() => showResult("복사 실패"));
  }

  btnCopyCsScript.addEventListener("click", () => {
    copyText(btnCopyCsScript, getCurrentScenario().rootCauseVerdict.csAgentScript, "복사");
  });

  // 모달 접근성: 포커스 이동/복귀, ESC 닫기, Tab 포커스 트랩
  const modalWindow = evidenceModal.querySelector(".modal-window");
  let modalReturnFocusEl = null;

  function openEvidenceModal() {
    modalReturnFocusEl = document.activeElement;
    evidenceModal.classList.add("open");
    document.body.style.overflow = "hidden";
    modalWindow.focus();
  }

  function closeEvidenceModal() {
    if (!evidenceModal.classList.contains("open")) return;
    evidenceModal.classList.remove("open");
    document.body.style.overflow = "";
    if (modalReturnFocusEl && document.body.contains(modalReturnFocusEl)) modalReturnFocusEl.focus();
  }

  btnCloseModal.addEventListener("click", closeEvidenceModal);

  evidenceModal.addEventListener("click", (e) => {
    if (e.target === evidenceModal) closeEvidenceModal();
  });

  evidenceModal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeEvidenceModal();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = modalWindow.querySelectorAll("button, [tabindex='0']");
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === modalWindow)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  btnCopyEvidenceJson.addEventListener("click", () => {
    copyText(btnCopyEvidenceJson, JSON.stringify(getCurrentScenario().evidencePack, null, 2), "JSON 복사");
  });

  btnDownloadEvidenceJson.addEventListener("click", () => {
    const sc = getCurrentScenario();
    const blob = new Blob([JSON.stringify(sc.evidencePack, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // 원본 VIN을 파일명에 노출하지 않음 (식별자 마스킹 표준)
    a.download = `${sc.evidencePack.evidence_pack_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 증적 첨부 = 체크리스트의 '증적 전달' 단계 완료
  btnAttachServiceNow.addEventListener("click", () => {
    const sc = getCurrentScenario();
    logAuditEvent("ITSM_EVIDENCE_ATTACH", { ticketId: sc.vehicle.requestId, status: "SUCCESS" });
    appendConsoleLog(
      `[ITSM 연동] 글로벌 ServiceNow / 사내 Jira 티켓(${sc.vehicle.requestId})에 영문 증적 팩(${sc.evidencePack.evidence_pack_id})을 첨부했습니다.`,
      true
    );
    getDoneSet(sc).add("evidence");
    closeEvidenceModal();
    renderRecoveryControls(sc);
  });

  btnSearch.addEventListener("click", handleSearch);
  universalSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSearch();
  });

  btnResetScenario.addEventListener("click", () => {
    scenarios = JSON.parse(JSON.stringify(ORIGINAL_SCENARIOS));
    doneActions = {};
    const sc = getCurrentScenario();
    expandedHops = new Set(sc.hops.filter((h) => h.status === "RED").map((h) => h.hopNumber));
    renderAll();
    appendConsoleLog(`[초기화] 시나리오 데이터를 장애 발생 시점 상태로 되돌렸습니다.`, false);
  });

  tzModeSelect.addEventListener("change", (e) => {
    tzMode = e.target.value;
    renderAll();
  });

  // 초기 실행
  const sessionUser = SESSION_USERS[roleMode];
  sessionUserBadge.textContent = `${sessionUser.label} ${sessionUser.id}`;
  sessionUserBadge.title = "역할은 로그인 권한으로 결정됩니다 (목업: URL ?role=l1 로 L1 뷰 확인)";
  document.body.classList.toggle("role-l1", isL1);
  leadtimeBanner.hidden = !isDemoMode;

  const firstScenario = getCurrentScenario();
  universalSearchInput.value = maskVin(firstScenario.vehicle.vin, isL1);
  expandedHops = new Set(firstScenario.hops.filter((h) => h.status === "RED").map((h) => h.hopNumber));
  renderAll();
  appendConsoleLog(`[LG U+ 관제 엔진 가동] Connected Car E2E 통합 구간 진단 대시보드가 준비되었습니다.`, true);
})();
