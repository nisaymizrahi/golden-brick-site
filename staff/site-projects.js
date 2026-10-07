import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const PROJECT_STATUS_META = {
  upcoming: "In Progress",
  finished: "Finished",
};

const refs = {
  summary: document.getElementById("site-project-summary"),
  list: document.getElementById("site-project-list"),
  search: document.getElementById("site-project-search"),
  filter: document.getElementById("site-project-filter"),
  newButton: document.getElementById("site-project-new-button"),
  form: document.getElementById("site-project-form"),
  formHeading: document.getElementById("site-project-form-heading"),
  feedback: document.getElementById("site-project-feedback"),
  adminMessage: document.getElementById("site-project-admin-message"),
  title: document.getElementById("site-project-title"),
  status: document.getElementById("site-project-status"),
  neighborhood: document.getElementById("site-project-neighborhood"),
  projectType: document.getElementById("site-project-type"),
  sortOrder: document.getElementById("site-project-sort-order"),
  description: document.getElementById("site-project-description"),
  published: document.getElementById("site-project-published"),
  coverFile: document.getElementById("site-project-cover-file"),
  galleryFiles: document.getElementById("site-project-gallery-files"),
  coverPreview: document.getElementById("site-project-cover-preview"),
  galleryPreview: document.getElementById("site-project-gallery-preview"),
  resetButton: document.getElementById("site-project-reset-button"),
  deleteButton: document.getElementById("site-project-delete-button"),
};

