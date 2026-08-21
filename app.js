const VS_START = 0xE0100;
const VS_END = 0xE017F;
const ASCII_MAX = 0x7F;

const STYLE_MAP = {
  A: "𝐀",
  B: "𝖡",
  C: "𝖢",
  D: "𝖣",
  E: "𝐄",
  F: "𝖥",
  G: "𝖦",
  H: "𝖧",
  I: "𝐈",
  J: "𝖩",
  K: "𝖪",
  L: "𝖫",
  M: "𝖬",
  N: "𝖭",
  O: "𝐎",
  P: "𝖯",
  Q: "𝖰",
  R: "𝖱",
  S: "𝖲",
  T: "𝖳",
  U: "𝐔",
  V: "𝖵",
  W: "𝖶",
  X: "𝖷",
  Y: "𝖸",
  Z: "𝖹",
  a: "𝐚",
  b: "𝖻",
  c: "𝖼",
  d: "𝖽",
  e: "𝐞",
  f: "𝖿",
  g: "𝗀",
  h: "𝗁",
  i: "𝐢",
  j: "𝗃",
  k: "𝗄",
  l: "𝗅",
  m: "𝗆",
  n: "𝗇",
  o: "𝐨",
  p: "𝗉",
  q: "𝗊",
  r: "𝗋",
  s: "𝗌",
  t: "𝗍",
  u: "𝐮",
  v: "𝗏",
  w: "𝗐",
  x: "𝗑",
  y: "𝗒",
  z: "𝗓",
};

const stylizeText = (text) =>
  String(text || "").replace(/[A-Za-z]/g, (ch) => STYLE_MAP[ch] || ch);

const carrierInput = document.getElementById("carrier-input");
const payloadInput = document.getElementById("payload-input");
const placementInput = document.getElementById("placement-input");
const encodedOutput = document.getElementById("encoded-output");
const encodeStatus = document.getElementById("encode-status");
const copyEncoded = document.getElementById("copy-encoded");

const decodeInput = document.getElementById("decode-input");
const decodedCarrier = document.getElementById("decoded-carrier");
const decodedPayload = document.getElementById("decoded-payload");
const decodeStatus = document.getElementById("decode-status");
const copyPayload = document.getElementById("copy-payload");

const modeButtons = document.querySelectorAll(".mode-btn");
const panels = document.querySelectorAll(".panel");

const toCodePoints = (text) => Array.from(text, (ch) => ch.codePointAt(0));

const formatHex = (value) => value.toString(16).toUpperCase().padStart(4, "0");

const setStatus = (element, message, kind = "") => {
  element.textContent = message ? stylizeText(message) : "";
  if (kind) {
    element.dataset.kind = kind;
  } else {
    element.removeAttribute("data-kind");
  }
};

const shouldSkipStylize = (node) => {
  if (!node || !node.parentElement) {
    return true;
  }
  const parent = node.parentElement;
  if (parent.closest(".no-stylize")) {
    return true;
  }
  const tag = parent.tagName;
  if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE"].includes(tag)) {
    return true;
  }
  return false;
};

const stylizeUI = () => {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        if (shouldSkipStylize(node)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => {
    node.nodeValue = stylizeText(node.nodeValue);
  });

  document.querySelectorAll("[placeholder]").forEach((el) => {
    if (el.closest(".no-stylize")) {
      return;
    }
    const placeholder = el.getAttribute("placeholder");
    if (placeholder) {
      el.setAttribute("placeholder", stylizeText(placeholder));
    }
  });
};

const encodePayload = (payload) => {
  const codePoints = toCodePoints(payload);
  const encoded = [];
  const omitted = [];
  const omittedSet = new Set();
  for (const code of codePoints) {
    if (code > ASCII_MAX) {
      const char = String.fromCodePoint(code);
      if (!omittedSet.has(char)) {
        omittedSet.add(char);
        omitted.push(char);
      }
      continue;
    }
    encoded.push(String.fromCodePoint(VS_START + code));
  }
  return { value: encoded.join(""), asciiCount: encoded.length, omitted };
};

const normalizePlacement = (placement) =>
  placement === "after" ? "after" : "before";

