/* =====================================================
   Yeast Attachment Lab
===================================================== */

let currentCoverage = null;

let experiments = [];

let chart = null;

let fittedModel = null;


/*
배지 ROI 정보
*/

let roiCenterX = null;

let roiCenterY = null;

let originalImageData = null;


const originalCanvas =
  document.getElementById(
    "originalCanvas"
  );


const processedCanvas =
  document.getElementById(
    "processedCanvas"
  );


const originalCtx =
  originalCanvas.getContext(
    "2d"
  );


const processedCtx =
  processedCanvas.getContext(
    "2d"
  );


/* =====================================================
   이미지 업로드
===================================================== */

document
  .getElementById(
    "imageInput"
  )
  .addEventListener(
    "change",
    handleImageUpload
  );


function handleImageUpload(event) {

  const file =
    event.target.files[0];


  if (!file) {

    return;

  }


  const reader =
    new FileReader();


  reader.onload =
    function(e) {

      const img =
        new Image();


      img.onload =
        function() {

          const MAX_WIDTH =
            1000;


          let width =
            img.width;


          let height =
            img.height;


          if (
            width >
            MAX_WIDTH
          ) {

            const ratio =
              MAX_WIDTH /
              width;


            width =
              MAX_WIDTH;


            height =
              height *
              ratio;

          }


          width =
            Math.round(
              width
            );


          height =
            Math.round(
              height
            );


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


          originalImageData =
            originalCtx.getImageData(

              0,

              0,

              width,

              height

            );


          /*
          처음에는 이미지 중심을
          기본 ROI 중심으로 설정
          */

          roiCenterX =
            width / 2;


          roiCenterY =
            height / 2;


          showImageControls();


          analyzeImage();

        };


      img.src =
        e.target.result;

    };


  reader.readAsDataURL(
    file
  );

}


/* =====================================================
   UI 표시
===================================================== */

function showImageControls() {

  document
    .getElementById(
      "imageArea"
    )
    .classList
    .remove(
      "hidden"
    );


  document
    .getElementById(
      "roiArea"
    )
    .classList
    .remove(
      "hidden"
    );


  document
    .getElementById(
      "thresholdArea"
    )
    .classList
    .remove(
      "hidden"
    );


  document
    .getElementById(
      "coverageResult"
    )
    .classList
    .remove(
      "hidden"
    );

}


/* =====================================================
   사진 클릭 → 배지 중심 지정
===================================================== */

originalCanvas
  .addEventListener(
    "click",
    function(event) {

      if (
        !originalImageData
      ) {

        return;

      }


      const rect =
        originalCanvas
          .getBoundingClientRect();


      const scaleX =
        originalCanvas.width /
        rect.width;


      const scaleY =
        originalCanvas.height /
        rect.height;


      roiCenterX =
        (
          event.clientX -
          rect.left
        ) *
        scaleX;


      roiCenterY =
        (
          event.clientY -
          rect.top
        ) *
        scaleY;


      analyzeImage();

    }
  );


/* =====================================================
   Slider events
===================================================== */

document
  .getElementById(
    "radiusSlider"
  )
  .addEventListener(
    "input",
    function() {

      document
        .getElementById(
          "radiusValue"
        )
        .textContent =
        this.value +
        "%";


      analyzeImage();

    }
  );


document
  .getElementById(
    "marginSlider"
  )
  .addEventListener(
    "input",
    function() {

      document
        .getElementById(
          "marginValue"
        )
        .textContent =
        this.value +
        "%";


      analyzeImage();

    }
  );


document
  .getElementById(
    "threshold"
  )
  .addEventListener(
    "input",
    function() {

      document
        .getElementById(
          "thresholdValue"
        )
        .textContent =
        this.value;


      analyzeImage();

    }
  );


document
  .getElementById(
    "invertThreshold"
  )
  .addEventListener(
    "change",
    analyzeImage
  );


/* =====================================================
   이미지 분석
===================================================== */

