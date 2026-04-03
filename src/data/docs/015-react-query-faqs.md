---
id: 16
title: "(번역) React Query FAQs"
author: "TkDodo (번역: cnsrn1874)"
source: "https://velog.io/@cnsrn1874/%EB%B2%88%EC%97%AD-React-Query-FAQs"
tags: [react-query, 번역, FAQ]
date: ""
---

## 어떻게 하면 refetch에 매개변수를 넘길 수 있나요?

**짧은 답:** 불가능합니다.

### 문제점

refetch에 매개변수를 전달하려는 코드:

```jsx
const { data, refetch } = useQuery({
  queryKey: ['item'],
  queryFn: () => fetchItem({ id: 1 }),
})

<button onClick={() => {
  // 🚨 이렇게 하는 게 아니에요
  refetch({ id: 2 })
}}>Show Item 2</button>
```

queryKey가 같으면 캐시에서 같은 위치에 저장되므로, id 2의 데이터가 id 1의 데이터를 덮어씁니다.

### 해결책: 선언적 접근법

```jsx
const [id, setId] = useState(1)

const { data } = useQuery({
  queryKey: ['item', id],
  queryFn: () => fetchItem({ id }),
})

<button onClick={() => {
  // ✅ id만 설정합니다
  setId(2)
}}>Show Item 2</button>
```

또는 URL을 사용:

```jsx
const { id } = useParams()

const { data } = useQuery({
  queryKey: ['item', id],
  queryFn: () => fetchItem({ id }),
})

<Link to="/2">Show Item 2</Link>
```

### 로딩 상태 개선

급격한 전환을 완화하려면 `keepPreviousData` 사용:

```js
import { keepPreviousData } from '@tanstack/react-query'

const { data, isPlaceholderData } = useQuery({
  queryKey: ['item', id],
  queryFn: () => fetchItem({ id }),
  placeholderData: keepPreviousData,
})
```

이전 데이터를 유지하면서 새 데이터를 가져올 수 있습니다.

---

## 왜 업데이트 결과가 안 보이죠?

### 1. 쿼리 키가 일치하지 않음

```json
['item', '1']  // string
['item', 1]    // number
```

이 두 키는 다릅니다. `useParams`로 URL을 읽으면 string이 되므로 주의하세요.

**해결책:** TypeScript와 Query Key Factories 사용

### 2. QueryClient가 안정적이지 않음

❌ 잘못된 방법:

```jsx
export default function App() {
  const queryClient = new QueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  )
}
```

✅ 올바른 방법:

```jsx
const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  )
}
```

또는 App 내부에서 생성하는 경우:

```jsx
export default function App() {
  const [queryClient] = React.useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  )
}
```

---

## 왜 useQueryClient()를 사용해야 하나요?

### useQueryClient 사용 이유

**1. useQuery도 내부적으로 사용함**
- import한 client와 context의 client가 다를 수 있음

**2. 앱과 client 분리**
- 테스트 시 다른 설정값 사용 가능
- 재시도 옵션 비활성화 등

**3. export 불가능한 경우**
- SSR 사용 시 여러 사용자가 같은 client 공유 방지
- 마이크로 프런트엔드 격리
- `queryClient` 생성 시 다른 훅 사용 필요

### 렌더 프롭 패턴 (클래스 컴포넌트용)

```jsx
const UseQueryClient = ({ children }) => children(useQueryClient())

<UseQueryClient>
  {(queryClient) => (
    <button
      onClick={() => queryClient.invalidateQueries({
        queryKey: ['items']
      })}
    >
      invalidate items
    </button>
  )}
</UseQueryClient>
```

---

## 왜 에러를 받을 수 없죠?

### Fetch API 문제

내장 fetch API는 4XX, 5XX 상태 코드를 에러로 처리하지 않습니다.

❌ 잘못된 방법:

```js
useQuery({
  queryKey: ['todos', todoId],
  queryFn: async () => {
    const response = await fetch('/todos/' + todoId)
    return response.json()  // 🚨 에러 처리 안 됨
  },
})
```

✅ 올바른 방법:

```js
useQuery({
  queryKey: ['todos', todoId],
  queryFn: async () => {
    const response = await fetch('/todos/' + todoId)
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    return response.json()
  },
})
```

### 로깅 시 에러 다시 throw

❌ 잘못된 방법:

```ts
useQuery({
  queryKey: ['todos', todoId],
  queryFn: async () => {
    try {
      const { data } = await axios.get('/todos/' + todoId)
      return data
    } catch (error) {
      console.error(error)
      // 🚨 에러를 throw하지 않음
    }
  },
})
```

✅ 올바른 방법:

```ts
useQuery({
  queryKey: ['todos', todoId],
  queryFn: async () => {
    try {
      const { data } = await axios.get('/todos/' + todoId)
      return data
    } catch (error) {
      console.error(error)
      throw error  // ✅ 에러 재전파
    }
  },
})
```

---

## 왜 queryFn이 호출되지 않는 거죠?

### initialData와 staleTime의 조합

❌ 문제 코드:

```js
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  initialData: [],
  staleTime: 5 * 1000,
})
```

`initialData`가 캐시되고 5초간 fresh 상태이므로 refetch가 실행되지 않습니다.

### 해결책 1: placeholderData 사용

```js
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  placeholderData: [],  // 캐시되지 않음
  staleTime: 5 * 1000,
})
```

### 해결책 2: initialDataUpdatedAt 설정

```js
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  initialData: [],
  initialDataUpdatedAt: 0,  // 처음부터 stale 상태
  staleTime: 5 * 1000,
})
```

### 페이지네이션 쿼리

❌ 잘못된 방법:

```js
const [page, setPage] = React.useState(0)

const { data } = useQuery({
  queryKey: ['todos', page],
  queryFn: () => fetchTodos(page),
  initialData: initialDataForPageZero,  // 모든 page에 적용됨
  staleTime: 5 * 1000,
})
```

✅ 올바른 방법:

```js
const [page, setPage] = React.useState(0)

const { data } = useQuery({
  queryKey: ['todos', page],
  queryFn: () => fetchTodos(page),
  initialData: page === 0 ? initialDataForPageZero : undefined,
  staleTime: 5 * 1000,
})
```
