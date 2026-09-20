import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

import {
  FIREBASE_CONFIG,
  AUTH_EMAIL,
  CLOUDINARY
} from "./config.js";


const firebaseApp = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);

const loginView = document.querySelector("#loginView");
const albumView = document.querySelector("#albumView");
const loginForm = document.querySelector("#loginForm");
const anniversaryInput = document.querySelector("#anniversaryInput");
const loginError = document.querySelector("#loginError");
const logoutBtn = document.querySelector("#logoutBtn");

const togetherCounter = document.querySelector("#togetherCounter");
const statsStrip = document.querySelector("#statsStrip");
const monthsContainer = document.querySelector("#monthsContainer");
const emptyState = document.querySelector("#emptyState");
const sortSelect = document.querySelector("#sortSelect");
const surpriseBtn = document.querySelector("#surpriseBtn");
const favoritesBtn = document.querySelector("#favoritesBtn");
const backdropGallery = document.querySelector("#backdropGallery");

const memoryModal = document.querySelector("#memoryModal");
const openAddBtn = document.querySelector("#openAddBtn");
const closeAddBtn = document.querySelector("#closeAddBtn");
const cancelAddBtn = document.querySelector("#cancelAddBtn");
const memoryForm = document.querySelector("#memoryForm");

const titleInput = document.querySelector("#titleInput");
const dateInput = document.querySelector("#dateInput");
const timeInput = document.querySelector("#timeInput");
const placeInput = document.querySelector("#placeInput");
const quoteInput = document.querySelector("#quoteInput");
const descriptionInput = document.querySelector("#descriptionInput");
const photosInput = document.querySelector("#photosInput");
const previewGrid = document.querySelector("#previewGrid");
const uploadStatus = document.querySelector("#uploadStatus");
const uploadProgress = document.querySelector("#uploadProgress");
const uploadProgressText = document.querySelector("#uploadProgressText");
const uploadProgressPercent = document.querySelector("#uploadProgressPercent");
const uploadProgressBar = document.querySelector("#uploadProgressBar");
const saveMemoryBtn = document.querySelector("#saveMemoryBtn");

const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxCaption = document.querySelector("#lightboxCaption");
const lightboxClose = document.querySelector("#lightboxClose");

const MOBILE_MEDIA = window.matchMedia("(max-width: 700px)");
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

let memories = [];
let unsubscribeMemories = null;
let counterInterval = null;
let revealObserver = null;
let favoritesOnly = false;
let selectedFiles = [];
let previewObjectUrls = [];
let isUploading = false;


/* LOGIN */

anniversaryInput.addEventListener("input", () => {
  let digits = anniversaryInput.value.replace(/\D/g, "").slice(0, 8);

  if (digits.length > 4) {
    digits = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  } else if (digits.length > 2) {
    digits = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  anniversaryInput.value = digits;
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.textContent = "";
  const datePassword = anniversaryInput.value.trim();

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(datePassword)) {
    loginError.textContent = "Escribí la fecha en formato DD/MM/AAAA.";
    return;
  }

  const button = loginForm.querySelector("button");
  button.disabled = true;
  button.textContent = "Entrando...";

  try {
    await signInWithEmailAndPassword(auth, AUTH_EMAIL, datePassword);
  } catch (error) {
    console.error(error);
    loginError.textContent = "Esa no es la fecha. Probá de nuevo.";
  } finally {
    button.disabled = false;
    button.textContent = "Entrar al álbum";
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginView.classList.add("hidden");
    albumView.classList.remove("hidden");
    anniversaryInput.value = "";

    startMemoriesListener();
    startTogetherCounter();
    setupRevealAnimations();
  } else {
    albumView.classList.add("hidden");
    loginView.classList.remove("hidden");

    if (unsubscribeMemories) {
      unsubscribeMemories();
      unsubscribeMemories = null;
    }

    if (counterInterval) {
      clearInterval(counterInterval);
      counterInterval = null;
    }

    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }

    memories = [];
    monthsContainer.innerHTML = "";
    backdropGallery.innerHTML = "";
    statsStrip.innerHTML = "";
  }
});


/* DATABASE */