function analyzeImage() {

  if (
    !originalImageData
  ) {

    return;

  }


  const width =
    originalCanvas.width;


  const height =
    originalCanvas.height;


  /*
  ROI 최대 반지름 기준
  */

  const minDimension =
    Math.min(
      width,
      height
    );


  const radiusPercent =
    Number(
      document
        .getElementById(
          "radiusSlider"
        )
        .value
    );


  const rimMargin =
    Number(
      document
        .getElementById(
          "marginSlider"
        )
        .value
    );


  const outerRadius =

    minDimension *

    (
      radiusPercent /
      100
    );


  /*
  실제 분석 반지름

  예:
  outer radius = 100
  margin = 10%

  → inner radius = 90
  */

  const innerRadius =

    outerRadius *

    (
      1 -
      rimMargin /
      100
    );


  const threshold =
    Number(
      document
        .getElementById(
          "threshold"
        )
        .value
    );


  const brightIsYeast =

    document
      .getElementById(
        "invertThreshold"
      )
      .checked;


  const pixels =
    originalImageData.data;


  const output =
    processedCtx
      .createImageData(

        width,

        height

      );


  const result =
    output.data;


  let attachedPixels =
    0;


  let roiPixels =
    0;


  for (
    let y = 0;
    y < height;
    y++
  ) {

    for (
      let x = 0;
      x < width;
      x++
    ) {

      const index =
        (
          y *
          width +
          x
        ) * 4;


      /*
      중심으로부터 거리
      */

      const dx =
        x -
        roiCenterX;


      const dy =
        y -
        roiCenterY;


      const distance =

        Math.sqrt(

          dx * dx +

          dy * dy

        );


      /*
      실제 분석 영역 내부인가?
      */

      const insideROI =

        distance <=
        innerRadius;


      if (!insideROI) {

        /*
        분석 대상이 아닌 픽셀은
        어두운 회색으로 표시
        */

        result[index] =
          35;

        result[index + 1] =
          35;

        result[index + 2] =
          35;

        result[index + 3] =
          255;


        continue;

      }


      roiPixels++;


      const red =
        pixels[index];


      const green =
        pixels[index + 1];


      const blue =
        pixels[index + 2];


      /*
      밝기 계산
      */

      const brightness =

        0.299 * red +

        0.587 * green +

        0.114 * blue;


      let yeast;


      if (
        brightIsYeast
      ) {

        yeast =

          brightness >=
          threshold;

      }

      else {

        yeast =

          brightness <=
          threshold;

      }


      if (yeast) {

        attachedPixels++;


        /*
        효모 영역 = 흰색
        */

        result[index] =
          255;

        result[index + 1] =
          255;

        result[index + 2] =
          255;

      }

      else {

        /*
        배경 영역 = 검정
        */

        result[index] =
          0;

        result[index + 1] =
          0;

        result[index + 2] =
          0;

      }


      result[index + 3] =
        255;

    }

  }


  processedCtx.putImageData(

    output,

    0,

    0

  );


  if (
    roiPixels >
    0
  ) {

    currentCoverage =

      (
        attachedPixels /
        roiPixels
      ) *
      100;

  }

  else {

    currentCoverage =
      0;

  }


  document
    .getElementById(
      "coverageValue"
    )
    .textContent =

    currentCoverage
      .toFixed(
        2
      ) +
    "%";


  document
    .getElementById(
      "pixelInfo"
    )
    .textContent =

    attachedPixels
      .toLocaleString() +

    " / " +

    roiPixels
      .toLocaleString() +

    " pixels";


  drawROIOverlay(

    outerRadius,

    innerRadius

  );

}


/* =====================================================
   ROI 표시
===================================================== */

