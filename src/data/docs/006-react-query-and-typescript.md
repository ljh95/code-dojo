---
id: 6
title: "(번역) #6: React Query and TypeScript"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/6-react-query-and-typescript"
tags: [react-query, 번역, TypeScript]
date: ""
---

> **📌 핵심 요약**
> - React Query에서 제네릭을 수동 지정하지 말고, queryFn의 반환 타입을 명시하여 타입스크립트가 추론하게 하라
> - 키워드: 제네릭, 타입 추론, 타입 좁히기, select, queryFn 반환 타입
> - 이런 상황에서 다시 읽으면 좋다: useQuery에 제네릭을 어떻게 넘길지 고민될 때

---

타입스크립트는 🔥입니다. 이제는 프론트엔드 커뮤니티에서 흔한 이해관계처럼 보입니다. 많은 개발자들이 라이브러리가 타입스크립트로 작성되거나, 아니면 최소한 좋은 타입 정의를 제공하기를 원합니다. 저는 만약 라이브러리가 타입스크립트로 작성되었다면, 타입 정의는 최고의 문서라고 생각합니다. 타입 정의는 구현을 정확하게 반영하기 때문에 이는 절대로 틀린 말이 아닙니다. 저는 보통 API 문서를 읽기 전에 타입 정의를 먼저 살펴봅니다.

React Query는 처음에 v1에서는 자바스크립트로 작성되었고, v2에서 타입스크립트로 재작성 되었습니다. 이는 React Query가 이제 타입스크립트 사용자들을 아주 잘 지원한다는 점을 의미합니다.

그러나 타입스크립트로 작업할 때는 React Query가 동적이고 의견이 없는 방식으로 동작하기 때문에 몇 가지 "갓챠"가 있습니다. 여러분의 경험을 향상시키기 위해 하나씩 살펴보시죠.

## 제네릭 (Generics)

React Query는 제네릭을 많이 사용합니다. React Query 자체가 데이터를 불러오는 것이 아니고, 전달받은 api가 반환하는 데이터의 *타입*을 알지 못하기 때문에 제네릭은 매우 중요합니다.

