---
id: 32
title: "(번역) Creating Query Abstractions"
author: "번역: chapdo"
source: "https://chapdo.vercel.app/posts/%EB%B2%88%EC%97%AD-creating-query-abstractions/"
tags: [react-query, 번역, 추상화, 패턴]
date: ""
---

[TkDodo](https://bsky.app/profile/tkdodo.eu)의 [Creating Query Abstractions](https://tkdodo.eu/blog/creating-query-abstractions)를 번역한 글입니다.

## 개발자와 추상화

개발자들은 추상화를 정말 좋아합니다. 코드를 보다가 다른 곳에서도 쓸 것 같으면 — 추상화. 이 3줄짜리 코드가 필요한데 살짝 다르게 쓰고 싶으면 — 추상화(플래그 하나 추가해서). 모든 `useQuery`에 공통적으로 적용돼야 하는 게 있으면 — **추상화**!

추상화 자체가 나쁜 건 아닙니다. 하지만 모든 것이 그렇듯 트레이드오프가 있죠. Dan의 발표 [The wet codebase](https://www.deconstructconf.com/2019/dan-abramov-the-wet-codebase)는 이 부분을 정말 잘 설명해줍니다.

## 커스텀 훅

React에서 추상화를 만드는 방법은 커스텀 훅과 매우 밀접하게 연결되어 있습니다. 커스텀 훅은 여러 컴포넌트 간에 로직을 공유하거나, 복잡한 `useEffect`를 좋은 이름 뒤로 숨기는 데 아주 효과적이죠. 오랫동안 `useQuery` 위에 추상화를 만드는 것은 커스텀 훅을 작성하는 것을 의미했습니다:

```javascript
function useInvoice(id: number) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice(id),
  });
}

const { data } = useInvoice(1);
// data: Invoice | undefined
```

이건 간단명료합니다. 이제 `queryKey`와 `queryFn`을 매번 반복하는 대신 원하는 곳에서 `useInvoice()`를 호출하면 됩니다. `queryKey`의 일관성도 보장되는데, 그렇지 않으면 캐시 항목이 중복 생성될 수 있거든요. 그리고 `useQuery`가 반환하는 것을 그대로 반환하기 때문에, 인터페이스가 TanStack Query의 API와 일치합니다. 이 훅이 사용되는 곳에서 예상치 못한 이름이 등장하는 일도 없죠.

타입도 **완전히 추론됩니다**. 제너릭을 수동으로 전달하지 않기 때문인데, 이는 정말 좋은 일입니다. TypeScript 코드가 순수 JavaScript처럼 보일수록 더 좋습니다.

## Query Options

그런데 커스텀 훅에 입력값을 어떻게 전달할까요? `useQuery`에는 24개의 옵션이 있는데, 현재 추상화 방식으로는 그 중 어떤 것도 전달할 수가 없습니다. 만약 배경 업데이트가 그다지 중요하지 않은 화면에서 다른 `staleTime`을 전달하고 싶다면? 그냥 파라미터로 받으면 되겠죠:

```javascript
function useInvoice(id: number, staleTime: number) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice(id),
    staleTime,
  });
}
```

아직까지는 괜찮아 보입니다. 그런데 이번엔 누군가가 Error Boundary와 통합하고 싶어서 `throwOnError`를 전달하고 싶다고 합니다. 파라미터가 이렇게 많아지면 인터페이스가 좋지 않으니, 처음부터 객체로 만들었어야 했나 싶기도 하죠:

```javascript
function useInvoice(
  id: number,
  options?: { staleTime?: number; throwOnError?: boolean },
) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice(id),
    ...options,
  });
}
```

이쯤 되면 슬슬 방향이 맞는 건지 의심이 들기 시작합니다. React Query가 지원하는 새로운 사용 사례가 생길 때마다 우리의 작은 추상화 코드를 매번 수정해야 한다는 건 이상적이지 않습니다. 반환값의 경우엔 라이브러리가 반환하는 것을 그대로 사용하기로 했는데 — 입력 옵션도 똑같이 할 수 없을까요?

### UseQueryOptions

조금 더 파고들다 보면 React Query가 `UseQueryOptions`라는 타입을 제공한다는 걸 알게 됩니다. 딱 우리가 원하는 것처럼 들리죠:

```javascript
import type { UseQueryOptions } from "@tanstack/react-query";

function useInvoice(id: number, options?: Partial<UseQueryOptions>) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice(id),
    ...options,
  });
}
```

타입 에러가 없으니 잘 동작하는 거겠죠? 그럼 사용하는 쪽을 한번 살펴봅시다:

```javascript
const { data } = useInvoice(1, { throwOnError: true });
//      ^? data: unknown
```

`data`의 타입이 `unknown`이 돼버렸습니다. 예상치 못한 결과일 수 있지만, 이건 Query가 이상적인 타입 추론을 위해 제너릭을 사용하는 방식 때문입니다. 이 내용은 [#6: React Query and TypeScript](https://tkdodo.eu/blog/react-query-and-type-script#the-four-generics)에서 다룬 적이 있습니다. `options`가 실제로 어떻게 추론되는지 보면 문제가 더 명확해집니다:

```javascript
declare const options: UseQueryOptions;
//             ^? UseQueryOptions<unknown, Error, unknown, QueryKey>
```

`UseQueryOptions`도 동일한 4개의 제너릭을 가지고 있고, 이를 생략하면 기본값이 적용됩니다. `data`의 기본값은 `unknown`이기 때문에, 이 옵션들을 `useQuery`에 스프레드하면 타입이 `unknown`으로 넓어져버립니다.

## TypeScript 라이브러리

이런 문제는 타입 추론을 통해 타입 안전성을 높이려는 라이브러리들에서 공통적으로 나타난다는 걸 알게 됐습니다. 라이브러리를 "직접" 사용할 때는 정말 잘 동작하지만, 그 위에 저수준의 범용 추상화를 만들려고 하면 올바르게 구현하기가 어려워집니다.

TanStack Query는 제너릭이 4개뿐이라 우리가 직접 재현해볼 수 있을지도 모릅니다. TanStack Form은 대부분의 타입에 23개의 타입 파라미터가 있고, TanStack Router는 — 그냥 얘기하지 않는 게 나을 것 같네요.

결국 이 방식은 어느 정도까지만 통합니다. 저는 TanStack Query로 이걸 어떻게 처리할지에 대해 4년 된 트윗도 있는데, 솔직히 말해서 굉장히 복잡합니다:

> **TkDodo (@TkDodo) · 2022년 2월 9일**
>
> 요즘 useQuery 위에 자체 저수준 추상화를 만들고 TypeScript에서 제대로 동작하게 하는 방법을 많이들 물어보시네요. 제 대답은 보통 "그럴 필요 없다"입니다.

### The Native Solution

그리고 이렇게 복잡하다 보니 잘못 구현된 코드를 정말 자주 마주칩니다. 가장 흔한 실수는 `UseQueryOptions`의 첫 번째 타입 파라미터만 명시하는 것입니다:

```javascript
function useInvoice(id: number, options?: Partial<UseQueryOptions<Invoice>>) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice(id),
    ...options,
  });
}

const { data } = useInvoice(1, { throwOnError: true });
//      ^? data: Invoice | undefined
```

`data` 추론은 다시 "동작"하지만, `select`처럼 다른 타입 파라미터에 의존하는 옵션을 사용하면 바로 무너집니다:

```javascript
// 타입 에러 발생
const { data } = useInvoice(1, {
  select: (invoice) => invoice.createdAt,
});
```

트윗에서 보여줬듯이, 직접 작성한 추상화에 타입 파라미터를 더 추가할 수 있습니다. 하지만 그렇게 할수록 **순수 JavaScript**처럼 보이는 코드에서 점점 멀어집니다. 이 라이브러리들이 우리를 위해 복잡한 TypeScript 작업을 대신 처리해주겠다고 약속했는데 말이죠…

## 더 나은 추상화 찾기

저는 커스텀 훅이 이런 상황에서 올바른 추상화가 아니라는 결론에 도달했습니다. 이유는 여러 가지입니다:

- 커스텀 훅은 컴포넌트나 다른 훅 안에서만 사용할 수 있습니다. React Query가 처음 출시됐을 때는 괜찮았을지 모르지만, 이제는 서버에서도 사용하고 싶고, 라우트 로더에서도 사용하고 싶으며, 이벤트 핸들러에서 프리페칭을 위해서도 사용하고 싶습니다. 이런 환경에서는 훅을 사용할 수 없습니다.

- 커스텀 훅은 컴포넌트 간에 로직을 공유하는 데 좋지만, 우리가 여기서 공유하는 건 로직이 아닙니다. 우리는 **설정(configuration)**을 공유하고 있습니다.

- 커스텀 훅은 특정 구현(`useQuery`)에 우리를 묶어버립니다. 그런데 나중에 바꾸고 싶을 수도 있습니다. 데이터 페칭에 [Suspense](https://react.dev/reference/react/Suspense)를 사용하려면 다른 훅(`useSuspenseQuery`)이 필요합니다. 여러 쿼리를 병렬로 실행하는 `useQueries`도 있는데, 이걸 `useInvoice`와 어떻게 조합할 수 있을까요? 그럴 수 없습니다…

## Query Options API

v5 이후로, 저는 Query 추상화를 만들 때 커스텀 훅보다 **`queryOptions`**를 선호합니다.

> `queryOptions`에는 다른 장점들도 있습니다. 이미 [#24: The Query Options API](https://tkdodo.eu/blog/the-query-options-api)에서 다룬 내용이니, 먼저 읽어보시길 강력히 추천합니다.

이 API는 언급한 모든 문제를 해결하고 그 이상을 제공합니다. 서로 다른 훅 사이에서 사용할 수 있고, 명령형 함수와도 공유할 수 있습니다. 그냥 일반 함수이기 때문에 어디서든 동작합니다. 런타임에서는 아무것도 하지 않습니다. 트랜스파일된 결과물을 보면:

```javascript
function queryOptions(options) {
  return options;
}
```

하지만 타입 수준에서는 진정한 강자가 됩니다. 쿼리 설정을 공유하는 가장 좋은 방법이죠:

```javascript
import { queryOptions } from "@tanstack/react-query";

function invoiceOptions(id: number) {
  return queryOptions({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice(id),
  });
}

const { data: invoice1 } = useQuery(invoiceOptions(1));
//      ^? Invoice | undefined

const { data: invoice2 } = useSuspenseQuery(invoiceOptions(2));
//      ^? Invoice
```

좋습니다, 상호운용성 문제는 해결됐습니다. 그런데 이제 옵션은 어떻게 전달하면 될까요? `invoiceOptions`에 파라미터로 옵션을 추가하면 원점으로 돌아가는 게 아닐까요?

## QueryOptions 합성하기

사실 좋은 소식이 있습니다: 그럴 필요가 없다는 거죠. 핵심 아이디어는 `invoiceOptions`가 모든 사용처에서 공유하고 싶은 옵션만 포함한다는 것입니다. 최선의 추상화는 설정 가능한 부분이 없는 것이므로, 그냥 그대로 두면 됩니다. 다른 옵션을 설정하고 싶다면, 사용하는 곳에서 `invoiceOptions` 위에 직접 전달하면 됩니다:

```javascript
const invoiceQuery = useQuery({
  ...invoiceOptions(1),
  throwOnError: true,
  select: (invoice) => invoice.createdAt,
});

invoiceQuery.data;
//           ^? string | undefined
```

그리고 이게 그냥 동작합니다! 모든 옵션에서, 완전한 타입 추론으로, JavaScript처럼 보이는 코드로, 정말 간단하게. 물론 커스텀 훅을 계속 만들어도 괜찮습니다. 하지만 그 훅들은 `queryOptions` 위에 구축되어야 합니다. `queryOptions`가 가장 먼저 손을 뻗어야 할 추상화의 기본 블록이니까요. 단순함이 왕이며, 이보다 더 단순할 수는 없습니다.
