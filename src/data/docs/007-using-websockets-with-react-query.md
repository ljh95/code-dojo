---
id: 7
title: "(번역) #7: Using WebSockets with React Query"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/7-using-websockets-with-react-query"
tags: [react-query, 번역, WebSocket]
date: ""
---

> 이 문서는 [TkDodo](https://github.com/tkdodo)의 "Using WebSockets with React Query"를 번역한 것입니다.

React Query와 웹소켓을 사용해서 실시간 데이터를 다루는 방법은 최근에 가장 많이 들어본 질문 중 하나였습니다. 이번 포스트에서는 이 기술을 약간 다뤄보고 이에 대한 제 고찰을 다뤄보겠습니다 :)

## 웹소켓은 무엇인가 (What are WebSockets)

간단히 말하자면 웹소켓은 푸쉬 메시지, 또는 "실시간 데이터"가 서버에서 클라이언트(브라우저)로 전송될 수 있도록 합니다. 일반적인 HTTP의 경우 클라이언트가 데이터를 요청하고, 서버는 응답을 보낸 후 연결이 종료됩니다.

클라이언트에서 연결을 시작하고 첫 요청을 보내기 때문에, 서버는 업데이트가 가능해도 클라이언트에게 데이터를 먼저 보낼 수 없습니다.

