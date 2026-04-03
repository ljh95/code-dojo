---
id: 5
title: "(번역) #5: Testing React Query"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/5-testing-react-query"
tags: [react-query, 번역, 테스팅]
date: ""
---

> 이 문서는 [TkDodo](https://github.com/tkdodo)의 [Testing React Query](https://tkdodo.eu/blog/testing-react-query)를 번역한 문서입니다.

React Query와 함께 테스트하는 방법에 관한 질문이 많이 올라옵니다. 그 이유 중 하나는 "똑똑한" 컴포넌트(또는 [컨테이너 컴포넌트](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0))를 테스트하는 것이 쉽지 않기 때문입니다. Hooks가 등장하면서 이런 분리 방식은 거의 폐기되었습니다. 이제는 props를 통해 값을 내려주는 대신, 특정 위치에서 훅을 직접 사용하는 것이 더 권장됩니다.

이 방식이 코드 가독성 측면에서 대체로 좋은 개선이라고 생각하지만, 이제는 "그저 props"가 아닌 의존성을 소비하는 컴포넌트가 많아졌습니다.

이러한 의존성은 `useContext`, `useSelector`, `useQuery` 등이 될 수 있습니다.

이러한 컴포넌트는 기술적으로 더 이상 순수하지 않습니다. 다른 환경에서 호출하면 다른 결과를 가져올 것이기 때문이죠. 이러한 컴포넌트를 테스트하려면 제대로 동작하도록 하기 위해 주변 환경을 신중하게 설정해야 합니다.

## 네트워크 요청 모킹 (Mocking network requests)

React Query는 비동기 서버 상태 관리 라이브러리이기 때문에, 이를 사용하는 컴포넌트는 백엔드에 요청을 보낼 가능성이 높습니다. 테스트 환경에서는 백엔드가 실제로 데이터를 전달하는 것이 불가능합니다. 가능하다고 하더라도 테스트가 백엔드에 의존성을 갖는 것을 원하지 않을 가능성이 높습니다.

Jest를 통해 데이터를 모킹하는 방법을 다루는 아티클은 정말 많습니다. API 클라이언트를 갖고 있다면 모킹할 수도 있고, fetch나 axios를 직접 모킹할 수도 있습니다. 저는 Kent C. Dodds가 그의 아티클인 ["Stop mocking fetch"](https://kentcdodds.com/blog/stop-mocking-fetch)에서 작성한 다음과 같은 내용에 크게 동의합니다.

[@ApiMocking](https://twitter.com/ApiMocking)의 mock service worker를 사용하세요.

API를 모킹하면 단일 진실 공급원이 될 수 있습니다.

- 테스트를 위해 노드에서 작동합니다.
- REST 및 GraphQL을 지원합니다.
- `useQuery`를 사용하는 스토리를 작성할 수 있는 [storybook addon](https://storybook.js.org/addons/msw-storybook-addon)이 있습니다.
- 브라우저에서 작동하며 브라우저 개발자 도구에서 요청이 진행되는 것을 볼 수 있습니다.
- Cypress의 fixtures와 유사하게 작동합니다.

---

네트워크 레이어가 관리되었으므로 이제 React Query에서 주의해야 할 사항에 대해 이야기할 수 있겠네요.

React Query를 사용할 때마다 `QueryClientProvider`가 필요하며 queryClient를 제공해야 합니다. queryClient는 `QueryCache`를 갖고 있는 보관함입니다. 캐시는 각각의 쿼리 데이터를 보유하게 될 것입니다.

각각의 테스트 별로 `QueryClientProvider`를 제공하고 `new QueryClient`를 생성하는 것을 선호합니다. 이렇게 하면 각각의 테스트는 완벽하게 독립됩니다. 다른 접근 방식으로는 각각의 테스트 이후에 캐시를 지우는 방식도 있겠지만, 테스트 간에 상태를 공유하는 것을 가능하다면 최소화하는 것을 선호합니다. 그렇지 않으면 테스트를 병렬로 실행할 때 예상치 못한 결과를 얻을 수 있습니다.

### 커스텀 훅의 경우 (For custom hooks)

커스텀 훅을 테스트한다면 [react-hooks-testing-library](https://react-hooks-testing-library.com/)를 사용할 것이라고 확신합니다. 가장 쉽게 훅을 테스트할 수 있는 수단이죠. 이 라이브러리를 사용하면 훅을 [wrapper](https://react-hooks-testing-library.com/reference/api#wrapper)로 감쌀 수 있습니다. Wrapper는 렌더링할 때 테스트 컴포넌트를 감싸는 React 컴포넌트입니다. 이 wrapper가 QueryClient를 생성하기에 완벽한 곳이라고 생각합니다. 왜냐하면 각각의 테스트마다 한 번만 실행되기 때문입니다.

```tsx
const createWrapper = () => {
  // ✅ 각각의 테스트마다 새로운 QueryClient를 생성
  const queryClient = new QueryClient();
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('my first test', async () => {
  const { result } = renderHook(() => useCustomHook(), {
    wrapper: createWrapper(),
  });
});
```

### 컴포넌트의 경우 (For components)

`useQuery` 훅을 사용하는 컴포넌트를 테스트하려면, 그 컴포넌트를 `QueryClientProvider`로 감싸야 합니다. [react-testing-library](https://testing-library.com/docs/react-testing-library/intro/)의 `render` 주변에 작은 wrapper를 만드는 게 좋은 선택지일 것 같습니다. React Query가 [자체 테스트](https://github.com/tannerlinsley/react-query/blob/ead2e5dd5237f3d004b66316b5f36af718286d2d/src/react/tests/utils.tsx#L6-L17)에서 하는 방식을 살펴보세요.

## 재시도 기능을 비활성화 하세요 (Turn off retries)

재시도 기능은 React Query와 테스트에서 가장 흔한 "갓챠" 중 하나입니다. React Query는 기본적으로 지수 백오프를 사용하여 세 번의 재시도를 수행하므로 오류가 있는 쿼리를 테스트하면 시간 초과가 발생할 가능성이 높습니다. 재시도 기능을 비활성화하는 가장 쉬운 방법은 `QueryClientProvider`를 통해 할 수 있습니다. 위의 예제를 확장해봅시다.

```tsx
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // ✅ 재시도 기능을 비활성화
        retry: false,
      },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('my first test', async () => {
  const { result } = renderHook(() => useCustomHook(), {
    wrapper: createWrapper(),
  });
});
```

이렇게 하면 컴포넌트 트리 상에 있는 모든 쿼리에서 기본적으로 "재시도 기능이 비활성화"될 것입니다. 이 방식은 `useQuery`에서 명시적으로 재시도 기능이 설정되지 않을 경우에만 작동한다는 것을 꼭 알아야 합니다. 5번의 재시도를 원하는 쿼리가 있다면 더 우선적으로 적용될 것입니다. 왜냐하면 기본 설정은 오직 대체제로 사용될 뿐이니까요.

### setQueryDefaults

이 문제에 대해 제가 드릴 수 있는 최고의 조언은 다음과 같습니다. 이러한 옵션을 `useQuery`에서 직접 설정하지 마세요. 가능한 한 기본값을 사용하고 재정의하려고 노력하고, 특정 쿼리에서 정말로 무언가를 변경해야 한다면 [queryClient.setQueryDefaults](https://react-query.tanstack.com/reference/QueryClient#queryclientsetquerydefaults)를 사용하세요.

예시에서처럼 재시도 기능을 `useQuery`에서 설정하기보다

```tsx
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  );
}

function Example() {
  // 🚨 이 설정을 테스트에서 재정의할 수 없습니다!
  const queryInfo = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    retry: 5,
  });
}
```

이렇게 설정하세요.

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
    },
  },
});

// ✅ 할 일만 재시도를 5번 할 것입니다.
queryClient.setQueryDefaults(['todos'], { retry: 5 });

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  );
}
```

이제 모든 쿼리는 재시도를 2번 할 것이고, 'todos'의 쿼리만 5번 진행할 것입니다. 그리고 테스트에서 모든 쿼리에 대해 이를 비활성화하는 옵션도 가지고 있습니다.

### ReactQueryConfigProvider

물론, 이 기능은 알려진 쿼리키에서만 작동합니다. 때때로 컴포넌트 트리의 일부에서만 구성을 설정하고 싶을 수 있습니다. v2에서 React Query는 정확히 이러한 사용 사례를 위해 [ReactQueryConfigProvider](https://react-query-v2.tanstack.com/docs/api#reactqueryconfigprovider)가 있었습니다. v3에서도 몇 줄의 코드로 동일한 결과를 얻을 수 있습니다.

```tsx
const ReactQueryConfigProvider = ({ children, defaultOptions }) => {
  const client = useQueryClient();
  const [newClient] = React.useState(
    () =>
      new QueryClient({
        queryCache: client.getQueryCache(),
        muationCache: client.getMutationCache(),
        defaultOptions,
      })
  );

  return (
    <QueryClientProvider client={newClient}>
      {children}
    </QueryClientProvider>
  );
};
```

실제 동작은 [codesandbox 예시](https://codesandbox.io/s/react-query-config-provider-v3-lt00f)에서 확인할 수 있습니다.

## 쿼리를 항상 기다리세요 (Always await the query)

React Query는 본질적으로 비동기이므로, 훅을 실행하면 결과를 바로 얻지 않습니다. 대부분의 경우에서 로딩 상태일 것이며 데이터가 없을 것입니다. react-hooks-testing-library가 제공하는 [비동기 유틸리티](https://react-hooks-testing-library.com/reference/api#async-utilities)는 이 문제를 해결하는 다양한 방법을 제공합니다. 가장 간단한 경우에는 쿼리가 성공 상태로 전환될 때까지 기다릴 수 있습니다.

```tsx
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('my first test', async () => {
  const { result, waitFor } = renderHook(() => useCustomHook(), {
    wrapper: createWrapper(),
  });

  // ✅ 쿼리가 성공 상태로 전환될 때까지 기다립니다.
  await waitFor(() => result.current.isSuccess);

  expect(result.current.data).toBeDefined();
});
```

> **Update**
>
> [@testing-library/react v13.1.0](https://github.com/testing-library/react-testing-library/releases/tag/v13.1.0)에는 새로운 [renderHook](https://testing-library.com/docs/react-testing-library/api/#renderhook)이 있습니다. 하지만 자체적으로 `waitFor` 유틸을 반환하지 않기 때문에 [@testing-library/react 로부터 불러와야 합니다](https://testing-library.com/docs/dom-testing-library/api-async/#waitfor). API는 `boolean`을 반환하는 것을 허용하지 않고 `Promise`를 기대하기 때문에 조금 다릅니다. 이는 코드를 약간 조정해야 한다는 것을 의미합니다.

```tsx
import { waitFor, renderHook } from '@testing-library/react';

test('my first test', async () => {
  const { result } = renderHook(() => useCustomHook(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => {
    return result.current.isSuccess;
  });

  expect(result.current.data).toBeDefined();
});
```

## 모두 사용하기 (Putting it all together)

이제 위의 모든 개념을 함께 사용하여 React Query 훅을 테스트하는 방법을 보여드리겠습니다.

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('my first test', async () => {
  const { result } = renderHook(() => useCustomHook(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => {
    return result.current.isSuccess;
  });

  expect(result.current.data).toBeDefined();
});
```

이것이 React Query를 테스트하기 위한 기본적인 설정입니다. 이 패턴을 따르면 안정적이고 효율적인 테스트를 작성할 수 있습니다.
