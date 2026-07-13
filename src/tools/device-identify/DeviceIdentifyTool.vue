<template>
  <main class="device-tool">
    <section class="workspace-header">
      <div class="header-copy">
        <div class="eyebrow">
          <Cpu :size="18" />
          <span>slaveTypeLib.json</span>
        </div>
        <h1>设备识别文件生成器</h1>
        <div class="header-metrics" aria-label="设备数量">
          <span class="status-tag primary">伺服 {{ typeStats.servo }}</span>
          <span class="status-tag success">IO {{ typeStats.gpio }}</span>
          <span class="status-tag info">共 {{ entries.length }} 条</span>
        </div>
      </div>

      <div class="header-actions">
        <el-button @click="addEntry('servo')">
          <Plus class="btn-icon" :size="16" />
          <span>添加伺服</span>
        </el-button>
        <el-button @click="addEntry('gpio')">
          <Plus class="btn-icon" :size="16" />
          <span>添加 IO</span>
        </el-button>
        <el-button type="primary" :loading="btnLoading === 'export'" @click="downloadJson">
          <Download class="btn-icon" :size="16" />
          下载 JSON
        </el-button>
      </div>
    </section>

    <div class="tool-layout">
      <div class="tool-main">
        <section class="panel">
          <div class="section-bar">
            <div>
              <h2>设备条目</h2>
              <p>每个条目生成一个伺服或 IO 设备配置。</p>
            </div>
          </div>

          <div class="device-list">
            <article v-for="(entry, idx) in entries" :key="entry.id" class="device-card">
              <header class="entry-header">
                <div class="entry-title">
                  <span class="entry-index">{{ String(idx + 1).padStart(2, "0") }}</span>
                  <div class="entry-name">
                    <h3>{{ deviceTitle(entry, idx) }}</h3>
                    <div class="entry-tags">
                      <span :class="['status-tag', 'small', entry.type === 'servo' ? 'primary' : 'success']">
                        {{ deviceTypeText(entry.type) }}
                      </span>
                      <span v-if="entry.xmlStatus" class="status-tag small info">已解析</span>
                    </div>
                  </div>
                </div>

                <div class="entry-actions">
                  <el-segmented v-model="entry.type" :options="deviceTypeOptions" size="small" />
                  <el-tooltip content="删除条目" placement="top">
                    <el-button
                      circle
                      plain
                      type="danger"
                      :disabled="entries.length <= 1"
                      @click="removeEntry(entry.id)"
                    >
                      <Trash2 class="btn-icon only" :size="16" />
                    </el-button>
                  </el-tooltip>
                </div>
              </header>

              <div class="entry-body">
                <div class="upload-card">
                  <div class="upload-info">
                    <div class="upload-icon">
                      <FileUp :size="18" />
                    </div>
                    <div>
                      <strong>{{ entry.type === "servo" ? "EtherCAT XML" : "ESI XML" }}</strong>
                      <p>{{ entry.xmlStatus || "可自动填入 Vendor ID、Product Code 和 PDO index。" }}</p>
                    </div>
                  </div>
                  <el-upload
                    action="#"
                    accept=".xml"
                    :auto-upload="false"
                    :show-file-list="false"
                    :on-change="(file) => handleXmlUploadFile(idx, file)"
                  >
                    <el-button>
                      <FileSearch class="btn-icon" :size="16" />
                      <span>选择文件</span>
                    </el-button>
                  </el-upload>
                </div>

                <el-form label-position="top" class="device-form">
                  <div class="form-section">
                    <div class="form-section-head">
                      <Settings2 :size="16" />
                      <h4>基本信息</h4>
                    </div>

                    <div class="form-grid">
                      <el-form-item :label="entry.type === 'gpio' ? '标识名 name（不含中文）' : '标识名 name'">
                        <el-input
                          v-model="entry.name"
                          clearable
                          :placeholder="entry.type === 'gpio' ? '如 EC4_1616BW' : '如 Maxsine_EP5E'"
                        />
                      </el-form-item>
                      <el-form-item label="中文名 chineseName">
                        <el-input v-model="entry.chineseName" clearable placeholder="如 迈信伺服" />
                      </el-form-item>
                      <el-form-item label="Vendor ID（十进制）">
                        <el-input
                          v-model="entry.vendorIDInput"
                          clearable
                          placeholder="如 2013 或 0x7DD"
                          @blur="() => convertHex(idx)"
                        />
                      </el-form-item>
                      <el-form-item label="Product Code（十进制）">
                        <div class="stacked-field">
                          <el-input
                            v-model="entry.productcodeInput"
                            clearable
                            placeholder="如 1342177281"
                            @blur="() => convertHex(idx)"
                          />
                          <p class="field-hint">
                            Product Code 是设备型号的产品编码，通常由 ESI/XML 的 Type ProductCode 提供；它会和
                            Vendor ID 一起用于唯一识别从站设备。
                          </p>
                          <el-select
                            v-if="xmlDevicesOf(entry).length > 1"
                            :model-value="entry.xmlSelectedDeviceIdx"
                            size="small"
                            placeholder="选择 XML 内设备"
                            @change="(value) => switchXmlDevice(idx, Number(value))"
                          >
                            <el-option
                              v-for="(dev, di) in xmlDevicesOf(entry)"
                              :key="di"
                              :label="formatXmlDeviceOption(dev, di)"
                              :value="di"
                            />
                          </el-select>
                        </div>
                      </el-form-item>

                      <template v-if="entry.type === 'servo'">
                        <el-form-item label="轴数 axisNum">
                          <el-input-number v-model="entry.axisNum" :min="1" controls-position="right" />
                        </el-form-item>
                        <el-form-item label="编码器清除模式">
                          <el-select v-model="entry.clearEncodeMode">
                            <el-option :value="0" label="0 - 不清除" />
                            <el-option :value="1" label="1 - 清除" />
                            <el-option :value="2" label="2" />
                          </el-select>
                        </el-form-item>
                      </template>

                      <template v-else>
                        <el-form-item label="AD 比例 AD_ratio">
                          <el-input-number v-model="entry.AD_ratio" :min="1" controls-position="right" />
                        </el-form-item>
                      </template>
                    </div>
                  </div>
                </el-form>

                <div v-if="entry.type === 'gpio'" class="form-section pdo-section">
                  <div class="form-section-head">
                    <ListChecks :size="16" />
                    <h4>PDO 配置</h4>
                  </div>

                  <el-collapse v-model="entry.pdoOpen" class="pdo-collapse">
                    <el-collapse-item name="ai">
                      <template #title>
                        <div class="collapse-title">
                          <span>模拟量输入 AI</span>
                          <span :class="['status-tag', 'small', pdoList(entry, 'AI').length ? 'primary' : 'info']">
                            {{ pdoList(entry, "AI").length ? `${pdoList(entry, "AI").length} 组` : "无" }}
                          </span>
                        </div>
                      </template>
                      <div class="pdo-list">
                        <div v-for="(ai, aiIdx) in pdoList(entry, 'AI')" :key="ai._key" class="pdo-row">
                          <span class="pdo-label">AI #{{ aiIdx + 1 }}</span>
                          <label class="pdo-field">
                            <span>bitnum</span>
                            <el-input-number v-model="ai.bitnum" :min="0" controls-position="right" />
                          </label>
                          <label class="pdo-field">
                            <span>index</span>
                            <el-input-number v-model="ai.index" :min="0" controls-position="right" />
                          </label>
                          <label class="pdo-field">
                            <span>subindex</span>
                            <el-input-number v-model="ai.subindex" :min="0" controls-position="right" />
                          </label>
                          <el-button circle plain type="danger" @click="removePdoEntry(pdoList(entry, 'AI'), aiIdx)">
                            <Trash2 class="btn-icon only" :size="16" />
                          </el-button>
                        </div>
                        <div class="pdo-footer">
                          <el-button text type="primary" @click="addAiEntry(entry)">
                            <Plus class="btn-icon" :size="15" />
                            <span>添加 AI</span>
                          </el-button>
                        </div>
                      </div>
                    </el-collapse-item>

                    <el-collapse-item name="ao">
                      <template #title>
                        <div class="collapse-title">
                          <span>模拟量输出 AO</span>
                          <span :class="['status-tag', 'small', pdoList(entry, 'AO').length ? 'primary' : 'info']">
                            {{ pdoList(entry, "AO").length ? `${pdoList(entry, "AO").length} 组` : "无" }}
                          </span>
                        </div>
                      </template>
                      <div class="pdo-list">
                        <div v-for="(ao, aoIdx) in pdoList(entry, 'AO')" :key="ao._key" class="pdo-row">
                          <span class="pdo-label">AO #{{ aoIdx + 1 }}</span>
                          <label class="pdo-field">
                            <span>bitnum</span>
                            <el-input-number v-model="ao.bitnum" :min="0" controls-position="right" />
                          </label>
                          <label class="pdo-field">
                            <span>index</span>
                            <el-input-number v-model="ao.index" :min="0" controls-position="right" />
                          </label>
                          <label class="pdo-field">
                            <span>subindex</span>
                            <el-input-number v-model="ao.subindex" :min="0" controls-position="right" />
                          </label>
                          <el-button circle plain type="danger" @click="removePdoEntry(pdoList(entry, 'AO'), aoIdx)">
                            <Trash2 class="btn-icon only" :size="16" />
                          </el-button>
                        </div>
                        <div class="pdo-footer">
                          <el-button text type="primary" @click="addAoEntry(entry)">
                            <Plus class="btn-icon" :size="15" />
                            <span>添加 AO</span>
                          </el-button>
                        </div>
                      </div>
                    </el-collapse-item>

                    <el-collapse-item name="di">
                      <template #title>
                        <div class="collapse-title">
                          <span>数字量输入 DI</span>
                          <span class="status-tag small success">{{ diSummary(entry) }}</span>
                        </div>
                      </template>
                      <div class="pdo-list">
                        <div v-for="(di, diIdx) in pdoList(entry, 'DI')" :key="di._key" class="pdo-row">
                          <span class="pdo-label">DI #{{ diIdx + 1 }}</span>
                          <label class="pdo-field">
                            <span>bitnum</span>
                            <el-input-number v-model="di.bitnum" :min="0" controls-position="right" />
                          </label>
                          <label class="pdo-field">
                            <span>portnum</span>
                            <el-input-number v-model="di.portnum" :min="0" controls-position="right" />
                          </label>
                          <label class="pdo-field">
                            <span>index</span>
                            <el-input-number v-model="di.index" :min="0" controls-position="right" />
                          </label>
                          <label class="pdo-field">
                            <span>subindex</span>
                            <el-input-number v-model="di.subindex" :min="0" controls-position="right" />
                          </label>
                          <el-button circle plain type="danger" @click="removePdoEntry(pdoList(entry, 'DI'), diIdx)">
                            <Trash2 class="btn-icon only" :size="16" />
                          </el-button>
                        </div>
                        <div class="pdo-footer">
                          <el-button text type="primary" @click="addDiEntry(entry)">
                            <Plus class="btn-icon" :size="15" />
                            <span>添加 DI</span>
                          </el-button>
                        </div>
                      </div>
                    </el-collapse-item>

                    <el-collapse-item name="do">
                      <template #title>
                        <div class="collapse-title">
                          <span>数字量输出 DO</span>
                          <span class="status-tag small warning">{{ doSummary(entry) }}</span>
                        </div>
                      </template>
                      <div class="pdo-list">
                        <div v-for="(doItem, doIdx) in pdoList(entry, 'DO')" :key="doItem._key" class="pdo-row">
                          <span class="pdo-label">DO #{{ doIdx + 1 }}</span>
                          <label class="pdo-field">
                            <span>bitnum</span>
                            <el-input-number v-model="doItem.bitnum" :min="0" controls-position="right" />
                          </label>
                          <label class="pdo-field">
                            <span>portnum</span>
                            <el-input-number v-model="doItem.portnum" :min="0" controls-position="right" />
                          </label>
                          <label class="pdo-field">
                            <span>index</span>
                            <el-input-number v-model="doItem.index" :min="0" controls-position="right" />
                          </label>
                          <label class="pdo-field">
                            <span>subindex</span>
                            <el-input-number v-model="doItem.subindex" :min="0" controls-position="right" />
                          </label>
                          <el-button circle plain type="danger" @click="removePdoEntry(pdoList(entry, 'DO'), doIdx)">
                            <Trash2 class="btn-icon only" :size="16" />
                          </el-button>
                        </div>
                        <div class="pdo-footer">
                          <el-button text type="primary" @click="addDoEntry(entry)">
                            <Plus class="btn-icon" :size="15" />
                            <span>添加 DO</span>
                          </el-button>
                        </div>
                      </div>
                    </el-collapse-item>
                  </el-collapse>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="panel preview-panel">
          <div class="preview-toolbar">
            <button class="preview-toggle" type="button" @click="showPreview = !showPreview">
              <FileJson :size="18" />
              <span>JSON 预览</span>
              <ChevronDown :class="['chevron', { open: showPreview }]" :size="16" />
            </button>
            <div class="preview-actions">
              <el-button :loading="btnLoading === 'copy'" @click.stop="copyJson">
                <Copy class="btn-icon" :size="16" />
                <span>复制</span>
              </el-button>
              <el-button type="primary" :loading="btnLoading === 'export'" @click.stop="downloadJson">
                <Download class="btn-icon" :size="16" />
                导出
              </el-button>
            </div>
          </div>
          <el-collapse-transition>
            <pre v-show="showPreview" class="json-preview"><code>{{ generatedJson }}</code></pre>
          </el-collapse-transition>
        </section>

        <el-alert v-if="errorMsg" class="error-alert" type="error" :title="errorMsg" show-icon :closable="false" />
      </div>

      <aside class="tool-sidebar">
        <section class="side-panel">
          <div class="side-title">
            <Database :size="17" />
            <h3>输出概览</h3>
          </div>
          <div class="summary-list">
            <div class="summary-row">
              <span>伺服设备</span>
              <strong>{{ typeStats.servo }}</strong>
            </div>
            <div class="summary-row">
              <span>IO 设备</span>
              <strong>{{ typeStats.gpio }}</strong>
            </div>
            <div class="summary-row">
              <span>版本</span>
              <strong>1.0.0</strong>
            </div>
          </div>
          <el-button class="full-width" type="primary" :loading="btnLoading === 'export'" @click="downloadJson">
            <Download class="btn-icon" :size="16" />
            下载 slaveTypeLib.json
          </el-button>
        </section>

        <section class="side-panel">
          <div class="side-title">
            <Wrench :size="17" />
            <h3>进制转换</h3>
          </div>
          <el-radio-group v-model="convMode" class="converter-tabs" size="small">
            <el-radio-button value="hex2dec">16 → 10</el-radio-button>
            <el-radio-button value="dec2hex">10 → 16</el-radio-button>
          </el-radio-group>
          <el-form label-position="top" class="converter-form">
            <el-form-item :label="convMode === 'hex2dec' ? '十六进制' : '十进制'">
              <el-input
                v-model="convInput"
                clearable
                :placeholder="convMode === 'hex2dec' ? '如 7DD 或 0x7DD' : '如 2013'"
                @input="onConvInput"
              />
            </el-form-item>
            <el-form-item :label="convMode === 'hex2dec' ? '十进制' : '十六进制'">
              <el-input :model-value="convResult" readonly placeholder="自动换算" />
            </el-form-item>
          </el-form>
          <el-button class="full-width" :disabled="!convResult" @click="copyConvResult">
            <Clipboard class="btn-icon" :size="16" />
            <span>复制结果</span>
          </el-button>
        </section>

        <section class="side-panel">
          <div class="side-title">
            <Info :size="17" />
            <h3>IO index 速查</h3>
          </div>
          <el-table :data="indexRefs" size="small" class="ref-table">
            <el-table-column prop="hex" label="十六进制" min-width="88" />
            <el-table-column prop="dec" label="十进制" min-width="78" />
            <el-table-column prop="desc" label="说明" min-width="92" />
          </el-table>
        </section>

        <section class="side-panel">
          <el-collapse v-model="paramRefModel" class="param-collapse">
            <el-collapse-item name="params">
              <template #title>
                <div class="side-title collapse-side-title">
                  <Info :size="17" />
                  <h3>参数说明</h3>
                </div>
              </template>
              <dl class="param-list">
                <dt>name</dt>
                <dd>设备型号或唯一标识，IO 类型建议英文、数字、下划线。</dd>
                <dt>vendorID / productcode</dt>
                <dd>
                  vendorID 是厂家编号，productcode 是该厂家下的设备型号产品编码；EC 软件中的十六进制值可直接粘贴，
                  失焦后会转为十进制。
                </dd>
                <dt>axisNum / clearEncodeMode</dt>
                <dd>伺服轴数和编码器清除模式。</dd>
                <dt>AI / AO / DI / DO</dt>
                <dd>IO 板 PDO 配置，DI 常用 0x6000 段，DO 常用 0x7000 段。</dd>
              </dl>
            </el-collapse-item>
          </el-collapse>
        </section>
      </aside>
    </div>
  </main>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import {
  ChevronDown,
  Clipboard,
  Copy,
  Cpu,
  Database,
  Download,
  FileJson,
  FileSearch,
  FileUp,
  Info,
  ListChecks,
  Plus,
  Settings2,
  Trash2,
  Wrench,
} from "lucide-vue-next";

