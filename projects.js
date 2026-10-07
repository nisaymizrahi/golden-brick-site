import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  collection,
  initializeFirestore,
  onSnapshot,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CASE_STUDY_URLS = {
  BBKQeLyiyBjk0YYNWbkj: "/projects/italian-market-whole-home-renovation/",
  KD8LBlGkDJMsBueSTuav: "/projects/west-philadelphia-former-bank-redevelopment/",
  ddgIm96Igp8JNaZZiUvw: "/projects/west-philadelphia-mixed-use-building-renovation/",
  pg77OCia9FvQk4odL5yT: "/projects/cheltenham-whole-home-renovation/",
  vXtGc79jVuUaPFMma24O: "/projects/germantown-mixed-use-renovation/",
  x6FGLudXp3uVZtXuDtJ4: "/projects/west-philadelphia-triplex-renovation/",
};
const PUBLIC_TITLES = {
  BBKQeLyiyBjk0YYNWbkj: "Italian Market Full-Home Renovation",
  KD8LBlGkDJMsBueSTuav: "West Philadelphia Former Bank Redevelopment",
  ddgIm96Igp8JNaZZiUvw: "West Philadelphia Mixed-Use Building Renovation",
  pg77OCia9FvQk4odL5yT: "Cheltenham Full-Home Renovation",
  vXtGc79jVuUaPFMma24O: "Germantown Mixed-Use Renovation",
  x6FGLudXp3uVZtXuDtJ4: "West Philadelphia Triplex Renovation",
};
// Keep the six existing portfolio summaries aligned with their reviewed case studies.
// New projects continue to use the description supplied by the project editor.
const PUBLIC_DESCRIPTIONS = {
  BBKQeLyiyBjk0YYNWbkj: "A full-home renovation with two bedrooms and two-and-a-half bathrooms. The work included framing, building systems, a new kitchen, and finishes throughout.",
  KD8LBlGkDJMsBueSTuav: "A former bank planned for five apartments, two commercial spaces, and a roof deck. The proposed work includes new layouts, building systems, and interiors.",
  ddgIm96Igp8JNaZZiUvw: "A renovated commercial space and two three-bedroom apartments, with updated building systems, kitchens, bathrooms, and finishes.",
  pg77OCia9FvQk4odL5yT: "A home renovated for resale, with kitchen and bathroom updates, electrical improvements, flooring, painting, and repairs.",
  vXtGc79jVuUaPFMma24O: "A renovation underway in Germantown, with five planned apartments, a commercial space, storefront updates, and work on the structure and building systems.",
  x6FGLudXp3uVZtXuDtJ4: "A duplex being converted into three apartments: two with two bedrooms and two bathrooms each, plus a one-bedroom, one-bath apartment.",
};
const IMAGE_PRESENTATION_NOTES = {
  KD8LBlGkDJMsBueSTuav: "Digitally enhanced image. Project not complete.",
  vXtGc79jVuUaPFMma24O: "Digitally enhanced image. Project not complete.",
};

const refs = {
  upcomingList: document.getElementById("upcoming-project-list"),
  upcomingLabel: document.getElementById("upcoming-project-count"),
  finishedList: document.getElementById("finished-project-list"),
  finishedLabel: document.getElementById("finished-project-count"),
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function projectText(value = "") {
  return String(value)
    .replace(/\bwhole[-\s]home\b/gi, (match) => {
      if (match === match.toUpperCase()) return "FULL-HOME";
      if (/^Whole/.test(match)) return match[6] === "H" ? "Full-Home" : "Full-home";
      return "full-home";
    })
    .replace(/\bpublished\s+(?=projects?\b)/gi, "");
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

    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    return (
      toMillis(right.updatedAt || right.createdAt) -
      toMillis(left.updatedAt || left.createdAt)
    );
  });
}

function safeProjectUrl(value, { image = false } = {}) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol !== "https:" && url.origin !== window.location.origin) return "";
    if (image && url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.href;
  } catch (_) {
    return "";
  }
}

function projectPhoto(project) {
  return safeProjectUrl(project?.coverPhoto?.url || project?.coverPhotoUrl, { image: true });
}

