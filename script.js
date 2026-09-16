/* =========================================
   Yeast Attachment Lab
========================================= */

let currentCoverage = null;
let experiments = [];
let chart = null;
let fittedModel = null;

const originalCanvas =
  document.getElementById("originalCanvas");

const processedCanvas =
  document.getElementById("processedCanvas");

const originalCtx =
  originalCanvas.getContext("2d");

const processedCtx =
  processedCanvas.getContext("2d");


/* =========================================
   이미지 업로드
========================================= */

document
  .getElementById("imageInput")
  .addEventListener(
    "change",
    handleImageUpload
  );


function handleImageUpload(event) {

  const file =
    event.target.files[0];

  if (!file) return;


  const reader =
    new FileReader();


  reader.onload =
    function(e) {

      const img =
        new Image();


      img.onload =
        function() {

          const MAX_WIDTH = 900;

          let width = img.width;
          let height = img.height;


          if (width > MAX_WIDTH) {

            height =
              height *
              (MAX_WIDTH / width);

            width =
              MAX_WIDTH;

          }


          width =
            Math.round(width);

          height =
            Math.round(height);


          originalCanvas.width =
            width;

          originalCanvas.height =
            height;


          processedCanvas.width =
            width;

          processedCanvas.height =
            height;


          originalCtx.drawImage(
            img,
            0,
            0,
            width,
            height
          );


          document
            .getElementById("imageArea")
            .classList.remove("hidden");


          document
            .getElementById("thresholdArea")
            .classList.remove("hidden");


          document
            .getElementById("coverageResult")
            .classList.remove("hidden");


          analyzeImage();

        };


      img.src = e.target.result;

    };


  reader.readAsDataURL(file);

}


/* =========================================
   Threshold 변경
========================================= */

document
  .getElementById("threshold")
  .addEventListener(
    "input",
    function() {

      document
        .getElementById("thresholdValue")
        .textContent =
        this.value;


      analyzeImage();

    }
  );


document
  .getElementById("invertThreshold")
  .addEventListener(
    "change",
    analyzeImage
  );


/* =========================================
   이미지 분석
========================================= */

function analyzeImage() {

  if (
    originalCanvas.width === 0 ||
    originalCanvas.height === 0
  ) {
    return;
  }


  const threshold =
    Number(
      document
        .getElementById("threshold")
        .value
    );


  const invert =
    document
      .getElementById("invertThreshold")
      .checked;


  const imageData =
    originalCtx.getImageData(
      0,
      0,
      originalCanvas.width,
      originalCanvas.height
    );


  const output =
    processedCtx.createImageData(
      imageData.width,
      imageData.height
    );


  const pixels =
    imageData.data;

  const result =
    output.data;


  let attachedPixels = 0;

  const totalPixels =
    imageData.width *
    imageData.height;


  for (
    let i = 0;
    i < pixels.length;
    i += 4
  ) {

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];


    /*
       인간의 밝기 인식에 가까운
       luminance 계산
    */

    const gray =
      0.299 * r +
      0.587 * g +
      0.114 * b;


    let attached;


    if (invert) {

      attached =
        gray >= threshold;

    }

    else {

      attached =
        gray <= threshold;

    }


    if (attached) {

      attachedPixels++;

      result[i] = 255;
      result[i + 1] = 255;
      result[i + 2] = 255;

    }

    else {

      result[i] = 0;
      result[i + 1] = 0;
      result[i + 2] = 0;

    }


    result[i + 3] = 255;

  }


  processedCtx.putImageData(
    output,
    0,
    0
  );


  currentCoverage =
    (
      attachedPixels /
      totalPixels
    ) * 100;


  document
    .getElementById("coverageValue")
    .textContent =
    currentCoverage.toFixed(2) + "%";


  document
    .getElementById("pixelInfo")
    .textContent =
    `${attachedPixels.toLocaleString()} / ` +
    `${totalPixels.toLocaleString()} pixels`;

}


/* =========================================
   실험 데이터 추가
========================================= */

