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
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { FIREBASE_CONFIG, AUTH_EMAIL, CLOUDINARY } from "./config.js";

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getDatabase(app);

const loginView = document.querySelector("#loginView");
const albumView = document.querySelector("#albumView");
const loginForm = document.querySelector("#loginForm");
const anniversaryInput = document.querySelector("#anniversaryInput");
const loginError = document.querySelector("#loginError");
const logoutBtn = document.querySelector("#logoutBtn");
const togetherCounter = document.querySelector("#togetherCounter");
const timeline = document.querySelector("#timeline");
const emptyState = document.querySelector("#emptyState");
const sortSelect = document.querySelector("#sortSelect");

const addDialog = document.querySelector("#addDialog");
const openAddBtn = document.querySelector("#openAddBtn");
const closeAddBtn = document.querySelector("#closeAddBtn");
const cancelAddBtn = document.querySelector("#cancelAddBtn");
const memoryForm = document.querySelector("#memoryForm");
const titleInput = document.querySelector("#titleInput");
const dateInput = document.querySelector("#dateInput");
const timeInput = document.querySelector("#timeInput");
const placeInput = document.querySelector("#placeInput");
const descriptionInput = document.querySelector("#descriptionInput");
const photosInput = document.querySelector("#photosInput");
const previewGrid = document.querySelector("#previewGrid");
const uploadStatus = document.querySelector("#uploadStatus");
const saveMemoryBtn = document.querySelector("#saveMemoryBtn");

const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxClose = document.querySelector("#lightboxClose");

let memories = [];
let unsubscribeMemories = null;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

anniversaryInput.addEventListener("input", () => {
  let digits = anniversaryInput.value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 4) digits = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  else if (digits.length > 2) digits = `${digits.slice(0, 2)}/${digits.slice(2)}`;
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
    updateTogetherCounter();
  } else {
    albumView.classList.add("hidden");
    loginView.classList.remove("hidden");
    if (unsubscribeMemories) unsubscribeMemories();
    memories = [];
    timeline.innerHTML = "";
  }
});

function startMemoriesListener() {
  if (unsubscribeMemories) unsubscribeMemories();
  unsubscribeMemories = onValue(ref(db, "memories"), (snapshot) => {
    const raw = snapshot.val() || {};
    memories = Object.entries(raw).map(([id, value]) => ({ id, ...value }));
    renderMemories();
  }, (error) => {
    console.error(error);
    timeline.innerHTML = `<div class="empty-state"><h3>No se pudo leer el álbum</h3><p>Revisá las reglas de Realtime Database.</p></div>`;
  });
}

sortSelect.addEventListener("change", renderMemories);

function renderMemories() {
  const sorted = [...memories].sort((a, b) => {
    const aKey = `${a.date || ""}T${a.time || "00:00"}`;
    const bKey = `${b.date || ""}T${b.time || "00:00"}`;
    return sortSelect.value === "asc" ? aKey.localeCompare(bKey) : bKey.localeCompare(aKey);
  });

  emptyState.classList.toggle("hidden", sorted.length !== 0);
  timeline.innerHTML = "";

  for (const memory of sorted) {
    const card = document.createElement("article");
    card.className = "memory-card";

    const photos = Array.isArray(memory.photos) ? memory.photos : Object.values(memory.photos || {});
    const photosHtml = photos.slice(0, 4).map((photo, index) => {
      const extra = index === 3 && photos.length > 4 ? ` data-more="+${photos.length - 4}"` : "";
      return `<img class="memory-photo" loading="lazy" src="${escapeAttr(photo.url)}" alt="${escapeAttr(memory.title || "Recuerdo")}" data-full="${escapeAttr(photo.url)}"${extra}>`;
    }).join("");

    const meta = [formatSpanishDate(memory.date), memory.time || "", memory.place || ""].filter(Boolean);

    card.innerHTML = `
      ${photosHtml ? `<div class="memory-photos">${photosHtml}</div>` : ""}
      <div class="memory-body">
        <div class="memory-meta">${meta.map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>
        <h3 class="memory-title">${escapeHtml(memory.title || "Un recuerdo")}</h3>
        ${memory.description ? `<p class="memory-description">${escapeHtml(memory.description)}</p>` : ""}
        <div class="memory-footer">
          <button class="danger-btn" type="button" data-delete="${escapeAttr(memory.id)}">Eliminar del álbum</button>
        </div>
      </div>
    `;

    card.querySelectorAll(".memory-photo").forEach((img) => {
      img.addEventListener("click", () => openLightbox(img.dataset.full));
    });

    card.querySelector("[data-delete]")?.addEventListener("click", () => deleteMemory(memory));
    timeline.append(card);
  }
}

