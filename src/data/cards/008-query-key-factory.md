---
id: 8
title: "Query Key Factory - 체계적인 키 관리"
tags: ["react-query", "쿼리키", "팩토리 패턴", "캐시 무효화"]
difficulty: "medium"
sourceDoc: [8]
---

## 질문

아래는 할 일 관리 앱에서 쿼리 키를 사용하는 코드이다.
**설계 문제점**을 파악하고 질문에 답해보자.

```tsx
// TodoList.tsx
function useTodos(filters: string) {
  return useQuery({
    queryKey: ['todos', 'list', { filters }],
    queryFn: () => fetchTodos(filters),
  });
}

// TodoDetail.tsx
function useTodo(id: number) {
  return useQuery({
    queryKey: ['todos', 'detail', id],
    queryFn: () => fetchTodo(id),
  });
}

// useUpdateTitle.ts
function useUpdateTitle() {
  return useMutation({
    mutationFn: updateTitle,
    onSuccess: (newTodo) => {
      queryClient.setQueryData(
        ['todos', 'detail', newTodo.id], newTodo
      );
      queryClient.invalidateQueries({
        queryKey: ['todos', 'list'],
      });
    },
  });
}
```

1. 쿼리 키 문자열이 여러 파일에 흩어져 있을 때 어떤 문제가 발생할 수 있는가?
2. 이 코드를 **Query Key Factory** 패턴으로 리팩토링한다면 어떤 구조가 되는가?
3. 팩토리 패턴에서 `as const`를 사용하는 이유는 무엇인가?

**힌트:** `['todos', 'list']`와 `['todos', 'detail']`의 관계를 계층적으로 생각해보자.

---answer---

## 정답: Query Key Factory 패턴

### 핵심 아이디어

쿼리 키를 **하나의 팩토리 객체**로 집중 관리하면, 키 오타 방지, 계층적 무효화, 타입 안정성을 모두 확보할 수 있다. 각 레벨이 상위 레벨 위에서 빌드되므로 구조 변경 시 한 곳만 수정하면 된다.

### Query Key Factory 구현

```tsx
// todoKeys.ts
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};
```

### 리팩토링된 사용부

```tsx
// TodoList.tsx
function useTodos(filters: string) {
  return useQuery({
    queryKey: todoKeys.list(filters),
    queryFn: () => fetchTodos(filters),
  });
}

// TodoDetail.tsx
function useTodo(id: number) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => fetchTodo(id),
  });
}

// useUpdateTitle.ts
function useUpdateTitle() {
  return useMutation({
    mutationFn: updateTitle,
    onSuccess: (newTodo) => {
      // ✅ 특정 상세 캐시 업데이트
      queryClient.setQueryData(todoKeys.detail(newTodo.id), newTodo);
      // ✅ 모든 목록 무효화
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
}

// 🔥 모든 todo 관련 캐시 무효화도 가능
queryClient.invalidateQueries({ queryKey: todoKeys.all });
```

### 깊은 이유 설명

**문자열 키가 흩어지면 생기는 문제:**
- 오타 발생 시 런타임에서야 발견된다 (`'todos'` vs `'todo'`).
- 키 구조를 변경하려면 모든 파일을 찾아 수정해야 한다.
- 계층적 무효화 범위를 파악하기 어렵다.

**`as const`를 사용하는 이유:**
- `as const` 없이는 `['todos', 'list']`가 `string[]`으로 추론된다.
- `as const`를 사용하면 `readonly ['todos', 'list']`라는 **튜플 타입**이 되어, `QueryFunctionContext`에서 각 위치의 타입을 정확히 알 수 있다.
- 이는 `queryFn`에서 `queryKey`를 구조 분해할 때 타입 안정성을 보장한다.

**계층 구조의 이점:**
- `todoKeys.all` — 모든 todo 관련 쿼리 무효화
- `todoKeys.lists()` — 모든 목록 쿼리만 무효화
- `todoKeys.list('done')` — 특정 필터의 목록만 대상
- `todoKeys.detail(1)` — 특정 항목만 대상
