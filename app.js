/* =====================================================================
   SHOP ADMIN — SECRET SEARCH PHRASE
   Type this exact phrase into the search bar and press Enter to open
   the admin sign-in screen. Change it to anything you like.
   ===================================================================== */
const ADMIN_TRIGGER = "shop admin";

/* ===================================================================== */

const db = firebase.firestore();
const auth = firebase.auth();

const SETTINGS_DOC = db.collection("config").doc("settings");
const ADMINS_DOC = db.collection("config").doc("admins");
const PRODUCTS_COL = db.collection("products");

const DEFAULT_SETTINGS = {
  shopName: "Aabhira Jewels",
  heroKicker: "Handcrafted, close to home",
  heroTitle: "Jewelry that carries\na story worth telling.",
  heroSub: "Every piece below is in stock and ready to be seen in person. Tap anything that catches your eye.",
  footerTagline: "Made by hand. Worn for years.",
  address: "",
  location: "Visit or write to us",
  whatsapp: "",
  categories: "Rings,Necklaces,Earrings,Bangles",
  banners: []
};

let currentSettings = { ...DEFAULT_SETTINGS };
let allProducts = [];
let activeCategory = "all";

let isAdmin = false;              // true only after BOTH Google check + panel password pass this session
let verifiedAdminEmail = null;    // email confirmed to be in the allow-list, awaiting password
let currentAdminData = null;      // { emails, panelPassword }
let passwordAttempts = 0;

let enquiryIds = [];              // product ids, persisted in localStorage
let currentModalProductId = null;
let bannerTimer = null;
let bannerIndex = 0;

/* ---------------------------------------------------------------------
   HELPERS
   --------------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);

function waLink(number, text){
  const clean = (number || "").replace(/\D/g, "");
  const msg = encodeURIComponent(text || "Hi! I'd like to ask about a piece from your shop.");
  return clean ? `https://wa.me/${clean}?text=${msg}` : "#";
}
function openBackdrop(el){ el.classList.add("open"); document.body.style.overflow = "hidden"; }
function closeBackdrop(el){ el.classList.remove("open"); document.body.style.overflow = ""; }
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}
const escapeAttr = escapeHtml;

/* ---------------------------------------------------------------------
   SETTINGS: LOAD + APPLY
   --------------------------------------------------------------------- */
async function loadSettings(){
  try{
    const snap = await SETTINGS_DOC.get();
    if (snap.exists){
      currentSettings = { ...DEFAULT_SETTINGS, ...snap.data() };
    } else {
      currentSettings = { ...DEFAULT_SETTINGS };
    }
  } catch(e){
    console.error("Could not load settings, using defaults.", e);
  }
  applySettingsToPage();
}

function applySettingsToPage(){
  const s = currentSettings;
  document.title = s.shopName;
  $("brandName").textContent = s.shopName;
  $("footerBrand").textContent = s.shopName;
  $("footerBrand2").textContent = s.shopName;
  $("heroKicker").textContent = s.heroKicker;
  $("heroTitle").innerHTML = (s.heroTitle || "").replace(/\n/g, "<br>");
  $("heroSub").textContent = s.heroSub;
  $("footerTagline").textContent = s.footerTagline;
  $("footerAddress").textContent = s.address || "";
  $("footerLocation").textContent = s.location;

  const link = waLink(s.whatsapp, `Hi! I'm interested in ${s.shopName}'s collection.`);
  $("whatsappTop").href = link;
  $("whatsappFooter").href = link;

  renderCategoryChips();
  renderBanner();
}

function renderCategoryChips(){
  const cats = (currentSettings.categories || "").split(",").map(c => c.trim()).filter(Boolean);
  const nav = $("catNav");
  nav.innerHTML = "";
  const allBtn = document.createElement("button");
  allBtn.className = "cat-chip" + (activeCategory === "all" ? " active" : "");
  allBtn.textContent = "All pieces";
  allBtn.onclick = () => { activeCategory = "all"; renderCategoryChips(); renderProducts(); };
  nav.appendChild(allBtn);
  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "cat-chip" + (activeCategory === cat ? " active" : "");
    btn.textContent = cat;
    btn.onclick = () => { activeCategory = cat; renderCategoryChips(); renderProducts(); };
    nav.appendChild(btn);
  });
  const sel = $("editCategory");
  if (sel){
    const current = sel.value;
    sel.innerHTML = cats.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
    if (cats.includes(current)) sel.value = current;
  }
}

