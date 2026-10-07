(function () {
    "use strict";

    var DEFAULT_ENDPOINT = "/api/public/google-reviews";
    var REVIEW_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    var REVIEW_COUNT_FORMAT = new Intl.NumberFormat("en-US");

    function safeHttpsUrl(value) {
        if (typeof value !== "string" || !value.trim()) return "";

        try {
            var url = new URL(value.trim(), window.location.origin);
            return url.protocol === "https:" ? url.href : "";
        } catch (_error) {
            return "";
        }
    }

    function reviewDate(value) {
        if (!value) return "";
        var date = new Date(value);
        return Number.isNaN(date.getTime()) ? "" : REVIEW_DATE_FORMAT.format(date);
    }

    function createElement(tagName, className, text) {
        var element = document.createElement(tagName);
        if (className) element.className = className;
        if (typeof text === "string") element.textContent = text;
        return element;
    }

    function reviewStars(rating) {
        var numericRating = Number(rating);
        if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
            return createElement("span", "google-review-stars", "Rating unavailable");
        }
        var roundedRating = Math.round(numericRating);
        var stars = createElement("span", "google-review-stars");
        stars.setAttribute("aria-label", "Rated " + roundedRating + " out of 5");

        var visual = createElement(
            "span",
            "google-review-stars-visual",
            "★".repeat(roundedRating) + "☆".repeat(5 - roundedRating),
        );
        visual.setAttribute("aria-hidden", "true");
        stars.appendChild(visual);
        return stars;
    }

    function reviewerAvatar(review) {
        var photoUrl = safeHttpsUrl(review.reviewerProfilePhotoUrl);
        if (!photoUrl) return null;

        var image = document.createElement("img");
        image.className = "google-review-avatar";
        image.src = photoUrl;
        image.alt = (review.reviewerDisplayName || "Google reviewer") + " profile";
        image.loading = "lazy";
        image.decoding = "async";
        image.referrerPolicy = "no-referrer";
        image.width = 44;
        image.height = 44;
        return image;
    }

    function reviewCard(review) {
        var card = createElement("article", "google-review-card");
        var head = createElement("div", "google-review-card-head");
        var reviewer = createElement("div", "google-reviewer");
        var reviewerCopy = createElement("div", "google-reviewer-copy");
        var reviewerName = createElement(
            "strong",
            "",
            review.reviewerDisplayName || "Google reviewer",
        );
        var dateText = reviewDate(review.createTime);
        var date = createElement("time", "", dateText || "Review date unavailable");
        if (dateText) date.dateTime = new Date(review.createTime).toISOString();

        var avatar = reviewerAvatar(review);
        if (avatar) reviewer.appendChild(avatar);
        reviewerCopy.appendChild(reviewerName);
        reviewerCopy.appendChild(date);
        reviewer.appendChild(reviewerCopy);
        head.appendChild(reviewer);
        head.appendChild(reviewStars(review.rating));

        var text = createElement(
            "p",
            "google-review-text",
            review.text || "This customer left a rating without a comment.",
        );
        var source = createElement("footer", "google-review-source");
        source.appendChild(createElement("span", "google-wordmark", "Google"));
        source.appendChild(document.createTextNode(" review"));

        card.appendChild(head);
        card.appendChild(text);
        card.appendChild(source);
        return card;
    }

    function setProfileLinks(root, profileUrl) {
        var safeUrl = safeHttpsUrl(profileUrl);
        root.querySelectorAll("[data-google-profile-link]").forEach(function (link) {
            if (!safeUrl) return;
            link.href = safeUrl;
            link.hidden = false;
        });
    }

    function renderSummary(root, payload) {
        var summary = root.querySelector("[data-google-review-summary]");
        var rating = root.querySelector("[data-google-average-rating]");
        var count = root.querySelector("[data-google-review-count]");
        var stars = root.querySelector(".google-review-summary-stars");
        if (!summary || !rating || !count) return;

        var average = Number(payload.averageRating);
        var total = Number(payload.totalReviewCount);
        var valid = Number.isFinite(average) && average >= 1 && average <= 5 && total > 0;
        rating.textContent = valid ? average.toFixed(1) : "—";
        count.textContent = total > 0
            ? REVIEW_COUNT_FORMAT.format(total) + (total === 1 ? " Google review" : " Google reviews")
            : "No Google reviews yet";
        if (stars) {
            var filled = valid ? Math.round(average) : 0;
            stars.textContent = valid ? "★".repeat(filled) + "☆".repeat(5 - filled) : "";
        }
        summary.classList.remove("is-loading");
        summary.setAttribute("aria-label", valid
            ? "Rated " + average.toFixed(1) + " out of 5 from " + REVIEW_COUNT_FORMAT.format(total) + " Google reviews"
            : count.textContent);
    }

    function renderUnavailable(root) {
        var list = root.querySelector("[data-google-review-list]");
        var status = root.querySelector("[data-google-review-status]");
        var loadMore = root.querySelector("[data-google-reviews-more]");
        var summary = root.querySelector("[data-google-review-summary]");
        if (!list) return;
        if (root.dataset.hideUnavailable === "true") {
            root.hidden = true;
            list.setAttribute("aria-busy", "false");
            return;
        }

        list.textContent = "";
        list.classList.remove("is-loading");
        list.classList.add("is-unavailable");
        list.setAttribute("aria-busy", "false");
        if (summary) {
            summary.classList.remove("is-loading");
            summary.removeAttribute("aria-label");
            var rating = summary.querySelector("[data-google-average-rating]");
            var count = summary.querySelector("[data-google-review-count]");
            var stars = summary.querySelector(".google-review-summary-stars");
            if (rating) rating.textContent = "—";
            if (count) count.textContent = "Google reviews";
            if (stars) stars.textContent = "";
            summary.hidden = true;
        }

        var unavailable = createElement("div", "google-reviews-unavailable");
        var hasProfile = Boolean(root.querySelector("[data-google-profile-link][href]"));
        unavailable.appendChild(createElement("h3", "", hasProfile ? "Read our reviews on Google" : "See our completed projects"));
        unavailable.appendChild(createElement("p", "", hasProfile
            ? "We couldn’t load the reviews here. You can read them directly on Google."
            : "We couldn’t load the reviews right now. You can try again or take a look at our completed projects."));
        if (!hasProfile) {
            var projectsLink = createElement("a", "text-link", "See Our Work");
            projectsLink.href = "/projects.html";
            unavailable.appendChild(projectsLink);
        }
        list.appendChild(unavailable);
        if (status) status.textContent = "Google reviews could not be loaded.";
        if (loadMore) {
            loadMore.hidden = false;
            loadMore.disabled = false;
            loadMore.textContent = "Try again";
        }
    }

    function appendReviews(root, reviews, reset) {
        var list = root.querySelector("[data-google-review-list]");
        if (!list) return;
        if (reset) list.textContent = "";

        reviews.forEach(function (review) {
            list.appendChild(reviewCard(review));
        });
        if (reset && !reviews.length) {
            list.appendChild(createElement("p", "google-reviews-unavailable", "There are no Google reviews to show yet."));
        }
        list.classList.remove("is-loading", "is-unavailable");
        list.setAttribute("aria-busy", "false");
    }

    async function requestReviews(state) {
        var url = new URL(state.endpoint, window.location.origin);
        url.searchParams.set("limit", String(state.limit));
        if (state.cursor !== null) {
            url.searchParams.set("cursor", String(state.cursor));
        }

        var controller = new AbortController();
        var timeout = window.setTimeout(function () { controller.abort(); }, 10000);
        var response;
        try {
            response = await fetch(url.href, {
                method: "GET",
                headers: { Accept: "application/json" },
                credentials: "same-origin",
                signal: controller.signal,
            });
        } finally {
            window.clearTimeout(timeout);
        }
        var payload = await response.json().catch(function () {
            return {};
        });
        if (!response.ok || !payload.available) {
            var error = new Error(payload.message || "The live review feed is unavailable.");
            error.payload = payload;
            throw error;
        }
        return payload;
    }

    function initialiseReviews(root) {
        var state = {
            root: root,
            endpoint: root.dataset.reviewsEndpoint || DEFAULT_ENDPOINT,
            limit: Math.max(1, Math.min(24, Number(root.dataset.reviewsLimit) || 6)),
            cursor: null,
            loading: false,
            loaded: false,
        };
        var loadMore = root.querySelector("[data-google-reviews-more]");
        var status = root.querySelector("[data-google-review-status]");
        if (root.dataset.hideUnavailable === "true") root.hidden = true;

        async function load(reset) {
            if (state.loading) return;
            state.loading = true;
            var list = root.querySelector("[data-google-review-list]");
            if (list) list.setAttribute("aria-busy", "true");
            if (loadMore) {
                loadMore.disabled = true;
                loadMore.textContent = reset ? "Loading reviews…" : "Loading more…";
            }

            try {
                var payload = await requestReviews(state);
                setProfileLinks(root, payload.profileUrl);
                renderSummary(root, payload);
                var summary = root.querySelector("[data-google-review-summary]");
                if (summary) summary.hidden = false;
                var reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
                appendReviews(root, reviews, reset);
                if (root.dataset.hideUnavailable === "true") {
                    root.hidden = reset && reviews.length === 0;
                }
                state.loaded = true;
                state.cursor =
                    Number.isInteger(payload.nextCursor) ? payload.nextCursor : null;

                if (status) {
                    status.textContent = payload.reviews && payload.reviews.length
                        ? "Google reviews loaded."
                        : "No Google reviews are available to display.";
                }
                if (loadMore) {
                    loadMore.hidden = state.cursor === null;
                    loadMore.disabled = false;
                    loadMore.textContent = "Load more reviews";
                }
            } catch (error) {
                setProfileLinks(root, error.payload && error.payload.profileUrl);
                if (!state.loaded) {
                    renderUnavailable(root);
                } else {
                    if (status) status.textContent = "More reviews could not be loaded. Please try again.";
                    if (loadMore) {
                        loadMore.hidden = false;
                        loadMore.disabled = false;
                        loadMore.textContent = "Try again";
                    }
                }
            } finally {
                state.loading = false;
                if (list) list.setAttribute("aria-busy", "false");
            }
        }

        if (loadMore) {
            loadMore.addEventListener("click", function () {
                load(!state.loaded);
            });
        }

        load(true);
    }

    document.querySelectorAll("[data-google-reviews]").forEach(initialiseReviews);
})();