/* ---------- 工具函数 ---------- */

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function parseHexOrDec(raw) {
  if (!raw || !raw.trim()) return null;
  let s = raw.trim();
  if (s.startsWith("#x") || s.startsWith("#X")) s = s.slice(2);
  else if (s.startsWith("0x") || s.startsWith("0X")) s = s.slice(2);
  else if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (/^[0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);
  return null;
}

function parseDeviceXml(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) return null;

    const vendorIdEl = doc.querySelector("Vendor > Id");
    let vendorID = null;
    if (vendorIdEl) vendorID = parseHexOrDec(vendorIdEl.textContent.trim());

    const deviceEls = doc.querySelectorAll("Device");
    const devices = [];
    deviceEls.forEach((deviceEl) => {
      const typeEl = deviceEl.querySelector(":scope > Type");
      let productcode = null;
      let typeName = "";
      if (typeEl) {
        const pc = typeEl.getAttribute("ProductCode");
        if (pc) productcode = parseHexOrDec(pc);
        typeName = typeEl.textContent.trim();
      }

      const pdoIndices = { di: [], do: [] };
      deviceEl.querySelectorAll("TxPdo > Index").forEach((el) => {
        const val = parseHexOrDec(el.textContent.trim());
        if (val !== null) pdoIndices.di.push(val);
      });
      deviceEl.querySelectorAll("RxPdo > Index").forEach((el) => {
        const val = parseHexOrDec(el.textContent.trim());
        if (val !== null) pdoIndices.do.push(val);
      });

      devices.push({ productcode, typeName, pdoIndices });
    });

    return { vendorID, devices };
  } catch {
    return null;
  }
}

