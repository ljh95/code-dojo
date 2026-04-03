---
id: 5
title: "Status Check 순서 - 백그라운드 에러 대응 패턴"
tags: ["react-query", "상태체크", "에러처리", "UX"]
difficulty: "medium"
sourceDoc: [4]
---

## 질문

아래 두 코드는 동일한 쿼리 결과를 보여주지만, **status check 순서**가 다르다.

```tsx
// 패턴 A: 표준 예시
const todos = useTodos();

if (todos.isPending) {
  return 'Loading...';
}
if (todos.error) {
  return 'An error has occurred: ' + todos.error.message;
}
return <div>{todos.data.map(renderTodo)}</div>;
```

```tsx
// 패턴 B: data 우선 체크
const todos = useTodos();

if (todos.data) {
  return <div>{todos.data.map(renderTodo)}</div>;
}
if (todos.error) {
  return 'An error has occurred: ' + todos.error.message;
}
return 'Loading...';
```

다음 시나리오에서 각 패턴의 동작 차이를 설명하시오.

> 사용자가 todo 목록을 성공적으로 로딩한 후, 다른 탭으로 이동했다가 5분 뒤에 돌아왔다. 이때 서버가 다운되어 백그라운드 refetch가 실패했다.

1. 이 시점에서 쿼리의 `status`, `error`, `data` 값은 각각 무엇인가?
2. 패턴 A와 패턴 B는 사용자에게 각각 무엇을 보여주는가?
3. 어떤 패턴이 이 상황에서 더 좋은 UX를 제공하는가? 그 이유는?

**힌트:** React Query의 `status`는 `"error"`이면서 동시에 이전에 가져온 `data`를 보유할 수 있다.

---answer---

## 정답: data 존재 여부를 먼저 확인하기

### 핵심 아이디어

React Query는 **stale-while-revalidate** 전략을 사용하므로, 에러가 발생해도 이전에 캐시된 데이터를 보유한다. status check 순서에 따라 오래된 데이터를 보여줄지, 에러 화면으로 대체할지가 결정된다.

### 단계별 해설

**Q1: 쿼리 상태**

```json
{
  "status": "error",
  "error": { "message": "Network Error" },
  "data": [{ "id": 1, "name": "Learn React Query" }, ...]
}
```

`status`는 `"error"`이지만, 이전 fetch에서 가져온 `data`가 여전히 캐시에 남아있다. React Query에서 에러와 데이터는 **동시에 존재할 수 있다.**

**Q2: 각 패턴의 동작**

- **패턴 A**: `isPending`은 `false` -> `error`가 존재 -> **에러 메시지를 보여준다.** 이전에 정상적으로 보이던 todo 목록이 갑자기 에러 화면으로 바뀐다.
- **패턴 B**: `data`가 존재 -> **이전 데이터를 그대로 보여준다.** 사용자는 (약간 오래된) todo 목록을 계속 볼 수 있다.

**Q3: 더 좋은 UX**

**패턴 B**가 대부분의 경우 더 좋은 UX를 제공한다. 사용자 입장에서 잘 보이던 목록이 갑자기 에러 화면으로 바뀌는 것은 혼란스럽다. 특히 React Query는 실패한 쿼리를 **지수 백오프로 3번 재시도**하므로, 에러 화면이 표시되기까지 수 초가 걸릴 수 있어 더욱 당황스럽다.

### 깊은 이유 설명

React Query의 강력한 자동 refetch(`refetchOnWindowFocus`, `refetchOnReconnect`)는 데이터를 최신으로 유지하지만, 동시에 **백그라운드 에러가 발생할 확률도 높인다.** 표준 예시의 status check 순서를 그대로 쓰면 이 자동 refetch의 이점이 오히려 UX를 해칠 수 있다.

상황에 따라 다르겠지만, 일반적으로 다음 원칙을 따르는 것이 좋다:

- **data가 있으면 먼저 보여준다** (stale data > no data)
- **에러는 토스트나 배너 등 비침습적 방식으로 알린다**
- **data가 전혀 없을 때만 전체 에러 화면을 보여준다**