function projectGallery(project) {
  const coverUrl = projectPhoto(project);
  const title = projectText(PUBLIC_TITLES[project.id] || project.title || "Golden Brick project");
  const gallery = Array.isArray(project?.galleryPhotos) ? project.galleryPhotos : [];
  const photos = coverUrl ? [{
    url: coverUrl,
    name: "Main photo",
    alt: projectText(project.coverPhoto?.alt || title),
  }] : [];

  gallery.forEach((photo, index) => {
    const url = safeProjectUrl(photo?.url || photo?.fileUrl, { image: true });
    if (!url || photos.some((item) => item.url === url)) return;
    photos.push({
      url,
      name: `Photo ${index + 2}`,
      alt: projectText(photo.alt || photo.caption || `${title} — project photo ${index + 2}`),
    });
  });
  return photos.slice(0, 9);
}

function listItems(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => projectText(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n+/)
      .map((item) => projectText(item).trim())
      .filter(Boolean);
  }

  return [];
}

function renderCaseStudyDetail(label, value) {
  const items = listItems(value);
  const text = typeof value === "string" ? projectText(value).trim() : "";

  if (!items.length && !text) return "";

  return `
    <div class="project-case-study-detail">
      <dt>${escapeHtml(label)}</dt>
      <dd>
        ${
          items.length > 1
            ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
            : escapeHtml(items[0] || text)
        }
      </dd>
    </div>
  `;
}

function renderRelatedServices(project) {
  const related = Array.isArray(project?.relatedServices)
    ? project.relatedServices
    : [];

  const links = related
    .map((service) => ({
      label: projectText(service.label || service.name || ""),
      href: safeProjectUrl(service.href || service.url),
    }))
    .filter((service) => service.label && service.href)
    .slice(0, 4);

  if (!links.length) return "";

  return `
    <div class="project-related-services">
      <span>Related services</span>
      ${links
        .map(
          (service) =>
            `<a href="${escapeHtml(service.href)}">${escapeHtml(service.label)}</a>`,
        )
        .join("")}
    </div>
  `;
}

function statusLabel(project) {
  if (project.status === "finished" || project.status === "completed") return "Completed";
  const status = String(project.publicStatus || project.status || "").toLowerCase();
  if (status === "planned") return "Planned";
  if (["in-progress", "in_progress", "in progress"].includes(status)) return "In progress";
  // The existing editor stores both planned and active projects as "upcoming".
  // Keep this known planned project consistent with its case-study page.
  if (project.id === "KD8LBlGkDJMsBueSTuav") return "Planned";
  if (["vXtGc79jVuUaPFMma24O", "x6FGLudXp3uVZtXuDtJ4"].includes(project.id)) return "In progress";
  return "Upcoming";
}

function renderEmpty(container, message) {
  container.innerHTML = `
    <div class="project-empty">
      <strong>${escapeHtml(message.title)}</strong>
      <span>${escapeHtml(message.body)}</span>
    </div>
  `;
}