/* ---------- 数据 ---------- */

const showPreview = ref(true);
const errorMsg = ref("");
const btnLoading = ref(null);
const paramRefModel = ref(["params"]);

const deviceTypeOptions = [
  { label: "伺服", value: "servo" },
  { label: "IO", value: "gpio" },
];

const indexRefs = [
  { hex: "0x6000", dec: 24576, desc: "DI 输入 PDO" },
  { hex: "0x7000", dec: 28672, desc: "DO 输出 PDO" },
  { hex: "0x6001", dec: 24577, desc: "DI 第二组" },
  { hex: "0x7001", dec: 28673, desc: "DO 第二组" },
];

function createPdoEntry(defaults = {}) {
  return reactive({
    _key: makeId(),
    bitnum: defaults.bitnum ?? 0,
    index: defaults.index ?? 0,
    portnum: defaults.portnum ?? 0,
    subindex: defaults.subindex ?? 1,
  });
}

function createEntry(type = "servo") {
  return reactive({
    id: makeId(),
    type,
    name: "",
    chineseName: "",
    vendorID: null,
    vendorIDInput: "",
    productcode: null,
    productcodeInput: "",
    xmlStatus: "",
    axisNum: 1,
    clearEncodeMode: 0,
    AD_ratio: 1000,
    AI: [],
    AO: [],
    DI: [createPdoEntry({ index: 24576, subindex: 1 })],
    DO: [createPdoEntry({ index: 28672, subindex: 1 })],
    pdoOpen: ["di", "do"],
    xmlDevices: [],
    xmlSelectedDeviceIdx: 0,
  });
}