function addExperiment() {

  if (currentCoverage === null) {

    alert(
      "먼저 현미경 사진을 업로드해주세요."
    );

    return;

  }


  const time =
    Number(
      document
        .getElementById("timeInput")
        .value
    );


  const coefficient =
    Number(
      document
        .getElementById(
          "concentrationCoefficient"
        )
        .value
    );


  const exponent =
    Number(
      document
        .getElementById(
          "concentrationExponent"
        )
        .value
    );


  if (
    !Number.isFinite(time) ||
    time < 0
  ) {

    alert(
      "올바른 접촉 시간을 입력해주세요."
    );

    return;

  }


  if (
    !Number.isFinite(coefficient) ||
    coefficient <= 0 ||
    !Number.isFinite(exponent)
  ) {

    alert(
      "올바른 효모 농도를 입력해주세요."
    );

    return;

  }


  const concentration =
    coefficient *
    Math.pow(
      10,
      exponent
    );


  experiments.push({

    id: Date.now(),

    time,

    concentration,

    coefficient,

    exponent,

    coverage:
      currentCoverage

  });


  saveExperiments();

  renderRawData();

}


/* =========================================
   데이터 표시
========================================= */

function renderRawData() {

  const body =
    document.getElementById(
      "rawDataBody"
    );


  body.innerHTML = "";


  if (
    experiments.length === 0
  ) {

    body.innerHTML = `

      <tr class="empty-row">

        <td colspan="5">

          아직 등록된 실험 데이터가 없습니다.

        </td>

      </tr>

    `;

    return;

  }


  experiments.forEach(
    (experiment, index) => {

      const row =
        document.createElement("tr");


      row.innerHTML = `

        <td>
          ${index + 1}
        </td>

        <td>
          ${experiment.time}분
        </td>

        <td>
          ${formatConcentration(
            experiment.concentration
          )}
        </td>

        <td>
          ${experiment.coverage.toFixed(2)}%
        </td>

        <td>

          <button
            class="delete-button"
            onclick="deleteExperiment(${experiment.id})"
          >
            삭제
          </button>

        </td>

      `;


      body.appendChild(row);

    }
  );

}


/* =========================================
   농도 표시
========================================= */

function formatConcentration(value) {

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {

    return "-";

  }


  const exponent =
    Math.floor(
      Math.log10(value)
    );


  const coefficient =
    value /
    Math.pow(
      10,
      exponent
    );


  return (
    coefficient.toFixed(2) +
    " × 10^" +
    exponent +
    " cells/mL"
  );

}


/* =========================================
   데이터 삭제
========================================= */

function deleteExperiment(id) {

  experiments =
    experiments.filter(
      experiment =>
        experiment.id !== id
    );


  saveExperiments();

  renderRawData();

}


function clearExperiments() {

  if (
    experiments.length === 0
  ) {
    return;
  }


  const confirmed =
    confirm(
      "등록된 실험 데이터를 모두 삭제할까요?"
    );


  if (!confirmed) return;


  experiments = [];

  fittedModel = null;


  saveExperiments();

  renderRawData();


  document
    .getElementById("analysisResult")
    .classList.add("hidden");


  document
    .getElementById("predictionResult")
    .classList.add("hidden");


  if (chart) {

    chart.destroy();

    chart = null;

  }

}


/* =========================================
   LocalStorage
========================================= */

function saveExperiments() {

  localStorage.setItem(
    "yeastAttachmentExperiments",
    JSON.stringify(experiments)
  );

}


function loadExperiments() {

  try {

    const saved =
      localStorage.getItem(
        "yeastAttachmentExperiments"
      );


    if (saved) {

      experiments =
        JSON.parse(saved);

    }

  }

  catch (error) {

    experiments = [];

  }


  renderRawData();

}


/* =========================================
   평균
========================================= */

function mean(values) {

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    )
    / values.length
  );

}


/* =========================================
   표본 표준편차
========================================= */

function standardDeviation(values) {

  if (
    values.length < 2
  ) {
    return 0;
  }


  const avg =
    mean(values);


  const variance =
    values.reduce(
      (sum, value) =>
        sum +
        Math.pow(
          value - avg,
          2
        ),
      0
    )
    /
    (values.length - 1);


  return Math.sqrt(
    variance
  );

}


