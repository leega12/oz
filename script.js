/* =====================================================
   Yeast Attachment Lab
===================================================== */


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let currentCoverage = null;

let experiments = [];

let chart = null;

let fittedModel = null;


/* ROI */

let roiCenterX = null;
let roiCenterY = null;

let originalImageData = null;

let draggingCenter = false;


/* CANVAS */

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
   IMAGE UPLOAD
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


  if (!file) return;


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
           처음에는 이미지 중앙을
           기본 배지 중심으로 설정
          */

          roiCenterX =
            width / 2;

          roiCenterY =
            height / 2;


          showImageControls();

          updateCenterText();

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
   UI
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
   ROI CENTER SELECTION
===================================================== */

originalCanvas
  .addEventListener(
    "pointerdown",
    function(event) {

      draggingCenter =
        true;


      try {

        originalCanvas
          .setPointerCapture(
            event.pointerId
          );

      }

      catch (error) {}


      updateCenterFromPointer(
        event
      );

    }
  );


originalCanvas
  .addEventListener(
    "pointermove",
    function(event) {

      if (
        !draggingCenter
      ) {
        return;
      }


      updateCenterFromPointer(
        event
      );

    }
  );


originalCanvas
  .addEventListener(
    "pointerup",
    function(event) {

      draggingCenter =
        false;


      try {

        originalCanvas
          .releasePointerCapture(
            event.pointerId
          );

      }

      catch (error) {}

    }
  );


originalCanvas
  .addEventListener(
    "pointercancel",
    function() {

      draggingCenter =
        false;

    }
  );


processedCanvas
  .addEventListener(
    "pointerdown",
    function(event) {

      const position =
        getCanvasPointerPosition(
          processedCanvas,
          event
        );


      roiCenterX =
        position.x;

      roiCenterY =
        position.y;


      updateCenterText();

      analyzeImage();

    }
  );


function updateCenterFromPointer(
  event
) {

  const position =
    getCanvasPointerPosition(
      originalCanvas,
      event
    );


  roiCenterX =
    position.x;

  roiCenterY =
    position.y;


  updateCenterText();

  analyzeImage();

}


function getCanvasPointerPosition(
  canvas,
  event
) {

  const rect =
    canvas
      .getBoundingClientRect();


  const scaleX =
    canvas.width /
    rect.width;


  const scaleY =
    canvas.height /
    rect.height;


  return {

    x:
      Math.max(
        0,
        Math.min(
          canvas.width,
          (
            event.clientX -
            rect.left
          ) *
          scaleX
        )
      ),

    y:
      Math.max(
        0,
        Math.min(
          canvas.height,
          (
            event.clientY -
            rect.top
          ) *
          scaleY
        )
      )

  };

}


function updateCenterText() {

  const element =
    document
      .getElementById(
        "centerPosition"
      );


  if (
    !element ||
    roiCenterX === null ||
    roiCenterY === null
  ) {

    return;

  }


  element.textContent =

    `X ${Math.round(roiCenterX)}, ` +
    `Y ${Math.round(roiCenterY)}`;

}


