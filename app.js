import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

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

import {
  FIREBASE_CONFIG,
  AUTH_EMAIL,
  CLOUDINARY
} from "./config.js";


const app =
  initializeApp(FIREBASE_CONFIG);

const auth =
  getAuth(app);

const db =
  getDatabase(app);


const loginView =
  document.querySelector("#loginView");

const albumView =
  document.querySelector("#albumView");

const loginForm =
  document.querySelector("#loginForm");

const anniversaryInput =
  document.querySelector("#anniversaryInput");

const loginError =
  document.querySelector("#loginError");

const logoutBtn =
  document.querySelector("#logoutBtn");

const togetherCounter =
  document.querySelector("#togetherCounter");

const timeline =
  document.querySelector("#timeline");

const emptyState =
  document.querySelector("#emptyState");

const sortSelect =
  document.querySelector("#sortSelect");

const backdropGallery =
  document.querySelector("#backdropGallery");


const addDialog =
  document.querySelector("#addDialog");

const openAddBtn =
  document.querySelector("#openAddBtn");

const closeAddBtn =
  document.querySelector("#closeAddBtn");

const cancelAddBtn =
  document.querySelector("#cancelAddBtn");

const memoryForm =
  document.querySelector("#memoryForm");

const titleInput =
  document.querySelector("#titleInput");

const dateInput =
  document.querySelector("#dateInput");

const timeInput =
  document.querySelector("#timeInput");

const placeInput =
  document.querySelector("#placeInput");

const descriptionInput =
  document.querySelector("#descriptionInput");

const photosInput =
  document.querySelector("#photosInput");

const previewGrid =
  document.querySelector("#previewGrid");

const uploadStatus =
  document.querySelector("#uploadStatus");

const saveMemoryBtn =
  document.querySelector("#saveMemoryBtn");


const lightbox =
  document.querySelector("#lightbox");

const lightboxImage =
  document.querySelector("#lightboxImage");

const lightboxClose =
  document.querySelector("#lightboxClose");


let memories = [];

let unsubscribeMemories =
  null;

let counterInterval =
  null;

let revealObserver =
  null;


const MOBILE_MEDIA =
  window.matchMedia(
    "(max-width: 700px)"
  );

const REDUCED_MOTION =
  window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );


const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre"
];


/* LOGIN */

anniversaryInput.addEventListener(
  "input",
  () => {

    let digits =
      anniversaryInput
        .value
        .replace(/\D/g, "")
        .slice(0, 8);


    if (digits.length > 4) {

      digits =
        `${digits.slice(0, 2)}/` +
        `${digits.slice(2, 4)}/` +
        `${digits.slice(4)}`;

    } else if (digits.length > 2) {

      digits =
        `${digits.slice(0, 2)}/` +
        `${digits.slice(2)}`;

    }


    anniversaryInput.value =
      digits;

  }
);


loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    loginError.textContent =
      "";


    const datePassword =
      anniversaryInput
        .value
        .trim();


    if (
      !/^\d{2}\/\d{2}\/\d{4}$/
        .test(datePassword)
    ) {

      loginError.textContent =
        "Escribí la fecha en formato DD/MM/AAAA.";

      return;
    }


    const button =
      loginForm
        .querySelector("button");


    button.disabled =
      true;

    button.textContent =
      "Entrando...";


    try {

      await signInWithEmailAndPassword(
        auth,
        AUTH_EMAIL,
        datePassword
      );

    } catch (error) {

      console.error(error);

      loginError.textContent =
        "Esa no es la fecha. Probá de nuevo.";

    } finally {

      button.disabled =
        false;

      button.textContent =
        "Entrar al álbum";

    }

  }
);


logoutBtn.addEventListener(
  "click",
  () => signOut(auth)
);


/* AUTH */

onAuthStateChanged(
  auth,
  (user) => {

    if (user) {

      loginView
        .classList
        .add("hidden");


      albumView
        .classList
        .remove("hidden");


      anniversaryInput.value =
        "";


      startMemoriesListener();

      startTogetherCounter();

      setupRevealAnimations();

    } else {

      albumView
        .classList
        .add("hidden");


      loginView
        .classList
        .remove("hidden");


      if (unsubscribeMemories) {

        unsubscribeMemories();

        unsubscribeMemories =
          null;

      }


      if (counterInterval) {

        clearInterval(
          counterInterval
        );

        counterInterval =
          null;

      }


      if (revealObserver) {

        revealObserver
          .disconnect();

        revealObserver =
          null;

      }


      memories =
        [];

      timeline.innerHTML =
        "";

      backdropGallery.innerHTML =
        "";

    }

  }
);