const entries = ref([createEntry("servo")]);

/* ---------- 展示辅助 ---------- */

function ensureEntryShape(entry) {
  if (!entry) return entry;
  if (!Array.isArray(entry.AI)) entry.AI = [];
  if (!Array.isArray(entry.AO)) entry.AO = [];
  if (!Array.isArray(entry.DI)) entry.DI = [createPdoEntry({ index: 24576, subindex: 1 })];
  if (!Array.isArray(entry.DO)) entry.DO = [createPdoEntry({ index: 28672, subindex: 1 })];
  if (!Array.isArray(entry.pdoOpen)) entry.pdoOpen = ["di", "do"];
  if (!Array.isArray(entry.xmlDevices)) entry.xmlDevices = [];
  if (entry.xmlSelectedDeviceIdx === undefined) entry.xmlSelectedDeviceIdx = 0;
  if (!entry.type) entry.type = "servo";
  if (entry.axisNum === undefined) entry.axisNum = 1;
  if (entry.clearEncodeMode === undefined) entry.clearEncodeMode = 0;
  if (entry.AD_ratio === undefined) entry.AD_ratio = 1000;
  return entry;
}

function pdoList(entry, key) {
  ensureEntryShape(entry);
  return entry?.[key] ?? [];
}

function xmlDevicesOf(entry) {
  ensureEntryShape(entry);
  return entry?.xmlDevices ?? [];
}