/* ---------------------------------------------------------------------
   BANNER SLIDER
   --------------------------------------------------------------------- */
function renderBanner(){
  const banners = currentSettings.banners || [];
  const section = $("bannerSection");
  const track = $("bannerTrack");
  const dots = $("bannerDots");
  if (bannerTimer){ clearInterval(bannerTimer); bannerTimer = null; }

  if (!banners.length){ section.hidden = true; return; }
  section.hidden = false;
  bannerIndex = 0;

  track.innerHTML = banners.map(b => `
    <div class="banner-slide">
      <img src="${escapeAttr(b.imageUrl)}" alt="${escapeAttr(b.caption || '')}" />
      ${b.caption ? `<div class="banner-caption">${escapeHtml(b.caption)}</div>` : ""}
    </div>
  `).join("");

  dots.innerHTML = banners.map((_, i) =>
    `<button class="banner-dot${i === 0 ? ' active' : ''}" data-i="${i}"></button>`
  ).join("");

  const goTo = (i) => {
    bannerIndex = i;
    track.style.transform = `translateX(-${i * 100}%)`;
    dots.querySelectorAll(".banner-dot").forEach((d, di) => d.classList.toggle("active", di === i));
  };
  dots.querySelectorAll(".banner-dot").forEach(d => {
    d.onclick = () => goTo(parseInt(d.dataset.i, 10));
  });

  if (banners.length > 1){
    bannerTimer = setInterval(() => goTo((bannerIndex + 1) % banners.length), 4500);
  }
}

/* ---------------------------------------------------------------------
   PRODUCTS: LOAD + RENDER
   --------------------------------------------------------------------- */
function subscribeProducts(){
  PRODUCTS_COL.orderBy("createdAt", "desc").onSnapshot(snap => {
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    allProducts.sort((a, b) => (b.featured === true) - (a.featured === true));
    $("loadingState").hidden = true;
    renderProducts();
    renderAdminProductList();
    renderEnquiry();
  }, err => {
    console.error(err);
    $("loadingState").textContent = "Couldn't load products right now.";
  });
}

function thumbOf(p){ return (p.images && p.images[0]) || ""; }

function renderProducts(){
  const grid = $("productGrid");
  const query = $("searchInput").value.trim().toLowerCase();
  let list = allProducts;
  if (activeCategory !== "all") list = list.filter(p => p.category === activeCategory);
  if (query && query !== ADMIN_TRIGGER){
    list = list.filter(p =>
      (p.name || "").toLowerCase().includes(query) ||
      (p.category || "").toLowerCase().includes(query) ||
      (p.description || "").toLowerCase().includes(query)
    );
  }
  grid.innerHTML = "";
  $("emptyState").hidden = list.length !== 0;
  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-card-media">
        <img src="${escapeAttr(thumbOf(p))}" alt="${escapeAttr(p.name || '')}" loading="lazy" />
        ${(p.images && p.images.length > 1) ? `<span class="multi-badge">${p.images.length} photos</span>` : ""}
      </div>
      <div class="product-card-body">
        <p class="product-card-cat">${escapeHtml(p.category || '')}</p>
        <h3 class="product-card-name">${escapeHtml(p.name || '')}</h3>
        <p class="product-card-price">${escapeHtml(p.price || '')}</p>
      </div>
    `;
    card.onclick = () => openProductModal(p.id);
    grid.appendChild(card);
  });
}

/* ---------------------------------------------------------------------
   PRODUCT DETAIL MODAL (gallery + video + related)
   --------------------------------------------------------------------- */
function openProductModal(id){
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  currentModalProductId = id;

  const images = p.images && p.images.length ? p.images : [""];
  showMainMedia(images[0], "image");

  $("pmThumbs").innerHTML = images.map((url, i) =>
    `<button class="pm-thumb${i === 0 ? ' active' : ''}" data-url="${escapeAttr(url)}" data-type="image">
       <img src="${escapeAttr(url)}" alt="" />
     </button>`
  ).join("") + (p.videoUrl ? `
     <button class="pm-thumb pm-thumb-video" data-url="${escapeAttr(p.videoUrl)}" data-type="video">▶</button>
  ` : "");

  $("pmThumbs").querySelectorAll(".pm-thumb").forEach(btn => {
    btn.onclick = () => {
      $("pmThumbs").querySelectorAll(".pm-thumb").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      showMainMedia(btn.dataset.url, btn.dataset.type);
    };
  });

  $("pmCategory").textContent = p.category || "";
  $("pmName").textContent = p.name || "";
  $("pmPrice").textContent = p.price || "";
  $("pmDesc").textContent = p.description || "";
  $("pmWhatsapp").href = waLink(currentSettings.whatsapp, `Hi! I'd like to ask about "${p.name}" (${p.price || ''}).`);
  updateEnquiryButtonState();

  renderRelated(p);
  openBackdrop($("productModalBackdrop"));
}