openAddBtn.addEventListener("click", () => {
  memoryForm.reset();
  previewGrid.innerHTML = "";
  uploadStatus.textContent = "";
  uploadStatus.classList.remove("error");
  dateInput.value = new Date().toISOString().slice(0, 10);
  addDialog.showModal();
});
closeAddBtn.addEventListener("click", () => addDialog.close());
cancelAddBtn.addEventListener("click", () => addDialog.close());

photosInput.addEventListener("change", () => {
  previewGrid.innerHTML = "";
  const files = [...photosInput.files].slice(0, 10);
  if (photosInput.files.length > 10) {
    uploadStatus.textContent = "Podés subir hasta 10 fotos por recuerdo.";
  } else {
    uploadStatus.textContent = "";
  }

  files.forEach((file) => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    previewGrid.append(img);
  });
});

memoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  uploadStatus.classList.remove("error");

  const files = [...photosInput.files].slice(0, 10);
  if (!files.length) {
    uploadStatus.textContent = "Elegí al menos una foto.";
    uploadStatus.classList.add("error");
    return;
  }

  saveMemoryBtn.disabled = true;
  closeAddBtn.disabled = true;
  cancelAddBtn.disabled = true;

  try {
    const uploadedPhotos = [];
    for (let i = 0; i < files.length; i++) {
      uploadStatus.textContent = `Subiendo foto ${i + 1} de ${files.length}...`;
      const optimized = await optimizeImage(files[i]);
      const uploaded = await uploadToCloudinary(optimized, files[i].name);
      uploadedPhotos.push(uploaded);
    }

    uploadStatus.textContent = "Guardando el recuerdo...";
    const memoryRef = push(ref(db, "memories"));
    await set(memoryRef, {
      title: titleInput.value.trim(),
      date: dateInput.value,
      time: timeInput.value || "",
      place: placeInput.value.trim(),
      description: descriptionInput.value.trim(),
      photos: uploadedPhotos,
      createdAt: Date.now()
    });

    addDialog.close();
    memoryForm.reset();
    previewGrid.innerHTML = "";
  } catch (error) {
    console.error(error);
    uploadStatus.textContent = error?.message || "No se pudo guardar el recuerdo.";
    uploadStatus.classList.add("error");
  } finally {
    saveMemoryBtn.disabled = false;
    closeAddBtn.disabled = false;
    cancelAddBtn.disabled = false;
  }
});

async function uploadToCloudinary(blob, originalName) {
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`;
  const data = new FormData();
  data.append("file", blob, sanitizeFileName(originalName));
  data.append("upload_preset", CLOUDINARY.uploadPreset);

  const response = await fetch(endpoint, { method: "POST", body: data });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || "Cloudinary rechazó la foto.");
  }

  return {
    url: json.secure_url,
    publicId: json.public_id,
    width: json.width,
    height: json.height,
    format: json.format
  };
}

async function optimizeImage(file) {
  if (file.size < 1_800_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 2200;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", .86);
    });
  } catch {
    return file;
  }
}

async function deleteMemory(memory) {
  const confirmed = confirm(`¿Eliminar “${memory.title || "este recuerdo"}” del álbum?\n\nLa entrada se borra del álbum, pero las fotos pueden seguir ocupando espacio en Cloudinary.`);
  if (!confirmed) return;

  try {
    await remove(ref(db, `memories/${memory.id}`));
  } catch (error) {
    console.error(error);
    alert("No se pudo eliminar el recuerdo.");
  }
}

function openLightbox(url) {
  lightboxImage.src = url;
  lightbox.showModal();
}
lightboxClose.addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});

function updateTogetherCounter() {
  const start = new Date("2025-09-21T00:00:00");
  const now = new Date();
  const diffMs = Math.max(0, now - start);
  const totalDays = Math.floor(diffMs / 86400000);
  const years = Math.floor(totalDays / 365.2425);
  const daysAfterYears = Math.round(totalDays - years * 365.2425);
  togetherCounter.innerHTML = `<strong>${totalDays.toLocaleString("es-AR")} días</strong>${years ? `${years} año${years === 1 ? "" : "s"} y ${daysAfterYears} días de historia` : "de historia juntos"}`;
}

function formatSpanishDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return dateString;
  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(value = "") { return escapeHtml(value); }
function sanitizeFileName(name = "foto.jpg") {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
}