function renderProjectCard(project) {
  const gallery = projectGallery(project);
  const photo = projectPhoto(project) || gallery[0]?.url || "";
  const title = projectText(PUBLIC_TITLES[project.id] || project.title || "Golden Brick project");
  const projectType = projectText(project.projectType || "Renovation");
  const neighborhood = project.neighborhood || "Philadelphia area";
  const description = projectText(
    PUBLIC_DESCRIPTIONS[project.id] || project.description || "Contact us to learn more about this project.",
  );
  const details = [
    renderCaseStudyDetail("Challenge", project.challenge || project.problem),
    renderCaseStudyDetail("Scope of work", project.scopeOfWork || project.scope),
    renderCaseStudyDetail("Timeline", project.timeline),
    renderCaseStudyDetail("Materials", project.materials),
    renderCaseStudyDetail("Result", project.result),
  ].join("");
  const caseStudyUrl = safeProjectUrl(project.caseStudyUrl || CASE_STUDY_URLS[project.id]);

  return `
    <article class="project-card" data-project-card="${escapeHtml(project.id)}">
      <figure class="project-card-media">
        ${photo ? `<img
          src="${escapeHtml(photo)}"
          alt="${escapeHtml(projectText(project.coverPhoto?.alt || gallery[0]?.alt || title))}"
          loading="lazy"
          decoding="async"
          width="1200"
          height="900"
          sizes="(max-width: 760px) 92vw, (max-width: 1200px) 60vw, 760px"
          data-project-cover="${escapeHtml(project.id)}"
          id="project-photo-${escapeHtml(project.id)}"
        >` : `<figcaption>Project photos coming soon.</figcaption>`}
      </figure>
      <div class="project-card-content">
        <div class="project-card-kicker">
          <span>${escapeHtml(statusLabel(project))}</span>
          <span>${escapeHtml(neighborhood)}</span>
          <span>${escapeHtml(projectType)}</span>
        </div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
        ${
          details
            ? `<dl class="project-case-study-details">${details}</dl>`
            : ""
        }
        ${renderRelatedServices(project)}
        ${
          IMAGE_PRESENTATION_NOTES[project.id]
            ? `<span class="rendering-note">${escapeHtml(IMAGE_PRESENTATION_NOTES[project.id])}</span>`
            : ""
        }
        ${
          caseStudyUrl
            ? `<a class="text-link" href="${escapeHtml(caseStudyUrl)}">View project</a>`
            : ""
        }
        ${
          gallery.length > 1
            ? `
              <div class="project-gallery" role="group" aria-label="${escapeHtml(title)} photos">
                ${gallery
                  .map(
                    (photoItem, index) => `
                      <button
                        type="button"
                        class="project-gallery-button"
                        data-gallery-project="${escapeHtml(project.id)}"
                        data-gallery-photo="${escapeHtml(photoItem.url)}"
                        data-gallery-alt="${escapeHtml(photoItem.alt)}"
                        aria-controls="project-photo-${escapeHtml(project.id)}"
                        aria-label="Show ${escapeHtml(photoItem.name.toLowerCase())} for ${escapeHtml(title)}"
                        aria-pressed="${index === 0}"
                      >
                        ${escapeHtml(photoItem.name)}
                      </button>
                    `,
                  )
                  .join("")}
              </div>
              <div class="project-gallery-preview" aria-hidden="true">
                ${gallery
                  .slice(0, 4)
                  .map(
                    (photoItem) => `
                      <img src="${escapeHtml(photoItem.url)}" alt="" loading="lazy" decoding="async" width="320" height="240">
                    `,
                  )
                  .join("")}
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderProjectGroup({ container, label, projects, emptyTitle, emptyBody }) {
  if (!container) return;
  if (label) label.textContent = `${projects.length} ${projects.length === 1 ? "project" : "projects"}`;

  if (!projects.length) {
    renderEmpty(container, { title: emptyTitle, body: emptyBody });
    return;
  }

  container.innerHTML = sortProjects(projects).map(renderProjectCard).join("");
}

function renderProjects(projects = []) {
  const published = projects.filter((project) => project.published === true && project.draftOnly !== true);
  const isFinished = (project) => ["finished", "completed"].includes(project.status);
  const upcoming = published.filter((project) => !isFinished(project));
  const finished = published.filter(isFinished);

  renderProjectGroup({
    container: refs.upcomingList,
    label: refs.upcomingLabel,
    projects: upcoming,
    emptyTitle: "More projects to come",
    emptyBody:
      "Contact us to discuss a property or see examples of similar work.",
  });

  renderProjectGroup({
    container: refs.finishedList,
    label: refs.finishedLabel,
    projects: finished,
    emptyTitle: "Completed projects",
    emptyBody:
      "Contact us for examples of completed work similar to your project.",
  });
}

function renderError(error) {
  console.error("Could not load public site projects.", error);
  // The server-rendered project cards remain useful if the live feed is unavailable.
}

async function bootstrapProjects() {
  try {
    const configResponse = await fetch("/__/firebase/init.json");
    if (!configResponse.ok) throw new Error("Project configuration is unavailable.");
    const firebaseConfig = await configResponse.json();
    const app = initializeApp(firebaseConfig);
    const db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });

    const siteProjectQuery = query(
      collection(db, "siteProjects"),
      where("published", "==", true),
    );

    onSnapshot(
      siteProjectQuery,
      (snapshot) => {
        renderProjects(
          snapshot.docs.map((docSnapshot) => ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          })),
        );
      },
      renderError,
    );
  } catch (error) {
    renderError(error);
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-gallery-project][data-gallery-photo]");
  if (!button) return;

  const cover = document.querySelector(
    `[data-project-cover="${CSS.escape(button.dataset.galleryProject)}"]`,
  );
  if (cover) {
    cover.src = button.dataset.galleryPhoto;
    cover.alt = button.dataset.galleryAlt || "Project photo";
    const card = button.closest("[data-project-card]");
    card?.querySelectorAll("[data-gallery-project]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
  }
});

bootstrapProjects();
