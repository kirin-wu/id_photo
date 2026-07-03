<template>
  <main class="app">
    <section class="panel">
      <div class="panel-head">
        <h1>一寸照片生成器</h1>
        <p>手机拍照，生成并导出电子照</p>
      </div>

      <div class="stage-wrap">
        <div class="stage">
          <video ref="cameraVideo" playsinline autoplay muted :hidden="Boolean(capturePreviewSrc)"></video>
          <img v-if="capturePreviewSrc" :src="capturePreviewSrc" alt="" />
          <div class="mask"></div>
          <div class="guide">
            <span>对齐头部与肩线</span>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn primary" type="button" @click="startCamera">打开相机</button>
        <button class="btn ghost" type="button" @click="openCameraPicker">手机拍照</button>
        <button class="btn ghost" type="button" @click="openAlbumPicker">相册选择</button>
        <input ref="fileInput" class="file-input" type="file" accept="image/*" capture="environment" @change="handlePhotoInput" />
        <input ref="albumInput" class="file-input" type="file" accept="image/*" @change="handlePhotoInput" />
        <button class="btn" type="button" @click="captureVideoFrame">拍照</button>
        <button class="btn ghost" type="button" @click="resetAll">重来</button>
      </div>

      <div class="status">{{ statusText }}</div>
    </section>

    <section v-if="hasSourceImage" ref="editorPanel" class="panel editor">
      <div class="panel-head">
        <h2>裁切调整</h2>
        <p>拖动照片，滑动缩放，选好底色后生成</p>
      </div>

      <div class="editor-stage-wrap">
        <div
          ref="editorStage"
          class="editor-stage"
          @pointerdown="startDrag"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
          @pointerleave="endDrag"
        >
          <img ref="editorImage" :src="editorImageSrc" alt="" :style="editorImageStyle" />
          <div class="mask"></div>
          <div class="frame"></div>
        </div>
      </div>

      <div class="controls">
        <label class="control">
          <span>缩放</span>
          <input v-model.number="scale" type="range" :min="baseScale" :max="baseScale * 2.6" step="0.01" @input="renderEditor" />
        </label>

        <div class="swatches" aria-label="背景颜色">
          <button
            v-for="option in bgOptions"
            :key="option.value"
            class="swatch"
            :class="{ active: bg === option.value }"
            :style="{ background: option.value }"
            :aria-label="option.label"
            type="button"
            @click="selectBackground(option.value)"
          ></button>
        </div>
      </div>

      <div class="actions">
        <button class="btn primary" type="button" @click="generateHighRes">生成一寸照</button>
        <button class="btn ghost" type="button" @click="generateStandard">生成标准版</button>
        <button class="btn" type="button" :disabled="!resultReady" @click="downloadResult">导出图片</button>
      </div>

      <div class="result">
        <canvas ref="resultCanvas" width="600" height="840"></canvas>
      </div>
    </section>
  </main>

  <canvas ref="workCanvas" hidden></canvas>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";

const HIGH_RES_SIZE = { width: 600, height: 840, label: "高清版 600x840", filename: "one-inch-photo-hd.png" };
const STANDARD_SIZE = { width: 295, height: 413, label: "标准版 295x413", filename: "one-inch-photo-standard.png" };

const bgOptions = [
  { label: "白底", value: "#ffffff" },
  { label: "浅灰底", value: "#f5f7fa" },
  { label: "蓝底", value: "#1e6fff" },
  { label: "红底", value: "#cf202f" },
];

const cameraVideo = ref(null);
const editorPanel = ref(null);
const editorStage = ref(null);
const fileInput = ref(null);
const albumInput = ref(null);
const resultCanvas = ref(null);
const workCanvas = ref(null);

const stream = ref(null);
const statusText = ref("先点“打开相机”，或直接用“手机拍照”。");
const capturePreviewSrc = ref("");
const editorImageSrc = ref("");
const sourceImage = ref(null);
const sourceWidth = ref(0);
const sourceHeight = ref(0);
const bg = ref("#ffffff");
const baseScale = ref(1);
const scale = ref(1);
const resultReady = ref(false);
const resultSize = ref(HIGH_RES_SIZE);

const position = reactive({
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  startOffsetX: 0,
  startOffsetY: 0,
  activePointerId: null,
});

const imageBox = reactive({
  left: 0,
  top: 0,
});

const hasSourceImage = computed(() => Boolean(sourceImage.value));

