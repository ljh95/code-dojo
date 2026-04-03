---
id: 9
title: "(번역) #8a: Leveraging the Query Function Context"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/8a-leveraging-the-query-function-context"
tags: [react-query, 번역, queryFn]
date: ""
---

> **📌 핵심 요약**
> - queryFn에 클로저 대신 QueryFunctionContext를 활용하면 queryKey와 매개변수의 동기화 누락을 원천 차단할 수 있다
> - 키워드: QueryFunctionContext, 쿼리 키 팩토리, 타입 안전성, 인라인 함수, 객체 키
> - 이런 상황에서 다시 읽으면 좋다: queryFn에 전달하는 매개변수가 많아져서 queryKey와 싱크가 안 맞을 때

---

> **역자 노트**: TkDodo의 "Leveraging the Query Function Context"를 번역한 문서입니다.

우리는 모두 엔지니어로서 개선을 목표로 하며, 시간이 지날수록 이러한 노력이 성공하기를 희망합니다. 새로운 개념을 배우거나 기존 패턴의 한계를 인식하게 됩니다.

React Query를 오랫동안 사용하면서 많은 것을 배웠습니다. 블로그 콘텐츠를 최신 상태로 유지하는 것이 중요한데, 특히 React Query 공식 문서에 제 블로그가 링크되어 있기 때문입니다.

따라서 "Effective React Query keys" 글의 추가 자료로 이 글을 작성하게 되었습니다.

## 논란이 될 수 있는 의견 (Hot take)

> 인라인 함수를 사용하지 마세요
>
> Query Function Context를 활용하고 객체 키를 생성하는 쿼리 키 팩토리를 사용하세요.

인라인 함수는 `queryFn`에 매개변수를 전달하는 가장 쉬운 방법입니다. 클로저로 사용 가능한 다른 변수를 활용할 수 있기 때문입니다.

```tsx
type State = 'all' | 'open' | 'done';
type Todo = {
  id: number;
  state: State;
};
type Todos = ReadonlyArray<Todo>;

const fetchTodos = async (state: State): Promise<Todos> => {
  const response = await axios.get(`todos/${state}`);
  return response.data;
};

export const useTodos = ({ state } = {}) => {
  const { state } = useTodoParams();

  return useQuery({
    queryKey: ['todos', state],
    queryFn: () => fetchTodos(state),
  });
};
```

이 예는 "Practical React Query" 글의 변형입니다. 간단한 예에서는 잘 작동하지만, 많은 매개변수가 있으면 문제가 됩니다. 대규모 앱에서는 10개 이상의 필터와 정렬 옵션이 있을 수 있습니다.

정렬을 추가하는 경우를 생각해봅시다:

```tsx
type Sorting = 'dateCreated' | 'name';

const fetchTodos = async (
  state: State,
  sorting: Sorting
): Promise<Todos> => {
  const response = await axios.get(
    `todos/${state}?sorting=${sorting}`
  );
  return response.data;
};
```

이는 커스텀 훅의 `fetchTodos` 호출에서 에러를 일으킵니다:

```tsx
export const useTodos = () => {
  const { state, sorting } = useTodoParams();

  // 🚨 실수가 보이시나요? ⬇️
  return useQuery({
    queryKey: ['todos', state],
    queryFn: () => fetchTodos(state, sorting),
  });
};
```

`queryKey`가 실제 의존성과 동기화되지 않았으나 경고가 없습니다. 정렬 기준을 변경해도 데이터를 자동으로 다시 불러오지 않을 것입니다. React가 `react-hooks/exhaustive-deps` eslint 규칙을 제공하는 이유가 이 문제를 피하기 위함입니다.

React Query도 자체 eslint 규칙이 필요할까요? 선택지 중 하나는 babel-plugin-react-query-key-gen입니다. 하지만 React Query는 다른 방식으로 의존성을 처리합니다: `QueryFunctionContext`입니다.