function startMemoriesListener() {
  if (unsubscribeMemories) unsubscribeMemories();

  unsubscribeMemories = onValue(
    ref(db, "memories"),
    (snapshot) => {
      const raw = snapshot.val() || {};

      memories = Object.entries(raw).map(([id, value]) => ({
        id,
        ...value,
        favorite: Boolean(value?.favorite)
      }));

      renderEverything();
    },
    (error) => {
      console.error(error);

      monthsContainer.innerHTML = `
        <div class="empty-state">
          <h3>No se pudo leer el álbum</h3>
          <p>Revisá las reglas de Realtime Database.</p>
        </div>
      `;
    }
  );
}

function renderEverything() {
  renderStats();
  renderMonths();
  renderBackdropGallery();
}

sortSelect.addEventListener("change", renderMonths);


/* STATS */

function renderStats() {
  const allPhotos = getAllPhotos(memories);
  const places = new Set(
    memories
      .map((memory) => String(memory.place || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const favorites = memories.filter((memory) => memory.favorite).length;

  const stats = [
    [memories.length, "recuerdos"],
    [allPhotos.length, "fotos"],
    [places.size, "lugares"],
    [favorites, "favoritos"]
  ];

  statsStrip.innerHTML = stats.map(([value, label]) => `
    <div class="stat-card">
      <strong>${Number(value).toLocaleString("es-AR")}</strong>
      <span>${label}</span>
    </div>
  `).join("");
}


/* FAVORITOS */

favoritesBtn.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  favoritesBtn.setAttribute("aria-pressed", String(favoritesOnly));
  favoritesBtn.textContent = favoritesOnly ? "Ver todo" : "Favoritos";
  renderMonths();
});

async function toggleFavorite(memory) {
  try {
    await update(
      ref(db, `memories/${memory.id}`),
      { favorite: !memory.favorite }
    );
  } catch (error) {
    console.error(error);
    alert("No se pudo actualizar el favorito.");
  }
}


/* MESES */

function renderMonths() {
  let filtered = favoritesOnly
    ? memories.filter((memory) => memory.favorite)
    : [...memories];

  filtered.sort((a, b) => {
    const aKey = `${a.date || ""}T${a.time || "00:00"}`;
    const bKey = `${b.date || ""}T${b.time || "00:00"}`;

    return sortSelect.value === "asc"
      ? aKey.localeCompare(bKey)
      : bKey.localeCompare(aKey);
  });

  emptyState.classList.toggle("hidden", filtered.length !== 0);
  monthsContainer.innerHTML = "";

  if (!filtered.length) {
    if (favoritesOnly && memories.length) {
      emptyState.classList.remove("hidden");
      emptyState.querySelector("h3").textContent = "Todavía no hay favoritos";
      emptyState.querySelector("p").textContent = "Marcá con un corazón los recuerdos que quieran tener siempre a mano.";
    } else {
      resetEmptyStateText();
    }
    return;
  }

  resetEmptyStateText();

  const groups = groupByMonth(filtered);

  for (const [monthKey, monthMemories] of groups) {
    const [year, month] = monthKey.split("-").map(Number);

    const section = document.createElement("section");
    section.className = "month-section reveal";
    section.dataset.month = monthKey;

    const daysWithMemories = new Set(
      monthMemories
        .map((memory) => Number(String(memory.date || "").split("-")[2]))
        .filter(Boolean)
    );

    section.innerHTML = `
      <div class="month-heading">
        <div class="month-title-wrap">
          <h2 class="month-name">${MONTHS[month - 1]}</h2>
          <p class="month-year">${year}</p>
        </div>
        ${buildCalendar(year, month, daysWithMemories)}
      </div>

      <div class="month-collage"></div>
    `;

    const collage = section.querySelector(".month-collage");

    monthMemories.forEach((memory, index) => {
      collage.append(buildMemoryPiece(memory, index));
    });

    monthsContainer.append(section);
  }

  setupRevealAnimations();
}

function resetEmptyStateText() {
  emptyState.querySelector("h3").textContent = "Este álbum recién empieza";
  emptyState.querySelector("p").textContent = "Suban su primer recuerdo y empiecen a construir su historia juntos.";
}

function groupByMonth(list) {
  const map = new Map();

  for (const memory of list) {
    const date = String(memory.date || "");
    const monthKey = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date.slice(0, 7)
      : "sin-fecha";

    if (!map.has(monthKey)) map.set(monthKey, []);
    map.get(monthKey).push(memory);
  }

  return [...map.entries()].filter(([key]) => key !== "sin-fecha");
}

function buildCalendar(year, month, daysWithMemories) {
  const jsFirstDay = new Date(year, month - 1, 1).getDay();
  const mondayFirst = (jsFirstDay + 6) % 7;
  const totalDays = new Date(year, month, 0).getDate();

  const emptyCells = Array.from({ length: mondayFirst }, () => `<div></div>`).join("");

  const dayCells = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const hasMemory = daysWithMemories.has(day);

    return `
      <div class="calendar-day ${hasMemory ? "has-memory" : ""}">
        ${day}
      </div>
    `;
  }).join("");

  return `
    <div class="month-calendar" aria-label="Calendario del mes">
      <div class="calendar-weekdays">
        ${WEEKDAYS.map((day) => `<span>${day}</span>`).join("")}
      </div>
      <div class="calendar-days">
        ${emptyCells}
        ${dayCells}
      </div>
    </div>
  `;
}

