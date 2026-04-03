---
id: 12
title: "(번역) #11: React Query Error Handling"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/11-react-query-error-handling"
tags: [react-query, 번역, 에러처리]
date: ""
---

> **📌 핵심 요약**
> - React Query 에러 처리는 로컬 상태, 에러 바운더리, 전역 콜백 세 가지를 상황에 맞게 조합해야 한다
> - 키워드: Error Boundary, throwOnError, QueryCache onError, 에러 토스트
> - 이런 상황에서 다시 읽으면 좋다: 에러 처리 전략을 설계하거나 백그라운드 refetch 실패 시 UX를 고민할 때

---

> [TkDodo](https://github.com/tkdodo)의 [React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling)를 번역한 문서입니다.

에러 처리는 비동기 데이터 특히, 데이터를 불러올 때에 있어서 중요한 부분입니다. 우리는 모든 요청이 성공하지 않고 또 모든 Promise가 이행되지 않는다는 점을 명시해야 합니다.

많은 경우에서, 우리는 처음부터 에러 처리에 중점을 두지는 않는 편입니다. 에러 처리는 나중에 고려하고 먼저 "정상적인 케이스"를 처리하는 것이 선호되는 경향이 있습니다.

하지만, 에러를 어떻게 처리할 것인지에 대한 고민이 없다면 사용자 경험에 부정적인 영향을 끼칠 것입니다. 이를 방지하기 위해, React Query가 에러 처리에 어떤 선택지를 제공하는지 알아보겠습니다.

## 전제 조건 (Prerequisites)

React Query에서 에러를 올바르게 처리하기 위해서는 거부된 Promise가 필요합니다. 다행히도, 이는 [axios](https://axios-http.com/) 등의 라이브러리를 사용하면 얻을 수 있는 사항입니다.

만약 [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) 또는 4xx, 5xx와 같은 잘못된 상태 코드에서 거부된 Promise를 제공하지 않는 다른 라이브러리를 사용하는 경우, `queryFn`에서 직접 변환해야 합니다. 이에 대한 내용은 [공식 문서](https://react-query.tanstack.com/guides/query-functions#usage-with-fetch-and-other-clients-that-do-not-throw-by-default)에서 다루고 있습니다.

## 표준 예제 (The standard example)

가장 표준적인 에러 출력 예제를 살펴보겠습니다.

```tsx
function TodoList() {
  const todos = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });

  if (todos.isPending) {
    return "Loading...";
  }

  // ✅ 표준적인 에러 핸들링
  // 다음과 같은 상태도 검사할 수 있습니다: todos.status === 'error'
  if (todos.isError) {
    return "An error occurred";
  }

  return (
    <div>
      {todos.data.map((todo) => (
        <Todo key={todo.id} {...todo} />
      ))}
    </div>
  );
}
```

이 예시에서, 우리는 React Query에서 제공하는 (`status` 이넘에서 제공되는) `isError` 플래그 값을 통해 에러 상황을 다루고 있습니다.

이는 확실히 일부 상황에서는 괜찮은 방법입니다. 하지만 몇 가지 단점도 있습니다.

1. 백그라운드에서의 에러를 잘 처리하지 못합니다. 백그라운드에서 다시 불러오기가 실패했다고해서 할 일 목록 전체를 언마운트 할 필요가 있을까요? 아마도 api가 일시적으로 다운되었거나 요금 제한에 도달했을 수 있으며 몇 분 뒤에 다시 동작할 수도 있습니다. 이러한 상황을 개선하는 방법을 알아보려면 [#4: React Query에서의 상태 확인](https://tkdodo.eu/blog/status-checks-in-react-query)을 참조할 수 있습니다.
2. 만약 useQuery를 사용하는 모든 컴포넌트에서 이러한 처리를 한다면 상당한 보일러플레이트가 필요할 것입니다.

두 번째 이슈는 React 자체에서 제공하는 훌륭한 기능을 사용하여 해결할 수 있습니다.

## 에러 바운더리 (Error Boundaries)

[에러 바운더리](https://reactjs.org/docs/error-boundaries.html#introducing-error-boundaries)는 렌더링 도중에 발생하는 런타임 에러를 잡아내는 React의 일반적인 개념으로, 해당 에러에 적절히 대응하고 대체 UI를 보여줄 수 있도록 해줍니다.

에러 바운더리를 통해 우리가 원하는 범위만큼의 컴포넌트를 감싸고 나머지 UI에는 에러가 영향을 끼치지 않도록 할 수 있기 때문에 이는 멋진 기능입니다.

에러 바운더리가 할 수 없는 한 가지는 비동기 오류를 포착하는 것입니다. 왜냐하면 그러한 오류들은 렌더링 중에 발생하지 않기 때문입니다. 그래서 React Query에서 에러 바운더리가 작동하게 하려면, 해당 라이브러리가 내부적으로 오류를 포착하고 다음 렌더링 사이클에서 그 오류를 다시 던져서 에러 바운더리가 그것을 포착할 수 있도록 합니다.

저는 이러한 방식이 꽤 천재적이면서도 간단한 에러 핸들링 방법이라고 생각합니다. 사용법은 그저 query에 `throwOnError` 플래그를 전달하면 됩니다. (또는 기본 컨피그를 통해 설정할 수도 있습니다.)

```tsx
function TodoList() {
  // ✅ 불러오기 에러를 가장 가까운
  // 에러 바운더리로 전파할 것입니다.
  const todos = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
    throwOnError: true,
  });

  if (todos.data) {
    return (
      <div>
        {todos.data.map((todo) => (
          <Todo key={todo.id} {...todo} />
        ))}
      </div>
    );
  }

  return "Loading...";
}
```

[v3.23.0](https://github.com/TanStack/query/releases/tag/v3.23.0)부터, `throwOnError`에 함수를 제공함으로써 어떤 에러가 에러 바운더리로 전달되어야 하고, 어떤 에러를 로컬에서 처리하고 싶은지를 사용자가 직접 정의할 수 있습니다.

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  // 🚀 오직 서버 에러만 에러 바운더리로 전달됩니다.
  throwOnError: (error) => error.response?.status >= 500,
});
```

이는 [mutations](https://react-query.tanstack.com/guides/mutations)에서도 작동하며 양식 제출과 함께 사용하면 큰 도움이 됩니다. 4xx 대의 에러는 로컬에서 다룰 수 있고 (e.g. 백엔드 유효성 검사 실패 등) 5xx 대의 서버 에러는 에러 바운더리로 전파할 수 있습니다.

> **업데이트 (Update)**
> v5 이전에는, `throwOnError` 플래그는 `useErrorBoundary` 였습니다.

## 에러 알림을 보여주기 (Showing error notifications)

특정 상황에서는, 화면의 일부분에서 출력되는 (그리고 자동으로 사라지는) 에러 토스트 알림을 보여주는 것이 화면에 알림 배너를 보여주는 것 보다 더 나을 수 있습니다. 이는 [react-hot-toast](https://react-hot-toast.com/) 등에서 제공하는 api를 통해 구현할 수 있습니다.

```tsx
import toast from "react-hot-toast";

toast.error("Something went wrong");
```

그렇다면 React Query에서 에러가 발생했을 때 이 작업을 어떻게 할 수 있을까요?

### onError 콜백 (The onError callback)

> **업데이트 (Update)**
> `onError`와 `onSuccess` 콜백은 v5의 `useQuery` 에서 제거되었습니다. 그 이유는 [이 곳](https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose)에서 확인하실 수 있습니다.

```tsx
const useTodos = () =>
  useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
    // ⚠️ 괜찮아보이지만 당신이 원하는게 아닐 수도 있습니다.
    onError: (error) => toast.error(`Something went wrong: ${error.message}`),
  });
```

처음 보면 `onError` 콜백은 데이터 불러오기가 실패할 경우 부수 효과를 내는데 제일 적합한 것으로 보이며, 이는 우리가 커스텀 훅을 오직 한 번만 사용하는 한 제대로 동작할 것으로 보입니다.

`useQuery`의 `onError` 콜백은 모든 `Observer` 별로 실행되며, 만약 하나의 어플리케이션에서 `useTodos`를 두 번 실행하면, 하나의 네트워크 요청이 실패했음에도 두 번의 에러 토스트가 생기게 됩니다.

onError 콜백 함수가 `useEffect`와 개념적으로 비슷하다고 생각하실 수 있을 것 같습니다. 따라서 상위의 예시를 해당 문법으로 확장한다면, 이것이 모든 소비자에 대해 실행될 것임이 더 명확해질 것입니다.

```tsx
const useTodos = () => {
  const todos = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });

  // 🚨 효과는 커스텀 훅을 사용하는 모든 컴포넌트 별로 실행될 것입니다.
  React.useEffect(() => {
    if (todos.error) {
      toast.error(`Something went wrong: ${todos.error.message}`);
    }
  }, [todos.error]);

  return todos;
};
```

물론, 커스텀 훅에 콜백을 추가하지 않고, 훅의 실행 지점에서 사용한다면 문제가 없습니다. 하지만 데이터 불러오기가 실패했다는 것을 모든 옵저버에게 알리고 싶지 않고, 단지 사용자에게 데이터 불러오기가 실패했다는 것을 한 번만 알리고 싶다면 어떨까요? 이를 위해 React Query는 다른 수준의 콜백을 제공합니다.

### 전역 콜백 (The global callbacks)

전역 콜백은 `QueryCache`를 생성할 때 제공되어야 합니다. 이는 `new QueryClient`를 생성할 때 암시적으로 생성되지만 커스텀 할 수 있습니다.

```tsx
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => toast.error(`Something went wrong: ${error.message}`),
  }),
});
```

이 방식은 각각의 쿼리 별로 한 번의 에러 토스트를 출력할 것이며 우리가 정확히 원하던 바입니다. 또한 이는 에러를 추적하거나 모니터링하는 그 어떤 종류의 것을 배치하기에 가장 이상적인 위치입니다. 왜냐하면 각각의 요청 별로 단 한 번만 실행된다는 것이 보장되고 defaultOptions 등에 의해 덮어씌워지지 않기 때문입니다.

## 종합 (Putting it all together)

React Query에서 에러를 처리하는 3가지 주요 방법은 다음과 같습니다.

- useQuery 에서 반환하는 `error` 속성
- `onError` 콜백 (각각의 쿼리 또는 전역 QueryCache / MutationCache)
- 에러 바운더리

이들을 원하는대로 혼합하여 조합할 수 있으며 개인적으로 선호하는 방법은 백그라운드에서 데이터를 다시 불러올 때 에러 토스트를 보여주고 (기존의 UI를 유지하기 위해) 그 외의 모든 것은 로컬에서 처리하거나 에러 바운더리를 사용하는 것 입니다.

```tsx
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // 🎉 캐시에 데이터가 있으면 백그라운드 업데이트가 실패했음을 나타내기 위해 에러 토스트를 보여준다.
      if (query.state.data !== undefined) {
        toast.error(`Something went wrong: ${error.message}`);
      }
    },
  }),
});
```
