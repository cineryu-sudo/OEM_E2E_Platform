import { useEffect, useRef, type KeyboardEvent } from "react";
import type { CaseRecord } from "../types";

interface EvidenceModalProps {
  open: boolean;
  record: CaseRecord;
  attaching: boolean;
  onClose: () => void;
  onAttach: () => void;
  onCopied: (ok: boolean) => void;
}

/** [F3] Global L3 Technical Evidence Pack 모달 */
export function EvidenceModal({ open, record, attaching, onClose, onAttach, onCopied }: EvidenceModalProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const pack = record.scenario.evidencePack;
  const json = JSON.stringify(pack, null, 2);

  // 모달 접근성: 열 때 포커스 이동, 닫을 때 원래 버튼으로 복귀, 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    windowRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      if (returnFocus.current && document.body.contains(returnFocus.current)) returnFocus.current.focus();
    };
  }, [open]);

  if (!open) return null;

  // ESC 닫기, Tab 포커스 트랩
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") return onClose();
    if (e.key !== "Tab" || !windowRef.current) return;
    const focusables = windowRef.current.querySelectorAll<HTMLElement>("button, [tabindex='0']");
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === windowRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const copy = () => {
    if (!navigator.clipboard) return onCopied(false);
    navigator.clipboard.writeText(json).then(
      () => onCopied(true),
      () => onCopied(false)
    );
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    // 원본 VIN을 파일명에 노출하지 않음 (식별자 마스킹 표준)
    a.download = `${pack.evidence_pack_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop open" onMouseDown={(e) => e.target === e.currentTarget && onClose()} onKeyDown={onKeyDown}>
      <div className="modal-window" role="dialog" aria-modal="true" aria-labelledby="evidenceModalTitle" aria-describedby="evidenceModalDesc" tabIndex={-1} ref={windowRef}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="evidenceModalTitle">
              L3 증적 팩
            </h2>
            <p className="modal-desc" id="evidenceModalDesc">
              유럽 본사 ServiceNow L3와 클라우드·단말 연구소에 제출하는 영문 기술 증적입니다.
            </p>
          </div>
          <button type="button" className="btn btn-quiet" onClick={onClose} aria-label="증적 팩 닫기">
            닫기
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-note">
            <strong>Zero PII, LG U+ 코어망 시스템 전자 서명</strong>
            <br />
            차주 개인정보(이름, 전화번호, 정밀 좌표)를 모두 뺀 리포트입니다. 국외 이전 요건을 충족하고, 유럽 본사 L3가 인정하는
            3GPP/GSMA 표준 코드만 담았습니다.
          </div>
          <pre className="evidence-pre" tabIndex={0}>
            {json}
          </pre>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-quiet" onClick={download}>
            JSON 파일 저장
          </button>
          <button type="button" className="btn btn-quiet" onClick={copy}>
            JSON 복사
          </button>
          <button type="button" className={attaching ? "btn btn-primary is-running" : "btn btn-primary"} onClick={onAttach} disabled={attaching}>
            {attaching ? "첨부 중" : "ServiceNow / Jira에 첨부"}
          </button>
        </div>
      </div>
    </div>
  );
}
