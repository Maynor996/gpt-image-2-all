const STORAGE_KEY = "palette-flow-config";

const form = document.querySelector("#generatorForm");
const endpointInput = document.querySelector("#endpointInput");
const apiKeyInput = document.querySelector("#apiKeyInput");
const modelInput = document.querySelector("#modelInput");
const countInput = document.querySelector("#countInput");
const sizeInput = document.querySelector("#sizeInput");
const backgroundInput = document.querySelector("#backgroundInput");
const promptInput = document.querySelector("#promptInput");
const generateButton = document.querySelector("#generateButton");
const clearConfigButton = document.querySelector("#clearConfigButton");
const toggleKeyButton = document.querySelector("#toggleKeyButton");
const requestStatus = document.querySelector("#requestStatus");
const emptyState = document.querySelector("#emptyState");
const errorBox = document.querySelector("#errorBox");
const resultsGrid = document.querySelector("#resultsGrid");
const payloadPreview = document.querySelector("#payloadPreview");
const template = document.querySelector("#resultCardTemplate");
const presetButtons = Array.from(document.querySelectorAll(".preset-chip"));

hydrateSavedConfig();
wireEvents();

function wireEvents() {
  form.addEventListener("submit", handleSubmit);
  clearConfigButton.addEventListener("click", clearSavedConfig);
  toggleKeyButton.addEventListener("click", toggleKeyVisibility);

  [endpointInput, apiKeyInput, modelInput, countInput, sizeInput, backgroundInput].forEach((element) => {
    element.addEventListener("change", persistConfig);
    element.addEventListener("blur", persistConfig);
  });

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.prompt || "";
      promptInput.focus();
    });
  });
}

function hydrateSavedConfig() {
  const raw = localStorage.getItem(STORAGE_KEY);

  endpointInput.value = "https://apipro.maynor1024.live/v1/images/generations";
  modelInput.value = "gpt-image-2";

  if (!raw) {
    return;
  }

  try {
    const saved = JSON.parse(raw);
    endpointInput.value = saved.endpoint || endpointInput.value;
    apiKeyInput.value = saved.apiKey || "";
    modelInput.value = saved.model || modelInput.value;
    countInput.value = String(saved.count || countInput.value);
    sizeInput.value = saved.size || sizeInput.value;
    backgroundInput.value = saved.background || backgroundInput.value;
  } catch (error) {
    console.warn("Failed to parse saved config", error);
  }
}

function persistConfig() {
  const payload = {
    endpoint: endpointInput.value.trim(),
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim(),
    count: Number(countInput.value),
    size: sizeInput.value,
    background: backgroundInput.value,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clearSavedConfig() {
  localStorage.removeItem(STORAGE_KEY);
  apiKeyInput.value = "";
  endpointInput.value = "https://apipro.maynor1024.live/v1/images/generations";
  modelInput.value = "gpt-image-2";
  countInput.value = "1";
  sizeInput.value = "1024x1024";
  backgroundInput.value = "auto";
  requestStatus.textContent = "已清空本地配置";
}

function toggleKeyVisibility() {
  const shouldShow = apiKeyInput.type === "password";
  apiKeyInput.type = shouldShow ? "text" : "password";
  toggleKeyButton.textContent = shouldShow ? "隐藏" : "显示";
}

async function handleSubmit(event) {
  event.preventDefault();
  hideError();
  clearResults();
  persistConfig();

  const endpoint = endpointInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim();
  const prompt = promptInput.value.trim();
  const size = sizeInput.value;
  const background = backgroundInput.value;
  const count = Number(countInput.value);

  if (!endpoint || !apiKey || !model || !prompt) {
    showError("请先完整填写 endpoint、API Key、model 和 prompt。");
    return;
  }

  const payload = {
    model,
    prompt,
    n: count,
  };

  if (size !== "auto") {
    payload.size = size;
  }

  if (background !== "auto") {
    payload.background = background;
  }

  payloadPreview.textContent = JSON.stringify(maskPayload(payload), null, 2);
  requestStatus.textContent = "生成中...";
  generateButton.disabled = true;
  emptyState.classList.add("hidden");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      const message = data?.error?.message || data?.message || `请求失败：${response.status}`;
      throw new Error(message);
    }

    const images = normalizeImages(data);

    if (!images.length) {
      throw new Error("接口返回成功，但没有拿到可显示的图片数据。");
    }

    renderResults(images);
    requestStatus.textContent = `已生成 ${images.length} 张图片`;
  } catch (error) {
    requestStatus.textContent = "生成失败";
    showError(formatErrorMessage(error));
    emptyState.classList.remove("hidden");
  } finally {
    generateButton.disabled = false;
  }
}

async function parseJsonSafely(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text || response.statusText };
  }
}

function normalizeImages(data) {
  const rawItems = Array.isArray(data?.data) ? data.data : [];

  return rawItems
    .map((item, index) => {
      if (item?.b64_json) {
        return {
          src: `data:image/png;base64,${item.b64_json}`,
          label: `结果 ${index + 1}`,
        };
      }

      if (item?.url) {
        return {
          src: item.url,
          label: `结果 ${index + 1}`,
        };
      }

      return null;
    })
    .filter(Boolean);
}

function renderResults(images) {
  resultsGrid.innerHTML = "";

  images.forEach((image, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const img = node.querySelector("img");
    const title = node.querySelector(".result-title");
    const link = node.querySelector(".download-link");

    img.src = image.src;
    img.alt = `${image.label} 预览图`;
    title.textContent = image.label;
    link.href = image.src;
    link.download = `palette-flow-${index + 1}.png`;

    resultsGrid.appendChild(node);
  });
}

function clearResults() {
  resultsGrid.innerHTML = "";
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function maskPayload(payload) {
  return {
    ...payload,
    note: "API Key 通过 Authorization Header 发送，未展示在页面里。",
  };
}

function formatErrorMessage(error) {
  if (!error?.message) {
    return "生成失败，请稍后再试。";
  }

  if (error.message === "Failed to fetch") {
    return "请求没有成功发出。请优先检查接口地址是否可访问，以及该接口是否已开启浏览器跨域访问（CORS）。";
  }

  return error.message;
}