function buildMemoryPiece(memory, index) {
  const article = document.createElement("article");

  const sizeClass = getPieceSize(index);
  const tilt = getDeterministicTilt(memory.id, index);

  article.className = `memory-piece ${sizeClass}`;
  article.dataset.memoryId = memory.id;
  article.style.setProperty("--tilt", `${tilt}deg`);

  const photos = Array.isArray(memory.photos)
    ? memory.photos
    : Object.values(memory.photos || {});

  const mainPhoto = photos[0];
  const extras = photos.slice(1, 4);

  const photoHtml = mainPhoto ? `
    <div class="memory-image-stack">
      <button type="button" class="open-photo-btn" data-url="${escapeAttr(mainPhoto.url)}">
        <img
          class="memory-main-photo"
          loading="lazy"
          decoding="async"
          src="${escapeAttr(getDisplayUrl(mainPhoto.url, sizeClass))}"
          alt="${escapeAttr(memory.title || "Recuerdo")}"
        />
      </button>

      ${extras.length ? `
        <div class="memory-photo-strip">
          ${extras.map((photo) => `
            <button type="button" class="open-photo-btn" data-url="${escapeAttr(photo.url)}">
              <img
                class="memory-photo-thumb"
                loading="lazy"
                decoding="async"
                src="${escapeAttr(getThumbUrl(photo.url))}"
                alt=""
              />
            </button>
          `).join("")}
        </div>
      ` : ""}

      ${photos.length > 4 ? `<span class="photo-more">+${photos.length - 4}</span>` : ""}
    </div>
  ` : "";

  const meta = [
    formatSpanishDate(memory.date),
    memory.time || "",
    memory.place || ""
  ].filter(Boolean);

  article.innerHTML = `
    ${photoHtml}

    <div class="memory-piece-body">
      <div class="memory-meta">
        ${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>

      <h3 class="memory-piece-title">${escapeHtml(memory.title || "Un recuerdo")}</h3>

      ${memory.quote ? `
        <blockquote class="memory-quote">“${escapeHtml(memory.quote)}”</blockquote>
      ` : ""}

      ${memory.description ? `
        <p class="memory-description">${escapeHtml(memory.description)}</p>
      ` : ""}

      <div class="memory-piece-actions">
        <button
          class="favorite-btn ${memory.favorite ? "is-favorite" : ""}"
          type="button"
          aria-label="${memory.favorite ? "Quitar de favoritos" : "Agregar a favoritos"}"
          title="${memory.favorite ? "Quitar de favoritos" : "Agregar a favoritos"}"
        >
          ${memory.favorite ? "♥" : "♡"}
        </button>

        <button class="delete-link" type="button">Eliminar</button>
      </div>
    </div>
  `;

  article.querySelectorAll(".open-photo-btn").forEach((button) => {
    button.addEventListener("click", () => {
      openLightbox(
        button.dataset.url,
        memory.quote || memory.title || ""
      );
    });
  });

  article.querySelector(".favorite-btn")?.addEventListener("click", () => {
    toggleFavorite(memory);
  });

  article.querySelector(".delete-link")?.addEventListener("click", () => {
    deleteMemory(memory);
  });

  return article;
}

function getPieceSize(index) {
  const pattern = ["size-large", "size-small", "size-wide", "size-small", "size-large", "size-small"];
  return pattern[index % pattern.length];
}

