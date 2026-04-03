---
id: 11
title: "WebSocket + React Query - 이벤트 기반 캐시 무효화"
tags: ["react-query", "WebSocket", "invalidateQueries", "staleTime"]
difficulty: "easy"
sourceDoc: [7]
---

## 질문

아래는 WebSocket 이벤트를 받아 React Query 캐시를 갱신하는 커스텀 훅이다.
동작 방식을 분석하고 질문에 답해보자.

```tsx
const useReactQuerySubscription = () => {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const websocket = new WebSocket('wss://echo.websocket.org/');
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

서버가 다음 이벤트를 전송했다고 가정하자:
```json
{ "entity": ["posts", "detail"], "id": 5 }
```

1. 현재 사용자가 **Profile 페이지**에 있고 Posts 관련 쿼리가 마운트되어 있지 않다면, `invalidateQueries` 호출 시 실제로 네트워크 요청이 발생하는가?
2. WebSocket으로 모든 실시간 업데이트를 받고 있다면, `staleTime`을 어떻게 설정하는 것이 좋은가? 그 이유는?
3. `invalidateQueries` 대신 `setQueryData`로 직접 캐시를 업데이트하는 방식의 **트레이드오프**는 무엇인가?

**힌트:** `invalidateQueries`는 활성 옵저버가 없는 쿼리에 대해서는 "오래됨" 표시만 한다는 점을 기억하자.

---answer---

## 정답: 이벤트 기반 무효화와 staleTime 전략

### 핵심 아이디어

WebSocket 이벤트로 `invalidateQueries`를 호출하면, **활성 옵저버가 있는 쿼리만 즉시 다시 불러오고**, 비활성 쿼리는 다음 마운트 시 갱신된다. 이 방식은 불필요한 네트워크 요청을 자동으로 방지한다.

### 질문별 상세 답변

**Q1: Profile 페이지에서 Posts 이벤트를 받으면?**

네트워크 요청이 **발생하지 않는다.** `invalidateQueries`는 해당 쿼리를 "stale(오래됨)"로 표시만 한다. Posts 쿼리에 활성 옵저버(마운트된 컴포넌트)가 없으므로 실제 fetch는 일어나지 않는다. 나중에 사용자가 Posts 페이지로 이동하면 그때 데이터를 새로 불러온다.

**Q2: staleTime 설정 전략**

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,  // ✅ WebSocket이 갱신을 담당
    },
  },
});
```

`staleTime: Infinity`로 설정하는 것이 좋다. 이유:
- WebSocket이 실시간으로 변경 사항을 알려주므로, window focus나 mount 시 자동 refetch가 **중복 요청**이 된다.
- 데이터 갱신은 오직 WebSocket 이벤트에 의한 `invalidateQueries` 호출로만 발생한다.
- 최초 `useQuery` 호출 시에만 서버에서 데이터를 가져오고, 이후에는 캐시와 WebSocket 기반으로 동작한다.

**Q3: invalidateQueries vs setQueryData 트레이드오프**

| | invalidateQueries | setQueryData |
|---|---|---|
| 네트워크 요청 | 발생 (서버에서 최신 전체 데이터) | 없음 (클라이언트에서 직접 수정) |
| 데이터 정합성 | 높음 (서버가 진실의 원천) | 낮을 수 있음 (부분 업데이트 시) |
| 적합한 경우 | 대부분의 경우 | 빈번한 소규모 업데이트 |
| 단점 | 추가 요청 비용 | 추가/삭제 처리가 복잡 |

대부분의 경우 **`invalidateQueries`가 더 안전**하다. `setQueryData`는 목록과 상세 등 여러 쿼리 키에 걸친 데이터를 일관성 있게 업데이트해야 하므로 복잡도가 높아진다.