/* DATABASE */

function startMemoriesListener() {

  if (unsubscribeMemories) {

    unsubscribeMemories();

  }


  unsubscribeMemories =
    onValue(

      ref(
        db,
        "memories"
      ),

      (snapshot) => {

        const raw =
          snapshot.val() || {};


        memories =
          Object
            .entries(raw)
            .map(
              ([id, value]) => ({
                id,
                ...value
              })
            );


        renderMemories();

        renderBackdropGallery();

      },

      (error) => {

        console.error(error);


        timeline.innerHTML =
          `
          <div class="empty-state">

            <h3>
              No se pudo leer el álbum
            </h3>

            <p>
              Revisá las reglas de Realtime Database.
            </p>

          </div>
          `;

      }

    );

}


/* ORDEN */

sortSelect.addEventListener(
  "change",
  renderMemories
);


/* RECUERDOS */

function renderMemories() {

  const sorted =
    [...memories]
      .sort(
        (a, b) => {

          const aKey =
            `${a.date || ""}T${a.time || "00:00"}`;

          const bKey =
            `${b.date || ""}T${b.time || "00:00"}`;


          return sortSelect.value === "asc"

            ? aKey.localeCompare(bKey)

            : bKey.localeCompare(aKey);

        }
      );


  emptyState
    .classList
    .toggle(
      "hidden",
      sorted.length !== 0
    );


  timeline.innerHTML =
    "";


  for (
    const memory of sorted
  ) {

    const card =
      document.createElement(
        "article"
      );


    card.className =
      "memory-card reveal";


    const photos =
      Array.isArray(
        memory.photos
      )

        ? memory.photos

        : Object.values(
            memory.photos || {}
          );


    const photosHtml =
      photos
        .slice(0, 4)
        .map(
          (photo, index) => {

            const extraBadge =

              index === 3 &&
              photos.length > 4

                ? `
                  <span class="memory-photo-more">
                    +${photos.length - 4}
                  </span>
                  `

                : "";


            return `
              <button
                class="memory-photo-wrap"
                type="button"
                data-full="${escapeAttr(photo.url)}"
                aria-label="Ver foto ampliada"
              >

                <img
                  class="memory-photo"
                  loading="lazy"
                  decoding="async"
                  src="${escapeAttr(photo.url)}"
                  alt="${escapeAttr(memory.title || "Recuerdo")}"
                >

                ${extraBadge}

              </button>
            `;

          }
        )
        .join("");


    const meta = [

      formatSpanishDate(
        memory.date
      ),

      memory.time || "",

      memory.place || ""

    ].filter(Boolean);


    card.innerHTML =
      `

      ${
        photosHtml

          ? `
            <div class="memory-photos">
              ${photosHtml}
            </div>
            `

          : ""
      }


      <div class="memory-body">

        <div class="memory-meta">

          ${
            meta
              .map(
                (item) =>
                  `<span>${escapeHtml(item)}</span>`
              )
              .join("")
          }

        </div>


        <h3 class="memory-title">

          ${
            escapeHtml(
              memory.title ||
              "Un recuerdo"
            )
          }

        </h3>


        ${
          memory.description

            ? `
              <p class="memory-description">
                ${escapeHtml(memory.description)}
              </p>
              `

            : ""
        }


        <div class="memory-footer">

          <button
            class="danger-btn"
            type="button"
            data-delete="${escapeAttr(memory.id)}"
          >
            Eliminar del álbum
          </button>

        </div>

      </div>

      `;


    card
      .querySelectorAll(
        ".memory-photo-wrap"
      )
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              openLightbox(
                button.dataset.full
              );

            }
          );

        }
      );


    card
      .querySelector(
        "[data-delete]"
      )
      ?.addEventListener(
        "click",
        () => {

          deleteMemory(memory);

        }
      );


    timeline.append(card);

  }


  setupRevealAnimations();

}


/* FONDO DINÁMICO */