const placementCopy = (placement) =>
  normalizePlacement(placement) === "after"
    ? "after the final carrier character"
    : "before the final carrier character";

const placeEncodedPayload = (carrier, encodedPayload, placement) => {
  const mode = normalizePlacement(placement);
  if (!encodedPayload) {
    return carrier;
  }
  if (mode === "after") {
    return carrier + encodedPayload;
  }
  const chars = Array.from(carrier);
  if (chars.length === 0) {
    return encodedPayload;
  }
  const finalChar = chars.pop();
  return chars.join("") + encodedPayload + finalChar;
};

const splitEncoded = (text) => {
  const chars = Array.from(text);
  const carrierChars = [];
  const payloadCodes = [];

  chars.forEach((ch) => {
    const code = ch.codePointAt(0);
    if (code >= VS_START && code <= VS_END) {
      payloadCodes.push(code);
      return;
    }
    carrierChars.push(ch);
  });

  const carrier = carrierChars.join("");
  const payload = payloadCodes
    .map((code) => String.fromCharCode(code - VS_START))
    .join("");
  return { carrier, payload, count: payloadCodes.length };
};

const updateEncode = () => {
  const carrier = carrierInput.value;
  const payload = payloadInput.value;
  const placement = normalizePlacement(placementInput.value);
  if (!carrier) {
    encodedOutput.value = "";
    setStatus(encodeStatus, "a visible carrier is required. the ghost needs a body.", "warn");
    return;
  }

  const encoded = encodePayload(payload);
  encodedOutput.value = placeEncodedPayload(carrier, encoded.value, placement);

  if (encoded.omitted.length > 0) {
    const list = encoded.omitted.join(" ");
    const suffix =
      encoded.asciiCount > 0
        ? ` encoded ${encoded.asciiCount} byte(s) ${placementCopy(placement)}.`
        : " no ascii payload encoded.";
    setStatus(
      encodeStatus,
      `omitted non-ascii: ${list}.${suffix}`,
      "error"
    );
    return;
  }

  if (encoded.asciiCount === 0) {
    setStatus(encodeStatus, "the invisible ink is empty. the carrier remains unhaunted.");
    return;
  }
  setStatus(
    encodeStatus,
    `${encoded.asciiCount} ghost byte(s) mapped to vs17-vs144 and bound ${placementCopy(placement)}.`,
    "good"
  );
};

const updateDecode = () => {
  const text = decodeInput.value;
  if (!text) {
    decodedCarrier.value = "";
    decodedPayload.value = "";
    setStatus(decodeStatus, "");
    return;
  }
  const { carrier, payload, count } = splitEncoded(text);
  decodedCarrier.value = carrier;
  decodedPayload.value = payload;
  if (count === 0) {
    setStatus(decodeStatus, "no vs17-vs144 ghost stream answered.", "warn");
    return;
  }
  setStatus(decodeStatus, `${count} buried byte(s) recovered from vs17-vs144 across input.`, "good");
};

const copyText = async (text, statusEl, label) => {
  if (!text) {
    setStatus(statusEl, "nothing has surfaced to copy.", "warn");
    return;
  }
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
    }
    setStatus(statusEl, `${label} copied beyond the veil.`, "good");
  } catch (err) {
    setStatus(statusEl, "the veil held. select and copy manually.", "error");
  }
};

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    modeButtons.forEach((btn) => btn.classList.remove("active"));
    panels.forEach((panel) => panel.classList.remove("active"));
    button.classList.add("active");
    const target = document.getElementById(button.dataset.target);
    if (target) {
      target.classList.add("active");
    }
  });
});

carrierInput.addEventListener("input", updateEncode);
payloadInput.addEventListener("input", updateEncode);
placementInput.addEventListener("change", updateEncode);
decodeInput.addEventListener("input", updateDecode);

copyEncoded.addEventListener("click", () => {
  copyText(encodedOutput.value, encodeStatus, "haunted text");
});

copyPayload.addEventListener("click", () => {
  copyText(decodedPayload.value, decodeStatus, "recovered whisper");
});

updateEncode();
updateDecode();
stylizeUI();
