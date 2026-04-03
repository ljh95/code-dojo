---
id: 1
title: "Pagination 상태 저장 - 다형성으로 유연하게"
tags: ["다형성", "DI", "SOLID", "Strategy Pattern"]
difficulty: "medium"
---

## 질문

아래는 페이지네이션 상태를 관리하는 커스텀 훅이다.
이 코드의 **설계 문제점**을 파악하고, 다음 질문에 답해보자.

1. 만약 특정 페이지에서는 URL이 아닌 `sessionStorage`에 페이지 상태를 저장해야 한다면, 이 코드를 어떻게 바꿔야 할까?
2. `useSearchParams()`를 훅 내부에서 직접 호출하는 것이 왜 문제가 될 수 있을까?
3. 이 코드를 **다형성**을 활용해 개선한다면 어떤 구조가 되어야 할까?

```tsx
// usePagination.ts
import { useSearchParams } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';

function usePagination() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [state, setState] = useState(() => ({
    page: Number(searchParams.get('page')) || 1,
    size: Number(searchParams.get('size')) || 10,
  }));

  // URL 동기화
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(state.page));
    next.set('size', String(state.size));
    setSearchParams(next, { replace: true });
  }, [state]);

  const goToPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, page }));
  }, []);

  const goToNextPage = useCallback(() => {
    setState(prev => ({ ...prev, page: prev.page + 1 }));
  }, []);

  const goToPrevPage = useCallback(() => {
    setState(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
  }, []);

  const changePageSize = useCallback((size: number) => {
    setState({ page: 1, size });
  }, []);

  return {
    currentPage: state.page,
    pageSize: state.size,
    goToPage,
    goToNextPage,
    goToPrevPage,
    changePageSize,
  } as const;
}
```

**힌트:** "변경의 이유"가 몇 가지인지 생각해보자. 그리고 `sessionStorage` 버전을 만든다면, 동일한 인터페이스로 교체 가능한가?

---answer---

## 정답: Storage Strategy 패턴으로 분리

### 핵심 아이디어

"페이지 상태를 **어디에** 저장할 것인가"와 "페이지 상태를 **어떻게** 다룰 것인가"는 **변경의 이유가 다르다.** 이 두 관심사를 분리하면 저장소 구현을 자유롭게 교체할 수 있다.

### 1. Storage Strategy (다형성)

```tsx
// PaginationStorage.ts

interface PaginationStorage {
  read(): { page: number; size: number };
  write(state: { page: number; size: number }): void;
}

// 구현체 1: QueryString
const createQueryStringStorage = (
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  defaults = { page: 1, size: 10 },
): PaginationStorage => ({
  read() {
    return {
      page: Number(searchParams.get('page')) || defaults.page,
      size: Number(searchParams.get('size')) || defaults.size,
    };
  },
  write(state) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(state.page));
    next.set('size', String(state.size));
    setSearchParams(next, { replace: true });
  },
});

// 구현체 2: SessionStorage
const createSessionStorage = (
  key: string,
  defaults = { page: 1, size: 10 },
): PaginationStorage => ({
  read() {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? '') ?? defaults;
    } catch {
      return defaults;
    }
  },
  write(state) {
    sessionStorage.setItem(key, JSON.stringify(state));
  },
});
```

### 2. 의도를 드러내는 인터페이스

```tsx
// usePagination.ts

function usePagination(storage: PaginationStorage) {
  const [state, setState] = useState(() => storage.read());

  // storage 동기화
  useEffect(() => { storage.write(state); }, [state]);

  // 명령 (Command) — 상태를 변경하고, 값을 반환하지 않는다
  const goToPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, page }));
  }, []);

  const goToNextPage = useCallback(() => {
    setState(prev => ({ ...prev, page: prev.page + 1 }));
  }, []);

  const goToPrevPage = useCallback(() => {
    setState(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
  }, []);

  const changePageSize = useCallback((size: number) => {
    // 의도: size 바꾸면 1페이지로 리셋 — 이 지식이 훅 안에 캡슐화됨
    setState({ page: 1, size });
  }, []);

  // 쿼리 (Query) — 부수효과 없이 값만 반환
  return {
    currentPage: state.page,
    pageSize: state.size,
    goToPage,
    goToNextPage,
    goToPrevPage,
    changePageSize,
  } as const;
}
```