watch(
  entries,
  (list) => {
    list.forEach(ensureEntryShape);
  },
  { immediate: true, deep: true }
);

const typeStats = computed(() => {
  const servo = entries.value.filter((e) => e.type === "servo").length;
  const gpio = entries.value.filter((e) => e.type === "gpio").length;
  return { servo, gpio };
});

function deviceTypeText(type) {
  return type === "servo" ? "伺服" : "IO";
}

function deviceTitle(entry, idx) {
  return entry.name || entry.chineseName || `设备条目 ${idx + 1}`;
}

function formatXmlDeviceOption(dev, di) {
  const code = dev.productcode !== null && dev.productcode !== undefined
    ? `0x${dev.productcode.toString(16).toUpperCase()}`
    : "无 ProductCode";
  return `${di + 1}. ${dev.typeName || code}`;
}

/* ---------- 条目管理 ---------- */

function addEntry(type) {
  entries.value.push(createEntry(type));
}

function removeEntry(id) {
  if (entries.value.length <= 1) return;
  const idx = entries.value.findIndex((e) => e.id === id);
  if (idx !== -1) entries.value.splice(idx, 1);
}

/* ---------- PDO（仅 IO）---------- */

function addDiEntry(entry) {
  pdoList(entry, "DI").push(createPdoEntry({ index: 24576, subindex: 1 }));
}

