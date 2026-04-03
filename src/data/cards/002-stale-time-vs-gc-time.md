---
id: 2
title: "staleTime vs gcTime - 캐시 생명주기 이해하기"
tags: ["react-query", "캐싱", "staleTime", "gcTime"]
difficulty: "easy"
sourceDoc: [1]
---

## 질문

React Query의 캐시 설정에 대한 다음 설명 중 **올바른 것**을 모두 고르시오.

```tsx
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5 * 60 * 1000, // 5분
  gcTime: 10 * 60 * 1000,   // 10분
});
```

1. `staleTime` 5분 동안은 네트워크 요청 없이 캐시에서만 데이터를 가져온다.
2. `gcTime`은 쿼리가 **마지막으로 fetch된 시점**부터 카운트된다.
3. `staleTime`이 지나면 캐시 데이터가 즉시 삭제된다.
4. 컴포넌트가 언마운트되어 옵저버가 없어지면, `gcTime` 이후에 캐시에서 제거된다.

**힌트:** "신선하지 않은 것(stale)"과 "삭제되는 것(garbage collected)"은 완전히 다른 개념이다.

---answer---

## 정답: 1번, 4번

### 핵심 아이디어

`staleTime`은 데이터가 **신선한 상태를 유지하는 시간**이고, `gcTime`은 **비활성 쿼리가 캐시에서 제거되기까지의 시간**이다. 이 두 설정은 캐시의 서로 다른 단계를 제어한다.

### 각 선택지 해설

- **1번 (O)**: `staleTime` 동안 데이터는 fresh 상태이므로, `refetchOnMount`, `refetchOnWindowFocus` 등의 트리거가 발생해도 네트워크 요청을 하지 않는다. 캐시에서 바로 반환한다.

- **2번 (X)**: `gcTime`은 쿼리가 **비활성화된 시점**(등록된 옵저버가 0이 된 시점, 즉 해당 쿼리를 사용하는 모든 컴포넌트가 언마운트된 시점)부터 카운트된다.

- **3번 (X)**: `staleTime`이 지나면 데이터는 **stale(신선하지 않은)** 상태가 될 뿐, 캐시에서 삭제되지 않는다. 특정 조건(window focus, mount 등)에서 백그라운드 refetch가 발생하며, 그 동안 stale 데이터를 계속 보여준다.

- **4번 (O)**: 모든 컴포넌트가 언마운트되면 쿼리는 비활성 상태가 되고, `gcTime`(기본 5분) 후에 캐시에서 제거된다.

### 깊은 이유 설명

대부분의 경우 조정이 필요한 것은 `staleTime`이다. `gcTime`을 직접 수정하는 경우는 드물다. `staleTime`의 기본값이 `0`이라는 점이 중요한데, 이는 데이터가 fetch 즉시 stale 상태가 된다는 뜻이다. 즉 기본 설정에서는 컴포넌트가 마운트되거나 window focus가 돌아올 때마다 백그라운드 refetch가 발생한다. 이것이 React Query의 **stale-while-revalidate** 전략의 핵심이다.

> v5부터 `cacheTime`이 `gcTime`으로 이름이 변경되었다. 동작을 더 명확하게 표현하기 위함이다.
