import A4ImageTool from "./a4-image/A4ImageTool.vue";
import IdPhotoTool from "./id-photo/IdPhotoTool.vue";
import ServoIdentifyTool from "./servo-identify/ServoIdentifyTool.vue";

export const toolCategories = [];

export const tools = [
  {
    id: "id-photo",
    title: "证件照",
    navLabel: "证件照",
    description: "拍照、裁切、换底色，支持一寸/二寸，导出证件照。",
    category: "image",
    icon: "camera",
    path: "/tools/id-photo",
    component: IdPhotoTool,
  },
  {
    id: "servo-identify",
    title: "伺服识别",
    navLabel: "伺服识别",
    description: "上传 XML 或手动填写，生成伺服识别 JSON 文件。",
    category: "device",
    icon: "cpu",
    path: "/tools/servo-identify",
    component: ServoIdentifyTool,
  },
  {
    id: "a4-image",
    title: "A4 合图",
    navLabel: "A4 合图",
    description: "两张图片自动排到 A4 页面，支持打印和 PNG 导出。",
    category: "print",
    icon: "images",
    path: "/tools/a4-image",
    aliases: ["/a4-image"],
    component: A4ImageTool,
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
