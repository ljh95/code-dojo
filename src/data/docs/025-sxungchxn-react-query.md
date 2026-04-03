---
id: 26
title: "[번역] Automatic Query Invalidation after Mutations"
author: "sxungchxn"
source: "https://www.sxungchxn.dev/blog/189f225c-7bc4-49f2-b08d-f5b11e4fd48e"
tags: [react-query, mutation, invalidation, cache, tanstack-query]
date: "2026-04-03"
---

> **📌 핵심 요약**
> - MutationCache의 전역 콜백을 활용하면 mutation 후 자동 invalidation을 구현할 수 있으며, mutationKey·staleTime·meta 등으로 세밀한 제어가 가능하다
> - 키워드: MutationCache, 자동 invalidation, mutationKey, meta, cancelRefetch
> - 이런 상황에서 다시 읽으면 좋다: mutation 후 캐시 무효화 전략을 설계하거나, 수동 invalidation 코드가 반복되어 자동화를 고민할 때

---

> 해당 아티클은 Tkdodo의 [Automatic Query Invalidation after Mutations](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations) 블로그 글을 번역한 내용입니다.

## 📝 Intro

`Query`와 `Mutation`은 동전의 양면과도 같습니다. `Query`가 조회를 위한 비동기 리소스를 정의한다면, `Mutation`은 그러한 리소스를 업데이트하는 액션을 정의합니다. `Mutation`이 끝나게 되면, 해당되는 `Query`가 영향을 받게 될 가능성이 높습니다. 예를 들어, `issue`를 업데이트하는 행위는 `issue`의 목록에 영향을 주는 것처럼 말이죠. 이러한 점에서 볼 때 리액트 쿼리 자체적으로 `Mutation`과 `Query`를 연관 지어 자동으로 업데이트해주지 않는다는 것에 놀라워하실 수도 있을 것 같습니다.

이러한 데에는 다 이유가 있습니다. 바로, `React Query`는 여러분이 선택한 리소스 관리 방식을 전적으로 존중하기 때문입니다. 모든 사람들이 `Mutation` 이후에 `refetching`하는 것을 선호하지 않는 것처럼요. 또한, 네트워크 상의 불필요한 추가 요청을 피하고자 `Mutation`의 응답으로 받은 업데이트된 데이터를 **`cache`에 수동으로 설정하고 싶은 경우**도 있습니다.

또한, 여러분이 선호하는 `invalidation` 방식은 정말 여러가지가 있습니다.

- `onSuccess`에서 invalidate 하기 vs `onSettled`에서 invalidate 하기
  - 전자는 오직 `Mutation`이 성공할 때에만 실행되는 반면, 후자는 에러가 나는 경우에도 실행될 것입니다.
- `invalidation`을 `Await`시키는지의 여부
  - `invalidation`을 `Awaiting`하는 것은 `refetch` 과정이 완료되기 전까지는 `Mutation`이 `Pending` 상태에 머무르게 됩니다. 여러분이 `form`에서 `invalidation`이 종료될 때까지 비활성화된 채로 머무르게 하고 싶다면 좋은 선택지가 될 수 있을 겁니다. 반면, `invalidation`을 실행시켜놓고 다른 화면으로 넘어가게 하고 싶다면 그렇지 않을 것입니다.

보시다시피, 모든 케이스에 딱 들어맞는 만능 솔루션은 없기 때문에, `React Query`에는 정해진 정책은 없습니다. 하지만, 여러분이 자동화된 invalidation이 `React Query` 내에서 필요하다면, `global cache callback`이란 것을 이용해 전혀 어렵지 않게 구현해낼 수 있습니다.

---

## 🌍 전역 Cache Callback

`Mutation`은 여러가지 콜백들을 가지고 있습니다. `onSuccess`, `onError` 그리고 `onSettled`와 같은 콜백을 각각의 `useMutation` 훅에서 정의할 수 있죠. 추가적으로 이것과 동일한 callback 함수들은 `MutationCache`에도 정의할 수 있습니다. 우리 어플리케이션 상에서는 단 하나의 `MutationCache`만을 가지고 있기 때문에, 이러한 callback 함수들은 전역적으로 영향을 주게됩니다. 즉, 모든 `Mutation`에서 트리거되는 것이죠.

callback들을 `MutationCache`에 어떻게 선언하는지는 다소 생소하다고 여길 수 있을 것 같습니다. 이는, 대부분의 예시들에서 `MutationCache`는 `QueryClient`를 생성할 때 내재적으로 생성되기 때문입니다. 하지만, 아래 코드처럼 `MutationCache`를 자체적으로 선언하여 손쉽게 콜백함수들을 선언할 수 있습니다.

