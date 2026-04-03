---
id: 13
title: "(번역) #12: Mastering Mutations in React Query"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/12-mastering-mutations-in-react-query"
tags: [react-query, 번역, mutation]
date: ""
---

> **역자 주:** TkDodo의 "[Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query)"를 번역한 문서입니다.

앞서 저희는 React Query가 제공하는 기능과 개념에 대해 많이 다뤄왔습니다. 대부분은 데이터를 가져오는 것이었습니다. 이는 `useQuery`를 통해 이루어졌습니다. 하지만 데이터를 다루는데 있어서 2번째로 중요한 것이 있습니다. 바로 데이터를 업데이트 하는 것입니다.

이러한 사용 사례에 대해 React Query는 `useMutation` 훅을 제공합니다.

## 변형(mutations)이 뭘까요? (What are mutations?)

일반적으로 변형(mutation)이란 부수 효과를 갖는 함수를 의미합니다. 예시로 배열의 `push` 메소드를 살펴보면, 값을 배열에 추가하는 부분에서 배열에 변형을 일으키는 부수 효과가 있습니다.

```tsx
const myArray = [1];
myArray.push(2);

console.log(myArray); // [1, 2]
```

불변성을 지킬 수 있는 메소드는 `concat`일 것입니다: 배열에 값을 추가하지만 현재 작업 중인 배열을 직접적으로 수정하는 것이 아니라 새로운 배열을 반환하기 때문입니다.

```tsx
const myArray = [1];
const newArray = myArray.concat(2);

console.log(myArray); // [1]
console.log(newArray); // [1, 2]
```

이름에서 나타나듯이, *useMutation*은 어떤 종류의 부수 효과를 갖고 있습니다. React Query를 통해 "[서버 상태를 관리](https://tkdodo.eu/blog/react-query-as-a-state-manager)"하는 맥락에서 보면, 변형은 *서버에서* 부수 효과를 수행하는 함수를 설명합니다. 데이터베이스에서 할 일을 생성하는 것은 변형일 것입니다. 사용자를 로그인 시키는 것도 클래식한 변형일 것입니다. 사용자를 위한 토큰을 생성하는 부수 효과를 수행하기 때문입니다.

어떤 측면에서 보면 `useMutation`은 `useQuery`와 매우 유사합니다. 하지만 다른 측면에서 보면 상당한 차이가 있습니다.

## useQuery 와의 차이점 (Differences to useQuery)

**useQuery는 선언형이며 useMutation은 명령형입니다.**

이 말은 대부분의 쿼리가 자동으로 실행된다는 것을 의미합니다. 의존성을 정의해도 React Query는 필요에 따라 쿼리를 즉시 실행하고 똑똑한 백그라운드 업데이트를 수행할 수 있도록 관리합니다. 이는 쿼리와 잘 작동합니다. 왜냐하면 우리는 화면에서 보는 데이터를 백엔드에 있는 실제 데이터와 동기화 되도록 유지하고 싶기 때문입니다.

변형(mutation)의 경우 이러한 방식은 잘 작동하지 않을 것입니다. 브라우저 창에 포커스가 맞춰질 때마다 새로운 할 일이 생성된다고 상상해보세요. 그래서 변형을 즉시 실행하는 대신, React Query는 변형을 실행하고 싶을 때마다 호출할 수 있는 함수를 제공합니다:

```tsx
function AddComment({ id }) {
  // 아직 아무것도 실행하지 않을 것입니다.
  const addComment = useMutation({
    mutationFn: (newComment) =>
      axios.post(`/posts/${id}/comments`, newComment),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        // ✅ mutation은 폼이 제출되면 실행됩니다.
        addComment.mutate(new FormData(event.currentTarget).get("comment"));
      }}
    >
      <textarea name="comment" />
      <button type="submit">Comment</button>
    </form>
  );
}
```

또 다른 차이점은 변형(mutation)이 `useQuery`처럼 상태를 공유하지 않는다는 것입니다. 서로 다른 컴포넌트에서 동일한 `useQuery`를 여러 번 호출할 수 있고, 동일한 캐시된 결과를 반환받을 수 있습니다 - 하지만 이것은 변형에는 적용되지 않습니다.