function showMainMedia(url, type){
  if (type === "video"){
    $("pmVideo").src = url;
    $("pmVideo").hidden = false;
    $("pmImage").hidden = true;
  } else {
    $("pmImage").src = url;
    $("pmImage").hidden = false;
    $("pmVideo").hidden = true;
    $("pmVideo").pause?.();
  }
}

function renderRelated(p){
  const related = allProducts.filter(x => x.id !== p.id && x.category === p.category).slice(0, 4);
  const wrap = $("pmRelatedWrap");
  if (!related.length){ wrap.hidden = true; return; }
  wrap.hidden = false;
  $("pmRelatedGrid").innerHTML = related.map(r => `
    <div class="pm-related-card" data-id="${r.id}">
      <img src="${escapeAttr(thumbOf(r))}" alt="${escapeAttr(r.name || '')}" loading="lazy" />
      <p>${escapeHtml(r.name || '')}</p>
    </div>
  `).join("");
  $("pmRelatedGrid").querySelectorAll(".pm-related-card").forEach(card => {
    card.onclick = () => openProductModal(card.dataset.id);
  });
}

$("productModalClose").onclick = () => closeBackdrop($("productModalBackdrop"));
$("productModalBackdrop").addEventListener("click", (e) => {
  if (e.target === $("productModalBackdrop")) closeBackdrop($("productModalBackdrop"));
});

/* ---------------------------------------------------------------------
   ENQUIRY LIST (client-side "cart", no payment — just a WhatsApp message)
   --------------------------------------------------------------------- */
function loadEnquiry(){
  try{ enquiryIds = JSON.parse(localStorage.getItem("enquiry_list") || "[]"); }
  catch(e){ enquiryIds = []; }
}
function saveEnquiry(){
  localStorage.setItem("enquiry_list", JSON.stringify(enquiryIds));
}
function updateEnquiryButtonState(){
  const btn = $("pmAddEnquiry");
  if (!currentModalProductId) return;
  const added = enquiryIds.includes(currentModalProductId);
  btn.textContent = added ? "Remove from enquiry list" : "Add to enquiry list";
  btn.classList.toggle("btn-added", added);
}
$("pmAddEnquiry").onclick = () => {
  if (!currentModalProductId) return;
  const i = enquiryIds.indexOf(currentModalProductId);
  if (i === -1) enquiryIds.push(currentModalProductId);
  else enquiryIds.splice(i, 1);
  saveEnquiry();
  updateEnquiryButtonState();
  renderEnquiry();
};

