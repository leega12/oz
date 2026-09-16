let chart = null;
let latestResults = [];

const TIMES = [0, 30, 60];


/* ================================
   평균
================================ */

function mean(values) {

  if (values.length === 0) {
    return NaN;
  }

  return (
    values.reduce((sum, value) => sum + value, 0)
    / values.length
  );

}


/* ================================
   표본 표준편차
================================ */

function standardDeviation(values) {

  if (values.length <= 1) {
    return 0;
  }

  const avg = mean(values);

  const variance =
    values.reduce(
      (sum, value) =>
        sum + Math.pow(value - avg, 2),
      0
    )
    / (values.length - 1);

  return Math.sqrt(variance);

}


/* ================================
   로지스틱 함수

   P(t) = K / (1 + e^(-r(t-t0)))
================================ */

function logistic(t, K, r, t0) {

  return (
    K /
    (
      1 +
      Math.exp(
        -r * (t - t0)
      )
    )
  );

}


/* ================================
   Min-Max 정규화
================================ */

function normalizeValues(values) {

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) {

    return values.map(() => 0);

  }

  return values.map(
    value =>
      (value - min) /
      (max - min)
  );

}


/* ================================
   입력값 가져오기
================================ */

function getMeasurements() {

  const data = {};

  TIMES.forEach(time => {

    data[time] = [];

  });


  const inputs =
    document.querySelectorAll(
      ".measurement"
    );


  inputs.forEach(input => {

    if (input.value === "") {
      return;
    }

    const value =
      Number(input.value);

    const time =
      Number(input.dataset.time);


    if (
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 100
    ) {

      data[time].push(value);

    }

  });


  return data;

}


/* ================================
   분석 시작
================================ */

function analyzeData() {

  const measurements =
    getMeasurements();


  /* 데이터 확인 */

  for (const time of TIMES) {

    if (
      measurements[time].length === 0
    ) {

      alert(
        `${time}분 측정값을 최소 1개 이상 입력해주세요.`
      );

      return;

    }

  }


  /* 모델 매개변수 */

  const K =
    Number(
      document.getElementById("K").value
    );

  const r =
    Number(
      document.getElementById("r").value
    );

  const t0 =
    Number(
      document.getElementById("t0").value
    );


  if (
    !Number.isFinite(K) ||
    !Number.isFinite(r) ||
    !Number.isFinite(t0)
  ) {

    alert(
      "로지스틱 모델의 K, r, t₀ 값을 모두 입력해주세요."
    );

    return;

  }


  if (K <= 0) {

    alert(
      "K는 0보다 큰 값을 입력해주세요."
    );

    return;

  }


  /* 실제 데이터 통계 */

  let actualMeans =
    TIMES.map(
      time =>
        mean(measurements[time])
    );


  const deviations =
    TIMES.map(
      time =>
        standardDeviation(
          measurements[time]
        )
    );


  /* 모델 예측 */

  let predictions =
    TIMES.map(
      time =>
        logistic(
          time,
          K,
          r,
          t0
        )
    );


  const normalize =
    document
      .getElementById("normalize")
      .checked;


  /* 정규화 */

  if (normalize) {

    actualMeans =
      normalizeValues(
        actualMeans
      );

    predictions =
      normalizeValues(
        predictions
      );

  }


  /* 결과 생성 */

  latestResults =
    TIMES.map(
      (time, index) => {

        const actual =
          actualMeans[index];

        const predicted =
          predictions[index];

        const difference =
          actual - predicted;

        const absoluteError =
          Math.abs(difference);


        return {

          time,

          actual,

          sd:
            deviations[index],

          predicted,

          difference,

          absoluteError

        };

      }
    );


  showResults(
    latestResults,
    normalize
  );

}


/* ================================
   RMSE
================================ */

function calculateRMSE(results) {

  const mse =
    results.reduce(
      (sum, result) =>
        sum +
        Math.pow(
          result.actual -
          result.predicted,
          2
        ),
      0
    )
    / results.length;


  return Math.sqrt(mse);

}