여기서 [웹소켓](https://en.wikipedia.org/wiki/WebSocket)이 등장합니다.

여느 HTTP 요청과 마찬가지로 브라우저가 연결을 시작하지만, 이때 해당 연결을 웹소켓으로 업그레이드하고 싶다는 점을 명시합니다. 서버가 이를 받으면 브라우저와 서버는 프로토콜을 교체합니다. 이 연결은 한쪽이 종료하기로 결정하기 전까지는 종료되지 않으며, 이제 양쪽이 데이터를 전달할 수 있는 완전한 양방향 연결이 수립됩니다.

이 방식의 주된 장점은 이제 서버가 특정 데이터를 클라이언트에게 보낼 수 있다는 점입니다. 여러 사용자가 같은 데이터를 보고 있고, 한 사용자가 데이터를 업데이트했을 때 웹소켓은 이러한 업데이트를 실시간으로 즉시 전송합니다.

## React Query와 통합 (React Query integration)

React Query는 클라이언트 사이드 비동기 상태 관리 라이브러리이기 때문에 서버에서 웹소켓을 구축하는 방법은 다루지 않겠습니다.

React Query에는 웹소켓에 특화된 내장 기능이 없습니다. 그렇다고 웹소켓을 지원하지 않다는 것은 아닙니다. React Query는 데이터를 불러오는 방법에는 관여하지 않으며, "resolve 또는 reject된 Promise가 동작하기만 하면 됩니다." 나머지는 사용자에게 달려있습니다.

## 스텝 바이 스텝 (Step by Step)

일반적인 아이디어는 웹소켓을 사용하지 않을 때와 같이 쿼리를 세팅하는 것입니다. 대부분의 경우 일반적인 HTTP 엔드포인트를 갖고 엔티티에 쿼리를 날리거나 수정할 것입니다.

```tsx
const usePosts = () => useQuery({ queryKey: ['posts', 'list'], queryFn: fetchPosts });

const usePost = (id) =>
  useQuery({
    queryKey: ['posts', 'detail', id],
    queryFn: () => fetchPost(id),
  });
```

웹소켓 엔드포인트에 연결하기 위해 앱 전역에 `useEffect`를 설정할 수 있습니다. 이는 사용하는 기술에 따라 완전히 달라질 수 있습니다. 제 예시에서는 간단하게 브라우저 [웹소켓 API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)를 사용하겠습니다.

```tsx
const useReactQuerySubscription = () => {
  React.useEffect(() => {
    const websocket = new WebSocket('wss://echo.websocket.org/');
    websocket.onopen = () => {
      console.log('connected');
    };

    return () => {
      websocket.close();
    };
  }, []);
};
```

### 데이터 소비 (Consuming data)

연결을 세팅한 다음부터는, 웹소켓을 통해 데이터가 넘어올 때 어떤 콜백 함수를 실행할 수 있습니다. 저는 백엔드가 완전한 데이터 객체 대신 이벤트를 전송하는 방식을 선호합니다.

```tsx
const useReactQuerySubscription = () => {
  const queryClient = useQueryClient();
  React.useEffect(() => {
    const websocket = new WebSocket('wss://echo.websocket.org/');
    websocket.onopen = () => {
      console.log('connected');
    };
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const queryKey = [...data.entity, data.id].filter(Boolean);
      queryClient.invalidateQueries({ queryKey });
    };

    return () => {
      websocket.close();
    };
  }, [queryClient]);
};
```

이벤트를 받았을 때 목록과 상세 화면을 업데이트하는 방법:

- `{ "entity": ["posts", "list"] }` — posts와 list를 무효화합니다.
- `{ "entity": ["posts", "detail"], id: 5 }` — 한 개의 post를 무효화합니다.
- `{ "entity": ["posts"] }` — post와 연관된 모든 것을 무효화합니다.

[쿼리 무효화](https://react-query.tanstack.com/guides/query-invalidation)는 웹소켓과 정말로 궁합이 좋습니다. 현재 시점에서 관련이 없는 엔티티에 대한 이벤트를 받아도 아무 일이 일어나지 않을 것입니다. 예를 들어, 현재 Profile 페이지에 머물러있는데 Posts 페이지에 대한 업데이트를 수신했다면, `invalidateQueries`는 이후에 Posts 페이지 방문 시 데이터를 반드시 다시 불러올 것입니다. 하지만 지금 당장은 활성화 되어있는 옵저버가 없기 때문에 데이터를 다시 불러오지 않을 것입니다.

### 부분적인 데이터 업데이트 (Partial data updates)

작은 주기로 업데이트되는 큰 자료 구조가 있을 때, 웹소켓을 통해 데이터를 부분적으로 업데이트하고 싶을 수 있습니다.

게시물의 제목이 변경되었나요? 제목을 전송하세요. 좋아요 수가 변경되었어도 전송하면 그만입니다.

부분적인 업데이트를 하려면 무효화하는 것보다 [queryClient.setQueryData](https://react-query.tanstack.com/reference/QueryClient#queryclientsetquerydata)를 통해 쿼리 캐시를 바로 업데이트할 수 있습니다.

이 경우는 동일한 데이터에 대해 여러 개의 쿼리키가 있을 경우 조금 불편할 수 있습니다. [queryClient.setQueriesData](https://react-query.tanstack.com/reference/QueryClient#queryclientsetqueriesdata)는 이러한 사용 사례를 다룰 수 있도록 상대적으로 최근에 라이브러리에 추가된 기능입니다.

```tsx
const useReactQuerySubscription = () => {
  const queryClient = useQueryClient();
  React.useEffect(() => {
    const websocket = new WebSocket('wss://echo.websocket.org/');
    websocket.onopen = () => {
      console.log('connected');
    };
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      queryClient.setQueriesData(data.entity, (oldData) => {
        const update = (entity) => (entity.id === data.id ? { ...entity, ...data.payload } : entity);
        return Array.isArray(oldData) ? oldData.map(update) : update(oldData);
      });
    };

    return () => {
      websocket.close();
    };
  }, [queryClient]);
};
```

이 기능은 조금 과하게 동적인 것 같으며, 추가와 삭제를 다루지 않고 있습니다. 그래서 쿼리 무효화를 사용하는 것이 더 나을 수 있습니다.

무효화와 부분적인 업데이트를 모두 다루고 있는 [codesandbox 예시](https://codesandbox.io/s/react-query-websockets-ep1op)를 준비했습니다.

## staleTime 증가시키기 (Increasing StaleTime)

React Query에서 [staleTime의 기본값은 0](https://react-query.tanstack.com/guides/important-defaults)입니다. 이는 모든 쿼리가 즉시 오래되었다고 판단되며, 새로운 구독자가 마운트되거나 사용자가 window를 다시 포커스하면 데이터를 다시 불러옵니다.

이는 데이터를 실시간으로 업데이트한다는 점에서 웹소켓의 목적과 크게 중복됩니다. 이미 데이터를 수동으로 무효화했는데 왜 굳이 다시 불러와야할까요?

따라서 웹소켓을 통해 모든 데이터를 업데이트했다면 `staleTime`을 높게 설정하는 것을 고려해보세요. `Infinity`를 사용하면 데이터는 처음에 `useQuery`를 통해 불러와질 것이고 그 다음부터는 항상 캐시로부터 불러와집니다. 데이터를 다시 불러오는 것은 명시적인 쿼리 무효화를 통해서만 이루어집니다.

이러한 방식을 구현하기 위한 최고의 방법은 `QueryClient`를 생성하면서 전역에서 쿼리 기본값을 설정하는 것입니다.

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});
```