/* =========================================
   시간 + 농도별 그룹화
========================================= */

function createGroups() {

  const map =
    new Map();


  experiments.forEach(
    experiment => {

      const key =
        `${experiment.concentration}|${experiment.time}`;


      if (!map.has(key)) {

        map.set(
          key,
          {
            concentration:
              experiment.concentration,

            time:
              experiment.time,

            values: []
          }
        );

      }


      map
        .get(key)
        .values
        .push(
          experiment.coverage
        );

    }
  );


  return Array
    .from(map.values())
    .map(
      group => ({

        concentration:
          group.concentration,

        time:
          group.time,

        n:
          group.values.length,

        average:
          mean(group.values),

        sd:
          standardDeviation(
            group.values
          )

      })
    )
    .sort(
      (a, b) => {

        if (
          a.concentration !==
          b.concentration
        ) {

          return (
            a.concentration -
            b.concentration
          );

        }


        return (
          a.time -
          b.time
        );

      }
    );

}


/* =========================================
   분석
========================================= */

function analyzeExperiments() {

  if (
    experiments.length < 3
  ) {

    alert(
      "분석을 위해 최소 3개의 실험 데이터를 등록해주세요."
    );

    return;

  }


  const groups =
    createGroups();


  renderAverageTable(
    groups
  );


  createExperimentChart(
    groups
  );


  fittedModel =
    fitRegressionModel(
      groups
    );


  renderModelDescription(
    fittedModel
  );


  document
    .getElementById(
      "analysisResult"
    )
    .classList.remove(
      "hidden"
    );

}


/* =========================================
   평균 테이블
========================================= */

function renderAverageTable(groups) {

  const body =
    document.getElementById(
      "averageBody"
    );


  body.innerHTML = "";


  groups.forEach(
    group => {

      const row =
        document.createElement(
          "tr"
        );


      row.innerHTML = `

        <td>
          ${formatConcentration(
            group.concentration
          )}
        </td>

        <td>
          ${group.time}분
        </td>

        <td>
          ${group.n}
        </td>

        <td>
          ${group.average.toFixed(2)}%
        </td>

        <td>
          ${group.sd.toFixed(2)}
        </td>

      `;


      body.appendChild(row);

    }
  );

}


/* =========================================
   그래프
========================================= */

function createExperimentChart(groups) {

  const concentrations =
    [
      ...new Set(
        groups.map(
          group =>
            group.concentration
        )
      )
    ];


  const datasets =
    concentrations.map(
      concentration => {

        const data =
          groups
            .filter(
              group =>
                group.concentration ===
                concentration
            )
            .map(
              group => ({

                x:
                  group.time,

                y:
                  group.average

              })
            );


        return {

          label:
            formatConcentration(
              concentration
            ),

          data,

          borderWidth: 2,

          pointRadius: 5,

          tension: 0.25,

          fill: false

        };

      }
    );


  if (chart) {

    chart.destroy();

  }


  chart =
    new Chart(
      document
        .getElementById(
          "experimentChart"
        ),
      {

        type: "line",

        data: {
          datasets
        },


        options: {

          responsive: true,

          maintainAspectRatio: false,


          plugins: {

            title: {

              display: true,

              text:
                "시간 및 효모 농도에 따른 평균 표면 부착률"

            }

          },


          scales: {

            x: {

              type: "linear",

              title: {

                display: true,

                text:
                  "접촉 시간 (분)"

              }

            },


            y: {

              beginAtZero: true,

              suggestedMax: 100,

              title: {

                display: true,

                text:
                  "표면 부착률 (%)"

              }

            }

          }

        }

      }
    );

}


/* =========================================
   다중 선형 회귀

   coverage =
   b0 +
   b1 * time +
   b2 * log10(concentration) +
   b3 * time * log10(concentration)

   단순히 농도에 비례한다고 가정하지 않고
   시간-농도 상호작용을 포함한다.
========================================= */

