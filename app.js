const defaultColors = [
  { id: "red", name: "Red", hex: "#FF0000" },
  { id: "orange", name: "Orange", hex: "#FFA500" },
  { id: "yellow", name: "Yellow", hex: "#FFFF00" },
  { id: "green", name: "Green", hex: "#008000" },
  { id: "blue", name: "Blue", hex: "#0000FF" },
  { id: "indigo", name: "Indigo", hex: "#4B0082" },
  { id: "violet", name: "Violet", hex: "#EE82EE" },
  { id: "black", name: "Black", hex: "#000000" },
  { id: "white", name: "White", hex: "#FFFFFF" }
];

const storageKey = "color-safari-wheel-v1";
const minimumColors = 2;

const wheel = document.querySelector("#wheel");
const wheelButton = document.querySelector("#wheelButton");
const spinButton = document.querySelector("#spinButton");
const shuffleButton = document.querySelector("#shuffleButton");
const resetButton = document.querySelector("#resetButton");
const resultCard = document.querySelector("#resultCard");
const resultSwatch = document.querySelector("#resultSwatch");
const resultName = document.querySelector("#resultName");
const resultHex = document.querySelector("#resultHex");
const copyButton = document.querySelector("#copyButton");
const colorList = document.querySelector("#colorList");
const colorCount = document.querySelector("#colorCount");
const addColorForm = document.querySelector("#addColorForm");
const newColorName = document.querySelector("#newColorName");
const newColorHex = document.querySelector("#newColorHex");
const newColorPicker = document.querySelector("#newColorPicker");
const formMessage = document.querySelector("#formMessage");
const toast = document.querySelector("#toast");
const particles = document.querySelector("#particles");

let colors = loadColors();
let isSpinning = false;
let totalRotation = 0;
let selectedColor = null;
let toastTimer;

render();

wheelButton.addEventListener("click", spinWheel);
spinButton.addEventListener("click", spinWheel);
shuffleButton.addEventListener("click", shufflePalette);
resetButton.addEventListener("click", resetPalette);
copyButton.addEventListener("click", copySelectedHex);

newColorHex.addEventListener("input", () => {
  const normalized = normalizeHex(newColorHex.value);
  if (isValidHex(normalized)) {
    newColorPicker.value = normalized;
  }
});

newColorPicker.addEventListener("input", () => {
  newColorHex.value = newColorPicker.value.toUpperCase();
});

addColorForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = newColorName.value.trim();
  const hex = normalizeHex(newColorHex.value);

  if (!name) {
    showFormMessage("Give the color a name first.", true);
    return;
  }

  if (!isValidHex(hex)) {
    showFormMessage("Use a valid hex value, for example #8A5CF6.", true);
    return;
  }

  const uniqueName = makeUniqueName(name);
  colors.push({ id: crypto.randomUUID(), name: uniqueName, hex });
  selectedColor = null;
  persist();
  render();
  addColorForm.reset();
  newColorHex.value = "#8A5CF6";
  newColorPicker.value = "#8A5CF6";
  showFormMessage(`${uniqueName} was added to the wheel.`, false);
});

function spinWheel() {
  if (isSpinning || colors.length < minimumColors) return;

  isSpinning = true;
  setControlsDisabled(true);
  document.body.classList.add("is-spinning");
  resultCard.classList.remove("is-empty");
  resultName.textContent = "Spinning…";
  resultHex.textContent = "The city is choosing your color.";
  copyButton.disabled = true;

  const winnerIndex = Math.floor(Math.random() * colors.length);
  const segmentAngle = 360 / colors.length;
  const winnerCenterAngle = winnerIndex * segmentAngle + segmentAngle / 2;
  const targetRotation = (360 - winnerCenterAngle) % 360;
  const currentRotation = mod(totalRotation, 360);
  const deltaToTarget = mod(targetRotation - currentRotation, 360);
  const fullSpins = randomInteger(5, 8) * 360;
  const finalRotation = totalRotation + fullSpins + deltaToTarget;

  totalRotation = finalRotation;
  wheel.style.transform = `rotate(${finalRotation}deg)`;

  window.setTimeout(() => {
    selectedColor = colors[winnerIndex];
    isSpinning = false;
    setControlsDisabled(false);
    document.body.classList.remove("is-spinning");
    updateResult(selectedColor);
    burst(selectedColor.hex);
    showToast(`Your color is ${selectedColor.name}.`);
  }, 4300);
}

function render() {
  renderWheel();
  renderColorList();
  colorCount.textContent = `${colors.length} ${colors.length === 1 ? "color" : "colors"}`;
  setControlsDisabled(isSpinning);

  if (selectedColor) {
    const stillExists = colors.some((color) => color.id === selectedColor.id);
    if (stillExists) updateResult(selectedColor);
  }
}

function renderWheel() {
  const segmentAngle = 360 / colors.length;
  const gap = Math.min(0.9, segmentAngle * 0.06);
  const gradient = colors
    .map((color, index) => {
      const start = index * segmentAngle;
      const end = (index + 1) * segmentAngle;
      return `${color.hex} ${start + gap / 2}deg ${end - gap / 2}deg, rgba(23,22,21,0.16) ${end - gap / 2}deg ${end}deg`;
    })
    .join(", ");

  wheel.style.background = `conic-gradient(from 0deg, ${gradient})`;
}

