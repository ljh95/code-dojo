---
id: 20
title: "타입 안전한 React Query - 제네릭 꺾쇠괄호의 함정"
tags: ["react-query", "TypeScript", "타입안전", "zod"]
difficulty: "medium"
sourceDoc: [20]
---

## 질문

아래 두 가지 방식으로 `useQuery`에 타입을 지정하고 있다. **타입 안전성** 관점에서 어떤 차이가 있는지 파악하고 질문에 답해보자.

```typescript
// 방식 A: 꺾쇠괄호로 제네릭 직접 지정
const query = useQuery<Todo>({
  queryKey: ["todos", id],
  queryFn: () => fetchTodo(id),
});

// 방식 B: queryFn의 반환 타입으로 추론
const fetchTodo = async (id: number): Promise<Todo> => {
  const response = await axios.get(`/todos/${id}`);
  return response.data;
};

const query = useQuery({
  queryKey: ["todos", id],
  queryFn: () => fetchTodo(id),
});
```

1. 방식 A에서 `useQuery<Todo>`의 꺾쇠괄호가 "거짓된 안전성"을 줄 수 있는 이유는 무엇인가?
2. `axios.get<Todo>`도 마찬가지로 거짓된 제네릭이다. **제네릭의 황금률**로 그 이유를 설명해보자.
3. 런타임에서도 타입을 보장하려면 어떤 접근법을 사용할 수 있는가?

**힌트:** "반환 전용 제네릭은 위장한 타입 단언에 불과하다"는 원칙을 떠올려보자.

---answer---

## 정답: queryFn 타입 추론 + zod 런타임 검증

### 핵심 아이디어

`useQuery`에 꺾쇠괄호로 제네릭을 직접 넣는 것은 **컴파일러에게 "이 타입이야"라고 단언하는 것**에 불과하다. 실제 런타임 데이터가 해당 타입인지는 아무도 보장하지 않는다. **queryFn의 반환 타입으로 추론**하게 하고, 필요하면 **zod로 런타임 검증**하는 것이 진정한 타입 안전성이다.

### 단계별 해설

**1. 꺾쇠괄호의 문제**

`useQuery`에는 제네릭이 4개 있다. 1개만 직접 넣으면 나머지 3개는 기본값으로 대체된다. 그리고 핵심적으로, **서버가 실제로 `Todo` 타입을 반환하는지 검증하지 않는다.** 컴파일 타임에만 존재하는 거짓된 안전성이다.

**2. 제네릭의 황금률**

> "제네릭이 유용하려면, 최소 두 번은 나타나야 한다."

`axios.get<T>`의 타입 시그니처를 보면:

```typescript
function get<T = any>(url: string): Promise<{ data: T; status: number }>;
```

타입 `T`는 **반환 타입에서 한 번만** 나타난다. 입력값과 연결되지 않으므로, 사실상 아래와 동일하다:

```typescript
const response = await axios.get(`/todos/${id}`);
return response.data as Todo; // 타입 단언과 같다
```

**3. zod로 런타임 검증**

```typescript
import { z } from "zod";

const todoSchema = z.object({
  id: z.number(),
  name: z.string(),
  done: z.boolean(),
});

const fetchTodo = async (id: number) => {
  const response = await axios.get(`/todos/${id}`);
  return todoSchema.parse(response.data); // 런타임 검증 + 타입 추론
};

const query = useQuery({
  queryKey: ["todos", id],
  queryFn: () => fetchTodo(id),
});
// query.data의 타입이 스키마로부터 자동 추론됨
```

- 직접 정의한 `Todo` 타입 -> `todoSchema` 정의로 교환
- 타입 단언 -> 스키마 파싱으로 교환
- 파싱 실패 시 Error가 throw되어 React Query가 `error` 상태로 전환

### 깊은 이유 설명

네트워크를 통해 전달받는 데이터의 타입은 **신뢰 경계(trust boundary)** 밖에 있다. 백엔드가 API 스펙을 바꾸거나 잘못된 데이터를 보내면, 타입 단언만으로는 `"cannot read property name of undefined"` 같은 런타임 에러가 완전히 다른 곳에서 터진다. zod 파싱을 사용하면 **데이터가 들어오는 시점에서 바로 실패**하므로 디버깅이 훨씬 쉬워진다. 다만 파싱에는 런타임 오버헤드가 있으므로 모든 곳에 적용하기보다는 **신뢰 경계에서 선별적으로** 사용하는 것이 실용적이다.