```typescript
// Create Mutation Cache
import { QueryClient, MutationCache } from '@tanstack/react-query'

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess,
    onError,
    onSettled,
  }),
})
```

콜백 함수들은 `useMutation`에서 선언하는 것들과 동일한 함수 인자들을 가집니다(다만, `useMutation`에서 선언하는 것들과는 다르게 마지막 인자로 `Mutation` 인스턴스를 넘겨줄 수 있습니다). 그리고 보통의 콜백 함수들처럼, 반환되는 `Promise`는 `Await`되어질 것입니다.

그래서 `Global Callback`은 우리가 자동으로 `invalidation`하는 것을 어떻게 도와줄까요? 우리가 해야할 일은 `queryClient.invalidateQueries`를 global callback 내부에 넘겨주는 것입니다.

```typescript
// Automatic Invalidation
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  }),
})
```

우리는 오로지 5줄의 코드만으로 `Remix`(아 이젠 `React-Router`이려나요)가 하는 것과 유사한 것들을 해낼 수 있습니다. 바로, 모든 `submission` 이후에 `Invalidate`시켜버리는 것이죠. 이러한 방법을 알려준 Alex에게 감사인사를 표합니다.

### 근데 그건 좀 과하지 않나요?

그럴 수도 있고, 그러지 않을 수도 있습니다. 다시 한번 말하지만, 이러한 방식에는 정말 여러가지가 있으니, `React Query` 내부에 내재시키지는 않았습니다. 그리고 여기서 우리가 분명하게 짚고 넘어가야 하는 것은 `Invalidation`이 항상 `refetch`와 동일한 것은 아니라는 것입니다.

`Invalidation`은 전적으로 매칭되는 `active` 상태의 쿼리들만 `refetch`를 하며, 그 외의 쿼리들은 다음에 사용될 때 `refetch`될 수 있도록 `stale`한 상태로 만들어놓습니다.

이러한 방식에는 장단점이 있습니다. Filter 기능이 있는 이슈 리스트를 만들어본다고 생각해봅시다. 각각의 필터는 서로 다른 `QueryKey` 값의 일부가 될 것이기에, `cache` 내에서 여러 종류의 쿼리들을 가지게 될 것입니다. 하지만, 실제로 화면 상에서 보이게 되는 `Query`는 단 하나에 불과합니다. 사용되지 않는 쿼리들까지도 `refetch`하게 되는 것은 불필요하게 많은 네트워크 요청을 야기할 것이며, 이러한 필터를 가지는 리스트로 돌아올 것이란 보장도 없습니다.

그래서 `Invalidation`은 내가 지금 화면상에서 보고 있는 쿼리(`Active Query`)만을 최신상태로 만들고, 다른 것들은 그들이 필요로 해질 때 다시 `refetch`될 것입니다.

---

## 🪢 Invalidation과 특정 Query들을 연결시켜놓기

그렇다면, 매우 정교한 `revalidation`은 어떨까요? 예를 들어, 우리가 왜 `issue`를 목록에 추가할 때 `profile` 데이터를 `invalidate`시켜야 하는 것일까요? 그건 잘 이해가 안 되는데요…

다시 한번, 양자택일의 순간입니다. 저에게는 모든 Query를 `Invalidation`하는 것이 코드도 더 단순해지고 `refetch`할 것을 빼먹을 일이 없어지기에 더 선호되는 방식입니다. 물론 여러분이 무엇을 `refetch`할 것인지 정확하게 알고나서 `정교한 revalidation`을 사용한다면 더할 나위 없이 좋은 방식일 것입니다.

과거에 저 역시 종종 `정교한 방식의 revalidation`을 사용했었는데, 기존 코드 베이스에 새로운 리소스가 추가될 때마다 기존의 코드도 그 리소스를 `invalidation`해야 할지 고민해야 되는 시간이 찾아왔습니다. 그때마다, 저는 모든 `mutation callback`들을 살펴보며 그 리소스가 `refetch`되어야 할지 말지를 판단해야 했습니다. 그러한 과정은 다소 성가시고 실수를 유발할 여지가 있었습니다.

이러한 생각을 바탕으로, 저는 종종 대부분의 `Query`들에 2분 가량의 `staleTime`을 설정해두었습니다. 그 결과 불필요한 사용자 인터렉션으로 인한 `invalidation`의 영향은 무시할 만했습니다.

물론, 여러분의 `revalidation` 방식은 보다 똑똑한 방식으로 진화할 수 있습니다. 제가 과거에 사용했던 몇 가지 테크닉들을 소개해보고자 합니다.

