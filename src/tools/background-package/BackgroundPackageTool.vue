<template>
  <main class="background-tool">
    <section class="background-header">
      <div>
        <div class="eyebrow"><Package :size="17" /> 背景资源包</div>
        <h1>背景资源打包工具</h1>
        <p>仅选择需要替换的资源，系统会转换为设备要求的 PNG 和 UTF-8 文本，再生成压缩包。</p>
      </div>
      <button class="download-button" type="button" :disabled="!hasResources || exporting" @click="downloadPackage">
        <Download :size="17" />
        {{ exporting ? "正在生成..." : "下载 background.zip" }}
      </button>
    </section>

    <p v-if="errorMessage" class="message error" role="alert">{{ errorMessage }}</p>
    <p v-else-if="successMessage" class="message success" role="status">{{ successMessage }}</p>

    <section class="resource-grid" aria-label="资源选择">
      <article v-for="resource in imageResources" :key="resource.key" class="resource-card">
        <div class="resource-icon"><component :is="resource.icon" :size="20" /></div>
        <div class="resource-content">
          <div class="resource-heading">
            <div>
              <h2>{{ resource.label }}</h2>
              <p>{{ resource.filename }} · {{ resource.size }} · PNG</p>
            </div>
            <span :class="['status', resource.processing ? 'processing' : resource.image ? 'ready' : 'empty']">
              {{ resource.processing ? "处理中" : resource.image ? "已就绪" : "未选择" }}
            </span>
          </div>
          <button type="button" :class="['file-picker', { disabled: resource.processing }]" :disabled="resource.processing" @click="openFilePicker(resource.key)">
            <LoaderCircle v-if="resource.processing" :size="16" class="spinner" />
            <Upload v-else :size="16" />
            <span>{{ resource.processing ? "正在处理..." : resource.image ? "更换图片" : "选择图片" }}</span>
          </button>
          <input :id="resource.key" class="native-file-input" type="file" accept="image/*" :disabled="resource.processing" @change="selectImage($event, resource)">
          <div v-if="resource.image" class="image-preview">
            <img :src="resource.image.previewUrl" :alt="resource.label + '预览'">
            <div class="preview-meta">
              <span>{{ resource.image.sourceName }}</span>
              <button type="button" class="icon-button" title="移除图片" @click="removeImage(resource)">
                <Trash2 :size="16" />
              </button>
            </div>
          </div>
        </div>
      </article>

      <article class="resource-card info-card">
        <div class="resource-icon"><FileText :size="20" /></div>
        <div class="resource-content">
          <div class="resource-heading">
            <div>
              <h2>关于信息</h2>
              <p>Info.txt · 9 行 · UTF-8</p>
            </div>
            <label class="toggle-label">
              <input v-model="infoEnabled" type="checkbox">
              <span>启用</span>
            </label>
          </div>
          <div v-if="infoEnabled" class="info-editor">
            <textarea
              v-model="infoPasteText"
              class="info-paste-box"
              rows="3"
              placeholder="将最多 9 行关于信息粘贴到此处，系统会自动识别并填充下方内容"
              aria-label="粘贴关于信息"
              @paste="handleInfoPaste"
            />
            <p class="paste-hint">支持粘贴 1 至 9 行内容，并识别每行开头的 [LE]、[MI] 和 [ED] 标记。</p>
            <div v-for="(_, index) in infoLines" :key="index" class="info-line">
              <span class="line-number">{{ index + 1 }}</span>
              <input v-model="infoLines[index]" :aria-label="`第 ${index + 1} 行文字`" type="text" :placeholder="`第 ${index + 1} 行文字`">
              <select v-model="alignments[index]" :aria-label="`第 ${index + 1} 行对齐`">
                <option value="LE">左对齐</option>
                <option value="MI">居中</option>
              </select>
              <label class="ed-label" title="二维码下一行文字">
                <input :checked="edLine === index" type="checkbox" @change="setEdLine(index, $event.target.checked)">
                <span>[ED]</span>
              </label>
            </div>
          </div>
          <p v-else class="card-hint">启用后将固定生成 9 行的 Info.txt。</p>
        </div>
      </article>
    </section>

    <section class="package-summary">
      <div>
        <h2>将被打包的文件</h2>
        <p>{{ packageFiles.length ? packageFiles.join("、") : "尚未选择资源" }}</p>
      </div>
      <span class="file-count">{{ packageFiles.length }} 个文件</span>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { Download, FileText, Image, LoaderCircle, Package, QrCode, Trash2, Upload } from "lucide-vue-next";

const imageResources = reactive([
  { key: "logo", label: "Logo", filename: "Logo.png", size: "145 x 60 像素", width: 145, height: 60, icon: Image, image: null, processing: false },
  { key: "start", label: "开机图片", filename: "StartImage.png", size: "800 x 600 像素", width: 800, height: 600, icon: Image, image: null, processing: false },
  { key: "updating", label: "升级程序背景", filename: "SoftwareUpdatingBackground.png", size: "800 x 600 像素", width: 800, height: 600, icon: Image, image: null, processing: false },
  { key: "qr", label: "二维码", filename: "QR.png", size: "145 x 145 像素", width: 145, height: 145, icon: QrCode, image: null, processing: false },
]);

