---
id: 18
title: "리스트 캐시로 상세 데이터 채우기 - Pull vs Push 접근법"
tags: ["react-query", "initialData", "캐시", "성능최적화"]
difficulty: "medium"
sourceDoc: [18]
---

## 질문

아래는 할 일 목록(list)의 캐시 데이터를 사용해 상세(detail) 쿼리의 초기 데이터를 설정하는 코드이다. 이 패턴의 **동작과 주의점**을 파악하고 질문에 답해보자.

```tsx
// Pull 접근법
const useTodo = (id: number) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["todos", "detail", id],
    queryFn: () => fetchTodo(id),
    initialData: () => {
      return queryClient
        .getQueryData(["todos", "list"])
        ?.find((todo) => todo.id === id);
    },
  });
};
```

1. 이 코드에서 `staleTime`을 설정하면 어떤 문제가 발생할 수 있는가? 리스트를 20분 전에 가져온 경우를 생각해보자.
2. 이 문제를 해결하기 위해 `initialDataUpdatedAt`을 어떻게 사용하는가?
3. 반대로 리스트 쿼리의 `queryFn`에서 `setQueryData`로 상세 캐시를 미리 만드는 **Push 접근법**의 장단점은 무엇인가?

**힌트:** `initialData`는 캐시에 저장되며 fresh로 간주된다는 점, 그리고 Push로 만든 비활성 쿼리는 가비지 컬렉팅될 수 있다는 점을 기억하자.

---answer---

## 정답: initialData + initialDataUpdatedAt 패턴

### 핵심 아이디어

리스트 캐시에서 상세 데이터의 초기값을 꺼내오면 사용자가 즉시 데이터를 볼 수 있다. 단, **initialData는 캐시에 저장되고 fresh로 간주**되므로, 실제 데이터의 신선도를 `initialDataUpdatedAt`으로 알려줘야 정확한 refetch 판단이 가능하다.

### 단계별 해설

**1. staleTime과 initialData의 함정**

`initialData`가 설정되면 React Query는 이 데이터를 캐시에 저장하고 **지금 막 가져온 것처럼 fresh하다고 판단**한다. `staleTime: 5 * 60 * 1000`이면 5분간 refetch하지 않는다. 하지만 실제로 리스트를 20분 전에 가져왔다면, **20분 전 데이터를 5분간 그대로 보여주는 셈**이다.

**2. initialDataUpdatedAt으로 해결**

```tsx
const useTodo = (id: number) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["todos", "detail", id],
    queryFn: () => fetchTodo(id),
    initialData: () => {
      return queryClient
        .getQueryData(["todos", "list"])
        ?.find((todo) => todo.id === id);
    },
    // 리스트가 마지막으로 fetch된 시간을 전달
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(["todos", "list"])?.dataUpdatedAt,
  });
};
```

`initialDataUpdatedAt`에 리스트의 `dataUpdatedAt` 시간을 전달하면, React Query가 **initialData가 실제로 언제 가져온 것인지** 정확히 판단한다. 리스트가 20분 전에 가져온 것이라면 즉시 stale로 판단하고 백그라운드 refetch를 시작한다.

**3. Push 접근법 비교**

```js
// Push 접근법: 리스트 fetch 시 상세 캐시를 미리 생성
const useTodos = () => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["todos", "list"],
    queryFn: async () => {
      const todos = await fetchTodos();
      todos.forEach((todo) => {
        queryClient.setQueryData(["todos", "detail", todo.id], todo);
      });
      return todos;
    },
  });
};
```

| | Pull (initialData) | Push (setQueryData) |
|---|---|---|
| staleness | 수동으로 `initialDataUpdatedAt` 설정 필요 | 자동으로 적용됨 |
| 타이밍 | 상세 쿼리가 필요한 시점에 캐시 조회 | 리스트 fetch 시 즉시 생성 |
| 불필요한 캐시 | 필요한 것만 조회 | 리스트의 모든 항목에 대해 생성 |
| 가비지 컬렉팅 | 해당 없음 | observer가 없으면 기본 5분 후 제거됨 |

### 깊은 이유 설명

Pull 접근법은 **"필요할 때 꺼내 쓴다"**는 점에서 효율적이지만, staleness 처리를 직접 해야 한다. Push 접근법은 staleness가 자동으로 관리되지만, 불필요한 캐시 엔트리가 생기고 사용자가 상세 페이지에 도달하기 전에 가비지 컬렉팅될 수 있다. **상황에 따라 적합한 접근법이 다르며**, 상세 데이터가 리스트 데이터와 구조적으로 다르다면 `placeholderData`를 대신 사용하는 것이 더 적합하다.