/* ================================
   MAE
================================ */

function calculateMAE(results) {

  return (
    results.reduce(
      (sum, result) =>
        sum +
        result.absoluteError,
      0
    )
    / results.length
  );

}


/* ================================
   결과 출력
================================ */

function showResults(
  results,
  normalized
) {

  const resultSection =
    document.getElementById(
      "resultSection"
    );


  resultSection.classList.remove(
    "hidden"
  );


  const rmse =
    calculateRMSE(results);

  const mae =
    calculateMAE(results);


  const first =
    results[0].actual;

  const last =
    results[
      results.length - 1
    ].actual;


  const increase =
    last - first;


  const unit =
    normalized
      ? ""
      : "%";


  /* 요약 카드 */

  document.getElementById(
    "summaryCards"
  ).innerHTML = `

    <div class="summary-card">

      <small>
        0 → 60분 변화
      </small>

      <strong>
        ${increase.toFixed(2)}${unit}
      </strong>

    </div>


    <div class="summary-card">

      <small>
        평균 절대오차 (MAE)
      </small>

      <strong>
        ${mae.toFixed(3)}
      </strong>

    </div>


    <div class="summary-card">

      <small>
        RMSE
      </small>

      <strong>
        ${rmse.toFixed(3)}
      </strong>

    </div>

  `;


  /* 결과 테이블 */

  const body =
    document.getElementById(
      "resultBody"
    );


  body.innerHTML = "";


  results.forEach(result => {

    const row =
      document.createElement(
        "tr"
      );


    row.innerHTML = `

      <td>
        ${result.time}분
      </td>

      <td>
        ${result.actual.toFixed(3)}
      </td>

      <td>
        ${result.sd.toFixed(3)}
      </td>

      <td>
        ${result.predicted.toFixed(3)}
      </td>

      <td>
        ${formatDifference(
          result.difference
        )}
      </td>

      <td>
        ${result.absoluteError.toFixed(3)}
      </td>

    `;


    body.appendChild(row);

  });


  createChart(
    results,
    normalized
  );


  createInterpretation(
    results,
    normalized
  );


  resultSection.scrollIntoView({

    behavior: "smooth"

  });

}


/* ================================
   차이 표시
================================ */

function formatDifference(value) {

  if (value > 0) {

    return (
      "+" +
      value.toFixed(3)
    );

  }

  return value.toFixed(3);

}


/* ================================
   그래프
================================ */

function createChart(
  results,
  normalized
) {

  const ctx =
    document
      .getElementById(
        "resultChart"
      )
      .getContext("2d");


  if (chart) {

    chart.destroy();

  }


  const K =
    Number(
      document.getElementById("K").value
    );

  const r =
    Number(
      document.getElementById("r").value
    );

  const t0 =
    Number(
      document.getElementById("t0").value
    );


  /* 부드러운 모델 곡선 */

  const curveTimes = [];

  const curveValues = [];


  for (
    let t = 0;
    t <= 60;
    t += 1
  ) {

    curveTimes.push(t);

    curveValues.push(
      logistic(
        t,
        K,
        r,
        t0
      )
    );

  }


  let modelCurve =
    curveValues;


  if (normalized) {

    const min =
      Math.min(...curveValues);

    const max =
      Math.max(...curveValues);


    modelCurve =
      curveValues.map(
        value =>
          max === min
            ? 0
            : (value - min)
              / (max - min)
      );

  }


  chart =
    new Chart(
      ctx,
      {

        type: "line",

        data: {

          datasets: [

            {

              label:
                "로지스틱 모델",

              data:
                curveTimes.map(
                  (time, index) => ({
                    x: time,
                    y: modelCurve[index]
                  })
                ),

              borderWidth: 2,

              pointRadius: 0,

              tension: 0.25

            },


            {

              label:
                "실제 측정값",

              data:
                results.map(
                  result => ({
                    x: result.time,
                    y: result.actual
                  })
                ),

              borderWidth: 2,

              pointRadius: 6,

              pointHoverRadius: 8,

              showLine: true

            }

          ]

        },


        options: {

          responsive: true,

          maintainAspectRatio: false,


          interaction: {

            mode: "nearest",

            intersect: false

          },


          plugins: {

            title: {

              display: true,

              text:
                normalized
                  ? "정규화된 효모 부착 패턴과 로지스틱 모델"
                  : "효모 표면 피복률과 로지스틱 모델 비교"

            }

          },


          scales: {

            x: {

              type: "linear",

              min: 0,

              max: 60,

              title: {

                display: true,

                text: "시간 (분)"

              }

            },


            y: {

              beginAtZero: true,

              title: {

                display: true,

                text:
                  normalized
                    ? "정규화 값"
                    : "표면 피복률 (%)"

              }

            }

          }

        }

      }
    );

}


