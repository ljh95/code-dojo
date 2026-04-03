---
id: 23
title: "(번역) #22: React Query and React Context"
author: "TkDodo (번역: cnsrn1874)"
source: "https://velog.io/@cnsrn1874/react-query-and-react-context"
tags: [react-query, 번역, React Context]
date: ""
---

> **📌 핵심 요약**
> - React Context를 의존성 주입 도구로 활용하면, useQuery 데이터의 암시적 의존성을 명시적으로 만들어 타입 안전하고 리팩터링에 강한 코드를 작성할 수 있다
> - 키워드: React Context, 의존성 주입, 암시적 의존성, useSuspenseQuery, 타입 안전성
> - 이런 상황에서 다시 읽으면 좋다: 트리 상위에서 fetch한 데이터를 하위 컴포넌트에서 안전하게 사용하는 패턴이 필요할 때

---

> [TkDodo](https://twitter.com/TkDodo)의 [React Query and React Context](https://tkdodo.eu/blog/react-query-and-react-context)를 번역한 글입니다.

## 개요

React Query의 좋은 특징 중 하나는, 쿼리를 컴포넌트 트리 내에서 원하는 곳 어디든 사용할 수 있다는 것입니다. 아래의 `<ProductTable>` 컴포넌트는 필요한 곳에 병치(co-location)된 자신의 데이터를 fetch 할 수 있습니다.

```tsx
function ProductTable() {
  const productQuery = useProductQuery();

  if (productQuery.data) {
    return <table>...</table>;
  }

  if (productQuery.isError) {
    return <ErrorMessage error={productQuery.error} />;
  }

  return <SkeletonLoader />;
}
```

이 방식은 `ProductTable`을 분리해 독립적으로 만들 수 있어 훌륭합니다. React Server Component에서도 비슷한 패턴이 등장하며, 컴포넌트 내부에서 직접 데이터를 fetch할 수 있습니다.

컴포넌트에게 필요한 데이터를 해당 컴포넌트의 내부에서 fetch 할 수 있다는 것은 매우 유용합니다. `ProductTable` 컴포넌트를 App의 어디로든 옮길 수 있고, 바로 작동합니다.

다만 이 방법이 만병통치약(silver bullet)은 아니고 트레이드-오프가 있습니다.

## 자급자족한다는 것

어떤 컴포넌트가 자율적이라는 것은 로딩과 에러 상태를 처리해야 한다는 뜻입니다. `<ProductTable>` 컴포넌트는 첫 로딩 시 `<SkeletonLoader />`를 표시하기 때문에 큰 문제가 되지 않습니다.

하지만 쿼리가 트리 위쪽에서 이미 사용된 것을 우리가 아는 상황에서, 해당 쿼리의 일부분으로부터 몇가지 정보를 읽어오고 싶은 경우도 많습니다. 예를 들어, 로그인한 사용자의 정보를 담고 있는 `useUserQuery`가 있습니다.

```ts
export const useUserQuery = (id: number) => {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUserById(id),
  });
};

export const useCurrentUserQuery = () => {
  const id = useCurrentUserId();

  return useUserQuery(id);
};
```

이 쿼리는 로그인한 사용자가 어떤 사용자 권한을 가졌는지 검사하고, 페이지를 실제로 볼 수 있는지 결정하기 위해 컴포넌트 트리의 꽤 위쪽에서 사용되었을 것입니다.

트리의 더 아래쪽에는 `userName`을 표시하는 컴포넌트가 있습니다:

```tsx
function UserNameDisplay() {
  const { data } = useCurrentUserQuery();
  return <div>User: {data.userName}</div>;
}
```

물론 타입스크립트는 `data`가 undefined일 수 있다며 허용하지 않습니다. 하지만 우리는 `data`가 undefined일 수 없다는 걸 타입스크립트보다 더 잘 압니다. 쿼리가 더 위쪽 트리에서 이미 초기화되지 않았다면 `UserNameDisplay`가 렌더링될 일이 없을테니까요.

이것은 딜레마입니다. 여러 해결책이 있지만 모두 차선책입니다:

- `data!.userName`으로 TypeScript 무시하기
- `data?.userName`으로 안전하게 처리하기
- `if (!data) return null` 타입 가드 추가하기
- 25곳 전부에 로딩과 오류 처리 추가하기

### 암시적 의존성

문제는 **암시적 의존성**이 있다는 사실에서 비롯됩니다. 이는 우리의 머릿속에만 존재하고 코드 자체에서는 보이지 않는 의존성입니다.

데이터가 정의되었는지 확인할 필요없이 `useCurrentUserQuery`를 안전하게 호출할 수 있다는 것을 우리는 알지만, 이걸 검증할 수 있는 정적 분석은 없습니다.

가장 위험한 건 지금은 맞을지 몰라도 미래에는 아닐 수 있다는 것입니다. 앱의 어딘가에 UserNameDisplay의 다른 인스턴스를 렌더링했는데, 그곳에 사용자 데이터가 캐시에 없거나 조건부로 있을 수도 있습니다.

`UserNameDisplay` 컴포넌트는 변화에 탄력적이지 않으며 리팩터링으로 인해 오류가 발생하기 쉽습니다.

### 명시적으로 만들기

해결책은 의존성을 **명시적으로** 만드는 것입니다. 그리고 여기에 **React Context**보다 좋은 방법은 없습니다.

## React Context

### Context는 상태 관리자가 아님

React Context에 대한 오해가 많습니다. React Context는 상태 관리자가 **아닙니다**. `useState`나 `useReducer`와 함께 사용하면 상태 관리의 좋은 해결책으로 보일 수 있지만, 많은 실무에서 성능 문제를 야기합니다.

> "context로 상태를 관리하지 마시고 의존성 주입에만 사용하세요. 여기에 적합한 도구입니다!"

Redux의 메인테이너인 마크 에릭슨이 작성한 글: [Blogged Answers: Why React Context is Not a "State Management" Tool (and Why It Doesn't Replace Redux)](https://blog.isquaredsoftware.com/2021/01/context-redux-differences/)

### 의존성 주입 도구로서의 Context

React Context는 **의존성 주입** 도구입니다. 컴포넌트가 동작하는 데 필요한 "것"을 정의할 수 있으며, 모든 부모는 해당 정보를 제공할 책임이 있습니다.

이는 prop-drilling과 개념적으로 같습니다. context도 어떤 값을 자식에게 전달할 수 있지만, 중간 계층을 생략할 수 있다는 점에서 다릅니다.

### 구현 예시

`useCurrentUserQuery`를 사용한 예시에서 의존성을 명시적으로 만들 수 있습니다. 데이터 가용성 검사를 생략하고 싶은 모든 컴포넌트에서 직접 쿼리를 읽는 게 아니라, React Context에서 읽어옵니다.

```tsx
const CurrentUserContext = React.createContext<User | null>(null);

export const useCurrentUserContext = () => {
  return React.useContext(CurrentUserContext);
};

export const CurrentUserContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const currentUserQuery = useCurrentUserQuery();

  if (currentUserQuery.isLoading) {
    return <SkeletonLoader />;
  }

  if (currentUserQuery.isError) {
    return <ErrorMessage error={currentUserQuery.error} />;
  }

  return (
    <CurrentUserContext.Provider value={currentUserQuery.data}>
      {children}
    </CurrentUserContext.Provider>
  );
};
```

이제 자식 컴포넌트에서 context를 안전하게 읽을 수 있습니다:

```tsx
function UserNameDisplay() {
  const data = useCurrentUserContext();
  return <div>User: {data.username}</div>;
}
```

### 의존성의 명시화

이를 통해 암시적 의존성을 명시적으로 만들었습니다. 누군가 `UserNameDisplay`를 볼 때마다, `CurrentUserContextProvider`가 제공하는 데이터가 필요하다는 걸 알 수 있습니다.

리팩터링할 때 이를 기억할 수 있으며, Provider가 렌더링 되는 위치를 변경하면 해당 context를 사용하는 모든 자식에게 영향을 미칠 것도 알 수 있습니다.

### TypeScript 만족시키기

React Context는 Provider 없이도 동작하도록 설계되었기 때문에, TypeScript는 여전히 만족하지 않을 수 있습니다. 커스텀 훅에 불변성을 추가하겠습니다:

```tsx
export const useCurrentUserContext = () => {
  const currentUser = React.useContext(CurrentUserContext);
  if (!currentUser) {
    throw new Error("CurrentUserContext: No value provided");
  }

  return currentUser;
};
```

이렇게 하면 실수로 잘못된 위치에서 접근하는 경우 적절한 오류 메시지와 함께 빠르게 실패할 수 있습니다. TypeScript는 커스텀 훅의 `currentUser` 값을 추론하므로 안전하게 사용할 수 있고 프로퍼티에 접근할 수도 있습니다.

### 상태 동기화에 대한 우려

"이거 React Query에서 값 하나 복사해서 또 다른 상태 분배 방법에 넣는 '상태 동기화' 아닌가?"라고 생각할 수도 있습니다.

**아닙니다!** 진실의 단일 공급원은 여전히 쿼리입니다. Provider를 제외하고 context 값을 변경할 방법은 없습니다. 아무것도 복사되지 않으며 동기화가 어긋날 수도 없습니다.

React Query의 `data`를 자식 컴포넌트에게 prop으로 전달하는 건 "상태 동기화"가 아닙니다. context도 prop drilling과 비슷하기 때문입니다.

### 요청 폭포(Request Waterfall)

이 기법의 단점은 네트워크 폭포를 일으킬 수 있다는 것입니다. 컴포넌트 트리의 렌더링이 Provider에서 중지되어서, 관련 없는 하위 컴포넌트의 네트워크 요청이 실행되지 않기 때문입니다.

주로 하위 트리에서 **반드시 필요한** 데이터에 대해 이 접근법을 고려합니다. 사용자 정보가 좋은 예입니다. 이 정보가 없으면 무엇을 렌더링할지 알 수 없기 때문입니다.

### Suspense 대안

React Suspense로 유사한 구조를 구현할 수 있지만, 요청 폭포를 일으킬 수 있다는 동일한 단점이 있습니다.

현재 메이저 버전(v4)의 문제: `suspense: true`를 사용하면 `data`의 타입을 좁힐 수 없습니다.

**React Query v5**부터는 `useSuspenseQuery` 훅이 있습니다. 이 훅을 사용하면:

```tsx
function UserNameDisplay() {
  const { data } = useSuspenseQuery(...)
  return <div>User: {data.username}</div>
}
```

컴포넌트가 렌더링되기만 한다면 데이터가 정의될 것을 보장하며, TypeScript도 행복해합니다.