function renderEnquiry(){
  // drop ids of products that no longer exist
  enquiryIds = enquiryIds.filter(id => allProducts.some(p => p.id === id));
  saveEnquiry();

  const count = $("enquiryCount");
  count.textContent = enquiryIds.length;
  count.hidden = enquiryIds.length === 0;

  const items = enquiryIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean);
  $("enquiryEmpty").hidden = items.length !== 0;
  $("enquiryItems").innerHTML = items.map(p => `
    <div class="enquiry-row" data-id="${p.id}">
      <img src="${escapeAttr(thumbOf(p))}" alt="" />
      <div class="enquiry-row-info">
        <div class="name">${escapeHtml(p.name || '')}</div>
        <div class="meta">${escapeHtml(p.price || '')}</div>
      </div>
      <button class="remove-btn" data-id="${p.id}" aria-label="Remove">&times;</button>
    </div>
  `).join("");
  $("enquiryItems").querySelectorAll(".remove-btn").forEach(btn => {
    btn.onclick = () => {
      enquiryIds = enquiryIds.filter(id => id !== btn.dataset.id);
      saveEnquiry();
      renderEnquiry();
      updateEnquiryButtonState();
    };
  });

  const lines = items.map(p => `• ${p.name} — ${p.price || 'price on ask'}`).join("\n");
  const msg = items.length
    ? `Hi! I'm interested in these pieces:\n${lines}`
    : `Hi! I'd like to know more about your collection.`;
  $("enquirySendBtn").href = waLink(currentSettings.whatsapp, msg);
}

$("enquiryOpenBtn").onclick = () => { renderEnquiry(); openBackdrop($("enquiryBackdrop")); };
$("enquiryCloseBtn").onclick = () => closeBackdrop($("enquiryBackdrop"));
$("enquiryBackdrop").addEventListener("click", (e) => { if (e.target === $("enquiryBackdrop")) closeBackdrop($("enquiryBackdrop")); });
$("enquiryClearBtn").onclick = () => {
  if (!enquiryIds.length) return;
  if (!confirm("Clear your whole enquiry list?")) return;
  enquiryIds = [];
  saveEnquiry();
  renderEnquiry();
  updateEnquiryButtonState();
};

/* ---------------------------------------------------------------------
   SEARCH BAR — doubles as the admin trigger
   --------------------------------------------------------------------- */
$("searchInput").addEventListener("input", renderProducts);
$("searchInput").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const val = e.target.value.trim().toLowerCase();
  if (val === ADMIN_TRIGGER){
    e.target.value = "";
    renderProducts();
    if (isAdmin){ openBackdrop($("adminBackdrop")); }
    else { openBackdrop($("googleLoginBackdrop")); }
  }
});

/* ---------------------------------------------------------------------
   ADMIN AUTH — STEP 1: email + password sign-in
   --------------------------------------------------------------------- */
$("googleLoginClose").onclick = () => closeBackdrop($("googleLoginBackdrop"));

$("emailLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("googleLoginError").hidden = true;
  $("emailLoginSubmit").disabled = true;
  $("emailLoginSubmit").textContent = "Signing in…";
  const email = $("emailLoginEmail").value.trim();
  const pass = $("emailLoginPassword").value;
  try{
    await auth.signInWithEmailAndPassword(email, pass);
    const snap = await ADMINS_DOC.get();
    currentAdminData = snap.exists ? snap.data() : { emails: [], panelPassword: "" };
    verifiedAdminEmail = email;
    passwordAttempts = 0;
    $("emailLoginForm").reset();
    closeBackdrop($("googleLoginBackdrop"));
    $("panelPasswordSub").textContent = `Step 2 of 2 — signed in as ${email}. Enter the panel password.`;
    openBackdrop($("panelPasswordBackdrop"));
  } catch(err){
    console.error(err);
    await auth.signOut();
    $("googleLoginError").textContent = "That email or password isn't right. Try again.";
    $("googleLoginError").hidden = false;
  } finally {
    $("emailLoginSubmit").disabled = false;
    $("emailLoginSubmit").textContent = "Continue";
  }
});

