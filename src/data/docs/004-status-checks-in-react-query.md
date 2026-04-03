---
id: 4
title: "(번역) #4: Status Checks in React Query"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/4-status-checks-in-react-query"
tags: [react-query, 번역, 상태체크]
date: ""
---

> [TkDodo](https://github.com/tkdodo)의 [Status Checks in React Query](https://tkdodo.eu/blog/status-checks-in-react-query)를 번역한 문서입니다.

React Query의 이점 중 하나는 쿼리의 상태(status) 필드에 접근이 쉽다는 점입니다. 쿼리가 로딩 중인지 또는 에러가 발생했는지를 바로 알 수 있습니다. 이를 위해 React Query는 내부의 상태 머신에서 파생된 여러 불리언 플래그 값을 노출시킵니다. [타입](https://github.com/TanStack/query/blob/87358d73582b369f06cc81d0dfa135323df7d43d/packages/query-core/src/types.ts#L441)을 보면 쿼리는 다음과 같은 상태 중 하나를 가질 수 있습니다.

- `success`: 쿼리가 성공했으며 알맞은 `data`를 갖고 있는 상태
- `error`: 쿼리가 동작하지 않았으며 `error` 데이터가 세팅되어있는 상태
- `pending`: 쿼리에 데이터가 없는 상태
- `isFetching` 플래그는 내부 상태 머신에서 나오는 값이 아닙니다.
  - 이 플래그는 요청이 진행 중이면 항상 true가 되는 별도의 플래그 값입니다. fetching이면서 success일 수 있고, fetching이면서 error일 수 있지만 로딩과 success과 동시에 발생할 수는 없습니다. 이 점은 상태 머신이 확실히 합니다.

> **Update** v5 이전에는 `pending` 값의 이름이 `loading` 이었습니다. 그리고 v4 이전에는 `idle`이라고 불리우는 4번째 상태가 있었습니다. 또한 `isFetching` 플래그는 두 번째 `fetchStatus` 에서 나왔습니다. `isPaused` 플래그처럼 말이죠. 여기에 대해서는 [#13: Offline React Query](https://tkdodo.eu/blog/offline-react-query)에서 더 알아볼 수 있습니다.

## 표준 예시 (The standard example)

대부분의 예시는 다음과 같습니다.

```tsx
const todos = useTodos();

if (todos.isPending) {
  return 'Loading...';
}
if (todos.error) {
  return 'An error has occurred: ' + todos.error.message;
}

return <div>{todos.data.map(renderTodo)}</div>;
```

이 예시에서는 pending과 error를 먼저 체크하고 데이터를 보여줍니다. 이러한 방식은 일부 사용 사례에서는 괜찮겠지만 그렇지 않은 사례도 있습니다. 많은 데이터 가져오기 솔루션에서, 특히 수동으로 직접 만든 것은, 데이터를 다시 불러오는 메커니즘이 없거나, 명시적인 사용자 상호 작용을 통해서만 다시 불러옵니다.

하지만 React Query는 그렇지 않습니다. React Query는 기본적으로 꽤 강력하게 데이터를 다시 불러오며 사용자가 명시적으로 데이터 다시 불러오기를 요청하지 않아도 됩니다. `refetchOnMount`, `refetchOnWindowFocus` 그리고 `refetchOnReconnect`의 개념은 데이터를 정확한 상태로 유지하는데 좋지만, 백그라운드에서 자동으로 데이터 불러오기가 실패할 경우 혼란스러운 사용자 경험을 초래할 수 있습니다.

## 백그라운드 에러 (Background errors)

많은 상황에서, 백그라운드에서 데이터 다시 불러오기가 실패할 경우, 조용하게 무시할 수 있습니다. 하지만 위의 코드에서는 불가능합니다. 2가지 예시를 들어보겠습니다.

- 사용자가 페이지를 열고 첫 번째 쿼리가 성공적으로 로딩됩니다. 잠깐 동안 페이지에서 활동한 후 이메일을 확인하기 위해 탭을 전환합니다. 몇 분 후에 페이지로 다시 돌아오면 React Query는 백그라운드에서 데이터를 다시 불러옵니다. 그리고 데이터 불러오기가 실패합니다.
- 사용자는 어떠한 목록을 보여주는 페이지에 들어와있습니다. 사용자는 상세 정보를 보기 위해 목록 중 하나를 클릭합니다. 정상적으로 동작했고 사용자는 다시 목록으로 돌아왔습니다. 사용자가 다시 상세 정보 화면으로 들어가면 캐시로부터 불러와진 데이터를 볼 것입니다. 이는 훌륭한 동작입니다. 백그라운드에서 데이터 다시 불러오기가 실패할 경우를 제외하고 말이죠.

두 가지 상황 모두에서 쿼리는 다음과 같은 상태를 갖게 될 것입니다.

```json
{
  "status": "error",
  "error": { "message": "Something went wrong" },
  "data": [{ ... }]
}
```

보시다시피 에러와 오래된 데이터를 _모두_ 사용할 수 있습니다. 이것이 React Query가 훌륭한 이유입니다. "stale-while-revalidate" 캐싱 메커니즘을 수용하므로, 오래된 데이터라 할지라도 존재한다면 보여줍니다.

이제 어떤 것을 보여줄지는 우리에게 달려있습니다. 에러를 보여주는게 중요할까요? 오래된 데이터가 있다면 그 데이터를 보여주는 것으로 충분할까요? 약간의 _백그라운드에서 에러 표시_ 등을 사용해서 에러와 오래된 데이터를 모두 보여줘야 할까요?

이 질문에는 완벽한 답변이 없습니다. 여러분이 어떻게 사용하시느냐에 전적으로 달려있습니다. 하지만 위의 두 가지 예시에서는, 데이터가 갑자기 에러 화면으로 바뀐다면 혼란스러운 사용자 경험을 줄 수도 있을 것 같다고 생각합니다.

이는 React Query가 지수 백오프를 사용하여 실패한 쿼리를 세 차례 다시 시도하므로, 오래된 데이터가 오류 화면으로 대체될 때까지 몇 초가 걸릴 수 있기 때문에 더 중요합니다. 백그라운드에서 데이터 불러오기에 대한 표시가 없다면 매우 혼란스러울 수 있습니다.

이러한 이유로 저는 데이터가 존재하는지 여부를 제일 먼저 확인합니다.

```tsx
const todos = useTodos();

if (todos.data) {
  return <div>{todos.data.map(renderTodo)}</div>;
}
if (todos.error) {
  return 'An error has occurred: ' + todos.error.message;
}

return 'Loading...';
```

다시 말씀드리지만 뭐가 옳은지에 대한 확실한 규칙은 없습니다. 사용 사례에 따라 크게 달라지기 때문이죠. React Query의 사용자들은 "강력한 데이터 다시 불러오기 기능이 갖고 오는 결과를 인지"하고 있어야 하며, 간단한 할 일 예시를 무작정 따르기보다는 코드를 적절하게 구조화 해야 합니다.

이러한 상태 확인 패턴이 어떤 상황에서 안좋을 수 있는지를 처음으로 강조해준 [Niek Bosch](https://github.com/boschni)에게 특히 감사를 표합니다.
