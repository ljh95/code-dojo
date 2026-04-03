---
id: 2
title: "(번역) #2: React Query Data Transformations"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/2-react-query-data-transformations"
tags: [react-query, 번역, 데이터변환]
date: "2025-02-16"
---

> **📌 핵심 요약**
> - 데이터 변환은 queryFn, 렌더링 함수, select 옵션 중 상황에 맞게 선택하되, select 옵션이 최적화와 부분 구독 면에서 가장 강력하다
> - 키워드: select, queryFn, 데이터변환, 부분구독, useMemo
> - 이런 상황에서 다시 읽으면 좋다: 서버 응답 데이터를 컴포넌트에 맞게 가공하는 위치를 결정할 때

---

> **참고**: [TkDodo](https://github.com/tkdodo)의 [React Query Data Transformations](https://tkdodo.eu/blog/react-query-data-transformations)를 번역한 문서입니다.

"react-query에 대한 내 생각"의 두 번째 파트에 오신 것을 환영합니다. 라이브러리와 관련 커뮤니티에 더 많이 관여하면서 사람들이 자주 하는 질문의 몇 가지 패턴을 발견했습니다. 처음에는 모든 질문을 하나의 큰 글로 작성하고 싶었지만 더 관리하기 쉬운 조각으로 나누기로 결정했습니다. 그 중 첫 번째는 꽤 흔하면서도 중요한 일인 데이터 변환입니다.

## 데이터 변환 (Data Transformation)

솔직히 말하면 - 대부분의 사람들은 GraphQL을 사용하지 않습니다. 만약 사용한다면 그들은 그들이 원하는 형식으로 데이터를 요청할 수 있다는 사실에 행복감을 느낄 것입니다.

만약 REST를 사용하고 있다면 백엔드가 반환하는 것에 제약을 갖습니다. 그렇다면 react-query를 사용할 때 어디에서 어떻게 데이터를 가장 잘 변환해야 할까요? 소프트웨어 개발에서 가장 가치 있는 대답은 여기에도 적용되는 유일한 대답입니다.

> 그때그때 달라요.
>
> — 모든 개발자들이 항상 하는 말

여기 3+1 가지의 방법과 각각의 장단점이 있습니다.

### 0. 백엔드에서 진행 (On the backend)

제일 좋은 방법입니다. 여러분이 감당할 수 있다면 말이죠. 만약 백엔드에서 우리가 원하는 데이터 구조 그대로 데이터를 내려준다면 더할나위가 없습니다. 비록 오픈 REST API를 사용할 때처럼 많은 경우에서는 비현실적으로 들릴 수 있겠지만, 기업의 애플리케이션 등에서는 꽤 가능합니다. 백엔드를 통제하고 사용 사례에 딱 맞아떨어지는 데이터 구조의 데이터를 반환하는 엔드포인트를 갖고 있다면, 데이터를 기대하는 대로 전달하는 방법이 좋습니다.

- 🟢 프론트엔드에서 할 일은 없습니다.
- 🔴 항상 가능하지 않습니다.

### 1. queryFn에서 진행 (In the queryFn)

`queryFn`은 `useQuery`에 전달하는 함수입니다. 이는 Promise를 반환하도록 기대하며, 결과로 받은 데이터는 쿼리 캐시에 저장됩니다. 하지만 반드시 백엔드가 제공하는 구조 그대로 반환해야 하는 것은 아닙니다. 반환하기 전에 변환할 수 있습니다.

```tsx
const fetchTodos = async (): Promise<Todos> => {
  const response = await axios.get('todos');
  const data: Todos = response.data;

  return data.map((todo) => todo.name.toUpperCase());
};

export const useTodosQuery = () =>
  useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  });
```

프론트엔드에서는, 이 데이터를 "마치 백엔드에서 이렇게 보내준 것처럼" 활용할 수 있습니다. (예시에서) 코드 어디에서도 대문자로 변환되지 않은 할 일 이름을 다루지 않을 것입니다. 또한 원본 구조에 액세스할 수 없을 것입니다. react-query-devtools를 보면 변환된 구조를 볼 수 있습니다. 네트워크 추적을 보면 원본 구조를 볼 수 있습니다. 혼란스러울 수 있으니 염두에 두세요.

또한 여기서 react-query가 할 수 있는 최적화는 없습니다. 데이터를 가져올 때마다 변환도 같이 실행될 것입니다. 만약 비용이 크다면 다른 대안을 고려하세요. 일부 회사는 데이터 가져오기를 추상화하는 공유 API 레이어를 가지고 있습니다. 따라서 여기서 변환 작업을 수행하지 못할 수도 있습니다.

- 🟢 공간 배치 관점에서 "백엔드와 가깝습니다."
- 🟡 변환된 구조는 캐시에 저장되므로 원본 구조에 접근할 수 없습니다.
- 🔴 데이터를 불러올 때마다 실행됩니다.
- 🔴 자유롭게 조작할 수 없는 공유 API 레이어가 있다면 실현 불가능합니다.

### 2. 렌더링 함수에서 진행 (In the render function)

[Part 1](https://tkdodo.eu/blog/practical-react-query)에서 조언했듯이, 커스텀 훅을 만든다면 그 안에서 변환을 진행할 수 있습니다.

```tsx
const fetchTodos = async (): Promise<Todos> => {
  const response = await axios.get('todos');
  return response.data;
};

export const useTodosQuery = () => {
  const queryInfo = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  });

  return {
    ...queryInfo,
    data: queryInfo.data?.map((todo) => todo.name.toUpperCase()),
  };
};
```

이 방법은 데이터 불러오기 함수가 실행될 때뿐만 아니라 사실 렌더링할 때마다 실행됩니다. (데이터 불러오기를 포함하고 있지 않아도 그렇습니다.) 이는 일반적으로 전혀 문제가 되지 않을 것입니다. 하지만 문제가 된다면 `useMemo`로 최적화할 수 있습니다. 의존성을 *최대한 가볍게* 가져가도록 주의하세요. queryInfo 내부의 `data`는 정말로 변경되지 않는 이상 (데이터 변환을 다시 계산하고 싶은 경우) 참조적으로 안정적일 것입니다. 하지만 queryInfo 그 자체는 그렇지 않습니다. `queryInfo`를 의존성에 추가하면 데이터 변환은 다시 렌더링할 때마다 동작할 것입니다.

```tsx
export const useTodosQuery = () => {
  const queryInfo = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  });

  return {
    ...queryInfo,
    // 🚨 하지 마세요 - useMemo는 아무런 역할도 수행하지 않습니다!
    data: React.useMemo(
      () => queryInfo.data?.map((todo) => todo.name.toUpperCase()),
      [queryInfo]
    ),

    // ✅ queryInfo.data를 올바르게 메모이제이션합니다.
    data: React.useMemo(
      () => queryInfo.data?.map((todo) => todo.name.toUpperCase()),
      [queryInfo.data]
    ),
  };
};
```

특히 커스텀 훅 안에 데이터 변환과 결합된 추가적인 로직이 있다면 이 방법은 좋은 선택지입니다. 데이터는 잠재적으로 undefined일 수 있으므로 사용할 때 옵셔널 체이닝을 사용하도록 주의하세요.

> **업데이트 (Update)**
>
> React Query가 v4부터 [추적되는 쿼리](https://tkdodo.eu/blog/react-query-render-optimizations#tracked-queries) 기능을 기본적으로 활성화했으므로 `...queryInfo`로 펼치는 것은 더 이상 권장되지 않습니다. 모든 프로퍼티에 대해 getter 함수를 실행할 것이기 때문이죠.

- 🟢 useMemo를 통해 최적화할 수 있습니다.
- 🟡 devtools 안에서 정확한 구조를 살펴볼 수 없습니다.
- 🔴 data가 잠재적으로 undefined일 수 있습니다.
- 🔴 약간 난해한 문법
- 🔴 추적되는 쿼리 기능과 함께 사용하는 것은 권장하지 않습니다.

### 3. select 옵션 사용 (using the select option)

React Query v3는 내장 셀렉터 기능을 소개했습니다. 이를 통해서도 데이터를 변환할 수 있습니다.

```tsx
export const useTodosQuery = () =>
  useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    select: (data) => data.map((todo) => todo.name.toUpperCase()),
  });
```

셀렉터는 `data`가 존재할 때에만 호출되므로 `undefined`를 걱정할 필요가 없습니다. 위의 예시에서와 같은 셀렉터 또한 렌더링할 때마다 실행될 것입니다. 함수의 식별자가 변경되기 때문입니다. (인라인 함수이기 때문입니다.) 데이터 변환의 비용이 높다면 `useCallback`을 쓰거나 안정적인 함수 참조로 추출하는 식으로 최적화할 수 있습니다.

```tsx
const transformTodoNames = (data: Todos) =>
  data.map((todo) => todo.name.toUpperCase());

export const useTodosQuery = () =>
  useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    // ✅ 안정적인 함수 참조를 사용합니다
    select: transformTodoNames,
  });

export const useTodosQuery = () =>
  useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    // ✅ useCallback을 통해 메모이제이션합니다
    select: React.useCallback(
      (data: Todos) => data.map((todo) => todo.name.toUpperCase()),
      []
    ),
  });
```

더욱이, select 옵션은 데이터의 일부 항목만 구독하도록 사용할 수도 있습니다. 이는 이 방식을 더더욱 특별하도록 만들어줍니다. 다음의 예시를 고려해보세요.

```tsx
export const useTodosQuery = (select) =>
  useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    select,
  });

export const useTodosCount = () =>
  useTodosQuery((data) => data.length);

export const useTodo = (id) =>
  useTodosQuery((data) => data.find((todo) => todo.id === id));
```

예시에서는 커스텀 셀렉터를 `useTodosQuery`에 전달하면서 마치 [useSelector](https://react-redux.js.org/api/hooks#useselector)와 비슷한 API를 제작했습니다. 이 커스텀 훅은 이전과 동일하게 동작하지만 `select`를 따로 전달하지 않으면 `undefined`가 될 것이고 상태 전체가 반환될 것입니다.

반면 셀렉터를 전달하면 오직 셀렉터 함수의 반환값만을 구독합니다. 이는 꽤 강력합니다. 왜냐하면 할 일의 이름을 업데이트해도 `useTodosCount`를 통해 횟수를 구독하고 있는 컴포넌트는 리렌더링되지 않을 것이기 때문입니다. 횟수는 변하지 않았기 때문에 react-query는 이 옵저버에게 업데이트를 알리지 않아도 괜찮습니다. (여기서는 약간 간략하게 설명했습니다. 실제로 기술적으로는 완전히 맞는 설명은 아닙니다. Part 3에서 렌더링 최적화에 대해서 더 설명하겠습니다.)

- 🟢 최고의 최적화
- 🟢 부분적인 구독을 허용합니다.
- 🟡 옵저버마다 구조가 다를 수 있습니다.
- 🟡 데이터 구조의 공유가 2번 동작합니다. ([Part 3](https://tkdodo.eu/blog/react-query-render-optimizations)에서 더 깊게 다루겠습니다.)
