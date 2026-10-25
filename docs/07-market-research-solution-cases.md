# 07. 시장 조사 및 솔루션 케이스 3종 (Market Research & Solution Cases)

> **작성 기준일**: 2026-10 / **작성 기준**: 공개 웹 검색 결과(2026-10-26 수행), `06-e2e-dashboard-blueprint.md`, `05-to-be-stories/P4-e2e-diagnostic-dashboard-to-be.md`, 프로토타입 Mock 시나리오 `SCENARIO_A~D`
> **작성자**: Domain Storytelling Listener (시니어 소프트웨어 아키텍트 / DDD 전문가)
> **목적**: 국내외에서 공개된 커넥티드카·IoT 장애 진단 솔루션을 조사해 **OEM-MNO 통합 5-Hop E2E 진단 대시보드**와 겹치는 영역과 비어 있는 영역을 확인하고, 실행 가능한 **솔루션 케이스 3종**과 권장 순서를 제시합니다.
> **신뢰도 태그 규칙**: `[사실](URL)` 공개 출처 확인 / `[추정]` 근거는 있으나 직접 확인 못함 / `[미확인]` 공개 자료로 확인 못함 / `[설계]` 아키텍트 제안
> **조사 한계**: 짧은 웹 검색 기반의 1차 스캔입니다. 통신사·Cubic·Ericsson의 진단 포털은 로그인 뒤에 있어 실제 기능 깊이를 확인하지 못했고, 일부 출처는 벤더 마케팅 자료입니다. **워크숍 전에 원문 대조와 벤더 데모 확인을 권장합니다.**

---

## 1. 핵심 결론 (Executive Summary)

- 공개 자료에서 **앱 → OEM 클라우드 → SMS-C/eSIM → MNO 코어망 → 차량 TCU 5개 구간을 OEM과 통신사가 함께 보는 단일 진단 화면**은 찾지 못했습니다 `[미확인]`.
- 기존 솔루션은 각자 1~2개 구간만 봅니다. 통신사 SIM 관리 포털은 Hop 3~4, OEM 클라우드 도구는 Hop 1~2와 5를 봅니다 `[사실]`(§2 출처).
- 따라서 **구간 사이의 단절(식별자·타임존·증적 포맷·복구 권한)을 잇는 것**이 이 프로젝트의 차별점입니다 `[추론]`. 이는 `06` 문서 §1의 4대 구조적 단절과 같은 지점입니다.
- 권장 순서는 **Case 1(통신사 측 진단 포털) → Case 2(OEM-MNO 공동 5-Hop 플랫폼)**이고, 수입차 한국법인에는 **Case 3(API·AI 에이전트)**를 전달 채널로 씁니다 `[설계]`.

---

## 2. 시장 조사: 현재 존재하는 진단 솔루션

### 2.1 유형별 정리

