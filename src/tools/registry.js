import A4ImageTool from "./a4-image/A4ImageTool.vue";
import BaseConverterTool from "./base-converter/BaseConverterTool.vue";
import DeviceIdentifyTool from "./device-identify/DeviceIdentifyTool.vue";
import EniHelperTool from "./eni-helper/EniHelperTool.vue";
import GearRatioTool from "./gear-ratio/GearRatioTool.vue";
import IdPhotoTool from "./id-photo/IdPhotoTool.vue";
import BackgroundPackageTool from "./background-package/BackgroundPackageTool.vue";
import ModbusTextTool from "./modbus-text/ModbusTextTool.vue";

export const toolCategories = [];

export const tools = [
  {
    id: "modbus-text",
    title: "modbus\u6c49\u5b57\u89e3\u6790",
    navLabel: "modbus\u6c49\u5b57\u89e3\u6790",
    description: "\u89e3\u6790 Modbus TCP / RTU \u62a5\u6587\uff0c\u8f6c\u6362\u5b57\u8282\u5e8f\u5e76\u6309 UTF-8 \u6216 GBK \u89e3\u7801\u3002",
    category: "device",
    icon: "languages",
    path: "/tools/modbus-text",
    aliases: ["/modbus-text"],
    component: ModbusTextTool,
  },
  {
    id: "background-package",
    title: "背景资源打包",
    navLabel: "背景资源打包",
    description: "转换 Logo、开机图、升级背景、关于信息和二维码，并打包成 QR.zip。",
    category: "image",
    icon: "package",
    path: "/tools/background-package",
    aliases: ["/background-package"],
    component: BackgroundPackageTool,
  },
  {
    id: "id-photo",
    title: "证件照",
    navLabel: "证件照",
    description: "拍照、裁切、换底色，支持一寸/二寸，导出证件照。",
    category: "image",
    icon: "camera",
    visibility: "more",
    path: "/tools/id-photo",
    component: IdPhotoTool,
  },
  {
    id: "device-identify",
    title: "设备识别",
    navLabel: "设备识别",
    description: "上传 XML / ESI 文件或手动填写，生成伺服与 IO 板 slaveTypeLib JSON。",
    category: "device",
    icon: "cpu",
    path: "/tools/device-identify",
    aliases: ["/device-identify"],
    component: DeviceIdentifyTool,
  },
  {
    id: "a4-image",
    title: "A4 合图",
    navLabel: "A4 合图",
    description: "两张图片自动排到 A4 页面，支持打印和 PNG 导出。",
    category: "print",
    icon: "images",
    visibility: "more",
    path: "/tools/a4-image",
    aliases: ["/a4-image"],
    component: A4ImageTool,
  },
  {
    id: "eni-helper",
    title: "ENI 查询下载助手",
    navLabel: "ENI 查询下载助手",
    description: "内嵌 ENI 查询下载服务，保留外部打开入口。",
    category: "download",
    icon: "search",
    path: "/tools/eni-helper",
    aliases: ["/eni-helper"],
    component: EniHelperTool,
  },
  {
    id: "gear-ratio",
    title: "减速比计算",
    navLabel: "减速比计算",
    description: "按原始减速比、显示角度和实测角度计算机器人关节实际减速比。",
    category: "robot",
    icon: "calculator",
    path: "/tools/gear-ratio",
    aliases: ["/gear-ratio"],
    component: GearRatioTool,
  },
  {
    id: "base-converter",
    title: "进制转化",
    navLabel: "进制转化",
    description: "输入二进制、十进制或十六进制，快速得到常见进制结果。",
    category: "number",
    icon: "binary",
    path: "/tools/base-converter",
    aliases: ["/base-converter"],
    component: BaseConverterTool,
  },
];

export function normalizePath(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

export function findToolByPath(pathname) {
  const normalizedPath = normalizePath(pathname);
  return tools.find((tool) => {
    const aliases = tool.aliases ?? [];
    return tool.path === normalizedPath || aliases.includes(normalizedPath);
  });
}
