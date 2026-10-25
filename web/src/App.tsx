import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "./api/mockApi";
import { CaseBar, QueueBar, TopBar } from "./components/Header";
import { Rail } from "./components/Rail";
import { EvidenceStep, RecoveryStep, VerdictStep } from "./components/Brief";
import { Records } from "./components/Records";
import { EvidenceModal } from "./components/EvidenceModal";
import { LeadtimeBanner } from "./components/LeadtimeBanner";
import { Toasts, type Toast } from "./components/Toasts";
import { maskMsisdn, maskVin, nowStamp } from "./lib/format";
import { goToCase, IS_DEMO, ROLE, useCaseIdFromHash } from "./lib/route";
import type { ActionKey, CaseRecord, LogEntry, TzMode } from "./types";

const SESSION_USERS = {
  L2_OP: { id: "op_lgu_0421", label: "L2 운영 실무자" },
  L1_CS: { id: "cs_agent_102", label: "L1 콜센터 상담원" }
};

const redHops = (rec: CaseRecord) =>
  new Set(rec.scenario.hops.filter((h) => h.status === "RED").map((h) => h.hopNumber));

export default function App() {
  const isL1 = ROLE === "L1_CS";
  const routeId = useCaseIdFromHash();

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [current, setCurrent] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ActionKey | null>(null);
  const [tz, setTz] = useState<TzMode>("BOTH");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);

  const log = useCallback((msg: string, strong = false) => {
    setLogs((prev) => [...prev, { id: ++seq.current, ts: nowStamp(), msg, strong }]);
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = ++seq.current;
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // 컴플라이언스 감사 추적 (Audit Trail)
  const audit = useCallback(
    (rec: CaseRecord, actionType: string, ticketId?: string) => {
      const v = rec.scenario.vehicle;
      const now = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      const auditId = `AUDIT-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(
        now.getMinutes()
      )}${p(now.getSeconds())}-${Math.floor(1000 + Math.random() * 9000)}`;
      log(
        `[AUDIT: COMPLIANCE_OK] ${auditId} | 작업자: ${SESSION_USERS[ROLE].id}(${ROLE}) | 티켓: ${ticketId ?? v.requestId} | 대상: ${maskVin(
          v.vin,
          isL1
        )} (${maskMsisdn(v.msisdn012)}) | 액션: ${actionType}`
      );
    },
    [isL1, log]
  );

  const refreshList = useCallback(async () => setCases(await api.listCases()), []);

  // 첫 진입: 목록을 받고, 주소에 케이스가 없으면 첫 건으로 이동
  useEffect(() => {
    api.listCases().then((list) => {
      setCases(list);
      if (!routeId && list.length) goToCase(list[0].scenario.id);
      log("[LG U+ 관제 엔진 가동] Connected Car E2E 통합 구간 진단 대시보드가 준비되었습니다.", true);
    });
  }, []);

  // 주소의 케이스가 바뀌면 상세를 다시 받아 온다 (뒤로가기 포함)
  useEffect(() => {
    if (!routeId) return;
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .getCase(routeId)
      .then((rec) => {
        if (!alive) return;
        setCurrent(rec);
        setExpanded(redHops(rec));
        setQuery(maskVin(rec.scenario.vehicle.vin, isL1));
        log(`[ID Bridge] '${maskVin(rec.scenario.vehicle.vin, isL1)}' (${rec.scenario.oemName}) 조회 완료 — 코어망 시그널링 프로브 연동 성공.`, true);
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [routeId, isL1, log]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const id = await api.searchCase(query);
    setSearching(false);
    if (id) {
      goToCase(id);
    } else {
      log(`[검색 알림] '${query}'와 일치하는 차량이 없습니다. VIN, 012 번호, ICCID, IMSI, 요청 ID로 다시 검색하세요.`);
      toast("일치하는 차량이 없습니다. VIN, 012 번호, ICCID, IMSI, 요청 ID로 다시 검색하세요.", "warn");
    }
  };

  const handleAction = async (action: ActionKey) => {
    if (!current) return;
    if (action === "evidence") {
      audit(current, "EVIDENCE_VIEW_ZERO_PII", current.scenario.evidencePack.evidence_pack_id);
      log(`[증적 팩 생성] '${current.scenario.evidencePack.evidence_pack_id}' 영문 표준 기술 증적 패키지 생성 완료.`, true);
      setModalOpen(true);
      return;
    }
    const auditName = { sgsReset: "REMOTE_MME_SGS_RESET", provision: "SAFE_PROVISIONING_RETRIGGER", wakeup: "WAKEUP_SMS_RESEND" }[action];
    audit(current, auditName);
    setPending(action);
    try {
      const { record, logs: resultLogs } = await api.runAction(current.scenario.id, action);
      resultLogs.forEach((l) => log(l.msg, l.strong));
      const resolvedNow = record.scenario.rootCauseVerdict.severity === "RESOLVED" && current.scenario.rootCauseVerdict.severity !== "RESOLVED";
      setCurrent(record);
      if (resolvedNow) setExpanded(new Set());
      toast(resultLogs[0]?.msg.replace(/^\[[^\]]+\]\s*/, "") ?? "완료했습니다.", resultLogs[0]?.strong ? "ok" : "info");
      refreshList();
    } catch (e) {
      toast(`실행하지 못했습니다: ${(e as Error).message}`, "warn");
    } finally {
      setPending(null);
    }
  };

  const handleAttach = async () => {
    if (!current) return;
    audit(current, "ITSM_EVIDENCE_ATTACH");
    setPending("evidence");
    const { record, logs: resultLogs } = await api.attachEvidence(current.scenario.id);
    resultLogs.forEach((l) => log(l.msg, l.strong));
    setCurrent(record);
    setPending(null);
    setModalOpen(false);
    toast("증적 팩을 ServiceNow / Jira에 첨부했습니다.");
  };

  const handleReset = async () => {
    await api.resetAll();
    await refreshList();
    if (routeId) {
      const rec = await api.getCase(routeId);
      setCurrent(rec);
      setExpanded(redHops(rec));
    }
    log("[초기화] 시나리오 데이터를 장애 발생 시점 상태로 되돌렸습니다.");
    toast("모든 케이스를 처음 상태로 되돌렸습니다.", "info");
  };

  const toggleHop = (n: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const user = SESSION_USERS[ROLE];
  const showSkeleton = loading && !current;

  return (
    <div className={isL1 ? "app role-l1" : "app"}>
      <a className="skip-link" href="#main">
        본문 바로가기
      </a>
      <TopBar query={query} onQuery={setQuery} onSearch={handleSearch} searching={searching} tz={tz} onTz={setTz} user={`${user.label} ${user.id}`} />
      <QueueBar cases={cases} currentId={routeId} onSelect={goToCase} onReset={handleReset} />

      {error ? (
        <div className="error-state" role="alert">
          <p>{error}</p>
          {cases[0] && (
            <button type="button" className="btn btn-quiet" onClick={() => goToCase(cases[0].scenario.id)}>
              첫 번째 케이스 열기
            </button>
          )}
        </div>
      ) : showSkeleton || !current ? (
        <div className="skeleton-page" aria-busy="true" aria-label="불러오는 중">
          <div className="sk sk-bar" />
          <div className="sk-layout">
            <div className="sk sk-rail" />
            <div className="sk-brief">
              <div className="sk sk-title" />
              <div className="sk sk-line" />
              <div className="sk sk-line short" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <CaseBar record={current} isL1={isL1} tz={tz} onOpenEvidence={() => handleAction("evidence")} />
          <div className={loading ? "layout is-loading" : "layout"} aria-busy={loading}>
            <Rail record={current} isL1={isL1} expanded={expanded} onToggle={toggleHop} />
            <main className="brief" id="main">
              {IS_DEMO && <LeadtimeBanner scenario={current.scenario} />}
              <VerdictStep record={current} />
              <EvidenceStep record={current} />
              <RecoveryStep
                record={current}
                isL1={isL1}
                pending={pending}
                onAction={handleAction}
                logs={logs}
                logOpen={logOpen}
                onLogToggle={setLogOpen}
                onCopied={(ok) => toast(ok ? "고객 안내 문구를 복사했습니다." : "복사하지 못했습니다. 문구를 직접 선택해 복사하세요.", ok ? "ok" : "warn")}
              />
              <Records record={current} isL1={isL1} tz={tz} />
            </main>
          </div>
          <EvidenceModal
            open={modalOpen}
            record={current}
            attaching={pending === "evidence"}
            onClose={() => setModalOpen(false)}
            onAttach={handleAttach}
            onCopied={(ok) => toast(ok ? "증적 JSON을 복사했습니다." : "복사하지 못했습니다.", ok ? "ok" : "warn")}
          />
        </>
      )}
      <Toasts items={toasts} />
    </div>
  );
}
