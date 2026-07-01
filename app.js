const STORAGE_KEY = "color-safari-wheel-v2";

const defaults = [
  { id: "terracotta", name: "Terracotta", hex: "#C16A5B" },
  { id: "dusty-orange", name: "Dusty Orange", hex: "#D08A63" },
  { id: "mustard", name: "Mustard", hex: "#D1B15E" },
  { id: "sage", name: "Sage", hex: "#8DA487" },
  { id: "slate-blue", name: "Slate Blue", hex: "#6D8AA7" },
  { id: "indigo", name: "Indigo", hex: "#5B648E" },
  { id: "lavender", name: "Lavender", hex: "#A294B8" },
  { id: "white", name: "White", hex: "#F5F3F0" },
  { id: "black", name: "Black", hex: "#2B2B2B" },
];

const els = {
  wheel: document.querySelector("#wheel"),
  wheelLabels: document.querySelector("#wheelLabels"),
  wheelButton: document.querySelector("#wheelButton"),
  shuffleButton: document.querySelector("#shuffleButton"),
  resetButton: document.querySelector("#resetButton"),
  resultCard: document.querySelector("#resultCard"),
  resultName: document.querySelector("#resultName"),
  resultSwatch: document.querySelector("#resultSwatch"),
  resultHexInput: document.querySelector("#resultHexInput"),
  copyButton: document.querySelector("#copyButton"),
  addColorForm: document.querySelector("#addColorForm"),
  newColorName: document.querySelector("#newColorName"),
  newColorHex: document.querySelector("#newColorHex"),
  newColorPicker: document.querySelector("#newColorPicker"),
  formMessage: document.querySelector("#formMessage"),
  colorList: document.querySelector("#colorList"),
  colorCount: document.querySelector("#colorCount"),
  toast: document.querySelector("#toast"),
  particles: document.querySelector("#particles"),
};

let colors = loadColors();
let currentRotation = 0;
let isSpinning = false;
let selectedColor = null;
let toastTimer = null;

function loadColors() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length >= 2) {
      return saved.map(normalizeColor).filter(Boolean);
    }
  } catch (error) {
    console.warn("Could not load saved palette", error);
  }
  return defaults.map((color) => ({ ...color }));
}

function saveColors() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

function normalizeColor(color) {
  if (!color || !color.name || !isValidHex(color.hex)) return null;
  return {
    id: color.id || crypto.randomUUID(),
    name: String(color.name).trim(),
    hex: normalizeHex(color.hex),
  };
}

function normalizeHex(value) {
  const trimmed = String(value).trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return withHash.toUpperCase();
}

function isValidHex(value) {
  return /^#?[0-9A-Fa-f]{6}$/.test(String(value).trim());
}

function buildWheelGradient() {
  const slice = 360 / colors.length;
  return colors
    .map((color, index) => {
      const start = index * slice;
      const end = (index + 1) * slice;
      return `${color.hex} ${start}deg ${end}deg`;
    })
    .join(", ");
}

function renderWheel() {
  els.wheel.style.setProperty("--wheel-gradient", `conic-gradient(${buildWheelGradient()})`);
  els.wheel.style.transform = `rotate(${currentRotation}deg)`;
  els.wheelLabels.style.transform = `rotate(${currentRotation}deg)`;
  renderWheelLabels();
}

function renderWheelLabels() {
  const slice = 360 / colors.length;
  const radius = Math.max(92, els.wheelButton.offsetWidth * 0.34);
  els.wheelLabels.innerHTML = colors
    .map((color, index) => {
      const angle = index * slice + slice / 2;
      const readable = getLuminance(color.hex) > 0.62;
      return `<span class="wheel-label ${readable ? "light-label" : ""}" style="transform: rotate(${angle}deg) translateY(-${radius}px) rotate(90deg);">${escapeHtml(shortName(color.name))}</span>`;
    })
    .join("");
}

function shortName(name) {
  return name.length > 13 ? `${name.slice(0, 12)}…` : name;
}

function renderColorList() {
  els.colorCount.textContent = `${colors.length} color${colors.length === 1 ? "" : "s"}`;
  els.colorList.innerHTML = "";

  colors.forEach((color, index) => {
    const row = document.createElement("div");
    row.className = "color-row";
    row.innerHTML = `
      <span class="color-dot" style="background:${color.hex}" aria-hidden="true"></span>
      <input type="text" value="${escapeAttribute(color.name)}" aria-label="Color name for ${escapeAttribute(color.name)}" data-field="name" />
      <input class="hex-input" type="text" value="${color.hex}" maxlength="7" aria-label="Hex value for ${escapeAttribute(color.name)}" data-field="hex" />
      <button class="remove-button" type="button" aria-label="Remove ${escapeAttribute(color.name)}" ${colors.length <= 2 ? "disabled" : ""}>×</button>
    `;

    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => updateColor(index, input.dataset.field, input.value));
      input.addEventListener("blur", () => {
        if (input.dataset.field === "hex") input.value = colors[index].hex;
        if (input.dataset.field === "name") input.value = colors[index].name;
      });
    });

    row.querySelector("button").addEventListener("click", () => removeColor(index));
    els.colorList.appendChild(row);
  });
}

function render() {
  renderWheel();
  renderColorList();
  saveColors();
}

function updateColor(index, field, value) {
  if (isSpinning) return;

  if (field === "name") {
    const name = value.trim();
    if (!name) {
      showMessage("Color names cannot be empty.", true);
      renderColorList();
      return;
    }
    colors[index].name = name;
  }

  if (field === "hex") {
    if (!isValidHex(value)) {
      showMessage("Use a valid hex value, for example #C16A5B.", true);
      renderColorList();
      return;
    }
    colors[index].hex = normalizeHex(value);
  }

  if (selectedColor?.id === colors[index].id) {
    selectedColor = colors[index];
    updateResult(selectedColor);
  }

  render();
}