function getDeterministicTilt(id = "", index = 0) {
  const text = `${id}-${index}`;
  let hash = 0;

  for (const char of text) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }

  const choices = [-1.8, -1.2, -.7, .5, 1.0, 1.6];
  return choices[Math.abs(hash) % choices.length];
}


/* SORPRÉNDEME */

surpriseBtn.addEventListener("click", () => {
  const candidates = favoritesOnly
    ? memories.filter((memory) => memory.favorite)
    : memories;

  if (!candidates.length) {
    alert("Todavía no hay recuerdos para sorprenderlos.");
    return;
  }

  const memory = candidates[Math.floor(Math.random() * candidates.length)];
  const piece = document.querySelector(`[data-memory-id="${CSS.escape(memory.id)}"]`);

  if (piece) {
    piece.scrollIntoView({ behavior: "smooth", block: "center" });
    piece.classList.remove("flash");
    void piece.offsetWidth;
    piece.classList.add("flash");
    setTimeout(() => piece.classList.remove("flash"), 1300);
  }

  const photos = Array.isArray(memory.photos)
    ? memory.photos
    : Object.values(memory.photos || {});

  if (photos[0]) {
    setTimeout(() => {
      openLightbox(
        photos[0].url,
        memory.quote || memory.title || ""
      );
    }, piece ? 650 : 0);
  }
});


/* FONDO */

function renderBackdropGallery() {
  const allPhotos = getAllPhotos(memories);
  const amount = MOBILE_MEDIA.matches ? 4 : 8;
  const selected = shuffleArray(allPhotos).slice(0, amount);

  backdropGallery.innerHTML = selected.map((photo) => `
    <img
      class="backdrop-photo"
      src="${escapeAttr(getBackdropUrl(photo.url))}"
      alt=""
      loading="lazy"
      decoding="async"
    />
  `).join("");
}

MOBILE_MEDIA.addEventListener?.("change", renderBackdropGallery);


/* MODAL */

openAddBtn.addEventListener("click", openMemoryModal);
closeAddBtn.addEventListener("click", closeMemoryModal);
cancelAddBtn.addEventListener("click", closeMemoryModal);
memoryModal.querySelector("[data-close-modal]")?.addEventListener("click", () => {
  if (!isUploading) closeMemoryModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (!memoryModal.classList.contains("hidden") && !isUploading) {
    closeMemoryModal();
  } else if (!lightbox.classList.contains("hidden")) {
    closeLightbox();
  }
});

function openMemoryModal() {
  clearFormState();
  dateInput.value = getLocalDateString();

  memoryModal.classList.remove("hidden");
  memoryModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  setTimeout(() => titleInput.focus({ preventScroll: true }), 80);
}

function closeMemoryModal() {
  if (isUploading) return;

  memoryModal.classList.add("hidden");
  memoryModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  clearPreviewUrls();
}

function clearFormState() {
  memoryForm.reset();
  selectedFiles = [];
  clearPreviewUrls();
  previewGrid.innerHTML = "";
  uploadStatus.textContent = "";
  uploadStatus.classList.remove("error");
  uploadProgress.classList.add("hidden");
  setProgress(0, "Preparando...");
}


/* ARCHIVOS */

photosInput.addEventListener("change", () => {
  clearPreviewUrls();

  selectedFiles = [...photosInput.files].slice(0, 10);

  if (photosInput.files.length > 10) {
    uploadStatus.textContent = "Se usarán las primeras 10 fotos.";
  } else {
    uploadStatus.textContent = "";
  }

  renderPreviews(selectedFiles);
});

function renderPreviews(files) {
  previewGrid.innerHTML = "";

  files.forEach((file) => {
    const item = document.createElement("div");
    item.className = "preview-item";

    const objectUrl = URL.createObjectURL(file);
    previewObjectUrls.push(objectUrl);

    const img = document.createElement("img");
    img.alt = "";
    img.src = objectUrl;

    img.onerror = () => {
      item.innerHTML = `
        <div class="preview-fallback">
          ${escapeHtml(file.name)}
        </div>
      `;
    };

    item.append(img);
    previewGrid.append(item);
  });
}

function clearPreviewUrls() {
  previewObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  previewObjectUrls = [];
}


/* SUBIDA */

memoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isUploading) return;

  const files = selectedFiles.length
    ? selectedFiles
    : [...photosInput.files].slice(0, 10);

  if (!files.length) {
    uploadStatus.textContent = "Elegí al menos una foto.";
    uploadStatus.classList.add("error");
    return;
  }

  isUploading = true;
  setFormDisabled(true);
  uploadStatus.classList.remove("error");
  uploadProgress.classList.remove("hidden");

  try {
    const uploadedPhotos = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];

      setProgress(
        Math.round((index / files.length) * 100),
        `Preparando foto ${index + 1} de ${files.length}...`
      );

      const prepared = await prepareFileForUpload(file);

      setProgress(
        Math.round(((index + .3) / files.length) * 100),
        `Subiendo foto ${index + 1} de ${files.length}...`
      );

      const uploaded = await uploadWithRetry(
        prepared,
        file.name,
        2
      );

      uploadedPhotos.push(uploaded);

      setProgress(
        Math.round(((index + 1) / files.length) * 100),
        `Foto ${index + 1} de ${files.length} lista`
      );
    }

    setProgress(100, "Guardando el recuerdo...");

    const memoryRef = push(ref(db, "memories"));

    await set(memoryRef, {
      title: titleInput.value.trim(),
      date: dateInput.value,
      time: timeInput.value || "",
      place: placeInput.value.trim(),
      quote: quoteInput.value.trim(),
      description: descriptionInput.value.trim(),
      favorite: false,
      photos: uploadedPhotos,
      createdAt: Date.now()
    });

    uploadStatus.textContent = "Recuerdo guardado ♡";

    setTimeout(() => {
      isUploading = false;
      setFormDisabled(false);
      closeMemoryModal();
    }, 400);

  } catch (error) {
    console.error(error);

    uploadStatus.textContent =
      error?.message ||
      "No se pudo completar la subida. Tus fotos siguen seleccionadas para que puedas reintentar.";

    uploadStatus.classList.add("error");
    isUploading = false;
    setFormDisabled(false);
  }
});

function setFormDisabled(disabled) {
  saveMemoryBtn.disabled = disabled;
  closeAddBtn.disabled = disabled;
  cancelAddBtn.disabled = disabled;
  photosInput.disabled = disabled;
}

function setProgress(percent, text) {
  const safePercent = Math.max(0, Math.min(100, percent));

  uploadProgressText.textContent = text;
  uploadProgressPercent.textContent = `${safePercent}%`;
  uploadProgressBar.style.width = `${safePercent}%`;
}

async function prepareFileForUpload(file) {
  if (isHeicLike(file)) {
    return file;
  }

  const compressible = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ].includes(file.type);

  if (!compressible) {
    return file;
  }

  const shouldOptimize =
    file.size > 1_300_000 ||
    MOBILE_MEDIA.matches;

  if (!shouldOptimize) return file;

  return optimizeRasterImage(file);
}

function isHeicLike(file) {
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();

  return (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

async function optimizeRasterImage(file) {
  try {
    const source = await loadImageSource(file);

    const maxSide = MOBILE_MEDIA.matches ? 1800 : 2200;
    const scale = Math.min(
      1,
      maxSide / Math.max(source.width, source.height)
    );

    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: false });

    if (!ctx) {
      source.cleanup();
      return file;
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source.source, 0, 0, width, height);

    source.cleanup();

    return await new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob || file),
        "image/jpeg",
        MOBILE_MEDIA.matches ? .80 : .84
      );
    });

  } catch (error) {
    console.warn("No se pudo comprimir; se subirá el original.", error);
    return file;
  }
}