function drawROIOverlay(
  outerRadius,
  innerRadius
) {

  /*
  원본 이미지 복원
  */

  originalCtx
    .putImageData(

      originalImageData,

      0,

      0

    );


  originalCtx.save();


  /*
  바깥 배지 경계
  */

  originalCtx.beginPath();


  originalCtx.arc(

    roiCenterX,

    roiCenterY,

    outerRadius,

    0,

    Math.PI * 2

  );


  originalCtx.strokeStyle =
    "#ff5252";


  originalCtx.lineWidth =
    4;


  originalCtx.stroke();


  /*
  실제 분석 영역
  */

  originalCtx.beginPath();


  originalCtx.arc(

    roiCenterX,

    roiCenterY,

    innerRadius,

    0,

    Math.PI * 2

  );


  originalCtx.strokeStyle =
    "#30c7b6";


  originalCtx.lineWidth =
    4;


  originalCtx.stroke();


  /*
  중심점
  */

  originalCtx.beginPath();


  originalCtx.arc(

    roiCenterX,

    roiCenterY,

    6,

    0,

    Math.PI * 2

  );


  originalCtx.fillStyle =
    "#ffcc33";


  originalCtx.fill();


  originalCtx.restore();

}


/* =====================================================
   실험 데이터 추가
===================================================== */

function addExperiment() {

  if (
    currentCoverage ===
    null
  ) {

    alert(
      "먼저 사진을 분석해주세요."
    );

    return;

  }


  const time =

    Number(

      document
        .getElementById(
          "timeInput"
        )
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
    !Number.isFinite(
      time
    ) ||
    time < 0
  ) {

    alert(
      "접촉 시간을 입력해주세요."
    );

    return;

  }


  if (
    !Number.isFinite(
      coefficient
    ) ||
    coefficient <= 0
  ) {

    alert(
      "효모 농도를 입력해주세요."
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

    id:
      Date.now(),

    time,

    concentration,

    coverage:
      currentCoverage

  });


  saveExperiments();


  renderRawData();

}


/* =====================================================
   데이터 표시
===================================================== */