### mutationKey에 종속시키기

`MutationKey`와 `QueryKey`는 보통 관련이 없고, 특히 `MutationKey`는 선택적인 값입니다. 여러분이 전역 callback에 위치한 `invalidation` 로직이 특정한 쿼리들에 대해서만 수행되기를 원한다면 이 두 `Key` 값들을 서로 종속시켜서 이를 구현해낼 수 있습니다.

```typescript
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      queryClient.invalidateQueries({
        queryKey: mutation.options.mutationKey,
      })
    },
  }),
})
```

이렇게 하고 나서, 여러분들이 `Mutation` 로직에 `mutationKey: ['issues']`과 같은 코드를 작성하면, `issue`와 관련된 모든 쿼리들을 `invalidation`시킬 수 있습니다. 반면, `mutationKey`에 아무것도 넘기지 않는다면 그 `mutation`은 모든 쿼리들을 `invalidation`시킬 것입니다.

### staleTime에 따라 Query들을 배제하기

저는 종종 `staleTime`을 `Infinity`로 설정하여 `Query`들을 `static`한 상태로 만들어둡니다. 이러한 쿼리들이 `invalidate`되게 하고 싶지 않을 때에는, `predicate` 필터에서 각 쿼리의 `staleTime`을 참조하여 이들을 배제시켰습니다.

```typescript
// filter only non-static queries
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      const nonStaticQueries = (query: Query) => {
        const defaultStaleTime =
          queryClient.getQueryDefaults(query.queryKey).staleTime ?? 0
        const staleTimes = query.observers
          .map((observer) => observer.options.staleTime)
          .filter((staleTime) => staleTime !== undefined)

        const staleTime =
          query.getObserversCount() > 0
            ? Math.min(...staleTimes)
            : defaultStaleTime

        return staleTime !== Number.POSITIVE_INFINITY
      }

      queryClient.invalidateQueries({
        queryKey: mutation.options.mutationKey,
        predicate: nonStaticQueries,
      })
    },
  }),
})
```

`staleTime`은 옵저버 단계에 위치한 속성이기 때문에 해당 `Query`에 대한 `staleTime`을 찾아내는 것은 쉬운 일만은 아닙니다. 그러나 이는 구현 가능한 기능이며, `staleTime`이 첨가된 `predicate` 필터와 `queryKey` 같은 다른 필터들을 결합해 사용할 수도 있습니다. 멋지군요.

### meta 옵션 사용하기

`Mutation`에 대한 임의의 정적인 정보를 저장하는 수단으로서 `meta`를 사용할 수 있습니다. 예를 들어, `meta`의 `invalidates`라는 필드에 **`tags`**라는 값을 `mutation`에 제공할 수 있습니다. 이러한 `tag`들은 `invalidate`하고자 하는 `Query`들을 포괄적으로 매칭시키는 수단으로 사용될 수 있습니다.

```typescript
import { matchQuery } from '@tanstack/react-query'

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          // invalidate all matching tags at once
          // or everything if no meta is provided
          mutation.meta?.invalidates?.some((queryKey) =>
            matchQuery({ queryKey }, query)
          ) ?? true,
      })
    },
  }),
})

// usage:
useMutation({
  mutationFn: updateLabel,
  meta: {
    invalidates: [['issues'], ['labels']],
  },
})
```

여기서도 마찬가지로 `predicate`라는 함수를 `queryClient.invalidateQueries`를 호출할 때 사용할 수 있습니다. 차이가 있다면 `matchQuery`(`React Query`에서 import 해올 수 있는 함수)를 이용해 포괄적으로 매칭시키는 방식을 사용하고 있죠. 하나의 `queryKey`를 필터로 넘겨받을 때 내부적으로 사용하는 함수와 동일합니다. 위의 예시에서 볼 수 있듯이 여러 개의 `key`들을 넘겨받아 필터 기능을 수행할 수 있습니다.

이러한 패턴은 `useMutation` 훅에 `onSuccess` 콜백을 선언하는 것과는 별반 다를게 없어 보일지 몰라도, 이렇게 하면 기존과 다르게 `QueryClient`를 불러오고자 `useQueryClient`를 매번 사용할 필요가 없어지게 됩니다. 또한, 이러한 방식을 사용하되 기본적으로는 모든 쿼리들을 `invalidating`하도록 한다면, `invalidating`을 손쉽게 최적화할 수 있게 도와줄 것입니다.

