---
id: 27
title: "(번역) How Infinite Queries Work"
author: "TkDodo (번역: cnsrn1874)"
source: "https://velog.io/@cnsrn1874/how-infinite-queries-work"
tags: [react-query, 번역, 무한쿼리, useInfiniteQuery]
date: ""
---

> **📌 핵심 요약**
> - 무한 쿼리의 retry 버그는 클로저를 활용해 fetchFn 외부에 상태를 끌어올려 해결했다
> - 키워드: useInfiniteQuery, retryer, 클로저, QueryBehavior, 페이지네이션
> - 이런 상황에서 다시 읽으면 좋다: 무한 쿼리의 내부 동작 원리를 이해하고 싶을 때

---

## 배경

이번 주에 React Query의 Infinite Queries에 대해 흥미로운 버그 리포트가 제출되었습니다. 저자는 "다수의 사용자에게 영향을 미치며, 라이브러리 자체의 설계상 제약으로 인한 버그는 없다"고 확신했지만, 이 버그는 예외였습니다.

이 버그가 재현되려면 다음 조건들을 만족해야 합니다:

- Infinite Query가 이미 여러 페이지를 성공적으로 fetch한 적이 있어야 함
- refetch가 최소 한 페이지를 성공적으로 fetch했지만, 다음 페이지는 실패해야 함
- retry를 적어도 1회 사용해야 함 (기본값이 3회)

## 무한 쿼리

무한 쿼리는 무한 스크롤 페이지를 단순하게 구현하기 위한 React Query의 방식입니다. 캐시 안에서 모든 쿼리는 `Query` 클래스의 인스턴스로 표현되며, 인스턴스는 쿼리와 관련된 상태를 관리하고 현재의 fetch에 대한 `promise`를 들고 있습니다.

추가로 쿼리는 `retryer`의 인스턴스를 들고 있으며, 이 인스턴스는 재시도에 관련된 모든 로직을 책임집니다.

### 간소화한 의사 코드

```typescript
class Query() {
  fetch() {
    if (this.state.fetchStatus === 'idle') {
      this.#dispatch({ type: 'fetch' })
      this.#retryer = createRetryer({
        fetchFn: this.options.queryFn,
        retry: this.options.retry,
        retryDelay: this.options.retryDelay
      })
      return this.#retryer.start()
    }

    return this.#retryer.promise
  }
}
```

`retryer`는 전달받은 `fetchFn`을 호출하며, 재시도를 할 때는 여러 번 호출할 수도 있습니다.

## 단일 쿼리와 다른 점

무한 쿼리의 유일한 차별점은 `data`의 구조와 반환받는 방식입니다. 일반적으로 `queryFn`이 반환하는 것은 캐시로 직접 연결되지만, 무한 쿼리에서는 각 `queryFn` 호출이 전체 데이터 구조의 일부(**페이지**)만 반환합니다.

## QueryBehavior

단일 쿼리는 `queryFn`만 실행하도록 설정되지만, 무한 쿼리는 `infiniteQueryBehavior`에서 꺼낸 함수를 실행합니다.

```typescript
class Query() {
  fetch() {
    if (this.state.fetchStatus === 'idle') {
      this.#dispatch({ type: 'fetch' })
      this.#retryer = createRetryer({
        fetchFn: this.options.behavior.onFetch(
          this.context,
          this.options.queryFn
        ),
        retry: this.options.retry,
        retryDelay: this.options.retryDelay
      })
      return this.#retryer.start()
    }

    return this.#retryer.promise
  }
}
```

무한 쿼리의 behavior는 자신이 실행됐을 때 무엇을 해야 하는지 압니다.

### InfiniteQueryBehavior 구현

```typescript
function infiniteQueryBehavior() {
  return {
    onFetch: (context, queryFn) => {
      return async function fetchFn() {
        if (context.direction === 'forward') {
          return [...context.data, await fetchNextPage(queryFn)]
        }
        if (context.direction === 'backward') {
          return [await fetchPreviousPage(queryFn), ...context.data]
        }

        const remainingPages = context.data.length
        let currentPage = 0
        const result = { pages: [] }

        do {
          const param = getNextPageParam(result)
          if (param == null) {
            break
          }
          result.pages.push(await fetchNextPage(queryFn, param))
          currentPage++
        } while (currentPage < remainingPages)

        return result
      }
    },
  }
}
```

### fetchInfiniteQuery 구현

```typescript
fetchInfiniteQuery(options) {
  return this.fetchQuery({
    ...options,
    behavior: infiniteQueryBehavior()
  })
}
```

## 버그

이 버그는 위계와 관계가 있습니다. `query`가 `retryer`를 들고 있고, `retryer`는 `infiniteQueryBehavior`가 반환하는 `fetchFn`을 받습니다.

`fetchFn`에 fetch하는 루프가 있기 때문에, 재시도를 하면 그 루프 전체를 재시작합니다. 첫 페이지를 fetch하는 데 실패하는 것은 상관없지만, 중간 페이지를 실패하면 루프를 리셋하고 완전히 처음부터 시작하게 됩니다. 예를 들어 레이트 리미팅이 발생하면 모든 페이지를 fetch하는 것이 불가능할 수도 있습니다.

## 수정

해결책은 `infiniteQueryBehavior`가 반복문을 재시작하는 지점을 기억하게 만드는 것이었습니다. 이는 JavaScript의 클로저를 사용하면 해결됩니다.

### 수정된 코드

```typescript
function infiniteQueryBehavior() {
  return {
    onFetch: (context, queryFn) => {
      const remainingPages = context.data.length
      let currentPage = 0
      const result = { pages: [] }

      return async function fetchFn() {
        if (context.direction === 'forward') {
          return [...context.data, await fetchNextPage(queryFn)]
        }
        if (context.direction === 'backward') {
          return [await fetchPreviousPage(queryFn), ...context.data]
        }

        do {
          const param = getNextPageParam(result)
          if (param == null) {
            break
          }
          result.pages.push(await fetchNextPage(queryFn, param))
          currentPage++
        } while (currentPage < remainingPages)

        return result
      }
    },
  }
}
```

이렇게 변수들을 `fetchFn` 함수의 외부로 끌어올리면, `fetchFn`이 다시 호출될 때 이전의 진행 상황을 기억할 수 있습니다.

이제 `fetchNextPage`가 실패해도 `retryer`는 정지했다가 `fetchFn`을 다시 호출할 때, 이전에 성공적으로 fetch한 페이지들의 정보를 유지한 채로 계속됩니다.

**참고:** 이는 `retry: 3`로 설정 시, 재시도 횟수가 페이지 당 3회가 아니라 **전체 쿼리에서 3회**라는 의미입니다. 이는 단일 쿼리의 동작 방식과 일치합니다.

## 출처

실제 수정 PR은 GitHub에서 확인할 수 있으며, 이 문제를 함께 처리하고 첫 실패 테스트 케이스를 만든 incepter에게 감사의 인사를 전합니다.