function addDoEntry(entry) {
  pdoList(entry, "DO").push(createPdoEntry({ index: 28672, subindex: 1 }));
}

function addAiEntry(entry) {
  pdoList(entry, "AI").push(createPdoEntry({ subindex: 1 }));
  if (!entry.pdoOpen.includes("ai")) entry.pdoOpen.push("ai");
}

function addAoEntry(entry) {
  pdoList(entry, "AO").push(createPdoEntry({ subindex: 1 }));
  if (!entry.pdoOpen.includes("ao")) entry.pdoOpen.push("ao");
}

function removePdoEntry(list, idx) {
  list.splice(idx, 1);
}

function diSummary(entry) {
  const list = pdoList(entry, "DI");
  const totalBit = list.reduce((s, d) => s + (d.bitnum || 0), 0);
  const totalPort = list.reduce((s, d) => s + (d.portnum || 0), 0);
  return `${list.length} 组 / bit=${totalBit} port=${totalPort}`;
}

function doSummary(entry) {
  const list = pdoList(entry, "DO");
  const totalBit = list.reduce((s, d) => s + (d.bitnum || 0), 0);
  const totalPort = list.reduce((s, d) => s + (d.portnum || 0), 0);
  return `${list.length} 组 / bit=${totalBit} port=${totalPort}`;
}

/* ---------- XML/ESI 上传 ---------- */

function handleXmlUploadFile(idx, uploadFile) {
  const file = uploadFile.raw;
  if (!file) return;
  parseUploadedXml(idx, file);
}

function parseUploadedXml(idx, file) {
  const entry = entries.value[idx];
  if (!entry) return;

  entry.xmlStatus = `正在解析 ${file.name}...`;
  errorMsg.value = "";

  const reader = new FileReader();
  reader.onload = () => {
    const result = parseDeviceXml(reader.result);
    if (!result) {
      entry.xmlStatus = "";
      errorMsg.value = "XML 解析失败，请确认文件是有效的 EtherCAT 描述文件。";
      return;
    }

    if (result.vendorID !== null) {
      entry.vendorID = result.vendorID;
      entry.vendorIDInput = String(result.vendorID);
    }

    entry.xmlDevices = result.devices;
    entry.xmlSelectedDeviceIdx = 0;

    if (result.devices.length > 0) {
      applyXmlDevice(entry, 0);
    }

    const dev = result.devices[0];
    const statusParts = [];
    if (result.vendorID !== null) {
      statusParts.push(`Vendor=0x${result.vendorID.toString(16).toUpperCase()}`);
    }
    if (result.devices.length > 1) {
      statusParts.push(`${result.devices.length} 个 ProductCode`);
    } else if (dev && dev.productcode !== null) {
      statusParts.push(`Product=0x${dev.productcode.toString(16).toUpperCase()}`);
    }
    if (entry.type === "gpio" && dev?.pdoIndices.di.length > 0) {
      statusParts.push(`DI(${dev.pdoIndices.di.length})`);
    }
    if (entry.type === "gpio" && dev?.pdoIndices.do.length > 0) {
      statusParts.push(`DO(${dev.pdoIndices.do.length})`);
    }
    entry.xmlStatus = statusParts.length ? `已解析: ${statusParts.join(", ")}` : "已解析 XML";
    ElMessage.success("XML 解析完成");
  };
  reader.onerror = () => {
    entry.xmlStatus = "";
    errorMsg.value = "文件读取失败，请重试。";
  };
  reader.readAsText(file);
}

function applyXmlDevice(entry, di) {
  const dev = xmlDevicesOf(entry)[di];
  if (!dev) return;
  if (dev.productcode !== null) {
    entry.productcode = dev.productcode;
    entry.productcodeInput = String(dev.productcode);
  }
  if (dev.typeName && !entry.name) {
    entry.name = dev.typeName.replace(/\s+/g, "_");
  }
  if (entry.type === "gpio") {
    if (dev.pdoIndices.di.length > 0) {
      entry.DI = dev.pdoIndices.di.map((idxVal) =>
        createPdoEntry({ index: idxVal, subindex: 1 })
      );
    }
    if (dev.pdoIndices.do.length > 0) {
      entry.DO = dev.pdoIndices.do.map((idxVal) =>
        createPdoEntry({ index: idxVal, subindex: 1 })
      );
    }
  }
}

function switchXmlDevice(idx, di) {
  const entry = entries.value[idx];
  if (!entry) return;
  entry.xmlSelectedDeviceIdx = di;
  applyXmlDevice(entry, di);
}

/* ---------- Hex 转换 ---------- */