const infoEnabled = ref(false);
const infoLines = ref(Array(9).fill(""));
const alignments = ref(Array(9).fill("LE"));
const edLine = ref(null);
const infoPasteText = ref("");
const errorMessage = ref("");
const successMessage = ref("");
const exporting = ref(false);

const packageFiles = computed(() => {
  const files = imageResources.filter((item) => item.image).map((item) => item.filename);
  if (infoEnabled.value) files.push("Info.txt");
  return files;
});

const hasResources = computed(() => packageFiles.value.length > 0);

function openFilePicker(id) {
  document.getElementById(id)?.click();
}

async function selectImage(event, resource) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  errorMessage.value = "";
  successMessage.value = "";

  if (!file.type.startsWith("image/")) {
    errorMessage.value = "请选择有效的图片文件。";
    return;
  }

  resource.processing = true;
  let sourceUrl = "";
  const processingStartedAt = Date.now();
  try {
    sourceUrl = URL.createObjectURL(file);
    const image = await loadImage(sourceUrl);
    const output = await renderPng(image, resource.width, resource.height);
    if (resource.image?.previewUrl) URL.revokeObjectURL(resource.image.previewUrl);
    resource.image = { sourceName: file.name, blob: output, previewUrl: URL.createObjectURL(output) };
  } catch {
    errorMessage.value = "图片读取失败，请更换文件后重试。";
  } finally {
    const remainingDelay = 450 - (Date.now() - processingStartedAt);
    if (remainingDelay > 0) await new Promise((resolve) => window.setTimeout(resolve, remainingDelay));
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    resource.processing = false;
  }
}

function handleInfoPaste(event) {
  const pastedText = event.clipboardData?.getData("text/plain");
  if (pastedText === undefined) return;
  window.setTimeout(() => applyInfoText(pastedText), 0);
}

function applyInfoText(text) {
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const lines = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
    while (lines.length > 1 && lines.at(-1) === "") lines.pop();
    if (lines.length < 1 || lines.length > 9) throw new Error("line count");
    const nextLines = Array(9).fill("");
    const nextAlignments = Array(9).fill("LE");
    let nextEdLine = null;
    lines.forEach((rawLine, index) => {
      let line = rawLine;
      const alignment = line.match(/^\[(LE|MI)\]/);
      nextAlignments[index] = alignment?.[1] ?? "LE";
      if (alignment) line = line.slice(alignment[0].length);
      if (line.startsWith("[ED]")) {
        nextEdLine = index;
        line = line.slice(4);
      }
      nextLines[index] = line;
    });
    infoLines.value = nextLines;
    alignments.value = nextAlignments;
    edLine.value = nextEdLine;
    infoEnabled.value = true;
    successMessage.value = `已自动识别并填充 ${lines.length} 行关于信息。`;
  } catch {
    errorMessage.value = "请粘贴 1 至 9 行的关于信息。";
  }
}

function removeImage(resource) {
  if (resource.image?.previewUrl) URL.revokeObjectURL(resource.image.previewUrl);
  resource.image = null;
  successMessage.value = "";
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function renderPng(image, width, height) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Canvas unavailable"));
      return;
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = Math.round(image.naturalWidth * ratio);
    const drawHeight = Math.round(image.naturalHeight * ratio);
    context.drawImage(image, Math.round((width - drawWidth) / 2), Math.round((height - drawHeight) / 2), drawWidth, drawHeight);
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG generation failed")), "image/png");
  });
}

function buildInfoText() {
  return infoLines.value.map((line, index) => {
    const prefix = `[${alignments.value[index]}]`;
    const edPrefix = edLine.value === index ? "[ED]" : "";
    return `${prefix}${edPrefix}${line}`;
  }).join("\r\n");
}

function setEdLine(index, checked) {
  edLine.value = checked ? index : null;
}

