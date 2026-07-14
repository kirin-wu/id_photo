# 办公工具箱

基于 Vue 3 + Vite 的日常办公工具集合网站。项目优先放置适合本地浏览器处理的轻量工具，目前包含一寸照生成和 A4 图片合成打印。

默认展示工具的操作说明见 [其他工具使用说明](./其他工具使用说明.md)。

## 当前工具

- 一寸照：拍照/导入、裁切、换底色，导出常用证件照尺寸。
- A4 合图：两张图片上下排版，支持打印和 PNG 导出。

## 启动

```bash
npm install
npm run dev
```

如果默认端口被占用：

```bash
npm run dev -- --port 3002
```

启动后电脑打开终端里显示的本地地址，例如 `http://localhost:3002`。手机和电脑连同一个 Wi-Fi 后，可以打开终端里显示的 `LAN` 地址。

## 目录结构

```text
src/
  App.vue                 # 路由分发 + 工具页返回栏
  tools/
    registry.js           # 工具分类、路径和组件注册
    id-photo/
      IdPhotoTool.vue     # 一寸照工具
    a4-image/
      A4ImageTool.vue     # A4 合图工具
  views/
    HomeView.vue          # 工具总览页（搜索、统计）
  main.js
  styles.css              # 全局变量和基础样式
```

## 添加新工具

1. 在 `src/tools/` 下新建工具目录，例如 `pdf-merge/`。
2. 新增工具组件，例如 `PdfMergeTool.vue`。
3. 在 `src/tools/registry.js` 中导入组件并追加工具配置。
4. 如需新分类，在 `toolCategories` 中追加分类。

## 部署

按 Vite 项目部署即可：

```text
Framework preset: Vue 或 Vite
Build command: npm run build
Build output directory: dist
```
