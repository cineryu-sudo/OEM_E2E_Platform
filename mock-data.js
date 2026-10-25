// OEM-MNO 통합 End-to-End 구간 진단 대시보드 Mock 데이터
// 기반 문서: docs/01-domain-stories/P2-e2e-troubleshooting-as-is.md, docs/06-e2e-dashboard-blueprint.md

window.DASHBOARD_SCENARIOS = [
  {
    id: "SCENARIO_A",
    badge: "국내 완성차 A사 · 시나리오 #A1~#A13",
    title: "겨울 출근길 원격시동 Timeout — MME SGs 세션 꼬임 (가짜 Absent Subscriber)",
    patternCode: "PATTERN_2",
    patternName: "패턴 ② : MNO 코어망 교환기(MME SGs 인터페이스) 페이징 누락",
    asIsLeadTime: "26시간 (4개 부서 핑퐁 + 커피 쿠폰 수동 발송)",
    toBeLeadTime: "5분 (단일 VIN 조회 → SGs 오류 자동 간파 → 원격 세션 Soft Reset)",
    oemType: "DOMESTIC",
    oemName: "A사 (국내 완성차)",
    vehicle: {
      vin: "KMHXX00XXXX000001",
      model: "2024년식 중형 SUV (ccNC)",
      deliveryDate: "2024-03-15",
      subscriptionStatus: "ACTIVE_FREE_5Y",
      subscriptionLabel: "5년 무료 활성 (계정-VIN 바인딩 정상)",
      ignitionState: "IGN_OFF",
      ignitionLabel: "정차 중 (IGN_OFF · 원격 복구 가능)",
      batteryVoltage: "12.4V (정상)",
      lastLocation: "서울 송파구 잠실동 (서빙 eNodeB #SP-104 정상 권역)",
      tcuImei: "358901104482910",
      euiccEid: "89049032001122334455667788000001",
      simIccid: "89820675240315000019",
      mnoImsi: "450061029384756",
      msisdn012: "012-1234-5678",
      mnoCode: "LGU",
      mnoLabel: "LG U+ (LTE B2B 도매 · 전용 APN)",
      ratType: "LTE (E-UTRAN)",
      requestId: "REQ-20261022-074012-A01",
      commandType: "RemoteStart & ClimateOn (원격시동·공조)",
      inspectionWindowKst: "2026-10-22 07:35:00 ~ 07:45:00",
      inspectionWindowUtc: "2026-10-21 22:35:00 ~ 22:45:00"
    },
    hops: [
      {
        hopNumber: 1,
        name: "스마트폰 앱 & 요청",
        actor: "고객 앱 / 콜센터 CRM",
        status: "GREEN",
        statusLabel: "정상 접수",
        summaryCode: "RCV_OK (3회 시도)",
        detailItems: [
          { label: "트랜잭션 ID", value: "REQ-20261022-074012-A01" },
          { label: "명령 유형", value: "RemoteStart (원격시동/히터)" },
          { label: "구독/바인딩", value: "5년 무료 Active / 본인 인증 정상" },
          { label: "클라이언트 재시도", value: "3분 내 3회 연속 요청 (#A1)" }
        ]
      },
      {
        hopNumber: 2,
        name: "OEM 클라우드 서버",
        actor: "A사 원격제어 GW (Kibana)",
        status: "GREEN",
        statusLabel: "정상 발송",
        summaryCode: "SMS_TRIG_SENT (지연 0.11s)",
        detailItems: [
          { label: "API GW 큐 지연", value: "113 ms (정상 < 1,000ms)" },
          { label: "Wake-up 트리거", value: "SMS_TRIG_SENT 발송 완료" },
          { label: "단말 응답 대기", value: "90초 대기 후 ERR_TIMEOUT_408" },
          { label: "클라우드팀 1차 의견", value: "\"SMS-C 접수 정상, 망/단말 확인 필요\" (#A5)" }
        ]
      },
      {
        hopNumber: 3,
        name: "SMS-C & eSIM RSP",
        actor: "LG U+ SMS-C 관문",
        status: "AMBER",
        statusLabel: "착시 주의 (Spooling)",
        summaryCode: "Submit_SM OK → Absent Sub",
        detailItems: [
          { label: "SMPP 접수 코드", value: "Submit_SM_Resp: 0 (ESME_ROK)" },
          { label: "SMS-C 배달 상태", value: "Absent Subscriber (Spooling 대기)" },
          { label: "eSIM 프로파일", value: "ENABLED (국내 LTE 012 회선)" },
          { label: "1차 회신 착시", value: "단말 무응답으로 보이나 Hop 4 교차검증 필수 (#A8)" }
        ]
      },
      {
        hopNumber: 4,
        name: "MNO 코어망 (MME/SGs/APN)",
        actor: "LG U+ MME · eNodeB · PGW",
        status: "RED",
        statusLabel: "근본 원인 (SGs 꼬임)",
        summaryCode: "SGs Error · 기지국 Paging 0건",
        detailItems: [
          { label: "HLR/HSS 회선 상태", value: "ACTIVE (과금/개통 정상)" },
          { label: "MME 망 등록 상태", value: "EMM_REGISTERED (LTE Idle 정상)" },
          { label: "SGs 인터페이스", value: "SGS_ASSOCIATION_BROKEN (새벽 패치 세션 꼬임)" },
          { label: "기지국(eNodeB) Paging", value: "RF Paging 송출 0건 (신호 증발 #A10, #A12)" }
        ]
      },
      {
        hopNumber: 5,
        name: "차량 TCU & 배터리",
        actor: "차량 TCU 모뎀 (Idle)",
        status: "GREEN",
        statusLabel: "단말 정상 대기",
        summaryCode: "LTE Idle · 전압 12.4V",
        detailItems: [
          { label: "TCU 모뎀 전원 상태", value: "Normal Sleep (LTE Paging 수신 대기 중)" },
          { label: "보조배터리 전압", value: "12.4V (Deep Sleep 진입 안 함)" },
          { label: "기지국 수신 감도", value: "RSRP -84 dBm (송파구 지상 · 음영 아님)" },
          { label: "단말 수신 Paging", value: "0건 (기지국이 깨우지 않아 미응답)" }
        ]
      }
    ],
    rootCauseVerdict: {
      severity: "CRITICAL",
      faultDomain: "Hop 4 — MNO 코어망 LTE 교환기(MME) SGs 인터페이스 세션 꼬임",
      illusionWarning: "[1차 회신 착시 방지] SMS-C에 'Absent Subscriber(단말 무응답)'가 찍혔으나, MME는 'LTE Registered(Idle)' 상태이며 기지국(eNodeB) Paging 송출 횟수가 '0건'입니다. 차량 TCU 불량이나 지하주차장 음영지역이 아닙니다!",
      technicalExplanation: "새벽 MNO LTE 교환기(MME) 정기 패치 중 SMS-C(MSC)와 MME를 잇는 SGs 인터페이스 연관(Association) 테이블이 꼬이면서, OEM 클라우드가 보낸 Wake-up SMS가 기지국 전파(Paging)로 변환되지 못하고 코어망 내부에서 증발했습니다 (#A12).",
      csAgentScript: "고객님, 차량 단말기나 앱 결함이 아니라 오늘 새벽 통신망 교환기 점검 중 해당 차량 회선의 호출 신호(Paging) 연결이 일시적으로 지연된 것으로 즉시 확인되었습니다. 정비소에 입고하실 필요가 전혀 없으며, 지금 바로 원격으로 통신 세션을 초기화해 드렸으니 1분 뒤 다시 원격시동을 걸어주시면 정상 작동합니다. 불편을 드려 죄송하며 보상 쿠폰을 발송해 드리겠습니다.",
      recommendedActions: [
        "Action 1: [MNO 코어망 SGs/MME 세션 Soft Reset]을 실행하여 차량 모뎀의 Location Update 및 SGs 재결합을 즉시 유도하세요.",
        "Action 2: 세션 리셋 직후 [Wake-up SMS 즉시 재전송]을 눌러 차량 TCU 데이터 세션(TCU_CONN_ACK)이 올라오는지 확인하세요.",
        "F3: MNO 코어망 L3팀에 근본 패치 재발 방지를 위한 [표준 시그널링 증적 리포트]를 자동 전달하세요."
      ]
    },
    timeline: [
      { kst: "07:40:12.104", utc: "22:40:12.104 Z", hop: "Hop 1", system: "고객 스마트폰 앱", event: "RemoteStart 명령 전송 (Request ID: REQ-20261022-074012-A01)", code: "RCV_OK", status: "GREEN" },
      { kst: "07:40:12.217", utc: "22:40:12.217 Z", hop: "Hop 2", system: "A사 원격제어 클라우드 GW", event: "차량 슬립 깨우기용 MT-SMS 트리거 발송", code: "SMS_TRIG_SENT", status: "GREEN" },
      { kst: "07:40:12.405", utc: "22:40:12.405 Z", hop: "Hop 3", system: "LG U+ SMS-C 관문", event: "OEM SMPP 발송 요청 정상 접수 완료", code: "Submit_SM_Resp: 0 (OK)", status: "GREEN" },
      { kst: "07:40:12.812", utc: "22:40:12.812 Z", hop: "Hop 4", system: "LG U+ MME (송파 권역)", event: "SMS-C → MME SGs_Paging_Request 전달 시도했으나 SGs 세션 불일치로 드롭", code: "SGs_Association_Error", status: "RED" },
      { kst: "07:40:13.000", utc: "22:40:13.000 Z", hop: "Hop 4", system: "기지국 (eNodeB #SP-104)", event: "차량 단말 호출용 무선 RF Paging 송출 건수 0건", code: "RRC_Paging_Count: 0", status: "RED" },
      { kst: "07:40:16.500", utc: "22:40:16.500 Z", hop: "Hop 3", system: "LG U+ SMS-C 큐", event: "MME 응답 없음으로 단말 무응답(Absent Subscriber) 분류 후 Spooling 대기", code: "SM_Delivery_Failure: Absent_Subscriber", status: "AMBER" },
      { kst: "07:41:42.217", utc: "22:41:42.217 Z", hop: "Hop 2", system: "A사 원격제어 클라우드 GW", event: "90초 내 차량 TCU_CONN_ACK 미수신으로 원격시동 최종 타임아웃", code: "ERR_TIMEOUT_408", status: "RED" },
      { kst: "07:41:45.000", utc: "22:41:45.000 Z", hop: "Hop 5", system: "차량 TCU 상태 프로브", event: "차량 모뎀 LTE Registered(Idle) 정상 대기 중 · 보조배터리 12.4V 확인", code: "EMM_REGISTERED_IDLE", status: "GREEN" }
    ],
    evidencePack: {
      evidence_pack_id: "TEP-20261022-KR-A00104",
      generated_at_utc: "2026-10-22T22:45:10Z",
      generated_at_kst: "2026-10-23T07:45:10+09:00",
      certifying_mno: "KR_MNO_LGUPLUS_CORE_SIGNALING_PROBE",
      digital_signature: "SHA256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      vehicle_identifiers: {
        vin: "KMHXX00XXXX000001",
        imei: "358901104482910",
        euicc_eid: "89049032001122334455667788000001",
        iccid: "89820675240315000019",
        imsi: "450061029384756",
        msisdn: "82-12-****-5678"
      },
      core_network_3gpp_signaling: {
        hlr_hss_subscription: "ACTIVE_NORMAL",
        eps_mm_state: "EMM_REGISTERED_IDLE",
        sgs_association_state: "SGS_DETACHED_MISMATCH_AFTER_MME_PATCH",
        enodeb_rf_paging_sent_count: 0,
        smsc_mt_status: "SPOOLING_FALSE_ABSENT_SUBSCRIBER",
        serving_plmn_id: "450-06",
        rat_type: "EUTRAN_LTE"
      },
      automated_root_cause_verdict: {
        fault_domain: "HOP4_MNO_CORE_MME_SGS_INTERFACE",
        vehicle_tcu_fault: false,
        oem_cloud_fault: false,
        recommended_action: "Execute MME SGs Location Cancel / Soft Session Reset and re-trigger MT Wake-up SMS."
      }
    }
  },
  {
    id: "SCENARIO_B",
    badge: "수입차 한국법인 B사 · 시나리오 #B1~#B13",
    title: "신차 출고/스토어 Activation Pending — 국제 SMS Hub 누락 & 본사 방화벽 TCP Reset",
    patternCode: "PATTERN_3_4",
    patternName: "패턴 ③+④ : 국제 SMS Hub 라우팅 누락 및 유럽 본사 방화벽 상향 패킷 Reject",
    asIsLeadTime: "8일 / 192시간 (암호 엑셀 VLOOKUP + 한글 메일 번역 L3 2회 반려 + 3자 동시 테스트)",
    toBeLeadTime: "당일 첫 턴 해결 (엑셀 불필요 → 국내 MNO 무결성 자동 입증 → 영문 L3 Evidence Pack 원클릭 첨부)",
    oemType: "IMPORT",
    oemName: "B사 (유럽계 수입차 한국법인)",
    vehicle: {
      vin: "WBAXX00XXXX000002",
      model: "2026년식 수입 프리미엄 세단",
      deliveryDate: "2026-10-15 (평택항 PDI 통과 후 전시장 인도)",
      subscriptionStatus: "PROVISIONING_PENDING",
      subscriptionLabel: "Activation Pending 고착 (원격 패키지 스토어 결제 완료)",
      ignitionState: "IGN_OFF",
      ignitionLabel: "전시장 정차 중 (IGN_OFF · 원격 복구 가능)",
      batteryVoltage: "12.8V (정상)",
      lastLocation: "서울 강남구 신사동 (기지국 셀 정상 권역)",
      tcuImei: "358901109988776",
      euiccEid: "89049032001122334455667788990011",
      simIccid: "89820675123456789012",
      mnoImsi: "450061234567890",
      msisdn012: "012-9876-5432",
      mnoCode: "LGU",
      mnoLabel: "LG U+ (로컬 eSIM SGP.32 · 본사 전용 APN)",
      ratType: "LTE / 5G NSA",
      requestId: "PROV-EU-KR-20261015-9912",
      commandType: "Initial Vehicle Activation & Remote Package Provisioning",
      inspectionWindowKst: "2026-10-16 16:30:00 ~ 17:00:00",
      inspectionWindowUtc: "2026-10-16 07:30:00 ~ 08:00:00"
    },
    hops: [
      {
        hopNumber: 1,
        name: "앱 & 차량 IVI 요청",
        actor: "고객 My App / 전시장 딜러",
        status: "GREEN",
        statusLabel: "QR 연동 접수",
        summaryCode: "QR_PAIRING_REQ",
        detailItems: [
          { label: "요청 채널", value: "전시장 인도장 차량 IVI QR 스캔 & 스토어 구매" },
          { label: "차량 화면 상태", value: "'활성화 대기 중(Activation Pending)' 무한 로딩 (#B1)" },
          { label: "딜러/고객 조치", value: "차량 재시동·앱 재설치 3회 실시했으나 동일 (#B1)" },
          { label: "한국법인 권한", value: "글로벌 포털 Read-only (Reset 버튼 없음 #B3)" }
        ]
      },
      {
        hopNumber: 2,
        name: "유럽 본사 클라우드 & 방화벽",
        actor: "독일 본사 백엔드 (L3)",
        status: "RED",
        statusLabel: "본사 방화벽 Reject",
        summaryCode: "Pending 고착 + TCP_RST",
        detailItems: [
          { label: "본사 마스터 DB", value: "Provisioning_Pending 플래그 고착 (PDI 타임아웃 잔재)" },
          { label: "본사 Wake-up 발송", value: "본사 서버는 'Sent to SMS Hub'로만 기록" },
          { label: "본사 전용 APN 방화벽", value: "차량 상향 HTTPS 패킷(14건)에 대해 TCP_RST_REJECT 반환 (#B12)" },
          { label: "기존 L3 반려 사유", value: "\"한국 MNO 3GPP/GSMA 기술 증적을 먼저 제출하라\" (2회 반려 #B9)" }
        ]
      },
      {
        hopNumber: 3,
        name: "글로벌 SMS Hub & 로컬 eSIM",
        actor: "국제 SMS Hub / 국내 SMS-C / RSP",
        status: "RED",
        statusLabel: "국제 SMS Hub 누락",
        summaryCode: "해외발 SMS 인입 0건",
        detailItems: [
          { label: "로컬 eSIM (GSMA SGP.32)", value: "ENABLED (평택항 PDI 로컬 프로파일 활성화 완료)" },
          { label: "국제 SMS 중계망", value: "유럽 본사發 MT-SMS 국내 MNO 관문 인입 0건 (#B12)" },
          { label: "국내 SMS-C 상태", value: "정상 대기 중 (본사로부터 수신된 SMPP 패킷 없음)" },
          { label: "PDI 대장 매핑", value: "암호 엑셀 VLOOKUP 없이 VIN↔ICCID↔012 자동 검증됨" }
        ]
      },
      {
        hopNumber: 4,
        name: "국내 MNO 코어망 & 전용 APN",
        actor: "국내 MNO MME · Private PGW",
        status: "GREEN",
        statusLabel: "국내 망 100% 정상",
        summaryCode: "LTE Attached · APN Active",
        detailItems: [
          { label: "HLR/HSS 가입 상태", value: "ACTIVE_NORMAL (012-9876-5432)" },
          { label: "MME 망 등록", value: "EMM_REGISTERED (강남구 신사동 기지국 정상 접속)" },
          { label: "본사 전용 APN", value: "PDP Context ACTIVE (할당 사설 IP: 10.142.88.21)" },
          { label: "상향 라우팅", value: "차량 발신 패킷을 유럽 본사 IP(195.XX.XX.104)로 정상 전달" }
        ]
      },
      {
        hopNumber: 5,
        name: "차량 TCU & eUICC",
        actor: "차량 TCU · 로컬 eSIM",
        status: "GREEN",
        statusLabel: "상향 패킷 정상 송신",
        summaryCode: "Uplink HTTPS 14건 송신",
        detailItems: [
          { label: "eUICC 활성 프로파일", value: "국내 MNO 로컬 프로파일 (ICCID: ...9012)" },
          { label: "단말 데이터 세션", value: "전용 APN 터널 수립 완료 (UE IP: 10.142.88.21)" },
          { label: "상향 개통 요청", value: "차량 시동 시 본사 서버로 HTTPS 개통 요청 14회 정상 발신" },
          { label: "실패 원인", value: "본사 서버가 TCP Reset으로 연결을 끊어 Pending 멈춤" }
        ]
      }
    ],
    rootCauseVerdict: {
      severity: "CRITICAL",
      faultDomain: "Hop 2 (유럽 본사 방화벽 TCP_RST_REJECT) & Hop 3 (국제 SMS Hub 라우팅 누락)",
      illusionWarning: "[유럽 본사 L3 반려 원천 차단] 국내 MNO 코어망(eSIM Enabled, LTE Attached, 전용 APN PDP Active, 상향 패킷 전달)은 100% 정상임이 3GPP/GSMA 표준 코드로 입증되었습니다. 더 이상 한글 이메일 캡처 번역으로 반려당할 필요가 없습니다!",
      technicalExplanation: "평택항 PDI에서 로컬 eSIM 전환 직후 본사 백엔드와의 초기 프로비저닝 트랜잭션이 타임아웃되면서 본사 DB가 'Provisioning_Pending' 상태로 꼬였습니다. 이로 인해 ① 차량이 전용 APN으로 올리는 상향 HTTPS 요청을 본사 방화벽이 '비인가 세션(TCP_RST_REJECT)'으로 쳐내고 있으며, ② 본사가 보냈다는 Wake-up SMS도 유럽 측 국제 SMS 중계망(SMS Hub) 라우팅 누락으로 한국 MNO 관문에 0건 인입되었습니다 (#B12).",
      csAgentScript: "딜러 지점장님 및 고객님, 국내 이동통신망과 차량 내 eSIM 개통 상태는 100% 정상으로 확인되었습니다. 평택항 출고 과정에서 유럽 본사 클라우드 서버의 보안 방화벽 세션이 일시 잠긴 건으로, 본사 기술팀이 즉시 승인할 수 있는 공식 영문 네트워크 증적 리포트(Technical Evidence Pack)를 자동 발행해 본사 프로비저닝 강제 리셋(Re-trigger)을 요청했습니다.",
      recommendedActions: [
        "F3: [Global L3 Technical Evidence Pack (영문 PDF/JSON)]을 원클릭 생성하여 유럽 본사 ServiceNow L3 티켓(INC0098123)에 즉시 첨부하세요 (본사 L3 1차 반려 완전 방지).",
        "Action 3: 한국법인 위임 권한으로 [본사 프로비저닝 Safe Re-trigger & DB Pending 초기화 요청]을 실행하세요."
      ]
    },
    timeline: [
      { kst: "16:31:05.010", utc: "07:31:05.010 Z", hop: "Hop 1", system: "전시장 차량 IVI & My App", event: "신차 인도 QR 페어링 및 원격 패키지 활성화 요청", code: "ACTIVATE_REQ", status: "GREEN" },
      { kst: "16:31:05.450", utc: "07:31:05.450 Z", hop: "Hop 4", system: "국내 MNO MME / Private PGW", event: "로컬 eSIM(SGP.32) LTE Attach 및 본사 전용 APN PDP Context 수립 정상", code: "PDP_CONTEXT_ACTIVE (10.142.88.21)", status: "GREEN" },
      { kst: "16:31:06.120", utc: "07:31:06.120 Z", hop: "Hop 5", system: "차량 TCU 모뎀", event: "전용 APN 터널을 통해 유럽 본사 서버(195.XX.XX.104:443)로 상향 HTTPS 개통 패킷 14건 송신", code: "UPLINK_HTTPS_SYN (14 pkts)", status: "GREEN" },
      { kst: "16:31:06.380", utc: "07:31:06.380 Z", hop: "Hop 2", system: "유럽 본사 전용 APN 방화벽", event: "본사 DB 'Provisioning_Pending' 상태 꼬임으로 차량 상향 패킷을 강제 거부", code: "TCP_RST_REJECT (HTTP 403)", status: "RED" },
      { kst: "16:35:00.000", utc: "07:35:00.000 Z", hop: "Hop 2", system: "유럽 본사 백엔드 서버", event: "본사 서버가 차량 재호출용 MT Wake-up SMS 발송 시도 (본사 내부 로그)", code: "HQ_WAKEUP_SMS_DISPATCHED", status: "AMBER" },
      { kst: "16:35:05.000", utc: "07:35:05.000 Z", hop: "Hop 3", system: "국제 SMS Hub → 국내 MNO SMS-C", event: "유럽 국제 SMS 중계망 라우팅 누락으로 국내 MNO 관문 교환기 인입 건수 0건 확인", code: "INTL_HUB_INBOUND_COUNT: 0", status: "RED" }
    ],
    evidencePack: {
      evidence_pack_id: "TEP-20261016-KR-B00912",
      generated_at_utc: "2026-10-16T08:05:30Z",
      generated_at_kst: "2026-10-16T17:05:30+09:00",
      certifying_mno: "KR_MNO_CORE_AND_PRIVATE_PGW_CERTIFIED_PROBE",
      digital_signature: "SHA256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
      service_now_ticket_ref: "INC0098123 (HQ ConnectedDrive L3 Queue)",
      vehicle_identifiers: {
        vin: "WBAXX00XXXX000002",
        imei: "358901109988776",
        euicc_eid: "89049032001122334455667788990011",
        iccid: "89820675123456789012",
        imsi: "450061234567890",
        msisdn: "82-12-****-5432"
      },
      esim_rsp_evidence_gsma: {
        standard: "GSMA_SGP32_v1.0",
        local_profile_state: "ENABLED",
        pdi_activation_timestamp_utc: "2026-10-15T05:20:11Z"
      },
      core_network_3gpp_signaling: {
        hlr_hss_subscription: "ACTIVE_NORMAL",
        eps_mm_state: "EMM_REGISTERED_CONNECTED",
        sgs_association_state: "SGS_ASSOCIATED_OK",
        serving_plmn_id: "450-06",
        rat_type: "EUTRAN_LTE",
        private_apn_name: "telematics.oem-hq.global.mnc006.mcc450.gprs",
        pdp_context_status: "ACTIVE",
        allocated_ue_ip: "10.142.88.21"
      },
      cross_border_traffic_verification: {
        inspection_window_utc: "2026-10-16T07:30:00Z to 2026-10-16T08:00:00Z",
        intl_sms_hub_mt_sms_inbound_count: 0,
        smsc_mt_forward_sm_status: "NOT_RECEIVED_FROM_INTL_HUB",
        uplink_https_packets_from_tcu: 14,
        hq_destination_ip: "195.XX.XX.104:443",
        downlink_response_from_hq_firewall: "TCP_RST_REJECT (3GPP_PGW_FLOW_TRACE)"
      },
      automated_root_cause_verdict: {
        fault_domain: "HOP2_HQ_BACKEND_AND_HOP3_INTL_SMS_HUB",
        local_kr_mno_status: "VERIFIED_NORMAL_NO_FAULT",
        recommended_l3_action: "1. Hard-reset stuck Provisioning_Pending state in HQ Master DB for VIN WBAXX00XXXX000002. 2. Unblock UE IP 10.142.88.21 on HQ APN Firewall. 3. Verify International SMS Hub routing table to KR PLMN 450-06."
      }
    }
  },
  {
    id: "SCENARIO_C",
    badge: "국내 완성차 A사 · 패턴 ① (상담원 즉시 종결)",
    title: "지하 5층 주차장 음영지역 및 배터리 절전(Deep Sleep) — 망/서버 정상 확인",
    patternCode: "PATTERN_1",
    patternName: "패턴 ① : 차량 음영지역 주차 또는 보조배터리 보호 Deep Sleep",
    asIsLeadTime: "4시간 (콜센터 → 2차 운영팀 이관 → 통신사 조회 후 고객 역안내)",
    toBeLeadTime: "30초 (1차 콜센터 상담원이 즉시 확인 후 안내 종결 — 2차 이관 0건)",
    oemType: "DOMESTIC",
    oemName: "A사 (국내 완성차)",
    vehicle: {
      vin: "KMHXX00XXXX000003",
      model: "2025년식 대형 세단",
      deliveryDate: "2025-05-20",
      subscriptionStatus: "ACTIVE_FREE_5Y",
      subscriptionLabel: "5년 무료 활성",
      ignitionState: "IGN_OFF",
      ignitionLabel: "장기 주차 중 (96시간 경과 · Deep Sleep)",
      batteryVoltage: "11.5V (저전압 절전 진입)",
      lastLocation: "경기 성남시 분당구 정자동 (지하 심층 추정 · 전파 음영)",
      tcuImei: "358901107712345",
      euiccEid: "89049032001122334455667788000003",
      simIccid: "89820588250520000031",
      mnoImsi: "450081099887766",
      msisdn012: "012-5555-8888",
      mnoCode: "LGU",
      mnoLabel: "LG U+ (신차 LTE/5G IoT B2B 전용 회선)",
      ratType: "LTE (Detached)",
      requestId: "REQ-20261023-081000-C03",
      commandType: "DoorUnlock (원격 문열림)",
      inspectionWindowKst: "2026-10-23 08:05:00 ~ 08:15:00",
      inspectionWindowUtc: "2026-10-22 23:05:00 ~ 23:15:00"
    },
    hops: [
      {
        hopNumber: 1,
        name: "스마트폰 앱 & 요청",
        actor: "고객 스마트폰 앱",
        status: "GREEN",
        statusLabel: "정상 접수",
        summaryCode: "RCV_OK",
        detailItems: [
          { label: "트랜잭션 ID", value: "REQ-20261023-081000-C03" },
          { label: "명령 유형", value: "DoorUnlock (원격 도어 잠금 해제)" },
          { label: "구독 상태", value: "5년 무료 활성 정상" }
        ]
      },
      {
        hopNumber: 2,
        name: "OEM 클라우드 서버",
        actor: "A사 원격제어 GW",
        status: "GREEN",
        statusLabel: "정상 발송",
        summaryCode: "SMS_TRIG_SENT",
        detailItems: [
          { label: "큐 처리 지연", value: "95 ms" },
          { label: "Wake-up 발송", value: "LG U+ SMS-C로 정상 전송" }
        ]
      },
      {
        hopNumber: 3,
        name: "SMS-C & eSIM RSP",
        actor: "LG U+ SMS-C",
        status: "AMBER",
        statusLabel: "단말 무응답 대기",
        summaryCode: "Submit_SM OK → Spooling",
        detailItems: [
          { label: "SMPP 접수", value: "Submit_SM_Resp: 0 (OK)" },
          { label: "배달 상태", value: "Absent Subscriber (실제 단말 전원/전파 차단)" }
        ]
      },
      {
        hopNumber: 4,
        name: "MNO 코어망 (MME/SGs/APN)",
        actor: "LG U+ MME · 기지국",
        status: "GREEN",
        statusLabel: "기지국 Paging 정상 송출",
        summaryCode: "SGs OK · Paging 3회 송출",
        detailItems: [
          { label: "SGs 인터페이스", value: "SGS_ASSOCIATED_OK (정상)" },
          { label: "기지국 Paging 송출", value: "분당구 권역 eNodeB Paging 3회 정상 송출 완료" },
          { label: "MME 단말 상태", value: "Implicitly Detached (96시간 무응답)" }
        ]
      },
      {
        hopNumber: 5,
        name: "차량 TCU & 배터리",
        actor: "차량 TCU 모뎀",
        status: "RED",
        statusLabel: "배터리 절전 / 음영지역",
        summaryCode: "11.5V Deep Sleep · 무응답",
        detailItems: [
          { label: "마지막 배터리 전압", value: "11.5V (기준 11.8V 미만으로 모뎀 전원 차단)" },
          { label: "장기 주차 시간", value: "96시간 연속 미시동 (배터리 보호 Deep Sleep 진입)" },
          { label: "마지막 기지국 RSRP", value: "-118 dBm (지하주차장 심층 음영 진입 기록)" }
        ]
      }
    ],
    rootCauseVerdict: {
      severity: "INFO",
      faultDomain: "Hop 5 — 차량 장기 주차(96시간)로 인한 보조배터리 보호 절전(Deep Sleep) 및 지하 음영지역",
      illusionWarning: "[LG U+ 망 및 서버 정상 확인 완료] 시나리오 A와 달리 LG U+ 기지국(Hop 4)에서 무선 Paging 신호를 3회 정상 송출했으나, 차량 TCU가 96시간 미시동(전압 11.5V)으로 방전 방지 Deep Sleep 모드에 들어가 모뎀 전원을 스스로 차단한 정상 보호 동작입니다.",
      technicalExplanation: "차량 보조배터리 전압이 11.5V로 떨어져 방전을 막기 위해 TCU 모뎀 전원이 차단(Deep Sleep)되었으며, 마지막 수신 감도(-118 dBm) 기준 지하 심층 주차장에 위치해 있습니다.",
      csAgentScript: "고객님, LG U+ 통신망과 서버에서는 차량 호출 신호를 정상적으로 보냈으나, 현재 차량이 4일(96시간) 이상 시동이 걸리지 않아 배터리 방전을 막기 위한 '절전 보호 모드(Deep Sleep)'에 진입해 있거나 지하 깊은 주차장에 위치한 것으로 확인됩니다. 스마트키로 문을 열고 한 번 직접 시동을 걸어주시면 원격제어가 즉시 정상 복구됩니다.",
      recommendedActions: [
        "1차 콜센터 상담원 선에서 위 한글 안내 스크립트로 즉시 안내 종결하세요 (2차 운영팀 및 LG U+ 장애데스크 이관 불필요)."
      ]
    },
    timeline: [
      { kst: "08:10:00.110", utc: "23:10:00.110 Z", hop: "Hop 1", system: "고객 스마트폰 앱", event: "DoorUnlock 명령 요청 접수", code: "RCV_OK", status: "GREEN" },
      { kst: "08:10:00.205", utc: "23:10:00.205 Z", hop: "Hop 2", system: "A사 원격제어 클라우드", event: "LG U+ SMS-C로 Wake-up SMS 발송", code: "SMS_TRIG_SENT", status: "GREEN" },
      { kst: "08:10:00.610", utc: "23:10:00.610 Z", hop: "Hop 4", system: "LG U+ MME & 기지국(분당)", event: "SGs 정상 · 마지막 접속 기지국 권역으로 RF Paging 3회 정상 송출", code: "RRC_Paging_Sent: 3 tries", status: "GREEN" },
      { kst: "08:10:05.000", utc: "23:10:05.000 Z", hop: "Hop 5", system: "차량 TCU (Deep Sleep)", event: "96시간 주차 · 배터리 11.5V 절전 모드로 모뎀 전원 OFF 상태 (Paging 미수신)", code: "TCU_DEEP_SLEEP_POWER_OFF", status: "RED" }
    ],
    evidencePack: {
      evidence_pack_id: "TEP-20261023-KR-C00301",
      generated_at_utc: "2026-10-22T23:12:00Z",
      generated_at_kst: "2026-10-23T08:12:00+09:00",
      certifying_mno: "KR_MNO_LGUPLUS_CORE_SIGNALING_PROBE",
      digital_signature: "SHA256:7c4a8d09ca3762af61e59520943dc26494f8941b000011112222333344445555",
      vehicle_identifiers: {
        vin: "KMHXX00XXXX000003",
        imei: "358901107712345",
        euicc_eid: "89049032001122334455667788000003",
        iccid: "89820588250520000031",
        imsi: "450081099887766",
        msisdn: "82-12-****-8888"
      },
      core_network_3gpp_signaling: {
        hlr_hss_subscription: "ACTIVE_NORMAL",
        eps_mm_state: "IMPLICITLY_DETACHED_96H",
        sgs_association_state: "SGS_ASSOCIATED_OK",
        enodeb_rf_paging_sent_count: 3,
        last_battery_voltage: "11.5V (DEEP_SLEEP_THRESHOLD_11.8V)",
        last_rsrp_dbm: -118
      },
      automated_root_cause_verdict: {
        fault_domain: "HOP5_VEHICLE_DEEP_SLEEP_OR_BASEMENT_SHADOW",
        mno_network_fault: false,
        oem_cloud_fault: false,
        recommended_action: "Advise customer to start vehicle engine manually (IGN_ON) to exit Deep Sleep mode."
      }
    }
  },
  {
    id: "SCENARIO_D",
    badge: "초기 LTE 세단 · 패턴 ⑤ (주행 중 안전 가드레일 시연)",
    title: "초기 LTE Cat.3 TCU 단말 노후화 — 강원 산간 외곽 기지국 RSRP 저하 & 주행 중(IGN_ON) 리셋 차단",
    patternCode: "PATTERN_5",
    patternName: "패턴 ⑤ : 초기 LTE 단말 노후 및 약전계 권역 품질 저하",
    asIsLeadTime: "원인 미상 반복 클레임 (LG U+ 포털 수기 조회 후 단말 RF 수신 감도 저하 뒤늦게 인지)",
    toBeLeadTime: "즉시 인지 (약전계 노후 단말 자동 배지 + 주행 중 원격 리셋 안전 차단 작동)",
    oemType: "DOMESTIC",
    oemName: "A사 (국내 완성차)",
    vehicle: {
      vin: "KMHXX00XXXX000005",
      model: "2015년식 구형 세단 (초기 LTE Cat.3 TCU)",
      deliveryDate: "2015-09-10",
      subscriptionStatus: "ACTIVE_PAID_MONTHLY",
      subscriptionLabel: "유료 월정액 구독 중 (월 9,900원)",
      ignitionState: "IGN_ON_MOVING",
      ignitionLabel: "주행 중 (IGN_ON · 시속 72km/h — 원격 리셋 자동 잠금)",
      batteryVoltage: "14.1V (발전기 충전 중)",
      lastLocation: "강원 평창군 대관령면 (LTE Band 5 외곽 기지국 셀 경계)",
      tcuImei: "352014091122334",
      euiccEid: "NONE_PHYSICAL_USIM",
      simIccid: "89820514091000000555",
      mnoImsi: "450061409100555",
      msisdn012: "012-2014-3333",
      mnoCode: "LGU",
      mnoLabel: "LG U+ (LTE B2B · 초기 Cat.3 규격)",
      ratType: "LTE (Cat.3 Band 5/1)",
      requestId: "REQ-20261023-091500-D05",
      commandType: "SendDestinationToNav (목적지 차량 전송)",
      inspectionWindowKst: "2026-10-23 09:10:00 ~ 09:20:00",
      inspectionWindowUtc: "2026-10-23 00:10:00 ~ 00:20:00"
    },
    hops: [
      {
        hopNumber: 1,
        name: "스마트폰 앱 & 요청",
        actor: "고객 앱 (목적지 전송)",
        status: "GREEN",
        statusLabel: "정상 접수",
        summaryCode: "POI_SEND_OK",
        detailItems: [
          { label: "명령 유형", value: "내비게이션 목적지 원격 전송" },
          { label: "구독 상태", value: "유료 월정액 (장기 가입자)" }
        ]
      },
      {
        hopNumber: 2,
        name: "OEM 클라우드 서버",
        actor: "A사 원격제어 GW",
        status: "GREEN",
        statusLabel: "정상 발송",
        summaryCode: "SMS_TRIG_SENT",
        detailItems: [
          { label: "프로토콜", value: "LTE Telematics Protocol v1.2" }
        ]
      },
      {
        hopNumber: 3,
        name: "SMS-C & USIM",
        actor: "LG U+ SMS-C",
        status: "AMBER",
        statusLabel: "재전송 지연",
        summaryCode: "LTE Paging Retry",
        detailItems: [
          { label: "SIM 유형", value: "LG U+ IoT 물리 USIM" }
        ]
      },
      {
        hopNumber: 4,
        name: "MNO 코어망 (MME)",
        actor: "LG U+ MME · eNodeB",
        status: "AMBER",
        statusLabel: "외곽 LTE 약전계",
        summaryCode: "RSRP -121 dBm",
        detailItems: [
          { label: "망 세대", value: "LG U+ LTE (Band 5 850MHz)" },
          { label: "기지국 상태", value: "강원 평창 외곽 eNodeB 셀 반경 경계 (약전계 구역)" }
        ]
      },
      {
        hopNumber: 5,
        name: "차량 TCU (초기 LTE)",
        actor: "1세대 LTE TCU (주행 중)",
        status: "RED",
        statusLabel: "안테나 노후 Flapping",
        summaryCode: "신호 감쇄 · 주행 중",
        detailItems: [
          { label: "주행 상태", value: "주행 중 (IGN_ON · 원격 세션 강제 리셋 금지)" },
          { label: "단말 특성", value: "10년 경과 안테나 케이블 노후로 인한 RF 감쇄" }
        ]
      }
    ],
    rootCauseVerdict: {
      severity: "WARNING",
      faultDomain: "Hop 4 & 5 — 2015년식 초기 LTE 전용 TCU 장착 차량의 외곽 산간 약전계 수신 감쇄",
      illusionWarning: "[안전 가드레일 작동 중] 현재 차량이 주행 중(IGN_ON)이므로 안전(eCall 등)을 위해 LG U+ 코어망 세션 Reset 버튼이 자동 잠금(Disabled) 처리되었습니다.",
      technicalExplanation: "2015년식 초기 LTE TCU 장착 차량으로, 산간 외곽 기지국 셀 경계 지역 주행 중 단말 외장 안테나 노후화로 인한 RF 패킷 손실이 발생하고 있습니다 (#A6, PP-09).",
      csAgentScript: "고객님, 현재 주행 중이신 강원 산간 외곽 도로의 LTE 기지국 신호가 일시 미약하여 목적지 전송이 지연되었습니다. 차량 주행이 끝나고 안전하게 정차하신 후 자동으로 목적지가 수신되오니 잠시만 기다려 주시기 바랍니다.",
      recommendedActions: [
        "차량 주행 종료(IGN_OFF) 후 자동 재수신 여부를 확인하고, 노후 단말 RF 안테나 점검 안내를 제공하세요."
      ]
    },
    timeline: [
      { kst: "09:15:02.000", utc: "00:15:02.000 Z", hop: "Hop 1", system: "고객 스마트폰 앱", event: "내비게이션 목적지 전송 요청", code: "POI_SEND_REQ", status: "GREEN" },
      { kst: "09:15:03.100", utc: "00:15:03.100 Z", hop: "Hop 4", system: "LG U+ MME (평창 권역)", event: "LTE Band 5 외곽 기지국 단말 응답 지연으로 패킷 재전송", code: "LTE_RRC_WEAK_SIGNAL", status: "AMBER" },
      { kst: "09:15:10.000", utc: "00:15:10.000 Z", hop: "Hop 5", system: "차량 LTE TCU (주행 중)", event: "차량 주행 중(IGN_ON) 감지 — 원격 세션 강제 Reset 가드레일 잠금 활성화", code: "SAFETY_LOCK_IGN_ON", status: "RED" }
    ],
    evidencePack: {
      evidence_pack_id: "TEP-20261023-KR-D00509",
      generated_at_utc: "2026-10-23T00:16:00Z",
      generated_at_kst: "2026-10-23T09:16:00+09:00",
      certifying_mno: "KR_MNO_LGUPLUS_CORE_SIGNALING_PROBE",
      digital_signature: "SHA256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      vehicle_identifiers: {
        vin: "KMHXX00XXXX000005",
        imei: "352014091122334",
        euicc_eid: "NONE_PHYSICAL_USIM",
        iccid: "89820514091000000555",
        imsi: "450061409100555",
        msisdn: "82-12-****-3333"
      },
      core_network_3gpp_signaling: {
        rat_type: "EUTRAN_LTE_CAT3",
        cell_coverage_state: "WEAK_SIGNAL_RURAL_CELL",
        vehicle_motion_state: "IGN_ON_MOVING_SAFETY_LOCKED"
      },
      automated_root_cause_verdict: {
        fault_domain: "HOP4_5_LEGACY_LTE_WEAK_COVERAGE",
        recommended_action: "Advise customer to check vehicle destination after parking (IGN_OFF)."
      }
    }
  }
];