function removeColor(index) {
  if (isSpinning || colors.length <= 2) return;
  const removed = colors.splice(index, 1)[0];
  if (selectedColor?.id === removed.id) clearResult();
  showToast(`${removed.name} removed`);
  render();
}

function addColor(event) {
  event.preventDefault();
  if (isSpinning) return;

  const name = els.newColorName.value.trim();
  const hex = normalizeHex(els.newColorHex.value);

  if (!name) {
    showMessage("Give the color a name.", true);
    return;
  }
  if (!isValidHex(hex)) {
    showMessage("Use a valid hex value, for example #C16A5B.", true);
    return;
  }

  colors.splice(colors.length - 2, 0, {
    id: crypto.randomUUID(),
    name,
    hex,
  });
  els.newColorName.value = "";
  showMessage(`${name} added.`);
  render();
}

function shufflePalette() {
  if (isSpinning) return;
  colors = [...colors].sort(() => Math.random() - 0.5);
  showToast("Palette shuffled");
  render();
}

function resetPalette() {
  if (isSpinning) return;
  colors = defaults.map((color) => ({ ...color }));
  selectedColor = null;
  clearResult();
  showToast("Palette reset");
  render();
}

function spin() {
  if (isSpinning || colors.length < 2) return;
  isSpinning = true;
  setControlsDisabled(true);

  const winnerIndex = Math.floor(Math.random() * colors.length);
  const slice = 360 / colors.length;
  const winnerCenter = winnerIndex * slice + slice / 2;
  // CSS conic gradients start at 12 o'clock by default, which is exactly
  // where the fixed pointer sits. Rotate the chosen slice center to 0deg
  // so the visual wheel and the result card always match.
  const pointerAngle = 0;
  const targetModulo = pointerAngle - winnerCenter;
  const normalizedCurrent = ((currentRotation % 360) + 360) % 360;
  const normalizedTarget = ((targetModulo % 360) + 360) % 360;
  const delta = (normalizedTarget - normalizedCurrent + 360) % 360;
  const extraSpins = 5 + Math.floor(Math.random() * 4);
  currentRotation += extraSpins * 360 + delta;

  els.wheel.style.transitionDuration = "4.2s";
  els.wheelLabels.style.transitionDuration = "4.2s";
  renderWheel();

  window.setTimeout(() => {
    selectedColor = colors[winnerIndex];
    updateResult(selectedColor);
    burst(selectedColor.hex);
    isSpinning = false;
    setControlsDisabled(false);
    showToast(`Your color is ${selectedColor.name}`);
  }, 4300);
}

function setControlsDisabled(disabled) {
  els.wheelButton.disabled = disabled;
  els.shuffleButton.disabled = disabled;
  els.resetButton.disabled = disabled;
  els.addColorForm.querySelectorAll("input, button").forEach((element) => {
    element.disabled = disabled;
  });
  els.colorList.querySelectorAll("input, button").forEach((element) => {
    element.disabled = disabled || (element.classList.contains("remove-button") && colors.length <= 2);
  });
}

function updateResult(color) {
  els.resultCard.classList.remove("is-empty");
  els.resultName.textContent = color.name;
  els.resultSwatch.style.background = color.hex;
  els.resultHexInput.value = color.hex;
  els.copyButton.disabled = false;
}

function clearResult() {
  els.resultCard.classList.add("is-empty");
  els.resultName.textContent = "Ready?";
  els.resultSwatch.style.background = "linear-gradient(135deg, #f1eee7, #fffdf8)";
  els.resultHexInput.value = "Spin to begin";
  els.copyButton.disabled = true;
}

async function copyHex() {
  if (!selectedColor) return;
  try {
    await navigator.clipboard.writeText(selectedColor.hex);
    showToast("Hex copied");
  } catch {
    els.resultHexInput.select();
    document.execCommand("copy");
    showToast("Hex copied");
  }
}

function showMessage(message, isError = false) {
  els.formMessage.textContent = message;
  els.formMessage.style.color = isError ? "#9b3b31" : "#6f6a63";
  window.setTimeout(() => {
    if (els.formMessage.textContent === message) els.formMessage.textContent = "";
  }, 2800);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function burst(hex) {
  const count = 26;
  const originX = window.innerWidth / 2;
  const originY = window.innerHeight * 0.42;

  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.style.left = `${originX}px`;
    particle.style.top = `${originY}px`;
    particle.style.background = i % 3 === 0 ? hex : colors[Math.floor(Math.random() * colors.length)].hex;
    particle.style.setProperty("--x", `${(Math.random() - 0.5) * 360}px`);
    particle.style.setProperty("--y", `${120 + Math.random() * 220}px`);
    els.particles.appendChild(particle);
    window.setTimeout(() => particle.remove(), 950);
  }
}

function getLuminance(hex) {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)
    .map((channel) => parseInt(channel, 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

els.wheelButton.addEventListener("click", spin);
els.shuffleButton.addEventListener("click", shufflePalette);
els.resetButton.addEventListener("click", resetPalette);
els.copyButton.addEventListener("click", copyHex);
els.addColorForm.addEventListener("submit", addColor);

els.newColorPicker.addEventListener("input", (event) => {
  els.newColorHex.value = event.target.value.toUpperCase();
});
els.newColorHex.addEventListener("input", (event) => {
  if (isValidHex(event.target.value)) {
    els.newColorPicker.value = normalizeHex(event.target.value);
  }
});

els.wheelButton.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "Enter") {
    event.preventDefault();
    spin();
  }
});

render();
clearResult();
