---
id: 32
title: "float32/float16/bfloat16 - LLM에 적합한 부동소수점 선택"
tags: ["floating-point", "bfloat16", "precision", "LLM"]
difficulty: "easy"
sourceDoc: [32]
---

## 질문

LLM 모델의 파라미터를 저장할 부동소수점 포맷을 선택하려 한다. 아래 세 포맷의 비트 구성을 보고 질문에 답하시오.

```javascript
const formats = {
    float32:  { sign: 1, exponent: 8,  significand: 23 }, // 32비트
    float16:  { sign: 1, exponent: 5,  significand: 10 }, // 16비트
    bfloat16: { sign: 1, exponent: 8,  significand: 7  }, // 16비트
};

// 각 포맷의 특성
const specs = {
    float32:  { range: "±3.40×10³⁸", precision: "유효 숫자 7자리", size: "4바이트" },
    float16:  { range: "±65,504",     precision: "유효 숫자 3자리", size: "2바이트" },
    bfloat16: { range: "±3.39×10³⁸", precision: "유효 숫자 2자리", size: "2바이트" },
};
```

1. float16과 bfloat16은 **둘 다 16비트**인데, 왜 bfloat16의 범위가 float16보다 압도적으로 넓은가?
2. bfloat16은 유효 숫자가 **겨우 2자리**다. 그런데도 LLM에서 float32 대신 bfloat16을 쓸 수 있는 이유는 무엇인가?
3. 800억 파라미터 모델을 float32 대신 bfloat16으로 저장하면, 모델 크기가 어떻게 변하는가?

**힌트:** exponent 비트는 "얼마나 큰 수를 표현할 수 있는가", significand 비트는 "얼마나 정확하게 표현할 수 있는가"를 결정한다.

---answer---

## 정답: bfloat16 (Brain Float 16)

### 핵심 아이디어

부동소수점에서 **exponent(지수) 비트**는 범위를, **significand(가수) 비트**는 정밀도를 결정한다. bfloat16은 float32와 같은 exponent 8비트를 유지하면서 significand만 줄인 포맷으로, **넓은 범위 + 낮은 정밀도**라는 LLM에 최적화된 조합이다.

### 각 질문 해설

**1. exponent 비트 수의 차이**

```javascript
// float16:  exponent 5비트 → 2⁵ = 32가지 지수
//           범위: ±65,504
// bfloat16: exponent 8비트 → 2⁸ = 256가지 지수
//           범위: ±3.39×10³⁸

// bfloat16은 float32의 exponent를 그대로 가져왔다
// → 오버플로우(overflow) 걱정 없이 큰 LLM에서 사용 가능
```

float16의 최대 65,504라는 범위는, 수십억 개 파라미터를 거치며 중간 계산값이 커질 수 있는 LLM에서 **오버플로우 위험**이 있다. bfloat16은 이 문제를 원천 차단한다.

**2. LLM에 높은 정밀도가 불필요한 이유**

```javascript
// LLM 파라미터 값의 실제 분포
// 대부분의 파라미터: -1.0 ~ 1.0 사이의 작은 값
// 예: 0.0312, -0.1567, 0.0891, ...

// float32로 저장: 0.031200000000000002 (유효 숫자 7자리)
// bfloat16으로 저장: 0.03125            (유효 숫자 2자리)
// 차이: 0.000050... → 모델 출력에 거의 영향 없음

// 구글 브레인 팀의 발견:
// "유효 숫자 2자리면 LLM을 만들기에 충분하다"
```

LLM의 학습 과정 자체가 파라미터를 작은 값으로 유도하고(일반화를 위해), 이 범위에서는 유효 숫자 2자리의 오차가 모델 출력에 유의미한 차이를 만들지 않는다.

**3. 모델 크기 절감**

```javascript
// 800억 파라미터 × 4바이트(float32) = 320GB
// 800억 파라미터 × 2바이트(bfloat16) = 160GB
// → 정확히 절반! (50% 절감)

// 실제 예시: Qwen-3-Coder-Next (80B)
// float32: ~320GB → bfloat16: ~159.4GB
```

### 깊은 이유 설명

bfloat16은 구글 브레인 팀이 **"LLM에 정말 필요한 것이 무엇인가?"**라는 질문에서 출발한 포맷이다. 핵심 통찰은 두 가지다:

1. **범위는 필수, 정밀도는 타협 가능**: 큰 모델의 학습 중 gradient가 매우 커지거나 작아질 수 있어서, 넓은 범위(overflow 방지)는 포기할 수 없다. 반면 파라미터 값 자체의 미세한 차이는 수십억 개가 합산되면서 평균적으로 상쇄된다.

2. **float32의 부분 집합**: bfloat16은 float32의 상위 16비트를 그대로 잘라낸 것이라, float32 ↔ bfloat16 변환이 매우 빠르다. 이것이 GPU 하드웨어 지원에도 유리하다.

> 오늘날 대부분의 오픈소스 LLM은 bfloat16을 기본 포맷으로 사용하며, 여기서 추가로 양자화(8비트, 4비트)를 적용하여 더 작게 만든다.