[공식 문서](https://react-query.tanstack.com/typescript)의 타입스크립트 섹션은 매우 광범위하지 않으며, `useQuery`를 호출할 때 제네릭을 통해 기대값을 명시적으로 지정하라고 적혀있습니다.

```tsx
function useGroups() {
  return useQuery<Group[], Error>({
    queryKey: ['groups'],
    queryFn: fetchGroups,
  });
}
```

> 💡 **Update**: 문서가 업데이트 되었으며 이러한 패턴을 더이상 우선적으로 장려하지 않습니다.

시간이 지나면서 React Query는 `useQuery` 훅에 더 많은 제네릭을 추가해왔습니다. (이제는 총 4개가 있습니다.) 왜냐하면 더 많은 기능이 추가되었기 때문입니다. 위의 코드는 작동하며 커스텀 훅의 `data` 속성이 `Group[]|undefined`로 올바르게 유형화되고 `error`가 `Error|undefined`로 유형화 되는 것을 보장합니다. 그러나 더 고급 사용 사례에서, 특히 다른 2개의 제네릭이 필요한 경우에는 이렇게 작동하지 않습니다.

### 4개의 제네릭 (The four Generics)

`useQuery` 훅은 현재 다음과 같이 정의되어있습니다.

```tsx
export function useQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>
```

여기에는 많은 일이 일어나고 있습니다. 하나씩 살펴보시죠.

- **`TQueryFnData`**: `queryFn`에서 반환되는 타입입니다. 위의 예시에서는 `Group[]` 입니다.
- **`TError`**: `queryFn`에서 반환될 수 있는 에러의 타입입니다. 예시의 `Error` 입니다.
- **`TData`**: `data` 속성이 결과적으로 갖게 될 타입입니다. `select` 옵션을 사용할 경우에만 중요합니다. 왜냐하면 `data` 속성은 `queryFn`에서 반환하는 것과는 다르기 때문입니다. 그게 아니라면 `queryFn`에서 반환하는 것을 기본값으로 갖습니다.
- **`TQueryKey`**: `queryKey`의 타입입니다. `queryFn`에 `queryKey`를 전달하는 경우에만 중요합니다.

또한 보시는바와 같이 이 제네릭은 모두 기본값을 갖습니다. 따라서 아무런 값도 제공하지 않는다면 타입스크립트는 기본값을 대신 사용할 것입니다. 이는 자바스크립트의 기본 파라미터 기능과 꽤 동일하게 작동합니다.

```tsx
function multiply(a, b = 2) {
  return a * b;
}

multiply(10); // ✅ 20
multiply(10, 3); // ✅ 30
```

### 타입 추론 (Type Inference)

타입스크립트는 어떤 유형이어야 하는지를 자체적으로 추론하게 (또는 결정하게) 둘 때 가장 잘 작동합니다. 코드의 작성을 쉽게 해줄 뿐만 아니라 (왜냐하면 모든 타입을 작성할 필요가 없기 때문이죠 😅) 가독성도 높혀줍니다. 많은 상황에서 타입 추론은 코드를 자바스크립트와 같이 작성할 수 있도록 해줍니다. 타입 추론의 간단한 예시는 다음과 같습니다.

```tsx
const num = Math.random() + 5; // ✅ `number`

// 🚀 greeting과 greet의 결과물은 string이 될 것입니다.
function greet(greeting = 'ciao') {
  return `${greeting}, ${getName()}`;
}
```

일반적으로 제네릭도 사용처에서 타입 추론이 될 수 있습니다. 아주 멋지죠. 물론 수동으로 타입을 전달할 수도 있지만, 많은 경우에서, 그럴 필요는 없습니다.

```tsx
function identity<T>(value: T): T {
  return value;
}

// 🚨 제네릭을 제공할 필요가 없습니다.
let result = identity<number>(23);

// ⚠️ 아니면 결과를 명시할 수 있습니다.
let result: number = identity(23);

// 😎 `string` 으로 타입이 정확히 추론됩니다.
let result = identity('react-query');
```

### Partial 타입 Argument 추론 (Partial Type Argument Inference)

타입스크립트는 아직 지원하지 않습니다. (이에 관한 [오픈 이슈](https://github.com/microsoft/TypeScript/issues/26242)를 참고하세요) 이는 기본적으로 하나의 제네릭을 제공하면 모든 제네릭을 제공해야 한다는 것을 의미합니다. 그러나 React Query는 제네릭에 대한 기본값을 갖고 있기 때문에, 이 기본값이 사용된다는 사실을 즉시 인지하지 못할 수 있습니다. 이로 인한 에러 메시지는 상당히 난해할 수 있습니다. 실제로 이로 인한 문제가 발생하는 예제를 살펴봅시다.

```tsx
function useGroupCount() {
  return useQuery<Group[], Error>({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    select: (groups) => groups.length,
    // 🚨 Type '(groups: Group[]) => number' is not assignable to type '(data: Group[]) => Group[]'.
    // Type 'number' is not assignable to type 'Group[]'.ts(2322)
  });
}
```

3번째 제네릭을 전달하지 않았기 때문에, 기본값인 `Group[]`가 사용되었는데, `select` 함수에서 `number`를 반환했습니다. 3번째 제네릭을 전달하여 간단히 해결할 수 있습니다.

```tsx
function useGroupCount() {
  // ✅ 고쳐졌습니다.
  return useQuery<Group[], Error, number>({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    select: (groups) => groups.length,
  });
}
```

Partial 타입 Argument 추론이 없는 한, 현재 가능한 것들을 사용해야 합니다.

그렇다면 어떤 대안이 있을까요?

### 모든 것을 추론 (Infer all the things)

우선 제네릭을 아예 전달하지 않고 타입스크립트가 무엇을 해야할지 판단하도록 냅둬봅시다. 이를 작동하도록 하기 위해서, `queryFn`가 좋은 반환 타입을 갖도록 해야합니다. 물론, 명시적인 리턴 타입이 없이 해당 함수를 인라인으로 사용하면 `any`를 갖게 될 것입니다. 왜냐하면 `axios`나 `fetch`가 반환하는 타입이기 때문입니다.

```tsx
function useGroups() {
  // 🚨 데이터는 `any`가 될 것입니다.
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => axios.get('groups').then((response) => response.data),
  });
}
```

만약 (저처럼) api 레이어를 쿼리로부터 분리한 채로 유지하고 싶다면, 암시적인 any를 피하기 위해 어쨌든 타입 정의를 추가해야 합니다. 그래야 React Query가 나머지를 추론할 수 있습니다.

```tsx
function fetchGroups(): Promise<Group[]> {
  return axios.get('groups').then((response) => response.data);
}

// ✅ 데이터는 `Group[] | undefined` 가 될 것입니다.
function useGroups() {
  return useQuery({ queryKey: ['groups'], queryFn: fetchGroups });
}

// ✅ 데이터는 `number | undefined` 가 될 것입니다.
function useGroupCount() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    select: (groups) => groups.length,
  });
}
```

이 접근 방식의 장점은 다음과 같습니다.

- 수동으로 제네릭을 지정하지 않아도 됩니다.
- 3번째 제네릭 (select)와 4번째 제네릭 (QueryKey)가 필요한 경우에 적합합니다.
- 더 많은 제네릭이 추가되어도 계속 작동할 것입니다.
- 코드는 덜 혼란스러울 것이며 자바스크립트 코드인 것 처럼 보일 것입니다.

### 에러는 어떤가요? (What about error?)

아마도 에러는 어떤가요? 라고 물어볼 수도 있을 것 같아요. 기본적으로, 제네릭이 없다면, 에러는 `unknown`으로 추론될 것입니다. 버그처럼 들릴 수도 있을 것 같아요. 왜 `Error`가 아닐까요? 이는 의도된 처리입니다. 왜냐하면 자바스크립트에서는 에러로 아무것이나 던질 수 있거든요. 에러의 타입이 꼭 `Error`여야만 하지는 않습니다.

```tsx
throw 5;
throw undefined;
throw Symbol('foo');
```

React Query는 Promise를 반환하는 함수에 대해 아무런 책임을 갖고 있지 않기 때문에, 그 함수가 반환할 에러의 타입도 알지 못합니다. 따라서 `unknown`을 갖는게 맞습니다. 타입스크립트가 여러 개의 제네릭을 갖는 함수를 호출할 때 일부 제네릭을 건너뛸 수 있도록 허용한다면, ([더 많은 정보는 이 이슈](https://github.com/microsoft/TypeScript/issues/10571)를 참고하세요) 더 나은 처리 방법을 구현할 수 있을 것입니다. 그러나 지금으로서는, 제네릭을 전달하지 않고 에러 작업을 해야할 경우, instanceof 검사를 통해 타입을 좁힐 수 있습니다.

## 타입 좁히기 (Type Narrowing)

제네릭을 전달하지 않을 때 `error`가 `unknown`이 된다는 것을 배웠습니다. 그래서 어떻게 해야 할까요? 글쎄요, 타입스크립트는 이를 위해 타입 가드(type guard)라는 개념을 제공합니다.

```tsx
function useGroups() {
  const { error } = useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
  });

  if (error instanceof Error) {
    return error.message;
  }

  return null;
}
```

`instanceof` 검사를 사용하여 에러가 `Error` 객체인지 확인할 수 있습니다. 이 검사 이후로는 타입스크립트가 이 블록 내에서 `error`가 `Error` 타입이라는 것을 알게 됩니다.

더 복잡한 타입 좁히기가 필요한 경우, 타입 가드 함수를 작성할 수 있습니다.

```tsx
interface CustomError {
  code: number;
  message: string;
}

function isCustomError(error: unknown): error is CustomError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

function useGroups() {
  const { error } = useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
  });

  if (isCustomError(error)) {
    return `Error ${error.code}: ${error.message}`;
  }

  return null;
}
```

이런 식으로 타입을 안전하게 좁힐 수 있습니다.

## enabled 옵션을 통한 타입 안정성 (Type safety with the enabled option)

`enabled` 옵션은 쿼리를 조건부로 실행할 수 있게 해줍니다. 그러나 이것은 타입 안정성 측면에서 흥미로운 문제를 야기합니다.

```tsx
function useGroupsIfAdmin(isAdmin: boolean) {
  return useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    enabled: isAdmin,
  });
}
```

이 경우, `enabled`가 `false`일 때는 쿼리가 실행되지 않으므로 `data`는 `undefined`가 됩니다. 하지만 타입스크립트는 이 사실을 자동으로 이해하지 못합니다.

더 나은 접근 방식은 타입스크립트의 타입 시스템을 활용하는 것입니다.

```tsx
function useGroupsIfAdmin(isAdmin: boolean) {
  const query = useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    enabled: isAdmin,
  });

  // isAdmin이 false이면 data는 undefined
  if (!isAdmin) {
    return { ...query, data: undefined };
  }

  // isAdmin이 true이면 data는 Group[] | undefined
  return query;
}
```

또 다른 방법은 조건부 타입을 사용하는 것입니다.

```tsx
type EnabledQuery<T, Enabled extends boolean> = Enabled extends true
  ? T
  : T | undefined;

function useGroupsIfAdmin<IsAdmin extends boolean>(isAdmin: IsAdmin) {
  const query = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    enabled: isAdmin,
  });

  // data의 타입은 IsAdmin에 따라 결정됨
  return query as {
    ...typeof query,
    data: EnabledQuery<Group[], IsAdmin>;
  };
}
```

이런 식으로 `enabled` 옵션의 값에 따라 더 정확한 타입을 얻을 수 있습니다.

## 낙관적인 업데이트 (Optimistic Updates)

낙관적인 업데이트는 사용자 경험을 향상시키는 강력한 패턴입니다. 서버 응답을 기다리지 않고 UI를 즉시 업데이트합니다.

```tsx
function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newName: string) =>
      axios.patch(`/groups/${groupId}`, { name: newName }),
    onMutate: async (newName) => {
      // 이전 데이터를 백업
      const previousGroups = queryClient.getQueryData<Group[]>(['groups']);

      // 낙관적 업데이트
      queryClient.setQueryData<Group[]>(['groups'], (old) =>
        old?.map((group) =>
          group.id === groupId ? { ...group, name: newName } : group
        )
      );

      // 롤백을 위해 이전 데이터 반환
      return { previousGroups };
    },
    onError: (err, newName, context) => {
      // 에러 발생 시 이전 데이터로 롤백
      if (context?.previousGroups) {
        queryClient.setQueryData(['groups'], context.previousGroups);
      }
    },
    onSuccess: () => {
      // 성공 후 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
```

이 패턴에서 중요한 점은 `onMutate`에서 롤백을 위한 컨텍스트를 반환하고, `onError`에서 그 컨텍스트를 사용하여 이전 상태로 복원하는 것입니다.

더 타입 안전한 방식으로 구현할 수도 있습니다.

```tsx
interface UpdateGroupContext {
  previousGroups?: Group[];
}

function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, UpdateGroupContext>({
    mutationFn: (newName: string) =>
      axios.patch(`/groups/${groupId}`, { name: newName }),
    onMutate: async (newName): Promise<UpdateGroupContext> => {
      const previousGroups = queryClient.getQueryData<Group[]>(['groups']);

      queryClient.setQueryData<Group[]>(['groups'], (old) =>
        old?.map((group) =>
          group.id === groupId ? { ...group, name: newName } : group
        )
      );

      return { previousGroups };
    },
    onError: (err, newName, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(['groups'], context.previousGroups);
      }
    },
  });
}
```

## useInfiniteQuery

`useInfiniteQuery`는 무한 스크롤이나 페이지네이션을 구현할 때 매우 유용합니다.

```tsx
interface GroupPage {
  groups: Group[];
  nextCursor: string | null;
}

function useGroupsInfinite() {
  return useInfiniteQuery<GroupPage, Error>({
    queryKey: ['groups'],
    queryFn: ({ pageParam = null }) =>
      axios
        .get('/groups', { params: { cursor: pageParam } })
        .then((res) => res.data),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
```

`useInfiniteQuery`의 제네릭은 다음을 의미합니다.

- 첫 번째 제네릭: 각 페이지의 데이터 타입 (`GroupPage`)
- 두 번째 제네릭: 에러 타입 (`Error`)

`getNextPageParam` 함수는 다음 페이지를 불러오기 위한 파라미터를 결정합니다. `null`을 반환하면 더 이상 불러올 페이지가 없다는 뜻입니다.

사용할 때는 이렇게 합니다.

```tsx
function GroupList() {
  const { data, fetchNextPage, hasNextPage, isFetching } =
    useGroupsInfinite();

  return (
    <>
      {data?.pages.map((page) =>
        page.groups.map((group) => <div key={group.id}>{group.name}</div>)
      )}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetching}
      >
        더 불러오기
      </button>
    </>
  );
}
```

`data.pages` 배열에는 각 페이지의 데이터가 포함됩니다.

## 기본 쿼리 함수에 대한 타이핑 (Typing the default query function)

React Query는 기본 쿼리 함수 기능을 제공합니다. 이를 사용하면 매 번 `queryFn`을 지정하지 않아도 됩니다.

```tsx
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey: [url] }) => {
        const res = await fetch(`https://api.example.com${url}`);
        if (!res.ok) throw new Error('API error');
        return res.json();
      },
    },
  },
});
```

그러나 이 경우 타입 안정성이 떨어질 수 있습니다. 더 나은 방식은 타입 안전한 기본 쿼리 함수를 만드는 것입니다.

```tsx
interface DefaultQueryFnContext {
  queryKey: string[];
  pageParam?: unknown;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async (context: DefaultQueryFnContext) => {
        const [url, ...params] = context.queryKey;
        const queryString = new URLSearchParams(
          Object.fromEntries(params.map((p) => [p, '']))
        ).toString();

        const res = await fetch(
          `https://api.example.com${url}${queryString ? '?' + queryString : ''}`
        );

        if (!res.ok) throw new Error('API error');
        return res.json();
      },
    },
  },
});
```

또는 더 간단한 래퍼를 만들 수 있습니다.

```tsx
function createQuery<T>(
  url: string,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T>({
    queryKey: [url],
    queryFn: () =>
      fetch(`https://api.example.com${url}`).then((res) => res.json()),
    ...options,
  });
}

// 사용법
function useGroups() {
  return createQuery<Group[]>('/groups');
}
```

이런 식으로 하면 반복적인 코드를 줄이면서도 타입 안정성을 유지할 수 있습니다.

**마지막으로**, React Query와 TypeScript를 함께 사용할 때 핵심은 좋은 `queryFn` 타입 정의를 갖추는 것입니다. 그렇게 되면 타입스크립트가 나머지를 추론하고, 더 안전하고 유지보수하기 좋은 코드를 작성할 수 있습니다.
