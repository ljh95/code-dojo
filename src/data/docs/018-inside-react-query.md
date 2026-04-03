---
id: 19
title: "Inside React Query"
author: "hyunjine"
source: "https://velog.io/@hyunjine/Inside-React-Query"
tags: [react-query, 내부구조, 아키텍처]
date: ""
---

> 이 글은 [Inside React Query](https://tkdodo.eu/blog/inside-react-query)를 번역한 글입니다.

최근에 React Query가 내부적으로 어떻게 작동하는지에 대한 질문을 많이 받았습니다.

React Query가 리렌더링해야하는 시점을 어떻게 알 수 있을까요?
어떻게 중복을 제거할까요?
어떻게 프레임워크에 구애받지 않을까요?

이것들은 모두 매우 좋은 질문입니다. 우리가 사랑하는 비동기 상태 관리 라이브러리의 내부를 살펴보고 useQuery를 호출할 때 실제로 어떤 일이 발생하는지 분석해 봅시다.

아키텍처를 이해하려면 처음부터 시작해야 합니다:

## The QueryClient

모든 것은 `QueryClient`에서 시작합니다. `QueryClient`는 애플리케이션 시작 시 인스턴스를 생성한 다음 `QueryClientProvider`를 통해 어디에서나 사용할 수 있습니다.

```js
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ⬇️ this creates the client
const queryClient = new QueryClient()

function App() {
  return (
    // ⬇️ this distributes the client
    <QueryClientProvider client={queryClient}>
      <RestOfYourApp />
    </QueryClientProvider>
  )
}
```

`QueryClientProvider`는 [React Context](https://beta.reactjs.org/apis/react/useContext)를 사용하여 전체 애플리케이션에 `QueryClient`를 배부합니다. client 자체는 안정적인 값입니다. 한 번 생성되므로(실수로 [너무 자주 생성하지 않도록 주의](https://tkdodo.eu/blog/react-query-fa-qs#2-the-queryclient-is-not-stable)) Context를 사용하기에 완벽한 경우입니다. 이는 앱을 다시 렌더링하지 않습니다. 단지 `useQueryClient`를 통해 이 client에 대한 액세스 권한을 부여할 뿐입니다.

## 캐시를 담는 그릇

잘 알려지지 않았을 수 있지만 `QueryClient` 자체는 실제로 많은 일을 하지 않습니다. 새로운`QueryClient`를 만들 때 자동으로 생성되는 `QueryCache` 및 `MutationCache`의 컨테이너입니다.

또한 모든 query 및 mutation에 대해 설정할 수 있는 몇 가지 기본값을 보유하고 있으며 캐시 작업을 위한 편리한 방법을 제공합니다. 대부분의 경우 캐시와 직접 상호작용하지 않고 `QueryClient`를 통해 캐시에 엑세스합니다.

## QueryCache

자, client는 우리가 캐시로 작업을 할 수 있도록 합니다. 캐시란 무엇입니까?

간단히 말해서 `QueryCache`는 키가 안정적이고 직렬화된 queryKeys 버전(queryKeyHash라고 함)이고 값이 `Query` 클래스의 인스턴스인 메모리 내의 객체입니다.(in-memory object)

**React Query는 기본적으로 메모리에만 데이터를 저장하고 다른 곳에는 저장하지 않는다는 것을 이해하는 것이 중요하다고 생각합니다.** 브라우저 페이지를 새로고침하면 캐시가 사라집니다. localstorage와 같은 외부 저장소에 캐시를 쓰려면 [persisters](https://tanstack.com/query/v4/docs/plugins/persistQueryClient)를 살펴보세요.

## Query

캐시에는 쿼리들이 있으며 쿼리에서 대부분의 로직이 실행됩니다. 여기에는 쿼리에 대한 모든 정보(데이터, 상태 필드 또는 마지막 fetching이 발생했을 때와 같은 메타 정보)가 포함될 뿐만 아니라 쿼리 함수를 실행하고 재시도, 취소 및 중복 제거 로직이 포함됩니다.

쿼리에는 우리가 불가능한 상태에 빠지지 않도록 하는 내부 상태 머신이 있습니다. 예를 들어 이미 fetching을 수행하는 동안 쿼리 함수를 트리거해야 하는 경우 fetching에서 중복을 제거할 수 있습니다. 쿼리가 취소되면 이전 상태로 돌아갑니다.

**가장 중요한 것은, 쿼리가 누가 쿼리 데이터에 관심있는지를 알고 해당 관찰자에게 모든 변경 사항을 알릴 수 있다는 것입니다.**

## QueryObserver

`Observer`는 쿼리와 이를 사용하려는 컴포넌트 사이의 접착제입니다. `Observer`는 useQuery를 호출할 때 생성되며 항상 정확히 하나의 쿼리를 구독합니다. 그렇기 때문에 `useQuery`에 `queryKey`를 전달해야 합니다. 😉

`Observer`는 조금 더 많은 작업을 수행합니다. `Observer`는 대부분의 최적화가 이루어지는 곳입니다. `Observer`는 컴포넌트가 사용 중인 쿼리의 속성을 알고 있으므로 관련 없는 변경 사항을 알릴 필요가 없습니다. 예를 들어 데이터 필드만 사용하는 경우 백그라운드 refetch에서 _isFetching_이 변경되는 경우 컴포넌트를 다시 렌더링할 필요가 없습니다.

추가로 각 옵저버는 _select_ 옵션을 가질 수 있으며 여기에서 데이터 필드의 어떤 부분에 관심이 있는지 결정할 수 있습니다. 이전에 [#2: React Query Data Transformations](https://tkdodo.eu/blog/react-query-data-transformations#3-using-the-select-option)에서 이 최적화에 대해 쓴 적이 있습니다. `staleTime`또는 interval fetching과 같은 대부분의 타이머는 observer-level에서도 발생합니다.

## Active and inactive Queries

`Observer`가 없는 쿼리를 비활성 쿼리라고 합니다. 여전히 캐시에 있지만 어떤 컴포넌트에서도 사용되지 않습니다. React Query Devtools를 살펴보면 비활성 쿼리가 회색으로 표시되는 것을 볼 수 있습니다. 왼쪽의 숫자는 쿼리를 구독하는 `Observer`의 수를 나타냅니다.

## The complete picture

모두 합치면 대부분의 로직이 프레임워크에 구애받지 않는 Query Core(`QueryClient`, `QueryCache`, `Query`, `QueryObserver`) 내부에 있음을 알 수 있습니다.

그렇기 때문에 새 프레임워크용 어댑터를 만드는 것이 매우 간단합니다. 기본적으로 `Observer`를 생성하고 구독하고 `Observer`가 알림을 받으면 구성 요소를 컴포넌트를 다시 렌더링하는 방법이 필요합니다. [react](https://github.com/TanStack/query/blob/9d9aea5fb12eb89dec54c619845b3d226b53cf2b/packages/react-query/src/useBaseQuery.ts#L33-L115) 및 [solid](https://github.com/TanStack/query/blob/9579dd893656d0a4a7ac0207a204d4b3735c329d/packages/solid-query/src/createBaseQuery.ts#L33-L131)용 `useQuery` 어댑터에는 각각 약 100줄의 코드만 있습니다.

## From a component perspective

마지막으로 컴포넌트로부터 시작하여 다른 각도에서 흐름을 살펴보겠습니다.

- 컴포넌트가 마운트되면 `Observer`를 생성하는 `useQuery`를 호출합니다.
- `Observer`는 `QueryCache`에 있는 `Query`를 구독합니다.
- 해당 구독은 `Query` 생성을 트리거하거나(아직 존재하지 않는 경우) 데이터가 오래된 것으로 간주되는 경우 백그라운드 fetching을 트리거할 수 있습니다.
- fetching을 시작하면 `Query`의 상태가 변경되므로 `Observer`에게 이에 대한 정보가 제공됩니다.
- 그런 다음 `Observer`는 몇 가지 최적화를 실행하고 잠재적으로 업데이트에 대해 컴포넌트에 알리면 새 상태를 렌더링할 수 있습니다.
- `Query` 실행이 끝나면 `Observer`에게도 이 사실을 알립니다.

이것은 많은 잠재적 흐름 중 하나일 뿐이라는 점에 유의하세요. 이상적으로는 컴포넌트가 마운트될 때 데이터가 이미 캐시에 있을 것입니다. 이에 대한 내용은 [#17: Seeding the Query Cache](https://tkdodo.eu/blog/seeding-the-query-cache)에서 읽을 수 있습니다.

모든 흐름에 대해 동일한 점은 대부분의 로직이 React(또는 Solid 또는 Vue) 외부에서 발생하고 상태 시스템의 모든 업데이트가 컴포넌트에 알려야 하는지 여부를 결정하는 `Observer`로 전파된다는 것입니다.
