(function () {
  "use strict";

  function initializeMedia() {
    // Native controls remain usable without JavaScript. Only one film plays at a time.
    document.addEventListener("play", function (event) {
      if (!(event.target instanceof HTMLVideoElement)) return;

      document.querySelectorAll("video").forEach(function (video) {
        if (video !== event.target && !video.paused) video.pause();
      });
    }, true);

    const links = document.querySelectorAll("a[data-media-viewer]");
    if (!links.length || typeof HTMLDialogElement === "undefined" ||
        typeof HTMLDialogElement.prototype.showModal !== "function") return;

    const dialog = document.createElement("dialog");
    dialog.className = "media-viewer";
    dialog.setAttribute("aria-labelledby", "media-viewer-title");

    const heading = document.createElement("div");
    heading.className = "media-viewer-heading";

    const title = document.createElement("h2");
    title.className = "media-viewer-title";
    title.id = "media-viewer-title";

    const closeButton = document.createElement("button");
    closeButton.className = "media-viewer-close";
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.setAttribute("aria-label", "Close photo viewer");

    const figure = document.createElement("figure");
    figure.className = "media-viewer-figure";

    const image = document.createElement("img");
    image.className = "media-viewer-image";
    image.decoding = "async";

    const caption = document.createElement("figcaption");
    caption.className = "media-viewer-caption";
    caption.id = "media-viewer-caption";

    const navigation = document.createElement("div");
    navigation.className = "media-viewer-navigation";
    navigation.setAttribute("role", "group");
    navigation.setAttribute("aria-label", "Photo navigation");
    navigation.hidden = true;

    const previousButton = document.createElement("button");
    previousButton.className = "media-viewer-nav";
    previousButton.type = "button";
    previousButton.textContent = "Previous";
    previousButton.setAttribute("aria-label", "Previous photo");

    const counter = document.createElement("span");
    counter.className = "media-viewer-counter";
    counter.setAttribute("role", "status");
    counter.setAttribute("aria-live", "polite");
    counter.setAttribute("aria-atomic", "true");

    const nextButton = document.createElement("button");
    nextButton.className = "media-viewer-nav";
    nextButton.type = "button";
    nextButton.textContent = "Next";
    nextButton.setAttribute("aria-label", "Next photo");

    navigation.append(previousButton, counter, nextButton);
    heading.append(title, closeButton);
    figure.append(image, navigation, caption);
    dialog.append(heading, figure);
    document.body.append(dialog);

    let returnFocus = null;
    let activeGallery = [];
    let activeIndex = 0;

    function cleanText(element) {
      return element ? Array.from(element.childNodes, function (node) {
        return node.textContent || "";
      }).join(" ").trim().replace(/\s+/g, " ") : "";
    }

    function showPhoto(index) {
      activeIndex = index;
      const link = activeGallery[activeIndex];
      const thumbnail = link.querySelector("img");
      const sourceFigure = link.closest("figure");
      const sourceCaption = sourceFigure && sourceFigure.querySelector("figcaption");
      const sourceTitle = sourceCaption && sourceCaption.querySelector("strong");

      title.textContent = link.dataset.mediaTitle || cleanText(sourceTitle) || "Project photo";
      caption.textContent = link.dataset.mediaCaption || cleanText(sourceCaption);
      caption.hidden = !caption.textContent;
      image.alt = thumbnail.alt || title.textContent;
      image.src = link.href;
      counter.textContent = String(activeIndex + 1) + " / " + String(activeGallery.length);
      navigation.hidden = activeGallery.length < 2;
      dialog.classList.toggle("media-viewer--gallery", !navigation.hidden);

      if (caption.textContent) dialog.setAttribute("aria-describedby", caption.id);
      else dialog.removeAttribute("aria-describedby");
    }

    function movePhoto(direction) {
      if (activeGallery.length < 2) return;
      showPhoto((activeIndex + direction + activeGallery.length) % activeGallery.length);
    }

    links.forEach(function (link) {
      link.setAttribute("aria-haspopup", "dialog");
      link.addEventListener("click", function (event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
            event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute("download")) return;

        const thumbnail = link.querySelector("img");
        if (!thumbnail || !link.getAttribute("href")) return;

        const galleryName = (link.dataset.mediaGallery || "").trim();
        activeGallery = galleryName ? Array.from(links).filter(function (candidate) {
          return (candidate.dataset.mediaGallery || "").trim() === galleryName &&
            candidate.getAttribute("href") && candidate.querySelector("img") &&
            !candidate.hasAttribute("download");
        }) : [link];
        showPhoto(activeGallery.indexOf(link));

        returnFocus = link;
        try {
          dialog.showModal();
        } catch (error) {
          // The ordinary image link still works if the browser cannot open a modal.
          returnFocus = null;
          return;
        }

        event.preventDefault();
        document.documentElement.classList.add("media-viewer-open");
        document.body.classList.add("media-viewer-open");
        closeButton.focus({ preventScroll: true });
      });
    });

    closeButton.addEventListener("click", function () {
      dialog.close();
    });

    previousButton.addEventListener("click", function () {
      movePhoto(-1);
    });

    nextButton.addEventListener("click", function () {
      movePhoto(1);
    });

    dialog.addEventListener("click", function (event) {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });

    dialog.addEventListener("keydown", function (event) {
      // Escape retains the native dialog behavior without closing the site's navigation.
      if (event.key === "Escape") event.stopPropagation();
      if (activeGallery.length < 2 || event.defaultPrevented || event.isComposing ||
          event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
          (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
      if (event.target instanceof Element &&
          (event.target.isContentEditable || event.target.closest(
            "input, textarea, select, video, audio, [role='slider'], [role='spinbutton'], [role='combobox']"
          ))) return;

      event.preventDefault();
      event.stopPropagation();
      movePhoto(event.key === "ArrowLeft" ? -1 : 1);
    });

    dialog.addEventListener("close", function () {
      document.documentElement.classList.remove("media-viewer-open");
      document.body.classList.remove("media-viewer-open");
      image.removeAttribute("src");
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
      activeGallery = [];
      activeIndex = 0;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeMedia, { once: true });
  } else {
    initializeMedia();
  }
})();
