---
id: 13
title: "에러 처리 전략 - Error Boundary vs 전역 콜백"
tags: ["react-query", "에러처리", "Error Boundary", "onError"]
difficulty: "medium"
sourceDoc: [12]
---

## 질문

React Query에서 에러를 처리하는 세 가지 방법이 있다. 아래 코드를 보고 질문에 답해보자.

```tsx
// 방법 A
const todos = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  throwOnError: true,
});

// 방법 B
const useTodos = () =>
  useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    onError: (error) =>
      toast.error(`Something went wrong: ${error.message}`),
  });

// 방법 C
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) =>
      toast.error(`Something went wrong: ${error.message}`),
  }),
});
```

1. 방법 B(`onError` 콜백)를 커스텀 훅에 넣고, 두 개의 컴포넌트에서 호출하면 어떤 문제가 발생하는가?
2. 에러 토스트를 **요청당 한 번만** 보여주려면 방법 A, B, C 중 어느 것을 사용해야 하는가?
3. 방법 A에서 `throwOnError`에 함수를 전달하면 어떤 세밀한 제어가 가능한가?

**힌트:** `onError`는 Observer(컴포넌트) 단위로 실행된다는 점을 기억하자.

---answer---

## 정답: 전역 QueryCache onError + 선택적 Error Boundary

### 핵심 아이디어

`useQuery`의 `onError`는 **Observer(구독자) 단위**로 실행되므로, 같은 쿼리를 여러 컴포넌트에서 사용하면 에러 토스트가 중복 발생한다. **요청당 한 번만** 실행되는 전역 `QueryCache`의 `onError`를 사용해야 한다.

### 단계별 해설

**1단계: 방법 B의 문제**

`useTodos`를 두 곳에서 호출하면 네트워크 요청은 1번만 발생하지만(중복 제거), `onError` 콜백은 **각 Observer마다** 실행된다. 결과적으로 에러 토스트가 **2번** 나타난다.

**2단계: 전역 콜백으로 해결**

```tsx
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // ✅ 캐시에 데이터가 있으면 백그라운드 업데이트 실패로 판단
      if (query.state.data !== undefined) {
        toast.error(`Something went wrong: ${error.message}`);
      }
    },
  }),
});
```

이 콜백은 **요청당 한 번만** 실행되며, `defaultOptions`에 의해 덮어쓰이지 않는다.

**3단계: throwOnError에 함수 전달**

```tsx
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  // ✅ 5xx 서버 에러만 Error Boundary로, 4xx는 로컬 처리
  throwOnError: (error) => error.response?.status >= 500,
});
```

### 깊은 이유 설명

TkDodo가 권장하는 조합은 다음과 같다: **백그라운드 리페치 실패 시 에러 토스트**(전역 콜백) + **그 외 에러는 로컬 처리 또는 Error Boundary**. 이렇게 하면 기존 UI를 유지하면서 사용자에게 실패를 알릴 수 있고, 심각한 에러(5xx)만 Error Boundary로 전파하여 대체 UI를 보여줄 수 있다.
