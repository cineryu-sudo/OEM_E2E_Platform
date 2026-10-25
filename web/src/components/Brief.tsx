import { isMoving, isResolved, shortLabel, stripLeadingEmojis } from "../lib/format";
import type { ActionKey, CaseRecord, LogEntry, Scenario } from "../types";
import { Telemetry } from "./Telemetry";

// 복구 액션 정의 (lockable: 주행 중·복구 완료 시 잠금)
export const ACTIONS: Record<ActionKey, { label: string; run: string; lockable: boolean }> = {
  sgsReset: { label: "코어망 SGs 세션 초기화", run: "초기화 실행", lockable: true },
  provision: { label: "본사 프로비저닝 다시 요청", run: "다시 요청", lockable: true },
  wakeup: { label: "Wake-up SMS 다시 보내기", run: "다시 보내기", lockable: false },
  evidence: { label: "L3 증적 팩", run: "증적 팩 열기", lockable: false }
};

/** 액션 잠금 사유 (주행 중 / 복구 완료) */
function getLockReason(sc: Scenario, action: ActionKey): string {
  if (!ACTIONS[action].lockable) return "";
  if (isMoving(sc)) return "주행 중 잠금";
  if (isResolved(sc)) return "복구 완료";
  return "";
}

/** [1단계] 무슨 일이 있었나: 결론 한 문장 + 쉬운 설명 */
export function VerdictStep({ record }: { record: CaseRecord }) {
  const { scenario: sc, brief } = record;
  const text = isResolved(sc) && brief.resolved ? brief.resolved : brief;
  return (
    <section className="step" aria-labelledby="stepWhatTitle">
      <span className="step-num" aria-hidden="true">
        1
      </span>
      <div className="step-body" role="status" aria-live="polite">
        <h2 className="step-label" id="stepWhatTitle">
          무슨 일이 있었나
        </h2>
        <h3 className="headline">{text.headline}</h3>
        <p>{text.summary}</p>
        <p className="headline-sub eng">판정: {stripLeadingEmojis(sc.rootCauseVerdict.faultDomain)}</p>
      </div>
    </section>
  );
}

/** [2단계] 근거: 판단 근거 3개 + 착시 주의 + 측정값 */
export function EvidenceStep({ record }: { record: CaseRecord }) {
  const { scenario: sc, brief } = record;
  const items = [...brief.evidence];
  if (isResolved(sc)) {
    const last = sc.timeline[sc.timeline.length - 1];
    items.unshift({ tone: "ok", text: "복구 후 정상 응답을 확인했습니다", sub: last.system, code: last.code });
  }
  const caution = isResolved(sc) ? stripLeadingEmojis(sc.rootCauseVerdict.illusionWarning) : brief.caution;

  return (
    <section className="step" aria-labelledby="stepWhyTitle">
      <span className="step-num" aria-hidden="true">
        2
      </span>
      <div className="step-body">
        <h2 className="step-label" id="stepWhyTitle">
          근거
        </h2>
        <ul className="evidence-list">
          {items.map((e) => (
            <li key={e.text} className={`is-${e.tone}`}>
              <b>{e.text}</b>
              <small>{e.sub}</small>
              <code className="eng">{e.code}</code>
            </li>
          ))}
        </ul>
        {caution && <p className="caution">{caution}</p>}
        <details className="disclosure eng">
          <summary>측정값 자세히 보기</summary>
          <Telemetry scenario={sc} />
        </details>
      </div>
    </section>
  );
}

interface RecoveryProps {
  record: CaseRecord;
  isL1: boolean;
  pending: ActionKey | null;
  onAction: (a: ActionKey) => void;
  logs: LogEntry[];
  logOpen: boolean;
  onLogToggle: (open: boolean) => void;
  onCopied: (ok: boolean) => void;
}