/* ---------------------------------------------------------------------
   ADMIN AUTH — STEP 2: panel password
   --------------------------------------------------------------------- */
$("panelPasswordClose").onclick = async () => {
  closeBackdrop($("panelPasswordBackdrop"));
  await auth.signOut();
  verifiedAdminEmail = null;
};

$("panelPasswordForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const entered = $("panelPasswordInput").value;
  $("panelPasswordError").hidden = true;

  if (passwordAttempts >= 5){
    $("panelPasswordError").textContent = "Too many attempts. Close this and try again later.";
    $("panelPasswordError").hidden = false;
    return;
  }

  if (entered === currentAdminData.panelPassword){
    isAdmin = true;
    sessionStorage.setItem("panel_unlocked", "1");
    $("panelPasswordForm").reset();
    closeBackdrop($("panelPasswordBackdrop"));
    enterAdminPanel();
  } else {
    passwordAttempts++;
    $("panelPasswordError").textContent = "Wrong password. Try again.";
    $("panelPasswordError").hidden = false;
  }
});

function enterAdminPanel(){
  $("adminWhoami").textContent = verifiedAdminEmail || "";
  openBackdrop($("adminBackdrop"));
  fillSettingsForm();
  renderAdminProductList();
  renderAdminBannerList();
  renderAccessList();
}

$("adminLogoutBtn").onclick = async () => {
  isAdmin = false;
  verifiedAdminEmail = null;
  sessionStorage.removeItem("panel_unlocked");
  await auth.signOut();
  closeBackdrop($("adminBackdrop"));
};
$("adminCloseBtn").onclick = () => closeBackdrop($("adminBackdrop"));

auth.onAuthStateChanged(user => {
  // A silent Google session alone never opens the panel — the
  // secret phrase + panel password are still required every time.
  if (!user){ isAdmin = false; verifiedAdminEmail = null; }
});

/* ---------------------------------------------------------------------
   ADMIN TABS
   --------------------------------------------------------------------- */
document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    ["products", "banners", "settings", "access"].forEach(name => {
      $(`tab${name.charAt(0).toUpperCase() + name.slice(1)}`).hidden = name !== target;
    });
  };
});

/* ---------------------------------------------------------------------
   ADMIN: SETTINGS FORM
   --------------------------------------------------------------------- */
function fillSettingsForm(){
  const s = currentSettings;
  $("settingShopName").value = s.shopName || "";
  $("settingKicker").value = s.heroKicker || "";
  $("settingHeroTitle").value = s.heroTitle || "";
  $("settingHeroSub").value = s.heroSub || "";
  $("settingFooterTagline").value = s.footerTagline || "";
  $("settingAddress").value = s.address || "";
  $("settingLocation").value = s.location || "";
  $("settingWhatsapp").value = s.whatsapp || "";
  $("settingCategories").value = s.categories || "";
}

$("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const updated = {
    shopName: $("settingShopName").value.trim() || DEFAULT_SETTINGS.shopName,
    heroKicker: $("settingKicker").value.trim(),
    heroTitle: $("settingHeroTitle").value,
    heroSub: $("settingHeroSub").value.trim(),
    footerTagline: $("settingFooterTagline").value.trim(),
    address: $("settingAddress").value.trim(),
    location: $("settingLocation").value.trim(),
    whatsapp: $("settingWhatsapp").value.trim(),
    categories: $("settingCategories").value.trim() || DEFAULT_SETTINGS.categories
  };
  await SETTINGS_DOC.set(updated, { merge: true });
  currentSettings = { ...currentSettings, ...updated };
  applySettingsToPage();
  $("settingsSaveMsg").hidden = false;
  setTimeout(() => { $("settingsSaveMsg").hidden = true; }, 2500);
});

/* ---------------------------------------------------------------------
   ADMIN: BANNERS
   --------------------------------------------------------------------- */
