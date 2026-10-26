// 가짜 API: 브라우저 메모리에 케이스를 두고 네트워크 지연을 흉내 낸다.
// 실제 백엔드가 생기면 이 파일의 함수 시그니처를 유지한 채 fetch 호출로 바꾸면 된다.
import { BRIEFS, SCENARIOS } from "../data/scenarios";
import type { ActionKey, CaseRecord, Scenario } from "../types";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let store: Scenario[] = clone(SCENARIOS);
let doneByCase: Record<string, ActionKey[]> = {};

function toRecord(sc: Scenario): CaseRecord {
  const brief = BRIEFS[sc.id] ?? {
    caseTitle: sc.title,
    headline: sc.rootCauseVerdict.faultDomain,
    summary: sc.rootCauseVerdict.technicalExplanation,
    evidence: [],
    steps: []
  };
  return clone({ scenario: sc, brief, done: doneByCase[sc.id] ?? [] });
}

function findOrThrow(id: string): Scenario {
  const sc = store.find((s) => s.id === id);
  if (!sc) throw new Error(`케이스 ${id}를 찾을 수 없습니다.`);
  return sc;
}

function markDone(id: string, action: ActionKey) {
  const list = doneByCase[id] ?? [];
  if (!list.includes(action)) doneByCase[id] = [...list, action];
}

export async function listCases(): Promise<CaseRecord[]> {
  await wait(250);
  return store.map(toRecord);
}

export async function getCase(id: string): Promise<CaseRecord> {
  await wait(350);
  return toRecord(findOrThrow(id));
}

const normalize = (s: string) => s.toUpperCase().replace(/[- ]/g, "");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * 검색어 → 식별자 일치 함수.
 * 마스킹된 값("KMHXX00******0001", "012-****-5678")은 별표 자리를 임의 문자로 보고 앞뒤가 모두 맞아야 일치.
 * 별표 개수는 실제 가려진 자릿수와 다를 수 있다 (L1/L2 마스킹 길이가 다름).
 */
function toMatcher(query: string): ((raw: string) => boolean) | null {
  const q = normalize(query.trim());
  if (!q.replace(/\*/g, "")) return null;
  if (!q.includes("*")) return (raw) => normalize(raw).includes(q);
  const re = new RegExp(`^${q.split(/\*+/).map(escapeRe).join(".+")}$`);
  return (raw) => re.test(normalize(raw));
}

/** VIN, 012, ICCID, IMSI, 요청 ID로 케이스 찾기 (하이픈·공백 무시, 마스킹된 값도 허용) */
export async function searchCase(query: string): Promise<string | null> {
  await wait(300);
  const match = toMatcher(query);
  if (!match) return null;
  const hit = store.find((sc) => {
    const v = sc.vehicle;
    return [v.vin, v.msisdn012, v.simIccid, v.mnoImsi, v.requestId].some(match);
  });
  return hit ? hit.id : null;
}

export interface ActionResult {
  record: CaseRecord;
  logs: { msg: string; strong: boolean }[];
}

