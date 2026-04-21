# Palette Flow

一个最小可用的 `gpt-image-2` 图像生成静态站点，适合直接部署到 GitHub Pages。

## 特点

- 纯静态：只有 `HTML + CSS + JavaScript`
- 可直接部署到 GitHub Pages
- 页面样式已经做好，适合先验证 MVP
- `API Endpoint`、`API Key`、`Model` 保存在浏览器本地 `localStorage`
- 支持展示 `b64_json` 和 `url` 两类常见图片返回格式

## 重要安全说明

不要把真实 API Key 写进仓库代码里，也不要提交到 GitHub。
这个项目的做法是：

- 页面公开托管在 GitHub Pages
- 用户第一次打开页面时，在浏览器里填写 `API Endpoint` 和 `API Key`
- 这些值只保存在当前浏览器本地

这适合 MVP 验证，但 **不适合** 做公开商用版本。公开产品建议改成：

- 前端调用你自己的后端
- 后端再去请求图像生成接口
- 把密钥放在后端环境变量中

## 本地预览

```bash
cd gpt-image-2-all
python3 -m http.server 8000
```

然后打开：`http://localhost:8000`

## 浏览器直连接口的前提

因为这是 GitHub Pages 静态站点，图片生成请求是从浏览器直接发到你的接口，所以接口需要允许跨域访问。

如果页面提示 `Failed to fetch`，通常优先检查：

- 接口地址是否正确
- 该接口是否允许来自 GitHub Pages 域名的 `CORS`
- 代理服务是否支持浏览器直接调用

## 部署到 GitHub Pages

仓库已经包含 GitHub Actions 工作流：

- 推送到 `main` 分支后自动部署
- 部署目标为 GitHub Pages

### 手动步骤

1. 创建 GitHub 仓库
2. 推送代码到 `main`
3. 在 GitHub 仓库 Settings -> Pages 中确认 Source 使用 GitHub Actions
4. 等待 Actions 完成部署

## 可修改项

如果你的接口兼容 OpenAI Images API，可以直接使用当前实现。

默认请求体示例：

```json
{
  "model": "gpt-image-2",
  "prompt": "your prompt",
  "n": 1,
  "size": "1024x1024",
  "background": "transparent"
}
```

如果你的代理服务字段不同，可以在 `app.js` 里改 `payload` 结构。
