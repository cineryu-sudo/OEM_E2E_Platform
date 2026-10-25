# OEM E2E Platform

커넥티드카 원격제어나 개통이 실패했을 때, **앱 → OEM 서버 → SMS-C → MNO 코어망 → 차량 TCU** 5개 구간 중 어디서 막혔는지 한 화면에서 진단하는 대시보드 목업입니다.

이 프로젝트가 줄이려는 시간은 다음과 같습니다.
- 국내 완성차: 장애 원인을 찾는 데 4개 조직 사이를 오가며 약 26시간
- 수입차 한국법인: 해외 본사까지 포함해 약 8일

목표는 VIN 하나로 조회해서 수 분 안에 원인과 복구 조치를 확인하는 것입니다.

## 화면 구성

- **왼쪽 신호 노선도**: 5개 구간 상태를 세로 노선으로 보여줍니다. 끊긴 구간은 빨간 ✕, 신호가 도달하지 못한 구간은 점선입니다.
- **1. 무슨 일이 있었나**: 원인을 쉬운 말 한 문장으로 먼저 보여줍니다.
- **2. 근거**: 판단 근거 3개와 1차 회신 착시 주의 문구를 보여줍니다.
- **3. 이렇게 복구합니다**: 순서가 있는 체크리스트입니다. 주행 중이거나 복구가 끝나면 조치가 잠깁니다.
- **상세 기록**: 식별자 매핑(VIN ↔ ICCID ↔ IMSI ↔ 012)과 3GPP/GSMA 시그널링 타임라인을 접어서 둡니다.
- **L3 증적 팩**: 개인정보를 뺀 영문 JSON 기술 증적입니다. 복사, 저장, ServiceNow/Jira 첨부를 할 수 있습니다.

## 웹앱 (web/)

`web/`은 같은 화면을 React + TypeScript + Vite로 옮긴 웹앱 버전입니다. 데이터는 목업이지만 실제 서비스처럼 동작합니다.

- **케이스별 주소:** `#/cases/SCENARIO_A` 형식이라 링크를 공유할 수 있고, 뒤로가기도 동작합니다.
- **가짜 API:** `web/src/api/mockApi.ts`가 지연과 로딩, 실행 중 상태, 오류 화면을 흉내 냅니다. 실제 백엔드가 생기면 이 파일만 fetch 호출로 바꾸면 됩니다.
- **알림:** 조치 결과는 토스트 알림으로 보여주고, 감사 로그는 작업 기록에 남습니다.
- **배포:** `main`에 push하면 GitHub Actions가 GitHub Pages로 자동 배포합니다. 주소는 https://cineryu-sudo.github.io/OEM_E2E_Platform/ 입니다.

```bash
cd web && npm install && npm run dev
```

## 정적 목업 실행

루트의 정적 목업은 빌드 없이 동작합니다.

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 엽니다. URL 옵션은 다음과 같습니다.

| 옵션 | 화면 |
| :--- | :--- |
| (없음) | L2 운영 실무자 |
| `?role=l1` | L1 콜센터 상담원. 기술 코드, 증적, 타임라인을 숨기고 IMSI/EID를 가립니다 |
| `?demo=1` | 기존 방식과 이 화면의 처리 시간(MTTR) 비교 배너 |

## 데모 시나리오

| 시나리오 | 상황 | 원인 구간 |
| :--- | :--- | :--- |
| A | 원격시동 타임아웃 | MNO 코어망 MME의 SGs 세션 꼬임 |
| B | 신차 개통 대기 | 유럽 본사 방화벽, 국제 SMS Hub |
| C | 원격 문열림 응답 없음 | 차량 배터리 절전과 지하 음영 (망 정상) |
| D | 목적지 전송 지연 | 산간 약전계와 노후 안테나 (주행 중이라 조치 잠김) |

## 파일 구조

```
web/               React + Vite 웹앱 (GitHub Pages 배포 대상)
.github/workflows/ Pages 자동 배포
index.html         화면 구조
styles.css         라이트 토큰과 레이아웃
app.js             렌더링, 검색, 복구 조치, 마스킹, 감사 로그
mock-data.js       시나리오 원천 데이터(DASHBOARD_SCENARIOS)와 화면 문구(DASHBOARD_BRIEFS)
fonts/             Pretendard, JetBrains Mono
redesign/          개선 시안 A(경로 뷰), B(트레이스 뷰), C(진단 브리프)
docs/              도메인 분석과 설계 문서
```

## 문서

| 문서 | 내용 |
| :--- | :--- |
| [00-fact-base](docs/00-fact-base.md) | 국내 OEM 커넥티드카 비즈니스 기초 사실 (MNO 관점) |
| [01-domain-stories](docs/01-domain-stories/) | 차량 생애주기(P1), 장애 원인 규명 핑퐁의 현재 모습(P2) |
| [02-glossary](docs/02-glossary.md) | 유비쿼터스 언어 사전 |
| [03-subdomains](docs/03-subdomains.md) | 서브도메인과 경계 후보 |
| [04-pain-points](docs/04-pain-points.md) | Pain Point 카탈로그 |
| [05-to-be-stories](docs/05-to-be-stories/) | 대시보드 도입 후 해결 스토리(P4) |
| [06-e2e-dashboard-blueprint](docs/06-e2e-dashboard-blueprint.md) | 대시보드 설계 블루프린트 |
| [07-market-research](docs/07-market-research-solution-cases.md) | 시장 조사와 유사 솔루션 사례 |
| [security-privacy-guide](docs/security-privacy-guide.md) | 개인정보보호와 정보보안 규격 |
| [uiux-design-guide](docs/uiux-design-guide.md) | UI/UX 디자인 가이드 v2.0.0 (현재 화면 기준) |
| [visual-refresh-proposal](docs/visual-refresh-proposal.md) | 이전 다크 테마 개편 제안 (참고용) |

## 참고

- 모든 데이터는 목업입니다. 실제 코어망, OEM 서버와는 연동하지 않습니다.
- 역할(L1/L2)은 실제 서비스에서는 로그인 세션 권한으로 정합니다. URL 옵션은 목업 확인용입니다.