/** [3단계] 복구 체크리스트: 다음 할 일 하나만 마젠타, 끝난 단계는 체크 */
export function RecoveryStep({ record, isL1, pending, onAction, logs, logOpen, onLogToggle, onCopied }: RecoveryProps) {
  const { scenario: sc, brief, done } = record;
  const steps = brief.steps.filter((s) => !(s.l2Only && isL1));
  const visible = new Set(steps.map((s) => s.action));
  const busy = pending !== null;
  let nextMarked = false;

  const rows = steps.map((s) => {
    // 복구가 끝났다면 복구를 일으킨 단계(잠금 대상)도 완료로 표시
    const isDone = done.includes(s.action) || (ACTIONS[s.action].lockable && isResolved(sc));
    const waiting = !!s.after && visible.has(s.after) && !done.includes(s.after) && !isResolved(sc);
    const lock = isDone ? "" : getLockReason(sc, s.action);
    const isNext = !isDone && !waiting && !lock && !nextMarked;
    if (isNext) nextMarked = true;
    return { ...s, isDone, waiting, lock, isNext };
  });

  // 실행할 원격 조치가 없으면(고객 안내 종결·복구 완료) 안전 문구를 숨김. 주행 중 잠금은 항상 노출
  const showGuard = isMoving(sc) || (steps.length > 0 && !isResolved(sc));
  const others = (["sgsReset", "provision", "wakeup", "evidence"] as ActionKey[]).filter((k) => !visible.has(k));

  let note = "";
  if (steps.length === 0) {
    note = isResolved(sc)
      ? "복구가 끝났습니다. 추가 조치가 필요하지 않습니다."
      : isL1 && brief.steps.length
      ? "엔지니어(L2) 권한이 필요한 조치입니다. 아래 안내 문구로 응대한 뒤 L2에 이관하세요."
      : brief.note ?? "엔지니어(L2) 권한이 필요한 조치입니다. L2 운영자에게 이관하세요.";
  }

  const copyScript = () => {
    if (!navigator.clipboard) return onCopied(false);
    navigator.clipboard.writeText(sc.rootCauseVerdict.csAgentScript).then(
      () => onCopied(true),
      () => onCopied(false)
    );
  };

  return (
    <section className="step" aria-labelledby="stepFixTitle">
      <span className="step-num" aria-hidden="true">
        3
      </span>
      <div className="step-body">
        <h2 className="step-label" id="stepFixTitle">
          이렇게 복구합니다
        </h2>
        {showGuard && (
          <p className={isMoving(sc) ? "guardrail is-locked" : "guardrail"}>
            {isMoving(sc)
              ? "차량이 주행 중(IGN_ON)이라 코어망 세션 초기화가 자동으로 잠겼습니다."
              : `차량이 정차 중이고 배터리가 ${shortLabel(sc.vehicle.batteryVoltage)}라 원격으로 실행해도 안전합니다.`}
          </p>
        )}

        {rows.length > 0 && (
          <ol className="todo">
            {rows.map((r) => {
              const running = pending === r.action;
              return (
                <li key={r.action} className={[r.isDone && "is-done", r.isNext && "is-next"].filter(Boolean).join(" ")}>
                  <span className="check" aria-hidden="true" />
                  <span>
                    <b>{r.title}</b>
                    <small>{r.waiting ? "앞 단계가 끝나면 실행할 수 있습니다." : r.desc}</small>
                  </span>
                  <button
                    type="button"
                    className={`btn ${r.isNext ? "btn-primary" : "btn-quiet"}${running ? " is-running" : ""}`}
                    disabled={r.isDone || r.waiting || !!r.lock || busy}
                    aria-busy={running}
                    onClick={() => onAction(r.action)}
                  >
                    {running ? "실행 중" : r.isDone ? "완료" : r.lock || ACTIONS[r.action].run}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {note && <p className="action-note">{note}</p>}

        {others.length > 0 && (
          <details className="disclosure eng">
            <summary>다른 조치</summary>
            <div className="more-actions">
              {others.map((k) => {
                const lock = getLockReason(sc, k);
                const running = pending === k;
                return (
                  <button
                    key={k}
                    type="button"
                    className={`btn btn-quiet${running ? " is-running" : ""}`}
                    disabled={!!lock || busy}
                    onClick={() => onAction(k)}
                  >
                    {running ? "실행 중" : lock ? `${ACTIONS[k].label} (${lock})` : ACTIONS[k].label}
                  </button>
                );
              })}
            </div>
          </details>
        )}

        <div className="script-box">
          <div className="script-head">
            <span>고객 안내 문구</span>
            <button type="button" className="btn btn-quiet btn-small" onClick={copyScript}>
              복사
            </button>
          </div>
          <p className="script-text">{sc.rootCauseVerdict.csAgentScript}</p>
        </div>

        <details className="disclosure" open={logOpen} onToggle={(e) => onLogToggle((e.target as HTMLDetailsElement).open)}>
          <summary>
            작업 기록 <span className="count">{logs.length}건</span>
          </summary>
          <div className="action-console" role="log" aria-live="polite" aria-label="작업 기록" tabIndex={0}>
            {logs.map((l) => (
              <div key={l.id} className="console-line">
                <span className="console-ts">{l.ts}</span>
                <span className={l.strong ? "console-msg is-strong" : "console-msg"}>{l.msg}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
