import { getLatencySegments, isResolved, maskMsisdn, maskVin, shortLabel, stripLeadingEmojis } from "../lib/format";
import type { CaseRecord } from "../types";

interface RailProps {
  record: CaseRecord;
  isL1: boolean;
  expanded: Set<number>;
  onToggle: (hopNumber: number) => void;
}

/** 왼쪽 노선도: 5-Hop 상태 + 구간 소요시간, Hop을 누르면 세부 항목을 펼침 */
export function Rail({ record, isL1, expanded, onToggle }: RailProps) {
  const { scenario: sc, brief } = record;
  const { segments, total } = getLatencySegments(sc);
  // 신호가 끊긴 Hop 이후 구간은 '도달하지 못함'(점선)으로 표시
  const breakAfter = isResolved(sc) ? undefined : brief.brokenAfterHop;
  const v = sc.vehicle;

  return (
    <aside className="rail" aria-labelledby="railTitle">
      <h2 className="rail-title" id="railTitle">
        신호가 지나간 길
      </h2>
      <p className="rail-total">
        {total[0]}
        <strong>{total[1]}</strong>
        {total[2]}
      </p>

      <ol className="route">
        {sc.hops.map((h, idx) => {
          const afterBreak = breakAfter !== undefined && h.hopNumber > breakAfter;
          const tone = h.status === "RED" ? "is-red" : h.status === "AMBER" ? "is-amber" : "is-green";
          const open = expanded.has(h.hopNumber);
          const detailId = `hopDetail${h.hopNumber}`;
          return (
            <li key={h.hopNumber} className={`stop ${afterBreak ? "after-break" : tone}`}>
              <i className="pin" aria-hidden="true" />
              <button type="button" className="stop-toggle" aria-expanded={open} aria-controls={detailId} onClick={() => onToggle(h.hopNumber)}>
                <span className="stop-name">
                  <span>{h.name}</span>
                  <span className="chev" aria-hidden="true">
                    ▾
                  </span>
                </span>
                <span className="stop-state">{afterBreak ? "정상 대기, 호출 못 받음" : h.statusLabel}</span>
                {segments[idx] && <span className="stop-ms">{segments[idx]}</span>}
              </button>
              <dl className="stop-detail" id={detailId} hidden={!open}>
                <div className="actor">{h.actor}</div>
                {h.detailItems.map((item) => (
                  <div key={item.label}>
                    <dt>{stripLeadingEmojis(item.label)}</dt>
                    <dd>{stripLeadingEmojis(item.value)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ol>

      <h2 className="rail-title">차량과 회선</h2>
      <dl className="id-summary">
        <div>
          <dt>VIN</dt>
          <dd className="mono">{maskVin(v.vin, isL1)}</dd>
        </div>
        <div>
          <dt>012 번호</dt>
          <dd className="mono">{maskMsisdn(v.msisdn012)}</dd>
        </div>
        <div>
          <dt>통신사</dt>
          <dd>
            {v.mnoCode} {v.ratType}
          </dd>
        </div>
        <div>
          <dt>시동</dt>
          <dd>{shortLabel(v.ignitionLabel)}</dd>
        </div>
        <div>
          <dt>배터리</dt>
          <dd>{shortLabel(v.batteryVoltage)}</dd>
        </div>
      </dl>
    </aside>
  );
}