### 3. 사용하는 쪽에서 주입

```tsx
// 목록 페이지 — querystring
const [searchParams, setSearchParams] = useSearchParams();
const storage = useMemo(
  () => createQueryStringStorage(searchParams, setSearchParams),
  [searchParams, setSearchParams],
);
const pagination = usePagination(storage);

// 디테일 내 테이블 — sessionStorage
const storage = useMemo(
  () => createSessionStorage('detail-table-pagination'),
  [],
);
const pagination = usePagination(storage);

// 둘 다 동일한 메시지로 소통
pagination.goToNextPage();       // setPage(page + 1) 아님
pagination.changePageSize(20);   // page 리셋을 호출자가 기억할 필요 없음
```

---

## 왜 `useSearchParams()`를 내부에서 호출하면 안 될까?

### 이유 1: 변경의 이유가 다르다

**`searchParams`를 "어떻게 얻느냐"** — 이건 라우터 라이브러리의 관심사다. 지금은 react-router의 `useSearchParams`를 쓰지만, Next.js로 가면 `useSearchParams`가 `next/navigation`에서 오고, TanStack Router로 가면 또 다른 API다. 이게 바뀔 때 **pagination storage 로직은 바뀔 이유가 없다.** URL에서 page를 읽고 쓰는 방법은 동일하니까.

**pagination 상태를 "어떻게 저장하느냐"** — 이건 storage 전략의 관심사다. querystring 파싱 로직, 기본값 처리, key 이름 같은 게 바뀔 수 있다. 이게 바뀔 때 **라우터 선택은 바뀔 이유가 없다.**

만약 내부에서 `useSearchParams()`를 직접 호출하면 이 두 가지 변경의 이유가 하나의 함수에 뒤섞인다. react-router를 Next.js로 바꿀 때 storage 로직을 건드려야 하는 상황이 생기는 것이다.

### 이유 2 (더 근본적): 다형성이 깨진다

`createQueryStringStorage`는 **일반 함수(팩토리)**이지 훅이 아니다. 만약 내부에서 `useSearchParams()`를 호출하면 이 함수가 **훅이 되어야 한다.** 그러면 `PaginationStorage` 인터페이스의 다형성이 깨진다.

```tsx
// useSearchParams를 내부에서 호출하면?
const useQueryStringStorage = (): PaginationStorage => {
  const [searchParams, setSearchParams] = useSearchParams(); // 훅 호출
  return { read() { ... }, write() { ... } };
};

// sessionStorage 구현체는 훅일 필요가 없는데?
const createSessionStorage = (key: string): PaginationStorage => {
  return { read() { ... }, write() { ... } };
};
```

하나는 `useXxx` 훅이고 하나는 `createXxx` 팩토리다. 호출 규칙이 다르고, 사용할 수 있는 위치도 다르다. **동일한 오퍼레이션(read/write)을 제공하는 같은 타입인데 생성 방식이 달라지는 것이다.** 이러면 `usePagination`이 storage를 받아서 쓰는 게 아니라, 내부에서 "이건 훅이니까 조건부로 호출하면 안 되고..." 같은 리액트 규칙에 오염된다.

외부에서 주입하면 `PaginationStorage`는 그냥 `{ read, write }`를 가진 순수한 객체다. 어떤 구현체든 같은 모양이고, 리액트를 몰라도 된다. **다형성이 성립하려면 구현체들이 동일한 수준의 추상화에 있어야 하는데**, 훅과 일반 함수를 섞으면 그게 깨진다.
