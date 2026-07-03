<template>
  <main class="a4-composer">
    <aside class="a4-toolbar">
      <section class="a4-panel-head">
        <h1>A4 双图合成打印工具</h1>
        <p>两张图片上下排列，竖图自动旋转，长边横向贴合 A4 宽度。</p>
      </section>

      <section class="a4-group">
        <label class="a4-label" for="imageA">图片 1</label>
        <input id="imageA" type="file" accept="image/*" @change="readFile($event, 0)">
        <p class="a4-hint">{{ displayName(0) }}</p>
      </section>

      <section class="a4-group">
        <label class="a4-label" for="imageB">图片 2</label>
        <input id="imageB" type="file" accept="image/*" @change="readFile($event, 1)">
        <p class="a4-hint">{{ displayName(1) }}</p>
      </section>

      <section class="a4-group">
        <label class="a4-label" for="gapInput">中间间隔</label>
        <div class="a4-row">
          <input id="gapRange" v-model.number="gapPercent" type="range" min="0" max="30" step="1">
          <input id="gapInput" v-model.number="gapPercent" type="number" min="0" max="30" step="1" aria-label="中间间隔百分比">
        </div>
        <p class="a4-hint">默认 10%，按 A4 可用高度计算。</p>
      </section>

      <section class="a4-group">
        <label class="a4-label" for="marginInput">页面边距</label>
        <div class="a4-row">
          <input id="marginRange" v-model.number="marginPercent" type="range" min="0" max="20" step="1">
          <input id="marginInput" v-model.number="marginPercent" type="number" min="0" max="20" step="1" aria-label="页面边距百分比">
        </div>
        <p class="a4-hint">默认 0%，打印机需要留白时再调大。</p>
      </section>

      <section class="a4-group">
        <label class="a4-label" for="rotationDirection">旋转方向</label>
        <select id="rotationDirection" v-model.number="rotationDirection">
          <option :value="90">顺时针 90°</option>
          <option :value="-90">逆时针 90°</option>
        </select>
      </section>

      <section class="a4-group">
        <label class="a4-label" for="fitMode">图片适配</label>
        <select id="fitMode" v-model="fitMode">
          <option value="contain">完整显示</option>
          <option value="cover">铺满裁切</option>
        </select>
      </section>

      <section class="a4-group a4-actions">
        <button class="a4-btn primary" type="button" @click="printPage">打印</button>
        <button class="a4-btn" type="button" @click="downloadPng">下载 PNG</button>
        <button class="a4-btn" type="button" @click="swapImages">交换图片</button>
      </section>
    </aside>

    <section class="a4-editing-surface" aria-label="A4 预览">
      <div class="a4-paper">
        <ImageSlot
          v-for="(rect, index) in layoutRects"
          :key="index"
          :image="images[index]"
          :index="index"
          :rect="rect"
          :fit-mode="fitMode"
          :rotation-direction="rotationDirection"
        />
      </div>
    </section>
  </main>

  <div class="a4-print-only">
    <div class="a4-print-paper">
      <ImageSlot
        v-for="(rect, index) in layoutRects"
        :key="`print-${index}`"
        print
        :image="images[index]"
        :index="index"
        :rect="rect"
        :fit-mode="fitMode"
        :rotation-direction="rotationDirection"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";

const A4 = { width: 210, height: 297 };

const gapPercent = ref(10);
const marginPercent = ref(0);
const rotationDirection = ref(90);
const fitMode = ref("contain");
const images = ref([null, null]);
const names = ref(["未选择图片", "未选择图片"]);

const layoutRects = computed(() => {
  const safeGap = clampNumber(gapPercent.value, 0, 30);
  const safeMargin = clampNumber(marginPercent.value, 0, 20);
  const marginX = A4.width * safeMargin / 100;
  const marginY = A4.height * safeMargin / 100;
  const usableW = A4.width - marginX * 2;
  const usableH = A4.height - marginY * 2;
  const gap = usableH * safeGap / 100;
  const itemH = (usableH - gap) / 2;

  return [
    { left: marginX, top: marginY, width: usableW, height: itemH },
    { left: marginX, top: marginY + itemH + gap, width: usableW, height: itemH },
  ];
});

const ImageSlot = defineComponent({
  name: "ImageSlot",
  props: {
    image: { type: Object, default: null },
    index: { type: Number, required: true },
    rect: { type: Object, required: true },
    fitMode: { type: String, required: true },
    rotationDirection: { type: Number, required: true },
    print: { type: Boolean, default: false },
  },
  setup(props) {
    return () => {
      const slotStyle = rectToPercent(props.rect);
      const rotated = shouldRotate(props.image);
      const children = [];

      if (props.image) {
        const stageStyle = rotated
          ? {
              "--rotation": `${props.rotationDirection}deg`,
              width: `${props.rect.height / props.rect.width * 100}%`,
              height: `${props.rect.width / props.rect.height * 100}%`,
            }
          : {};

        children.push(
          h(
            "div",
            { class: ["a4-image-stage", { rotated }], style: stageStyle },
            [
              h("img", {
                src: props.image.src,
                alt: `图片 ${props.index + 1}`,
                style: { objectFit: props.fitMode },
              }),
            ],
          ),
        );
      } else if (!props.print) {
        children.push(h("span", `选择图片 ${props.index + 1}`));
      }

      return h(
        "div",
        {
          class: ["a4-slot", { "has-image": Boolean(props.image) }],
          style: slotStyle,
        },
        children,
      );
    };
  },
});

function clampNumber(value, min, max) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

function shouldRotate(info) {
  return info && info.height > info.width;
}