function fitRegressionModel(groups) {

  if (
    groups.length < 4
  ) {

    return null;

  }


  const X = [];

  const Y = [];


  groups.forEach(
    group => {

      const logC =
        Math.log10(
          group.concentration
        );


      X.push([

        1,

        group.time,

        logC,

        group.time * logC

      ]);


      Y.push(
        group.average
      );

    }
  );


  try {

    const Xt =
      transpose(X);


    const XtX =
      multiplyMatrices(
        Xt,
        X
      );


    /*
       아주 작은 ridge 값을 추가해
       특이행렬 문제를 완화한다.
    */

    const lambda =
      1e-8;


    for (
      let i = 0;
      i < XtX.length;
      i++
    ) {

      XtX[i][i] +=
        lambda;

    }


    const inverse =
      invertMatrix(
        XtX
      );


    if (!inverse) {

      return null;

    }


    const XtY =
      multiplyMatrixVector(
        Xt,
        Y
      );


    const beta =
      multiplyMatrixVector(
        inverse,
        XtY
      );


    return {

      beta,

      minTime:
        Math.min(
          ...groups.map(
            group =>
              group.time
          )
        ),

      maxTime:
        Math.max(
          ...groups.map(
            group =>
              group.time
          )
        ),

      minConcentration:
        Math.min(
          ...groups.map(
            group =>
              group.concentration
          )
        ),

      maxConcentration:
        Math.max(
          ...groups.map(
            group =>
              group.concentration
          )
        )

    };

  }

  catch (error) {

    return null;

  }

}


/* =========================================
   예측
========================================= */

function predictCoverage() {

  if (!fittedModel) {

    const groups =
      createGroups();


    fittedModel =
      fitRegressionModel(
        groups
      );

  }


  if (!fittedModel) {

    alert(
      "예측 모델을 만들 데이터가 부족합니다. 서로 다른 시간과 농도의 데이터를 더 입력해주세요."
    );

    return;

  }


  const time =
    Number(
      document
        .getElementById(
          "predictionTime"
        )
        .value
    );


  const coefficient =
    Number(
      document
        .getElementById(
          "predictionCoefficient"
        )
        .value
    );


  const exponent =
    Number(
      document
        .getElementById(
          "predictionExponent"
        )
        .value
    );


  if (
    !Number.isFinite(time) ||
    time < 0 ||
    !Number.isFinite(coefficient) ||
    coefficient <= 0 ||
    !Number.isFinite(exponent)
  ) {

    alert(
      "예측 시간과 농도를 올바르게 입력해주세요."
    );

    return;

  }


  const concentration =
    coefficient *
    Math.pow(
      10,
      exponent
    );


  const logC =
    Math.log10(
      concentration
    );


  const beta =
    fittedModel.beta;


  let prediction =

    beta[0] +

    beta[1] * time +

    beta[2] * logC +

    beta[3] *
      time *
      logC;


  /*
     피복률의 물리적 범위
     0 ~ 100%로 제한
  */

  prediction =
    Math.max(
      0,
      Math.min(
        100,
        prediction
      )
    );


  const outsideTime =
    time <
      fittedModel.minTime ||
    time >
      fittedModel.maxTime;


  const outsideConcentration =
    concentration <
      fittedModel.minConcentration ||
    concentration >
      fittedModel.maxConcentration;


  let explanation =
    `입력된 실험 데이터의 시간과 농도, 그리고 두 변수의 상호작용을 이용한 회귀 모델로 계산했습니다.`;


  if (
    outsideTime ||
    outsideConcentration
  ) {

    explanation +=
      " 현재 조건은 실험 데이터 범위를 벗어난 외삽이 포함되어 있으므로 결과의 불확실성이 더 큽니다.";

  }

  else {

    explanation +=
      " 현재 입력 조건은 기존 실험 데이터의 범위 안에 있습니다.";

  }


  document
    .getElementById(
      "predictionValue"
    )
    .textContent =
    prediction.toFixed(2) +
    "%";


  document
    .getElementById(
      "predictionExplanation"
    )
    .textContent =
    explanation;


  document
    .getElementById(
      "predictionResult"
    )
    .classList.remove(
      "hidden"
    );

}


/* =========================================
   모델 설명
========================================= */

