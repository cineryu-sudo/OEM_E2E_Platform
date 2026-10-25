import type { Scenario, TzMode } from "../types";

// ========================================================================
// 컴플라이언스 & 프라이버시 마스킹 (Zero PII & RBAC)
// ========================================================================
export function maskVin(vin: string, isL1: boolean): string {
  if (!vin) return "-";
  if (vin.length < 10) return vin;
  if (isL1) return vin.substring(0, 5) + "******" + vin.substring(vin.length - 4);
  return vin.substring(0, 7) + "******" + vin.substring(vin.length - 4);
}

export function maskMsisdn(num: string): string {
  if (!num) return "-";
  return num.replace(/(\d{3})-(\d{3,4})-(\d{4})/, "$1-****-$3");
}

export function maskImei(imei: string): string {
  if (!imei) return "-";
  if (imei.length < 10) return imei;
  return imei.substring(0, 6) + "******" + imei.substring(imei.length - 3);
}

export function maskIccid(iccid: string): string {
  if (!iccid) return "-";
  if (iccid.length < 12) return iccid;
  return iccid.substring(0, 6) + "**********" + iccid.substring(iccid.length - 4);
}

export function maskImsi(imsi: string, isL1: boolean): string {
  if (!imsi) return "-";
  if (isL1) return "비인가 권한(L2 전용)";
  if (imsi.length < 10) return imsi;
  return imsi.substring(0, 5) + "******" + imsi.substring(imsi.length - 4);
}

export function maskEuiccEid(eid: string, isL1: boolean): string {
  if (!eid) return "-";
  if (eid.startsWith("NONE")) return eid;
  if (isL1) return "비인가 권한(L2 전용)";
  if (eid.length < 16) return eid;
  return eid.substring(0, 8) + "******************" + eid.substring(eid.length - 4);
}

export function stripLeadingEmojis(str: string): string {
  if (!str) return "";
  return str.replace(/^[🟢🟡🔴🚨⚠️🔒🛡️✅⚡🔍📋🎯🛠️⏱️📄🔗📌💬👉]+\s*/gu, "");
}

/** 괄호 앞 핵심 문구만 남김: "정차 중 (IGN_OFF · 원격 복구 가능)" → "정차 중" */
export function shortLabel(str: string): string {
  return (str || "").split(" (")[0];
}

export function formatTimestamp(kst: string, utc: string, tz: TzMode): string {
  if (tz === "KST") return `${kst} KST`;
  if (tz === "UTC") return utc;
  return `${kst} KST (${utc})`;
}

export function isResolved(sc: Scenario): boolean {
  return sc.rootCauseVerdict.severity === "RESOLVED";
}

export function isMoving(sc: Scenario): boolean {
  return sc.vehicle.ignitionState === "IGN_ON_MOVING";
}

export type CaseTone = "green" | "amber" | "red";

/** 상태 → 색 톤 (대기열 점, 상태 배지) */
export function getCaseTone(sc: Scenario): { tone: CaseTone; label: string } {
  if (isResolved(sc)) return { tone: "green", label: "복구 완료" };
  if (isMoving(sc)) return { tone: "amber", label: "주행 중, 원격 조치 잠김" };
  if (sc.rootCauseVerdict.severity === "CRITICAL") return { tone: "red", label: "원인 확인됨, 복구 필요" };
  return { tone: "amber", label: "망 정상, 고객 안내로 종결" };
}

/** E2E 구간별 소요시간 (노선도 각 정류장에 표시) */
export function getLatencySegments(sc: Scenario): { segments: string[]; total: [string, string, string] } {
  if (isResolved(sc)) {
    return { segments: ["110 ms", "115 ms", "190 ms", "410 ms", "515 ms"], total: ["전체 응답 ", "1.34초", ", 정상 복구"] };
  }
  switch (sc.id) {
    case "SCENARIO_A":
      return {
        segments: ["110 ms", "113 ms", "188 ms (Spool)", "Paging 0건", "90,000 ms 대기 (ERR_408)"],
        total: ["총 ", "90.4초", " 경과 후 타임아웃"]
      };
    case "SCENARIO_B":
      return {
        segments: ["120 ms", "TCP_RST 차단", "인입 0건", "240 ms", "상향 14 pkts"],
        total: ["국내 LG U+ 구간 ", "0.24초 정상", ", 해외 구간 단절"]
      };
    case "SCENARIO_C":
      return {
        segments: ["95 ms", "105 ms", "180 ms", "Paging 3회 송출", "무응답 (96시간 주차)"],
        total: ["서버와 기지국 송출 ", "0.6초 정상", ""]
      };
    default:
      return {
        segments: ["110 ms", "125 ms", "1,200 ms", "RSRP -121 dBm", "신호 감쇄"],
        total: ["외곽 약전계로 ", "재전송 지연", ""]
      };
  }
}

export function nowStamp(): string {
  const now = new Date();
  return now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0");
}