function renderBackdropGallery() {

  if (!backdropGallery) {
    return;
  }


  const allPhotos =
    memories.flatMap(
      (memory) => {

        return Array.isArray(
          memory.photos
        )

          ? memory.photos

          : Object.values(
              memory.photos || {}
            );

      }
    );


  const amount =
    MOBILE_MEDIA.matches
      ? 4
      : 8;


  const selected =
    shuffleArray(
      allPhotos
    )
    .slice(
      0,
      amount
    );


  backdropGallery.innerHTML =
    selected
      .map(
        (photo) => {

          const url =
            getBackdropUrl(
              photo.url
            );


          return `
            <img
              class="backdrop-photo"
              src="${escapeAttr(url)}"
              alt=""
              loading="lazy"
              decoding="async"
            >
          `;

        }
      )
      .join("");

}


MOBILE_MEDIA
  .addEventListener?.(
    "change",
    renderBackdropGallery
  );


/* ABRIR MODAL */

openAddBtn.addEventListener(
  "click",
  () => {

    memoryForm.reset();

    previewGrid.innerHTML =
      "";

    uploadStatus.textContent =
      "";

    uploadStatus
      .classList
      .remove("error");


    dateInput.value =
      getLocalDateString();


    document.body
      .classList
      .add("modal-open");


    addDialog.showModal();

  }
);


function closeAddDialog() {

  if (addDialog.open) {

    addDialog.close();

  }

}


closeAddBtn.addEventListener(
  "click",
  closeAddDialog
);


cancelAddBtn.addEventListener(
  "click",
  closeAddDialog
);


addDialog.addEventListener(
  "close",
  () => {

    document.body
      .classList
      .remove("modal-open");

  }
);


addDialog.addEventListener(
  "cancel",
  () => {

    document.body
      .classList
      .remove("modal-open");

  }
);


/* PREVIEW */

photosInput.addEventListener(
  "change",
  () => {

    previewGrid.innerHTML =
      "";


    const files =
      [...photosInput.files]
        .slice(0, 10);


    uploadStatus.textContent =

      photosInput.files.length > 10

        ? "Podés subir hasta 10 fotos por recuerdo."

        : "";


    files.forEach(
      (file) => {

        const img =
          document.createElement(
            "img"
          );


        const objectUrl =
          URL.createObjectURL(file);


        img.src =
          objectUrl;


        img.alt =
          "";


        img.onload =
          () => {

            URL.revokeObjectURL(
              objectUrl
            );

          };


        previewGrid.append(img);

      }
    );

  }
);


/* GUARDAR */

memoryForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    uploadStatus
      .classList
      .remove("error");


    const files =
      [...photosInput.files]
        .slice(0, 10);


    if (!files.length) {

      uploadStatus.textContent =
        "Elegí al menos una foto.";

      uploadStatus
        .classList
        .add("error");

      return;

    }


    saveMemoryBtn.disabled =
      true;

    closeAddBtn.disabled =
      true;

    cancelAddBtn.disabled =
      true;


    try {

      const uploadedPhotos =
        [];


      for (
        let i = 0;
        i < files.length;
        i++
      ) {

        uploadStatus.textContent =
          `Subiendo foto ${i + 1} de ${files.length}...`;


        const optimized =
          await optimizeImage(
            files[i]
          );


        const uploaded =
          await uploadToCloudinary(
            optimized,
            files[i].name
          );


        uploadedPhotos
          .push(uploaded);

      }


      uploadStatus.textContent =
        "Guardando el recuerdo...";


      const memoryRef =
        push(
          ref(
            db,
            "memories"
          )
        );


      await set(
        memoryRef,
        {

          title:
            titleInput
              .value
              .trim(),

          date:
            dateInput
              .value,

          time:
            timeInput
              .value || "",

          place:
            placeInput
              .value
              .trim(),

          description:
            descriptionInput
              .value
              .trim(),

          photos:
            uploadedPhotos,

          createdAt:
            Date.now()

        }
      );


      addDialog.close();

      memoryForm.reset();

      previewGrid.innerHTML =
        "";

    } catch (error) {

      console.error(error);


      uploadStatus.textContent =

        error?.message ||

        "No se pudo guardar el recuerdo.";


      uploadStatus
        .classList
        .add("error");

    } finally {

      saveMemoryBtn.disabled =
        false;

      closeAddBtn.disabled =
        false;

      cancelAddBtn.disabled =
        false;

    }

  }
);


/* CLOUDINARY */

