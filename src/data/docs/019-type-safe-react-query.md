---
id: 20
title: "(번역) #19: Type-safe React Query"
author: "TkDodo (번역: cnsrn1874)"
source: "https://velog.io/@cnsrn1874/%EB%B2%88%EC%97%AD-Type-safe-React-Query"
tags: [react-query, 번역, TypeScript, 타입안전]
date: ""
---

> **📌 핵심 요약**
> - useQuery에 꺾쇠괄호로 제네릭을 넣는 대신 queryFn 반환 타입을 정확히 정의하고, zod 같은 런타임 검증으로 네트워크 응답의 타입 신뢰를 확보하라
> - 키워드: 타입 추론, 반환 전용 제네릭, zod, 런타임 검증, 종단간 타입 안전성
> - 이런 상황에서 다시 읽으면 좋다: React Query + TypeScript에서 타입 단언 없이 안전한 데이터 fetching을 설계할 때

---

## 서문

TkDodo의 [Type-safe React Query](https://tkdodo.eu/blog/type-safe-react-query)을 번역한 글입니다.

**마지막 업데이트: 2023.10.21**

TypeScript를 사용하는 게 좋은 생각이라는 건 모두 동의할 수 있을 겁니다. 타입 안전성을 싫어하는 사람이 어딨을까요? 버그를 미리 발견할 수 있는 좋은 방법이자, 앱의 복잡성 일부를 타입 정의에게 떠넘김으로써 그걸 우리 머릿속에 영원히 넣어둘 필요없게 해줍니다.

타입 안전성의 정도는 프로젝트마다 크게 다를 수 있습니다. 결국, 모든 유효한 JavaScript 코드는 유효한 TypeScript 코드가 될 수 있습니다. TS 설정에 달려있죠. 그리고 "타입이 있는 것"과 "타입 안전한 것" 사이에는 큰 차이가 있습니다.

타입스크립트의 힘을 진정으로 활용하려면 무엇보다도 필요한 게 하나 있습니다.

## 신뢰

우리는 우리의 타입 정의를 **신뢰**할 수 있어야 합니다. 그렇지 않으면 우리의 타입은 한낱 제안이 되어버립니다. 제안이 정확할 거라는 기대는 할 수가 없죠. 그래서 우리는 타입을 신뢰할 수 있다는 걸 확실히 하기 위해 많은 노력을 합니다.

- TypeScript 설정 중 [strictest](https://www.typescriptlang.org/tsconfig#strict)를 활성화합니다.
- `ts-ignore`와 `any` 타입을 금지하기 위해 [typescript-eslint](https://typescript-eslint.io/)를 추가합니다.
- 코드 리뷰를 할 때 모든 타입 단언을 찾아냅니다.

그럼에도 여전히 우리는 거짓을 말하고 있을지도 모릅니다. 그것도 아주 많이요. 위의 모든 것들을 지키더라도 말이죠.

## 제네릭

TypeScript에서 제네릭은 필수적입니다. 약간 복잡한 것, 특히 재사용 가능한 라이브러리를 구현하려는 순간 제네릭을 찾게 될 겁니다.

하지만 라이브러리 사용자로서 라이브러리의 제네릭에 신경 쓸 필요가 없어야 하는 게 이상적입니다. 제네릭은 구현할 때나 필요한 디테일입니다. 따라서 꺾쇠괄호로 함수에 "직접" 제네릭을 넣을 때면 항상 두 가지 이유 중 하나로 나쁘다 할 수 있습니다.

> 불필요하거나, 아니면 스스로에게 거짓을 말하고 있거나.

## 꺾쇠괄호(<>)에 관해

꺾쇠괄호는 코드를 필요 이상으로 "복잡"해 보이게 합니다. 예를 들어, `useQuery`를 종종 어떻게 작성하는지 볼게요.

```typescript
// 꺾쇠괄호를 사용한 useQuery
type Todo = { id: number; name: string; done: boolean };

const fetchTodo = async (id: number) => {
  const response = await axios.get(`/todos/${id}`);
  return response.data;
};

const query = useQuery<Todo>({
  queryKey: ["todos", id],
  queryFn: () => fetchTodo(id),
});

query.data;
//    ^?(property) data: Todo | undefined
```

여기서 주된 문제는 `useQuery`에는 제네릭이 4개가 있다는 겁니다. 이 중 1개만 직접 넣으면 나머지 3개는 기본값으로 대체되죠. 이게 나쁜 이유는 [#6: 리액트 쿼리와 타입스크립트](https://tkdodo.eu/blog/react-query-and-type-script#the-four-generics)에서 읽을 수 있습니다.

이해를 돕기 위해 설명하자면, `axios.get`은 `any`를 반환합니다(`fetch`도 동일하지만, [ky](https://github.com/sindresorhus/ky)는 기본적으로 `unknown`을 반환해서 나음). `axios.get`은 `/todos/id`라는 엔드포인트가 무엇을 반환할지 모르죠. 그리고 우리는 `data`의 타입도 `any`가 되길 원치 않으므로 제네릭을 직접 넣어 추론된 제네릭을 "재정의(override)" 해야 합니다. 정말 그래야 할까요?

더 좋은 방법은 `fetchTodo` 함수 자체의 타입을 정의하는 겁니다.

```typescript
// 타입이 정의된 fetchTodo

type Todo = { id: number; name: string; done: boolean };

// ✅ fetchTodo의 반환값 타입을 정의합니다.
const fetchTodo = async (id: number): Promise<Todo> => {
  const response = await axios.get(`/todos/${id}`);
  return response.data;
};

// ✅ useQuery에 제네릭을 넣어주지 않습니다.
const query = useQuery({
  queryKey: ["todos", id],
  queryFn: () => fetchTodo(id),
});

// 🙌 타입이 여전히 잘 추론됩니다.
query.data;
//    ^?(property) data: Todo | undefined
```

이제 React Query는 `data`가 무엇일지 `queryFn`의 결과로부터 적절히 추론할 수 있습니다. 제네릭을 직접 넣어줄 필요가 없어졌죠. `useQuery`에 **입력되는 값**의 타입 정의만 충분하다면, `useQuery`에 꺾쇠괄호를 추가할 필요가 **없습니다**.

## 거짓된 꺾쇠괄호

꺾쇠괄호로 제네릭을 넣어줌으로써, 데이터를 fetch 하는 계층(이 경우 `axios`)에게 기대하는 타입이 무엇인지 알려줄 수도 있습니다.

```typescript
// 제네릭 넣어주기

const fetchTodo = async (id: number) => {
  const response = await axios.get<Todo>(`/todos/${id}`);
  return response.data;
};
```

이제는 원치 않으면 `fetchTodo` 함수의 타입을 정의할 필요조차 없어졌습니다. 여기서도 타입 추론이 동작하기 때문이죠. 저런 제네릭 자체가 불필요한 것은 아니지만, 제네릭의 황금률을 위반하므로 거짓된 제네릭입니다.

### 제네릭의 황금률

저는 이 황금률을 [@danvdk](https://twitter.com/danvdk)의 명저 [Effective TypeScript](https://effectivetypescript.com/2020/08/12/generics-golden-rule/)에서 배웠습니다. 이 책은 기본적으로 아래와 같이 말합니다.

> 제네릭이 유용하려면, 최소 두 번은 나타나야 한다.

소위 "반환 전용" 제네릭은 위장한 타입 단언에 불과합니다. `axios.get`의 (약간 간소화된) 타입 시그니처는 아래와 같습니다.

```typescript
// axios.get의 타입 시그니처

function get<T = any>(url: string): Promise<{ data: T; status: number }>;
```

타입 `T`는 반환 타입에서 한 번만 나타납니다. 그러니 거짓된 제네릭이죠! 단순히 아래와 같이 작성할 수도 있었습니다.

```typescript
// 명시적 타입 단언

const fetchTodo = async (id: number) => {
  const response = await axios.get(`/todos/${id}`);
  return response.data as Todo;
};
```

적어도 이 타입 단언(`as Todo`)은 명시적이며 숨겨져 있지 않습니다. 우리가 컴파일러를 우회하고 있고, 무언가 안전하지 않은 것을 받고 있으며, 그걸 신뢰할 수 있는 것으로 바꾸려 노력하고 있다는 것을 보여주죠.

## 다시 신뢰로

이제 다시 돌아와서 신뢰에 대해 얘기해봅시다. 우리가 랜선을 통해 전달받는 것이 실제로 특정 타입이라는 것을 어떻게 신뢰할 수 있을까요? 할 수 없습니다. 그래도 괜찮을 거예요.

저는 이 상황을 "신뢰 경계"라고 부르곤 했습니다. 우리는 백엔드가 반환하는 것은 우리가 합의한 것임을 신뢰**해야 하죠**. 만약 합의와 다른 걸 보낸다면, 이건 **우리** 잘못이 아니라 백엔드 팀 잘못입니다.

물론 고객은 누구 잘못인지 신경 쓰지 않습니다. 고객이 볼 수 있는 건 "cannot read property name of undefined"나 그 비슷한 것들뿐이죠. 고객 불만을 해결하기 위해 프런트엔드 개발자가 불려갈 테고, 올바른 형태의 데이터를 넘겨받지 못하고 있다는 걸 실제로 파악하는 데는 시간이 꽤 걸릴 겁니다. 왜냐하면 오류는 완전히 다른 곳에서 나타날 테니까요.

그럼 우리에게 신뢰를 주기 위해 스스로 할 수 있는 게 있을까요?

## zod

[zod](https://zod.dev)는 **런타임에** 검증할 수 있는 스키마를 정의하는 아름다운 유효성 검증 라이브러리입니다. 무엇보다 zod는 검증된 데이터의 타입을 해당 스키마로부터 직접 추론합니다.

어떤 타입을 정의해놓고 무언가의 타입이라고 단언하는 것이 아니라, 스키마를 작성한 뒤에 입력값이 해당 스키마를 준수하는지 검증한다는 뜻입니다.

저는 zod를 form 관련 작업을 하며 처음 알게 되었습니다. 사용자 입력을 검증하는 건 전적으로 타당하죠. 검증 후엔 입력값의 타입도 올바르게 정의된다는 좋은 부작용도 있습니다. 사용자 입력의 유효성 뿐만 아니라 URL 매개변수나 네트워크 응답 등 무엇이든 검증할 수 있습니다.

### queryFn 내부의 유효성 검증

```typescript
// zod로 파싱하기

import { z } from "zod";

// 👀 스키마 정의하기
const todoSchema = z.object({
  id: z.number(),
  name: z.string(),
  done: z.boolean(),
});

const fetchTodo = async (id: number) => {
  const response = await axios.get(`/todos/${id}`);
  // 🎉 스키마를 준수하는지 분석
  return todoSchema.parse(response.data);
};

const query = useQuery({
  queryKey: ["todos", id],
  queryFn: () => fetchTodo(id),
});
```

코드가 전보다 많은 것도 아니네요. 우리는 여기서 두 가지를 교환했습니다.

- 직접 정의한 `Todo` 타입을 `todoSchema` 정의로 교환
- 타입 단언을 스키마 파싱으로 교환

이건 React Query와 아주 잘 어울립니다. 왜냐면 `parse`는 무언가 잘못되면 이유를 설명하는 `Error`를 던지는데, 그게 마치 네트워크 호출 자체가 실패했을 때처럼 React Query를 `error` 상태로 만들기 때문입니다. 그리고 클라이언트가 보기엔 기대한 구조의 응답값을 반환하지 않았으니 실패한 게 맞죠. 이제 우리에겐 어떻게든 처리해야 하는 `error` 상태가 생겼으니 사용자를 놀라게 할 일은 없을 겁니다.

그리고 이건 저의 또 다른 가이드라인과도 잘 어울립니다.

> 타입스크립트 코드는 자바스크립트처럼 보일수록 좋다.

`id: number`를 제외하면, 위의 타입스크립트 코드는 자바스크립트와 똑같습니다. 타입스크립트의 복잡성은 더하지 않으면서 타입 안정성이라는 이점만 취했죠. 버터를 가르는 뜨거운 칼처럼 타입 추론이 우리의 코드를 타고 "흐릅니다".

### 트레이드 오프

스키마 파싱은 알아두면 좋은 개념이지만 공짜는 아닙니다. 우선 스키마는 여러분이 원하는 만큼의 회복 탄력성이 있어야 합니다. 스키마의 어떤 선택적 속성이 런타임에 `null`이든 `undefined`이든 문제삼지 않았는데, 이로 인해 쿼리가 실패한다면 끔찍한 사용자 경험을 만들 수도 있습니다. 그러니 스키마를 회복 탄력적으로 설계하세요.

또한 파싱에는 오버헤드가 수반되는데, 데이터가 요구된 구조와 일치하는지 확인하려면 런타임에 분석되어야 하기 때문입니다. 따라서 이 기법을 모든 곳에 적용하는 건 타당하지 않을 수 있죠.

## getQueryData는요?

`queryClient.getQueryData`도 같은 문제가 있음을 알아차리셨을 겁니다. 반환 전용 제네릭이 있고, 직접 넣어주지 않으면 `unknown`이 기본값이죠.

```typescript
// getQueryData-generic

const todo = queryClient.getQueryData(["todos", 1]);
//    ^? const todo: unknown

const todo = queryClient.getQueryData<Todo>(["todos", 1]);
//    ^? const todo: Todo | undefined
```

여러분이 `QueryCache`에 무엇을 넣었는지 React Query는 (사전 정의된 전체 스키마가 없어서) 알 수 없으므로 이게 최선입니다. 물론 스키마를 사용해 `getQueryData`의 결과를 파싱할 수도 있지만, 캐시된 데이터의 유효성을 전에 검증한 적이 있다면 꼭 필요한 건 아닙니다. 게다가 `QueryCache`와의 직접적인 상호 작용은 적게 해야 합니다.

[react-query-kit](https://tanstack.com/query/v4/docs/react/community/liaoliao666-react-query-kit) 같은 React Query 기반의 도구는 이 고통을 완화하는 데 탁월하지만 그 뿐이며, 결국 약간의 거짓을 더 숨겨줄 뿐입니다.

> **업데이트**
> v5는 쿼리 옵션을 정의하는 새로운 방법을 제공하여 `getQueryData`도 type-safe하게 만들 수 있습니다. 자세한 내용은 [문서](https://tanstack.com/query/v5/docs/react/typescript#typing-query-options)를 참조하세요.

## 종단간 타입 안전성

이와 관련해 React Query는 해줄 수 있는 게 적지만, 많은 걸 해주는 다른 도구들이 있습니다. 여러분이 프런트엔드와 백엔드를 모두 제어하고, 심지어 그 둘이 모노레포에 함께 있다면 [tRPC](https://trpc.io)나 [zodios](https://www.zodios.org) 같은 도구를 고려해 보세요. 둘 다 클라이언트 사이드 데이터 fetching 솔루션인 React Query를 기반으로 만들어졌지만, 진정한 타입 안전성에 필요한 기능인 API/라우터의 사전 정의를 갖추었습니다.

이를 통해 프런트엔드의 타입은 백엔드가 생성하는 모든 것으로부터 틀릴 여지 없이 추론될 수 있습니다. 그리고 둘 다 `zod`로 스키마를 정의합니다(tRPC는 유효성 검증 라이브러리에 구애받지 않지만, `zod`가 가장 유명함). 그러니 `zod` 사용법은 분명 여러분의 학습 예정 목록에 올라갈 수 있을 거예요.
