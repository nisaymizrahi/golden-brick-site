(function () {
  const nav = document.querySelector(".navbar");
  const toggle = document.querySelector(".mobile-menu-toggle");
  const menu = document.querySelector(".nav-links");
  window.dataLayer = window.dataLayer || [];

  function ensureClientPortalNavLink() {
    if (!menu || menu.querySelector('[data-client-portal-link="true"]')) return;

    const listItem = document.createElement("li");
    const link = document.createElement("a");
    const quoteItem = menu.querySelector(".btn-nav")
      ? menu.querySelector(".btn-nav").closest("li")
      : null;

    link.href = "/client/login";
    link.className = "btn-nav";
    link.dataset.clientPortalLink = "true";
    link.setAttribute("aria-label", "Client portal login");
    link.textContent = "Client Portal";

    listItem.appendChild(link);

    if (quoteItem && quoteItem.parentNode === menu) {
      menu.insertBefore(listItem, quoteItem);
      return;
    }

    menu.appendChild(listItem);
  }

  ensureClientPortalNavLink();

  function trackSiteEvent(name, params) {
    const payload = Object.assign(
      {
        page_location: window.location.href,
        page_path: window.location.pathname,
        page_title: document.title,
      },
      params || {},
    );

    window.dataLayer.push(Object.assign({ event: name }, payload));

    if (typeof window.gtag === "function") {
      window.gtag("event", name, payload);
    }
  }

  window.trackSiteEvent = trackSiteEvent;

  function mergeLeadFormExtras(form) {
    const mergeTargetSelector = form.getAttribute("data-merge-extra-into");
    if (!mergeTargetSelector) return;

    const targetField = form.querySelector(mergeTargetSelector);
    if (!targetField) return;

    const baseValue = (
      targetField.dataset.userValue ||
      targetField.value ||
      ""
    ).trim();
    const extraLines = [];
    const handledRadioGroups = new Set();

    form.querySelectorAll("[data-extra-label]").forEach(function (field) {
      const label = field.getAttribute("data-extra-label");
      if (!label) return;

      if (field.type === "radio") {
        if (!field.name || handledRadioGroups.has(field.name)) return;
        handledRadioGroups.add(field.name);

        const checked = form.querySelector(
          'input[type="radio"][name="' + field.name + '"]:checked',
        );
        if (!checked) return;

        extraLines.push(
          label +
            ": " +
            (checked.getAttribute("data-extra-value") ||
              checked.value ||
              "Selected"),
        );
        return;
      }

      if (field.type === "checkbox") {
        if (
          !field.checked &&
          field.getAttribute("data-record-unchecked") !== "true"
        )
          return;

        extraLines.push(
          label +
            ": " +
            (field.checked
              ? field.getAttribute("data-checked-value") || "Yes"
              : field.getAttribute("data-unchecked-value") || "No"),
        );
        return;
      }

      const value = (field.value || "").trim();
      if (!value) return;

      extraLines.push(label + ": " + value);
    });

    if (!extraLines.length) return;

    const mergedParts = [];

    if (baseValue) {
      mergedParts.push(baseValue);
    }

    mergedParts.push("---");
    mergedParts.push("Consultation Details");
    extraLines.forEach(function (line) {
      mergedParts.push(line);
    });

    targetField.value = mergedParts.join("\n");

    window.setTimeout(function () {
      targetField.value = targetField.dataset.userValue || "";
    }, 0);
  }

  function handleLeadFormSuccess(form) {
    const successId = form.getAttribute("data-success-message-id");
    const successMessage = successId
      ? document.getElementById(successId)
      : null;
    const formName = form.getAttribute("data-form-name") || "project_inquiry";
    const mergeTargetSelector = form.getAttribute("data-merge-extra-into");

    form.reset();

    if (mergeTargetSelector) {
      const targetField = form.querySelector(mergeTargetSelector);
      if (targetField) {
        targetField.dataset.userValue = "";
      }
    }

    if (successMessage) {
      successMessage.style.display = "block";
      successMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    trackSiteEvent("generate_lead", {
      lead_type: "quote_request",
      form_name: formName,
    });
  }

  function handleLeadFormError(form, message) {
    const errorId = form.getAttribute("data-error-message-id");
    const errorMessage = errorId ? document.getElementById(errorId) : null;

    if (!errorMessage) {
      window.alert(message);
      return;
    }

    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    errorMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideLeadFormMessages(form) {
    const successId = form.getAttribute("data-success-message-id");
    const errorId = form.getAttribute("data-error-message-id");
    const successMessage = successId
      ? document.getElementById(successId)
      : null;
    const errorMessage = errorId ? document.getElementById(errorId) : null;

    if (successMessage) {
      successMessage.style.display = "none";
    }

    if (errorMessage) {
      errorMessage.style.display = "none";
    }
  }

  function getLeadFieldValue(field, form) {
    if (field.type === "checkbox") {
      return field.checked;
    }

    if (field.type === "radio") {
      if (!field.name) return "";
      const checked = form.querySelector(
        'input[type="radio"][name="' + field.name + '"]:checked',
      );
      return checked ? checked.value : "";
    }

    return (field.value || "").trim();
  }

  function buildLeadPayload(form) {
    const payload = {
      formName: form.getAttribute("data-form-name") || "project_inquiry",
      sourcePage: document.title,
      sourcePath: window.location.pathname,
      sourceUrl: window.location.href,
    };

    form.querySelectorAll("[data-lead-field]").forEach(function (field) {
      const key = field.getAttribute("data-lead-field");
      if (!key) return;

      const value = getLeadFieldValue(field, form);

      if (typeof value === "boolean") {
        payload[key] = value;
        return;
      }

      if (!value) return;
      payload[key] = value;
    });

    if (!payload.projectType) {
      const defaultProjectType = form.getAttribute("data-default-project-type");
      if (defaultProjectType) {
        payload.projectType = defaultProjectType;
      }
    }

    return payload;
  }

  function setLeadFormSubmitting(form, isSubmitting) {
    const submitButton = form.querySelector(
      'button[type="submit"], input[type="submit"]',
    );
    if (!submitButton) return;

    if (!submitButton.dataset.defaultLabel) {
      submitButton.dataset.defaultLabel =
        submitButton.textContent || submitButton.value || "Submit";
    }

    submitButton.disabled = isSubmitting;

    if ("textContent" in submitButton) {
      submitButton.textContent = isSubmitting
        ? "Sending..."
        : submitButton.dataset.defaultLabel;
    }
  }

  document.querySelectorAll(".lead-form").forEach(function (form) {
    const mergeTargetSelector = form.getAttribute("data-merge-extra-into");
    const mergeTarget = mergeTargetSelector
      ? form.querySelector(mergeTargetSelector)
      : null;
    let isSubmitting = false;

    hideLeadFormMessages(form);

    if (mergeTarget) {
      mergeTarget.dataset.userValue = mergeTarget.value || "";
      mergeTarget.addEventListener("input", function () {
        mergeTarget.dataset.userValue = mergeTarget.value;
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (isSubmitting) return;

      mergeLeadFormExtras(form);
      isSubmitting = true;
      hideLeadFormMessages(form);
      setLeadFormSubmitting(form, true);

      fetch(form.getAttribute("action") || "/api/public/lead-intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(buildLeadPayload(form)),
      })
        .then(function (response) {
          return response
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              if (!response.ok) {
                throw new Error(
                  data.message ||
                    "We could not submit the form right now. Please call us at (267) 715-5557.",
                );
              }

              return data;
            });
        })
        .then(function () {
          handleLeadFormSuccess(form);
        })
        .catch(function (error) {
          handleLeadFormError(
            form,
            error.message ||
              "We could not submit the form right now. Please call us at (267) 715-5557.",
          );
        })
        .finally(function () {
          isSubmitting = false;
          setLeadFormSubmitting(form, false);
        });
    });
  });

  function setMenuState(isOpen) {
    if (!toggle || !menu) return;
    menu.classList.toggle("is-open", isOpen);
    toggle.classList.toggle("is-active", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", isOpen);
  }

  function closeMenu() {
    setMenuState(false);
  }

  if (toggle && menu) {
    setMenuState(false);

    toggle.addEventListener("click", function () {
      setMenuState(!menu.classList.contains("is-open"));
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", function (event) {
      if (window.innerWidth > 900 || !nav) return;
      if (!nav.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) {
        closeMenu();
      }
    });
  }

  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(function (link) {
    const href = link.getAttribute("href");
    if (!href || href.indexOf(".html") === -1) return;

    if (href === currentPath) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const yearTarget = document.querySelector("[data-current-year]");
  if (yearTarget) {
    yearTarget.textContent = String(new Date().getFullYear());
  }

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    const label = (link.textContent || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 90);

    if (href.startsWith("tel:")) {
      trackSiteEvent("phone_click", {
        contact_method: "phone",
        link_text: label || href,
      });
      return;
    }

    if (href.startsWith("mailto:")) {
      trackSiteEvent("email_click", {
        contact_method: "email",
        link_text: label || href,
      });
      return;
    }

    if (
      href === "/client/login" ||
      href.indexOf("/client/login?") === 0 ||
      href === "/client/" ||
      href.indexOf("/client/?") === 0
    ) {
      trackSiteEvent("client_portal_click", {
        link_text: label || "Client Portal",
        destination: href,
      });
      return;
    }

    if (
      link.matches(
        ".btn-nav, .btn-footer, .hero-primary, .pathway-link, .text-link",
      ) &&
      (href.indexOf("contact.html") !== -1 || href.charAt(0) === "#")
    ) {
      trackSiteEvent("cta_click", {
        cta_type: "quote",
        link_text: label || "Request a Quote",
        destination: href,
      });
    }
  });

  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !("IntersectionObserver" in window)
  ) {
    return;
  }

  const revealSelectors = [
    ".hero-panel",
    ".stat-card",
    ".statement-card",
    ".highlight-card",
    ".cred-item",
    ".intro-highlight",
    ".pathway-card",
    ".full-service-panel",
    ".services-summary-card",
    ".support-card",
    ".process-card-home",
    ".why-home-card",
    ".cta-detail",
    ".highlight-box",
    ".stat-box",
    ".visit-box",
    ".service-card",
    ".support-panel",
    ".process-card",
    ".detail-card",
    ".why-card",
    ".service-point",
    ".contact-form-wrap",
    ".bottom-card",
    ".footer-column",
    ".resource-card",
    ".faq-item",
  ];

  const targets = document.querySelectorAll(revealSelectors.join(","));
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  targets.forEach(function (target, index) {
    target.classList.add("reveal-ready");
    target.style.transitionDelay = String(Math.min(index % 4, 3) * 70) + "ms";
    observer.observe(target);
  });
})();
