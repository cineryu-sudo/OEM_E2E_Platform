export interface Toast {
  id: number;
  text: string;
  tone: "ok" | "warn" | "info";
}

/** 조치 결과 알림: 3.5초 뒤 사라짐, 스크린리더에 polite로 전달 */
export function Toasts({ items }: { items: Toast[] }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast is-${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