> **업데이트 (Update)**
>
> v5부터 [useMutationState](https://tanstack.com/query/v5/docs/framework/react/reference/useMutationState) 훅을 사용해서 변형(mutation)의 상태를 컴포넌트 간에 공유할 수 있게 되었습니다.

## 변형(mutation)을 쿼리와 연결하기 (Tying mutations to queries)

변형(mutation)은 설계상 쿼리와 직접 연결되어 있지 않습니다. 블로그 포스트의 좋아요를 담당하는 변형은 해당 블로그 포스트를 가져오는 쿼리와 아무런 관련이 없습니다. 관련이 있으려면, React Query가 가지고 있지 않은 어떤 종류의 기본 스키마가 필요할 것입니다.

변형으로 인한 변경사항을 쿼리에 반영하기 위해, React Query는 주로 두 가지 방법을 제공합니다:

### 무효화 (Invalidation)

이는 화면을 최신 상태로 유지하는 가장 간단한 방법입니다. 서버 상태와 함께라면, 당신이 표시하는 것은 해당 시점의 데이터의 스냅샷일 뿐임을 기억하세요. 물론 React Query는 그 데이터를 최신 상태로 유지하려고 합니다. 하지만 변형(mutation)을 통해 의도적으로 서버 상태를 변경한다면, 이는 React Query에게 캐시된 일부 데이터가 이제 "무효"하다고 알릴 좋은 시점입니다. 그러면 React Query는 현재 사용 중인 데이터를 다시 불러오고, 불러오기가 완료되면 화면이 자동으로 업데이트됩니다. 라이브러리에게는 단지 *어떤* 쿼리를 무효화하고 싶은지만 알려주면 됩니다.

```tsx
const useAddComment = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newComment) =>
      axios.post(`/posts/${id}/comments`, newComment),
    onSuccess: () => {
      // ✅ 블로그 포스트의 댓글을 다시 불러옵니다.
      queryClient.invalidateQueries({
        queryKey: ["posts", id, "comments"],
      });
    },
  });
};
```

쿼리 무효화는 꽤 똑똑합니다. 모든 "[쿼리 필터](https://react-query.tanstack.com/guides/filters#query-filters)"와 마찬가지로, 쿼리 키에 대해 퍼지 매칭(fuzzy matching)을 사용합니다. 따라서 여러분이 댓글 목록에 대해 여러 키를 가지고 있다면, 그 모든 것들이 무효화될 것입니다. 하지만, 현재 활성화된 것들만 다시 불러옵니다. 나머지는 오래되었다고(stale) 표시되며, 다음에 사용될 때 다시 불러오게 됩니다.

예를 들어, 우리가 댓글을 정렬할 수 있는 옵션을 가지고 있고, 새 댓글이 추가된 시점에서 우리의 캐시에는 두 개의 댓글 쿼리가 있다고 가정해 봅시다:

```tsx
["posts", 5, "comments", { sortBy: ["date", "asc"] }]
["posts", 5, "comments", { sortBy: ["author", "desc"] }]
```

우리는 이 중 하나만을 화면에 보여주고 있기 때문에, `invalidateQueries`는 해당 쿼리만 다시 불러오고 다른 하나는 오래되었다고 표시할 것입니다.

### 직접 업데이트 (Direct updates)

때로는, 특히 변형(mutation) 이후에 필요한 모든 것이 이미 반환된 경우에는 데이터를 다시 불러오고 싶지 않을 수 있습니다. 블로그 포스트의 제목을 업데이트하는 변형이 있고 백엔드가 완전한 블로그 포스트를 응답으로 반환하는 경우, `setQueryData`를 통해 쿼리 캐시를 직접 업데이트할 수 있습니다.

```tsx
const useUpdateTitle = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newTitle) =>
      axios
        .patch(`/posts/${id}`, { title: newTitle })
        .then((response) => response.data),
    // 💡 변형 (mutation)의 응답이 onSuccess로 전달됩니다.
    onSuccess: (newPost) => {
      // ✅ 상세보기 화면을 직접 업데이트 합니다.
      queryClient.setQueryData(["posts", id], newPost);
    },
  });
};
```

`setQueryData`를 통해 직접 캐시에 데이터를 넣는 것은 이 데이터가 백엔드에서 반환된 것처럼 작동할 것이며, 그에 따라 해당 쿼리를 사용하는 모든 컴포넌트가 리렌더링될 것임을 의미합니다.

직접 업데이트와 두 접근 방식의 조합에 대한 더 많은 예시는 "[#8: Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys#structure)"에서 다루고 있습니다.

---

개인적으로, 대부분의 경우에 무효화를 선호해야 한다고 생각합니다. 물론, 사용 사례에 따라 다르지만, 직접 업데이트가 신뢰성 있게 작동하려면 프론트엔드에 더 많은 코드가 필요하며 어느 정도 백엔드의 로직과 중복된 로직이 필요합니다. 예를 들어, 정렬된 목록은 직접 업데이트하기가 꽤 어렵습니다. 업데이트로 인해 내 항목의 위치가 변경되었을 수 있기 때문입니다. 목록 전체를 무효화하는 것이 "더 안전한" 접근 방법입니다.

## 낙관적 업데이트 (Optimistic updates)

낙관적 업데이트는 React Query 변형(mutation)을 사용하는 주요 장점 중 하나입니다. *useQuery* 캐시는 쿼리 간의 전환 시, 특히 "[데이터 미리 불러오기(prefetching)](https://react-query.tanstack.com/guides/prefetching)"와 같이 사용할 때 데이터를 즉시 제공합니다. 이 덕분에 전체적인 UI가 매우 빠르게 느껴집니다. 변형(mutation)에도 같은 이점을 얻을 수 있다면 어떨까요?

대부분의 경우, 우리는 업데이트가 성공할 것이라고 확신합니다. 백엔드로부터 ok를 받고 UI에 결과를 표시하기까지 몇 초를 사용자가 왜 기다려야 할까요? 낙관적 업데이트의 아이디어는 서버로 전송하기 전에 변형(mutation)의 성공을 가정하는 것입니다. 성공적인 응답을 받게 되면, 우리가 해야 할 일은 화면을 다시 무효화하여 실제 데이터를 보여주는 것입니다. 요청이 실패할 경우, 우리는 UI를 변형 이전의 상태로 롤백할 것입니다.

이 방법은 즉각적인 사용자 피드백이 필요한 작은 변형(mutation)에 대해 훌륭하게 작동합니다. 요청을 수행하는 토글 버튼이 있고, 요청이 완료될 때까지 전혀 반응하지 않는 것보다 더 나쁜 것은 없습니다. 사용자들은 그 버튼을 두 번이나 세 번 클릭할 것이고, 모든 곳에서 "느리다고" 느껴질 것입니다.

### 예시 (Example)

추가적인 예시를 보여드리지는 *않을 것입니다*. "[공식 문서](https://react-query.tanstack.com/guides/optimistic-updates)"에서 해당 토픽을 훌륭하게 다루고 있고, "[타입스크립트](https://tanstack.com/query/v4/docs/examples/react/optimistic-updates-typescript)"로 작성된 codesandbox 예시도 있습니다.

저는 낙관적 업데이트가 다소 과도하게 사용된다고 생각합니다. 모든 변형(mutation)을 낙관적으로 수행할 필요는 없습니다. 실패할 확률이 매우 드물다는 것을 정말 확신할 때에만 낙관적 업데이트를 고려해야 합니다. 왜냐하면 롤백에 대한 UX는 그리 좋지 않기 때문입니다. 예를 들면 제출할 때 닫히는 모달 팝업 내부의 폼이나, 업데이트 후 상세 화면에서 리스트 화면으로의 리다이렉션이 있습니다. 이러한 동작들이 성급하게 수행되면, 다시 되돌리기가 어렵습니다.

또한, 즉각적인 피드백이 정말 필요한 것인지를 꼭 확인하세요 (위의 토글 버튼 예제처럼). 낙관적 업데이트를 작동시키는 데 필요한 코드는 간단하지 않으며, "표준적인" 변형(mutation)과 비교하면 특히 더 그렇습니다. 결과를 가정해서 보여주려면 백엔드가 하는 일을 모방해야 하며, 이는 Boolean을 뒤집거나 배열에 항목을 추가하는 것처럼 쉬울 수 있지만, 빠른 속도로 복잡해질 수도 있습니다:

- 추가하는 할 일에 id가 필요하다면, 어디서 가져오시겠어요?
- 현재 보고 있는 리스트가 정렬되어 있다면, 새로운 항목을 올바른 위치에 삽입하시나요?
- 다른 사용자가 그 사이에 다른 것을 추가했다면, 낙관적으로 추가된 항목의 위치가 재요청 후에 바뀌나요?

이러한 모든 경우의 수는 일부 상황에서 UX를 실제로 더 나쁘게 만들 수 있으며, 오히려 변형(mutation)이 진행 중일 때 버튼을 비활성화하고 로딩 애니메이션을 출력하는 것만으로 충분할 수 있습니다. 언제나 그렇듯, 올바른 도구를 올바른 작업에 사용하세요.

## 흔한 갓챠 (Common Gotchas)

마지막으로, 변형을 다룰 때 중요하지만 처음에는 그리 명확하지 않을 수도 있는 몇 가지 사항들을 살펴보겠습니다:

### 대기중인 프로미스 (awaited Promises)

변형 콜백에서 반환된 프로미스는 React Query에 의해 대기(awaited) 상태가 되며, `invalidateQueries`는 프로미스를 반환합니다. 관련된 쿼리가 업데이트하는 동안 변형(mutation)이 `loading` 상태에 머물길 원한다면, 콜백에서 `invalidateQueries`의 결과를 반환해야 합니다:

```tsx
{
  // 🎉 쿼리 무효화가 끝날 때 까지 대기할 것입니다.
  onSuccess: () => {
    return queryClient.invalidateQueries({
      queryKey: ["posts", id, "comments"],
    });
  };
}
{
  // 🚀 실행하고 끝입니다. - 대기하지 않을 것입니다.
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["posts", id, "comments"],
    });
  };
}
```

### Mutate 또는 MutateAsync (Mutate or MutateAsync)

`useMutation`은 두 가지 함수를 제공합니다 - `mutate`와 `mutateAsync`. 이 둘의 차이점은 무엇이며, 언제 어느 것을 사용해야 할까요?

`mutate`는 아무 것도 반환하지 않는 반면, `mutateAsync`는 변형의 결과를 포함하는 프로미스를 반환합니다. 그래서 변형 응답에 접근해야 할 때 `mutateAsync`를 사용하고 싶을 수 있지만, 저는 거의 항상 `mutate`를 사용해야 한다고 주장하고 싶습니다.

콜백을 통해 `data`나 `error`에 여전히 접근할 수 있으며, 오류 처리에 대해 걱정할 필요가 없습니다. `mutateAsync`는 프로미스 제어권을 개발자에게 넘기기 때문에, 수동으로 오류를 잡아야 하며, 그렇지 않으면 "[처리되지 않은 프로미스 거부](https://stackoverflow.com/questions/40500490/what-is-an-unhandled-promise-rejection)"를 받을 수 있습니다.

```tsx
const onSubmit = () => {
  // ✅ onSuccess를 통해 응답에 접근합니다.
  myMutation.mutate(someData, {
    onSuccess: (data) => history.push(data.url),
  });
};

const onSubmit = async () => {
  // 🚨 작동하지만, 에러 처리가 없습니다.
  const data = await myMutation.mutateAsync(someData);
  history.push(data.url);
};

const onSubmit = async () => {
  // 😕 문제는 없는 방법이지만 장황합니다.
  try {
    const data = await myMutation.mutateAsync(someData);
    history.push(data.url);
  } catch (error) {
    // 에러 처리
  }
};
```

`mutate`를 사용할 때는 React Query가 내부적으로 오류를 포착하고 (그리고 버립니다) 처리해주기 때문에, 오류를 처리할 필요가 없습니다. 실제로 `mutateAsync().catch(noop)`을 사용하여 구현되었습니다.

`mutateAsync`가 더 우수한 상황은 정말로 프로미스가 필요한 경우입니다. 이는 여러 변형을 동시에 발동시키고 모두 완료되기까지 기다리고 싶거나, 콜백으로 인한 콜백 지옥에 빠질 수 있는 종속적인 변형이 있는 경우에 필요할 수 있습니다.

### 변형은 변수에 대해 하나의 인자만 받습니다 (Mutations only take one argument for variables)

`mutate`의 마지막 인자가 옵션 객체이기 때문에, `useMutation`은 현재 변수에 대해 *하나의* 인자만 받을 수 있습니다. 이것은 확실히 한계이지만, 객체를 사용함으로써 쉽게 우회할 수 있습니다:

```tsx
// 🚨 잘못된 문법이며 동작하지 않을 것입니다.
const mutation = useMutation({
  mutationFn: (title, description) =>
    axios.post("/posts", { title, description }),
});

// ✅ 객체를 사용하여 여러 변수를 전달합니다.
const mutation = useMutation({
  mutationFn: ({ title, description }) =>
    axios.post("/posts", { title, description }),
});

mutation.mutate({ title: "Hello", description: "World" });
```

### 일부 콜백은 실행되지 않을 수 있습니다 (Some callbacks might not fire)

변형이 이미 진행 중인 상태에서 언마운트되면, `onSuccess`나 `onError` 콜백이 실행되지 않을 수 있습니다. 이는 의도적인 설계이며, 언마운트된 컴포넌트에서 상태 업데이트를 방지하기 위한 것입니다.

```tsx
// 폼 제출 중에 페이지를 떠나면
// onSuccess 콜백이 실행되지 않을 수 있습니다.
const mutation = useMutation({
  mutationFn: (data) => axios.post("/posts", data),
  onSuccess: () => {
    history.push("/posts");
  },
});
```