function convertHex(idx) {
  const entry = entries.value[idx];
  if (!entry) return;
  ["vendorID", "productcode"].forEach((field) => {
    const inputField = field === "vendorID" ? "vendorIDInput" : "productcodeInput";
    const val = parseHexOrDec(entry[inputField]);
    if (val !== null) {
      entry[field] = val;
      entry[inputField] = String(val);
    } else if (!entry[inputField]) {
      entry[field] = null;
      entry[inputField] = "";
    }
  });
}

/* ---------- JSON 生成 ---------- */

function cleanPdo(arr) {
  return (arr ?? []).map(({ _key, ...rest }) => ({ ...rest }));
}

const generatedJson = computed(() => {
  const servo = {};
  const gpio = {};

  for (const entry of entries.value) {
    const name = entry.name || `device_${entry.id}`;

    if (entry.type === "servo") {
      servo[name] = {
        axisNum: entry.axisNum ?? 1,
        chineseName: entry.chineseName || "",
        clearEncodeMode: entry.clearEncodeMode ?? 0,
        name,
        productcode: entry.productcode ?? 0,
        vendorID: entry.vendorID ?? 0,
      };
    } else {
      gpio[name] = {
        AD_ratio: entry.AD_ratio ?? 1000,
        AI: cleanPdo(pdoList(entry, "AI")),
        AO: cleanPdo(pdoList(entry, "AO")),
        DI: cleanPdo(pdoList(entry, "DI")),
        DO: cleanPdo(pdoList(entry, "DO")),
        chineseName: entry.chineseName || "",
        name,
        productcode: entry.productcode ?? 0,
        vendorID: entry.vendorID ?? 0,
      };
    }
  }

  const slaveTypeLib = { servo, version: "1.0.0" };
  if (Object.keys(gpio).length > 0) {
    slaveTypeLib.gpio = gpio;
  }

  return JSON.stringify(slaveTypeLib, null, 2);
});