> 💡 **타입스크립트에서 `meta` 옵션 사용하기**
>
> 일반적으로 `meta`는 `Record<string, unknown>`으로 타이핑되지만, 아래와 같이 `module augmentation`을 통해 타입을 구체화할 수 있습니다. `meta`를 타이핑하는 것에 대해서는 [공식문서](https://tanstack.com/query/v5/docs/framework/react/typescript#typing-meta)에서 더 구체적으로 확인해 보실 수 있습니다.

```typescript
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      invalidates?: Array<QueryKey>
    }
  }
}
```

---

## 🤔 Await 할지 말지의 여부

위의 모든 예시들에서 살펴보았듯이, invalidation을 `await`한 적은 없습니다. 여러분이 `mutation`이라는 과정을 최대한 빠르게 끝내고 싶다면 좋은 선택지일 것입니다.

제가 많이 마주했던 특별한 상황이 있었는데 그건 특정 `Mutation`이 모든 Query들을 `invalidate`하고 싶으나 중요한 `refetch` 과정이 마무리될 때까지 대기해야 되는 것이었습니다. 예를 들어, 저는 `label`이 업데이트되기까지 특정 `label`의 `Query`들이 `await`되기를 원했으나, 모든 것들이 `refetch`될 때까지 기다리기를 원한 것은 아니었습니다.

이러한 상황을 해결하는 방법은 바로 앞서 이야기했던 `meta` 사용법을 확장하는 방식입니다. 예를 들면, 아래와 같은 방식이죠.

```typescript
useMutation({
  mutationFn: updateLabel,
  meta: {
    invalidates: 'all',
    awaits: ['labels'],
  },
})
```

아니면, `MutationCache`에 있는 콜백들은 `useMutation` 콜백보다 앞서 호출된다는 점을 이용해볼 수도 있습니다. 여러분이 모든 쿼리들을 `invalidate`하도록 `global callback`을 만들어놨다면, `useMutation` 콜백에서는 우리가 원하는 일부 쿼리들만 `await`하도록 할 수 있습니다.

```typescript
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  }),
})

useMutation({
  mutationFn: updateLabel,
  onSuccess: () => {
    // returning the Promise to await it
    return queryClient.invalidateQueries(
      { queryKey: ['labels'] },
      { cancelRefetch: false }
    )
  },
})
```

여기서 일어나는 과정들은 다음과 같습니다.

- 처음에, `global callback`은 모든 `Query`들을 `invalidate`하지만, `await`하거나 특정 값을 `return`하기를 원하는 건 아니기에, **"실행은 되지만 잊혀지는"** invalidation이 되게 됩니다.
- 이후에, `useMutation` 콜백은 그 이후에 호출되며, 여기서는 `['labels']`만을 `invalidate`하는 `Promise`를 만들어냅니다. 여기서는 `Promise`를 반환하기 때문에, `Mutation` 과정이 `['labels']`가 `refetch`될 때까지 대기상태가 될 것입니다.

> 💡 **cancelRefetch**
>
> 앞선 예제에서 `cancelRefetch: false`라는 옵션을 `invalidateQueries`를 호출할 때 넘기고 있다는 것에 주목해야 합니다. 일반적으로 앞서 호출된 `refetch` 요청이 먼저 처리되게 하고 현재 `refetch` 요청은 취소시켜서 최신화된 데이터가 순서를 보장할 수 있도록 하기 위해서 이 옵션의 기본값은 `true`입니다.
>
> 하지만, 위의 예시는 반대의 방식을 사용하고자 하는 것입니다. `global callback`이 이미 우리가 `await`하고자 하는 쿼리들을 포함해 모든 쿼리들을 `invalidate`시켰기 때문에 앞서 호출된 `['labels']` 관련 `Promise`를 가져와서 `await`시킨 뒤에 반환해야 합니다.
>
> 이렇게 하지 않으면 `['labels']`라는 쿼리가 또다시 요청되는 장면을 목격하겠죠.

---

저의 생각에는 이 아티클이 여러분들로 하여금 `automatic invalidation`의 추상화를 익숙하게 여길 만큼 충분한 코드들을 제공해 주지는 못한 것 같습니다. 모든 추상화에는 비용이 따른다는 것을 명심하시길 바랍니다. 새로운 API는 충분히 학습되고 이해되어야 하며 알맞게 적용되어야 하기 때문이죠.

저는 앞서 모든 가능성들을 보여줌으로써, 왜 우리가 React Query 내부에 자동화 같은 기능들을 구현시켜놓지 않았는지가 분명해졌기를 희망합니다. 모든 케이스를 커버할 수 있으면서도 비대하지 않은 API를 찾는 것은 쉽지 않은 일이기 때문이죠. 이러한 이유로, 저는 사용자 측에서 쓸 수 있는 방안들을 제시하는 방식을 더 선호하는 편입니다.
