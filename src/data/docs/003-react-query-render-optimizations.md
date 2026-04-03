---
id: 3
title: "(번역) #3: React Query Render Optimizations"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/3-react-query-render-optimizations"
tags: [react-query, 번역, 렌더링최적화]
date: ""
---

> **📌 핵심 요약**
> - React Query는 tracked queries와 구조적 공유(structural sharing)를 통해 불필요한 리렌더링을 자동으로 줄여주며, 수동 최적화보다 이 기본 메커니즘을 이해하는 것이 중요하다
> - 키워드: notifyOnChangeProps, tracked queries, structural sharing, isFetching, 참조동일성
> - 이런 상황에서 다시 읽으면 좋다: 데이터가 안 바뀌었는데 리렌더링이 발생하는 이유가 궁금할 때

---

> **알립니다.**
>
> "렌더링 최적화는 모든 어플리케이션에 있어서 고급 개념"이며 React Query는 이미 좋은 수준의 기본값을 제공합니다. 불필요한 리렌더링보다 "꼭 이루어져야할 렌더링이 누락되는 것"을 더 지양해야 합니다.

추가 학습 자료:

- [Fix the slow render before you fix the re-render](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render) by Kent C. Dodds
- [Premature optimizations article](https://reacttraining.com/blog/react-inline-functions-and-performance) by @ryanflorence

이전 글인 [#2: React Query 데이터 변환](https://tkdodo.eu/blog/react-query-data-transformations)에서 select 옵션을 설명했을 때 렌더링 최적화를 언급했습니다. 그러나 자주 받는 질문은 "데이터가 변하지 않았는데 왜 React Query가 컴포넌트를 두 번 리렌더링하나요?"입니다.

## isFetching 전환

지난 글의 예시를 다시 보면:

```tsx
export const useTodosQuery = (select) =>
  useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    select,
  });

export const useTodosCount = () =>
  useTodosQuery((data) => data.length);

function TodosCount() {
  const todosCount = useTodosCount();

  return <div>{todosCount.data}</div>;
}
```

백그라운드에서 데이터를 다시 불러올 때마다 이 컴포넌트는 두 번 리렌더링합니다:

```tsx
{ status: 'success', data: 2, isFetching: true }
{ status: 'success', data: 2, isFetching: false }
```

React Query는 각 쿼리마다 많은 메타 정보를 반환하며 `isFetching`도 그 중 하나입니다. 이 플래그는 백그라운드 로딩 표시에 유용하지만, 그 외에는 불필요할 수 있습니다.

### notifyOnChangeProps

이 사용 사례를 위해 React Query는 `notifyOnChangeProps` 옵션을 제공합니다. 옵저버별로 설정 가능하며, 특정 props가 변경되었을 때만 알리도록 구성할 수 있습니다. `['data']`로 설정하면 원하는 최적화를 얻을 수 있습니다:

```tsx
export const useTodosQuery = (select, notifyOnChangeProps) =>
  useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    select,
    notifyOnChangeProps,
  });

export const useTodosCount = () =>
  useTodosQuery((data) => data.length, ['data']);
```

실제 동작은 공식 문서의 [optimistic-updates-typescript 예시](https://github.com/tannerlinsley/react-query/blob/9023b0d1f01567161a8c13da5d8d551a324d6c23/examples/optimistic-updates-typescript/pages/index.tsx#L35-L48)에서 볼 수 있습니다.

### 동기화가 된 채로 유지 (Staying in sync)

위 코드가 동작은 잘 할지 몰라도 동기화는 쉽게 깨질 수 있습니다. 만약 `error`에도 대응하거나 `isLoading` 플래그를 사용하기 시작했다면, 컴포넌트에서 실제로 사용하는 필드를 `notifyOnChangeProps` 배열에 계속 동기화해야 합니다.

이를 잊었다면, `data`만 관찰하다가 새로운 `error`를 받아도 컴포넌트는 리렌더링하지 않아 최신성을 잃습니다. 커스텀 훅에서 하드 코딩되어 있을 경우 특히 문제가 됩니다:

```tsx
export const useTodosCount = () =>
  useTodosQuery((data) => data.length, ['data']);

function TodosCount() {
  // 🚨 error를 사용하고 있습니다.
  // 하지만 error가 변경되었는지는 알 수 없습니다!
  const { error, data } = useTodosCount();

  return (
    <div>
      {error ? error : null}
      {data ? data : null}
    </div>
  );
}
```

이는 불필요한 리렌더링보다 훨씬 더 좋지 않습니다. 수동적이고 보일러플레이트 같습니다. 자동으로 할 수는 없을까요?

### 추적되는 쿼리 (Tracked Queries)

이 기능이 꽤 자랑스럽습니다. 이 라이브러리에 대한 저의 첫 기여이기 때문이죠. `notifyOnChangeProps`를 `'tracked'`로 설정하면 React Query는 렌더링 과정에서 현재 사용 중인 필드를 추적하며 목록을 자동으로 계산합니다.

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      notifyOnChangeProps: 'tracked',
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  );
}
```

이를 통해 리렌더링 중복을 신경쓸 필요가 없습니다. 그러나 추적은 성능에 약간 부담을 주므로 현명하게 사용하세요. 또한 몇 가지 한계가 있습니다:

- [Rest 구조분해할당](https://github.com/tc39/proposal-object-rest-spread/blob/6ee4ce3cdda246746fc46fb149bb8b43c28e704d/Rest.md)을 사용하면 모든 필드를 효율적으로 관찰할 수 있습니다:

```tsx
// 🚨 모든 필드를 추적할 것입니다
const { isLoading, ...queryInfo } = useQuery(...)

// ✅ 완전히 괜찮습니다
const { isLoading, data } = useQuery(...)
```

- 추적되는 쿼리는 렌더링 할 때마다만 동작합니다. useEffect 등 effect 과정에서만 접근하는 필드는 추적되지 않습니다:

```tsx
const queryInfo = useQuery(...)

// 🚨 data를 올바르게 추적하지 않을 것입니다
React.useEffect(() => {
  console.log(queryInfo.data)
})

// ✅ 렌더링 과정에서 의존성 배열에 접근하므로 괜찮습니다
React.useEffect(() => {
  console.log(queryInfo.data)
}, [queryInfo.data])
```

- 추적되는 쿼리는 렌더링 할 때마다 초기화되지 않습니다. 한 번 추적하면 옵저버의 생명 주기 동안 계속 추적할 것입니다:

```tsx
const queryInfo = useQuery(...)

if (someCondition()) {
  // 🟡 이전 렌더링에서 someCondition이 true였으면 data를 추적할 것입니다
  return <div>{queryInfo.data}</div>
}
```

> **업데이트**
>
> React Query v4부터 추적되는 쿼리는 기본값이 됩니다. `notifyOnChangeProps: 'all'`로 설정하여 비활성화할 수 있습니다.

## 구조적인 공유 (Structural sharing)

React Query에서 기본적으로 활성화된 또 다른 렌더링 최적화는 "구조적인 공유"입니다. 이 기능은 모든 수준에서 `data`의 참조적 동일성을 유지합니다. 예를 들어:

```tsx
[
  { id: 1, name: 'Learn React', status: 'active' },
  { id: 2, name: 'Learn React Query', status: 'todo' },
];
```

첫 번째 할 일이 완료 상태로 변경되어 백그라운드에서 데이터를 다시 불러온다고 가정합니다:

```tsx
[
  -{ id: 1, name: 'Learn React', status: 'active' },
  +{ id: 1, name: 'Learn React', status: 'done' },
  { id: 2, name: 'Learn React Query', status: 'todo' },
];
```

React Query는 이전 상태와 새로운 상태를 비교하여 최대한 이전 상태를 유지합니다. 배열은 새로운 데이터이고(업데이트됨), id 1의 객체도 새로운 데이터입니다. 그러나 id 2의 객체는 이전 상태와 동일한 참조를 유지합니다.

이는 부분적 구독 셀렉터 사용 시 매우 유용합니다:

```tsx
// ✅ id:2를 가진 할 일 데이터 내부에 있는 어떤 것이 변할 경우에만 리렌더링 할 것입니다
// 이는 구조적인 공유 덕분입니다
const { data } = useTodo(2);
```

셀렉터에서는 구조적인 공유가 2번 이루어집니다. 하나는 `queryFn` 반환 결과를 검사할 때이고, 다른 하나는 셀렉터 함수에서 결과가 반환될 때입니다.

큰 자료구조를 다룰 경우 구조적인 공유가 병목현상으로 작용할 수 있습니다. 또한 이 기능은 JSON 직렬화 가능한 데이터에서만 동작합니다. 필요 없다면 쿼리에서 `structuralSharing: false`로 설정할 수 있습니다.

자세한 내용은 [replaceEqualDeep tests](https://github.com/tannerlinsley/react-query/blob/80cecef22c3e088d6cd9f8fbc5cd9e2c0aab962f/src%2Fcore%2Ftests%2Futils.test.tsx#L97-L304)를 참고하세요.
