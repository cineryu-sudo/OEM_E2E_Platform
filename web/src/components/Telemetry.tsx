import { isMoving, isResolved } from "../lib/format";
import type { Scenario } from "../types";

/** SVG 반원 도넛 게이지 */
function SemiDonut({ percent, critical }: { percent: number; critical: boolean }) {
  const clamped = Math.max(5, Math.min(100, percent));
  const circumference = Math.PI * 38; // 반원 둘레 (~119.38)
  const offset = circumference - (clamped / 100) * circumference;
  const d = "M 12 48 A 38 38 0 0 1 88 48";
  return (
    <svg viewBox="0 0 100 58" width="80" height="46" aria-hidden="true">
      <path d={d} className="gauge-track" fill="none" strokeWidth="9" />
      <path
        d={d}
        className={critical ? "gauge-fill is-critical" : "gauge-fill"}
        fill="none"
        strokeWidth="9"
        strokeDasharray={circumference.toFixed(1)}
        strokeDashoffset={offset.toFixed(1)}
      />
    </svg>
  );
}

interface PacketRow {
  label: string;
  value: string;
  pct: number;
  crit: boolean;
}

function getRadio(sc: Scenario) {
  switch (sc.id) {
    case "SCENARIO_B":
      return { dbm: -78, label: "우수 (전시장 셀 정상)", bars: 5, weak: false };
    case "SCENARIO_C":
      return { dbm: -118, label: "음영 (지하 심층 주차 추정)", bars: 1, weak: true };
    case "SCENARIO_D":
      return { dbm: -121, label: "약전계 (산간 셀 경계)", bars: 1, weak: true };
    default:
      return { dbm: -84, label: "양호 (지상 정상 권역)", bars: 4, weak: false };
  }
}

function getPackets(sc: Scenario): [PacketRow, PacketRow] {
  if (isResolved(sc)) {
    return [
      { label: "기지국 RF Paging 송출", value: "1건 (정상 송출)", pct: 100, crit: false },
      { label: "단말 → 서버 응답 패킷", value: "TCU_CONN_ACK (200 OK)", pct: 100, crit: false }
    ];
  }
  switch (sc.id) {
    case "SCENARIO_B":
      return [
        { label: "단말 상향 HTTPS 송신", value: "14 pkts (정상 송신)", pct: 100, crit: false },
        { label: "본사 방화벽 & SMS Hub", value: "0건 (TCP_RST 차단)", pct: 5, crit: true }
      ];
    case "SCENARIO_C":
      return [
        { label: "기지국 RF Paging 송출", value: "3회 (기지국 정상 송출)", pct: 100, crit: false },
        { label: "단말 모뎀 Paging 수신", value: "0건 (Deep Sleep)", pct: 5, crit: true }
      ];
    case "SCENARIO_D":
      return [
        { label: "외곽 기지국 Paging 재전송", value: "4회 (신호 감쇄 재시도)", pct: 80, crit: false },
        { label: "원격 리셋 가드레일", value: "주행 중 잠금 (IGN_ON)", pct: 100, crit: true }
      ];
    default:
      return [
        { label: "기지국 RF Paging 송출", value: "0건 (SGs 드롭)", pct: 4, crit: true },
        { label: "단말 → 서버 응답 패킷", value: "0건 (대기 중)", pct: 4, crit: false }
      ];
  }
}

/** 측정값: 배터리 · 수신감도 · 코어망 패킷 */
export function Telemetry({ scenario: sc }: { scenario: Scenario }) {
  const voltMatch = sc.vehicle.batteryVoltage.match(/([\d.]+)\s*V/);
  const volt = voltMatch ? parseFloat(voltMatch[1]) : 12.4;
  const lowBattery = volt < 11.8;
  // 10.5V ~ 14.5V 범위를 0~100%로 변환
  const voltPct = Math.round(((volt - 10.5) / 4.0) * 100);
  const radio = getRadio(sc);
  const packets = getPackets(sc);

  return (
    <div className="gauge-grid">
      <div className={lowBattery ? "gauge-card is-alert" : "gauge-card"}>
        <div className="gauge-card-header">
          <span>보조배터리 전압</span>
          <span className="gauge-tag">절전 기준 11.8V</span>
        </div>
        <div className="gauge-body">
          <SemiDonut percent={voltPct} critical={lowBattery} />
          <div>
            <div className={lowBattery ? "gauge-big-num num-critical" : "gauge-big-num"}>{volt.toFixed(1)}V</div>
            <div className="gauge-sub-desc">{lowBattery ? "방전 보호 절전 진입" : "정상 전압"}</div>
          </div>
        </div>
        <div className="gauge-threshold-note">
          <span>시동 {isMoving(sc) ? "IGN_ON (주행)" : "IGN_OFF (정차)"}</span>
        </div>
      </div>

      <div className={radio.weak ? "gauge-card is-alert" : "gauge-card"}>
        <div className="gauge-card-header">
          <span>기지국 수신감도</span>
          <span className="gauge-tag">{sc.vehicle.ratType.split(" ")[0]}</span>
        </div>
        <div className="gauge-body">
          <div className="signal-bars-viz" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`sig-bar ${step <= radio.bars ? (radio.weak ? "active-crit" : "active-normal") : ""}`}
                style={{ height: 8 + step * 6 }}
              />
            ))}
          </div>
          <div>
            <div className={radio.weak ? "gauge-big-num num-critical" : "gauge-big-num"}>{radio.dbm} dBm</div>
            <div className="gauge-sub-desc">{radio.label}</div>
          </div>
        </div>
        <div className="gauge-threshold-note">
          <span>정상 -70 ~ -105</span>
          <span>음영 &lt; -115</span>
        </div>
      </div>

      <div className={packets.some((p) => p.crit) ? "gauge-card is-alert" : "gauge-card"}>
        <div className="gauge-card-header">
          <span>코어망 패킷 흐름</span>
          <span className="gauge-tag">3GPP Probe</span>
        </div>
        <div className="pkt-chart-rows">
          {packets.map((p) => (
            <div key={p.label}>
              <div className="pkt-row-top">
                <span>{p.label}</span>
                <strong className={p.crit ? "crit-text" : undefined}>{p.value}</strong>
              </div>
              <div className="pkt-bar-bg">
                <div className={p.crit ? "pkt-bar-fill fill-crit" : "pkt-bar-fill"} style={{ width: `${p.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