function renderModelDescription(model) {

  const element =
    document.getElementById(
      "modelDescription"
    );


  if (!model) {

    element.textContent =
      "현재 데이터만으로는 시간과 농도를 동시에 고려하는 모델을 안정적으로 계산하기 어렵습니다. 서로 다른 시간과 농도 조건의 데이터를 추가해주세요.";

    return;

  }


  const b =
    model.beta;


  element.innerHTML = `

    현재 프로그램은 다음 탐색적 회귀식을 사용합니다.

    <br><br>

    <strong>
      부착률 =
      ${b[0].toFixed(4)}
      ${signed(b[1])} × 시간
      ${signed(b[2])} × log₁₀(농도)
      ${signed(b[3])} × 시간 × log₁₀(농도)
    </strong>

    <br><br>

    마지막 항은 시간과 농도의 상호작용을 나타냅니다.
    따라서 농도의 영향이 모든 시간에서 동일하다고 단순 가정하지 않습니다.

  `;

}


/* =========================================
   부호 표시
========================================= */

function signed(value) {

  if (value >= 0) {

    return (
      "+ " +
      value.toFixed(4)
    );

  }


  return (
    "- " +
    Math.abs(value)
      .toFixed(4)
  );

}


/* =========================================
   CSV
========================================= */

function downloadCSV() {

  if (
    experiments.length === 0
  ) {

    alert(
      "저장할 실험 데이터가 없습니다."
    );

    return;

  }


  let csv =
    "\uFEFF번호,시간(분),농도(cells/mL),표면부착률(%)\n";


  experiments.forEach(
    (experiment, index) => {

      csv +=
        `${index + 1},` +
        `${experiment.time},` +
        `${experiment.concentration},` +
        `${experiment.coverage}\n`;

    }
  );


  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;

  link.download =
    "yeast_attachment_data.csv";


  document
    .body
    .appendChild(
      link
    );


  link.click();


  link.remove();


  URL.revokeObjectURL(
    url
  );

}


/* =========================================
   행렬 계산
========================================= */

function transpose(matrix) {

  return matrix[0].map(
    (_, column) =>
      matrix.map(
        row =>
          row[column]
      )
  );

}


function multiplyMatrices(A, B) {

  return A.map(
    row =>
      B[0].map(
        (_, column) =>
          row.reduce(
            (sum, value, index) =>
              sum +
              value *
              B[index][column],
            0
          )
      )
  );

}


function multiplyMatrixVector(
  matrix,
  vector
) {

  return matrix.map(
    row =>
      row.reduce(
        (sum, value, index) =>
          sum +
          value *
          vector[index],
        0
      )
  );

}


/* =========================================
   Gauss-Jordan 역행렬
========================================= */

function invertMatrix(matrix) {

  const n =
    matrix.length;


  const augmented =
    matrix.map(
      (row, i) => [

        ...row,

        ...Array
          .from(
            { length: n },
            (_, j) =>
              i === j
                ? 1
                : 0
          )

      ]
    );


  for (
    let i = 0;
    i < n;
    i++
  ) {

    let pivotRow =
      i;


    for (
      let r = i + 1;
      r < n;
      r++
    ) {

      if (
        Math.abs(
          augmented[r][i]
        )
        >
        Math.abs(
          augmented[pivotRow][i]
        )
      ) {

        pivotRow = r;

      }

    }


    if (
      Math.abs(
        augmented[pivotRow][i]
      )
      < 1e-12
    ) {

      return null;

    }


    [
      augmented[i],
      augmented[pivotRow]
    ] =
    [
      augmented[pivotRow],
      augmented[i]
    ];


    const pivot =
      augmented[i][i];


    for (
      let j = 0;
      j < 2 * n;
      j++
    ) {

      augmented[i][j] /=
        pivot;

    }


    for (
      let r = 0;
      r < n;
      r++
    ) {

      if (r === i) continue;


      const factor =
        augmented[r][i];


      for (
        let j = 0;
        j < 2 * n;
        j++
      ) {

        augmented[r][j] -=
          factor *
          augmented[i][j];

      }

    }

  }


  return augmented.map(
    row =>
      row.slice(n)
  );

}


/* =========================================
   시작
========================================= */

loadExperiments();