/* =====================================================
   CONTROL EVENTS
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


document
  .getElementById(
    "removeBoundary"
  )
  .addEventListener(
    "change",
    analyzeImage
  );


/* =====================================================
   IMAGE ANALYSIS
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


  const radiusPercent =
    Number(
      document
        .getElementById(
          "radiusSlider"
        )
        .value
    );


  const marginPercent =
    Number(
      document
        .getElementById(
          "marginSlider"
        )
        .value
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


  const removeBoundary =
    document
      .getElementById(
        "removeBoundary"
      )
      .checked;


  /*
   전체 배지 반지름
  */

  const outerRadius =

    Math.min(
      width,
      height
    ) *

    radiusPercent /
    100;


  /*
   실제 분석 반지름
  */

  const analysisRadius =

    outerRadius *

    (
      1 -
      marginPercent /
      100
    );


  const source =
    originalImageData.data;


  /*
   mask 값

   0 = 배경
   1 = 효모 후보
   2 = ROI 밖
  */

  const mask =
    new Uint8Array(
      width *
      height
    );


  let roiPixels =
    0;


  /* =========================================
     STEP 1
     Threshold
  ========================================= */

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

      const pixelIndex =
        y *
        width +
        x;


      const sourceIndex =
        pixelIndex *
        4;


      const dx =
        x -
        roiCenterX;


      const dy =
        y -
        roiCenterY;


      const distanceSquared =
        dx *
        dx +
        dy *
        dy;


      if (
        distanceSquared >
        analysisRadius *
        analysisRadius
      ) {

        mask[pixelIndex] =
          2;


        continue;

      }


      roiPixels++;


      const red =
        source[
          sourceIndex
        ];


      const green =
        source[
          sourceIndex +
          1
        ];


      const blue =
        source[
          sourceIndex +
          2
        ];


      /*
       RGB 밝기 계산
      */

      const brightness =

        0.299 *
        red +

        0.587 *
        green +

        0.114 *
        blue;


      const yeastCandidate =

        brightIsYeast

          ?

          brightness >=
          threshold

          :

          brightness <=
          threshold;


      mask[pixelIndex] =

        yeastCandidate
          ?
          1
          :
          0;

    }

  }


  /* =========================================
     STEP 2
     분석 원의 가장자리에 연결된
     흰 구조 제거
  ========================================= */

  if (
    removeBoundary
  ) {

    removeBoundaryConnectedComponents(

      mask,

      width,

      height,

      analysisRadius

    );

  }


  /* =========================================
     STEP 3
     RESULT IMAGE
  ========================================= */

  const output =
    processedCtx
      .createImageData(
        width,
        height
      );


  const outputPixels =
    output.data;


  let attachedPixels =
    0;


  for (
    let i = 0;
    i < mask.length;
    i++
  ) {

    const outputIndex =
      i *
      4;


    if (
      mask[i] ===
      2
    ) {

      /*
       ROI 밖
      */

      outputPixels[
        outputIndex
      ] =
        25;


      outputPixels[
        outputIndex +
        1
      ] =
        28;


      outputPixels[
        outputIndex +
        2
      ] =
        32;

    }

    else if (
      mask[i] ===
      1
    ) {

      /*
       효모
      */

      attachedPixels++;


      outputPixels[
        outputIndex
      ] =
        255;


      outputPixels[
        outputIndex +
        1
      ] =
        255;


      outputPixels[
        outputIndex +
        2
      ] =
        255;

    }

    else {

      /*
       배경
      */

      outputPixels[
        outputIndex
      ] =
        0;


      outputPixels[
        outputIndex +
        1
      ] =
        0;


      outputPixels[
        outputIndex +
        2
      ] =
        0;

    }


    outputPixels[
      outputIndex +
      3
    ] =
      255;

  }


  processedCtx
    .putImageData(
      output,
      0,
      0
    );


  currentCoverage =

    roiPixels >
    0

      ?

      (
        attachedPixels /
        roiPixels
      ) *
      100

      :

      0;


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

    `${attachedPixels.toLocaleString()} / ` +

    `${roiPixels.toLocaleString()} pixels`;


  drawROIOverlay(
    outerRadius,
    analysisRadius
  );

}


/* =====================================================
   REMOVE BOUNDARY CONNECTED COMPONENTS
===================================================== */

function removeBoundaryConnectedComponents(
  mask,
  width,
  height,
  radius
) {

  const total =
    width *
    height;


  const visited =
    new Uint8Array(
      total
    );


  const queue =
    new Int32Array(
      total
    );


  let queueStart =
    0;


  let queueEnd =
    0;


  /*
   분석 원의 경계 몇 픽셀 안쪽
   */

  const boundaryThickness =

    Math.max(

      4,

      radius *
      0.035

    );


  const minimumRadius =

    Math.max(

      0,

      radius -
      boundaryThickness

    );


  const minRadiusSquared =

    minimumRadius *
    minimumRadius;


  const maxRadiusSquared =

    radius *
    radius;


  const minX =

    Math.max(

      0,

      Math.floor(

        roiCenterX -
        radius

      )

    );


  const maxX =

    Math.min(

      width -
      1,

      Math.ceil(

        roiCenterX +
        radius

      )

    );


  const minY =

    Math.max(

      0,

      Math.floor(

        roiCenterY -
        radius

      )

    );


  const maxY =

    Math.min(

      height -
      1,

      Math.ceil(

        roiCenterY +
        radius

      )

    );


  /*
   경계 부분에서 효모 후보인 픽셀을
   BFS 시작점으로 등록
  */

  for (
    let y = minY;
    y <= maxY;
    y++
  ) {

    for (
      let x = minX;
      x <= maxX;
      x++
    ) {

      const dx =
        x -
        roiCenterX;


      const dy =
        y -
        roiCenterY;


      const distanceSquared =

        dx *
        dx +

        dy *
        dy;


      if (
        distanceSquared <
        minRadiusSquared ||
        distanceSquared >
        maxRadiusSquared
      ) {

        continue;

      }


      const index =
        y *
        width +
        x;


      if (
        mask[index] ===
        1 &&
        !visited[index]
      ) {

        visited[index] =
          1;


        queue[
          queueEnd++
        ] =
          index;

      }

    }

  }


  const directions = [

    [-1, 0],
    [1, 0],

    [0, -1],
    [0, 1],

    [-1, -1],
    [1, -1],

    [-1, 1],
    [1, 1]

  ];


  while (
    queueStart <
    queueEnd
  ) {

    const index =
      queue[
        queueStart++
      ];


    /*
     경계에 연결된 흰 영역 제거
    */

    mask[index] =
      0;


    const x =
      index %
      width;


    const y =
      Math.floor(
        index /
        width
      );


    for (
      const [
        dx,
        dy
      ]
      of directions
    ) {

      const nx =
        x +
        dx;


      const ny =
        y +
        dy;


      if (
        nx <
        0 ||
        nx >=
        width ||
        ny <
        0 ||
        ny >=
        height
      ) {

        continue;

      }


      const next =

        ny *
        width +

        nx;


      if (
        mask[next] ===
        1 &&
        !visited[next]
      ) {

        visited[next] =
          1;


        queue[
          queueEnd++
        ] =
          next;

      }

    }

  }

}