function renderRawData() {

  const body =

    document
      .getElementById(
        "rawDataBody"
      );


  body.innerHTML =
    "";


  if (
    experiments.length ===
    0
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


  experiments
    .forEach(
      (
        experiment,
        index
      ) => {

        const row =

          document
            .createElement(
              "tr"
            );


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


        body
          .appendChild(
            row
          );

      }
    );

}


/* =====================================================
   농도 표시
===================================================== */

function formatConcentration(
  value
) {

  if (
    value <= 0
  ) {

    return "-";

  }


  const exponent =

    Math.floor(

      Math.log10(
        value
      )

    );


  const coefficient =

    value /

    Math.pow(
      10,
      exponent
    );


  return (

    coefficient
      .toFixed(
        2
      ) +

    " × 10^" +

    exponent +

    " cells/mL"

  );

}


/* =====================================================
   삭제
===================================================== */

function deleteExperiment(
  id
) {

  experiments =

    experiments.filter(

      experiment =>
        experiment.id !==
        id

    );


  saveExperiments();


  renderRawData();

}


function clearExperiments() {

  if (
    experiments.length ===
    0
  ) {

    return;

  }


  if (
    !confirm(
      "모든 실험 데이터를 삭제할까요?"
    )
  ) {

    return;

  }


  experiments =
    [];


  fittedModel =
    null;


  saveExperiments();


  renderRawData();


  document
    .getElementById(
      "analysisResult"
    )
    .classList
    .add(
      "hidden"
    );

}


/* =====================================================
   저장
===================================================== */

function saveExperiments() {

  localStorage
    .setItem(

      "yeastAttachmentExperiments",

      JSON.stringify(
        experiments
      )

    );

}


function loadExperiments() {

  try {

    const saved =

      localStorage
        .getItem(
          "yeastAttachmentExperiments"
        );


    if (saved) {

      experiments =
        JSON.parse(
          saved
        );

    }

  }

  catch {

    experiments =
      [];

  }


  renderRawData();

}


/* =====================================================
   평균
===================================================== */

function mean(
  values
) {

  return (

    values.reduce(

      (sum, value) =>
        sum + value,

      0

    ) /

    values.length

  );

}


/* =====================================================
   표준편차
===================================================== */

function standardDeviation(
  values
) {

  if (
    values.length <
    2
  ) {

    return 0;

  }


  const avg =
    mean(
      values
    );


  const variance =

    values.reduce(

      (
        sum,
        value
      ) =>

        sum +

        Math.pow(

          value -
          avg,

          2

        ),

      0

    ) /

    (
      values.length -
      1
    );


  return Math.sqrt(
    variance
  );

}


/* =====================================================
   그룹화
===================================================== */

function createGroups() {

  const map =
    new Map();


  experiments
    .forEach(
      experiment => {

        const key =

          experiment
            .concentration +

          "|" +

          experiment
            .time;


        if (
          !map.has(
            key
          )
        ) {

          map.set(

            key,

            {

              concentration:
                experiment
                  .concentration,

              time:
                experiment
                  .time,

              values:
                []

            }

          );

        }


        map
          .get(
            key
          )
          .values
          .push(
            experiment
              .coverage
          );

      }
    );


  return Array
    .from(
      map.values()
    )
    .map(
      group => ({

        concentration:
          group
            .concentration,

        time:
          group
            .time,

        n:
          group
            .values
            .length,

        average:
          mean(
            group
              .values
          ),

        sd:
          standardDeviation(
            group
              .values
          )

      })
    );

}


/* =====================================================
   분석
===================================================== */

function analyzeExperiments() {

  if (
    experiments.length <
    3
  ) {

    alert(
      "최소 3개의 실험 데이터가 필요합니다."
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
    .classList
    .remove(
      "hidden"
    );

}


/* =====================================================
   평균 테이블
===================================================== */

function renderAverageTable(
  groups
) {

  const body =

    document
      .getElementById(
        "averageBody"
      );


  body.innerHTML =
    "";


  groups.forEach(
    group => {

      const row =

        document
          .createElement(
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


      body
        .appendChild(
          row
        );

    }
  );

}


/* =====================================================
   그래프
===================================================== */

function createExperimentChart(
  groups
) {

  const concentrations =

    [
      ...new Set(

        groups.map(
          g =>
            g.concentration
        )

      )
    ];


  const datasets =

    concentrations.map(
      concentration => {

        const data =

          groups

            .filter(

              g =>
                g.concentration ===
                concentration

            )

            .sort(

              (
                a,
                b
              ) =>

                a.time -
                b.time

            )

            .map(
              g => ({

                x:
                  g.time,

                y:
                  g.average

              })
            );


        return {

          label:
            formatConcentration(
              concentration
            ),

          data,

          borderWidth:
            2,

          pointRadius:
            5,

          tension:
            0.25

        };

      }
    );


  if (
    chart
  ) {

    chart.destroy();

  }


  chart =

    new Chart(

      document
        .getElementById(
          "experimentChart"
        ),

      {

        type:
          "line",

        data: {
          datasets
        },

        options: {

          responsive:
            true,

          maintainAspectRatio:
            false,

          scales: {

            x: {

              type:
                "linear",

              title: {

                display:
                  true,

                text:
                  "시간 (분)"

              }

            },

            y: {

              beginAtZero:
                true,

              suggestedMax:
                100,

              title: {

                display:
                  true,

                text:
                  "표면 부착률 (%)"

              }

            }

          }

        }

      }

    );

}


/* =====================================================
   회귀 모델
===================================================== */

function fitRegressionModel(
  groups
) {

  if (
    groups.length <
    4
  ) {

    return null;

  }


  const X =
    [];


  const Y =
    [];


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

        group.time *
        logC

      ]);


      Y.push(
        group.average
      );

    }
  );


  const Xt =
    transpose(
      X
    );


  const XtX =
    multiplyMatrices(
      Xt,
      X
    );


  for (
    let i = 0;
    i < XtX.length;
    i++
  ) {

    XtX[i][i] +=
      1e-8;

  }


  const inverse =
    invertMatrix(
      XtX
    );


  if (
    !inverse
  ) {

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
          g => g.time
        )
      ),

    maxTime:
      Math.max(
        ...groups.map(
          g => g.time
        )
      ),

    minConcentration:
      Math.min(
        ...groups.map(
          g =>
            g.concentration
        )
      ),

    maxConcentration:
      Math.max(
        ...groups.map(
          g =>
            g.concentration
        )
      )

  };

}


/* =====================================================
   예측
===================================================== */

