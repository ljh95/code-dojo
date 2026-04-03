---
id: 6
title: "React Query 테스트 설정 - 흔한 실수 피하기"
tags: ["react-query", "테스팅", "QueryClient", "retry"]
difficulty: "easy"
sourceDoc: [5]
---

## 질문

React Query 훅을 테스트하는 아래 코드에 **2가지 문제**가 있다. 찾아서 수정하시오.

```tsx
// ❌ 문제가 있는 테스트 코드
const queryClient = new QueryClient();

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

test('todos를 가져온다', async () => {
  const { result } = renderHook(() => useTodos(), { wrapper });

  expect(result.current.data).toEqual([{ id: 1, name: 'Test' }]);
});

test('에러를 처리한다', async () => {
  server.use(errorHandler);
  const { result } = renderHook(() => useTodos(), { wrapper });

  await waitFor(() => result.current.isError);

  expect(result.current.error).toBeDefined();
});
```

1. `queryClient`를 테스트 파일 상단에서 한 번만 생성하면 어떤 문제가 발생하는가?
2. 에러 테스트에서 `waitFor`가 타임아웃되는 이유는 무엇인가?

**힌트:** React Query의 기본 설정에서 **재시도 횟수**와 **캐시 공유** 문제를 생각해보자.

---answer---

## 정답: 테스트별 QueryClient 생성 + retry 비활성화

### 핵심 아이디어

React Query 테스트에서 가장 흔한 실수 두 가지는 **(1) 테스트 간 캐시를 공유하는 것**과 **(2) 재시도 기능을 비활성화하지 않는 것**이다.

### 수정된 코드

```tsx
// ✅ 수정된 테스트 코드
const createWrapper = () => {
  // 각 테스트마다 새로운 QueryClient를 생성
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // 테스트에서 재시도 비활성화
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

test('todos를 가져온다', async () => {
  const { result } = renderHook(() => useTodos(), {
    wrapper: createWrapper(),
  });

  // 비동기 결과를 기다려야 한다
  await waitFor(() => result.current.isSuccess);

  expect(result.current.data).toEqual([{ id: 1, name: 'Test' }]);
});

test('에러를 처리한다', async () => {
  server.use(errorHandler);
  const { result } = renderHook(() => useTodos(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => result.current.isError);

  expect(result.current.error).toBeDefined();
});
```

### 각 문제 해설

**문제 1: 캐시 공유**

`queryClient`를 파일 상단에서 한 번만 생성하면, 모든 테스트가 **동일한 캐시를 공유**한다. 첫 번째 테스트에서 캐시된 데이터가 두 번째 테스트에 영향을 줄 수 있고, 테스트 실행 순서에 따라 결과가 달라질 수 있다. `createWrapper` 팩토리 함수를 사용하여 매 테스트마다 새로운 `QueryClient`를 생성해야 한다.

**문제 2: 재시도로 인한 타임아웃**

React Query는 기본적으로 **지수 백오프를 사용하여 3번 재시도**한다. 에러 테스트에서 `isError`가 `true`가 되려면 3번의 재시도가 모두 실패해야 하는데, 이 과정에서 점점 더 긴 대기 시간이 발생하여 테스트 타임아웃에 걸린다. `retry: false`로 설정하면 즉시 에러 상태로 전환된다.

### 깊은 이유 설명

추가로, 원본 코드에는 첫 번째 테스트에서 `await waitFor`가 빠져있다. React Query는 본질적으로 비동기이므로, `renderHook` 직후에는 `data`가 `undefined`이다. 반드시 쿼리가 성공 상태로 전환될 때까지 기다린 후 assertion을 수행해야 한다.

> 특정 쿼리에서 retry를 커스터마이징해야 한다면, `useQuery`에서 직접 설정하는 대신 `queryClient.setQueryDefaults`를 사용하자. 이렇게 하면 테스트에서 기본 옵션으로 쉽게 재정의할 수 있다.