/* =====================================================
   DRAW ROI OVERLAY
===================================================== */

function drawROIOverlay(
  outerRadius,
  analysisRadius
) {

  if (
    !originalImageData
  ) {

    return;

  }


  originalCtx
    .putImageData(
      originalImageData,
      0,
      0
    );


  originalCtx.save();


  /*
   배지 외곽
  */

  originalCtx
    .beginPath();


  originalCtx
    .arc(
      roiCenterX,
      roiCenterY,
      outerRadius,
      0,
      Math.PI *
      2
    );


  originalCtx.strokeStyle =
    "#ff4d5d";


  originalCtx.lineWidth =
    Math.max(
      3,
      originalCanvas.width /
      250
    );


  originalCtx.stroke();


  /*
   분석 영역
  */

  originalCtx
    .beginPath();


  originalCtx
    .arc(
      roiCenterX,
      roiCenterY,
      analysisRadius,
      0,
      Math.PI *
      2
    );


  originalCtx.strokeStyle =
    "#1be0c1";


  originalCtx.lineWidth =
    Math.max(
      3,
      originalCanvas.width /
      250
    );


  originalCtx.stroke();


  /*
   중심 십자
  */

  const crossSize =

    Math.max(

      10,

      originalCanvas.width /
      60

    );


  originalCtx.strokeStyle =
    "#ffd632";


  originalCtx.lineWidth =
    3;


  originalCtx
    .beginPath();


  originalCtx
    .moveTo(
      roiCenterX -
      crossSize,
      roiCenterY
    );


  originalCtx
    .lineTo(
      roiCenterX +
      crossSize,
      roiCenterY
    );


  originalCtx
    .moveTo(
      roiCenterX,
      roiCenterY -
      crossSize
    );


  originalCtx
    .lineTo(
      roiCenterX,
      roiCenterY +
      crossSize
    );


  originalCtx.stroke();


  /*
   중심점
  */

  originalCtx
    .beginPath();


  originalCtx
    .arc(
      roiCenterX,
      roiCenterY,
      6,
      0,
      Math.PI *
      2
    );


  originalCtx.fillStyle =
    "#ffd632";


  originalCtx.fill();


  originalCtx.restore();

}


/* =====================================================
   EXPERIMENT ADD
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
    time <
    0
  ) {

    alert(
      "접촉 시간을 올바르게 입력해주세요."
    );

    return;

  }


  if (
    !Number.isFinite(
      coefficient
    ) ||
    coefficient <=
    0 ||
    !Number.isFinite(
      exponent
    )
  ) {

    alert(
      "효모 농도를 올바르게 입력해주세요."
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
      Date.now() +
      Math.random(),

    time,

    concentration,

    coverage:
      currentCoverage

  });


  saveExperiments();

  renderRawData();

}


/* =====================================================
   RAW DATA
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


  experiments.forEach(

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
   CONCENTRATION FORMAT
===================================================== */

