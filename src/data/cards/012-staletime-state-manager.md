---
id: 12
title: "staleTime 설정 - React Query를 상태 관리자로 활용하기"
tags: ["react-query", "staleTime", "캐싱", "상태관리"]
difficulty: "medium"
sourceDoc: [11]
---

## 질문

아래 코드에서 `ComponentTwo`가 마운트될 때 **불필요한 네트워크 요청**이 다시 발생한다.

```tsx
export const useTodos = () =>
  useQuery({ queryKey: ['todos'], queryFn: fetchTodos });

function ComponentOne() {
  const { data } = useTodos();

  if (data) {
    return <ComponentTwo />;
  }
  return <Loading />;
}

function ComponentTwo() {
  const { data } = useTodos();
  // ...
}
```

1. 왜 `ComponentTwo`가 마운트될 때 네트워크 요청이 또 발생하는가?
2. 이 문제를 해결하려면 어떤 옵션을 설정해야 하는가?
3. `staleTime`을 쿼리 키별로 다르게 설정하려면 어떤 API를 사용할 수 있는가?

**힌트:** React Query의 `staleTime` 기본값이 무엇인지 생각해보자.

---answer---

## 정답: staleTime 커스터마이징

### 핵심 아이디어

React Query의 `staleTime` 기본값은 **0**이다. 즉, 데이터를 가져온 즉시 "오래된(stale)" 것으로 간주되어, 새 컴포넌트가 마운트될 때마다 `refetchOnMount`에 의해 네트워크 요청이 다시 발생한다.

### 단계별 해설

**1단계: 문제 원인**

`ComponentOne`이 마운트되어 데이터를 가져온 뒤, `ComponentTwo`가 조건부로 마운트된다. `staleTime: 0`이므로 데이터가 즉시 stale 상태가 되어 `ComponentTwo`의 `useTodos()`가 다시 네트워크 요청을 트리거한다.

**2단계: 전역 staleTime 설정**

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ 전역적으로 20초로 설정
      staleTime: 1000 * 20,
    },
  },
});
```

**3단계: 쿼리 키별 기본값 설정**

```tsx
// ✅ todo 관련 쿼리만 1분의 staleTime 부여
queryClient.setQueryDefaults(todoKeys.all, {
  staleTime: 1000 * 60,
});
```

### 깊은 이유 설명

React Query는 **서버 상태의 스냅샷**을 관리하는 도구이다. **"신선한(fresh) 데이터는 절대 네트워크 요청을 유발하지 않는다"**는 원칙이 핵심이다. `staleTime`을 도메인에 맞게 설정하면, 불필요한 중복 요청을 제거하면서도 백그라운드 업데이트를 통한 데이터 동기화를 유지할 수 있다. 예를 들어 환율 정보(일일 업데이트)는 긴 `staleTime`이 적합하고, SNS 피드(빈번한 변경)는 짧은 `staleTime`이 적합하다.