/** 복구 조치 실행. 원인과 맞는 시나리오에서만 상태가 바뀐다. */
export async function runAction(id: string, action: Exclude<ActionKey, "evidence">): Promise<ActionResult> {
  const sc = findOrThrow(id);
  const logs: ActionResult["logs"] = [];

  if (action === "wakeup") {
    await wait(600);
    markDone(id, "wakeup");
    logs.push({ msg: `[Wake-up SMS 재전송] SMS-C Spooling 큐 Flush 및 Wake-up SMS 재전송 완료.`, strong: true });
    return { record: toRecord(sc), logs };
  }

  if (action === "sgsReset") {
    await wait(1200);
    if (sc.id !== "SCENARIO_A") {
      logs.push({ msg: `[SGs 세션 초기화] 완료 — 이 건은 근본 원인이 코어망 SGs가 아니어서 상태 변화가 없습니다.`, strong: false });
      return { record: toRecord(sc), logs };
    }
    sc.hops[2] = { ...sc.hops[2], status: "GREEN", statusLabel: "배달 완료", summaryCode: "Submit_SM → Delivered" };
    sc.hops[3].status = "GREEN";
    sc.hops[3].statusLabel = "SGs 정상 복구";
    sc.hops[3].summaryCode = "SGs OK · Paging 1회 응답";
    sc.hops[3].detailItems[2].value = "SGS_ASSOCIATED_OK (세션 재결합 완료)";
    sc.hops[3].detailItems[3].value = "기지국 Paging 송출 1건 → 단말 ACK 수신";
    sc.hops[4] = { ...sc.hops[4], status: "GREEN", statusLabel: "원격시동 성공", summaryCode: "TCU_CONN_ACK 완료" };
    sc.rootCauseVerdict.severity = "RESOLVED";
    sc.rootCauseVerdict.faultDomain = "복구 완료 — LG U+ 코어망 SGs 세션 Soft Reset 및 원격시동 성공 (총 1.34초)";
    sc.rootCauseVerdict.illusionWarning =
      "기존 26시간 걸리던 4자(운영팀↔클라우드↔MNO↔단말연구소) 핑퐁 없이 원격 세션 리셋으로 즉시 해결되었습니다.";
    sc.timeline.push(
      {
        kst: "07:45:20.110",
        utc: "22:45:20.110 Z",
        hop: "Hop 4",
        system: "OEM Dashboard → LG U+ MME",
        event: "운영자 원격 SGs/MME 세션 Soft Reset 실행 → SGs Association 즉시 재결합 및 기지국 Paging 송출 성공",
        code: "SGS_RESET_AND_PAGING_OK",
        status: "GREEN"
      },
      {
        kst: "07:45:21.450",
        utc: "22:45:21.450 Z",
        hop: "Hop 5",
        system: "차량 TCU → OEM 클라우드",
        event: "차량 모뎀 깨어남(Wake-up) 및 데이터 세션 연결 · 원격시동 완료",
        code: "TCU_CONN_ACK_200_OK",
        status: "GREEN"
      }
    );
    markDone(id, "sgsReset");
    logs.push({ msg: `[복구 완료] LG U+ MME SGs 세션 재결합 성공 — 차량 TCU로부터 'TCU_CONN_ACK' 수신 (원격시동 정상 작동).`, strong: true });
    return { record: toRecord(sc), logs };
  }

  // provision
  await wait(1200);
  if (sc.id !== "SCENARIO_B") {
    logs.push({ msg: `[프로비저닝 재요청] 완료 — 이 건은 근본 원인이 본사 프로비저닝이 아니어서 상태 변화가 없습니다.`, strong: false });
    return { record: toRecord(sc), logs };
  }
  sc.vehicle.subscriptionLabel = "Active (본사 DB Pending 해제 및 원격 패키지 활성화 완료)";
  sc.hops[1] = { ...sc.hops[1], status: "GREEN", statusLabel: "방화벽 허용 & DB Active", summaryCode: "HTTPS 200 OK · Active" };
  sc.hops[2] = { ...sc.hops[2], status: "GREEN", statusLabel: "프로비저닝 완료", summaryCode: "SGP.32 Enabled · Sync OK" };
  sc.rootCauseVerdict.severity = "RESOLVED";
  sc.rootCauseVerdict.faultDomain = "복구 완료 — 영문 L3 Technical Evidence 기반 본사 프로비저닝 Re-trigger 및 차량 활성화 성공";
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
  markDone(id, "provision");
  logs.push({ msg: `[프로비저닝 활성화 완료] 차량 IVI 화면이 'Activation Pending'에서 '활성화 완료(Active)'로 전환되었습니다.`, strong: true });
  return { record: toRecord(sc), logs };
}

/** 증적 팩을 ServiceNow / Jira에 첨부 = 체크리스트의 증적 단계 완료 */
export async function attachEvidence(id: string): Promise<ActionResult> {
  const sc = findOrThrow(id);
  await wait(700);
  markDone(id, "evidence");
  return {
    record: toRecord(sc),
    logs: [
      {
        msg: `[ITSM 연동] ServiceNow / Jira 티켓(${sc.vehicle.requestId})에 영문 증적 팩(${sc.evidencePack.evidence_pack_id})을 첨부했습니다.`,
        strong: true
      }
    ]
  };
}

export async function resetAll(): Promise<void> {
  await wait(200);
  store = clone(SCENARIOS);
  doneByCase = {};
}
