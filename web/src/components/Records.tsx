import type { ReactNode } from "react";
import { formatTimestamp, isMoving, maskEuiccEid, maskIccid, maskImei, maskImsi, maskMsisdn, maskVin, stripLeadingEmojis } from "../lib/format";
import type { CaseRecord, TzMode } from "../types";

interface RecordsProps {
  record: CaseRecord;
  isL1: boolean;
  tz: TzMode;
}

/** 상세 기록: 식별자 전체 매핑 · 시그널링 타임라인 */
export function Records({ record, isL1, tz }: RecordsProps) {
  const sc = record.scenario;
  const v = sc.vehicle;
  const windowText =
    tz === "UTC" ? `분석 구간 (UTC): ${v.inspectionWindowUtc}` : `분석 구간: ${v.inspectionWindowKst} KST (${v.inspectionWindowUtc} UTC)`;

  const cells: { label: string; hint: string; value: ReactNode; text?: boolean; critical?: boolean; sub?: ReactNode }[] = [
    { label: "차대번호 (VIN)", hint: sc.oemName, value: maskVin(v.vin, isL1), sub: `${v.model}, 출고 ${v.deliveryDate}` },
    {
      label: "담당 통신사와 망",
      hint: "자동 라우팅",
      text: true,
      value: (
        <>
          <span className="mno-badge">{v.mnoCode}</span>
          <span className="id-mno-label">{v.mnoLabel}</span>
        </>
      ),
      sub: `RAT: ${v.ratType}`
    },
    {
      label: "사물통신 착신번호 (012)",
      hint: "MNO B2B 키",
      value: maskMsisdn(v.msisdn012),
      sub: (
        <>
          IMSI: <span className={isL1 ? "blind-restricted" : undefined}>{maskImsi(v.mnoImsi, isL1)}</span>
        </>
      )
    },
    {
      label: "유심 ICCID와 eUICC EID",
      hint: "PDI 대장 자동 연동",
      value: maskIccid(v.simIccid),
      sub: (
        <>
          EID: <span className={isL1 ? "blind-restricted" : undefined}>{maskEuiccEid(v.euiccEid, isL1)}</span>
        </>
      )
    },
    { label: "TCU 단말 IMEI", hint: "IMEI-USIM 매칭", value: maskImei(v.tcuImei) },
    { label: "구독과 프로비저닝", hint: "계정 바인딩", text: true, value: stripLeadingEmojis(v.subscriptionLabel) },
    {
      label: "시동과 주행 상태",
      hint: `배터리 ${v.batteryVoltage}`,
      text: true,
      critical: isMoving(sc),
      value: stripLeadingEmojis(v.ignitionLabel)
    },
    { label: "기지국 행정동 위치", hint: "위치정보법 준수", text: true, value: v.lastLocation, sub: `TX: ${v.requestId}` }
  ];

  return (
    <section className="records" aria-label="상세 기록">
      <details className="disclosure record">
        <summary>
          식별자 전체 매핑{" "}
          <span className="summary-hint">
            {v.mnoCode} {maskMsisdn(v.msisdn012)}
          </span>
        </summary>
        <p className="record-sub">{windowText}</p>
        <div className="id-grid">
          {cells.map((c) => (
            <div className="id-cell" key={c.label}>
              <div className="id-label">
                <span>{c.label}</span>
                <span>{c.hint}</span>
              </div>
              <div className={["id-value", c.text && "is-text", c.critical && "is-critical"].filter(Boolean).join(" ")}>{c.value}</div>
              {c.sub && <div className="id-sub">{c.sub}</div>}
            </div>
          ))}
        </div>
      </details>

      <details className="disclosure record eng">
        <summary>
          시그널링 타임라인 <span className="summary-hint">{v.requestId}</span>
        </summary>
        <div className="table-wrap">
          <table className="timeline-table">
            <caption className="sr-only">3GPP / GSMA 표준 시그널링 이벤트 타임라인</caption>
            <thead>
              <tr>
                <th scope="col">시각</th>
                <th scope="col">구간</th>
                <th scope="col">시스템</th>
                <th scope="col">이벤트</th>
                <th scope="col">코드</th>
              </tr>
            </thead>
            <tbody>
              {sc.timeline.map((row, i) => (
                <tr key={i} className={row.status === "RED" ? "is-red" : row.status === "AMBER" ? "is-amber" : undefined}>
                  <td className="ts-col">{formatTimestamp(row.kst, row.utc, tz)}</td>
                  <td>{row.hop}</td>
                  <td>{row.system}</td>
                  <td>{row.event}</td>
                  <td className="code-col">{row.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
