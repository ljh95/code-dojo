---
id: 24
title: "MutationCache 전역 콜백 - 자동 쿼리 무효화 전략"
tags: ["react-query", "MutationCache", "invalidation", "mutation"]
difficulty: "hard"
sourceDoc: [26]
---

## 질문

아래 코드는 이슈를 업데이트한 후 관련 쿼리를 수동으로 무효화하고 있다.

```tsx
function useUpdateIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateIssue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['labels'] })
      // 새로운 리소스가 추가될 때마다 여기에 계속 추가해야 함...
    },
  })
}
```

1. 이 방식의 유지보수 문제점은 무엇인가?
2. `MutationCache`의 전역 `onSuccess` 콜백으로 **모든 mutation 후 자동 무효화**를 구현하면 코드가 어떻게 바뀌는가?
3. "모든 쿼리를 무효화하면 과하지 않은가?"라는 우려에 대해, `invalidation`과 `refetch`의 차이를 설명하라.

**힌트:** `invalidation`은 모든 매칭 쿼리를 즉시 refetch하지 않는다. active 쿼리와 inactive 쿼리의 처리 방식이 다르다.

---answer---

## 정답: MutationCache 전역 onSuccess로 자동 무효화

### 핵심 아이디어

`MutationCache`에 전역 `onSuccess` 콜백을 등록하면, 모든 mutation 성공 시 자동으로 쿼리를 무효화할 수 있다. 이는 Remix(React Router)의 자동 revalidation과 유사한 패턴이다.

### 기본 구현 (5줄)

```ts
import { QueryClient, MutationCache } from '@tanstack/react-query'

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  }),
})
```

이제 개별 `useMutation`에서 `invalidateQueries`를 호출할 필요가 없다.

### invalidation vs refetch

| 구분 | 동작 |
|------|------|
| **Active 쿼리** (화면에 보이는 것) | 즉시 refetch |
| **Inactive 쿼리** (화면에 없는 것) | `stale` 상태로 표시만 함. 다음에 사용될 때 refetch |

따라서 필터가 10개인 이슈 목록에서 현재 보이는 필터 1개만 refetch되고, 나머지 9개는 나중에 해당 필터로 돌아갈 때 refetch된다.

### 정교한 무효화: meta 옵션 활용

```ts
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          // meta.invalidates에 명시된 키만 매칭, 없으면 전부 무효화
          mutation.meta?.invalidates?.some((queryKey) =>
            matchQuery({ queryKey }, query)
          ) ?? true,
      })
    },
  }),
})

// 사용: 특정 쿼리만 무효화
useMutation({
  mutationFn: updateLabel,
  meta: {
    invalidates: [['issues'], ['labels']],
  },
})
```

### 전역 무효화 + 특정 쿼리만 await

```ts
// 전역: 모든 쿼리 무효화 (fire-and-forget)
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  }),
})

// 개별: 중요한 쿼리만 await (MutationCache 콜백이 useMutation 콜백보다 먼저 실행됨)
useMutation({
  mutationFn: updateLabel,
  onSuccess: () => {
    return queryClient.invalidateQueries(
      { queryKey: ['labels'] },
      { cancelRefetch: false } // 이미 진행 중인 refetch를 취소하지 않고 그 Promise를 await
    )
  },
})
```

### 깊은 이유 설명

**왜 수동 무효화가 위험한가?**

새로운 리소스가 추가될 때마다 기존의 모든 mutation 콜백을 검토해야 한다. "이 mutation이 새 리소스도 무효화해야 하나?"를 매번 판단하는 것은 실수를 유발한다.

**왜 모든 쿼리 무효화가 합리적인가?**

`staleTime`을 적절히 설정해두면(예: 2분), 빈번한 사용자 인터랙션으로 인한 불필요한 네트워크 요청은 무시할 만한 수준이 된다. 코드 단순성과 빠뜨림 없는 갱신이라는 이점이 약간의 추가 요청보다 크다.