// 진단 브리프 문구: 결론 한 문장 · 근거 3개 · 복구 단계 (시나리오 id 기준)
// evidence.tone: bad(끊김) | warn(착시·주의) | ok(정상)
// steps.action: sgsReset | wakeup | provision | evidence, l2Only: L1 상담원에게 숨김, after: 선행 단계
// brokenAfterHop: 이 Hop 이후로 신호가 도달하지 못한 경우 노선도를 점선으로 표시
window.DASHBOARD_BRIEFS = {
  SCENARIO_A: {
    caseTitle: "원격시동 타임아웃",
    brokenAfterHop: 4,
    headline: "차량이 아니라 통신망에서 신호가 멈췄습니다",
    summary: "새벽 통신망 점검 뒤 LG U+ 코어망(MME)의 SGs 연결 정보가 꼬여, 차량을 깨우는 신호가 기지국까지 가지 못했습니다. 차량과 배터리는 정상입니다.",
    evidence: [
      { tone: "bad", text: "기지국이 차량을 한 번도 호출하지 않았습니다", sub: "eNodeB #SP-104, 07:40:13", code: "RRC_Paging_Count: 0" },
      { tone: "bad", text: "MME와 SMS 센터 사이 연결이 끊겨 있습니다", sub: "송파 권역 MME, 새벽 정기 패치 직후", code: "SGs_Association_Error" },
      { tone: "ok", text: "차량은 LTE에 정상 등록된 대기 상태입니다", sub: "배터리 12.4V, 수신감도 −84 dBm", code: "EMM_REGISTERED" }
    ],
    caution: "SMS 센터의 ‘Absent Subscriber’만 보고 단말 불량으로 판단하지 마세요. 코어망이 호출하지 않아 생긴 기록입니다.",
    steps: [
      { action: "sgsReset", title: "코어망 SGs 세션 초기화", desc: "차량 위치 재등록과 SGs 재결합을 유도합니다.", l2Only: true },
      { action: "wakeup", title: "Wake-up SMS 다시 보내기", desc: "초기화 뒤 차량 응답(TCU_CONN_ACK)을 확인합니다.", after: "sgsReset" },
      { action: "evidence", title: "코어망 L3팀에 증적 전달", desc: "재발 방지 요청용 영문 리포트", l2Only: true }
    ],
    resolved: {
      headline: "코어망 세션을 초기화해 원격시동이 복구되었습니다",
      summary: "SGs 연결이 다시 맺어지고 차량이 응답(TCU_CONN_ACK)했습니다. 전체 응답 시간은 1.34초입니다."
    }
  },
  SCENARIO_B: {
    caseTitle: "신차 개통 대기",
    headline: "국내 통신망은 정상이고, 유럽 본사 쪽에서 개통이 멈췄습니다",
    summary: "출고 과정에서 본사 DB가 ‘개통 대기’ 상태로 굳었고, 본사 방화벽이 차량의 개통 요청을 끊고 있습니다. 본사발 SMS도 국내 관문에 한 건도 들어오지 않았습니다.",
    evidence: [
      { tone: "bad", text: "본사 방화벽이 차량의 개통 요청 14건을 끊었습니다", sub: "본사 전용 APN 방화벽", code: "TCP_RST_REJECT" },
      { tone: "bad", text: "본사발 Wake-up SMS가 국내에 도착하지 않았습니다", sub: "국제 SMS Hub에서 LG U+ 관문 인입 0건", code: "MT-SMS 0" },
      { tone: "ok", text: "LG U+ 망과 차량 eSIM은 정상입니다", sub: "eSIM 활성, LTE 등록, 전용 APN 연결", code: "PDP_ACTIVE" }
    ],
    caution: "한글 메일이나 화면 캡처 대신 영문 증적 팩을 첨부해야 본사 L3 반려를 막을 수 있습니다.",
    steps: [
      { action: "provision", title: "본사 프로비저닝 다시 요청", desc: "증적 서명과 함께 본사 DB의 개통 대기 상태 해제를 요청합니다.", l2Only: true },
      { action: "evidence", title: "본사 L3에 영문 증적 첨부", desc: "3GPP/GSMA 표준 코드 기반 리포트", l2Only: true }
    ],
    resolved: {
      headline: "본사 개통 대기가 풀려 차량이 활성화되었습니다",
      summary: "본사 DB의 대기 상태가 해제되고 원격 패키지가 정상 활성화되었습니다."
    }
  },
  SCENARIO_C: {
    caseTitle: "원격 문열림 응답 없음",
    headline: "통신망은 정상이고, 차량이 배터리 보호를 위해 잠들어 있습니다",
    summary: "96시간 동안 시동을 걸지 않아 배터리가 11.5V로 떨어졌고, 방전을 막으려고 통신 모뎀이 꺼졌습니다. 차량은 지하 깊은 주차장에 있는 것으로 보입니다.",
    evidence: [
      { tone: "ok", text: "기지국은 차량을 3번 정상 호출했습니다", sub: "분당구 권역 eNodeB", code: "Paging 3회" },
      { tone: "bad", text: "배터리 전압이 절전 기준보다 낮습니다", sub: "11.5V, 절전 기준 11.8V", code: "DEEP_SLEEP" },
      { tone: "bad", text: "마지막 수신감도가 음영 수준입니다", sub: "−118 dBm, 지하 주차장 추정", code: "RSRP -118" }
    ],
    caution: "원격 조치로는 깨울 수 없습니다. 고객이 직접 시동을 걸면 바로 복구됩니다.",
    steps: [],
    note: "원격 복구가 필요 없습니다. 아래 안내 문구로 고객 응대를 마무리하세요."
  },
  SCENARIO_D: {
    caseTitle: "목적지 전송 지연",
    headline: "산간 지역을 주행 중이라 신호가 약해 전송이 늦어지고 있습니다",
    summary: "2015년식 초기 LTE 단말이 강원 산간 기지국 경계를 지나며, 노후 안테나 때문에 신호가 약해지고 있습니다. 차량이 달리는 중이라 원격 조치는 잠겨 있습니다.",
    evidence: [
      { tone: "bad", text: "수신감도가 약전계 수준입니다", sub: "평창 외곽 기지국 셀 경계", code: "RSRP -121" },
      { tone: "warn", text: "기지국이 호출을 4번 다시 보냈습니다", sub: "신호 감쇄로 재전송", code: "Paging Retry 4" },
      { tone: "bad", text: "차량이 주행 중입니다", sub: "안전을 위해 세션 초기화 금지", code: "IGN_ON" }
    ],
    caution: "주행 중에는 코어망 세션을 초기화하지 않습니다. 정차하면 자동으로 다시 받습니다.",
    steps: [],
    note: "주행 중이라 원격 조치가 잠겨 있습니다. 정차 후 자동으로 다시 받는다고 안내하세요."
  }
};
