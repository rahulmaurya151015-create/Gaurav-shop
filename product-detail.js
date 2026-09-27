/* =========================================================
   Sree Shiv Alankar Mandir — Product Detail Page (SPA)
   Opens in same page when product is clicked
   URL becomes ?product=xyz
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------
     DOM REFERENCES
     --------------------------------------------------- */
  const PRODUCT_PAGE = document.getElementById("productDetailPage");
  const GRID_WRAP = document.querySelector(".grid-wrap");
  const HERO = document.querySelector(".hero");
  const CAT_SHOWCASE = document.getElementById("catShowcaseWrap");
  const CAT_NAV = document.getElementById("catNav");
  const ABOUT_DEV = document.querySelector(".about-developer-section");
  const BANNER_SECTION = document.getElementById("bannerSection");

  let currentProductId = null;
  let wishlist = [];

  /* ---------------------------------------------------
     HELPERS
     --------------------------------------------------- */
  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  function waLink(number, text) {
    const clean = (number || "").replace(/\D/g, "");
    const msg = encodeURIComponent(text || "Hi! I'd like to ask about a piece.");
    return clean ? `https://wa.me/${clean}?text=${msg}` : "#";
  }

  function thumbOf(p) {
    return (p && p.images && p.images[0]) || "";
  }

  /* ---------------------------------------------------
     WISHLIST — localStorage me save hota hai
     --------------------------------------------------- */
  function loadWishlist() {
    try {
      wishlist = JSON.parse(localStorage.getItem("ssam_wishlist") || "[]");
    } catch (e) {
      wishlist = [];
    }
    updateWishlistCount();
  }

  function saveWishlist() {
    localStorage.setItem("ssam_wishlist", JSON.stringify(wishlist));
    updateWishlistCount();
  }

  function updateWishlistCount() {
    const countEl = document.getElementById("wishlistCount");
    if (!countEl) return;
    if (wishlist.length > 0) {
      countEl.textContent = wishlist.length;
      countEl.hidden = false;
    } else {
      countEl.hidden = true;
    }
  }

  window.isInWishlist = function (id) {
    return wishlist.includes(id);
  };

  window.toggleWishlist = function (id) {
    const i = wishlist.indexOf(id);
    if (i === -1) wishlist.push(id);
    else wishlist.splice(i, 1);
    saveWishlist();

    // Update all heart icons on the page
    document.querySelectorAll(`[data-wish-btn="${id}"]`).forEach((btn) => {
      const isWished = wishlist.includes(id);
      btn.classList.toggle("active", isWished);
      if (btn.classList.contains("pd-btn-wish")) {
        btn.innerHTML = (isWished ? "❤ Saved to Wishlist" : "🤍 Add to Wishlist");
      } else {
        btn.textContent = isWished ? "❤" : "🤍";
      }
    });

    return wishlist.includes(id);
  };

  /* ---------------------------------------------------
     OPEN product detail (SPA)
     --------------------------------------------------- */
  window.openProductDetail = function (productId) {
    const products = window.allProductsGlobal || [];
    const p = products.find((x) => x.id === productId);
    if (!p) return;

    currentProductId = productId;

    // Update URL — browser back button works
    const url = new URL(window.location.href);
    url.searchParams.set("product", productId);
    history.pushState({ product: productId }, "", url.toString());

    // Hide home sections
    if (GRID_WRAP) GRID_WRAP.hidden = true;
    if (HERO) HERO.hidden = true;
    if (CAT_SHOWCASE) CAT_SHOWCASE.hidden = true;
    if (CAT_NAV) CAT_NAV.hidden = true;
    if (ABOUT_DEV) ABOUT_DEV.hidden = true;
    if (BANNER_SECTION) BANNER_SECTION.hidden = true;

    // Show detail page
    PRODUCT_PAGE.hidden = false;
    renderDetailPage(productId);
    window.scrollTo(0, 0);

    // Update title
    document.title = (p.name || "Piece") + " — Sree Shiv Alankar Mandir";
  };

  /* ---------------------------------------------------
     CLOSE product detail
     --------------------------------------------------- */
  window.closeProductDetail = function () {
    currentProductId = null;

    // Hide detail
    PRODUCT_PAGE.hidden = true;
    PRODUCT_PAGE.innerHTML = "";

    // Show home sections
    if (GRID_WRAP) GRID_WRAP.hidden = false;
    if (HERO) HERO.hidden = false;
    if (CAT_NAV) CAT_NAV.hidden = false;
    if (ABOUT_DEV) ABOUT_DEV.hidden = false;

    // Banner — only if banners exist
    if (BANNER_SECTION) {
      const hasBanners = (window.currentSettingsGlobal?.banners || []).length > 0;
      BANNER_SECTION.hidden = !hasBanners;
    }

    // Category showcase — only if it has content
    if (CAT_SHOWCASE) {
      CAT_SHOWCASE.hidden = false;
    }

    // Clear URL param
    const url = new URL(window.location.href);
    url.searchParams.delete("product");
    history.pushState({}, "", url.toString());

    // Reset title
    document.title = "Sree Shiv Alankar Mandir - Handcrafted Jewelry Shop";
  };

  /* ---------------------------------------------------
     RENDER — Product detail page
     --------------------------------------------------- */
  function renderDetailPage(productId) {
    const products = window.allProductsGlobal || [];
    const settings = window.currentSettingsGlobal || {};
    const p = products.find((x) => x.id === productId);
    if (!p) {
      PRODUCT_PAGE.innerHTML = '<p class="empty-state">Piece not found.</p>';
      return;
    }

    const images = (p.images && p.images.length) ? p.images : [""];
    const isWished = wishlist.includes(p.id);
    const wa = settings.whatsapp || "";
    const msg = `Hi! I'd like to ask about "${p.name}" (${p.price || "price on ask"}).`;
    const waLinkUrl = waLink(wa, msg);

    // Similar products — same category, exclude current
    const similar = products
      .filter((x) => x.id !== p.id && x.category === p.category)
      .slice(0, 4);

    PRODUCT_PAGE.innerHTML = `
      <div class="pd-container">
        <div class="pd-top-bar">
          <button type="button" class="pd-back-btn" id="pdBackBtn">← Back to collection</button>
        </div>

        <div class="pd-layout">
          <div class="pd-gallery">
            <div class="pd-main-media" id="pdMainMedia">
              <img id="pdMainImage" src="${escapeHtml(images[0])}" alt="${escapeHtml(p.name || "")}" />
              <video id="pdMainVideo" playsinline controls hidden></video>
            </div>
            ${(images.length > 1 || p.videoUrl) ? `
              <div class="pd-thumbs" id="pdThumbs">
                ${images.map((url, i) => `
                  <button type="button" class="pd-thumb ${i === 0 ? "active" : ""}" data-url="${escapeHtml(url)}" data-type="image">
                    <img src="${escapeHtml(url)}" alt="" />
                  </button>
                `).join("")}
                ${p.videoUrl ? `
                  <button type="button" class="pd-thumb pd-thumb-video" data-url="${escapeHtml(p.videoUrl)}" data-type="video">▶</button>
                ` : ""}
              </div>
            ` : ""}
          </div>

          <div class="pd-info">
            ${p.category ? `<p class="pd-category">${escapeHtml(p.category)}</p>` : ""}
            <h1 class="pd-name">${escapeHtml(p.name || "")}</h1>
            ${p.price ? `<p class="pd-price">${escapeHtml(p.price)}</p>` : ""}
            ${p.description ? `<p class="pd-desc">${escapeHtml(p.description)}</p>` : ""}

            <div class="pd-actions">
              <a href="${waLinkUrl}" target="_blank" rel="noopener" class="pd-btn pd-btn-wa">
                <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor"><path d="M16.04 3C9.37 3 3.98 8.39 3.98 15.06c0 2.24.61 4.36 1.72 6.19L3 29l7.94-2.62a12.03 12.03 0 0 0 5.1 1.13h.01c6.67 0 12.06-5.39 12.06-12.06C28.11 8.39 22.71 3 16.04 3z"/></svg>
                Ask on WhatsApp
              </a>
              <button type="button" class="pd-btn pd-btn-wish ${isWished ? "active" : ""}" data-wish-btn="${p.id}">
                ${isWished ? "❤ Saved to Wishlist" : "🤍 Add to Wishlist"}
              </button>
            </div>
          </div>
        </div>

        ${similar.length ? `
          <section class="pd-similar-section">
            <h2 class="pd-similar-title">You may also like</h2>
            <div class="pd-similar-grid">
              ${similar.map((sp) => {
                const simg = thumbOf(sp);
                const isW = wishlist.includes(sp.id);
                return `
                  <div class="pd-similar-card" data-id="${sp.id}">
                    <div class="pd-similar-media">
                      <img src="${escapeHtml(simg)}" alt="${escapeHtml(sp.name || "")}" loading="lazy" />
                      <button type="button" class="product-wish-btn ${isW ? "active" : ""}" data-wish-btn="${sp.id}" aria-label="Add to wishlist">
                        ${isW ? "❤" : "🤍"}
                      </button>
                    </div>
                    <div class="pd-similar-info">
                      <p class="pd-similar-cat">${escapeHtml(sp.category || "")}</p>
                      <h3 class="pd-similar-name">${escapeHtml(sp.name || "")}</h3>
                      <p class="pd-similar-price">${escapeHtml(sp.price || "")}</p>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </section>
        ` : ""}
      </div>
    `;

    // ---- Wire up: Back button ----
    document.getElementById("pdBackBtn").onclick = () => history.back();

    // ---- Wire up: Thumbnails ----
    const thumbs = document.getElementById("pdThumbs");
    if (thumbs) {
      thumbs.querySelectorAll(".pd-thumb").forEach((btn) => {
        btn.onclick = () => {
          thumbs.querySelectorAll(".pd-thumb").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const url = btn.dataset.url;
          const type = btn.dataset.type;
          const img = document.getElementById("pdMainImage");
          const vid = document.getElementById("pdMainVideo");
          if (type === "video") {
            img.hidden = true;
            vid.src = url;
            vid.hidden = false;
            vid.play().catch(() => {});
          } else {
            vid.pause();
            vid.hidden = true;
            img.src = url;
            img.hidden = false;
          }
        };
      });
    }

    // ---- Wire up: Wishlist buttons ----
    PRODUCT_PAGE.querySelectorAll("[data-wish-btn]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        window.toggleWishlist(btn.dataset.wishBtn);
      };
    });

    // ---- Wire up: Similar product cards ----
    PRODUCT_PAGE.querySelectorAll(".pd-similar-card").forEach((card) => {
      card.onclick = (e) => {
        if (e.target.closest("[data-wish-btn]")) return;
        window.openProductDetail(card.dataset.id);
        window.scrollTo(0, 0);
      };
    });
  }

  /* ---------------------------------------------------
     Browser back/forward support (popstate)
     --------------------------------------------------- */
  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("product");
    if (pid) {
      const products = window.allProductsGlobal || [];
      if (products.find((p) => p.id === pid)) {
        // Refresh state without pushing history again
        currentProductId = pid;
        if (GRID_WRAP) GRID_WRAP.hidden = true;
        if (HERO) HERO.hidden = true;
        if (CAT_SHOWCASE) CAT_SHOWCASE.hidden = true;
        if (CAT_NAV) CAT_NAV.hidden = true;
        if (ABOUT_DEV) ABOUT_DEV.hidden = true;
        if (BANNER_SECTION) BANNER_SECTION.hidden = true;
        PRODUCT_PAGE.hidden = false;
        renderDetailPage(pid);
        window.scrollTo(0, 0);
      } else {
        window.closeProductDetail();
      }
    } else {
      window.closeProductDetail();
    }
  });

  /* ---------------------------------------------------
     Initial URL check — if page opens with ?product=xyz
     (Firebase se products load hone ka wait karta hai)
     --------------------------------------------------- */
  function checkInitialURL() {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("product");
    if (!pid) return;

    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      const products = window.allProductsGlobal || [];
      if (products.length > 0) {
        clearInterval(checkInterval);
        if (products.find((p) => p.id === pid)) {
          // Direct open without pushing new history
          currentProductId = pid;
          if (GRID_WRAP) GRID_WRAP.hidden = true;
          if (HERO) HERO.hidden = true;
          if (CAT_SHOWCASE) CAT_SHOWCASE.hidden = true;
          if (CAT_NAV) CAT_NAV.hidden = true;
          if (ABOUT_DEV) ABOUT_DEV.hidden = true;
          if (BANNER_SECTION) BANNER_SECTION.hidden = true;
          PRODUCT_PAGE.hidden = false;
          renderDetailPage(pid);
          window.scrollTo(0, 0);
        } else {
          // Product doesn't exist — clean URL
          const url = new URL(window.location.href);
          url.searchParams.delete("product");
          history.replaceState({}, "", url.toString());
        }
      }
      if (attempts > 50) clearInterval(checkInterval);
    }, 200);
  }

  /* ---------------------------------------------------
     WISHLIST DRAWER
     --------------------------------------------------- */
  function renderWishlistDrawer() {
    const items = wishlist
      .map((id) => (window.allProductsGlobal || []).find((p) => p.id === id))
      .filter(Boolean);

    const listEl = document.getElementById("wishlistItems");
    const emptyEl = document.getElementById("wishlistEmpty");
    const sendBtn = document.getElementById("wishlistSendBtn");

    if (!listEl) return;

    if (!items.length) {
      listEl.innerHTML = "";
      emptyEl.hidden = false;
    } else {
      emptyEl.hidden = true;
      listEl.innerHTML = items.map((p) => `
        <div class="enquiry-row" data-id="${p.id}">
          <img src="${escapeHtml(thumbOf(p))}" alt="" />
          <div class="enquiry-row-info">
            <div class="name">${escapeHtml(p.name || "")}</div>
            <div class="meta">${escapeHtml(p.price || "")}</div>
          </div>
          <button class="remove-btn" data-remove-wish="${p.id}" aria-label="Remove">&times;</button>
        </div>
      `).join("");
    }

    const settings = window.currentSettingsGlobal || {};
    const lines = items.map((p) => `• ${p.name} — ${p.price || "price on ask"}`).join("\n");
    const msg = items.length
      ? `Hi! I'm interested in these pieces from my wishlist:\n${lines}`
      : `Hi! I'd like to know more about your collection.`;
    if (sendBtn) sendBtn.href = waLink(settings.whatsapp, msg);

    // Wire remove buttons
    listEl.querySelectorAll("[data-remove-wish]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.removeWish;
        const i = wishlist.indexOf(id);
        if (i !== -1) wishlist.splice(i, 1);
        saveWishlist();
        renderWishlistDrawer();
        // Update hearts anywhere on the page
        document.querySelectorAll(`[data-wish-btn="${id}"]`).forEach((b) => {
          b.classList.remove("active");
          if (b.classList.contains("pd-btn-wish")) {
            b.innerHTML = "🤍 Add to Wishlist";
          } else {
            b.textContent = "🤍";
          }
        });
      };
    });
  }

  // Open / close wishlist drawer
  const wishlistOpenBtn = document.getElementById("wishlistOpenBtn");
  const wishlistCloseBtn = document.getElementById("wishlistCloseBtn");
  const wishlistBackdrop = document.getElementById("wishlistBackdrop");
  const wishlistClearBtn = document.getElementById("wishlistClearBtn");

  if (wishlistOpenBtn) {
    wishlistOpenBtn.onclick = () => {
      renderWishlistDrawer();
      wishlistBackdrop.classList.add("open");
      document.body.style.overflow = "hidden";
    };
  }
  if (wishlistCloseBtn) {
    wishlistCloseBtn.onclick = () => {
      wishlistBackdrop.classList.remove("open");
      document.body.style.overflow = "";
    };
  }
  if (wishlistBackdrop) {
    wishlistBackdrop.addEventListener("click", (e) => {
      if (e.target === wishlistBackdrop) {
        wishlistBackdrop.classList.remove("open");
        document.body.style.overflow = "";
      }
    });
  }
  if (wishlistClearBtn) {
    wishlistClearBtn.onclick = () => {
      if (!wishlist.length) return;
      if (!confirm("Clear your whole wishlist?")) return;
      wishlist = [];
      saveWishlist();
      renderWishlistDrawer();
      // Reset all hearts on page
      document.querySelectorAll("[data-wish-btn]").forEach((b) => {
        b.classList.remove("active");
        if (b.classList.contains("pd-btn-wish")) {
          b.innerHTML = "🤍 Add to Wishlist";
        } else {
          b.textContent = "🤍";
        }
      });
    };
  }

  /* ---------------------------------------------------
     INIT
     --------------------------------------------------- */
  function init() {
    loadWishlist();
    checkInitialURL();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
