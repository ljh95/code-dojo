---
id: 23
title: "queryOptions 헬퍼 - Query Factory 패턴으로 타입 안전하게"
tags: ["react-query", "queryOptions", "Query Factory", "타입 안전성"]
difficulty: "medium"
sourceDoc: [25]
---

## 질문

아래 코드는 쿼리 옵션을 객체로 추출해 여러 곳에서 재사용하고 있다.

```ts
const todosQuery = {
  queryKey: ['todos'],
  queryFn: fetchTodos,
  stallTime: 5000, // 오타!
}

// 컴포넌트에서 사용
useQuery(todosQuery)

// loader에서 prefetch
queryClient.prefetchQuery(todosQuery)

// 캐시에서 직접 읽기
const todos = queryClient.getQueryData(['todos'])
//    ^? const todos: unknown
```

1. `stallTime`이라는 오타가 있는데, TypeScript가 왜 이를 잡아내지 못하는가?
2. React Query v5의 `queryOptions` 헬퍼를 사용하면 위 두 문제(오타 감지 + `getQueryData` 타입)가 어떻게 해결되는가?
3. 이 패턴을 확장하여 `todoQueries.list(filters)`, `todoQueries.detail(id)` 형태의 **Query Factory**를 만든다면 어떤 구조가 되는가?

**힌트:** `queryOptions`는 런타임에는 아무것도 하지 않지만, 타입 레벨에서 두 가지 핵심 역할을 한다.

---answer---

## 정답: queryOptions + Query Key Factory = Query Factory

### 핵심 아이디어

React Query v5의 `queryOptions` 헬퍼는 **런타임에는 입력을 그대로 반환**하지만, 타입 레벨에서 (1) 초과 프로퍼티 검사로 오타를 잡고 (2) `queryKey`에 `DataTag`를 부착하여 `getQueryData`의 반환 타입을 자동 추론한다.

### 1. 오타가 잡히지 않는 이유

```ts
// 인라인 객체 → TypeScript가 초과 프로퍼티(excess property) 검사를 수행
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  stallTime: 5000, // ❌ 에러 발생! 'stallTime'은 존재하지 않는 프로퍼티
})

// 변수로 추출한 객체 → TypeScript가 관대해짐 (구조적 타이핑)
const todosQuery = { queryKey: ['todos'], queryFn: fetchTodos, stallTime: 5000 }
useQuery(todosQuery) // ✅ 에러 없음 — 필수 프로퍼티만 만족하면 통과
```

### 2. queryOptions로 해결

```ts
import { queryOptions } from '@tanstack/react-query'

const todosQuery = queryOptions({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  stallTime: 5000, // ❌ 에러! queryOptions가 초과 프로퍼티 검사를 강제
})

// DataTag 덕분에 getQueryData의 타입이 자동 추론됨
const todos = queryClient.getQueryData(todosQuery.queryKey)
//    ^? const todos: Todo[] | undefined  (unknown이 아님!)
```

### 3. Query Factory 패턴

```ts
const todoQueries = {
  // 무효화용 넓은 키
  all: () => ['todos'],
  lists: () => [...todoQueries.all(), 'list'],

  // queryOptions로 감싸면 queryFn + queryKey + 옵션이 함께 묶임
  list: (filters: string) =>
    queryOptions({
      queryKey: [...todoQueries.lists(), filters],
      queryFn: () => fetchTodos(filters),
    }),

  details: () => [...todoQueries.all(), 'detail'],
  detail: (id: number) =>
    queryOptions({
      queryKey: [...todoQueries.details(), id],
      queryFn: () => fetchTodo(id),
      staleTime: 5000,
    }),
}

// 사용 예시
useQuery(todoQueries.list('active'))                      // 컴포넌트
queryClient.prefetchQuery(todoQueries.detail(5))          // loader
queryClient.invalidateQueries({ queryKey: todoQueries.all() }) // 전체 무효화
```

### 깊은 이유 설명

**왜 queryKey와 queryFn을 함께 두는가?**

`queryKey`는 `queryFn`이 의존하는 파라미터를 반영해야 한다. 이 둘을 분리하면 키는 업데이트했는데 함수는 안 바꾸는 실수가 생긴다. `queryOptions`로 묶으면 **co-location**(함께 두기) 원칙이 자연스럽게 지켜진다.

**왜 계층 구조가 필요한가?**

`todoQueries.all()` → `['todos']`로 전체를 무효화하고, `todoQueries.lists()` → `['todos', 'list']`로 목록만 무효화할 수 있다. 하나의 객체에서 **무효화 범위**와 **개별 쿼리 정의**를 모두 관리할 수 있다.
