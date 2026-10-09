(function () {
  const nav = document.querySelector(".navbar");
  const toggle = document.querySelector(".mobile-menu-toggle");
  const menu = document.querySelector(".nav-links");
  const business = window.GOLDEN_BRICK_BUSINESS || {};
  const serviceLinks = business.navigationServices || [
    {
      label: "Full-Home Renovation",
      href: "/full-renovation-philadelphia/",
      description: "Layouts, kitchens, bathrooms, and building systems",
    },
    {
      label: "Kitchen Remodeling",
      href: "/kitchen-remodeling-philadelphia.html",
      description: "Cabinets, countertops, plumbing, and electrical work",
    },
    {
      label: "Bathroom Remodeling",
      href: "/bathroom-remodeling-philadelphia.html",
      description: "Showers, tile, waterproofing, and fixtures",
    },
    {
      label: "Home Additions",
      href: "/home-additions-philadelphia/",
      description: "More living space connected to your existing home",
    },
    {
      label: "New Construction",
      href: "/new-construction/",
      description: "New homes, apartment buildings, and mixed-use properties",
    },
    {
      label: "Multifamily Construction",
      href: "/new-construction/#multifamily",
      description: "New apartment buildings and shared spaces",
    },
  ];
  const socialLinks = business.socialProfiles || [
    {
      label: "Instagram",
      network: "instagram",
      url: "https://www.instagram.com/goldenbrickc/",
    },
    {
      label: "Facebook",
      network: "facebook",
      url: "https://www.facebook.com/share/1QMzpcQzGT/?mibextid=wwXIfr",
    },
  ];
  window.dataLayer = window.dataLayer || [];

  function populateServicesDropdown(dropdown) {
    if (!dropdown) return;

    dropdown.textContent = "";

    serviceLinks.forEach(function (service) {
      const link = document.createElement("a");
      const label = document.createElement("span");
      const description = document.createElement("small");

      link.href = service.href;
      label.textContent = service.label;
      description.textContent = service.description;

      link.appendChild(label);
      link.appendChild(description);
      dropdown.appendChild(link);
    });
  }

  function ensureServicesDropdown() {
    if (!menu) return;

    const existingItem = menu.querySelector('[data-services-dropdown="true"]');

    if (existingItem) {
      populateServicesDropdown(
        existingItem.querySelector(".nav-dropdown-menu"),
      );
      return;
    }

    const listItem = document.createElement("li");
    const button = document.createElement("button");
    const dropdown = document.createElement("div");
    const dropdownId = "services-menu";

    listItem.className = "nav-dropdown";
    listItem.dataset.servicesDropdown = "true";

    button.type = "button";
    button.className = "nav-dropdown-toggle";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", dropdownId);
    button.textContent = "Services";

    dropdown.className = "nav-dropdown-menu";
    dropdown.id = dropdownId;

    populateServicesDropdown(dropdown);

    listItem.appendChild(button);
    listItem.appendChild(dropdown);

    const residentialItem = menu.querySelector('a[href$="residential.html"]')
      ? menu.querySelector('a[href$="residential.html"]').closest("li")
      : null;
    const investorItem = menu.querySelector('a[href$="investors.html"]')
      ? menu.querySelector('a[href$="investors.html"]').closest("li")
      : null;
    const aboutItem = menu.querySelector('a[href$="about.html"]')
      ? menu.querySelector('a[href$="about.html"]').closest("li")
      : null;
    const quoteItem = menu.querySelector(".btn-nav")
      ? menu.querySelector(".btn-nav").closest("li")
      : null;

    if (residentialItem && residentialItem.parentNode === menu) {
      residentialItem.insertAdjacentElement("afterend", listItem);
      return;
    }

    const beforeItem = investorItem || aboutItem || quoteItem;
    if (beforeItem && beforeItem.parentNode === menu) {
      menu.insertBefore(listItem, beforeItem);
      return;
    }

    menu.appendChild(listItem);
  }

  ensureServicesDropdown();

  function ensureProjectsNavLink() {
    if (!menu) return;

    const existingLink = menu.querySelector('a[href$="projects.html"]');

    if (existingLink) {
      existingLink.textContent = "Projects";
      return;
    }

    const listItem = document.createElement("li");
    const link = document.createElement("a");
    const aboutItem = menu.querySelector('a[href$="about.html"]')
      ? menu.querySelector('a[href$="about.html"]').closest("li")
      : null;
    const quoteItem = menu.querySelector(".btn-nav")
      ? menu.querySelector(".btn-nav").closest("li")
      : null;

    link.href = "/projects.html";
    link.textContent = "Projects";

    listItem.appendChild(link);

    const beforeItem = aboutItem || quoteItem;
    if (beforeItem && beforeItem.parentNode === menu) {
      menu.insertBefore(listItem, beforeItem);
      return;
    }

    menu.appendChild(listItem);
  }

  ensureProjectsNavLink();

  function ensureReviewsFooterLink() {
    document.querySelectorAll("footer .footer-links").forEach(function (links) {
      if (links.querySelector('a[href="/reviews/"]')) return;
      const link = document.createElement("a");
      link.href = "/reviews/";
      link.textContent = "Reviews";
      links.appendChild(link);
    });
  }
  ensureReviewsFooterLink();

  function ensurePrimaryNavLink(href, label, beforeSelector) {
    if (!menu || menu.querySelector('a[href="' + href + '"]')) return;

    const listItem = document.createElement("li");
    const link = document.createElement("a");
    const beforeLink = beforeSelector ? menu.querySelector(beforeSelector) : null;
    const beforeItem = beforeLink ? beforeLink.closest("li") : null;

    link.href = href;
    link.textContent = label;
    listItem.appendChild(link);

    if (beforeItem && beforeItem.parentNode === menu) {
      menu.insertBefore(listItem, beforeItem);
      return;
    }

    menu.appendChild(listItem);
  }

  ensurePrimaryNavLink("/process/", "Process", 'a[href$="about.html"]');
  ensurePrimaryNavLink("/guides/", "Guides", ".btn-nav");
  ensurePrimaryNavLink("/investors.html", "Investors", 'a[href="/process/"]');

  function ensureClientPortalNavLink() {
    if (!menu || menu.querySelector('[data-client-portal-link="true"]')) return;

    const listItem = document.createElement("li");
    const link = document.createElement("a");
    const quoteItem = menu.querySelector(".btn-nav")
      ? menu.querySelector(".btn-nav").closest("li")
      : null;

    link.href = "/client/login";
    link.className = "nav-utility-link";
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

  function ensureProjectsFooterLink() {
    document.querySelectorAll("footer .footer-links").forEach(function (footerLinks) {
      const existingLink = footerLinks.querySelector('a[href$="projects.html"]');

      if (existingLink) {
        existingLink.textContent = "Projects";
        return;
      }

      const link = document.createElement("a");
      const aboutLink = footerLinks.querySelector('a[href$="about.html"]');
      const quoteLink = footerLinks.querySelector('a[href$="contact.html"]');

      link.href = "/projects.html";
      link.textContent = "Projects";

      const beforeLink = aboutLink || quoteLink;
      if (beforeLink && beforeLink.parentNode === footerLinks) {
        footerLinks.insertBefore(link, beforeLink);
        return;
      }

      footerLinks.appendChild(link);
    });
  }

  ensureProjectsFooterLink();

  function ensureFooterServiceLinks() {
    const footerServices = [
      "Full-Home Renovation",
      "Kitchen Remodeling",
      "Bathroom Remodeling",
      "Home Additions",
      "New Construction",
      "Multifamily Construction",
    ];

    document.querySelectorAll("footer .footer-links").forEach(function (footerLinks) {
      footerServices.forEach(function (label) {
        const service = serviceLinks.find(function (item) {
          return item.label === label;
        });

        if (!service || footerLinks.querySelector('a[href="' + service.href + '"]')) {
          return;
        }

        const link = document.createElement("a");
        const quoteLink = footerLinks.querySelector('a[href$="contact.html"]');

        link.href = service.href;
        link.textContent = service.label;

        if (quoteLink && quoteLink.parentNode === footerLinks) {
          footerLinks.insertBefore(link, quoteLink);
          return;
        }

        footerLinks.appendChild(link);
      });
    });
  }

  ensureFooterServiceLinks();

  function ensureFooterSocialLinks() {
    document.querySelectorAll("footer .footer-left").forEach(function (footerLeft) {
      if (footerLeft.querySelector(".footer-social-links")) return;

      const socialWrap = document.createElement("div");
      socialWrap.className = "footer-social-links";
      socialWrap.setAttribute("aria-label", "Golden Brick social media links");

      socialLinks.forEach(function (social) {
        const link = document.createElement("a");
        link.href = social.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.dataset.socialNetwork = social.network;
        link.textContent = social.label;
        socialWrap.appendChild(link);
      });

      footerLeft.appendChild(socialWrap);
    });
  }

  ensureFooterSocialLinks();

  function trackSiteEvent(name, params) {
    const payload = Object.assign(
      {
        page_location: window.location.origin + window.location.pathname,
        page_path: window.location.pathname,
        page_title: document.title,
      },
      Object.assign({}, getMarketingAttribution(), params || {}),
    );

    if (typeof window.gtag === "function") {
      window.gtag("event", name, payload);
    } else {
      window.dataLayer.push(Object.assign({ event: name }, payload));
    }
  }

  window.trackSiteEvent = trackSiteEvent;

  function getMarketingAttribution() {
    try {
      return JSON.parse(window.sessionStorage.getItem("golden_brick_attribution") || "{}");
    } catch (error) {
      return {};
    }
  }

  function captureMarketingAttribution() {
    const params = new URLSearchParams(window.location.search);
    const current = getMarketingAttribution();
    const next = Object.assign({}, current);

    [
      ["utm_source", "utm_source"],
      ["utm_medium", "utm_medium"],
      ["utm_campaign", "utm_campaign"],
    ].forEach(function (entry) {
      const value = (params.get(entry[0]) || "").trim().slice(0, 120);
      if (value) next[entry[1]] = value;
    });

    if (!Object.keys(next).length) return;

    try {
      window.sessionStorage.setItem("golden_brick_attribution", JSON.stringify(next));
    } catch (error) {
      // Session storage can be unavailable in privacy-focused browsers.
    }
  }

  captureMarketingAttribution();

  function leadFormNotes(form) {
    const mergeTargetSelector = form.getAttribute("data-merge-extra-into");
    if (!mergeTargetSelector) return;

    const targetField = form.querySelector(mergeTargetSelector);
    if (!targetField) return;

    const baseValue = (targetField.value || "").trim();
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

    if (!extraLines.length) return baseValue;

    const mergedParts = [];

    if (baseValue) {
      mergedParts.push(baseValue);
    }

    mergedParts.push("---");
    mergedParts.push("Consultation Details");
    extraLines.forEach(function (line) {
      mergedParts.push(line);
    });

    return mergedParts.join("\n");
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
      successMessage.setAttribute("tabindex", "-1");
      successMessage.focus({ preventScroll: true });
      successMessage.scrollIntoView({ behavior: "auto", block: "nearest" });
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
    errorMessage.setAttribute("tabindex", "-1");
    errorMessage.focus({ preventScroll: true });
    errorMessage.scrollIntoView({ behavior: "auto", block: "nearest" });
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
      sourceUrl: window.location.origin + window.location.pathname,
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

    const notes = leadFormNotes(form);
    if (typeof notes === "string") payload.notes = notes;
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
    form.setAttribute("aria-busy", isSubmitting ? "true" : "false");

    if ("textContent" in submitButton) {
      submitButton.textContent = isSubmitting
        ? "Sending..."
        : submitButton.dataset.defaultLabel;
    }
  }

  function clearFieldError(field) {
    field.removeAttribute("aria-invalid");
    const errorId = field.dataset.validationErrorId;
    if (!errorId) return;
    const error = document.getElementById(errorId);
    if (error) error.remove();
    const descriptions = (field.getAttribute("aria-describedby") || "")
      .split(/\s+/).filter(function (id) { return id && id !== errorId; });
    if (descriptions.length) field.setAttribute("aria-describedby", descriptions.join(" "));
    else field.removeAttribute("aria-describedby");
  }

  function validateLeadForm(form) {
    const errors = [];
    form.querySelectorAll("input, select, textarea").forEach(function (field, index) {
      if (field.disabled || field.type === "hidden") return;
      clearFieldError(field);
      const value = (field.value || "").trim();
      let message = "";
      if (field.required && (field.type === "checkbox" ? !field.checked : !value)) {
        message = field.type === "checkbox" ? "Please check this box to continue." : "Please complete this field.";
      } else if (value && field.type === "tel") {
        const digits = value.replace(/\s*(?:ext\.?|x|#)\s*\d+\s*$/i, "").replace(/\D/g, "");
        if (digits.length < 7 || digits.length > 15) message = "Enter a phone number where we can reach you.";
      } else if (value && !field.checkValidity()) {
        message = field.type === "email" ? "Enter an email address such as name@example.com, or leave this blank." : field.validationMessage;
      }
      if (!message) return;
      const details = field.closest("details");
      if (details) details.open = true;
      const errorId = (form.dataset.formName || "inquiry") + "-field-error-" + index;
      const error = document.createElement("span");
      error.id = errorId;
      error.className = "field-error";
      error.textContent = message;
      field.insertAdjacentElement("afterend", error);
      field.dataset.validationErrorId = errorId;
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", [field.getAttribute("aria-describedby"), errorId].filter(Boolean).join(" "));
      errors.push(field);
    });
    if (!errors.length) return true;
    handleLeadFormError(form, "Please check the highlighted fields and try again.");
    errors[0].focus();
    trackSiteEvent("form_validation_error", { form_name: form.dataset.formName || "project_inquiry", error_count: errors.length });
    return false;
  }

  let turnstileScriptPromise;

  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (turnstileScriptPromise) return turnstileScriptPromise;

    turnstileScriptPromise = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      const timeout = window.setTimeout(failed, 12000);
      function failed() {
        window.clearTimeout(timeout);
        script.remove();
        reject(new Error("Verification could not load."));
      }
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onerror = failed;
      script.onload = function () {
        if (!window.turnstile) return failed();
        window.clearTimeout(timeout);
        resolve(window.turnstile);
      };
      document.head.appendChild(script);
    }).catch(function (error) {
      turnstileScriptPromise = null;
      throw error;
    });
    return turnstileScriptPromise;
  }

  function setupLeadVerification(form) {
    let container = form.querySelector("[data-lead-verification]");
    if (!container) {
      container = document.createElement("div");
      container.className = "lead-verification";
      form.querySelector('[type="submit"]').insertAdjacentElement("beforebegin", container);
    }
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", "Human verification");
    container.tabIndex = -1;
    const title = document.createElement("strong");
    title.textContent = "Quick security check";
    const widget = document.createElement("div");
    widget.className = "lead-verification-widget";
    const status = document.createElement("p");
    status.className = "lead-verification-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "lead-verification-retry";
    retry.textContent = "Retry security check";
    retry.hidden = true;
    container.append(title, widget, status, retry);

    // An extra spam trap, excluded from keyboard navigation and screen readers.
    const trap = document.createElement("div");
    trap.className = "lead-form-trap";
    trap.setAttribute("aria-hidden", "true");
    const trapLabel = document.createElement("label");
    trapLabel.textContent = "Leave this field empty";
    const trapField = document.createElement("input");
    trapField.type = "text";
    trapField.name = "website";
    trapField.dataset.leadField = "website";
    trapField.tabIndex = -1;
    trapField.autocomplete = "off";
    trapLabel.appendChild(trapField);
    trap.appendChild(trapLabel);
    form.appendChild(trap);

    let token = "";
    let widgetId = null;
    let siteKey = "";
    let widgetSize = "";
    let loading = false;

    function showStatus(message, failed) {
      status.textContent = message;
      container.classList.toggle("has-error", Boolean(failed));
      retry.hidden = !failed;
    }

    function unavailable() {
      token = "";
      showStatus("The security check couldn’t load. Retry, or call (267) 715-5557 to request an estimate.", true);
    }

    function renderWidget() {
      token = "";
      if (widgetId !== null) window.turnstile.remove(widgetId);
      widgetSize = widget.clientWidth < 300 ? "compact" : "flexible";
      showStatus("Checking your browser. Please complete the check if prompted.", false);
      widgetId = window.turnstile.render(widget, {
        sitekey: siteKey,
        action: "estimate_request",
        theme: "light",
        size: widgetSize,
        "response-field": false,
        "refresh-expired": "auto",
        callback: function (value) {
          token = value;
          showStatus("Verified. You’re ready to send your request.", false);
        },
        "expired-callback": function () {
          token = "";
          showStatus("Your security check expired. Please complete the refreshed check.", false);
        },
        "timeout-callback": function () {
          token = "";
          showStatus("The security check timed out. Please try it again.", true);
        },
        "error-callback": function () {
          unavailable();
          return true;
        },
        "unsupported-callback": unavailable,
      });
    }

    async function load() {
      if (loading) return;
      loading = true;
      token = "";
      showStatus("Loading the security check…", false);
      const controller = new AbortController();
      const timeout = window.setTimeout(function () { controller.abort(); }, 12000);
      try {
        const response = await fetch(form.getAttribute("action") || "/api/public/lead-intake", {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.ok || !data.turnstileSiteKey) throw new Error("Verification unavailable.");
        siteKey = data.turnstileSiteKey;
        await loadTurnstile();
        renderWidget();
      } catch (error) {
        unavailable();
      } finally {
        window.clearTimeout(timeout);
        loading = false;
      }
    }

    function reset() {
      token = "";
      if (widgetId === null || !window.turnstile) return;
      showStatus("Checking your browser. Please complete the check if prompted.", false);
      try { window.turnstile.reset(widgetId); } catch (error) { unavailable(); }
    }

    retry.addEventListener("click", function () {
      if (widgetId === null) load();
      else reset();
    });
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        const nextSize = widget.clientWidth < 300 ? "compact" : "flexible";
        if (widgetId !== null && nextSize !== widgetSize) {
          try { renderWidget(); } catch (error) { unavailable(); }
        }
      }).observe(widget);
    }
    load();
    return {
      getToken: function () { return token; },
      reset: reset,
      focus: function () {
        container.focus({ preventScroll: true });
        container.scrollIntoView({ behavior: "auto", block: "center" });
      },
    };
  }

  document.querySelectorAll(".lead-form").forEach(function (form) {
    let isSubmitting = false;
    let hasStarted = false;
    form.noValidate = true;
    hideLeadFormMessages(form);
    const verification = setupLeadVerification(form);
    const limits = { clientName: 120, clientEmail: 254, clientPhone: 40, projectAddress: 300, notes: 5000 };
    form.querySelectorAll("[data-lead-field]").forEach(function (field) {
      const limit = limits[field.dataset.leadField];
      if (limit && !field.hasAttribute("maxlength")) field.maxLength = limit;
      field.addEventListener("input", function () { clearFieldError(field); });
      field.addEventListener("change", function () { clearFieldError(field); });
    });
    const attribution = getMarketingAttribution();
    Object.keys(attribution).forEach(function (key) {
      const field = document.createElement("input");
      field.type = "hidden";
      field.value = attribution[key];
      field.dataset.extraLabel = key.replace("utm_", "UTM ");
      form.appendChild(field);
    });
    form.addEventListener("focusin", function () {
      if (hasStarted) return;
      hasStarted = true;
      trackSiteEvent("form_start", { form_name: form.dataset.formName || "project_inquiry" });
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (isSubmitting) return;
      hideLeadFormMessages(form);
      if (!validateLeadForm(form)) return;
      const token = verification.getToken();
      if (!token) {
        handleLeadFormError(form, "Please complete the security check before sending your request. Your details are still here.");
        verification.focus();
        return;
      }
      isSubmitting = true;
      setLeadFormSubmitting(form, true);
      const controller = new AbortController();
      const timeout = window.setTimeout(function () { controller.abort(); }, 20000);
      const failure = "We couldn’t confirm your request. Your details are still here. Try again, or call (267) 715-5557.";
      fetch(form.getAttribute("action") || "/api/public/lead-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.assign(buildLeadPayload(form), { turnstileToken: token })),
        signal: controller.signal,
      })
        .then(async function (response) {
          const data = await response.json().catch(function () { return null; });
          if (!response.ok || !data || data.ok !== true) {
            const messages = {
              verification_required: "Please complete the security check, then send your request again.",
              verification_failed: "The security check expired or couldn’t be confirmed. Please complete the new check and try again. Your details are still here.",
              verification_unavailable: "The security check is temporarily unavailable. Your details are still here. Please retry in a moment, or call (267) 715-5557.",
              rate_limited: "Too many requests were sent recently. Please try again later, or call (267) 715-5557.",
              validation_failed: "Please check your contact details, project type, and full project address, then try again.",
            };
            throw new Error((data && messages[data.code]) || failure);
          }
          return data;
        })
        .then(function () { handleLeadFormSuccess(form); })
        .catch(function (error) {
          handleLeadFormError(form, error.name === "AbortError" || error instanceof TypeError ? failure : error.message);
          trackSiteEvent("form_error", { form_name: form.dataset.formName || "project_inquiry" });
        })
        .finally(function () {
          window.clearTimeout(timeout);
          isSubmitting = false;
          setLeadFormSubmitting(form, false);
          verification.reset();
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

  function setDropdownState(dropdownItem, isOpen) {
    if (!dropdownItem) return;

    const dropdownToggle = dropdownItem.querySelector(".nav-dropdown-toggle");
    if (!dropdownToggle) return;

    dropdownItem.classList.toggle("is-open", isOpen);
    dropdownToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function closeDropdowns() {
    document.querySelectorAll(".nav-dropdown.is-open").forEach(function (dropdownItem) {
      setDropdownState(dropdownItem, false);
    });
  }

  function closeMenu() {
    setMenuState(false);
    closeDropdowns();
  }

  if (toggle && menu) {
    setMenuState(false);

    menu.querySelectorAll(".nav-dropdown-toggle").forEach(function (dropdownToggle) {
      dropdownToggle.addEventListener("click", function () {
        const dropdownItem = dropdownToggle.closest(".nav-dropdown");
        const isOpen = dropdownItem && dropdownItem.classList.contains("is-open");

        closeDropdowns();
        setDropdownState(dropdownItem, !isOpen);
      });
    });

    toggle.addEventListener("click", function () {
      if (menu.classList.contains("is-open")) closeMenu();
      else setMenuState(true);
    });

    menu.querySelectorAll(".nav-dropdown").forEach(function (item) {
      item.addEventListener("mouseenter", function () {
        if (window.innerWidth > 1120 && window.matchMedia("(hover: hover)").matches) setDropdownState(item, true);
      });
      item.addEventListener("mouseleave", function () {
        if (window.innerWidth > 1120 && !item.contains(document.activeElement)) setDropdownState(item, false);
      });
      item.addEventListener("focusout", function (event) {
        if (!item.contains(event.relatedTarget)) setDropdownState(item, false);
      });
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", function (event) {
      if (!nav) return;
      if (!nav.contains(event.target)) {
        if (window.innerWidth <= 1120) {
          closeMenu();
          return;
        }

        closeDropdowns();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        const dropdown = nav.querySelector(".nav-dropdown.is-open .nav-dropdown-toggle");
        const mobileOpen = menu.classList.contains("is-open");
        closeMenu();
        if (mobileOpen) toggle.focus();
        else if (dropdown) dropdown.focus();
      }
      if (event.key === "Tab" && window.innerWidth <= 1120 && menu.classList.contains("is-open")) {
        const focusable = [toggle].concat(Array.from(menu.querySelectorAll("a, button"))).filter(function (item) { return item.getClientRects().length; });
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1120) {
        closeMenu();
        closeDropdowns();
      }
    });
  }

  function normalizeSitePath(value) {
    if (!value) return null;

    let url;

    try {
      url = new URL(value, window.location.origin);
    } catch (error) {
      return null;
    }

    if (url.origin !== window.location.origin) return null;

    let pathname = url.pathname || "/";
    pathname = pathname.replace(/\/index\.html$/, "/");

    if (pathname !== "/" && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }

    return pathname || "/";
  }

  const currentPath = normalizeSitePath(window.location.pathname) || "/";
  document.querySelectorAll(".nav-links a").forEach(function (link) {
    const href = link.getAttribute("href");
    const linkPath = normalizeSitePath(href);

    if (!linkPath) return;

    if (linkPath === currentPath) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  document.querySelectorAll(".nav-dropdown").forEach(function (dropdownItem) {
    const dropdownToggle = dropdownItem.querySelector(".nav-dropdown-toggle");
    const hasCurrentLink = Boolean(dropdownItem.querySelector('a[aria-current="page"]'));

    if (dropdownToggle) {
      dropdownToggle.classList.toggle("is-current", hasCurrentLink);
    }
  });

  const yearTarget = document.querySelector("[data-current-year]");
  if (yearTarget) {
    yearTarget.textContent = String(new Date().getFullYear());
  }

  function businessValue(key, fallback) {
    return business[key] || fallback || "";
  }

  function absoluteBusinessUrl(value) {
    try {
      return new URL(value || "/", businessValue("url", window.location.origin)).href;
    } catch (error) {
      return window.location.href;
    }
  }

  function textFromElement(element) {
    return element ? (element.textContent || "").trim().replace(/\s+/g, " ") : "";
  }

  function metaContent(selector) {
    const element = document.querySelector(selector);
    return element ? element.getAttribute("content") || "" : "";
  }

  function pageCanonicalUrl() {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href) return canonical.href;
    return window.location.href.split("#")[0];
  }

  function areaServedSchema() {
    return (business.serviceAreas || []).map(function (area) {
      if (area === "Philadelphia") {
        return {
          "@type": "City",
          name: "Philadelphia",
        };
      }

      if (area.indexOf("County") !== -1) {
        return {
          "@type": "AdministrativeArea",
          name: area + ", PA",
        };
      }

      return {
        "@type": "Place",
        name: area + ", PA",
      };
    });
  }

  function credentialSchema() {
    return (business.licenses || []).map(function (license) {
      return {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: license.category,
        identifier: license.identifier,
      };
    });
  }

  function businessIdentifiers() {
    return (business.licenses || []).map(function (license) {
      return {
        "@type": "PropertyValue",
        name: license.label,
        value: license.identifier,
      };
    });
  }

  function businessSameAs() {
    return (business.socialProfiles || [])
      .map(function (profile) {
        return profile.url;
      })
      .filter(Boolean);
  }

  function baseBusinessGraph() {
    const name = businessValue("name", "Golden Brick Construction");
    const url = businessValue("url", "https://www.goldenbrickc.com/");
    const image = metaContent('meta[property="og:image"]') || business.defaultImage;
    const address = business.address || {};
    const graph = [
      {
        "@type": "Organization",
        "@id": absoluteBusinessUrl("#organization"),
        name: name,
        url: url,
        logo: business.logo,
        image: image,
        email: business.email,
        telephone: business.phoneE164,
        sameAs: businessSameAs(),
        identifier: businessIdentifiers(),
        hasCredential: credentialSchema(),
      },
      {
        "@type": ["HomeAndConstructionBusiness", "GeneralContractor"],
        "@id": absoluteBusinessUrl("#contractor"),
        name: name,
        url: url,
        image: image,
        email: business.email,
        telephone: business.phoneE164,
        sameAs: businessSameAs(),
        address: {
          "@type": "PostalAddress",
          addressLocality: address.locality,
          addressRegion: address.region,
          addressCountry: address.country,
        },
        areaServed: areaServedSchema(),
        identifier: businessIdentifiers(),
        hasCredential: credentialSchema(),
      },
    ];

    return graph.map(function (item) {
      Object.keys(item).forEach(function (key) {
        if (
          item[key] === undefined ||
          item[key] === "" ||
          (Array.isArray(item[key]) && item[key].length === 0)
        ) {
          delete item[key];
        }
      });

      return item;
    });
  }

  function breadcrumbSchema(pageData) {
    const breadcrumbNav = document.querySelector(".breadcrumbs");
    const elements = [];

    if (breadcrumbNav) {
      breadcrumbNav.querySelectorAll("a, span[aria-current='page']").forEach(function (item) {
        const name = textFromElement(item);
        if (!name || name === "/") return;

        elements.push({
          "@type": "ListItem",
          position: elements.length + 1,
          name: name,
          item:
            item.tagName && item.tagName.toLowerCase() === "a"
              ? absoluteBusinessUrl(item.getAttribute("href"))
              : pageCanonicalUrl(),
        });
      });
    }

    if (!elements.length) {
      elements.push({
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: businessValue("url", "https://www.goldenbrickc.com/"),
      });

      if (currentPath !== "/") {
        elements.push({
          "@type": "ListItem",
          position: 2,
          name: pageData.name || textFromElement(document.querySelector("h1")) || document.title,
          item: pageCanonicalUrl(),
        });
      }
    }

    return {
      "@type": "BreadcrumbList",
      "@id": pageCanonicalUrl() + "#breadcrumbs",
      itemListElement: elements,
    };
  }

  function faqSchema() {
    const questions = [];

    document.querySelectorAll(".faq-item").forEach(function (item) {
      const summary = item.querySelector("summary");
      const answer = item.querySelector("p");
      const questionText = textFromElement(summary);
      const answerText = textFromElement(answer);

      if (!questionText || !answerText) return;

      questions.push({
        "@type": "Question",
        name: questionText,
        acceptedAnswer: {
          "@type": "Answer",
          text: answerText,
        },
      });
    });

    if (!questions.length) return null;

    return {
      "@type": "FAQPage",
      "@id": pageCanonicalUrl() + "#faq",
      mainEntity: questions,
    };
  }

  function pageSpecificSchema(pageData) {
    const schemaType = pageData.schemaType || "webpage";
    const name = textFromElement(document.querySelector("h1")) || pageData.name || document.title;
    const description =
      metaContent('meta[name="description"]') ||
      metaContent('meta[property="og:description"]') ||
      "";
    const image = metaContent('meta[property="og:image"]') || business.defaultImage;

    if (schemaType === "home") {
      return {
        "@type": "WebPage",
        "@id": pageCanonicalUrl() + "#webpage",
        name: name,
        description: description,
        url: pageCanonicalUrl(),
        about: {
          "@id": absoluteBusinessUrl("#contractor"),
        },
        isPartOf: {
          "@id": absoluteBusinessUrl("#website"),
        },
      };
    }

    if (schemaType === "service") {
      return {
        "@type": "Service",
        "@id": pageCanonicalUrl() + "#service",
        name: name,
        url: pageCanonicalUrl(),
        serviceType: pageData.serviceType || name,
        provider: {
          "@id": absoluteBusinessUrl("#contractor"),
        },
        areaServed: areaServedSchema(),
        description: description,
      };
    }

    if (schemaType === "article") {
      return {
        "@type": "Article",
        "@id": pageCanonicalUrl() + "#article",
        headline: name,
        description: description,
        image: image,
        author: {
          "@id": absoluteBusinessUrl("#organization"),
        },
        publisher: {
          "@id": absoluteBusinessUrl("#organization"),
        },
        mainEntityOfPage: pageCanonicalUrl(),
      };
    }

    if (schemaType === "contact") {
      return {
        "@type": "ContactPage",
        "@id": pageCanonicalUrl() + "#contact",
        name: name,
        description: description,
        url: pageCanonicalUrl(),
        about: {
          "@id": absoluteBusinessUrl("#contractor"),
        },
      };
    }

    if (schemaType === "about") {
      return {
        "@type": "AboutPage",
        "@id": pageCanonicalUrl() + "#about",
        name: name,
        description: description,
        url: pageCanonicalUrl(),
        about: {
          "@id": absoluteBusinessUrl("#organization"),
        },
      };
    }

    return {
      "@type": "WebPage",
      "@id": pageCanonicalUrl() + "#webpage",
      name: name,
      description: description,
      url: pageCanonicalUrl(),
      image: image,
      isPartOf: {
        "@id": absoluteBusinessUrl("#website"),
      },
    };
  }

  function ensureStructuredData() {
    if (document.querySelector('script[type="application/ld+json"][data-static-schema]')) {
      return;
    }
    const robotsContent = metaContent('meta[name="robots"]');
    if (robotsContent.toLowerCase().indexOf("noindex") !== -1) return;

    const pages = business.pages || {};
    const pageData = pages[currentPath] || {};
    const graph = baseBusinessGraph();
    const pageSchema = pageSpecificSchema(pageData);
    const faq = faqSchema();

    graph.push({
      "@type": "WebSite",
      "@id": absoluteBusinessUrl("#website"),
      url: businessValue("url", "https://www.goldenbrickc.com/"),
      name: businessValue("name", "Golden Brick Construction"),
      publisher: {
        "@id": absoluteBusinessUrl("#organization"),
      },
    });

    if (pageSchema) {
      graph.push(pageSchema);
    }

    graph.push(breadcrumbSchema(pageData));

    if (faq) {
      graph.push(faq);
    }

    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.dataset.generatedBy = "business-data";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": graph,
    });
    document.head.appendChild(schema);
  }

  function ensureBusinessDataBindings() {
    const phoneDisplay = businessValue("phoneDisplay", "(267) 715-5557");
    const phoneRaw = businessValue("phoneRaw", "2677155557");
    const email = businessValue("email", "info@goldenbrickc.com");
    const serviceAreaDisplay = businessValue(
      "serviceAreaDisplay",
      "Philadelphia, Bucks County, Montgomery County, Delaware County, and the Main Line",
    );
    const footerBlurb = businessValue(
      "footerBlurb",
      "Home renovations, additions, and new construction for Philadelphia homeowners and real estate investors.",
    );
    const licenseText = (business.licenses || [])
      .map(function (license) {
        return license.label + " #" + license.identifier;
      })
      .join(". ");

    document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
      link.href = "tel:" + phoneRaw;
      const currentLabel = textFromElement(link);

      if (currentLabel.indexOf("267") !== -1) {
        link.textContent = /^call\b/i.test(currentLabel)
          ? "Call " + phoneDisplay
          : phoneDisplay;
      }
    });

    document.querySelectorAll('a[href^="mailto:"]').forEach(function (link) {
      link.href = "mailto:" + email;
      if (textFromElement(link).indexOf("@") !== -1) {
        link.textContent = email;
      }
    });

    document.querySelectorAll("[data-business-phone]").forEach(function (element) {
      element.textContent = phoneDisplay;
    });

    document.querySelectorAll("[data-business-email]").forEach(function (element) {
      element.textContent = email;
    });

    document.querySelectorAll("[data-business-service-areas]").forEach(function (element) {
      element.textContent = serviceAreaDisplay;
    });

    document.querySelectorAll("footer .footer-blurb").forEach(function (element) {
      element.textContent = footerBlurb;
    });

    document.querySelectorAll("footer .footer-contact-list").forEach(function (list) {
      list.querySelectorAll("p").forEach(function (item) {
        const label = textFromElement(item.querySelector("strong"));

        if (label === "Serving") {
          item.innerHTML = "<strong>Serving</strong> " + serviceAreaDisplay;
        }
      });
    });

    document.querySelectorAll(".copyright").forEach(function (element) {
      const year = String(new Date().getFullYear());
      element.textContent =
        "\u00a9 " +
        year +
        " " +
        businessValue("name", "Golden Brick Construction") +
        (licenseText ? ". " + licenseText + "." : ".");
    });
  }

  ensureBusinessDataBindings();
  ensureStructuredData();

  if (
    currentPath.indexOf("/projects/") === 0 &&
    currentPath !== "/projects"
  ) {
    trackSiteEvent("project_case_study_view", {
      case_study_path: currentPath,
    });
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

    if (link.closest(".footer-social-links")) {
      trackSiteEvent("social_click", {
        network: link.dataset.socialNetwork || label.toLowerCase(),
        link_text: label || href,
        destination: href,
      });
      return;
    }

    if (
      link.matches("[data-google-review-link]") ||
      link.dataset.socialNetwork === "google"
    ) {
      trackSiteEvent("google_review_click", {
        link_text: label || "Read our Google reviews",
        destination: href,
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
        cta_type: "estimate",
        link_text: label || "Request an Estimate",
        destination: href,
      });
      trackSiteEvent("request_estimate_click", {
        link_text: label || "Request an Estimate",
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
    ".bottom-card",
    ".footer-column",
    ".resource-card",
    ".faq-item",
    ".seo-card",
    ".seo-link-card",
    ".seo-photo-card",
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