> **업데이트**: 앞서 언급한 린트 규칙이 출시되었습니다. [문서](https://tanstack.com/query/v4/docs/react/eslint/eslint-plugin-query)를 읽어주세요.

## QueryFunctionContext

`QueryFunctionContext`는 `queryFn`에 매개변수로 전달되는 객체입니다. Infinite 쿼리를 사용할 때 이미 접했을 것입니다:

```tsx
// 이게 QueryFunctionContext 입니다 ⬇️
const fetchProjects = ({ pageParam }) =>
  fetch('/api/projects?cursor=' + pageParam);

useInfiniteQuery({
  queryKey: ['projects'],
  queryFn: fetchProjects,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  initialPageParam: 0,
});
```

React Query는 쿼리 정보를 `queryFn`에 주입할 때 이 객체를 사용합니다. Infinite 쿼리의 경우, `getNextPageParam`의 반환값이 `pageParam`에 주입됩니다.

그런데 컨텍스트에는 이 쿼리에서 사용되는 `queryKey`도 포함됩니다. 따라서 클로저를 사용할 필요가 없습니다:

```tsx
const fetchTodos = async ({ queryKey }) => {
  // 🚀 queryKey로부터 모든 매개변수를 가져올 수 있습니다.
  const [, state, sorting] = queryKey;
  const response = await axios.get(
    `todos/${state}?sorting=${sorting}`
  );
  return response.data;
};

export const useTodos = () => {
  const { state, sorting } = useTodoParams();

  // ✅ 매개변수를 수동으로 제공할 필요가 없습니다.
  return useQuery({
    queryKey: ['todos', state, sorting],
    queryFn: fetchTodos,
  });
};
```

이 방법을 사용하면, 추가적인 매개변수를 `queryFn`에 적용하는 것은 `queryKey`에 추가하는 방법으로만 가능합니다.

## QueryFunctionContext에 타입을 지정하는 방법

목표 중 하나는 완전한 타입 안정성을 확보하고, `useQuery`에 전달된 `queryKey`로부터 `QueryFunctionContext`의 타입을 추론하는 것입니다. React Query는 v3.13.3부터 이를 지원하기 시작했습니다. `queryFn`을 인라인으로 작성하면 타입이 적절하게 추론됩니다:

```tsx
export const useTodos = () => {
  const { state, sorting } = useTodoParams();

  return useQuery({
    queryKey: ['todos', state, sorting] as const,
    queryFn: async ({ queryKey }) => {
      const response = await axios.get(
        // ✅ queryKey가 튜플이기 때문에 안전합니다
        `todos/${queryKey[1]}?sorting=${queryKey[2]}`,
      );
      return response.data;
    },
  });
};
```

이 방법은 좋지만 몇 가지 결함이 있습니다:

- 여전히 클로저 내부의 것을 사용할 수 있습니다.
- `queryKey`를 사용하여 URL을 작성하는 것은 완전히 안전하지 않습니다 (모든 것이 문자열로 변환 가능).

## 쿼리 키 팩토리 (Query Key Factories)

쿼리 키 팩토리가 다시 등장합니다. 타입 안정성이 확보된 쿼리 키 팩토리를 통해 키를 구성하면, 해당 팩토리의 반환 타입을 가지고 `QueryFunctionContext`의 타입을 지정할 수 있습니다:

```tsx
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (state: State, sorting: Sorting) =>
    [...todoKeys.lists(), state, sorting] as const,
};

const fetchTodos = async ({
  queryKey,
}: // 🤯 팩토리의 키만 허용합니다
QueryFunctionContext<ReturnType<typeof todoKeys['list']>>) => {
  const [, , state, sorting] = queryKey;
  const response = await axios.get(
    `todos/${state}?sorting=${sorting}`
  );
  return response.data;
};

export const useTodos = () => {
  const { state, sorting } = useTodoParams();

  return useQuery({
    queryKey: todoKeys.list(state, sorting),
    queryFn: fetchTodos,
  });
};
```

`QueryFunctionContext` 타입은 React Query가 export하는 값으로, `queryKey`의 타입을 정의하는 한 개의 제네릭을 받습니다. 위 예제에서는 키 팩토리의 `list` 함수가 반환하는 값과 동일하게 설정했습니다. Const assertions를 사용하기 때문에, 모든 키는 엄격하게 타입이 지정된 튜플이 될 것입니다.

## 객체 쿼리 키 (Object Query Keys)

이 접근 방식으로 전환하는 과정에서, 배열로 된 키가 그렇게 잘 동작하지 않는다는 것을 알아차렸습니다. 특히 쿼리 키를 구조 분해할 때 명확해집니다:

```tsx
const [, , state, sorting] = queryKey;
```

처음 두 부분은 공백으로 두고 동적인 부분만 남겨뒀습니다. 이는 다른 스코프를 추가할 때 URL이 잘못 생성될 수 있습니다.

## 이 방식은 가치가 있을까요?

완전히 타입 안전한 접근 방식을 원한다면, 객체 쿼리 키를 사용할 수 있습니다. 이렇게 하면 구조 분해가 더 명확해집니다:

```tsx
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (state: State, sorting: Sorting) =>
    [
      ...todoKeys.lists(),
      { state, sorting },
    ] as const,
};

const fetchTodos = async ({
  queryKey,
}: QueryFunctionContext<ReturnType<typeof todoKeys['list']>>) => {
  const [, , params] = queryKey;
  const { state, sorting } = params;
  const response = await axios.get(
    `todos/${state}?sorting=${sorting}`
  );
  return response.data;
};
```

이렇게 하면 코드의 명확성이 높아지고, `params` 객체의 타입이 완벽하게 보장됩니다. 더 이상 인덱스로 접근하거나 순서에 신경 쓸 필요가 없습니다.