function renderColorList() {
  colorList.innerHTML = "";
  const canRemove = colors.length > minimumColors;

  colors.forEach((color) => {
    const item = document.createElement("div");
    item.className = "color-item";

    const dot = document.createElement("span");
    dot.className = "color-dot";
    dot.style.background = color.hex;
    dot.title = `${color.name} ${color.hex}`;

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = color.name;
    nameInput.ariaLabel = `Name for ${color.name}`;
    nameInput.disabled = isSpinning;
    nameInput.addEventListener("change", () => updateColor(color.id, { name: nameInput.value.trim() || color.name }));

    const hexInput = document.createElement("input");
    hexInput.type = "text";
    hexInput.value = color.hex;
    hexInput.maxLength = 7;
    hexInput.ariaLabel = `Hex value for ${color.name}`;
    hexInput.disabled = isSpinning;
    hexInput.addEventListener("change", () => {
      const hex = normalizeHex(hexInput.value);
      if (!isValidHex(hex)) {
        showToast("That hex value is not valid.");
        hexInput.value = color.hex;
        return;
      }
      updateColor(color.id, { hex });
    });

    const removeButton = document.createElement("button");
    removeButton.className = "remove-button";
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.ariaLabel = `Remove ${color.name}`;
    removeButton.disabled = isSpinning || !canRemove;
    removeButton.title = canRemove ? `Remove ${color.name}` : "Keep at least two colors";
    removeButton.addEventListener("click", () => removeColor(color.id));

    item.append(dot, nameInput, hexInput, removeButton);
    colorList.append(item);
  });

  if (!canRemove) {
    const message = document.createElement("p");
    message.className = "helper";
    message.textContent = "Keep at least two colors so the wheel can still make a choice.";
    colorList.append(message);
  }
}

function updateColor(id, updates) {
  colors = colors.map((color) => {
    if (color.id !== id) return color;
    const next = { ...color, ...updates };
    if (updates.name) next.name = makeUniqueName(updates.name, id);
    return next;
  });

  if (selectedColor?.id === id) {
    selectedColor = colors.find((color) => color.id === id);
  }

  persist();
  render();
}

function removeColor(id) {
  if (colors.length <= minimumColors) return;
  colors = colors.filter((color) => color.id !== id);

  if (selectedColor?.id === id) {
    selectedColor = null;
    resultCard.classList.add("is-empty");
    resultSwatch.style.background = "";
    resultName.textContent = "Ready when you are";
    resultHex.textContent = "Spin once to start the safari.";
    copyButton.disabled = true;
  }

  persist();
  render();
}

function shufflePalette() {
  if (isSpinning) return;
  colors = [...colors].sort(() => Math.random() - 0.5);
  selectedColor = null;
  persist();
  render();
  showToast("Palette shuffled.");
}

function resetPalette() {
  if (isSpinning) return;
  colors = structuredClone(defaultColors);
  selectedColor = null;
  totalRotation = 0;
  wheel.style.transform = "rotate(0deg)";
  resultCard.classList.add("is-empty");
  resultSwatch.style.background = "";
  resultName.textContent = "Ready when you are";
  resultHex.textContent = "Spin once to start the safari.";
  copyButton.disabled = true;
  persist();
  render();
  showToast("Default rainbow palette restored.");
}

function updateResult(color) {
  resultCard.classList.remove("is-empty");
  resultSwatch.style.background = color.hex;
  resultName.textContent = color.name;
  resultHex.textContent = color.hex;
  copyButton.disabled = false;
}

async function copySelectedHex() {
  if (!selectedColor) return;

  try {
    await navigator.clipboard.writeText(selectedColor.hex);
    showToast(`${selectedColor.hex} copied.`);
  } catch {
    showToast("Copy failed. Select the hex value manually.");
  }
}

function setControlsDisabled(disabled) {
  spinButton.disabled = disabled;
  wheelButton.disabled = disabled;
  shuffleButton.disabled = disabled;
  resetButton.disabled = disabled;
  addColorForm.querySelectorAll("input, button").forEach((element) => {
    element.disabled = disabled;
  });
}

function burst(hex) {
  const rect = wheel.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const count = 24;

  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement("span");
    const angle = (Math.PI * 2 * i) / count;
    const distance = randomInteger(80, 180);

    particle.className = "particle";
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;
    particle.style.background = hex;
    particle.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--y", `${Math.sin(angle) * distance}px`);

    particles.append(particle);
    window.setTimeout(() => particle.remove(), 900);
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function showFormMessage(message, isError) {
  formMessage.textContent = message;
  formMessage.classList.toggle("is-error", isError);
}

function loadColors() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(stored) && stored.length >= minimumColors && stored.every(isColorObject)) {
      return stored;
    }
  } catch {
    // Fall back to defaults if local storage is malformed or unavailable.
  }

  return structuredClone(defaultColors);
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(colors));
}

function isColorObject(color) {
  return color && typeof color.id === "string" && typeof color.name === "string" && isValidHex(color.hex);
}

function isValidHex(value) {
  return /^#[0-9A-F]{6}$/i.test(value);
}

function normalizeHex(value) {
  const trimmed = String(value).trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return withHash.toUpperCase();
}

function makeUniqueName(name, currentId = null) {
  const base = name.trim();
  const existingNames = colors
    .filter((color) => color.id !== currentId)
    .map((color) => color.name.toLowerCase());

  if (!existingNames.includes(base.toLowerCase())) return base;

  let index = 2;
  let candidate = `${base} ${index}`;
  while (existingNames.includes(candidate.toLowerCase())) {
    index += 1;
    candidate = `${base} ${index}`;
  }

  return candidate;
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function mod(number, modulo) {
  return ((number % modulo) + modulo) % modulo;
}
