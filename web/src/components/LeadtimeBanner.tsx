import type { Scenario } from "../types";

const LEADTIME: Record<string, { asIs: string; toBe: string; pct: number; saving: string }> = {
  SCENARIO_A: { asIs: "26시간 (1,560분)", toBe: "5분 이내", pct: 4, saving: "-99.7%" },
  SCENARIO_B: { asIs: "8일 (192시간)", toBe: "당일 첫 턴 (15분)", pct: 5, saving: "-99.8%" },
  SCENARIO_C: { asIs: "4시간 (2차 이관)", toBe: "30초 (즉시 종결)", pct: 3, saving: "-99.8%" },
  SCENARIO_D: { asIs: "수기 포털 반복 조회", toBe: "즉시 인지 (10초)", pct: 4, saving: "즉시 판별" }
};

/** [데모] 기존 방식 vs 이 화면의 MTTR 비교 (?demo=1) */
export function LeadtimeBanner({ scenario }: { scenario: Scenario }) {
  const lt = LEADTIME[scenario.id] ?? LEADTIME.SCENARIO_A;
  return (
    <div className="leadtime-banner">
      <div>
        <div className="lt-pattern-name">{scenario.patternName}</div>
        <div className="lt-sub-caption">장애 진단·복구 리드타임(MTTR) 비교</div>
      </div>
      <div className="lt-bars-col">
        <div className="lt-bar-row">
          <span className="lt-bar-label">기존</span>
          <div className="lt-bar-track">
            <div className="lt-bar-fill-asis" style={{ width: "100%" }} />
          </div>
          <span className="lt-bar-val">{lt.asIs}</span>
        </div>
        <div className="lt-bar-row">
          <span className="lt-bar-label">이 화면</span>
          <div className="lt-bar-track">
            <div className="lt-bar-fill-tobe" style={{ width: `${lt.pct}%` }} />
          </div>
          <span className="lt-bar-val highlight">{lt.toBe}</span>
        </div>
      </div>
      <div>
        <div className="lt-saving-num">{lt.saving}</div>
        <div className="lt-saving-label">MTTR 단축</div>
      </div>
    </div>
  );
}
