---
id: 3
title: "Query Key 의존성 배열 - 자동 refetch 패턴"
tags: ["react-query", "queryKey", "refetch", "의존성배열"]
difficulty: "medium"
sourceDoc: [1]
---

## 질문

아래 코드에서 사용자가 필터를 `"all"`에서 `"done"`으로 변경했을 때, 어떤 일이 일어나는지 설명하시오.

```tsx
type State = "all" | "open" | "done";

const fetchTodos = async (state: State): Promise<Todos> => {
  const response = await axios.get(`todos/${state}`);
  return response.data;
};

export const useTodosQuery = (state: State) =>
  useQuery({
    queryKey: ["todos", state],
    queryFn: () => fetchTodos(state),
  });
```

1. `state`가 `"done"`으로 바뀌면 React Query는 어떤 동작을 하는가?
2. `"done"` 필터로 처음 전환할 때 사용자에게 로딩 스피너가 보이는 이유는 무엇인가?
3. 이 로딩 스피너 문제를 `initialData`로 해결하는 방법을 코드로 작성하시오.

**힌트:** Query Key는 `useEffect`의 의존성 배열과 같은 역할을 한다. 키가 바뀌면 **새로운 캐시 항목**이 생성된다.

---answer---

## 정답: Query Key를 의존성 배열처럼 활용하기

### 핵심 아이디어

React Query는 **Query Key가 변경되면 자동으로 refetch**한다. 이를 `useEffect`의 의존성 배열처럼 활용하면, 수동 refetch 트리거 없이 상태 변화에 반응하는 데이터 페칭을 구현할 수 있다.

### 단계별 해설

**Q1: `state`가 바뀌면 일어나는 일**

`queryKey`가 `["todos", "all"]`에서 `["todos", "done"]`으로 변경된다. React Query는 이를 **다른 쿼리**로 인식하여 새로운 캐시 항목을 생성하고, `queryFn`을 실행하여 데이터를 fetch한다.

**Q2: 로딩 스피너가 보이는 이유**

`["todos", "done"]`이라는 캐시 키에 아직 데이터가 없기 때문이다. 새로운 캐시 항목은 `pending` 상태에서 시작하므로, fetch가 완료될 때까지 하드 로딩 상태가 된다.

**Q3: `initialData`를 활용한 개선**

```tsx
export const useTodosQuery = (state: State) =>
  useQuery({
    queryKey: ["todos", state],
    queryFn: () => fetchTodos(state),
    initialData: () => {
      // "all" 캐시에서 필터링하여 즉시 보여줄 데이터를 제공
      const allTodos = queryClient.getQueryData<Todos>(["todos", "all"]);
      const filteredData =
        allTodos?.filter((todo) => todo.state === state) ?? [];

      return filteredData.length > 0 ? filteredData : undefined;
    },
  });
```

### 깊은 이유 설명

이 패턴의 핵심 원칙은 **`queryFn`에 전달하는 모든 변수를 `queryKey`에 포함시키는 것**이다. 이렇게 하면:

- 수동으로 `refetch()`를 호출하거나 `useEffect`로 조율할 필요가 없다
- 각 필터 조합마다 독립적인 캐시 항목이 생겨, 사용자가 필터를 왔다 갔다 할 때 이전 결과를 즉시 보여줄 수 있다
- `initialData`와 결합하면 **첫 전환 시에도 빈 화면 없이** 임시 데이터를 보여줄 수 있다
