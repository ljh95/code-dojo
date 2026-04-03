---
id: 15
title: "(번역) #14: React Query and Forms"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/14-react-query-and-forms"
tags: [react-query, 번역, 폼]
date: ""
---

> **📌 핵심 요약**
> - 폼에서 서버 상태를 초기값으로 복사하는 방식과 서버/클라이언트 상태를 분리해 병합하는 방식 각각의 트레이드오프를 이해해야 한다
> - 키워드: 서버 상태 vs 클라이언트 상태, defaultValues, staleTime, 백그라운드 업데이트
> - 이런 상황에서 다시 읽으면 좋다: React Query로 가져온 데이터를 폼에 연동하는 구조를 설계할 때

---

> **알립니다**
> 이 글은 [TkDodo](https://github.com/tkdodo)의 "[React Query and Forms](https://tkdodo.eu/blog/react-query-and-forms)"를 번역한 문서입니다.

---

폼은 데이터를 업데이트하는 주요 수단으로서 많은 웹 애플리케이션에서 중요한 부분을 차지합니다. React Query를 데이터 조회([queries](https://tkdodo.eu/blog/react-query-as-a-state-manager)) 뿐만 아니라 수정([mutations](https://tkdodo.eu/blog/mastering-mutations-in-react-query))에도 사용하고 있으므로, 우리가 애용하는 비동기 상태 관리도구를 폼과 통합할 필요가 있습니다.

좋은 소식은 폼에는 특별한 것이 없다는 것입니다. 결국 폼은 데이터를 표시하기 위해 렌더링하는 HTML 요소들일 뿐입니다. 하지만 데이터를 *변경*하고자 할 때, 서버 상태와 클라이언트 상태의 경계가 다소 흐려지기 시작하여 복잡성이 생길 수 있습니다.

## 서버 상태 vs. 클라이언트 상태 (Server State vs. Client State)

요약하자면, *서버 상태*는 우리가 소유하지 않는 상태로, 주로 비동기적이며 데이터를 마지막으로 가져왔을 때의 스냅샷만 볼 수 있는 상태입니다.

*클라이언트 상태*는 프론트엔드가 완전히 제어하는 상태로, 주로 동기적이며 항상 정확한 값을 알고 있는 상태입니다.

사람 목록을 표시할 때, 이는 의심할 여지 없이 서버 상태입니다. 하지만 어떤 사람을 클릭하여 세부 정보를 폼에 표시하고 일부 값을 업데이트하려고 할 때는 어떻게 될까요? 이 서버 상태가 이제 클라이언트 상태가 되는 걸까요? 아니면 하이브리드 상태일까요?

## 간단한 접근 방식 (The simple approach)

저는 이미 상태를 하나의 상태 관리 도구에서 다른 상태 관리 도구로 복사하는 것, 즉 [props를 state로 옮기거나](https://tkdodo.eu/blog/putting-props-to-use-state) [React Query의 상태를 로컬 상태로](https://tkdodo.eu/blog/practical-react-query#keep-server-and-client-state-separate) 복사하는 것에 대해 반대 입장을 밝혔습니다.

다만, 폼의 경우 이 규칙의 예외가 될 수 있다고 생각합니다. 의도적으로 그렇게 하고 트레이드오프에 대해 알고 있다면 말이죠 (결국 모든 것은 트레이드오프입니다). 우리의 Person 폼을 렌더링할 때, 서버 상태를 *초기 데이터*로만 취급하는 것이 매우 유용할 수 있습니다. firstName과 lastName을 가져와 폼 상태에 넣은 다음, 사용자가 이를 업데이트하도록 하는 방식입니다.

예시를 함께 살펴보겠습니다.

```tsx
function PersonDetail({ id }) {
  const { data } = useQuery({
    queryKey: ['person', id],
    queryFn: () => fetchPerson(id),
  });
  const { register, handleSubmit } = useForm();
  const { mutate } = useMutation({
    mutationFn: (values) => updatePerson(values),
  });

  if (data) {
    return (
      <form onSubmit={handleSubmit(mutate)}>
        <div>
          <label htmlFor="firstName">First Name</label>
          <input {...register('firstName')} defaultValue={data.firstName} />
        </div>
        <div>
          <label htmlFor="lastName">Last Name</label>
          <input {...register('lastName')} defaultValue={data.lastName} />
        </div>
        <button type="submit">Submit</button>
      </form>
    );
  }

  return 'loading...';
}
```

이 예시는 놀라울 정도로 잘 동작합니다. - 그렇다면 어떤게 트레이드오프 일까요?

### 데이터가 undefined일 수 있습니다 (Data might be undefined)

아시다시피, `useForm`은 전체 폼에 대해 defaultValues를 직접 받을 수도 있는데, 이는 더 큰 규모의 폼에 매우 유용할 수 있습니다. 하지만 훅을 조건부로 호출할 수 없기 때문에, 그리고 처음 렌더링 시 `data`가 `undefined` 상태이기 때문에 (먼저 데이터를 가져와야 하기 때문에), 같은 컴포넌트에서 이를 직접 처리할 수는 없습니다:

```tsx
const { data } = useQuery({
  queryKey: ['person', id],
  queryFn: () => fetchPerson(id),
});
// 🚨 이 방식은 폼을 undefined로 초기화 할 것입니다.
const { register, handleSubmit } = useForm({ defaultValues: data });
```

`useState`에 복사할 때나 비제어 폼을 사용할 때도 같은 문제가 발생할 수 있습니다 (참고로 react-hook-form은 내부적으로 비제어 폼을 사용합니다). 이 문제를 해결하는 최선의 방법은 폼을 별도의 컴포넌트로 분리하는 것입니다.

```tsx
function PersonDetail({ id }) {
  const { data } = useQuery({
    queryKey: ['person', id],
    queryFn: () => fetchPerson(id),
  });
  const { mutate } = useMutation({
    mutationFn: (values) => updatePerson(values),
  });

  if (data) {
    return <PersonForm person={data} onSubmit={mutate} />;
  }

  return 'loading...';
}

function PersonForm({ person, onSubmit }) {
  const { register, handleSubmit } = useForm({ defaultValues: person });
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="firstName">First Name</label>
        <input {...register('firstName')} />
      </div>
      <div>
        <label htmlFor="lastName">Last Name</label>
        <input {...register('lastName')} />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}
```

이 방법은 나쁘지 않습니다. 데이터 불러오기와 출력을 분리하기 때문입니다. 개인적으로 이러한 분리를 크게 선호하지는 않지만, 이 경우에는 효과적입니다.

### 백그라운드 업데이트를 사용하지 않기 (No Background Updates)

React Query의 주요 목표는 UI를 서버 상태와 항상 일치하도록 유지하는 것입니다. 그러나 서버 상태를 다른 곳으로 복사하면 React Query는 더 이상 그 역할을 할 수 없습니다. 어떤 이유로든 백그라운드에서 다시 불러오기가 발생하여 새로운 데이터를 가져오더라도, 우리의 폼 상태는 이에 따라 업데이트되지 않습니다. 해당 폼 상태를 우리만 유일하게 다루는 경우 (예: 프로필 페이지의 폼) 라면 이는 큰 문제가 되지 않을 것입니다. 이런 경우, 쿼리에 더 높은 `staleTime`을 설정하여 백그라운드 업데이트를 최소화하는 것이 좋습니다. 결국, 화면에 반영되지 않을 업데이트를 위해 서버에 계속 쿼리를 보낼 이유가 없기 때문입니다.

```tsx
// ✅ 백그라운드 업데이트를 비활성화
const { data } = useQuery({
  queryKey: ['person', id],
  queryFn: () => fetchPerson(id),
  staleTime: Infinity,
});
```

이 접근 방식은 더 큰 폼이나 협업 환경에서 문제가 될 수 있습니다. 폼이 클수록 사용자가 작성하는 데 더 오랜 시간이 걸립니다. 여러 사람이 동일한 폼의 다른 필드를 작업할 경우, 마지막으로 업데이트한 사람이 다른 사람이 변경한 값을 덮어쓸 수 있습니다. 이는 각자의 화면에는 여전히 업데이트되지 않은 버전이 부분적으로 표시되기 때문입니다.

이제 react-hook-form은 사용자가 변경한 필드를 감지하고, 사용자 정의 코드와 함께 "dirty" 필드만 서버로 전송할 수 있도록 합니다 (예제는 [여기](https://react-hook-form.com/api/useform/formstate)에서 볼 수 있습니다). 이는 꽤 유용한 기능입니다. 그러나 여전히 다른 사용자가 업데이트한 최신 값은 표시되지 않습니다. 만약 다른 사람이 특정 필드를 변경한 것을 알았다면, 당신도 입력 값을 변경했을 수도 있습니다.

그렇다면 폼을 수정하는 도중에 백그라운드 업데이트를 반영하려면 어떻게 해야할까요?

### 백그라운드 업데이트 유지하기 (Keeping background updates on)

상태를 철저히 분리하는 접근 방식이 있습니다. React Query에서 서버 상태를 유지하고, 사용자가 변경한 사항만 클라이언트 상태로 추적합니다. 사용자에게 표시할 진실의 원천은 이 두 가지 상태에서 파생된 상태입니다: 사용자가 필드를 변경한 경우 클라이언트 상태를 표시하고, 그렇지 않으면 서버 상태를 표시합니다.

이 접근 방식에서는 백그라운드 업데이트를 유지할 수 있습니다. 사용자가 수정하지 않은 필드에도 여전히 유효하기 때문입니다. 폼을 처음 렌더링했을 때의 초기 상태에도 더 이상 얽매이지 않습니다. 하지만 이 접근 방식에도 몇 가지 주의할 점이 있습니다:

- 사용자가 입력 중인 데이터를 서버 데이터와 병합하는 과정에서의 충돌 가능성
- 사용자가 입력한 데이터가 자동으로 업데이트되는 서버 데이터로 인해 덮어쓰여지는 경우

이 방법을 사용하면 사용자가 변경하지 않은 필드는 서버 데이터로부터 최신 상태를 유지할 수 있어, 백그라운드 업데이트의 혜택을 계속 누릴 수 있습니다.

### 제어되는 필드가 필요합니다 (You need controlled fields)

제가 알기로는 비제어 필드로는 이를 달성할 좋은 방법이 없습니다. 그래서 위 예제에서 제어된 필드를 사용했습니다. 제가 놓친 부분이 있다면 알려주세요.

> **업데이트**
> React Hook Form에는 변경 사항에 반응하고 폼 값을 업데이트하는 [새로운 values API](https://www.react-hook-form.com/api/useform/#values)가 있습니다. 우리는 defaultValues 대신에 이 API를 사용하여 서버 상태로부터 파생된 상태를 사용할 수 있습니다.

### 상태 파생은 어려울 수 있습니다 (Deriving state might be difficult)

이 접근 방식은 nullish 병합을 사용하여 서버 상태로 쉽게 되돌아갈 수 있는 얕은 폼에 가장 적합합니다. 하지만 중첩된 객체와 올바르게 병합하는 것은 더 어려울 수 있습니다. 또한 백그라운드에서 폼 값을 변경하는 것이 사용자 경험 측면에서 의심스러울 때도 있습니다. 더 나은 아이디어는 서버 상태와 동기화되지 않은 값을 강조 표시하고, 사용자가 무엇을 할지 결정하도록 하는 것입니다.

어떤 방법을 선택하던지간에, 각각의 접근 방식이 갖고 있는 장점 / 단점이 뭔지 알 수 있도록 해보세요.

## 팁과 트릭 (Tips and Tricks)

폼을 세팅하는 이 두 가지의 주요 방법 말고도 React Query와 폼을 병합하는 더 작지만 중요한 트릭도 있습니다:

### 이중 제출 방지 (Double submit prevention)

폼이 두 번 제출되는 것을 막으려면 `useMutation`이 반환하는 `isLoading`을 사용할 수 있습니다. 이 값은 뮤테이션이 진행 중일 때 true가 됩니다. 폼 자체를 비활성화하려면 주요 제출 버튼을 비활성화하기만 하면 됩니다:

```tsx
const { mutate, isLoading } = useMutation({
  mutationFn: (values) => updatePerson(values)
})
<input type="submit" disabled={isLoading} />
```

### 뮤테이션 이후의 무효화 및 초기화 (Invalidate and reset after mutation)

폼 제출 직후에 다른 페이지로 리다이렉트 하지 않는 경우, 무효화가 *완료된 후* 폼을 재설정하는 것이 좋습니다. [Mastering Mutations](https://tkdodo.eu/blog/mastering-mutations-in-react-query#some-callbacks-might-not-fire)에서 설명한 대로, `mutate`의 `onSuccess` 콜백에서 이를 수행하는 것이 좋습니다. 상태를 분리해서 유지하면, 서버 상태가 다시 반영되도록 `undefined`로 재설정하는 것만 필요하기 때문에 가장 효과적입니다:

```tsx
function PersonDetail({ id }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['person', id],
    queryFn: () => fetchPerson(id),
  });
  const { control, handleSubmit, reset } = useForm();
  const { mutate } = useMutation({
    mutationFn: updatePerson,
    // ✅ 무효화는 프로미스를 반환합니다.
    // 따라서 await 사용이 가능합니다.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['person', id] }),
  });

  if (data) {
    return (
      <form
        onSubmit={handleSubmit((values) =>
          // ✅ 클라이언트 상태를 undefined로 초기화 합니다.
          mutate(values, { onSuccess: () => reset() }),
        )}
      >
        <div>
          <label htmlFor="firstName">First Name</label>
          <input {...register('firstName')} />
        </div>
        <div>
          <label htmlFor="lastName">Last Name</label>
          <input {...register('lastName')} />
        </div>
        <button type="submit">Submit</button>
      </form>
    );
  }

  return 'loading...';
}
```
