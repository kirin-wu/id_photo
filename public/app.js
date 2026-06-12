const cameraVideo = document.getElementById("cameraVideo");
const capturePreview = document.getElementById("capturePreview");
const editorPanel = document.getElementById("editorPanel");
const editorStage = document.getElementById("editorStage");
const editorImage = document.getElementById("editorImage");
const statusText = document.getElementById("statusText");
const resultCanvas = document.getElementById("resultCanvas");
const workCanvas = document.getElementById("workCanvas");
const zoomRange = document.getElementById("zoomRange");
const downloadBtn = document.getElementById("downloadBtn");
const fileInput = document.getElementById("fileInput");
const albumInput = document.getElementById("albumInput");
const pickPhotoBtn = document.getElementById("pickPhotoBtn");
const choosePhotoBtn = document.getElementById("choosePhotoBtn");
const generateBtn = document.getElementById("generateBtn");
const generateStandardBtn = document.getElementById("generateStandardBtn");

const HIGH_RES_SIZE = { width: 600, height: 840, label: "高清版 600x840" };
const STANDARD_SIZE = { width: 295, height: 413, label: "标准版 295x413" };

const state = {
  stream: null,
  sourceImage: null,
  sourceWidth: 0,
  sourceHeight: 0,
  bg: "#ffffff",
  baseScale: 1,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  startOffsetX: 0,
  startOffsetY: 0,
  resultReady: false,
};

function setStatus(text) {
  statusText.textContent = text;
}

function stopStream() {
  if (state.stream) {
    for (const track of state.stream.getTracks()) track.stop();
    state.stream = null;
  }
  cameraVideo.srcObject = null;
}

async function startCamera() {
  try {
    stopStream();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    state.stream = stream;
    cameraVideo.hidden = false;
    capturePreview.hidden = true;
    cameraVideo.srcObject = stream;
    setStatus("相机已打开，调整好后点“拍照”。");
  } catch (error) {
    console.warn(error);
    setStatus("相机不可用，直接点“手机拍照”也能继续。");
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openEditor(src) {
  const img = new Image();
  img.onload = () => {
    state.sourceImage = img;
    state.sourceWidth = img.naturalWidth;
    state.sourceHeight = img.naturalHeight;
    editorImage.src = src;
    editorPanel.hidden = false;
    resultCanvas.getContext("2d").clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    downloadBtn.disabled = true;
    requestAnimationFrame(fitImage);
    editorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus("照片已载入，拖动和缩放后生成。");
  };
  img.onerror = () => {
    setStatus("照片读取失败，请重新拍一张，或从相册选择。");
  };
  img.src = src;
}

function fitImage() {
  if (!state.sourceImage) return;
  const rect = editorStage.getBoundingClientRect();
  const cover = Math.max(rect.width / state.sourceWidth, rect.height / state.sourceHeight);
  state.baseScale = cover;
  state.scale = cover;
  state.offsetX = 0;
  state.offsetY = 0;
  zoomRange.min = cover;
  zoomRange.max = cover * 2.6;
  zoomRange.value = cover;
  renderEditor();
}

function renderEditor() {
  if (!state.sourceImage) return;
  const rect = editorStage.getBoundingClientRect();
  const displayScale = state.scale;
  const w = state.sourceWidth * displayScale;
  const h = state.sourceHeight * displayScale;
  const left = rect.width / 2 - w / 2 + state.offsetX;
  const top = rect.height / 2 - h / 2 + state.offsetY;

  editorImage.style.width = `${state.sourceWidth}px`;
  editorImage.style.height = `${state.sourceHeight}px`;
  editorImage.style.left = `${left}px`;
  editorImage.style.top = `${top}px`;
  editorImage.style.transform = `scale(${displayScale})`;
  editorImage.style.transformOrigin = "top left";
  editorImage.hidden = false;
}

function updateResult(size = HIGH_RES_SIZE) {
  if (!state.sourceImage) return;
  resultCanvas.width = size.width;
  resultCanvas.height = size.height;
  const outW = resultCanvas.width;
  const outH = resultCanvas.height;
  const ctx = resultCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = state.bg;
  ctx.fillRect(0, 0, outW, outH);

  const scaleX = outW / editorStage.clientWidth;
  const scaleY = outH / editorStage.clientHeight;
  const drawW = state.sourceWidth * state.scale * scaleX;
  const drawH = state.sourceHeight * state.scale * scaleY;
  const drawX = outW / 2 - drawW / 2 + state.offsetX * scaleX;
  const drawY = outH / 2 - drawH / 2 + state.offsetY * scaleY;

  ctx.drawImage(state.sourceImage, drawX, drawY, drawW, drawH);
  downloadBtn.disabled = false;
  state.resultReady = true;
  state.resultSize = size;
}

function captureVideoFrame() {
  if (!cameraVideo.videoWidth) {
    setStatus("相机还没准备好，再等一秒。");
    return;
  }
  const canvas = workCanvas.getContext("2d");
  workCanvas.width = cameraVideo.videoWidth;
  workCanvas.height = cameraVideo.videoHeight;
  canvas.drawImage(cameraVideo, 0, 0);
  const src = workCanvas.toDataURL("image/jpeg", 0.95);
  stopStream();
  capturePreview.src = src;
  capturePreview.hidden = false;
  cameraVideo.hidden = true;
  openEditor(src);
}

document.getElementById("startCamera").addEventListener("click", startCamera);
document.getElementById("captureBtn").addEventListener("click", captureVideoFrame);
document.getElementById("resetBtn").addEventListener("click", () => {
  stopStream();
  editorPanel.hidden = true;
  capturePreview.hidden = true;
  cameraVideo.hidden = false;
  state.sourceImage = null;
  state.resultReady = false;
  downloadBtn.disabled = true;
  setStatus("先点“打开相机”，或直接用“手机拍照”。");
});

pickPhotoBtn.addEventListener("click", () => {
  fileInput.value = "";
  fileInput.click();
});

async function handlePhotoInput(event) {
  const file = event.target.files?.[0];
  if (!file) {
    setStatus("没有收到照片，请再点一次“手机拍照”。");
    return;
  }
  try {
    setStatus("正在读取照片...");
    const src = await fileToDataURL(file);
    stopStream();
    capturePreview.src = src;
    capturePreview.hidden = false;
    cameraVideo.hidden = true;
    openEditor(src);
  } catch (error) {
    console.warn(error);
    setStatus("照片读取失败，请重新拍一张，或从相册选择。");
  }
}

fileInput.addEventListener("change", handlePhotoInput);

choosePhotoBtn.addEventListener("click", () => {
  albumInput.value = "";
  albumInput.click();
});

albumInput.addEventListener("change", handlePhotoInput);

zoomRange.addEventListener("input", () => {
  state.scale = Number(zoomRange.value);
  renderEditor();
});

document.querySelectorAll(".swatch").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".swatch").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.bg = button.dataset.bg;
  });
});