function formatConcentration(
  value
) {

  if (
    !Number.isFinite(
      value
    ) ||
    value <=
    0
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
   DELETE
===================================================== */

function deleteExperiment(
  id
) {

  experiments =

    experiments
      .filter(
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


  const confirmed =

    confirm(
      "모든 실험 데이터를 삭제할까요?"
    );


  if (
    !confirmed
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


  document
    .getElementById(
      "predictionResult"
    )
    .classList
    .add(
      "hidden"
    );


  if (
    chart
  ) {

    chart.destroy();

    chart =
      null;

  }

}


/* =====================================================
   LOCAL STORAGE
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


    if (
      saved
    ) {

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
   STATISTICS
===================================================== */

function mean(
  values
) {

  return (

    values
      .reduce(

        (
          sum,
          value
        ) =>

          sum +
          value,

        0

      )

    /

    values.length

  );

}


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

    )

    /

    (
      values.length -
      1
    );


  return Math.sqrt(
    variance
  );

}


/* =====================================================
   GROUPS
===================================================== */

function createGroups() {

  const map =
    new Map();


  experiments
    .forEach(
      experiment => {

        const key =

          `${experiment.concentration}|${experiment.time}`;


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
    )
    .sort(

      (
        a,
        b
      ) => {

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


/* =====================================================
   ANALYZE
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
   AVERAGE TABLE
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


  groups
    .forEach(
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
   CHART
===================================================== */

function createExperimentChart(
  groups
) {

  const concentrations =

    [
      ...new Set(

        groups
          .map(
            group =>
              group.concentration
          )

      )
    ];


  const datasets =

    concentrations
      .map(
        concentration => {

          const data =

            groups

              .filter(
                group =>
                  group.concentration ===
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

            borderWidth:
              2,

            pointRadius:
              5,

            pointHoverRadius:
              7,

            tension:
              0.25,

            fill:
              false

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

          plugins: {

            title: {

              display:
                true,

              text:
                "시간 및 효모 농도에 따른 평균 표면 부착률"

            }

          },

          scales: {

            x: {

              type:
                "linear",

              title: {

                display:
                  true,

                text:
                  "접촉 시간 (분)"

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
   REGRESSION
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


  groups
    .forEach(
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


  try {

    const Xt =
      transpose(
        X
      );


    const XtX =
      multiplyMatrices(
        Xt,
        X
      );


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
          ...groups
            .map(
              group =>
                group.time
            )
        ),

      maxTime:
        Math.max(
          ...groups
            .map(
              group =>
                group.time
            )
        ),

      minConcentration:
        Math.min(
          ...groups
            .map(
              group =>
                group.concentration
            )
        ),

      maxConcentration:
        Math.max(
          ...groups
            .map(
              group =>
                group.concentration
            )
        )

    };

  }

  catch {

    return null;

  }

}


/* =====================================================
   PREDICTION
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
      "예측을 위한 데이터가 부족합니다. 서로 다른 시간과 농도 조건의 데이터를 더 입력해주세요."
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
    !Number.isFinite(
      time
    ) ||
    time <
    0 ||
    !Number.isFinite(
      coefficient
    ) ||
    coefficient <=
    0 ||
    !Number.isFinite(
      exponent
    )
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

      " 입력 조건이 기존 실험 데이터 범위를 벗어난 외삽 예측이므로 불확실성이 큽니다.";

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
   MODEL DESCRIPTION
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

      "현재 데이터만으로는 안정적인 예측식을 만들기 어렵습니다. 서로 다른 시간과 농도 조건의 데이터를 더 입력해주세요.";


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

    <br><br>

    마지막 항은 시간과 농도의 상호작용을 의미합니다.

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
      value
        .toFixed(
          4
        )
    );

  }


  return (
    "- " +
    Math.abs(
      value
    )
      .toFixed(
        4
      )
  );

}


/* =====================================================
   CSV DOWNLOAD
===================================================== */

function downloadCSV() {

  if (
    experiments.length ===
    0
  ) {

    alert(
      "저장할 실험 데이터가 없습니다."
    );

    return;

  }


  let csv =

    "\uFEFF번호,시간(분),농도(cells/mL),표면부착률(%)\n";


  experiments
    .forEach(
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

    document
      .createElement(
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


  URL
    .revokeObjectURL(
      url
    );

}


/* =====================================================
   MATRIX FUNCTIONS
===================================================== */

function transpose(
  matrix
) {

  return matrix[0]
    .map(

      (
        _,
        column
      ) =>

        matrix
          .map(
            row =>
              row[column]
          )

    );

}


function multiplyMatrices(
  A,
  B
) {

  return A
    .map(

      row =>

        B[0]
          .map(

            (
              _,
              column
            ) =>

              row
                .reduce(

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

  return matrix
    .map(

      row =>

        row
          .reduce(

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

    matrix
      .map(

        (
          row,
          i
        ) => [

          ...row,

          ...Array
            .from(

              {
                length:
                  n
              },

              (
                _,
                j
              ) =>

                i ===
                j

                  ?
                  1

                  :
                  0

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


  return augmented
    .map(

      row =>
        row
          .slice(
            n
          )

    );

}


/* =====================================================
   START
===================================================== */

loadExperiments();
