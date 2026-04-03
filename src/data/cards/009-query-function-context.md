---
id: 9
title: "QueryFunctionContext - queryKey로 매개변수 전달"
tags: ["react-query", "QueryFunctionContext", "타입 안정성", "쿼리키"]
difficulty: "medium"
sourceDoc: [9, 8]
---

## 질문

아래 코드는 필터와 정렬 기능이 있는 할 일 목록 쿼리이다.
**숨겨진 버그**를 찾고 질문에 답해보자.

```tsx
const fetchTodos = async (
  state: State,
  sorting: Sorting
): Promise<Todos> => {
  const response = await axios.get(
    `todos/${state}?sorting=${sorting}`
  );
  return response.data;
};

export const useTodos = () => {
  const { state, sorting } = useTodoParams();

  return useQuery({
    queryKey: ['todos', state],
    queryFn: () => fetchTodos(state, sorting),
  });
};
```

1. 이 코드에서 `sorting`을 변경하면 어떤 일이 발생하는가? 왜 그런가?
2. 이 문제를 **QueryFunctionContext**를 활용하여 해결한다면 코드가 어떻게 바뀌는가?
3. 이 접근법이 클로저 기반 인라인 함수보다 나은 이유는 무엇인가?

**힌트:** `queryKey`는 React Query의 의존성 배열과 같은 역할을 한다. `useEffect`의 deps 배열에 빠진 값이 있을 때와 같은 문제를 떠올려보자.

---answer---

## 정답: QueryFunctionContext로 queryKey-queryFn 동기화

### 핵심 아이디어

`queryKey`에 포함되지 않은 매개변수를 클로저로 `queryFn`에 전달하면, **해당 값이 변경되어도 쿼리가 자동으로 다시 실행되지 않는다.** `QueryFunctionContext`를 활용하면 모든 매개변수가 반드시 `queryKey`를 통해 전달되므로 이 문제가 구조적으로 방지된다.

### 버그 분석

```tsx
// 🚨 sorting이 queryKey에 없다!
queryKey: ['todos', state],
queryFn: () => fetchTodos(state, sorting),
```

`sorting`이 변경되어도 `queryKey`는 동일하므로 React Query는 데이터를 다시 불러오지 않는다. 사용자가 정렬 기준을 바꿔도 **이전 데이터가 그대로 표시**된다.

### QueryFunctionContext를 활용한 해결

```tsx
const fetchTodos = async ({
  queryKey,
}: QueryFunctionContext<ReturnType<typeof todoKeys['list']>>) => {
  const [, , { state, sorting }] = queryKey;
  const response = await axios.get(
    `todos/${state}?sorting=${sorting}`
  );
  return response.data;
};

// 쿼리 키 팩토리
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (state: State, sorting: Sorting) =>
    [...todoKeys.lists(), { state, sorting }] as const,
};

export const useTodos = () => {
  const { state, sorting } = useTodoParams();

  // ✅ 매개변수를 queryFn에 직접 전달하지 않는다
  return useQuery({
    queryKey: todoKeys.list(state, sorting),
    queryFn: fetchTodos,
  });
};
```

### 깊은 이유 설명

**클로저 방식의 근본적 문제:**
- `queryKey`와 `queryFn`의 매개변수가 **별도로 관리**되므로 동기화가 깨질 수 있다.
- React의 `useEffect` deps 배열 누락과 동일한 유형의 버그이지만, ESLint가 감지하지 못한다.
- 매개변수가 많아질수록 누락 위험이 급격히 증가한다.

**QueryFunctionContext 방식의 이점:**
- 매개변수를 추가하는 **유일한 방법이 queryKey에 추가하는 것**이므로 동기화가 구조적으로 보장된다.
- 쿼리 키 팩토리와 결합하면 `QueryFunctionContext`의 타입이 자동으로 추론된다.
- 객체 키를 사용하면 구조 분해 시 순서에 의존하지 않아 가독성이 높아진다.
