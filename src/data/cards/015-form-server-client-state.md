---
id: 15
title: "폼과 React Query - 서버 상태와 클라이언트 상태 분리"
tags: ["react-query", "폼", "서버상태", "클라이언트상태"]
difficulty: "hard"
sourceDoc: [15]
---

## 질문

아래는 React Query와 react-hook-form을 결합한 폼 코드이다.

```tsx
function PersonDetail({ id }) {
  const { data } = useQuery({
    queryKey: ['person', id],
    queryFn: () => fetchPerson(id),
  });
  const { register, handleSubmit } = useForm({ defaultValues: data });
  const { mutate } = useMutation({
    mutationFn: (values) => updatePerson(values),
  });

  if (data) {
    return (
      <form onSubmit={handleSubmit(mutate)}>
        <input {...register('firstName')} />
        <input {...register('lastName')} />
        <button type="submit">Submit</button>
      </form>
    );
  }
  return 'loading...';
}
```

1. 이 코드에서 `useForm({ defaultValues: data })`가 제대로 동작하지 않는 이유는?
2. 서버 상태를 폼에 복사한 뒤 `staleTime: Infinity`를 설정하는 이유는?
3. 여러 사람이 동시에 같은 폼을 편집하는 협업 환경에서, 백그라운드 업데이트를 유지하면서 폼 상태를 관리하려면 어떤 전략을 사용해야 하는가?

**힌트:** 첫 렌더링 시 `data`의 값이 무엇인지, 훅의 호출 순서를 생각해보자.

---answer---

## 정답: 컴포넌트 분리 + 상태 파생 전략

### 핵심 아이디어

폼은 서버 상태를 클라이언트 상태로 "복사"하는 대표적 사례이다. **트레이드오프를 인식하고 의도적으로 선택**해야 한다. 단순한 폼이면 서버 상태를 초기값으로 복사하고, 협업 폼이면 서버 상태와 클라이언트 변경 사항을 분리하여 **파생 상태**를 만든다.

### 단계별 해설

**1단계: defaultValues 문제 해결**

첫 렌더링 시 `data`는 `undefined`이다(데이터를 아직 가져오지 않았으므로). 훅은 조건부로 호출할 수 없기 때문에 `useForm({ defaultValues: undefined })`로 초기화된다.

해결: 폼을 별도 컴포넌트로 분리한다.

```tsx
function PersonDetail({ id }) {
  const { data } = useQuery({
    queryKey: ['person', id],
    queryFn: () => fetchPerson(id),
  });

  // ✅ data가 존재할 때만 PersonForm을 렌더링
  if (data) {
    return <PersonForm person={data} />;
  }
  return 'loading...';
}

function PersonForm({ person }) {
  // ✅ person은 항상 정의된 값
  const { register, handleSubmit } = useForm({ defaultValues: person });
  // ...
}
```

**2단계: staleTime: Infinity의 이유**

서버 상태를 폼에 복사하면 React Query가 백그라운드에서 새 데이터를 가져와도 **폼에는 반영되지 않는다**. 화면에 표시되지 않을 업데이트를 위해 서버에 요청을 보낼 이유가 없으므로, `staleTime: Infinity`로 불필요한 백그라운드 리페치를 차단한다.

**3단계: 협업 환경 — 상태 파생 전략**

```tsx
// 서버 상태: React Query가 관리
const { data: serverPerson } = useQuery({ queryKey: ['person', id], ... });

// 클라이언트 상태: 사용자가 변경한 필드만 추적
const [dirtyFields, setDirtyFields] = useState({});

// 파생 상태: 사용자가 수정한 필드는 클라이언트 값, 아니면 서버 값
const displayValue = {
  firstName: dirtyFields.firstName ?? serverPerson.firstName,
  lastName: dirtyFields.lastName ?? serverPerson.lastName,
};
```

사용자가 수정하지 않은 필드는 서버의 최신 데이터로 자동 업데이트되고, 수정 중인 필드는 사용자의 입력값을 유지한다.

### 깊은 이유 설명

폼은 **서버 상태와 클라이언트 상태의 경계가 흐려지는** 대표적 영역이다. 단순한 프로필 편집 폼이라면 서버 상태를 초기값으로 복사하는 것이 실용적이다. 하지만 협업 환경이나 오래 머무는 폼에서는 "마지막으로 저장한 사람이 이김" 문제가 발생할 수 있다. 상태 파생 전략은 이를 해결하지만, 중첩 객체 병합이 어렵고 폼 값이 갑자기 바뀌는 UX 이슈가 생길 수 있다. **어떤 방법을 선택하든 트레이드오프를 인지하는 것이 핵심**이다.
