---
id: 1
title: "(번역) #1: Practical React Query"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/1-practical-react-query"
tags: [react-query, 번역, 캐싱, 상태관리]
date: "2025-02-16"
---

> [TkDodo](https://github.com/tkdodo)의 [Practical React Query](https://tkdodo.eu/blog/practical-react-query)를 번역한 문서입니다.

2018년 경 GraphQL과 특히 [Apollo Client](https://www.apollographql.com/docs/react/)가 유명해지면서 Redux를 대체할 수 있을지에 대한 논의가 많았습니다. [Redux는 끝났는가?](https://dev.to/markerikson/redux---not-dead-yet-1d9k)에 대한 질문도 많았죠.

저는 이해가 되지 않았습니다. 데이터 불러오기 라이브러리가 왜 전역 상태 관리자를 대체할까요? 이 두 가지가 어떤 연관성이 있는걸까요?

GraphQL 클라이언트인 Apollo가 데이터를 가져오기만 한다고 생각했었는데, 예를 들어 [axios](https://github.com/axios/axios)가 REST를 위해 하는 것과 유사하게 데이터를 애플리케이션에서 사용 가능하게 만들려면 여전히 어떤 방법이 필요하다고 생각했습니다.

제 생각이 맞았습니다.

Apollo는 단순히 여러분이 원하는 데이터를 설명하고 불러오는 일만 하지 않습니다. Apollo는 서버 데이터에 대한 캐시를 제공합니다. 즉, 여러 개의 컴포넌트에서 `useQuery` hook을 사용해도, 오직 한 번만 불러온 후 캐시에서 제공합니다.

이는 서버로부터 데이터를 불러온 후 어디서든 사용할 수 있게 한다는 점에서 우리와 아마 많은 팀들이 `redux`를 사용해온 방식과 매우 유사합니다.

우리는 이미 여느 클라이언트 상태처럼 서버 상태를 다루고 있었던 것처럼 보입니다. 서버 상태는 (서버로부터 불러온 뉴스 기사 목록, 사용자의 상세 정보 등등) 여러분의 어플리케이션이 소유하고 있지는 않다는 점을 제외하면요. 우리는 단지 이 정보의 가장 최신 버전을 화면에 보여주기 위해 빌려왔을 뿐입니다. 데이터 자체는 서버가 보유하고 있죠.

저에게는, 데이터를 생각하는 방식에 대한 발상의 전환으로 다가왔습니다. 캐시를 통해 우리가 보유하고있지 않은 데이터를 보여줄 수 있다면, 실제로 전체 앱에서 사용 가능한 클라이언트 상태는 그리 많지 않다는 것을 의미합니다. 이렇게 보면 왜 많은 사람들이 Apollo가 Redux를 대체할 수 있다고 생각하는지 이해가 되네요.

## 클라이언트 상태 vs. 서버 상태

**클라이언트 상태 (Client State)**
- 여러분의 애플리케이션이 소유하는 상태
- 예: UI 상태, 폼 입력값, 모달 열림/닫힘 상태

**서버 상태 (Server State)**
- 서버가 실제로 소유하는 상태
- 여러분의 애플리케이션은 이것의 복사본만 보유
- 언제든지 유효하지 않을 수 있음
- 예: 뉴스 기사 목록, 사용자 정보

## React Query

저는 GraphQL을 사용해볼 기회가 없었습니다. 우리는 이미 REST API를 보유하고 있었고 데이터를 불러오는데 문제가 없었습니다. 확실히 우리는 전환을 정당화 할만한 페인 포인트가 없었습니다. 특히 전환을 하려면 백엔드에서의 적용도 필요한데 이는 그리 간단한 일이 아닙니다.

그럼에도 불구하고, 프론트엔드에서 데이터 가져오기와 로딩 및 에러 상태 처리가 얼마나 간단하게 보일 수 있는지가 부러웠습니다. 만약 React의 REST API에서도 유사한 기능이 있다면 얼마나 좋을까요…

[React Query](https://tanstack.com/query/latest/)로 들어갑시다.

아마 2019년 후반 쯤, 오픈 소스 개발자 [Tanner Linsley](https://github.com/tannerlinsley)가 만든 React Query는 Apollo의 장점을 채용하여 REST API로 가져왔습니다. React Query는 Promise를 반환하는 어느 함수와도 잘 동작하고 *stale-while-revalidate* 캐시 전략을 포함하고 있습니다. 이 라이브러리는 합리적인 기본 설정으로 동작하며 여러분의 데이터를 가능한한 신선하게 유지하는 동시에 가능한한 사용자의 화면에 빠르게 표시하여 어쩔때는 거의 즉각적으로 보여지는 것 처럼 느껴지게 하므로 훌륭한 사용자 경험을 제공합니다. 또한 React Query는 매우 유연하며 기본 설정이 충분하지 않을 경우 다양한 설정을 커스터마이징 할 수 있습니다.

하지만 이 문서는 React Query의 소개글이 되지는 않을겁니다.

저는 공식 문서가 가이드와 컨셉을 훌륭하게 설명하고 있다고 생각합니다. 여러 강연에서 나온 [동영상](https://tanstack.com/query/latest/docs/react/videos)도 시청할 수 있고, 라이브러리에 익숙해지고 싶다면 Tanner가 제공하는 React Query [Essentials Course](https://learn.tanstack.com/)도 수강할 수 있습니다.

> **업데이트**: 저는 [ui.dev](https://ui.dev/)와 함께 새로운 코스를 개발 중이에요. 지금까지 만들어온 콘텐츠를 즐겨주셨다면, [query.gg](https://query.gg/?r=dom)를 좋아하실 겁니다.

저는 공식 문서를 넘어서 더욱 실용적인 팁에 집중할 생각입니다. 이미 라이브러리를 사용 중이시라면 유용할겁니다. 제가 제공할 팁은 제가 이 라이브러리를 활발하게 사용했을 뿐 아니라 React Query 커뮤니티에 합류하여 디스코드와 깃허브 Discussion에서 답변을 하면서 선택한 것입니다.

## 기본 설정 (The Defaults explained)

저는 React Query의 [기본 설정](https://tanstack.com/query/latest/docs/react/guides/important-defaults)이 매우 잘되어있다고 믿지만, 특히 처음에는 때때로 당황할 수 있습니다. 제일 먼저 React Query는 리렌더링을 할 때마다 `queryFn`을 실행하지 않습니다. `staleTime`의 기본값이 0이어도 말이죠. 어플리케이션은 다양한 이유로 언제든지 리렌더링할 수 있습니다. 이 때마다 데이터를 불러오는 것은 미친 짓일 수도 있습니다!

> *항상 리렌더링을 그리고 리렌더링이 자주 발생할 수 있음을 알고 코딩하세요. 저는 이걸 렌더링 강건성 (render resiliency)이라고 부르는 것을 좋아합니다.*
> — Tanner Linsley

만약 예상하지 못한 다시 불러오기가 일어나는 것을 봤다면 대부분은 여러분이 window를 포커스했고 React Query가 `refetchOnWindowFocus`를 실행했을겁니다. 프로덕션 환경에서 아주 훌륭한 기능이죠. 만약 사용자가 다른 브라우저 탭으로 이동했다가 다시 돌아오면 뒷단에서 데이터 다시 불러오기가 자동으로 실행됩니다. 이 때 만약 서버 상에서의 데이터가 변경되었다면 화면에 보여지는 데이터는 업데이트 될겁니다. 이 모든 일은 로딩 스피너의 출력 없이 발생하며 만약 데이터가 현재 캐시 상에 있는 데이터와 동일하다면 리렌더링은 일어나지 않을겁니다.

이러한 현상은 개발 환경에서 더 자주 발생할 것입니다. 특히 브라우저의 개발자 도구와 어플리케이션을 오갈 때마다 데이터 불러오기가 실행될 것이니 주의하세요.

> **업데이트**: React Query v5 업데이트부터 `refetchOnWindowFocus`는 더이상 `focus` 이벤트를 감지하지 않습니다. 대신 `visibilityChange` 이벤트를 감지합니다. 따라서 개발 환경에서 의도하지 않은 데이터 불러오기가 줄어들 것이며 운영 환경에서의 불러오기와 거의 비슷할 것입니다.

두 번째로 `gcTime`과 `staleTime`에 대해 약간의 논쟁이 있는 것 같아서 한 번 정리하겠습니다.

- **`staleTime`**: 쿼리가 신선한 상태에서 신선하지 않은 상태로 변할 때 까지의 소요 시간입니다. 쿼리가 신선한한 데이터는 항상 캐시에서 불러와질 것입니다. 네트워크 요청은 일어나지 않습니다! 만약 쿼리가 신선하지 않다면 (기본값이 항상으로 지정되어있는) 데이터는 여전히 캐시에서 불러오겠지만 [특정 조건](https://tanstack.com/query/latest/docs/react/guides/caching)에 의해 백그라운드에서 다시 불러와질 것입니다.

- **`gcTime`**: 비활성화된 쿼리가 캐시로부터 제거되기까지의 소요 시간입니다. 기본값은 5분 입니다. 쿼리는 등록된 옵저버가 더이상 없을때 즉, 해당 쿼리를 사용하는 모든 컴포넌트가 언마운트되면 비활성화 상태로 전환됩니다.

이 설정을 바꾸고 싶다면 대부분의 경우 `staleTime`을 수정하면 됩니다. `gcTime`을 조작하는 일은 거의 없었어요.

> **업데이트**: `gcTime`은 이전에 `cacheTime`으로 알려져있던 개념입니다. v5부터 동작을 더 명확하게 의미하기 위해 이름이 변경되었습니다.

## React Query 데브툴을 사용하세요

데브툴은 쿼리가 어떤 상태에 있는지 이해하는데 큰 도움이 될 것입니다. 또한 데브툴은 현재 캐시에 어떤 데이터가 들어있는지도 보여주므로 디버깅이 더 쉬워집니다. 이외에도 백그라운드에서의 데이터 다시 불러오기를 더 잘 파악하려면 브라우저 개발자 도구에서 네트워크 연결을 쓰로틀링 하는 것도 도움이 될 것입니다.

## 쿼리 키를 의존성 배열처럼 다루세요

여기서 말하는 의존성 배열이란 useEffect 훅의 의존성 배열입니다. 이 두가지가 왜 비슷할까요?

왜냐하면 React Query는 쿼리 키가 변할 때마다 데이터를 다시 불러올 것이기 때문입니다. 따라서 어떠한 값이 변할 때마다 데이터를 불러오기를 원한다면 그 값을 `queryFn`에 매개변수로 전달합니다. 데이터 다시 불러오기를 수동으로 트리거하기 위해 복잡한 효과를 조정하는 대신 쿼리 키를 활용할 수 있습니다.

```tsx
type State = "all" | "open" | "done";
type Todo = {
  id: number;
  state: State;
};
type Todos = ReadonlyArray<Todo>;

const fetchTodos = async (state: State): Promise<Todos> => {
  const response = await axios.get(`todos/${state}`);
  return response.data;
};

export const useTodosQuery = (state: State) =>
  useQuery({
    queryKey: ["todos", state],
    queryFn: () => fetchTodos(state),
  });
```

여기, 할 일 목록을 필터링 옵션과 함께 보여주는 UI가 있다고 생각해보세요. 필터링 결과를 보관하는 로컬 상태가 있을겁니다. 그리고 사용자가 옵션을 선택하면 로컬 상태가 업데이트될 것이고 React Query는 자동으로 데이터를 다시 불러올겁니다. 쿼리 키가 변경되었기 때문이죠.

저는 `queryKey`에 포함되어있지 않은 변수를 `queryFn`에 전달한 적도 없는 것 같아요.

## 새로운 캐시 항목

쿼리 키는 캐시의 키로 사용되기 때문에 'all'에서 'done'으로 전환될 때마다 새로운 캐시 항목이 생성됩니다. 이로 인해 첫 전환시에는 하드 로딩 상태가 생길 것입니다. 이는 확실히 이상적이지 않습니다. 따라서 가능하다면 새로 생성된 캐시 항목을 `initialData`로 미리 채워둘 수 있습니다.

```tsx
export const useTodosQuery = (state: State) =>
  useQuery({
    queryKey: ["todos", state],
    queryFn: () => fetchTodos(state),
    initialData: () => {
      const allTodos = queryClient.getQueryData<Todos>(["todos", "all"]);
      const filteredData =
        allTodos?.filter(todo => todo.state === state) ?? [];

      return filteredData.length > 0 ? filteredData : undefined;
    },
  });
```

이제 사용자가 상태를 전환할 때마다, 데이터가 아직 없다면, 'all todos' 캐시에서 데이터를 표시하려고 시도합니다. 사용자에게는 'done' 상태의 할 일 목록이 즉시 보여질 것이고, 백그라운드에서 데이터 불러오기가 완료되면 업데이트된 목록이 보여질 것입니다.

단 몇 줄의 코드로 인한 훌륭한 사용자 경험 개선입니다.

## 서버 상태와 클라이언트 상태를 분리한 채로 유지하세요

`useQuery`로 불러온 데이터를 로컬 상태에 넣으려고 하지 마세요. 가장 큰 이유는 해당 로컬 상태에는 React Query에서 해주는 모든 백그라운드 업데이트가 적용되지 않기 때문입니다. 해당 로컬 상태는 복사본이기 때문에 업데이트가 적용되지 않습니다.

만약 예를 들어 폼을 위한 기본 값을 불러온 후 데이터가 준비되었을 때 폼을 렌더링할 경우 이 방식을 사용해도 괜찮습니다. 백그라운드 업데이트가 새로운 값을 불러올 가능성이 매우 낮고, 불러온다고 해도 폼은 이미 초기화 되어있을 것입니다. 따라서 의도적으로 이 방식을 사용할 경우 백그라운드에서 불필요하게 데이터를 다시 불러오는 일이 없도록 `staleTime`을 설정하세요.

```tsx
const App = () => {
  const { data } = useQuery({
    queryKey: ['key'],
    queryFn,
    staleTime: Infinity,
  })

  return data ? <MyForm initialData={data} /> : null
}

const MyForm = ({ initialData }) => {
  const [data, setData] = React.useState(initialData)
  ...
}
```

화면에 보여지는 데이터를 사용자가 수정할 수 있도록 하고 싶다면 이 방식은 따르기 어려울 수 있습니다. 하지만 로컬에 데이터의 복사본이 없기 때문에 항상 최신의 데이터를 볼 수 있다는 점이 보장됩니다.

## enabled 옵션은 매우 강력합니다

`useQuery` 훅은 동작을 커스터마이징 할 수 있는 많은 옵션을 갖고 있습니다. 그 중에서 `enabled` 옵션은 매우 강력한 옵션으로 많은 멋진 일을 할 수 있게 해줍니다.

- **종속적인 쿼리 (Dependent Queries)**: 하나의 쿼리에서 데이터를 가져오며 첫 번째 쿼리에서 데이터를 성공적으로 얻은 후에 두 번째 쿼리를 실행합니다.

- **쿼리를 켜고 끄기**: `refetchInterval` 덕분에 정기적으로 데이터를 가져올 수 있는 쿼리가 있습니다. 하지만 모달 팝업이 잠시 열려있는 동안에는 화면 뒷부분의 업데이트를 피하기 위해 잠시 멈출 수 있습니다.

- **사용자의 입력 대기**: 쿼리 키에는 일부 필터 기준을 갖고 있지만, 사용자가 필터를 적용할 때 까지 일시적으로 비활성화 합니다.

- **사용자 입력 후 쿼리 비활성화**: 예를 들어, 서버 데이터보다 우선시 해야 하는 드래프트 값이 있는 경우.

## queryCache를 로컬 상태 관리자로 사용하지 마세요

만약 queryCache (`queryClient.setQueryData`)를 조작한다면 낙관적인 업데이트 또는 mutation 이후 백엔드에서 받은 데이터를 작성하는 경우여야만 합니다. 백그라운드에서 다시 불러오는 데이터는 현재 데이터를 덮어씌울 수 있다는 점을 기억하세요. 따라서 로컬 상태에는 다른 상태관리 도구를 사용하세요.

## 커스텀 훅을 생성하세요

하나의 useQuery 호출만 감싼다고 하더라도 커스텀 훅을 만드는 것은 보통 가치가 있습니다.

- 실제 데이터 불러오기를 UI와 분리하여 `useQuery` 호출과 함께 위치시킬 수 있습니다.
- 하나의 쿼리 키에 대한 모든 사용법 (그리고 존재한다면 타입 정의 까지)을 하나의 파일에 유지할 수 있습니다.
- 일부 설정을 조절하거나 데이터 변환을 추가해야 하는 경우 한 곳에서 처리할 수 있습니다.