async function uploadToCloudinary(
  blob,
  originalName
) {

  const endpoint =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`;


  const data =
    new FormData();


  data.append(
    "file",
    blob,
    sanitizeFileName(
      originalName
    )
  );


  data.append(
    "upload_preset",
    CLOUDINARY.uploadPreset
  );


  const response =
    await fetch(
      endpoint,
      {

        method:
          "POST",

        body:
          data

      }
    );


  const json =
    await response.json();


  if (!response.ok) {

    throw new Error(

      json?.error?.message ||

      "Cloudinary rechazó la foto."

    );

  }


  return {

    url:
      json.secure_url,

    publicId:
      json.public_id,

    width:
      json.width,

    height:
      json.height,

    format:
      json.format

  };

}


/* OPTIMIZAR IMÁGENES */

async function optimizeImage(
  file
) {

  const shouldOptimize =

    file.size > 1_300_000 ||

    MOBILE_MEDIA.matches;


  if (!shouldOptimize) {

    return file;

  }


  try {

    const image =
      await loadImageSource(
        file
      );


    const maxSide =

      MOBILE_MEDIA.matches

        ? 1800

        : 2200;


    const scale =
      Math.min(

        1,

        maxSide /
        Math.max(
          image.width,
          image.height
        )

      );


    const width =
      Math.max(

        1,

        Math.round(
          image.width *
          scale
        )

      );


    const height =
      Math.max(

        1,

        Math.round(
          image.height *
          scale
        )

      );


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      width;

    canvas.height =
      height;


    const ctx =
      canvas.getContext(
        "2d",
        {
          alpha: false
        }
      );


    if (!ctx) {

      return file;

    }


    ctx.drawImage(

      image.source,

      0,
      0,

      width,
      height

    );


    image.cleanup();


    return await new Promise(
      (resolve) => {

        canvas.toBlob(

          (blob) => {

            resolve(
              blob || file
            );

          },

          "image/jpeg",

          MOBILE_MEDIA.matches
            ? 0.82
            : 0.86

        );

      }
    );

  } catch (error) {

    console.warn(
      "No se pudo optimizar la imagen; se sube el original.",
      error
    );


    return file;

  }

}


async function loadImageSource(
  file
) {

  if (
    "createImageBitmap" in window
  ) {

    const bitmap =
      await createImageBitmap(
        file
      );


    return {

      source:
        bitmap,

      width:
        bitmap.width,

      height:
        bitmap.height,

      cleanup:
        () => bitmap.close()

    };

  }


  const objectUrl =
    URL.createObjectURL(
      file
    );


  try {

    const img =
      await new Promise(
        (
          resolve,
          reject
        ) => {

          const el =
            new Image();


          el.onload =
            () => resolve(el);


          el.onerror =
            reject;


          el.src =
            objectUrl;

        }
      );


    return {

      source:
        img,

      width:
        img.naturalWidth,

      height:
        img.naturalHeight,

      cleanup:
        () =>
          URL.revokeObjectURL(
            objectUrl
          )

    };

  } catch (error) {

    URL.revokeObjectURL(
      objectUrl
    );


    throw error;

  }

}


/* ELIMINAR */

async function deleteMemory(
  memory
) {

  const confirmed =
    confirm(

      `¿Eliminar “${memory.title || "este recuerdo"}” del álbum?\n\n` +

      "La entrada se borra del álbum, pero las fotos pueden seguir ocupando espacio en Cloudinary."

    );


  if (!confirmed) {

    return;

  }


  try {

    await remove(

      ref(
        db,
        `memories/${memory.id}`
      )

    );

  } catch (error) {

    console.error(error);

    alert(
      "No se pudo eliminar el recuerdo."
    );

  }

}


/* LIGHTBOX */

function openLightbox(
  url
) {

  if (!url) {

    return;

  }


  lightboxImage.src =
    url;


  document.body
    .classList
    .add("modal-open");


  lightbox.showModal();

}


function closeLightbox() {

  if (lightbox.open) {

    lightbox.close();

  }

}


lightboxClose.addEventListener(
  "click",
  closeLightbox
);


lightbox.addEventListener(
  "click",
  (event) => {

    if (
      event.target === lightbox
    ) {

      closeLightbox();

    }

  }
);


lightbox.addEventListener(
  "close",
  () => {

    lightboxImage
      .removeAttribute("src");


    document.body
      .classList
      .remove("modal-open");

  }
);


lightbox.addEventListener(
  "cancel",
  () => {

    document.body
      .classList
      .remove("modal-open");

  }
);


/* CONTADOR */

function startTogetherCounter() {

  if (counterInterval) {

    clearInterval(
      counterInterval
    );

  }


  updateTogetherCounter();


  counterInterval =
    setInterval(

      updateTogetherCounter,

      1000

    );

}


function updateTogetherCounter() {

  const start =
    new Date(
      "2025-09-21T00:00:00"
    );


  const now =
    new Date();


  const diffMs =
    Math.max(

      0,

      now.getTime() -
      start.getTime()

    );


  const totalSeconds =
    Math.floor(
      diffMs / 1000
    );


  const totalDays =
    Math.floor(
      totalSeconds /
      86400
    );


  const hours =
    Math.floor(

      (
        totalSeconds %
        86400
      ) /

      3600

    );


  const minutes =
    Math.floor(

      (
        totalSeconds %
        3600
      ) /

      60

    );


  const seconds =
    totalSeconds %
    60;


  togetherCounter.innerHTML =
    `

    <div class="counter-summary">

      <strong>
        ${totalDays.toLocaleString("es-AR")} días juntos
      </strong>

      Contando cada instante desde que empezó lo nuestro

    </div>


    <div class="counter-grid">

      ${
        counterUnit(
          totalDays,
          "días"
        )
      }

      ${
        counterUnit(
          hours,
          "horas"
        )
      }

      ${
        counterUnit(
          minutes,
          "min"
        )
      }

      ${
        counterUnit(
          seconds,
          "seg"
        )
      }

    </div>

    `;

}


function counterUnit(
  value,
  label
) {

  return `

    <div class="counter-unit">

      <span class="counter-value">
        ${value}
      </span>

      <span class="counter-label">
        ${label}
      </span>

    </div>

  `;

}


/* ANIMACIONES */

function setupRevealAnimations() {

  if (revealObserver) {

    revealObserver.disconnect();

    revealObserver =
      null;

  }


  const items =
    document.querySelectorAll(
      ".reveal"
    );


  if (
    REDUCED_MOTION.matches ||
    !(
      "IntersectionObserver" in window
    )
  ) {

    items.forEach(
      (item) =>
        item.classList.add(
          "is-visible"
        )
    );


    return;

  }


  revealObserver =
    new IntersectionObserver(

      (entries) => {

        entries.forEach(
          (entry) => {

            if (
              entry.isIntersecting
            ) {

              entry.target
                .classList
                .add(
                  "is-visible"
                );


              revealObserver
                ?.unobserve(
                  entry.target
                );

            }

          }
        );

      },

      {

        threshold:
          0.08,

        rootMargin:
          "80px 0px"

      }

    );


  items.forEach(
    (item) =>
      revealObserver.observe(
        item
      )
  );

}


/* CLOUDINARY FONDO */

function getBackdropUrl(
  url = ""
) {

  if (
    !url.includes(
      "res.cloudinary.com"
    ) ||

    !url.includes(
      "/upload/"
    )
  ) {

    return url;

  }


  const mobileTransform =
    "f_auto,q_auto:eco,w_640,c_limit";


  const desktopTransform =
    "f_auto,q_auto:low,w_900,c_limit";


  const transform =

    MOBILE_MEDIA.matches

      ? mobileTransform

      : desktopTransform;


  return url.replace(

    "/upload/",

    `/upload/${transform}/`

  );

}


/* FECHA LOCAL */

function getLocalDateString() {

  const now =
    new Date();


  const offset =
    now.getTimezoneOffset();


  const local =
    new Date(

      now.getTime() -

      offset *
      60_000

    );


  return local
    .toISOString()
    .slice(0, 10);

}


/* FORMATO FECHA */

function formatSpanishDate(
  dateString
) {

  if (!dateString) {

    return "";

  }


  const [
    year,
    month,
    day
  ] =
    dateString
      .split("-")
      .map(Number);


  if (
    !year ||
    !month ||
    !day
  ) {

    return dateString;

  }


  return (
    `${day} de ` +
    `${MONTHS[month - 1]} ` +
    `de ${year}`
  );

}


/* SHUFFLE */

function shuffleArray(
  array
) {

  const copy =
    [...array];


  for (
    let i =
      copy.length - 1;

    i > 0;

    i--
  ) {

    const j =
      Math.floor(

        Math.random() *
        (i + 1)

      );


    [
      copy[i],
      copy[j]
    ] = [
      copy[j],
      copy[i]
    ];

  }


  return copy;

}


/* SEGURIDAD HTML */

function escapeHtml(
  value = ""
) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


function escapeAttr(
  value = ""
) {

  return escapeHtml(
    value
  );

}


/* ARCHIVOS */

function sanitizeFileName(
  name = "foto.jpg"
) {

  return name

    .normalize("NFD")

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    );

}