function renderAdminBannerList(){
  const list = $("adminBannerList");
  const banners = currentSettings.banners || [];
  list.innerHTML = banners.map((b, i) => `
    <div class="admin-row">
      <img src="${escapeAttr(b.imageUrl)}" alt="" />
      <div class="admin-row-info">
        <div class="name">${escapeHtml(b.caption || '(no caption)')}</div>
      </div>
      <button data-i="${i}">Remove</button>
    </div>
  `).join("");
  list.querySelectorAll("button").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("Remove this banner?")) return;
      const banners = [...(currentSettings.banners || [])];
      banners.splice(parseInt(btn.dataset.i, 10), 1);
      await SETTINGS_DOC.set({ banners }, { merge: true });
      currentSettings.banners = banners;
      renderAdminBannerList();
      renderBanner();
    };
  });
}

$("bannerAddForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = $("bannerImageFile").files[0];
  if (!file) return;
  const progress = $("bannerUploadProgress");
  progress.hidden = false;
  progress.textContent = "Uploading… 0%";
  try{
    const url = await uploadToCloudinary(file, "image", (pct) => {
      progress.textContent = `Uploading… ${pct}%`;
    });
    const banners = [...(currentSettings.banners || []), { imageUrl: url, caption: $("bannerCaption").value.trim() }];
    await SETTINGS_DOC.set({ banners }, { merge: true });
    currentSettings.banners = banners;
    renderAdminBannerList();
    renderBanner();
    $("bannerAddForm").reset();
    progress.hidden = true;
  } catch(err){
    console.error(err);
    progress.textContent = "Upload failed — try again.";
  }
});

/* ---------------------------------------------------------------------
   ADMIN: ACCESS LIST (informational — real access is Firebase Auth Users)
   --------------------------------------------------------------------- */
function renderAccessList(){
  const emails = (currentAdminData && currentAdminData.emails) || [];
  $("accessEmailList").innerHTML = emails.length
    ? emails.map(email => `
        <div class="admin-row">
          <div class="admin-row-info"><div class="name">${escapeHtml(email)}</div></div>
        </div>
      `).join("")
    : `<p class="tab-hint">No emails on record yet.</p>`;
}

$("changePasswordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const newPass = $("newPanelPassword").value;
  if (!newPass || newPass.length < 4){
    alert("Choose a password at least 4 characters long.");
    return;
  }
  await ADMINS_DOC.update({ panelPassword: newPass });
  currentAdminData.panelPassword = newPass;
  $("changePasswordForm").reset();
  $("accessSaveMsg").hidden = false;
  setTimeout(() => { $("accessSaveMsg").hidden = true; }, 2000);
});

/* ---------------------------------------------------------------------
   ADMIN: PRODUCT LIST
   --------------------------------------------------------------------- */
function renderAdminProductList(){
  const list = $("adminProductList");
  list.innerHTML = allProducts.map(p => `
    <div class="admin-row">
      <img src="${escapeAttr(thumbOf(p))}" alt="" />
      <div class="admin-row-info">
        <div class="name">${escapeHtml(p.name || '(untitled)')}</div>
        <div class="meta">${escapeHtml(p.category || '')} · ${escapeHtml(p.price || '')}</div>
      </div>
      <button data-id="${p.id}">Edit</button>
    </div>
  `).join("");
  list.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => openProductEdit(allProducts.find(p => p.id === btn.dataset.id));
  });
}
$("newProductBtn").onclick = () => openProductEdit(null);

/* ---------------------------------------------------------------------
   IMAGE / VIDEO UPLOAD — Cloudinary (free, no card needed)
   --------------------------------------------------------------------- */
