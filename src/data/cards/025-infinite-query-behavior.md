---
id: 25
title: "useInfiniteQuery 내부 동작 - refetch 루프와 클로저 버그"
tags: ["react-query", "useInfiniteQuery", "infiniteQueryBehavior", "클로저"]
difficulty: "hard"
sourceDoc: [27]
---

## 질문

아래는 `useInfiniteQuery`의 내부 동작을 간소화한 의사 코드이다. 이 코드에는 **실제로 React Query에 존재했던 버그**가 숨어있다.

```ts
function infiniteQueryBehavior() {
  return {
    onFetch: (context, queryFn) => {
      return async function fetchFn() {
        const remainingPages = context.data.length
        let currentPage = 0
        const result = { pages: [] }

        do {
          const param = getNextPageParam(result)
          if (param == null) break
          result.pages.push(await fetchNextPage(queryFn, param))
          currentPage++
        } while (currentPage < remainingPages)

        return result
      }
    },
  }
}
```

이 `fetchFn`은 `retryer`에 의해 실패 시 재호출된다.

1. 3페이지를 이미 fetch한 무한 쿼리가 refetch 중 2번째 페이지에서 실패했다. `retryer`가 `fetchFn`을 다시 호출하면 어떤 일이 발생하는가?
2. 이 버그의 근본 원인은 무엇인가?
3. JavaScript의 **클로저**를 활용하여 이 버그를 어떻게 수정할 수 있는가?

**힌트:** `fetchFn`이 호출될 때마다 `remainingPages`, `currentPage`, `result`가 어디에서 초기화되는지 추적해보자.

---answer---

## 정답: 클로저로 재시도 시 진행 상황 보존

### 핵심 아이디어

`fetchFn` 내부에 `currentPage`와 `result`를 선언하면, 재시도 시 함수가 다시 호출될 때 **변수가 매번 초기화**된다. 이미 성공한 페이지를 다시 fetch하게 되어, 레이트 리미팅 등의 상황에서 끝없이 실패할 수 있다.

### 버그 시나리오

```
[1페이지: ✅] → [2페이지: ❌ 실패] → retryer가 fetchFn 재호출
→ currentPage = 0, result = { pages: [] } 로 초기화됨!
→ 1페이지부터 다시 fetch 시작 (이미 성공했는데 또 요청)
→ 레이트 리미팅이면 영원히 3페이지에 도달 못함
```

### 수정: 변수를 fetchFn 바깥으로 이동

```ts
function infiniteQueryBehavior() {
  return {
    onFetch: (context, queryFn) => {
      // 클로저 변수: fetchFn 바깥에 선언 → 재호출되어도 값 유지
      const remainingPages = context.data.length
      let currentPage = 0
      const result = { pages: [] }

      return async function fetchFn() {
        // forward/backward 방향 처리 (생략)

        do {
          const param = getNextPageParam(result)
          if (param == null) break
          result.pages.push(await fetchNextPage(queryFn, param))
          currentPage++
        } while (currentPage < remainingPages)

        return result
      }
    },
  }
}
```

### 수정 후 동작

```
[1페이지: ✅, currentPage=1, result.pages=[page1]]
→ [2페이지: ❌ 실패] → retryer가 fetchFn 재호출
→ currentPage는 여전히 1, result.pages에 page1이 남아있음
→ 2페이지부터 이어서 retry!
```

### 깊은 이유 설명

**왜 이 버그가 발생했는가?**

일반 쿼리(`useQuery`)는 `fetchFn`이 단일 요청이므로 재시도가 단순하다. 하지만 무한 쿼리의 `fetchFn`은 **여러 페이지를 순회하는 루프**를 포함한다. `retryer`는 이 차이를 모르고 동일하게 `fetchFn`을 재호출한다.

**재시도 횟수 주의:** `retry: 3`은 **페이지 당 3회가 아니라 전체 쿼리에서 3회**다. 이는 단일 쿼리의 동작과 일관된다.

**클로저의 역할:** `onFetch`가 호출될 때 생성되는 렉시컬 환경에 `currentPage`와 `result`가 존재하고, `fetchFn`은 이 환경을 **캡처**한다. `fetchFn`이 여러 번 호출되어도 같은 렉시컬 환경을 참조하므로 이전 진행 상태가 보존된다.