function downloadJson() {
  btnLoading.value = "export";
  setTimeout(() => {
    const blob = new Blob([generatedJson.value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "slaveTypeLib.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    btnLoading.value = null;
    ElMessage.success("JSON 已导出");
  }, 100);
}

async function copyJson() {
  btnLoading.value = "copy";
  await new Promise((r) => setTimeout(r, 100));
  try {
    await navigator.clipboard.writeText(generatedJson.value);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = generatedJson.value;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  btnLoading.value = null;
  ElMessage.success("JSON 已复制");
}

/* ---------- 进制转换 ---------- */

const convMode = ref("hex2dec");
const convInput = ref("");
const convResult = ref("");

function onConvInput() {
  if (convMode.value === "hex2dec") {
    const val = parseHexOrDec(convInput.value);
    convResult.value = val !== null ? String(val) : "";
  } else {
    const raw = convInput.value.trim();
    if (/^\d+$/.test(raw)) {
      const num = parseInt(raw, 10);
      convResult.value = "0x" + num.toString(16).toUpperCase();
    } else {
      convResult.value = "";
    }
  }
}

function copyConvResult() {
  if (!convResult.value) return;
  navigator.clipboard.writeText(convResult.value).catch(() => {});
  ElMessage.success("转换结果已复制");
}

watch(convMode, () => {
  convInput.value = "";
  convResult.value = "";
});
</script>

<style scoped>
.device-tool {
  width: min(1440px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.workspace-header,
.panel,
.side-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px;
}

.header-copy {
  min-width: 0;
  display: grid;
  gap: 9px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.workspace-header h1 {
  margin: 0;
  color: #111827;
  font-size: 24px;
  line-height: 1.15;
}

.header-metrics,
.header-actions,
.entry-actions,
.entry-tags,
.preview-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 9px;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}

.status-tag.small {
  min-height: 20px;
  padding: 0 7px;
  font-size: 12px;
}

.status-tag.primary {
  border-color: #d9ecff;
  background: #ecf5ff;
  color: #409eff;
}

.status-tag.success {
  border-color: #e1f3d8;
  background: #f0f9eb;
  color: #67c23a;
}

.status-tag.info {
  border-color: #e9e9eb;
  background: #f4f4f5;
  color: #909399;
}

.status-tag.warning {
  border-color: #faecd8;
  background: #fdf6ec;
  color: #e6a23c;
}

.btn-icon {
  display: inline-block;
  flex: 0 0 auto;
  margin-right: 5px;
  vertical-align: -2px;
}

.btn-icon.only {
  margin-right: 0;
}

.tool-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.tool-main,
.tool-sidebar {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.tool-sidebar {
  position: sticky;
  top: 16px;
}

.panel,
.side-panel {
  padding: 18px;
}

.section-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-bar h2,
.side-title h3,
.form-section-head h4 {
  margin: 0;
}

.section-bar h2 {
  font-size: 18px;
}

.section-bar p {
  margin: 4px 0 0;
  color: var(--muted);
}

.device-list {
  display: grid;
  gap: 14px;
}

.device-card {
  overflow: hidden;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #fbfcfe;
}

.entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid #e4e9f1;
  background: #fff;
}

.entry-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.entry-index {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 8px;
  background: #eef4ff;
  color: var(--primary);
  font-size: 13px;
  font-weight: 800;
}

.entry-name {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.entry-name h3 {
  margin: 0;
  overflow: hidden;
  color: #172033;
  font-size: 16px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-body {
  display: grid;
  gap: 16px;
  padding: 14px;
}

.upload-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px dashed #b8c7dc;
  border-radius: 8px;
  background: #f8fafc;
}

.upload-info {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 8px;
  background: #e8f5ef;
  color: #047857;
}

.upload-info strong {
  display: block;
  font-size: 14px;
}

.upload-info p {
  margin: 2px 0 0;
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-section {
  display: grid;
  gap: 12px;
}

.form-section-head,
.side-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;
}

.form-section-head h4,
.side-title h3 {
  font-size: 15px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(190px, 1fr));
  gap: 12px;
}

.stacked-field {
  width: 100%;
  display: grid;
  gap: 8px;
}

.field-hint {
  margin: -2px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.pdo-section {
  padding-top: 2px;
}

.pdo-collapse {
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}

.collapse-title {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-right: 12px;
  font-weight: 700;
}

.pdo-list {
  display: grid;
  gap: 8px;
}

.pdo-row {
  display: grid;
  grid-template-columns: 70px repeat(4, minmax(106px, 1fr)) 34px;
  gap: 8px;
  align-items: end;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.pdo-row:has(.pdo-field:nth-of-type(3)):not(:has(.pdo-field:nth-of-type(4))) {
  grid-template-columns: 70px repeat(3, minmax(120px, 1fr)) 34px;
}

.pdo-label {
  align-self: center;
  color: var(--primary);
  font-size: 12px;
  font-weight: 800;
}

.pdo-field {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.pdo-field span {
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}

.pdo-footer {
  display: flex;
  justify-content: flex-start;
}

.preview-panel {
  padding: 0;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
}

.preview-toggle {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 0;
  background: transparent;
  color: #172033;
  cursor: pointer;
  font-weight: 800;
}

.chevron {
  color: var(--muted);
  transition: transform 0.16s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.json-preview {
  max-height: 460px;
  margin: 0;
  padding: 16px 18px;
  overflow: auto;
  border-top: 1px solid #e5e7eb;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 12px;
  line-height: 1.6;
}

.json-preview code {
  font-family: "SF Mono", "Fira Code", Consolas, monospace;
}

.error-alert {
  border-radius: 8px;
}

.summary-list {
  display: grid;
  gap: 8px;
  margin: 14px 0;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
}

.summary-row strong {
  color: #111827;
}

.full-width {
  width: 100%;
}

.converter-tabs {
  width: 100%;
  margin-top: 12px;
}

.converter-tabs :deep(.el-radio-button) {
  flex: 1;
}

.converter-tabs :deep(.el-radio-button__inner) {
  width: 100%;
  padding-right: 8px;
  padding-left: 8px;
}

.converter-form {
  margin-top: 12px;
}

.ref-table {
  width: 100%;
  margin-top: 12px;
}

.param-collapse {
  border: 0;
}

.param-collapse :deep(.el-collapse-item__header) {
  border-bottom: 0;
}

.param-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: 0;
}

.collapse-side-title {
  width: 100%;
}

.param-list {
  display: grid;
  gap: 8px;
  margin: 0;
}

.param-list dt {
  color: var(--primary);
  font-family: "SF Mono", "Fira Code", Consolas, monospace;
  font-size: 12px;
  font-weight: 800;
}

.param-list dd {
  margin: -4px 0 4px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

:deep(.el-form-item) {
  margin-bottom: 0;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-upload) {
  display: block;
}

@media (max-width: 1120px) {
  .tool-layout {
    grid-template-columns: 1fr;
  }

  .tool-sidebar {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 760px) {
  .workspace-header,
  .entry-header,
  .upload-card,
  .preview-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions,
  .entry-actions,
  .preview-actions {
    width: 100%;
  }

  .header-actions .el-button,
  .preview-actions .el-button,
  .upload-card .el-button {
    flex: 1;
  }

  .tool-sidebar,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .entry-name h3 {
    white-space: normal;
  }

  .upload-info p {
    white-space: normal;
  }

  .pdo-row,
  .pdo-row:has(.pdo-field:nth-of-type(3)):not(:has(.pdo-field:nth-of-type(4))) {
    grid-template-columns: 1fr;
  }

  .pdo-label {
    align-self: start;
  }
}
</style>