async function loadImageSource(file) {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close()
      };
    } catch {
      // Safari/iOS puede fallar con algunos formatos; pasa al fallback.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl)
    };

  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function uploadWithRetry(blob, originalName, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await uploadToCloudinary(blob, originalName);
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        await wait(900 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

async function uploadToCloudinary(blob, originalName) {
  const endpoint =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`;

  const data = new FormData();

  data.append(
    "file",
    blob,
    sanitizeFileName(originalName)
  );

  data.append(
    "upload_preset",
    CLOUDINARY.uploadPreset
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: data,
      signal: controller.signal
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(
        json?.error?.message ||
        "Cloudinary rechazó la foto."
      );
    }

    return {
      url: json.secure_url,
      publicId: json.public_id,
      width: json.width,
      height: json.height,
      format: json.format
    };
  } finally {
    clearTimeout(timeout);
  }
}


/* FAVORITOS / BORRADO */

async function deleteMemory(memory) {
  const confirmed = confirm(
    `¿Eliminar “${memory.title || "este recuerdo"}” del álbum?\n\n` +
    "La entrada se borra del álbum, pero las fotos pueden seguir ocupando espacio en Cloudinary."
  );

  if (!confirmed) return;

  try {
    await remove(ref(db, `memories/${memory.id}`));
  } catch (error) {
    console.error(error);
    alert("No se pudo eliminar el recuerdo.");
  }
}


/* LIGHTBOX */

function openLightbox(url, caption = "") {
  if (!url) return;

  lightboxImage.src = getLightboxUrl(url);
  lightboxCaption.textContent = caption;

  lightbox.classList.remove("hidden");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeLightbox() {
  lightbox.classList.add("hidden");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.removeAttribute("src");
  lightboxCaption.textContent = "";

  if (memoryModal.classList.contains("hidden")) {
    document.body.classList.remove("modal-open");
  }
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.querySelector("[data-close-lightbox]")?.addEventListener("click", closeLightbox);


/* CONTADOR */

function startTogetherCounter() {
  if (counterInterval) clearInterval(counterInterval);

  updateTogetherCounter();
  counterInterval = setInterval(updateTogetherCounter, 1000);
}

function updateTogetherCounter() {
  const start = new Date("2025-09-21T00:00:00");
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - start.getTime());

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalDays = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  togetherCounter.innerHTML = `
    <div class="counter-summary">
      <strong>${totalDays.toLocaleString("es-AR")} días juntos</strong>
      contando cada instante
    </div>

    <div class="counter-grid">
      ${counterUnit(totalDays, "días")}
      ${counterUnit(hours, "horas")}
      ${counterUnit(minutes, "min")}
      ${counterUnit(seconds, "seg")}
    </div>
  `;
}

function counterUnit(value, label) {
  return `
    <div class="counter-unit">
      <span class="counter-value">${value}</span>
      <span class="counter-label">${label}</span>
    </div>
  `;
}


/* ANIMACIONES */

function setupRevealAnimations() {
  if (revealObserver) {
    revealObserver.disconnect();
    revealObserver = null;
  }

  const items = document.querySelectorAll(".reveal");

  if (
    REDUCED_MOTION.matches ||
    !("IntersectionObserver" in window)
  ) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver?.unobserve(entry.target);
        }
      });
    },
    {
      threshold: .06,
      rootMargin: "100px 0px"
    }
  );

  items.forEach((item) => revealObserver.observe(item));
}


/* CLOUDINARY URLS */

function getDisplayUrl(url = "", sizeClass = "") {
  if (!isCloudinaryUrl(url)) return url;

  const width = sizeClass === "size-wide" ? 1200 : 800;

  return url.replace(
    "/upload/",
    `/upload/f_auto,q_auto:good,w_${width},c_limit/`
  );
}

function getThumbUrl(url = "") {
  if (!isCloudinaryUrl(url)) return url;

  return url.replace(
    "/upload/",
    "/upload/f_auto,q_auto:eco,w_300,h_300,c_fill,g_auto/"
  );
}

function getBackdropUrl(url = "") {
  if (!isCloudinaryUrl(url)) return url;

  const width = MOBILE_MEDIA.matches ? 480 : 760;

  return url.replace(
    "/upload/",
    `/upload/f_auto,q_auto:eco,w_${width},c_limit/`
  );
}

function getLightboxUrl(url = "") {
  if (!isCloudinaryUrl(url)) return url;

  return url.replace(
    "/upload/",
    "/upload/f_auto,q_auto:good,w_1800,c_limit/"
  );
}

function isCloudinaryUrl(url = "") {
  return (
    url.includes("res.cloudinary.com") &&
    url.includes("/upload/")
  );
}


/* HELPERS */

function getAllPhotos(list) {
  return list.flatMap((memory) => (
    Array.isArray(memory.photos)
      ? memory.photos
      : Object.values(memory.photos || {})
  ));
}

function getLocalDateString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  const local = new Date(
    now.getTime() - offset * 60_000
  );

  return local.toISOString().slice(0, 10);
}

function formatSpanishDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) return dateString;

  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}

function shuffleArray(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function sanitizeFileName(name = "foto.jpg") {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
}
