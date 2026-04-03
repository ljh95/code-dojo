---
id: 17
title: "(번역) React Query meets React Router"
author: "TkDodo (번역)"
source: "https://tkdodo.eu/blog/react-query-meets-react-router"
tags: [react-query, 번역, react-router, loader, action]
date: "2022-08-28"
---

[Remix](https://remix.run/)가 판도를 바꾸고 있으며, 그들의 데이터 페칭 개념(loader와 action)을 [React Router 6.4](https://reactrouter.com/en/6.4.0/start/overview)를 통해 순수 클라이언트 사이드 렌더링 애플리케이션에도 가져오고 있습니다. 저는 이 개념을 아주 잘 보여주고, 작지만 기능이 풍부한 앱을 빠르게 만드는 방법을 시연하는 훌륭한 [튜토리얼](https://reactrouter.com/en/6.4.0/start/tutorial)을 살펴보았습니다.

React Router가 데이터 페칭 영역에 진입하면서, 이것이 React Query 같은 기존 데이터 페칭 및 캐싱 라이브러리와 어떻게 경쟁하거나 어우러지는지 이해하는 것이 자연스럽게 흥미로운 주제가 되었습니다. 그래서 여기서 바로 스포일러를 하겠습니다:

**이 둘은 천생연분입니다**

## 데이터를 페칭하는 라우터

요약하자면: React Router는 각 라우트에 [loader](https://reactrouter.com/en/6.4.0/route/loader)를 정의할 수 있게 해주며, 이 loader는 해당 라우트에 방문할 때 호출됩니다. 라우트 컴포넌트 내부에서는 `useLoaderData()`를 사용하여 해당 데이터에 접근할 수 있습니다. 데이터 업데이트는 `Form`을 제출하는 것만큼 간단하며, 이는 [action](https://reactrouter.com/en/6.4.0/route/action) 함수를 호출합니다. action은 모든 활성 loader를 무효화하므로, 화면에서 업데이트된 데이터를 마법처럼 자동으로 볼 수 있습니다.

이것이 `queries`와 `mutations`와 매우 비슷하게 들린다면 — 맞습니다. 그래서 [Remixing React Router](https://remix.run/blog/remixing-react-router) 발표 이후 떠오르는 질문들은 다음과 같습니다:

- 라우트에서 페칭할 수 있게 된 지금, 여전히 React Query가 필요한가?
- 이미 React Query를 사용하고 있다면, 새로운 React Router 기능을 활용하고 싶은가 (그리고 어떻게 활용할 수 있는가)?

### 캐시가 아니다

저에게 두 질문의 답은 분명합니다: 네. Remix 팀의 [Ryan Florence](https://twitter.com/ryanflorence)가 말했듯이: "React Router는 캐시가 아닙니다":

> **Ryan Florence** @ryanflorence
>
> 아뇨, React Router는 캐시가 아닙니다.
>
> 브라우저에는 HTTP를 통한 캐시가 내장되어 있고, React Query 같은 라이브러리가 이 역할을 완벽하게 해냅니다.
>
> React Router는 *언제(when)*에 관한 것이고, 데이터 캐싱 라이브러리는 *무엇(what)*에 관한 것입니다.

"가능한 한 빨리" 페칭하는 것은 최상의 사용자 경험을 제공하기 위한 중요한 개념입니다. [NextJs](https://nextjs.org/)나 Remix 같은 풀스택 프레임워크는 이 단계를 서버로 옮기는데, 서버가 가장 이른 진입점이기 때문입니다. 클라이언트 사이드 렌더링 애플리케이션에서는 그런 여유가 없습니다.

### 일찍 페칭하기

우리가 보통 하는 것은 컴포넌트 마운트 시 — 데이터가 처음 필요할 때 — 페칭하는 것입니다. 이는 좋지 않은데, 초기 페칭이 진행되는 동안 사용자에게 로딩 스피너가 보이기 때문입니다. [Prefetching](https://tanstack.com/query/v4/docs/guides/prefetching)이 도움이 될 수 있지만, 이는 후속 네비게이션에만 해당하고 라우트로 이동하는 모든 경로에 대해 수동으로 설정해야 합니다.

반면 라우터는 여러분이 어떤 페이지를 방문하려는지 항상 먼저 아는 첫 번째 컴포넌트이며, 이제 loader가 있기 때문에 해당 페이지가 렌더링에 필요한 데이터가 무엇인지 알 수 있습니다. 이는 첫 페이지 방문에 훌륭합니다 — 하지만 loader는 *매번* 페이지 방문 시 호출됩니다. 그리고 라우터에는 캐시가 없기 때문에, 우리가 무언가를 하지 않는 한 서버에 다시 요청을 보내게 됩니다.

예시로, 연락처 목록이 있다고 가정해봅시다. 연락처 중 하나를 클릭하면 연락처 상세 정보를 보여줍니다:

```jsx
// src/routes/contact.jsx
import { useLoaderData } from 'react-router-dom'
import { getContact } from '../contacts'

// ⬇️ 상세 라우트의 loader
export async function loader({ params }) {
  return getContact(params.contactId)
}

export default function Contact() {
  // ⬇️ loader로부터 데이터를 가져옴
  const contact = useLoaderData()
  // jsx 렌더링
}
```

```jsx
// src/main.jsx
import Contact, { loader as contactLoader } from './routes/contact'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        path: 'contacts',
        element: <Contacts />,
        children: [
          {
            path: 'contacts/:contactId',
            element: <Contact />,
            // ⬇️ 상세 라우트의 loader
            loader: contactLoader,
          },
        ],
      },
    ],
  },
])
```

`contacts/1`로 이동하면, 해당 연락처의 데이터가 컴포넌트가 렌더링되기 *전에* 페칭됩니다. Contact를 보여주려는 시점에는 `useLoaderData`에 이미 데이터가 준비되어 있습니다. 이는 사용자 경험뿐 아니라, 데이터 페칭과 렌더링이 같은 곳에 위치하는 개발자 경험도 정말 좋습니다.

### 너무 자주 페칭하기

캐시가 없는 것의 큰 단점은 Contact 2로 갔다가 다시 Contact 1로 돌아올 때 드러납니다. React Query에 익숙하다면, Contact 1의 데이터가 이미 캐시되어 있어서 즉시 보여줄 수 있고 데이터가 stale하다고 판단되면 백그라운드 refetch를 시작한다는 것을 알 것입니다. loader 접근 방식에서는 이전에 이미 페칭했음에도 불구하고 데이터를 다시 페칭해야 합니다 (그리고 페칭이 끝날 때까지 기다려야 합니다!).

바로 이 지점에서 React Query가 등장합니다.

loader를 사용해서 React Query 캐시를 미리 채워두되, 컴포넌트에서는 여전히 `useQuery`를 사용하여 `refetchOnWindowFocus`나 stale 데이터를 즉시 보여주는 등 React Query의 모든 장점을 누릴 수 있다면 어떨까요? 저에게 이것은 양쪽의 장점을 모두 취하는 것처럼 들립니다. 라우터는 데이터를 일찍 페칭하는 것 (캐시에 없는 경우)을 담당하고, React Query는 캐싱과 데이터를 최신 상태로 유지하는 것을 담당합니다.

## 예제를 Query화 하기

```jsx
// src/routes/contacts.jsx
import { useQuery } from '@tanstack/react-query'
import { getContact } from '../contacts'

// ⬇️ 쿼리를 정의
const contactDetailQuery = (id) => ({
  queryKey: ['contacts', 'detail', id],
  queryFn: async () => getContact(id),
})

// ⬇️ queryClient에 접근이 필요함
export const loader =
  (queryClient) =>
  async ({ params }) => {
    const query = contactDetailQuery(params.contactId)
    // ⬇️ 데이터를 반환하거나 페칭함
    return (
      queryClient.getQueryData(query.queryKey) ??
      (await queryClient.fetchQuery(query))
    )
  }

export default function Contact() {
  const params = useParams()
  // ⬇️ 평소처럼 useQuery 사용
  const { data: contact } = useQuery(
    contactDetailQuery(params.contactId),
  )
  // jsx 렌더링
}
```

```jsx
// src/main.jsx
const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        path: 'contacts',
        element: <Contacts />,
        children: [
          {
            path: 'contacts/:contactId',
            element: <Contact />,
            // ⬇️ queryClient를 라우트에 전달
            loader: contactLoader(queryClient),
          },
        ],
      },
    ],
  },
])
```

여기서 몇 가지 일이 일어나고 있으니, 하나씩 분석해봅시다:

### loader는 QueryClient에 접근이 필요하다

loader는 훅이 아니므로 `useQueryClient`를 사용할 수 없습니다. QueryClient를 직접 import하는 것은 권장하지 않는 방법이므로, 명시적으로 전달하는 것이 가장 좋은 대안으로 보입니다.

### getQueryData ?? fetchQuery

우리는 loader가 데이터가 준비될 때까지 기다렸다가 반환하여 첫 로딩에서 좋은 경험을 제공하길 원합니다. 또한 에러가 [errorElement](https://reactrouter.com/en/6.4.0/route/error-element)로 throw되길 원하므로, `fetchQuery`가 최선의 선택입니다. 참고로 `prefetchQuery`는 아무것도 반환하지 않고 내부적으로 에러를 catch합니다.

`getQueryData`는 stale한 데이터라도 캐시에 있는 모든 데이터를 반환하는 역할을 합니다. 이렇게 하면 페이지를 반복 방문할 때 데이터가 즉시 표시됩니다. `getQueryData`가 `undefined`를 반환하는 경우에만 실제로 fetch를 수행합니다.

대안적인 접근 방식으로 `fetchQuery`에 `staleTime`을 설정할 수 있습니다:

```jsx
// 대안 loader
export const loader =
  (queryClient) =>
  ({ params }) =>
    queryClient.fetchQuery({
      ...contactDetailQuery(params.contactId),
      staleTime: 1000 * 60 * 2,
    })
```

`staleTime`을 2분으로 설정하면, `fetchQuery`는 데이터가 사용 가능하고 2분보다 오래되지 않았다면 즉시 데이터를 resolve하고, 그렇지 않으면 fetch를 수행합니다.

> **업데이트**: [v4.18.0](https://github.com/TanStack/query/releases/tag/v4.18.0)부터 내장된 `queryClient.ensureQueryData` 메서드를 사용하여 동일한 결과를 얻을 수 있습니다. 이것은 말 그대로 `getQueryData ?? fetchQuery`로 구현되어 있지만, 라이브러리에서 기본 제공할 만큼 충분히 흔한 사용 사례입니다.

### TypeScript 팁

이렇게 하면 컴포넌트에서 `useQuery`를 호출할 때 항상 어떤 데이터가 사용 가능하다는 것이 보장됩니다. 하지만 TypeScript는 이를 알 방법이 없습니다 — 반환되는 데이터의 타입은 `Contact | undefined`입니다.

`initialData`가 제공되면 union에서 `undefined`를 제외할 수 있습니다. `initialData`를 `useLoaderData`에서 가져오면 됩니다:

```tsx
export default function Contact() {
  const initialData = useLoaderData() as Awaited<
    ReturnType<ReturnType<typeof loader>>
  >
  const params = useParams()
  const { data: contact } = useQuery({
    ...contactDetailQuery(params.contactId),
    initialData,
  })
  // jsx 렌더링
}
```

## action에서 무효화하기

React Query 없이 action이 어떻게 생겼는지 보겠습니다:

```jsx
// src/routes/edit.jsx
export const action = async ({ request, params }) => {
  const formData = await request.formData()
  const updates = Object.fromEntries(formData)
  await updateContact(params.contactId, updates)
  return redirect(`/contacts/${params.contactId}`)
}
```

action은 loader를 무효화하지만, 우리의 loader가 항상 캐시에서 데이터를 반환하도록 설정했기 때문에, 캐시를 어떻게든 무효화하지 않으면 업데이트된 내용을 볼 수 없습니다. 코드 한 줄이면 됩니다:

```jsx
// src/routes/edit.jsx
export const action =
  (queryClient) =>
  async ({ request, params }) => {
    const formData = await request.formData()
    const updates = Object.fromEntries(formData)
    await updateContact(params.contactId, updates)
    await queryClient.invalidateQueries({ queryKey: ['contacts'] })
    return redirect(`/contacts/${params.contactId}`)
  }
```

### await가 레버다

무효화를 트리거한 다음, 상세 뷰로 리다이렉트하고, stale 데이터를 보여준 다음 새 데이터가 사용 가능해지면 백그라운드에서 업데이트되게 할 수도 있습니다. `await` 키워드만 빼면 됩니다:

```jsx
export const action =
  (queryClient) =>
  async ({ request, params }) => {
    const formData = await request.formData()
    const updates = Object.fromEntries(formData)
    await updateContact(params.contactId, updates)
    queryClient.invalidateQueries({ queryKey: ['contacts'] })
    return redirect(`/contacts/${params.contactId}`)
  }
```

await는 말 그대로 어느 방향으로든 당길 수 있는 레버가 됩니다:

- 가능한 한 빨리 상세 뷰로 전환하는 것이 중요한가? **await하지 마세요.**
- stale 데이터를 보여줄 때 발생할 수 있는 레이아웃 시프트를 피하고 싶거나, 모든 새 데이터가 준비될 때까지 action을 pending 상태로 유지하고 싶은가? **await를 사용하세요.**

여러 무효화가 관련되어 있다면, 두 접근 방식을 혼합하여 중요한 refetch는 기다리되, 덜 중요한 것은 백그라운드에서 처리되게 할 수도 있습니다.

## 요약

새로운 React Router 릴리즈는 모든 애플리케이션이 가능한 한 빨리 fetch를 트리거할 수 있게 하는 훌륭한 진전입니다. 하지만 이것은 캐싱을 대체하지 않습니다 — 그러니 React Router와 React Query를 결합하여 양쪽의 장점을 모두 누리세요.

## 핵심 정리

| 역할 | React Router | React Query |
|------|-------------|-------------|
| 관심사 | **언제(when)** 데이터를 페칭할지 | **무엇(what)**을 캐싱하고 최신 상태로 유지할지 |
| 강점 | 라우트 진입 시점에 데이터를 미리 페칭 | 캐시, stale-while-revalidate, 백그라운드 refetch |
| 한계 | 캐시 없음 → 매번 재요청 | 컴포넌트 마운트 시점까지 페칭 시작을 기다림 |

### 통합 패턴 3단계

**1단계 — 쿼리 정의를 분리한다**

```jsx
const contactDetailQuery = (id) => ({
  queryKey: ['contacts', 'detail', id],
  queryFn: async () => getContact(id),
})
```

**2단계 — loader에서 캐시를 활용한다**

```jsx
export const loader = (queryClient) => async ({ params }) => {
  const query = contactDetailQuery(params.contactId)
  return queryClient.getQueryData(query.queryKey)
    ?? (await queryClient.fetchQuery(query))
}
```

**3단계 — action에서 캐시를 무효화한다**

```jsx
export const action = (queryClient) => async ({ request, params }) => {
  // ... mutation 로직
  await queryClient.invalidateQueries({ queryKey: ['contacts'] })
  return redirect(`/contacts/${params.contactId}`)
}
```

> React Router는 **언제** fetch할지를 결정하고, React Query는 **캐싱과 최신화**를 담당한다. 둘은 경쟁이 아니라 보완 관계다.