/* ================================
   자동 결과 해석
================================ */

function createInterpretation(
  results,
  normalized
) {

  const first =
    results[0].actual;

  const last =
    results[
      results.length - 1
    ].actual;


  const rmse =
    calculateRMSE(results);


  let trendText;


  if (last > first) {

    trendText =
      "0분에서 60분으로 시간이 증가하면서 측정된 효모 표면 부착 값이 전체적으로 증가했습니다.";

  }

  else if (last < first) {

    trendText =
      "0분과 비교했을 때 60분의 효모 표면 부착 값이 감소했습니다.";

  }

  else {

    trendText =
      "0분과 60분 사이에서 측정된 효모 표면 부착 값의 변화가 나타나지 않았습니다.";

  }


  let modelText;


  if (normalized) {

    modelText =
      `실제 측정값과 로지스틱 모델을 각각 0~1 범위로 정규화하여 증가 패턴을 비교했습니다. 세 측정 시점에서 계산된 RMSE는 ${rmse.toFixed(3)}입니다.`;

  }

  else {

    modelText =
      `실제 피복률과 모델 예측값을 직접 비교했으며, 세 측정 시점에서 계산된 RMSE는 ${rmse.toFixed(3)}입니다.`;

  }


  const cautionText =
    "다만 이 결과만으로 로지스틱 모델이 초기 효모 부착 과정을 정확하게 설명한다고 결론 내릴 수는 없습니다. 초기 표면 부착과 장기간 바이오필름 성장 과정은 서로 다른 생물학적 과정을 포함할 수 있으며, 표면 재질, 효모 농도, 세척 방법, 촬영 조건 및 ImageJ threshold 설정도 측정값에 영향을 줄 수 있습니다.";


  document.getElementById(
    "interpretationText"
  ).innerHTML = `

    <p>
      ${trendText}
    </p>

    <p>
      ${modelText}
    </p>

    <p>
      ${cautionText}
    </p>

  `;

}


/* ================================
   CSV 다운로드
================================ */

function downloadCSV() {

  if (
    latestResults.length === 0
  ) {

    alert(
      "먼저 데이터를 분석해주세요."
    );

    return;

  }


  let csv =
    "\uFEFF시간(분),평균값,표준편차,모델예측값,차이,절대오차\n";


  latestResults.forEach(
    result => {

      csv +=
        `${result.time},` +
        `${result.actual},` +
        `${result.sd},` +
        `${result.predicted},` +
        `${result.difference},` +
        `${result.absoluteError}\n`;

    }
  );


  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  link.href = url;

  link.download =
    "yeast_attachment_analysis.csv";


  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);


  URL.revokeObjectURL(url);

}


/* ================================
   초기화
================================ */

function resetData() {

  document
    .querySelectorAll(
      "input"
    )
    .forEach(
      input => {

        if (
          input.type === "checkbox"
        ) {

          input.checked = false;

        }

        else {

          input.value = "";

        }

      }
    );


  latestResults = [];


  if (chart) {

    chart.destroy();

    chart = null;

  }


  document
    .getElementById(
      "resultSection"
    )
    .classList.add(
      "hidden"
    );


  window.scrollTo({

    top: 0,

    behavior: "smooth"

  });

}