| 유형 | 대표 사례 | 커버 Hop | 제공 기능 | 우리 문제 기준 한계 | 태그 |
|---|---|---|---|---|---|
| **통신사 IoT 회선 관리 포털 (CMP)** | Cisco IoT Control Center(Tele2 Advantage 패키지), Vodafone, Flolive, iotconnect | Hop 3~4 | SIM 상태, 지연·데이터 사용량·에러율을 차량군·지역별로 모니터링, 임계치 알림, 일부 상위 요금제에서 시그널링 로그·기지국 위치 | OEM 명령(`request_id`)과 차량 상태를 모름. "회선은 정상"까지만 말할 수 있음 | [사실](https://tele2iot.com/iot-cmp/) / [사실](https://flolive.net/blog/glossary/best-iot-connectivity-platforms-top-12-solutions-in-2025/) / 시그널링 로그: [사실](https://iotconnect.tech/industries/iot-connectivity-for-automotive-and-telematics/) — 벤더 자체 요금제 표기 |
| **OEM 클라우드 관측 도구** | AWS Connected Mobility Guidance, AWS IoT FleetWise 원격 명령 | Hop 1~2, 5 | 차량별 연결·끊김 사유 대시보드, 명령마다 실행 ID를 붙여 요청·응답 상관관계와 지연시간 계산, 명령 유형별 성공/실패 분류 | 통신사 망 내부(SMS-C, MME, SGs, 전용 APN)는 블랙박스 | [사실](https://docs.aws.amazon.com/guidance/latest/connected-mobility-on-aws/observability.html) / [사실](https://docs.aws.amazon.com/guidance/latest/connected-mobility-on-aws/rd-operations.html) / [사실](https://docs.aws.amazon.com/es_es/iot-fleetwise/latest/developerguide/remote-command-vehicles.html) |
| **글로벌 커넥티비티 사업자** | Cubic Telecom PACE, Ericsson Connected Vehicle Cloud | Hop 3~4 | 190개국 단일 커넥티비티 관리, 실시간 망 모니터링, SIM 재고 포털 | 진단 화면·트러블슈팅 절차가 공개되지 않음 | PACE: [사실](https://marketplace.microsoft.com/en-us/product/cubictelecom1588253457637.automotive_001?tab=overview) / CVC: [사실](https://evmagazine.com/electric-cars/ericsson-connected-vehicle-cloud-is-critical-for-smart-evs) / 진단 깊이: [미확인] |
| **표준 네트워크 API** | CAMARA Device Reachability Status, GSMA Open Gateway | Hop 4 | 단말이 지금 SMS·데이터·둘 다로 망에 연결돼 있는지 조회 | 자동차 OEM 상용 적용 사례를 찾지 못함. 성숙도 표기가 출처마다 다름(Incubating vs Stable) | [사실](https://camaraproject.org/device-reachability-status/) / [사실](https://www.gsma.com/solutions-and-impact/gsma-open-gateway/gsma-open-gateway-api-descriptions/) / OEM 적용: [미확인] |
| **eSIM 원격 프로파일 관리 (SGP.32)** | Rivian R2(G+D eIM + AT&T), Kigen 자동차용 eSIM | Hop 3 | 하드웨어 교체 없이 OEM이 통신사를 원격으로 추가·변경 | 프로비저닝 실패 지점이 하나 더 생김(시나리오 B의 `Activation Pending`과 같은 계열) | [사실](https://www.gi-de.com/en/about-us/press/press-releases/giesecke-devrient-rivian-and-att-collaborate-to-bring-sgp32-and-5g-connectivity-to-rivians-r2-vehicle) / [사실](https://www.automotiveworld.com/news/kigen-automotive-esim-first-to-gain-gsma-esa-certification/) |
| **AI 기반 근본 원인 분석 (RCA)** | GSMA 등 5개 기관 AI Telco Troubleshooting Challenge, B-Yond AGILITY, 통신사 Agentic AI 파일럿 | 통신사 내부 | 패킷 캡처(PCAP) 기반 장애 원인 판별, 24시간 관측·이상 탐지 | 통신사 망 안에서만 동작. 정확도 수치는 벤더 자체 발표 | [사실](https://www.gsma.com/newsroom/?p=25052) / [사실](https://www.rcrwireless.com/20260402/test-measurement/appledore-on-the-present-and-future-of-agentic-ai-deployment-in-telecom) / 정확도: [추정] — [벤더 자료](https://www.b-yond.com/agility) |

### 2.2 국내 동향

- LG U+ **U+커넥트**(2024-12 출시)는 IoT 단말 기반 차량 관제(운행 정보, 차량 자가 진단, 비용 관리) 솔루션으로, 장애 진단이 아니라 법인 차량 관리 제품입니다 [사실](https://lg.co.kr/media/release/28492).
- SKT·KT의 커넥티드카 관련 공개 기사는 대부분 2017~2021년 자료이며, 2026년 기준 OEM-MNO 공동 장애 진단 사례는 찾지 못했습니다 [사실](https://www.sateconomy.co.kr/news/view/179588821267266) / 2026년 사례: [미확인].

### 2.3 시사점

1. **실행 ID 기반 상관관계(AWS 패턴)**는 이미 검증된 방식입니다. 우리 `request_id`를 Hop 1~5 전 구간 이벤트에 그대로 전파하면 됩니다 `[설계]`.
2. **CAMARA Reachability**는 Hop 4 상태를 OEM에 노출하는 표준 통로가 될 수 있지만, "연결됨/안 됨"만 알려 줍니다. SGs 꼬임(시나리오 A)처럼 "연결은 됐는데 Paging이 안 나가는" 상태는 표준 API로 표현되지 않습니다 `[추론]`.
3. **SGP.32 확산**으로 eSIM 프로비저닝 장애(시나리오 B 계열)는 앞으로 늘어날 가능성이 큽니다 `[추정]`.

---

## 3. 솔루션 케이스 3종

### Case 1. 통신사 측 커넥티비티 진단 포털 (Hop 3~4)

| 항목 | 내용 |
|---|---|
| **개요** | LG U+가 기존 IoT 회선 관리 포털을 확장해, `VIN` 또는 `012` 번호 검색 한 번으로 HLR 가입 상태, MME 망 등록, SGs 세션, 기지국 Paging 횟수, SMS-C 전달 상태를 보여 줍니다. OEM에는 CAMARA Reachability 형태의 조회 API를 함께 제공합니다 `[설계]` |
| **장점** | LG U+가 이미 가진 데이터만 씁니다. OEM 시스템 연동과 신규 데이터 공유 계약이 필요 없습니다 |
| **한계** | OEM 클라우드, 수입차 본사 방화벽, 국제 SMS Hub를 볼 수 없습니다. "통신사 망은 정상"은 증명하지만, 망 밖의 장애 지점은 짚지 못합니다 |
| **예상 기간** | 3~6개월 `[추정]` |
| **`06` 로드맵 대응** | Phase 1(단일 MNO 코어망 가시화 & ID 브릿지)과 같은 범위 |

### Case 2. OEM-MNO 공동 5-Hop E2E 진단 플랫폼 (현재 프로토타입)

| 항목 | 내용 |
|---|---|
| **개요** | OEM이 원격 명령마다 `request_id`를 붙여 이벤트를 보냅니다(앱 접수, Wake-up SMS 발송, TCU 응답, 본사 HTTP 결과). LG U+는 이를 코어망 데이터와 합쳐 명령 1건당 하나의 타임라인을 만듭니다. 그 위에 안전 복구 액션(SGs Soft Reset, Wake-up 재전송, 프로비저닝 Re-trigger)과 본사 L3용 영문 증적 팩을 얹습니다 `[설계]` |
| **장점** | 시나리오 A~D를 모두 해결합니다. `06` 문서의 목표 효과(26시간 → 5분, 8일 → 당일)를 그대로 달성하는 유일한 안입니다 |
| **한계** | OEM별 API 연동, 데이터 공유 계약, 개인정보·위치정보 검토(`security-privacy-guide.md`)가 필요합니다. 판매에는 기준 고객이 될 OEM 1곳이 있어야 합니다 |
| **예상 기간** | 9~18개월 `[추정]` |
| **`06` 로드맵 대응** | Phase 2~3(OEM/본사 게이트웨이 통합, 다중 MNO 어댑터, 원격 복구 액션) |

### Case 3. API·AI 에이전트형 (신규 포털 없음)

| 항목 | 내용 |
|---|---|
| **개요** | 진단 기능을 API로 제공합니다(CAMARA Reachability + 자체 "E2E 트레이스" API). AI 에이전트가 판정 결과와 증적 팩을 OEM이 이미 쓰는 ServiceNow·CRM 티켓에 바로 첨부합니다. 실무자가 새 화면을 익힐 필요가 없습니다 `[설계]` |
| **장점** | 본사가 국내 포털을 도입하지 않는 수입차 한국법인(시나리오 B)에 맞습니다. 본사 L3는 티켓 첨부 증적은 받아들입니다(`P2` `#B8~#B10`). 여러 OEM으로 확장하기 쉽습니다 |
| **한계** | AI 판정의 정확도와 설명 가능성이 아직 검증되지 않았습니다. 세션 리셋 같은 복구는 여전히 사람이 승인해야 합니다. 밑바탕 데이터는 Case 1이 있어야 합니다 |
| **예상 기간** | Case 1 완료 후 3~6개월 파일럿 `[추정]` |

### 3.1 시나리오별 해결 범위

| 시나리오 (프로토타입) | Case 1 통신사 포털 | Case 2 공동 5-Hop 플랫폼 | Case 3 API·AI 에이전트 |
|---|---|---|---|
| **A** 원격시동 Timeout — MME SGs 세션 꼬임 | ● 원인 특정 + 세션 리셋 | ● | ◐ 판정·티켓 첨부 (리셋은 사람 승인) |
| **B** Activation Pending — 국제 SMS Hub 누락 + 본사 방화벽 TCP Reset | ○ 국내 망 정상만 증명 | ● | ● 본사 티켓에 영문 증적 직접 첨부 |
| **C** 지하주차장 음영 + 배터리 Deep Sleep | ◐ 망 정상 증명 (차량 상태는 모름) | ● | ◐ |
| **D** 노후 LTE 단말 + 산간 약전계 + 주행 중 | ◐ RSRP·재전송 확인 (주행 상태는 모름) | ● 주행 중 리셋 잠금 포함 | ◐ |

● 해결 / ◐ 일부 해결 / ○ 해결 못함

---

## 4. 권장안 (Recommendation)

**Case 1 → Case 2 순서로 진행하고, 수입차 한국법인에는 Case 3를 전달 채널로 씁니다** `[설계]`.

1. **Case 1을 먼저 합니다.** 파트너 없이 빠르게 출시할 수 있고, 나머지 두 안이 모두 필요로 하는 코어망 데이터 파이프라인을 만듭니다.
2. **처음부터 Case 2의 이벤트 형식을 씁니다.** 명령 1건당 `request_id` 하나로 묶는 타임라인 구조를 Case 1 단계부터 적용하면 나중에 다시 만들지 않아도 됩니다.
3. **파일럿을 나눕니다.** 국내 완성차(시나리오 A)로 Case 2를, 수입차 한국법인(시나리오 B)으로 Case 3를 시험합니다.

---

## 5. 후속 확인 질문 (Next Discovery Questions)

1. **[CAMARA 확장]**: Device Reachability Status가 표현하지 못하는 "연결됐지만 Paging 미송출"(SGs 꼬임) 상태를 LG U+ 자체 확장 API로 노출할 수 있는가? 망 정보 외부 노출에 대한 내부 정책 제약은 무엇인가?
2. **[OEM 이벤트 연동]**: 국내 완성차 A사가 원격 명령 이벤트(`request_id`, `SMS_TRIG_SENT`, `TCU_CONN_ACK`)를 실시간으로 넘겨줄 의향과 계약 형태(데이터 공유 범위·보관 기간)는 무엇인가?
3. **[벤더 포털 실사]**: Cisco IoT Control Center, Cubic PACE의 실제 진단 화면이 Hop 3~4를 어디까지 보여 주는지 데모로 확인해야 합니다. 이미 충분하다면 Case 1은 자체 개발 대신 기존 포털 확장으로 줄일 수 있습니다.
4. **[SGP.32 대비]**: 2026년 이후 수입차가 SGP.32 eIM으로 통신사를 원격 전환할 때, 프로파일 전환 실패를 Hop 3에서 어떤 상태 코드로 감지할 것인가?
5. **[AI 판정 책임]**: Case 3에서 AI가 낸 판정이 틀렸을 때 책임 소재와 사람 검토 절차는 어떻게 둘 것인가?