const editorImageStyle = computed(() => ({
  width: `${sourceWidth.value}px`,
  height: `${sourceHeight.value}px`,
  left: `${imageBox.left}px`,
  top: `${imageBox.top}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: "top left",
}));

function setStatus(text) {
  statusText.value = text;
}

function stopStream() {
  if (stream.value) {
    for (const track of stream.value.getTracks()) track.stop();
    stream.value = null;
  }
  if (cameraVideo.value) cameraVideo.value.srcObject = null;
}

async function startCamera() {
  try {
    stopStream();
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    stream.value = mediaStream;
    capturePreviewSrc.value = "";
    cameraVideo.value.srcObject = mediaStream;
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

function clearResult() {
  const canvas = resultCanvas.value;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  resultReady.value = false;
}

function openEditor(src) {
  const img = new Image();
  img.onload = async () => {
    sourceImage.value = img;
    sourceWidth.value = img.naturalWidth;
    sourceHeight.value = img.naturalHeight;
    editorImageSrc.value = src;
    clearResult();
    await nextTick();
    requestAnimationFrame(fitImage);
    editorPanel.value?.scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus("照片已载入，拖动和缩放后生成。");
  };
  img.onerror = () => {
    setStatus("照片读取失败，请重新拍一张，或从相册选择。");
  };
  img.src = src;
}

function fitImage() {
  if (!sourceImage.value || !editorStage.value) return;
  const rect = editorStage.value.getBoundingClientRect();
  const cover = Math.max(rect.width / sourceWidth.value, rect.height / sourceHeight.value);
  baseScale.value = cover;
  scale.value = cover;
  position.offsetX = 0;
  position.offsetY = 0;
  renderEditor();
}

function renderEditor() {
  if (!sourceImage.value || !editorStage.value) return;
  const rect = editorStage.value.getBoundingClientRect();
  const displayScale = scale.value;
  const displayWidth = sourceWidth.value * displayScale;
  const displayHeight = sourceHeight.value * displayScale;
  imageBox.left = rect.width / 2 - displayWidth / 2 + position.offsetX;
  imageBox.top = rect.height / 2 - displayHeight / 2 + position.offsetY;
}

function updateResult(size = HIGH_RES_SIZE) {
  if (!sourceImage.value || !editorStage.value || !resultCanvas.value) return;

  const canvas = resultCanvas.value;
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext("2d");
  const outW = canvas.width;
  const outH = canvas.height;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = bg.value;
  ctx.fillRect(0, 0, outW, outH);

  const scaleX = outW / editorStage.value.clientWidth;
  const scaleY = outH / editorStage.value.clientHeight;
  const drawW = sourceWidth.value * scale.value * scaleX;
  const drawH = sourceHeight.value * scale.value * scaleY;
  const drawX = outW / 2 - drawW / 2 + position.offsetX * scaleX;
  const drawY = outH / 2 - drawH / 2 + position.offsetY * scaleY;

  ctx.drawImage(sourceImage.value, drawX, drawY, drawW, drawH);
  resultReady.value = true;
  resultSize.value = size;
}

function captureVideoFrame() {
  if (!cameraVideo.value?.videoWidth) {
    setStatus("相机还没准备好，再等一秒。");
    return;
  }
  const canvas = workCanvas.value;
  const ctx = canvas.getContext("2d");
  canvas.width = cameraVideo.value.videoWidth;
  canvas.height = cameraVideo.value.videoHeight;
  ctx.drawImage(cameraVideo.value, 0, 0);
  const src = canvas.toDataURL("image/jpeg", 0.95);
  stopStream();
  capturePreviewSrc.value = src;
  openEditor(src);
}

function openCameraPicker() {
  if (!fileInput.value) return;
  fileInput.value.value = "";
  fileInput.value.click();
}

function openAlbumPicker() {
  if (!albumInput.value) return;
  albumInput.value.value = "";
  albumInput.value.click();
}

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
    capturePreviewSrc.value = src;
    openEditor(src);
  } catch (error) {
    console.warn(error);
    setStatus("照片读取失败，请重新拍一张，或从相册选择。");
  }
}

function resetAll() {
  stopStream();
  capturePreviewSrc.value = "";
  editorImageSrc.value = "";
  sourceImage.value = null;
  resultReady.value = false;
  setStatus("先点“打开相机”，或直接用“手机拍照”。");
}

function selectBackground(value) {
  bg.value = value;
  if (resultReady.value) updateResult(resultSize.value);
}

function startDrag(event) {
  if (!sourceImage.value || !editorStage.value) return;
  position.activePointerId = event.pointerId;
  editorStage.value.setPointerCapture(position.activePointerId);
  position.dragging = true;
  position.dragStartX = event.clientX;
  position.dragStartY = event.clientY;
  position.startOffsetX = position.offsetX;
  position.startOffsetY = position.offsetY;
}

function moveDrag(event) {
  if (!position.dragging || event.pointerId !== position.activePointerId) return;
  position.offsetX = position.startOffsetX + (event.clientX - position.dragStartX);
  position.offsetY = position.startOffsetY + (event.clientY - position.dragStartY);
  renderEditor();
}

function endDrag(event) {
  if (event.pointerId !== position.activePointerId) return;
  position.dragging = false;
  position.activePointerId = null;
}

function generateHighRes() {
  updateResult(HIGH_RES_SIZE);
  setStatus("已生成高清版 600x840，下面可以直接导出。");
}

function generateStandard() {
  updateResult(STANDARD_SIZE);
  setStatus("已生成标准版 295x413，下面可以直接导出。");
}

function downloadResult() {
  if (!resultReady.value) updateResult();
  const link = document.createElement("a");
  link.download = resultSize.value.filename;
  link.href = resultCanvas.value.toDataURL("image/png");
  link.click();
}

function handleResize() {
  if (sourceImage.value) renderEditor();
}

onMounted(() => {
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  stopStream();
  window.removeEventListener("resize", handleResize);
});
</script>