let activePointerId = null;
editorStage.addEventListener("pointerdown", (event) => {
  if (!state.sourceImage) return;
  activePointerId = event.pointerId;
  editorStage.setPointerCapture(activePointerId);
  state.dragging = true;
  state.dragStartX = event.clientX;
  state.dragStartY = event.clientY;
  state.startOffsetX = state.offsetX;
  state.startOffsetY = state.offsetY;
});

editorStage.addEventListener("pointermove", (event) => {
  if (!state.dragging || event.pointerId !== activePointerId) return;
  state.offsetX = state.startOffsetX + (event.clientX - state.dragStartX);
  state.offsetY = state.startOffsetY + (event.clientY - state.dragStartY);
  renderEditor();
});

function endDrag(event) {
  if (event.pointerId !== activePointerId) return;
  state.dragging = false;
  activePointerId = null;
}

editorStage.addEventListener("pointerup", endDrag);
editorStage.addEventListener("pointercancel", endDrag);
editorStage.addEventListener("pointerleave", endDrag);

generateBtn.addEventListener("click", () => {
  updateResult(HIGH_RES_SIZE);
  setStatus("已生成高清版 600x840，下面可以直接导出。");
});

generateStandardBtn.addEventListener("click", () => {
  updateResult(STANDARD_SIZE);
  setStatus("已生成标准版 295x413，下面可以直接导出。");
});

downloadBtn.addEventListener("click", () => {
  if (!state.resultReady) updateResult();
  const link = document.createElement("a");
  const size = state.resultSize || HIGH_RES_SIZE;
  link.download = size === STANDARD_SIZE ? "one-inch-photo-standard.png" : "one-inch-photo-hd.png";
  link.href = resultCanvas.toDataURL("image/png");
  link.click();
});

window.addEventListener("resize", () => {
  if (state.sourceImage) renderEditor();
});

setStatus("先点“打开相机”，或直接用“手机拍照”。");
