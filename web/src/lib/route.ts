import { useSyncExternalStore } from "react";

// GitHub Pages는 서버 라우팅이 없으므로 해시 라우팅을 쓴다: #/cases/SCENARIO_A
const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export function useCaseIdFromHash(): string | null {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const m = hash.match(/^#\/cases\/([\w-]+)/);
  return m ? m[1] : null;
}

export function goToCase(id: string) {
  const next = `#/cases/${id}`;
  if (window.location.hash !== next) window.location.hash = next;
}

// 역할(RBAC)은 실제 서비스에서는 로그인 세션 권한으로 정한다.
// 목업에서는 URL 쿼리로 흉내 낸다: ?role=l1 → L1 상담원, 기본값 → L2 운영자. ?demo=1 → MTTR 비교 배너
const params = new URLSearchParams(window.location.search);
export const ROLE = params.get("role") === "l1" ? ("L1_CS" as const) : ("L2_OP" as const);
export const IS_DEMO = params.get("demo") === "1";
