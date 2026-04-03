---
id: 26
title: "동기 상태에 React Query 사용 - 안티패턴 인식하기"
tags: ["react-query", "상태관리", "안티패턴"]
difficulty: "easy"
sourceDoc: [29]
---

## 질문

다음 코드는 사이드바의 열림/닫힘 상태를 React Query로 관리하고 있다.

```tsx
const { data: isOpen } = useQuery({
  queryKey: ['sidebar-state'],
  queryFn: () => Promise.resolve(false),
  initialData: false,
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
});
```

1. 이 코드가 비효율적인 이유는 무엇인가?
2. `staleTime: Infinity`와 3개의 `refetch` 옵션을 모두 꺼야 하는 근본적인 이유는?
3. 이 상태를 관리하기에 더 적합한 도구와 코드를 제시하라.

**힌트:** React Query는 본질적으로 **비동기** 상태를 위한 도구이다. 동기 상태를 넣으면 그 본질을 거스르게 된다.

---answer---

## 정답: 동기 상태에는 전용 클라이언트 상태 도구를 사용해야 한다

### 핵심 아이디어

React Query는 **서버 상태(비동기 데이터)**를 관리하기 위한 라이브러리이다. 사이드바 토글 같은 **클라이언트 동기 상태**를 넣으면, 비동기 동기화 메커니즘을 하나씩 꺼야 하는 장황한 코드가 된다.

### 단계별 해설

**1. 비효율적인 이유**

React Query는 기본적으로 `refetchOnWindowFocus`, `refetchOnMount`, `refetchOnReconnect`를 활성화한다. 동기 상태에 이 기능들은 불필요하므로 일일이 꺼야 하며, `Promise.resolve`로 감싸는 것 자체가 의미 없는 비동기 래핑이다.

**2. 옵션을 꺼야 하는 근본 이유**

React Query의 핵심 가치는 **stale-while-revalidate** 전략이다. 서버 데이터가 변할 수 있으므로 자동 재검증을 수행하는 것인데, 동기 상태는 서버와 동기화할 대상 자체가 없다. 즉, React Query가 제공하는 가치의 80%를 사용하지 않는 셈이다.

**3. 적합한 대안: Zustand**

```tsx
// sidebarStore.ts
import { create } from 'zustand';

const useSidebarStore = create((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));

// 사용하는 쪽
const { isOpen, toggle } = useSidebarStore();
```

### 깊은 이유 설명

TkDodo는 "React Query를 동기 상태에 쓰지 마세요"라고 명확히 권고한다. 도구의 설계 의도에 맞지 않는 사용은 코드 복잡도만 높이고, 실제 기능(캐싱, 중복 제거, 백그라운드 업데이트)은 전혀 활용하지 못한다. **서버 상태는 React Query, 클라이언트 상태는 Zustand/XState** 같은 전용 도구로 분리하는 것이 올바른 아키텍처이다.