function uploadToCloudinary(file, resourceType, onProgress){
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try{
        const res = JSON.parse(xhr.responseText);
        if (res.secure_url) resolve(res.secure_url);
        else reject(new Error(res.error?.message || "Upload failed"));
      } catch(err){ reject(err); }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

/* ---------------------------------------------------------------------
   ADMIN: ADD / EDIT / DELETE PRODUCT
   --------------------------------------------------------------------- */
let editingId = null;
let editingImages = [];   // array of already-uploaded URLs (existing + newly added)
let editingVideoUrl = null;

function openProductEdit(p){
  editingId = p ? p.id : null;
  editingImages = p && p.images ? [...p.images] : [];
  editingVideoUrl = p ? (p.videoUrl || null) : null;

  $("productEditTitle").textContent = p ? "Edit piece" : "Add a piece";
  $("editProductId").value = p ? p.id : "";
  $("editName").value = p ? p.name || "" : "";
  $("editCategory").value = p ? p.category || "" : "";
  $("editPrice").value = p ? p.price || "" : "";
  $("editDesc").value = p ? p.description || "" : "";
  $("editFeatured").checked = p ? !!p.featured : false;
  $("editImageFiles").value = "";
  $("editVideoFile").value = "";
  $("imageUploadProgress").hidden = true;
  $("videoUploadProgress").hidden = true;

  renderImagePreviewGrid();
  renderVideoRow();

  $("deleteProductBtn").hidden = !p;
  openBackdrop($("productEditBackdrop"));
}
$("productEditClose").onclick = () => closeBackdrop($("productEditBackdrop"));

function renderImagePreviewGrid(){
  $("editImagePreviewGrid").innerHTML = editingImages.map((url, i) => `
    <div class="preview-thumb">
      <img src="${escapeAttr(url)}" alt="" />
      <button type="button" data-i="${i}" aria-label="Remove">&times;</button>
    </div>
  `).join("");
  $("editImagePreviewGrid").querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      editingImages.splice(parseInt(btn.dataset.i, 10), 1);
      renderImagePreviewGrid();
    };
  });
}

function renderVideoRow(){
  $("editVideoRow").hidden = !editingVideoUrl;
}
$("removeVideoBtn").onclick = () => { editingVideoUrl = null; renderVideoRow(); };

$("editImageFiles").addEventListener("change", async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const progress = $("imageUploadProgress");
  progress.hidden = false;
  for (let i = 0; i < files.length; i++){
    progress.textContent = `Uploading photo ${i + 1} of ${files.length}…`;
    try{
      const url = await uploadToCloudinary(files[i], "image");
      editingImages.push(url);
      renderImagePreviewGrid();
    } catch(err){
      console.error(err);
      alert(`Couldn't upload one of the photos. Check your connection and try again.`);
    }
  }
  progress.hidden = true;
  e.target.value = "";
});

$("editVideoFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const progress = $("videoUploadProgress");
  progress.hidden = false;
  progress.textContent = "Uploading video… 0%";
  try{
    editingVideoUrl = await uploadToCloudinary(file, "video", (pct) => {
      progress.textContent = `Uploading video… ${pct}%`;
    });
    renderVideoRow();
  } catch(err){
    console.error(err);
    alert("Couldn't upload the video. Check your connection and try again.");
  } finally {
    progress.hidden = true;
    e.target.value = "";
  }
});

$("productEditForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const saveBtn = $("saveProductBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  try{
    const data = {
      name: $("editName").value.trim(),
      category: $("editCategory").value,
      price: $("editPrice").value.trim(),
      description: $("editDesc").value.trim(),
      featured: $("editFeatured").checked,
      images: editingImages,
      videoUrl: editingVideoUrl || null
    };
    if (editingId){
      await PRODUCTS_COL.doc(editingId).update(data);
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await PRODUCTS_COL.add(data);
    }
    closeBackdrop($("productEditBackdrop"));
  } catch(err){
    console.error(err);
    alert("Couldn't save this piece. Check your connection and try again.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save piece";
  }
});

$("deleteProductBtn").onclick = async () => {
  if (!editingId) return;
  if (!confirm("Delete this piece? This can't be undone.")) return;
  await PRODUCTS_COL.doc(editingId).delete();
  closeBackdrop($("productEditBackdrop"));
};

/* ---------------------------------------------------------------------
   BOOT
   --------------------------------------------------------------------- */
$("year").textContent = new Date().getFullYear();
loadEnquiry();
loadSettings().then(subscribeProducts);