function rectToPercent(rect) {
  return {
    left: `${rect.left / A4.width * 100}%`,
    top: `${rect.top / A4.height * 100}%`,
    width: `${rect.width / A4.width * 100}%`,
    height: `${rect.height / A4.height * 100}%`,
  };
}

function displayName(index) {
  if (!images.value[index]) return names.value[index];
  return shouldRotate(images.value[index]) ? `${names.value[index]}（已旋转）` : names.value[index];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function readFile(event, index) {
  const file = event.target.files?.[0];
  if (!file) return;

  const src = await fileToDataURL(file);
  const img = await loadImage(src);
  const nextImages = [...images.value];
  const nextNames = [...names.value];

  nextImages[index] = {
    src,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
  nextNames[index] = file.name;
  images.value = nextImages;
  names.value = nextNames;
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function swapImages() {
  images.value = [images.value[1], images.value[0]];
  names.value = [names.value[1], names.value[0]];
}

function printPage() {
  window.print();
}

async function downloadPng() {
  const canvas = document.createElement("canvas");
  const scale = 300 / 25.4;
  canvas.width = Math.round(A4.width * scale);
  canvas.height = Math.round(A4.height * scale);

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < layoutRects.value.length; i += 1) {
    const imageInfo = images.value[i];
    if (!imageInfo) continue;
    const img = await loadImage(imageInfo.src);
    const rotation = shouldRotate(imageInfo) ? rotationDirection.value : 0;
    drawImageFit(ctx, img, layoutRects.value[i], scale, fitMode.value, rotation);
  }

  const link = document.createElement("a");
  link.download = "A4双图合成.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function drawImageToBox(ctx, img, dx, dy, dw, dh, mode) {
  const imageRatio = img.naturalWidth / img.naturalHeight;
  const slotRatio = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  let tx = dx;
  let ty = dy;
  let tw = dw;
  let th = dh;

  if (mode === "cover") {
    if (imageRatio > slotRatio) {
      sw = img.naturalHeight * slotRatio;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = img.naturalWidth / slotRatio;
      sy = (img.naturalHeight - sh) / 2;
    }
  } else if (imageRatio > slotRatio) {
    th = dw / imageRatio;
    ty = dy + (dh - th) / 2;
  } else {
    tw = dh * imageRatio;
    tx = dx + (dw - tw) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, tx, ty, tw, th);
}

function drawImageFit(ctx, img, rect, scale, mode, rotation) {
  const dx = Math.round(rect.left * scale);
  const dy = Math.round(rect.top * scale);
  const dw = Math.round(rect.width * scale);
  const dh = Math.round(rect.height * scale);

  ctx.save();
  if (rotation) {
    ctx.translate(dx + dw / 2, dy + dh / 2);
    ctx.rotate(rotation * Math.PI / 180);
    drawImageToBox(ctx, img, -dh / 2, -dw / 2, dh, dw, mode);
  } else {
    drawImageToBox(ctx, img, dx, dy, dw, dh, mode);
  }
  ctx.restore();
}

onMounted(() => {
  document.body.classList.add("a4-route");
});

onBeforeUnmount(() => {
  document.body.classList.remove("a4-route");
});
</script>

<style>
.a4-composer {
  width: min(1180px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(280px, 350px) 1fr;
  gap: 16px;
}

.a4-toolbar {
  align-self: start;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.a4-panel-head h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
}

.a4-panel-head p {
  margin: 6px 0 0;
  color: var(--muted);
}

.a4-group {
  padding: 14px 0;
  border-top: 1px solid var(--line);
}

.a4-panel-head + .a4-group {
  border-top: 0;
}

.a4-label {
  display: block;
  margin-bottom: 8px;
  color: var(--muted);
  font-weight: 700;
}

.a4-toolbar input[type="file"],
.a4-toolbar input[type="number"],
.a4-toolbar select {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--text);
}

.a4-toolbar input[type="range"] {
  width: 100%;
  accent-color: var(--primary);
}

.a4-row {
  display: grid;
  grid-template-columns: 1fr 84px;
  gap: 10px;
  align-items: center;
}

.a4-hint {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.a4-actions {
  display: grid;
  gap: 10px;
}

.a4-btn {
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  cursor: pointer;
}

.a4-btn.primary {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
  font-weight: 700;
}

.a4-editing-surface {
  min-width: 0;
  display: grid;
  place-items: start center;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: auto;
}

.a4-paper {
  width: min(100%, 640px);
  aspect-ratio: 210 / 297;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
  position: relative;
  overflow: hidden;
}

.a4-slot {
  position: absolute;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
}

.a4-slot.has-image {
  border: 0;
  background: transparent;
}

.a4-slot span {
  padding: 10px;
  color: var(--muted);
  text-align: center;
}

.a4-image-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.a4-image-stage.rotated {
  inset: auto;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(var(--rotation));
  transform-origin: center;
}

.a4-image-stage img {
  width: 100%;
  height: 100%;
  object-position: center;
  display: block;
}

.a4-print-only {
  display: none;
}

@media (max-width: 820px) {
  .a4-composer {
    grid-template-columns: 1fr;
  }
}

@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  body.a4-route {
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 0;
    background: #fff;
    overflow: hidden;
  }

  body.a4-route .top-nav,
  body.a4-route .a4-composer {
    display: none !important;
  }

  body.a4-route .a4-print-only {
    display: block;
    position: fixed;
    inset: 0;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
  }

  body.a4-route .a4-print-paper {
    width: 210mm;
    height: calc(297mm - 1px);
    background: #fff;
    position: absolute;
    inset: 0;
    overflow: hidden;
    break-after: avoid;
    break-before: avoid;
    break-inside: avoid;
    page-break-after: avoid;
    page-break-before: avoid;
    page-break-inside: avoid;
  }

  body.a4-route .a4-slot {
    border: 0;
  }
}
</style>