const state = {
  db: null,
  storage: null,
  profile: null,
  isAdmin: false,
  unsub: null,
  projects: [],
  selectedId: null,
  isCreatingDraft: false,
  search: "",
  filter: "all",
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeString(value = "") {
  return String(value || "").trim();
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sortProjects(projects = []) {
  return [...projects].sort((left, right) => {
    const leftHasOrder = left.sortOrder === 0 || Boolean(left.sortOrder);
    const rightHasOrder = right.sortOrder === 0 || Boolean(right.sortOrder);
    const leftOrder = leftHasOrder && Number.isFinite(Number(left.sortOrder))
      ? Number(left.sortOrder)
      : 999;
    const rightOrder = rightHasOrder && Number.isFinite(Number(right.sortOrder))
      ? Number(right.sortOrder)
      : 999;

    if (left.status !== right.status) {
      return left.status === "upcoming" ? -1 : 1;
    }

    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    return (
      toMillis(right.updatedAt || right.createdAt) -
      toMillis(left.updatedAt || left.createdAt)
    );
  });
}

function blankProject() {
  return {
    title: "",
    status: "upcoming",
    neighborhood: "",
    projectType: "",
    description: "",
    sortOrder: "",
    published: false,
    coverPhoto: null,
    galleryPhotos: [],
  };
}

function currentProject() {
  return state.projects.find((project) => project.id === state.selectedId) || null;
}

function editorIsReady() {
  return state.isAdmin && Boolean(state.db);
}

function showFeedback(message = "", tone = "info") {
  if (!refs.feedback) return;
  refs.feedback.hidden = !message;
  refs.feedback.textContent = message;
  refs.feedback.dataset.tone = tone;
}

function renderSummary() {
  if (!refs.summary) return;

  const published = state.projects.filter((project) => project.published === true);
  const inProgress = state.projects.filter((project) => project.status !== "finished");
  const finished = state.projects.filter((project) => project.status === "finished");

  refs.summary.innerHTML = [
    { label: "Total projects", value: state.projects.length },
    { label: "Published", value: published.length },
    { label: "In progress", value: inProgress.length },
    { label: "Finished", value: finished.length },
  ]
    .map(
      (item) => `
        <article class="metric-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(String(item.value))}</strong>
        </article>
      `,
    )
    .join("");
}

function filteredProjects() {
  const search = state.search.toLowerCase();
  let projects = sortProjects(state.projects);

  if (state.filter === "upcoming") {
    projects = projects.filter((project) => project.status !== "finished");
  } else if (state.filter === "finished") {
    projects = projects.filter((project) => project.status === "finished");
  } else if (state.filter === "published") {
    projects = projects.filter((project) => project.published === true);
  } else if (state.filter === "draft") {
    projects = projects.filter((project) => project.published !== true);
  }

  if (!search) return projects;

  return projects.filter((project) =>
    [
      project.title,
      project.neighborhood,
      project.projectType,
      project.description,
      PROJECT_STATUS_META[project.status] || project.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search),
  );
}

function renderList() {
  if (!refs.list) return;

  if (!state.isAdmin) {
    refs.list.innerHTML =
      '<div class="empty-note">Only admins can manage public site projects.</div>';
    return;
  }

  const projects = filteredProjects();

  if (!projects.length) {
    refs.list.innerHTML =
      '<div class="empty-note">No public site projects match this view yet.</div>';
    return;
  }

  refs.list.innerHTML = projects
    .map((project) => {
      const statusLabel = PROJECT_STATUS_META[project.status] || "In Progress";
      const photoCount =
        (project.coverPhoto?.url ? 1 : 0) +
        (Array.isArray(project.galleryPhotos) ? project.galleryPhotos.length : 0);

      return `
        <button
          type="button"
          class="record-button ${project.id === state.selectedId ? "is-selected" : ""}"
          data-site-project-id="${escapeHtml(project.id)}"
        >
          <div class="record-topline">
            <span class="mini-pill">${escapeHtml(statusLabel)}</span>
            <span class="mini-pill">${escapeHtml(project.published ? "Published" : "Draft")}</span>
          </div>
          <span class="record-title">${escapeHtml(project.title || "Untitled project")}</span>
          <p class="record-copy">${escapeHtml(project.description || "No public description yet.")}</p>
          <div class="record-meta">
            <div>${escapeHtml(project.neighborhood || "Neighborhood pending")}</div>
            <div>${escapeHtml(project.projectType || "Project type pending")}</div>
            <div>${escapeHtml(`${photoCount} photo${photoCount === 1 ? "" : "s"}`)}</div>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderCoverPreview(project) {
  if (!refs.coverPreview) return;

  if (!project.coverPhoto?.url) {
    refs.coverPreview.innerHTML =
      '<div class="empty-note">No cover photo saved yet.</div>';
    return;
  }

  refs.coverPreview.innerHTML = `
    <figure class="site-project-photo-card is-cover">
      <img src="${escapeHtml(project.coverPhoto.url)}" alt="${escapeHtml(project.title || "Project cover photo")}">
      <figcaption>
        <span>Cover photo</span>
        <button type="button" class="danger-link" data-site-project-remove-cover>Remove</button>
      </figcaption>
    </figure>
  `;
}

function renderGalleryPreview(project) {
  if (!refs.galleryPreview) return;

  const gallery = Array.isArray(project.galleryPhotos)
    ? project.galleryPhotos.filter((photo) => photo?.url)
    : [];

  if (!gallery.length) {
    refs.galleryPreview.innerHTML =
      '<div class="empty-note">No gallery photos saved yet.</div>';
    return;
  }

  refs.galleryPreview.innerHTML = gallery
    .map(
      (photo, index) => `
        <figure class="site-project-photo-card">
          <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(`${project.title || "Project"} space ${index + 1}`)}">
          <figcaption>
            <span>${escapeHtml(`Space ${index + 1}`)}</span>
            <button
              type="button"
              class="danger-link"
              data-site-project-remove-photo="${escapeHtml(photo.id || photo.path || "")}"
            >
              Remove
            </button>
          </figcaption>
        </figure>
      `,
    )
    .join("");
}

function renderForm() {
  if (!refs.form) return;

  refs.adminMessage.hidden = state.isAdmin;
  refs.form.hidden = !state.isAdmin;
  refs.deleteButton.hidden = !state.isAdmin || !state.selectedId;
  refs.newButton.disabled = !state.isAdmin;
  refs.search.disabled = !state.isAdmin;
  refs.filter.disabled = !state.isAdmin;

  if (!state.isAdmin) {
    refs.form.reset();
    refs.coverPreview.innerHTML = "";
    refs.galleryPreview.innerHTML = "";
    return;
  }

  const project = currentProject() || blankProject();
  refs.formHeading.textContent = project.id
    ? "Edit site project"
    : state.isCreatingDraft
      ? "New site project draft"
      : "New site project";
  refs.title.value = project.title || "";
  refs.status.value = project.status || "upcoming";
  refs.neighborhood.value = project.neighborhood || "";
  refs.projectType.value = project.projectType || "";
  refs.sortOrder.value =
    project.sortOrder === 0 || project.sortOrder ? String(project.sortOrder) : "";
  refs.description.value = project.description || "";
  refs.published.checked = project.published === true;
  refs.coverFile.value = "";
  refs.galleryFiles.value = "";
  refs.form
    .querySelectorAll("input, select, textarea, button")
    .forEach((control) => {
      control.disabled = !editorIsReady();
    });
  refs.deleteButton.disabled = !editorIsReady();
  refs.resetButton.disabled = !state.isAdmin;
  renderCoverPreview(project);
  renderGalleryPreview(project);
}

function renderAll() {
  renderSummary();
  renderList();
  renderForm();
}

function safeFileName(file) {
  const base = safeString(file?.name || "project-photo")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "project-photo";
}

function photoId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `photo-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

async function uploadProjectPhoto(projectId, file, folder, displayName = "") {
  const path = `siteProjects/${projectId}/${folder}/${Date.now()}-${safeFileName(file)}`;
  const uploadRef = storageRef(state.storage, path);
  await uploadBytes(uploadRef, file);

  return {
    id: photoId(),
    url: await getDownloadURL(uploadRef),
    path,
    name: displayName || (folder === "cover" ? "Cover photo" : "Project space"),
    size: file.size || 0,
    contentType: file.type || "",
  };
}

function collectProjectPayload(existing = null) {
  const sortOrderValue = refs.sortOrder.value.trim();

  return {
    title: refs.title.value.trim(),
    status: refs.status.value === "finished" ? "finished" : "upcoming",
    neighborhood: refs.neighborhood.value.trim(),
    projectType: refs.projectType.value.trim(),
    description: refs.description.value.trim(),
    sortOrder: sortOrderValue === "" ? null : Number(sortOrderValue),
    published: refs.published.checked,
    createdAt: existing?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedByUid: state.profile?.uid || "",
    updatedByName: state.profile?.displayName || state.profile?.email || "",
  };
}

async function deleteStoredPhoto(photo) {
  if (!photo?.path || !state.storage) return;

  try {
    await deleteObject(storageRef(state.storage, photo.path));
  } catch (error) {
    if (error?.code !== "storage/object-not-found") {
      console.warn("Could not delete project photo.", error);
    }
  }
}

async function saveProject(event) {
  event.preventDefault();

  if (!state.isAdmin) {
    showFeedback("Only admins can manage public projects.", "error");
    return;
  }

  if (!editorIsReady()) {
    showFeedback(
      "Project tools are still connecting. Wait a moment and try again.",
      "error",
    );
    return;
  }

  const existing = currentProject();
  const targetRef = existing
    ? doc(state.db, "siteProjects", existing.id)
    : doc(collection(state.db, "siteProjects"));
  const title = refs.title.value.trim();

  if (!title) {
    showFeedback("Add a public project title before saving.", "error");
    refs.title.focus();
    return;
  }

  refs.form.classList.add("is-saving");
  showFeedback("Saving project...", "info");

  try {
    let coverPhoto = existing?.coverPhoto || null;
    const galleryPhotos = Array.isArray(existing?.galleryPhotos)
      ? [...existing.galleryPhotos]
      : [];
    const oldCover = coverPhoto;

    if (refs.coverFile.files?.[0]) {
      coverPhoto = await uploadProjectPhoto(
        targetRef.id,
        refs.coverFile.files[0],
        "cover",
        "Cover photo",
      );
    }

    if (refs.galleryFiles.files?.length) {
      const uploads = await Promise.all(
        Array.from(refs.galleryFiles.files).map((file, index) =>
          uploadProjectPhoto(
            targetRef.id,
            file,
            "gallery",
            `Space ${galleryPhotos.length + index + 1}`,
          ),
        ),
      );
      galleryPhotos.push(...uploads);
    }

    await setDoc(
      targetRef,
      {
        ...collectProjectPayload(existing),
        coverPhoto,
        galleryPhotos,
      },
      { merge: true },
    );

    if (oldCover?.path && coverPhoto?.path && oldCover.path !== coverPhoto.path) {
      await deleteStoredPhoto(oldCover);
    }

    state.selectedId = targetRef.id;
    state.isCreatingDraft = false;
    refs.coverFile.value = "";
    refs.galleryFiles.value = "";
    renderAll();
    showFeedback("Project saved for the public site.", "success");
  } catch (error) {
    console.error("Could not save site project.", error);
    showFeedback(error.message || "Could not save this project.", "error");
  } finally {
    refs.form.classList.remove("is-saving");
  }
}

async function removeCoverPhoto() {
  const project = currentProject();
  if (!project?.id || !project.coverPhoto) return;
  if (!window.confirm("Remove this cover photo from the public project?")) return;

  showFeedback("Removing cover photo...", "info");
  await deleteStoredPhoto(project.coverPhoto);
  await setDoc(
    doc(state.db, "siteProjects", project.id),
    {
      coverPhoto: null,
      updatedAt: serverTimestamp(),
      updatedByUid: state.profile?.uid || "",
      updatedByName: state.profile?.displayName || state.profile?.email || "",
    },
    { merge: true },
  );
  showFeedback("Cover photo removed.", "success");
}

async function removeGalleryPhoto(photoIdToRemove) {
  const project = currentProject();
  if (!project?.id || !photoIdToRemove) return;

  const gallery = Array.isArray(project.galleryPhotos)
    ? project.galleryPhotos
    : [];
  const targetPhoto = gallery.find(
    (photo) => (photo.id || photo.path || "") === photoIdToRemove,
  );
  if (!targetPhoto) return;
  if (!window.confirm("Remove this gallery photo from the public project?")) {
    return;
  }

  showFeedback("Removing gallery photo...", "info");
  await deleteStoredPhoto(targetPhoto);
  await setDoc(
    doc(state.db, "siteProjects", project.id),
    {
      galleryPhotos: gallery.filter((photo) => photo !== targetPhoto),
      updatedAt: serverTimestamp(),
      updatedByUid: state.profile?.uid || "",
      updatedByName: state.profile?.displayName || state.profile?.email || "",
    },
    { merge: true },
  );
  showFeedback("Gallery photo removed.", "success");
}

async function deleteCurrentProject() {
  const project = currentProject();
  if (!project?.id) return;
  if (
    !window.confirm(
      `Delete "${project.title || "this project"}" from the public project manager?`,
    )
  ) {
    return;
  }

  showFeedback("Deleting project...", "info");
  await deleteStoredPhoto(project.coverPhoto);
  await Promise.all(
    (Array.isArray(project.galleryPhotos) ? project.galleryPhotos : []).map(
      deleteStoredPhoto,
    ),
  );
  await deleteDoc(doc(state.db, "siteProjects", project.id));
  state.selectedId = null;
  showFeedback("Project deleted.", "success");
  renderAll();
}

function selectProject(projectId) {
  state.selectedId = projectId;
  state.isCreatingDraft = false;
  showFeedback("");
  renderAll();
}

function startBlankProject() {
  if (!state.isAdmin) {
    showFeedback("Only admins can create public site projects.", "error");
    return;
  }

  state.selectedId = null;
  state.isCreatingDraft = true;
  renderAll();
  showFeedback(
    editorIsReady()
      ? "New project draft is ready. Add a title, description, photos, then save."
      : "New project draft is ready, but the project tools are still connecting.",
    editorIsReady() ? "success" : "info",
  );
  refs.title?.focus();
}

function subscribeProjects() {
  if (state.unsub) {
    state.unsub();
    state.unsub = null;
  }

  if (!state.isAdmin || !state.db) {
    state.projects = [];
    renderAll();
    return;
  }

  state.unsub = onSnapshot(
    collection(state.db, "siteProjects"),
    (snapshot) => {
      state.projects = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));

      if (
        state.selectedId &&
        !state.projects.some((project) => project.id === state.selectedId)
      ) {
        state.selectedId = null;
        state.isCreatingDraft = false;
      }

      renderAll();
    },
    (error) => {
      console.error("Could not load site projects.", error);
      showFeedback(
        error.message || "Could not load public site projects.",
        "error",
      );
    },
  );
}

function applyStaffContext(detail = {}) {
  state.db = detail.db || null;
  state.storage = detail.storage || null;
  state.profile = detail.profile || null;
  state.isAdmin = detail.isAdmin === true;
  if (!state.isAdmin) {
    state.selectedId = null;
    state.isCreatingDraft = false;
  }
  subscribeProjects();
}

refs.search?.addEventListener("input", (event) => {
  state.search = event.target.value || "";
  renderList();
});

refs.filter?.addEventListener("change", (event) => {
  state.filter = event.target.value || "all";
  renderList();
});

refs.newButton?.addEventListener("click", startBlankProject);
refs.resetButton?.addEventListener("click", startBlankProject);
refs.deleteButton?.addEventListener("click", () => {
  deleteCurrentProject().catch((error) =>
    showFeedback(error.message || "Could not delete this project.", "error"),
  );
});
refs.form?.addEventListener("submit", (event) => {
  saveProject(event).catch((error) =>
    showFeedback(error.message || "Could not save this project.", "error"),
  );
});
refs.list?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-site-project-id]");
  if (!button) return;
  selectProject(button.dataset.siteProjectId);
});
refs.coverPreview?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-site-project-remove-cover]");
  if (!button) return;
  removeCoverPhoto().catch((error) =>
    showFeedback(error.message || "Could not remove cover photo.", "error"),
  );
});
refs.galleryPreview?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-site-project-remove-photo]");
  if (!button) return;
  removeGalleryPhoto(button.dataset.siteProjectRemovePhoto).catch((error) =>
    showFeedback(error.message || "Could not remove gallery photo.", "error"),
  );
});

window.addEventListener("goldenbrick:staff-context", (event) => {
  applyStaffContext(event.detail || {});
});

if (window.GoldenBrickStaffContext) {
  applyStaffContext(window.GoldenBrickStaffContext);
} else {
  renderAll();
}