async function downloadPackage() {
  if (!hasResources.value || exporting.value) return;
  exporting.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const entries = [];
    for (const resource of imageResources) {
      if (resource.image) entries.push({ name: resource.filename, data: new Uint8Array(await resource.image.blob.arrayBuffer()) });
    }
    if (infoEnabled.value) entries.push({ name: "Info.txt", data: new TextEncoder().encode(buildInfoText()) });
    const archive = createZip(entries);
    const url = URL.createObjectURL(new Blob([archive], { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "background.zip";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    successMessage.value = `已生成 background.zip，内含 ${entries.length} 个文件。`;
  } catch {
    errorMessage.value = "压缩包生成失败，请重试。";
  } finally {
    exporting.value = false;
  }
}

function createZip(entries) {
  const encoder = new TextEncoder();
  const parts = [];
  const centralDirectory = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const checksum = crc32(entry.data);
    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint32(14, checksum, true);
    view.setUint32(18, entry.data.length, true);
    view.setUint32(22, entry.data.length, true);
    view.setUint16(26, name.length, true);
    header.set(name, 30);
    parts.push(header, entry.data);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, entry.data.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centralDirectory.push(central);
    offset += header.length + entry.data.length;
  }
  const centralSize = centralDirectory.reduce((total, entry) => total + entry.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return new Blob([...parts, ...centralDirectory, end]);
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
</script>

<style scoped>
.background-tool { width: min(1180px, 100%); margin: 0 auto; display: grid; gap: 16px; }
.background-header, .resource-card, .package-summary { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; box-shadow: var(--shadow); }
.background-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 22px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; color: #2563eb; font-size: 13px; font-weight: 800; }
h1, h2, p { margin-top: 0; } .background-header h1 { margin: 5px 0 6px; font-size: 24px; line-height: 1.2; } .background-header p, .resource-heading p, .card-hint, .package-summary p { margin-bottom: 0; color: var(--muted); }
.download-button { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 14px; border: 1px solid #2563eb; border-radius: 6px; background: #2563eb; color: #fff; font-weight: 700; cursor: pointer; white-space: nowrap; }
.download-button:disabled { cursor: not-allowed; opacity: .5; }
.message { margin: 0; padding: 10px 13px; border: 1px solid; border-radius: 6px; } .message.error { border-color: #fecaca; background: #fef2f2; color: #b91c1c; } .message.success { border-color: #bbf7d0; background: #f0fdf4; color: #15803d; }
.resource-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.resource-card { display: flex; gap: 13px; min-width: 0; padding: 17px; } .resource-icon { width: 38px; height: 38px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 6px; background: #eaf2ff; color: #2563eb; }
.resource-content { min-width: 0; flex: 1; } .resource-heading { display: flex; justify-content: space-between; gap: 10px; } .resource-heading h2, .package-summary h2 { margin-bottom: 3px; font-size: 16px; } .resource-heading p { font-size: 12px; }
.status { height: 22px; padding: 2px 7px; border-radius: 4px; font-size: 12px; white-space: nowrap; } .status.empty { background: #f1f5f9; color: #64748b; } .status.ready { background: #dcfce7; color: #15803d; } .status.processing { background: #dbeafe; color: #1d4ed8; }
.file-picker { width: max-content; min-height: 34px; display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; color: #334155; cursor: pointer; font-weight: 700; } .file-picker.disabled { cursor: wait; opacity: .68; } .spinner { animation: spin .75s linear infinite; } .native-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.image-preview { display: grid; grid-template-columns: 100px 1fr; gap: 10px; min-height: 76px; margin-top: 12px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; } .image-preview img { width: 100px; height: 58px; display: block; object-fit: contain; background: #fff; } .preview-meta { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #475569; font-size: 12px; } .preview-meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.icon-button { width: 32px; height: 32px; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid #fecaca; border-radius: 5px; background: #fff; color: #dc2626; cursor: pointer; }
.toggle-label { display: inline-flex; align-items: center; gap: 6px; color: #334155; font-size: 12px; font-weight: 700; white-space: nowrap; } .toggle-label input, .ed-label input { accent-color: #2563eb; }
.info-editor { display: grid; gap: 7px; margin-top: 13px; } .info-paste-box { width: 100%; min-height: 66px; resize: vertical; padding: 8px; border: 1px dashed #94a3b8; border-radius: 6px; background: #f8fafc; color: var(--text); font: inherit; font-size: 12px; line-height: 1.45; } .paste-hint { margin: -2px 0 3px; color: var(--muted); font-size: 12px; } .info-line { display: grid; grid-template-columns: 22px minmax(0, 1fr) 76px auto; gap: 6px; align-items: center; } .line-number { color: #64748b; font-size: 12px; text-align: center; } .info-line input[type="text"], .info-line select { width: 100%; height: 31px; min-width: 0; padding: 4px 7px; border: 1px solid #cbd5e1; border-radius: 5px; background: #fff; color: var(--text); font-size: 12px; } .ed-label { display: inline-flex; align-items: center; gap: 3px; color: #475569; font-size: 11px; white-space: nowrap; }
.package-summary { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 18px; } .package-summary p { font-size: 13px; } .file-count { padding: 4px 8px; border-radius: 4px; background: #eaf2ff; color: #2563eb; font-weight: 700; font-size: 12px; white-space: nowrap; }
@media (max-width: 760px) { .background-header { align-items: stretch; flex-direction: column; } .download-button { width: 100%; } .resource-grid { grid-template-columns: 1fr; } .package-summary { align-items: flex-start; flex-direction: column; } }
@media (max-width: 430px) { .resource-card { padding: 13px; } .resource-icon { display: none; } .info-line { grid-template-columns: 20px minmax(0, 1fr) 66px; } .ed-label { grid-column: 2 / -1; } }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
