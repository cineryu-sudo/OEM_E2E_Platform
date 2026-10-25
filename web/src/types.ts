export type HopStatus = "GREEN" | "AMBER" | "RED";
export type Severity = "CRITICAL" | "WARNING" | "INFO" | "RESOLVED";

export interface Vehicle {
  vin: string;
  model: string;
  deliveryDate: string;
  subscriptionStatus: string;
  subscriptionLabel: string;
  ignitionState: string;
  ignitionLabel: string;
  batteryVoltage: string;
  lastLocation: string;
  tcuImei: string;
  euiccEid: string;
  simIccid: string;
  mnoImsi: string;
  msisdn012: string;
  mnoCode: string;
  mnoLabel: string;
  ratType: string;
  requestId: string;
  commandType: string;
  inspectionWindowKst: string;
  inspectionWindowUtc: string;
}

export interface Hop {
  hopNumber: number;
  name: string;
  actor: string;
  status: HopStatus;
  statusLabel: string;
  summaryCode: string;
  detailItems: { label: string; value: string }[];
}

export interface TimelineRow {
  kst: string;
  utc: string;
  hop: string;
  system: string;
  event: string;
  code: string;
  status: HopStatus;
}

export interface Scenario {
  id: string;
  badge: string;
  title: string;
  patternCode: string;
  patternName: string;
  asIsLeadTime: string;
  toBeLeadTime: string;
  oemType: string;
  oemName: string;
  vehicle: Vehicle;
  hops: Hop[];
  rootCauseVerdict: {
    severity: Severity | string;
    faultDomain: string;
    illusionWarning: string;
    technicalExplanation: string;
    csAgentScript: string;
    recommendedActions: string[];
  };
  timeline: TimelineRow[];
  evidencePack: { evidence_pack_id: string; [key: string]: unknown };
}

export type ActionKey = "sgsReset" | "provision" | "wakeup" | "evidence";
export type Tone = "bad" | "warn" | "ok";

export interface Brief {
  caseTitle: string;
  brokenAfterHop?: number;
  headline: string;
  summary: string;
  evidence: { tone: Tone; text: string; sub: string; code: string }[];
  caution?: string;
  steps: { action: ActionKey; title: string; desc: string; l2Only?: boolean; after?: ActionKey }[];
  note?: string;
  resolved?: { headline: string; summary: string };
}

export type Role = "L1_CS" | "L2_OP";
export type TzMode = "BOTH" | "KST" | "UTC";

export interface LogEntry {
  id: number;
  ts: string;
  msg: string;
  strong: boolean;
}

/** 가짜 API가 돌려주는 케이스: 원천 시나리오 + 화면 문구 + 완료 단계 */
export interface CaseRecord {
  scenario: Scenario;
  brief: Brief;
  done: ActionKey[];
}