function predictCoverage() {

  if (
    !fittedModel
  ) {

    fittedModel =
      fitRegressionModel(
        createGroups()
      );

  }


  if (
    !fittedModel
  ) {

    alert(
      "예측을 위한 데이터가 부족합니다."
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


  const b =
    fittedModel.beta;


  let prediction =

    b[0] +

    b[1] *
    time +

    b[2] *
    logC +

    b[3] *
    time *
    logC;


  prediction =

    Math.max(

      0,

      Math.min(
        100,
        prediction
      )

    );


  const outside =

    time <
      fittedModel.minTime ||

    time >
      fittedModel.maxTime ||

    concentration <
      fittedModel.minConcentration ||

    concentration >
      fittedModel.maxConcentration;


  let explanation =

    "시간, 농도 및 두 변수의 상호작용을 이용한 회귀 모델로 계산했습니다.";


  if (
    outside
  ) {

    explanation +=

      " 입력 조건이 기존 실험 범위를 벗어나 있으므로 외삽 예측이며 불확실성이 큽니다.";

  }

  else {

    explanation +=

      " 입력 조건은 기존 실험 데이터 범위 안에 있습니다.";

  }


  document
    .getElementById(
      "predictionValue"
    )
    .textContent =

    prediction
      .toFixed(
        2
      ) +

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
    .classList
    .remove(
      "hidden"
    );

}


/* =====================================================
   모델 설명
===================================================== */

function renderModelDescription(
  model
) {

  const element =

    document
      .getElementById(
        "modelDescription"
      );


  if (
    !model
  ) {

    element.textContent =

      "현재 데이터만으로 안정적인 예측식을 만들기 어렵습니다. 서로 다른 시간과 농도 조건의 데이터를 더 입력해주세요.";


    return;

  }


  const b =
    model.beta;


  element.innerHTML = `

    현재 프로그램은 시간과 농도를 동시에 고려하는 회귀식을 사용합니다.

    <br><br>

    <strong>

      부착률 =
      ${b[0].toFixed(4)}
      ${signed(b[1])} × 시간
      ${signed(b[2])} × log₁₀(농도)
      ${signed(b[3])} × 시간 × log₁₀(농도)

    </strong>

  `;

}


function signed(
  value
) {

  if (
    value >=
    0
  ) {

    return (
      "+ " +
      value.toFixed(
        4
      )
    );

  }


  return (
    "- " +
    Math.abs(
      value
    ).toFixed(
      4
    )
  );

}


/* =====================================================
   CSV
===================================================== */

function downloadCSV() {

  if (
    experiments.length ===
    0
  ) {

    alert(
      "저장할 데이터가 없습니다."
    );

    return;

  }


  let csv =

    "\uFEFF번호,시간(분),농도(cells/mL),표면부착률(%)\n";


  experiments.forEach(

    (
      experiment,
      index
    ) => {

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


  link.click();


  URL.revokeObjectURL(
    url
  );

}


/* =====================================================
   행렬 함수
===================================================== */

function transpose(
  matrix
) {

  return matrix[0].map(

    (_, column) =>

      matrix.map(
        row =>
          row[column]
      )

  );

}


function multiplyMatrices(
  A,
  B
) {

  return A.map(

    row =>

      B[0].map(

        (_, column) =>

          row.reduce(

            (
              sum,
              value,
              index
            ) =>

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

        (
          sum,
          value,
          index
        ) =>

          sum +

          value *
          vector[index],

        0

      )

  );

}


function invertMatrix(
  matrix
) {

  const n =
    matrix.length;


  const augmented =

    matrix.map(

      (
        row,
        i
      ) => [

        ...row,

        ...Array.from(

          {
            length:
              n
          },

          (
            _,
            j
          ) =>

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
      let r =
        i + 1;
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

        pivotRow =
          r;

      }

    }


    if (

      Math.abs(
        augmented[pivotRow][i]
      )

      <
      1e-12

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

      if (
        r === i
      ) {

        continue;

      }


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
      row.slice(
        n
      )

  );

}


/* =====================================================
   시작
===================================================== */

loadExperiments();
