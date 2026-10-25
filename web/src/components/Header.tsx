import { getCaseTone, maskVin } from "../lib/format";
import type { CaseRecord, TzMode } from "../types";

const PII_NOTE =
  "개인정보보호법 제28조 및 위치정보법 제18조 준수: 차주 PII 원천 배제, 기지국 행정동 단위 일반화(Coarse Location), 식별자 화면 마스킹 표준 적용";

interface TopBarProps {
  query: string;
  onQuery: (v: string) => void;
  onSearch: () => void;
  searching: boolean;
  tz: TzMode;
  onTz: (v: TzMode) => void;
  user: string;
}

/** 상단 바: 브랜드 · 단일 키 검색 · 컴플라이언스 · 타임존 · 세션 */
export function TopBar({ query, onQuery, onSearch, searching, tz, onTz, user }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          U+
        </span>
        <span className="brand-name">E2E 구간 진단</span>
      </div>

      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >
        <label className="sr-only" htmlFor="universalSearchInput">
          차대번호, 012 번호, ICCID, IMSI, 요청 ID 검색
        </label>
        <span className="search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          type="search"
          id="universalSearchInput"
          placeholder="VIN, 012 번호, ICCID, IMSI, 요청 ID"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        <button type="submit" className="btn btn-quiet" disabled={searching}>
          {searching ? "조회 중" : "조회"}
        </button>
      </form>

      <div className="top-controls">
        <span className="pii-badge" tabIndex={0} title={PII_NOTE} aria-describedby="piiNote">
          Zero PII
        </span>
        <span className="sr-only" id="piiNote">
          {PII_NOTE}
        </span>
        <label className="tz-select">
          <span className="sr-only">타임존</span>
          <select value={tz} onChange={(e) => onTz(e.target.value as TzMode)}>
            <option value="BOTH">KST + UTC</option>
            <option value="KST">KST</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
        <span className="session-user" title="역할은 로그인 권한으로 결정됩니다 (목업: URL ?role=l1 로 L1 뷰 확인)">
          {user}
        </span>
      </div>
    </header>
  );
}

interface QueueBarProps {
  cases: CaseRecord[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onReset: () => void;
}

/** 진단 대기열 (시나리오 프리셋) */
export function QueueBar({ cases, currentId, onSelect, onReset }: QueueBarProps) {
  return (
    <nav className="queue-bar" aria-label="진단 대기열">
      <span className="queue-label">진단 대기열</span>
      <div className="queue-list">
        {cases.map(({ scenario: sc, brief }) => (
          <a
            key={sc.id}
            className="queue-item"
            href={`#/cases/${sc.id}`}
            title={sc.title}
            aria-current={sc.id === currentId ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              onSelect(sc.id);
            }}
          >
            <span className={`queue-dot is-${getCaseTone(sc).tone}`} aria-hidden="true" />
            <span>{brief.caseTitle}</span>
            <small>{sc.oemName.split(" ")[0]}</small>
          </a>
        ))}
      </div>
      <button type="button" className="btn btn-quiet" onClick={onReset}>
        처음 상태로
      </button>
    </nav>
  );
}

interface CaseBarProps {
  record: CaseRecord;
  isL1: boolean;
  tz: TzMode;
  onOpenEvidence: () => void;
}

/** 케이스 헤더: 무엇을 보고 있는지 + 현재 상태 */
export function CaseBar({ record, isL1, tz, onOpenEvidence }: CaseBarProps) {
  const { scenario: sc, brief } = record;
  const v = sc.vehicle;
  const { tone, label } = getCaseTone(sc);
  return (
    <div className="case-bar">
      <h1 className="case-title">{brief.caseTitle}</h1>
      <div className="case-meta">
        <span>{sc.oemName}</span>
        <span>
          VIN <span className="mono">{maskVin(v.vin, isL1)}</span>
        </span>
        <span>{tz === "UTC" ? `${v.inspectionWindowUtc} UTC` : `${v.inspectionWindowKst} KST`}</span>
      </div>
      <span className={`status-pill is-${tone}`} role="status">
        {label}
      </span>
      <span className="spacer" />
      <button type="button" className="btn btn-quiet eng" onClick={onOpenEvidence} aria-haspopup="dialog">
        L3 증적 팩
      </button>
    </div>
  );
}
