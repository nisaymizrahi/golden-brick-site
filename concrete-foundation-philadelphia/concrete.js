(function () {
  "use strict";

  const form = document.querySelector('.lead-form[data-form-name="concrete_foundation_inquiry"]');
  const formWrap = document.getElementById("estimate-form");
  const serviceField = document.getElementById("concrete-service");
  if (!form || !formWrap || !serviceField) return;

  // Keep ad details with the inquiry, never in analytics event labels or contact URLs.
  // The shared form already captures utm_source, utm_medium, and utm_campaign.
  const campaignKeys = ["utm_content", "utm_term", "gclid", "gbraid", "wbraid", "msclkid", "fbclid"];
  const query = new URLSearchParams(window.location.search);
  const baseKeys = ["utm_source", "utm_medium", "utm_campaign"];
  let baseCampaign = {};
  try {
    const storedBase = JSON.parse(window.sessionStorage.getItem("golden_brick_attribution") || "{}");
    if (storedBase && typeof storedBase === "object" && !Array.isArray(storedBase)) baseCampaign = storedBase;
  } catch (error) {
    // Current query values are sufficient when storage is unavailable.
  }
  const campaign = JSON.stringify(baseKeys.map(function (key) {
    return query.get(key) || (typeof baseCampaign[key] === "string" ? baseCampaign[key] : "");
  }));
  let saved = {};
  try {
    const stored = JSON.parse(window.sessionStorage.getItem("golden_brick_concrete_attribution") || "{}");
    if (stored && stored.campaign === campaign && stored.values && typeof stored.values === "object" && !Array.isArray(stored.values)) saved = stored.values;
  } catch (error) {
    // Query parameters still work if storage is unavailable.
  }
  // A new tagged visit should not inherit a different campaign's click identifier.
  if (baseKeys.concat(campaignKeys).some(function (key) { return query.has(key); })) {
    saved = {};
  }
  const attribution = {};
  campaignKeys.forEach(function (key) {
    const value = (query.get(key) || (typeof saved[key] === "string" ? saved[key] : "")).trim().slice(0, 250);
    if (!value) return;
    attribution[key] = value;
    const input = document.createElement("input");
    input.type = "hidden";
    input.dataset.extraLabel = key;
    input.value = value;
    input.defaultValue = value;
    form.appendChild(input);
  });
  try {
    window.sessionStorage.setItem("golden_brick_concrete_attribution", JSON.stringify({ campaign: campaign, values: attribution }));
  } catch (error) {
    // The hidden fields still preserve attribution on this request.
  }
  // Preserve the shared script's UTM fields when a successful inquiry resets the form.
  form.querySelectorAll('input[type="hidden"][data-extra-label]').forEach(function (input) {
    input.defaultValue = input.value;
  });

  document.querySelectorAll("[data-cf-service]").forEach(function (link) {
    link.addEventListener("click", function () {
      serviceField.value = link.dataset.cfService;
      serviceField.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  // Take estimate requests straight to the form, even from far down the page.
  // Keep native anchor behavior and move keyboard focus to the inquiry section.
  formWrap.tabIndex = -1;
  document.querySelectorAll('a[href="#estimate-form"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const root = document.documentElement;
      const previousScrollBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.requestAnimationFrame(function () {
        formWrap.focus({ preventScroll: true });
        root.style.scrollBehavior = previousScrollBehavior;
      });
    });
  });

  const mobileContact = document.querySelector(".cf-mobile-contact");
  const hero = document.querySelector(".cf-hero");
  if (mobileContact && hero && "IntersectionObserver" in window) {
    let heroVisible = true;
    let formVisible = false;
    function updateContactBar() {
      const editing = form.contains(document.activeElement);
      mobileContact.classList.toggle("cf-contact-hidden", heroVisible || formVisible || editing);
    }
    updateContactBar();
    const contactObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        if (entry.target === formWrap) formVisible = entry.isIntersecting;
      });
      updateContactBar();
    }, { threshold: 0 });
    contactObserver.observe(hero);
    contactObserver.observe(formWrap);
    form.addEventListener("focusin", updateContactBar);
    form.addEventListener("focusout", function () { window.requestAnimationFrame(updateContactBar); });
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("cf-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll("[data-cf-reveal]").forEach(function (element) {
    element.classList.add("cf-reveal-ready");
    revealObserver.observe(element);
  });
})();
