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

    heading.append(title, closeButton);
    figure.append(image, caption);
    dialog.append(heading, figure);
    document.body.append(dialog);

    let returnFocus = null;

    function cleanText(element) {
      return element ? Array.from(element.childNodes, function (node) {
        return node.textContent || "";
      }).join(" ").trim().replace(/\s+/g, " ") : "";
    }

    links.forEach(function (link) {
      link.setAttribute("aria-haspopup", "dialog");
      link.addEventListener("click", function (event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
            event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute("download")) return;

        const thumbnail = link.querySelector("img");
        if (!thumbnail || !link.getAttribute("href")) return;

        const sourceFigure = link.closest("figure");
        const sourceCaption = sourceFigure && sourceFigure.querySelector("figcaption");
        const sourceTitle = sourceCaption && sourceCaption.querySelector("strong");

        title.textContent = link.dataset.mediaTitle || cleanText(sourceTitle) || "Project photo";
        caption.textContent = link.dataset.mediaCaption || cleanText(sourceCaption);
        caption.hidden = !caption.textContent;
        image.alt = thumbnail.alt || title.textContent;
        image.src = link.href;

        if (caption.textContent) dialog.setAttribute("aria-describedby", caption.id);
        else dialog.removeAttribute("aria-describedby");

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

    dialog.addEventListener("click", function (event) {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });

    dialog.addEventListener("keydown", function (event) {
      // Escape retains the native dialog behavior without closing the site's navigation.
      if (event.key === "Escape") event.stopPropagation();
    });

    dialog.addEventListener("close", function () {
      document.documentElement.classList.remove("media-viewer-open");
      document.body.classList.remove("media-viewer-open");
      image.removeAttribute("src");
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeMedia, { once: true });
  } else {
    initializeMedia();
  }
})();
