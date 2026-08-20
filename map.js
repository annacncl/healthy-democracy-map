
(function () {
  console.log("HD MAP INIT CLEAN", Date.now());

  // ===============================
  // Filter label summarizer (shared)
  // ===============================
  function summarizeSelection(labels, allLabel) {
    const n = labels.length;
    if (n === 0) return allLabel;
    if (n === 1) return labels[0];
    if (n === 2) return `${labels[0]}, ${labels[1]}`;
    return `${n} selected`;
  }
  // ==========================
// Category label helper
// ==========================
function updateCategoryLabel(selectedCategories) {
  const labelEl = document.getElementById("cat-ui-label");

  if (!labelEl) return;

  if (!selectedCategories || selectedCategories.length === 0) {
    labelEl.textContent = "All categories";
    return;
  }

  if (selectedCategories.length === 1) {
    labelEl.textContent = selectedCategories[0];
    return;
  }

  labelEl.textContent =
    `${selectedCategories[0]} +${selectedCategories.length - 1}`;
}
function clearNativeMultiSelect(selectEl) {
  if (!selectEl) return;
  Array.from(selectEl.options).forEach(function (o) {
    o.selected = false;
  });
  selectEl.dispatchEvent(new Event("change", { bubbles: true }));
}

  // ---- Guardrails ----
  var mapEl = document.getElementById("mapboxMap");
  if (!mapEl) { console.warn("No #mapboxMap found"); return; }
  if (!window.mapboxgl) { console.warn("mapboxgl not loaded"); return; }

  // Prevent double-init
  if (window.hdMap) { console.warn("hdMap already exists, skipping init"); return; }

  // ---- Config ----
  mapboxgl.accessToken = "pk.eyJ1IjoiYW5uYWNvcm4iLCJhIjoiY210MWI5czFzMGUxZDJ4c2V3dHJzNzl2NyJ9.NJPP7M07srEcj5XzLyzkPw";

  var STYLE_URL = "mapbox://styles/annacorn/cmhg6aq7v001w01shc05theni";
  var LAYER_ID  = "orgs";
var SOURCE_ID = "composite";
var SOURCE_LAYER = "orgs";
  var FIELD_CATEGORY = "Category of Work";
  var FIELD_STATE    = "State";
  var FIELD_NETWORK  = "Network Membership";
/* ---------- Category colors (shared by map + filters + legend) ---------- */
var CATEGORY_COLORS = {
  "Funder": "#4E79A7",
  "Civic Technology": "#F28E2B",
  "Civic Associations": "#E15759",
  "Deliberative/Participatory/Direct Democracy": "#76B7B2",
  "Organizing & Advocacy": "#59A14F",
  "Civic Education & Leadership": "#EDC948",
  "Civic Media": "#B07AA1",
  "Faith-Based Efforts": "#FF9DA7",
  "Civic Research": "#9C755F",
  "Voter Engagement": "#1F3A5F",
  "Electoral Reform": "#2E8B57",
  "Connecting Across Differences": "#C05A28",
  "Responsive Governance": "#6B7280",
  "Service & Volunteerism": "#6F4E7C"
};
window.CATEGORY_COLORS = CATEGORY_COLORS;

/* ---------- Category descriptions (shared by UI tooltips) ---------- */
var CATEGORY_META = {
  "Civic Associations": {
    desc: "Groups that help people work with government, other institutions, and one another."
  },
  "Civic Education & Leadership": {
    desc: "Information and learning experiences that equip citizens to participate in democracy."
  },
  "Civic Media": {
    desc: "Types of journalism that build media literacy and engage citizens directly with journalists."
  },
  "Civic Research": {
    desc: "Research focused on the skills, attitudes, and activities that are central to citizenship."
  },
  "Civic Technology": {
    desc: "Digital technologies that improve public decision-making, problem-solving, and community-building."
  },
  "Connecting Across Differences": {
    desc: "Bringing people together across differences to build relationships, collaboration, and trust."
  },
  "Deliberative/Participatory/Direct Democracy": {
    desc: "Governance processes where citizens work together to develop recommendations or make decisions themselves."
  },
  "Electoral Reform": {
    desc: "Changes to voting systems that make them clearer and more reflective of what citizens want."
  },
  "Faith-Based Efforts": {
    desc: "Work within faith communities to engage people in public decision-making and problem-solving."
  },
  "Organizing & Advocacy": {
    desc: "Efforts that help people with common interests work together to achieve policy change."
  },
  "Service & Volunteerism": {
    desc: "Programs that help people devote their time to activities that solve problems and help others."
  },
  "Voter Engagement": {
    desc: "Efforts that help citizens understand how to vote and get the information they need to make informed decisions."
  },
  "Responsive Governance": {
    desc: "Work that builds trust in institutions by meeting community needs through transparent, inclusive, and accountable processes."
  },
  "Funder": {
    desc: "Public and private philanthropy that invests in civic initiatives to strengthen democracy, empower diverse voices, and protect freedoms."
  }
};

window.CATEGORY_META = CATEGORY_META; // optional, helpful for debugging


  // UI elements (must exist in your sidebar markup)
  var categorySelect = document.getElementById("filter-category");
  var stateSelect    = document.getElementById("filter-state");
var networkSelectNational = document.getElementById("filter-network-national");
var networkSelectLocal    = document.getElementById("filter-network-local");
// Backwards-compat alias so older code doesn't crash
var networkSelect = null;
var searchInput    = document.getElementById("search-name");
  var clearButton    = document.getElementById("clear-filters");
  var listEl         = document.getElementById("list");
  var resultCountEl  = document.getElementById("result-count");
  initInfoTooltipsOnce();
  initCategoryHoverDescriptionsOnce();
function loadOrgIndexOnce() {
  if (window.__hdIndexLoaded) return;
  window.__hdIndexLoaded = true;

fetch("https://cdn.jsdelivr.net/gh/annacncl/healthy-democracy-map@main/orgs_index.json")
.then(r => r.json())
    .then(data => {
  window.ORG_INDEX = data; // ✅ MUST be global
  console.log("✅ ORG INDEX LOADED", data && data.total);
if (typeof rebuildNetworkOptionsDynamic === "function") {
  rebuildNetworkOptionsDynamic();
}
  // Top stat (total orgs)
  const el = document.getElementById("orgTotalCount");
  if (el && data && typeof data.total === "number") {
    el.textContent = data.total.toLocaleString();
  }

  // Initial filtered count (no filters yet)
  if (typeof updateAccurateCountFromIndex === "function") {
    updateAccurateCountFromIndex();
  }
})
    .catch(err => console.warn("orgs_index.json fetch failed", err));
}

function updateCategorySelectColor() {
  if (!categorySelect) return;

  var v = categorySelect.value;
  var hex = (CATEGORY_COLORS && CATEGORY_COLORS[v]) ? CATEGORY_COLORS[v] : "#111111";

  categorySelect.style.color = v ? hex : "#111111";
  }
  // ---- Create map ----
  var map = new mapboxgl.Map({
    container: "mapboxMap",
    style: STYLE_URL,
    center: [-98.5, 39.8],
    zoom: 3,
    projection: "mercator"
  });
  window.hdMap = map;

  map.addControl(new mapboxgl.NavigationControl(), "top-right");

  // ---- Popup handling ----
  window.activePopup = null;

  function safeText(v) {
    return v == null ? "" : String(v);
  }
  
// Mapbox built-in US state bounding boxes (approximate, fast, no API call)
  var STATE_BOUNDS = {
    AL: [[-88.47, 30.22], [-84.89, 35.01]],
    AK: [[-179.15, 51.21], [-129.98, 71.44]],
    AZ: [[-114.82, 31.33], [-109.05, 37.00]],
    AR: [[-94.62, 33.00], [-89.64, 36.50]],
    CA: [[-124.48, 32.53], [-114.13, 42.01]],
    CO: [[-109.06, 36.99], [-102.04, 41.00]],
    CT: [[-73.73, 40.98], [-71.79, 42.05]],
    DC: [[-77.12, 38.79], [-76.91, 38.99]],
    FL: [[-87.63, 24.54], [-80.03, 31.00]],
    GA: [[-85.61, 30.36], [-80.84, 35.00]],
    HI: [[-160.25, 18.91], [-154.81, 22.24]],
    ID: [[-117.24, 41.99], [-111.04, 49.00]],
    IL: [[-91.51, 36.97], [-87.49, 42.51]],
    IN: [[-88.10, 37.77], [-84.78, 41.76]],
    IA: [[-96.64, 40.38], [-90.14, 43.50]],
    KS: [[-102.05, 36.99], [-94.59, 40.00]],
    KY: [[-89.57, 36.50], [-81.96, 39.15]],
    LA: [[-94.04, 28.93], [-88.82, 33.02]],
    MA: [[-73.51, 41.23], [-69.93, 42.89]],
    MD: [[-79.49, 37.89], [-75.05, 39.72]],
    ME: [[-71.08, 42.98], [-66.95, 47.46]],
    MI: [[-90.42, 41.70], [-82.41, 48.30]],
    MN: [[-97.24, 43.50], [-89.49, 49.38]],
    MO: [[-95.77, 35.99], [-89.10, 40.61]],
    MS: [[-91.65, 30.18], [-88.10, 34.99]],
    MT: [[-116.05, 44.36], [-104.04, 49.00]],
    NC: [[-84.32, 33.84], [-75.46, 36.59]],
    ND: [[-104.05, 45.94], [-96.55, 49.00]],
    NE: [[-104.05, 39.99], [-95.31, 43.00]],
    NH: [[-72.56, 42.70], [-70.61, 45.31]],
    NJ: [[-75.56, 38.93], [-73.89, 41.36]],
    NM: [[-109.05, 31.33], [-103.00, 37.00]],
    NV: [[-120.01, 35.00], [-114.04, 42.00]],
    NY: [[-79.76, 40.49], [-71.85, 45.01]],
    OH: [[-84.82, 38.40], [-80.52, 41.98]],
    OK: [[-103.00, 33.62], [-94.43, 37.00]],
    OR: [[-124.57, 41.99], [-116.46, 46.29]],
    PA: [[-80.52, 39.72], [-74.69, 42.27]],
	PR: [[-67.271492, 17.926405], [-65.589752, 18.515978]],
	RI: [[-71.91, 41.15], [-71.12, 42.02]],
    SC: [[-83.35, 32.03], [-78.54, 35.21]],
    SD: [[-104.06, 42.49], [-96.44, 45.94]],
    TN: [[-90.31, 34.98], [-81.65, 36.68]],
    TX: [[-106.65, 25.84], [-93.51, 36.50]],
    UT: [[-114.05, 36.99], [-109.04, 42.00]],
    VA: [[-83.68, 36.54], [-75.24, 39.47]],
    VT: [[-73.44, 42.73], [-71.47, 45.01]],
    WA: [[-124.76, 45.54], [-116.91, 49.00]],
    WI: [[-92.89, 42.49], [-86.25, 47.08]],
    WV: [[-82.64, 37.20], [-77.72, 40.64]],
    WY: [[-111.05, 40.99], [-104.05, 45.01]]
  };

function zoomToState(stateCode) {
  if (!stateCode || !map) return;

  var bounds = STATE_BOUNDS[stateCode.toUpperCase()];
  if (!bounds) return;

  map.fitBounds(bounds, {
    padding: 40,
    duration: 800
  });
}

function zoomToStates(stateCodes) {
  if (!map) return;

  var codes = (stateCodes || [])
    .map(function (s) { return String(s || "").trim().toUpperCase(); })
    .filter(Boolean);

  if (!codes.length) return;

  // 1 state? use existing behavior
  if (codes.length === 1) {
    zoomToState(codes[0]);
    return;
  }

  // Build a combined bounding box that contains all selected states
  var swLng =  999, swLat =  999;
  var neLng = -999, neLat = -999;
  var found = 0;

  codes.forEach(function (code) {
    var b = STATE_BOUNDS[code];
    if (!b) return;

    // b = [[swLng, swLat], [neLng, neLat]]
    swLng = Math.min(swLng, b[0][0]);
    swLat = Math.min(swLat, b[0][1]);
    neLng = Math.max(neLng, b[1][0]);
    neLat = Math.max(neLat, b[1][1]);
    found++;
  });

  if (!found) return;

  map.fitBounds([[swLng, swLat], [neLng, neLat]], {
    padding: 40,
    duration: 800
  });
}

  function popupHTML(p) {
  var name =
    safeText(p["Name"]) ||
    safeText(p["\uFEFFName"]) ||
    safeText(p["Organization Full Name"]) ||
    "";

  var city     = safeText(p["City"]);
  var state    = safeText(p["State"]);
  var website  = safeText(p["Website"]);
  var mission  = safeText(p["Mission/Description"]);
  var contactEmail = safeText(p["General Contact Email"]).trim();
  var category = safeText(p["Category of Work"]);
  var networks = safeText(p["Network Membership"]);

  var url = website
    ? (website.indexOf("http") === 0 ? website : "https://" + website)
    : "";

var titleLine = url
  ? '<a class="popup-org-link" href="' + url + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="popup-org-name-text">' + name + '</span>' +
      '<span class="popup-org-link-icon" aria-hidden="true">↗</span>' +
    '</a>'
  : '<div class="popup-org-name">' + name + '</div>';

  // Build details content (only include sections that exist)
  var detailsContent = "";

if (mission) {
  detailsContent +=
    '<div class="popup-section popup-mission">' +
      '<strong>Mission</strong>' +
      '<div class="popup-mission__text" data-collapsed="1">' + mission + '</div>' +
      '<button class="popup-mission__toggle" type="button" hidden>Expand</button>' +
    '</div>';
}

if (contactEmail && contactEmail.indexOf("@") !== -1) {
  var mailto = "mailto:" + encodeURIComponent(contactEmail);

  detailsContent +=
    '<div class="popup-section popup-contact">' +
      '<strong>Contact</strong>' +
      '<a class="popup-contact__email" href="' + mailto + '">' + contactEmail + '</a>' +
    '</div>';
}

  if (category) {
    detailsContent +=
      '<div class="popup-section">' +
        '<strong>Category of Work</strong>' + category +
      '</div>';
  }

if (networks) {
  var netsArr = networks
    .split(",")
    .map(function (n) { return n.trim(); })
    .filter(Boolean);

  if (netsArr.length) {
    var netsHtml = netsArr.map(function (n) {
      var meta = window.NETWORK_META && window.NETWORK_META[n];
      var site = meta && meta.website ? String(meta.website).trim() : "";

      if (site) {
        var href = (site.indexOf("http://") === 0 || site.indexOf("https://") === 0)
          ? site
          : ("https://" + site);

        return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + n + '</a>';
      }

      return '<span>' + n + '</span>';
    }).join(", ");

    detailsContent +=
      '<div class="popup-section popup-networks">' +
        '<strong>Networks</strong>' + netsHtml +
      '</div>';
  }
}

  var detailsBlock = detailsContent
    ? '<button class="popup-toggle" type="button">Show details ▾</button>' +
      '<div class="popup-details" style="display:none;">' +
        detailsContent +
      '</div>'
    : "";

  return (
    '<div class="hde-popup">' +
      titleLine +
      '<div class="popup-org-meta">' +
        [city, state].filter(Boolean).join(", ") +
      '</div>' +
      detailsBlock +
    '</div>'
  );
}

  function openPopup(lngLat, props) {
  if (window.activePopup) {
    window.activePopup.remove();
    window.activePopup = null;
  }

  window.activePopup = new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: false
  })
    .setLngLat(lngLat)
    .setHTML(popupHTML(props || {}))
    .addTo(map);

var popupEl = window.activePopup.getElement();
if (!popupEl) return;

function initMissionClamp() {
  var missionText = popupEl.querySelector(".popup-mission__text");
  var missionBtn  = popupEl.querySelector(".popup-mission__toggle");
  if (!missionText || !missionBtn) return;

  // prevent double-binding if user toggles details open/closed/open
  if (missionBtn.dataset.bound === "1") return;
  missionBtn.dataset.bound = "1";

  requestAnimationFrame(function () {
    if (missionText.scrollHeight > missionText.clientHeight + 2) {
      missionBtn.hidden = false;

      missionBtn.addEventListener("click", function () {
        var expanded = missionText.classList.toggle("is-expanded");
        missionBtn.textContent = expanded ? "Collapse" : "Expand";

        if (window.activePopup && typeof window.activePopup._update === "function") {
          window.activePopup._update();
        } else if (window.activePopup && typeof window.activePopup.setLngLat === "function") {
          window.activePopup.setLngLat(window.activePopup.getLngLat());
        }
      });
    }
  });
}

var toggle  = popupEl.querySelector(".popup-toggle");
var details = popupEl.querySelector(".popup-details");

if (toggle && details) {
  toggle.addEventListener("click", function () {
    var isHidden = (details.style.display === "none");
    details.style.display = isHidden ? "block" : "none";
    toggle.textContent = isHidden ? "Hide details ▴" : "Show details ▾";

    if (isHidden) {
      initMissionClamp(); // ✅ THIS is the missing piece
    }

    if (window.activePopup && typeof window.activePopup._update === "function") {
      window.activePopup._update();
    } else if (window.activePopup && typeof window.activePopup.setLngLat === "function") {
      window.activePopup.setLngLat(window.activePopup.getLngLat());
    }
  });
}
}

  // ---- Filtering + list ----
function featureKey(f) {
    var p = f.properties || {};
    return p.AirtableID || p.RecordID || (safeText(p.Name) + "|" + safeText(p.Website));
  }

  function dedupe(features) {
    var seen = new Set();
    var out = [];
    for (var i = 0; i < features.length; i++) {
      var k = featureKey(features[i]);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(features[i]);
    }
    return out;
  }

function getAllSourceFeatures() {
  var feats = [];
  try {
    feats = map.querySourceFeatures(SOURCE_ID, { sourceLayer: SOURCE_LAYER }) || [];
  } catch (e) {
    feats = [];
  }

  // ✅ CRITICAL FIX:
  // querySourceFeatures often returns [] after pan/zoom even when dots exist
  if (!feats.length) {
    feats = map.queryRenderedFeatures({ layers: [LAYER_ID] }) || [];
  }

  return feats;
}

  function populateDropdownsOnce() {
    var feats = getAllSourceFeatures();
    if (!feats.length) return;

    if (categorySelect && categorySelect.options.length <= 1) {
      var catSet = new Set();
      feats.forEach(function (f) {
        var v = safeText((f.properties || {})[FIELD_CATEGORY]).trim();
        if (v) catSet.add(v);
      });
      Array.from(catSet).sort().forEach(function (v) {
        var opt = document.createElement("option");
        opt.value = v;
  opt.textContent = v;
  categorySelect.appendChild(opt);
});
    }

    if (stateSelect && stateSelect.options.length <= 1) {
  // Only allow: 50 states + DC + PR + GU + International
  var ALLOWED = new Set([
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
    "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
    "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
    "DC","PR","GU",
    "International"
  ]);

  // Optional: support full state names if they appear
  var NAME_TO_CODE = {
    "District of Columbia": "DC",
    "Puerto Rico": "PR",
    "Guam": "GU",
    "United States": null // ignore
    // If you need full-name -> code for all 50 later, tell me and I’ll drop the full mapping in.
  };

  var stSet = new Set();

  feats.forEach(function (f) {
    var raw = safeText((f.properties || {})[FIELD_STATE]).trim();
    if (!raw) return;

    // Normalize some known phrases
    if (NAME_TO_CODE[raw]) raw = NAME_TO_CODE[raw];

    // Split multi-state strings like "CA, NV" / "CA;NV" / "CA & NV" / "CA / NV"
    var parts = raw
      .split(/,|;|\||\/|&|\+|\band\b/gi)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);

    // If it didn't split into anything meaningful, keep original as one part
    if (!parts.length) parts = [raw];

    parts.forEach(function (p) {
      // Normalize: uppercase 2-letter codes; keep "International" as-is
      var v = (p.toLowerCase() === "international") ? "International" : p.toUpperCase();

      // Map known full names (if any)
      if (NAME_TO_CODE[v]) v = NAME_TO_CODE[v];

      if (ALLOWED.has(v)) stSet.add(v);
    });
  });

  // Populate dropdown in a nice order: states alpha, then DC/PR/GU/International
  var sorted = Array.from(stSet).filter(function(v){ return v !== "DC" && v !== "PR" && v !== "GU" && v !== "International"; }).sort();
  ["DC","PR","GU","International"].forEach(function(v){ if (stSet.has(v)) sorted.push(v); });

  sorted.forEach(function (v) {
    var opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    stateSelect.appendChild(opt);
  });
}
}

  
function updateNetworkStat() {
  var el = document.getElementById("stat-networks");
  if (!el) return;

  var feats = getAllSourceFeatures();
  if (!feats || !feats.length) return;

  var netSet = new Set();

  feats.forEach(function (f) {
    var raw = safeText((f.properties || {})[FIELD_NETWORK]);
    if (!raw) return;

    raw.split(",").forEach(function (part) {
      var v = part.trim();
      if (v) netSet.add(v);
    });
  });

  el.textContent = String(netSet.size);
}
  function buildFilterExpression() {
var cats = [];
if (categorySelect) {
  cats = Array.from(categorySelect.selectedOptions || [])
    .map(o => o.value)
    .filter(Boolean);
}


// ✅ MULTI-STATE: pull selected options from the hidden <select multiple>
var states = [];
if (stateSelect) {
  states = Array.from(stateSelect.selectedOptions || [])
    .map(function (o) { return o.value; })
    .filter(Boolean);
}

var q = searchInput ? searchInput.value.trim().toLowerCase() : "";

     // networks selected from BOTH dropdowns
    var nets = [];

    if (networkSelectNational) {
      nets = nets.concat(
        Array.from(networkSelectNational.selectedOptions || [])
          .map(function (o) { return o.value; })
          .filter(Boolean)
      );
    }

    if (networkSelectLocal) {
      nets = nets.concat(
        Array.from(networkSelectLocal.selectedOptions || [])
          .map(function (o) { return o.value; })
          .filter(Boolean)
      );
    }

    var expr = ["all"];

if (cats.length) {
  var anyCat = ["any"];
  cats.forEach(function (c) {
    anyCat.push(["==", ["get", FIELD_CATEGORY], c]);
  });
  expr.push(anyCat);
}
if (states.length) {
  var stField = ["to-string", ["coalesce", ["get", FIELD_STATE], ""]];
  var anySt = ["any"];
  states.forEach(function (s) {
    anySt.push(["==", stField, s]);
  });
  expr.push(anySt);
}

    if (nets.length > 0) {
  var netField = ["concat", ",", ["downcase", ["coalesce", ["get", FIELD_NETWORK], ""]], ","];
  var anyExpr = ["any"];
  nets.forEach(function (nv) {
    var needle = "," + nv.toLowerCase() + ",";
    anyExpr.push(["in", needle, netField]);
  });
  expr.push(anyExpr);
}

    if (q) {
      var nameExpr  = ["downcase", ["coalesce", ["get", "Name"], ["get", "\uFEFFName"], ["get", "Organization Full Name"], ""]];
      var cityExpr  = ["downcase", ["coalesce", ["get", "City"], ""]];
      var catExpr   = ["downcase", ["coalesce", ["get", FIELD_CATEGORY], ""]];
      var stateExpr = ["downcase", ["coalesce", ["get", FIELD_STATE], ""]];
	  var missionExpr = ["downcase", ["coalesce", ["get", "Mission/Description"], ""]];

      expr.push(["any",
        ["in", q, nameExpr],
        ["in", q, cityExpr],
        ["in", q, catExpr],
        ["in", q, stateExpr],
		["in", q, missionExpr]
      ]);
    }

    return expr;
  }

  function pointInBounds(coord, bounds) {
  if (!coord || coord.length < 2) return false;
  var lng = coord[0], lat = coord[1];
  return bounds.contains([lng, lat]);
}

function getAllLoadedSourceFeatures() {
  // Source features (not rendered) = best for accurate counts
  try {
    return map.querySourceFeatures(SOURCE_ID, { sourceLayer: SOURCE_LAYER }) || [];
  } catch (e) {
    return [];
  }
}

// JS-side filter matcher (uses SAME rules as buildFilterExpression)
function featureMatchesAllFilters(f) {
  var p = (f && f.properties) ? f.properties : {};

var cats = [];
if (categorySelect) {
  cats = Array.from(categorySelect.selectedOptions || [])
    .map(o => String(o.value || "").trim())
    .filter(Boolean);
}


	  var q   = searchInput ? searchInput.value.trim().toLowerCase() : "";

// ✅ MULTI-STATE: read selected states from the hidden <select multiple>
var states = [];
if (stateSelect) {
  states = Array.from(stateSelect.selectedOptions || [])
    .map(function (o) { return String(o.value || "").trim(); })
    .filter(Boolean);
}

 // ✅ networks selected from BOTH dropdowns
  var nets = [];

  if (networkSelectNational) {
    nets = nets.concat(
      Array.from(networkSelectNational.selectedOptions || [])
        .map(function (o) { return String(o.value || "").trim(); })
        .filter(Boolean)
    );
  }

  if (networkSelectLocal) {
    nets = nets.concat(
      Array.from(networkSelectLocal.selectedOptions || [])
        .map(function (o) { return String(o.value || "").trim(); })
        .filter(Boolean)
    );
  }


if (cats.length) {
  var fcat = String(p[FIELD_CATEGORY] || "").trim();
  if (cats.indexOf(fcat) === -1) return false;
}
	  
// ✅ MULTI-STATE compare
if (states.length) {
  var stVal = String(p[FIELD_STATE] || "").trim();
  if (states.indexOf(stVal) === -1) return false;
}

  if (nets.length) {
    var raw = String(p[FIELD_NETWORK] || "");
    var rawLc = raw.toLowerCase();
    var ok = nets.some(function (n) {
      return rawLc.indexOf(n.toLowerCase()) !== -1;
    });
    if (!ok) return false;
  }

  if (q) {
    var name = (safeText(p["Name"]) || safeText(p["\uFEFFName"]) || safeText(p["Organization Full Name"]) || "").toLowerCase();
    var city = (safeText(p["City"]) || "").toLowerCase();
    var catT = (safeText(p[FIELD_CATEGORY]) || "").toLowerCase();
    var stT  = (safeText(p[FIELD_STATE]) || "").toLowerCase();
    var mis  = (safeText(p["Mission/Description"]) || "").toLowerCase();

    if (
      name.indexOf(q) === -1 &&
      city.indexOf(q) === -1 &&
      catT.indexOf(q) === -1 &&
      stT.indexOf(q) === -1 &&
      mis.indexOf(q) === -1
    ) return false;
  }

  return true;
}

function hasAnyFilterActive() {
  var q = searchInput ? searchInput.value.trim() : "";
  if (q) return true;

  if (categorySelect) {
    if (Array.from(categorySelect.selectedOptions || []).some(o => o.value)) return true;
  }
  if (stateSelect) {
    if (Array.from(stateSelect.selectedOptions || []).some(o => o.value)) return true;
  }
  if (networkSelectNational) {
    if (Array.from(networkSelectNational.selectedOptions || []).some(o => o.value)) return true;
  }
  if (networkSelectLocal) {
    if (Array.from(networkSelectLocal.selectedOptions || []).some(o => o.value)) return true;
  }
  return false;
}


function renderListFromMap() {
  if (!listEl) return;

  var q = searchInput ? searchInput.value.trim().toLowerCase() : "";

// Use index for accurate matching, but intersect with current map viewport bounds
if (window.ORG_INDEX && Array.isArray(window.ORG_INDEX.records) && hasAnyFilterActive()) {
  renderListFromIndexInView();
  return;
}

  // ✅ Otherwise, show what's visible on the map (existing behavior)
  if (!__hdeClusterLayerIds) __hdeClusterLayerIds = findClusterAndPointLayers();
  
  var pointLayers =
    (__hdeClusterLayerIds && __hdeClusterLayerIds.pointLayers && __hdeClusterLayerIds.pointLayers.length)
      ? __hdeClusterLayerIds.pointLayers
      : [LAYER_ID];
  
  var feats = map.queryRenderedFeatures({ layers: pointLayers }) || [];
  
  // ✅ Ensure clusters don't appear in the sidebar list
  feats = feats.filter(function (f) {
    var p = f.properties || {};
    return !(p.cluster === true || p.cluster === "true" || p.point_count != null);
  });
  
  var bounds = map.getBounds();
  var inView = feats.filter(function (f) {
    return f.geometry &&
      f.geometry.type === "Point" &&
      pointInBounds(f.geometry.coordinates, bounds);
  });
  
  // Apply the SAME filters in JS so list/count doesn't depend on rendered pins
  var filtered = inView.filter(featureMatchesAllFilters);
  var uniq = dedupe(filtered);
  
  var el = document.getElementById("result-count");
  if (el) {
    // Use index-based total when zoomed out (vector tiles drop points at low zoom)
    if (map.getZoom() <= 3.5 && typeof updateAccurateCountFromIndex === "function") {
      updateAccurateCountFromIndex();
    } else {
      el.textContent = Number(uniq.length).toLocaleString();
    }
  }
  
  uniq.sort(function (a, b) {
    var an = safeText((a.properties || {}).Name);
    var bn = safeText((b.properties || {}).Name);
    return an.localeCompare(bn);
  });
  
  listEl.innerHTML = uniq.map(function (f) {
    var p = f.properties || {};
    var name = safeText(p["Name"]) || safeText(p["\uFEFFName"]) || safeText(p["Organization Full Name"]) || "Unnamed organization";
    var city = safeText(p["City"]);
    var st   = safeText(p[FIELD_STATE]);
    var cat  = safeText(p[FIELD_CATEGORY]);
    
    var key = featureKey(f);
    window.__HDE_CARD_PROPS = window.__HDE_CARD_PROPS || {};
    window.__HDE_CARD_PROPS[key] = p;
    
    return (
      '<div class="org-card" ' +
        'data-key="' + key + '" ' +
        'data-lng="' + f.geometry.coordinates[0] + '" ' +
        'data-lat="' + f.geometry.coordinates[1] + '">' +
        '<div class="org-title">' + name + '</div>' +
        (city || st ? '<div class="org-meta">' + [city, st].filter(Boolean).join(", ") + '</div>' : "") +
        (cat ? '<div class="org-meta"><strong>Category:</strong> ' + cat + '</div>' : "") +
      '</div>'
    );
  }).join("");
  
  Array.from(listEl.querySelectorAll(".org-card")).forEach(function (card) {
    card.addEventListener("click", function () {
      var lng = Number(card.getAttribute("data-lng"));
      var lat = Number(card.getAttribute("data-lat"));
      var key = card.getAttribute("data-key");
      var props = (window.__HDE_CARD_PROPS && key) ? window.__HDE_CARD_PROPS[key] : {};
      
      if (window.__hdePendingPopupMoveEnd) {
        map.off("moveend", window.__hdePendingPopupMoveEnd);
        window.__hdePendingPopupMoveEnd = null;
      }
      
      map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 8), speed: 1.2 });
      
      window.__hdePendingPopupMoveEnd = function () {
        window.__hdePendingPopupMoveEnd = null;
        openPopup([lng, lat], props);
      };
      
      map.once("moveend", window.__hdePendingPopupMoveEnd);
    });
  });
}

function flyToAndPopup(coords, key) {
  if (window.__hdePendingPopupMoveEnd) {
    map.off("moveend", window.__hdePendingPopupMoveEnd);
    window.__hdePendingPopupMoveEnd = null;
  }

  map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 10), speed: 1.2 });

  window.__hdePendingPopupMoveEnd = function () {
    window.__hdePendingPopupMoveEnd = null;
    var feats = map.queryRenderedFeatures(map.project(coords), { layers: [LAYER_ID] });
    var props = feats.length > 0
      ? feats[0].properties
      : ((window.__HDE_CARD_PROPS && window.__HDE_CARD_PROPS[key]) || {});
    openPopup(coords, props);
  };

  map.once("moveend", window.__hdePendingPopupMoveEnd);
}

function renderListFromIndexInView() {
  if (!listEl || !window.ORG_INDEX) return;

  var idx = window.ORG_INDEX;
  var bounds = map.getBounds();
  var matches = [];

  for (var i = 0; i < idx.records.length; i++) {
    var rec = idx.records[i];
    if (!recordMatchesFilters(rec)) continue;

    // If the record has coordinates, require it to be in the current viewport.
    // If it has no coordinates, include it anyway (avoids silently dropping orgs).
    if (rec.latitude != null && rec.longitude != null) {
  if (!bounds.contains([rec.longitude, rec.latitude])) continue;
}

    matches.push(rec);
  }

  // Update count
  var el = document.getElementById("result-count");
  if (el) el.textContent = Number(matches.length).toLocaleString();

  // Sort alphabetically
  matches.sort(function (a, b) {
    return (a.name || "").localeCompare(b.name || "");
  });

  // Render cards (same markup as renderListFromIndex)
  listEl.innerHTML = matches.map(function (rec) {
    var name = rec.name || "Unnamed organization";
    var city = rec.city || "";
    var st   = rec.state || "";
    var cat  = rec.category || "";
    var key  = name + "|" + city;

    window.__HDE_CARD_PROPS = window.__HDE_CARD_PROPS || {};
    window.__HDE_CARD_PROPS[key] = {
      "Name": name, "City": city,
      "State": st, "Category of Work": cat
    };

    return (
      '<div class="org-card org-card--index" ' +
        'data-key="' + key + '" ' +
        'data-name="' + name + '" ' +
        'data-lat="' + (rec.latitude != null ? rec.latitude : "") + '" ' +
        'data-lng="' + (rec.longitude != null ? rec.longitude : "") + '">' +
        '<div class="org-title">' + name + '</div>' +
        (city || st ? '<div class="org-meta">' + [city, st].filter(Boolean).join(", ") + '</div>' : "") +
        (cat ? '<div class="org-meta"><strong>Category:</strong> ' + cat + '</div>' : "") +
      '</div>'
    );
  }).join("");

  // Click handler: use coords from data attributes (always in view so tiles will be loaded)
  Array.from(listEl.querySelectorAll(".org-card--index")).forEach(function (card) {
    card.addEventListener("click", function () {
      var key  = card.getAttribute("data-key");
      var name = card.getAttribute("data-name");
      var lat  = parseFloat(card.getAttribute("data-lat"));
      var lng  = parseFloat(card.getAttribute("data-lng"));

      if (!isNaN(lat) && !isNaN(lng)) {
        // Coords are known — fly there and open popup directly
        window.__HDE_CARD_PROPS = window.__HDE_CARD_PROPS || {};
        flyToAndPopup([lng, lat], key);
        return;
      }

      // Fallback: search loaded tiles by name
      var feats = [];
      try {
        feats = map.querySourceFeatures(SOURCE_ID, { sourceLayer: SOURCE_LAYER }) || [];
      } catch (e) {}

      for (var j = 0; j < feats.length; j++) {
        var f = feats[j];
        if (!f.geometry || f.geometry.type !== "Point") continue;
        var p = f.properties || {};
        var fname = safeText(p["Name"]) || safeText(p["\uFEFFName"]) ||
                    safeText(p["Organization Full Name"]) || "";
        if (fname === name) {
          var coords = f.geometry.coordinates;
          window.__HDE_CARD_PROPS[key] = f.properties;
          flyToAndPopup(coords, key);
          return;
        }
      }

      // If we truly have no coords, tell the user something useful
      console.warn("No coordinates found for:", name);
    });
  });
}

	// ✅ NEW: Render list from index (used when searching)
function renderListFromIndex() {
  if (!listEl || !window.ORG_INDEX) return;

  var idx = window.ORG_INDEX;
  var matches = [];

  // Filter index records using the same filter logic
  for (var i = 0; i < idx.records.length; i++) {
    if (recordMatchesFilters(idx.records[i])) {
      matches.push(idx.records[i]);
    }
  }

  // Update count
  var el = document.getElementById("result-count");
  if (el) {
    el.textContent = Number(matches.length).toLocaleString();
  }

  // Sort alphabetically
  matches.sort(function (a, b) {
    return (a.name || "").localeCompare(b.name || "");
  });

  // Render cards
  listEl.innerHTML = matches.map(function (rec) {
    var name = rec.name || "Unnamed organization";
    var city = rec.city || "";
    var st = rec.state || "";
    var cat = rec.category || "";

    // Generate a key for popup lookup
    var key = name + "|" + city;
    
    // Store minimal data for click handler
    window.__HDE_CARD_PROPS = window.__HDE_CARD_PROPS || {};
    window.__HDE_CARD_PROPS[key] = {
      "Name": name,
      "City": city,
      "State": st,
      "Category of Work": cat
    };

    return (
      '<div class="org-card org-card--index" ' +
        'data-key="' + key + '" ' +
        'data-name="' + name + '" ' +
        'data-lat="' + (rec.latitude != null ? rec.latitude : "") + '" ' +
        'data-lng="' + (rec.longitude != null ? rec.longitude : "") + '">' +
        '<div class="org-title">' + name + '</div>' +
        (city || st ? '<div class="org-meta">' + [city, st].filter(Boolean).join(", ") + '</div>' : "") +
        (cat ? '<div class="org-meta"><strong>Category:</strong> ' + cat + '</div>' : "") +
      '</div>'
    );
  }).join("");


Array.from(listEl.querySelectorAll(".org-card--index")).forEach(function (card) {
  card.addEventListener("click", function () {
    var key  = card.getAttribute("data-key");
    var name = card.getAttribute("data-name");
    var lat  = parseFloat(card.getAttribute("data-lat"));
    var lng  = parseFloat(card.getAttribute("data-lng"));

    // 1. Best case: coords are on the card (from index record)
    if (!isNaN(lat) && !isNaN(lng)) {
      flyToAndPopup([lng, lat], key);
      return;
    }

    // 2. Fallback: search loaded vector tiles by name
    var feats = [];
    try {
      feats = map.querySourceFeatures(SOURCE_ID, { sourceLayer: SOURCE_LAYER }) || [];
    } catch (e) {}

    for (var j = 0; j < feats.length; j++) {
      var f = feats[j];
      if (!f.geometry || f.geometry.type !== "Point") continue;
      var p = f.properties || {};
      var fname = safeText(p["Name"]) || safeText(p["\uFEFFName"]) ||
                  safeText(p["Organization Full Name"]) || "";
      if (fname === name) {
        window.__HDE_CARD_PROPS = window.__HDE_CARD_PROPS || {};
        window.__HDE_CARD_PROPS[key] = f.properties;
        flyToAndPopup(f.geometry.coordinates, key);
        return;
      }
    }

    // 3. No coords anywhere — log quietly instead of alerting
    console.warn("No coordinates found for:", name);
  });
});


}

// Strip "(123)" from network option values like "Citizen Connect (305)"
function normalizeNetworkValue(v) {
  return String(v || "").replace(/\s*\(\d+\)\s*$/, "").trim();
}

function recordMatchesFilters(rec) {
  if (!rec) return false;

var cats = [];
if (categorySelect) {
  cats = Array.from(categorySelect.selectedOptions || [])
    .map(o => String(o.value || "").trim())
    .filter(Boolean);
}

	var q   = searchInput ? searchInput.value.trim().toLowerCase() : "";

  // ✅ states selected (multi)
  var states = [];
  if (stateSelect) {
    states = Array.from(stateSelect.selectedOptions || [])
      .map(function (o) { return String(o.value || "").trim(); })
      .filter(Boolean);
  }

  // ✅ networks selected from BOTH dropdowns
  var nets = [];

  if (networkSelectNational) {
    nets = nets.concat(
      Array.from(networkSelectNational.selectedOptions || [])
        .map(function (o) { return String(o.value || "").trim(); })
        .filter(Boolean)
    );
  }

  if (networkSelectLocal) {
    nets = nets.concat(
      Array.from(networkSelectLocal.selectedOptions || [])
        .map(function (o) { return String(o.value || "").trim(); })
        .filter(Boolean)
    );
  }

  // Category
if (cats.length) {
  var rc = String(rec.category || "").trim();
  if (cats.indexOf(rc) === -1) return false;
}
  // ✅ State = ANY selected state
  if (states.length) {
    var rst = String(rec.state || "").trim();
    if (states.indexOf(rst) === -1) return false;
  }

// Networks (index uses rec.networks: Array<string>)
if (nets.length) {
  var recNets = Array.isArray(rec.networks) ? rec.networks : [];

  // match exact network names (case-insensitive)
  var recSet = new Set(recNets.map(function (x) { return String(x || "").trim().toLowerCase(); }));

  var ok = nets.some(function (n) {
    return recSet.has(String(n || "").trim().toLowerCase());
  });

  if (!ok) return false;
}

  // Search
  if (q) {
    var hay = [
      rec.name || "",
      rec.city || "",
      rec.state || "",
      rec.category || "",
      rec.mission || ""
    ].join(" ").toLowerCase();

    if (hay.indexOf(q) === -1) return false;
  }

  return true;
}
function updateAccurateCountFromIndex() {
  // ✅ Don't rely on the cached variable; grab the element fresh
  var el = document.getElementById("result-count");
  if (!el) {
    console.warn("❌ Missing #result-count element in DOM (count cannot update).");
    return;
  }

  var idx = window.ORG_INDEX;
  if (!idx || !Array.isArray(idx.records)) {
    // Index not loaded yet — DON'T overwrite UI with 0
    return;
  }

  var count = 0;
  for (var i = 0; i < idx.records.length; i++) {
    if (recordMatchesFilters(idx.records[i])) count++;
  }

  el.textContent = Number(count).toLocaleString();
}
// Like recordMatchesFilters(), but ignores current network selections
function recordMatchesFiltersNoNetwork(rec) {
  if (!rec) return false;

var cats = [];
if (categorySelect) {
  cats = Array.from(categorySelect.selectedOptions || [])
    .map(o => String(o.value || "").trim())
    .filter(Boolean);
}
	var q   = searchInput ? searchInput.value.trim().toLowerCase() : "";

  // ✅ multi-state selection from hidden <select multiple>
  var states = [];
  if (stateSelect) {
    states = Array.from(stateSelect.selectedOptions || [])
      .map(function (o) { return (o.value || "").trim(); })
      .filter(Boolean);
  }

if (cats.length) {
  var rc = String(rec.category || "").trim();
  if (cats.indexOf(rc) === -1) return false;
}
	
  if (states.length) {
    var recState = String(rec.state || "").trim();
    if (states.indexOf(recState) === -1) return false;
  }

  if (q) {
    var hay = [
      rec.name || "",
      rec.city || "",
      rec.state || "",
      rec.category || "",
      rec.mission || ""
    ].join(" ").toLowerCase();

    if (hay.indexOf(q) === -1) return false;
  }

  return true;
}
// --- Cluster layer detection (no need to guess layer IDs) ---
function findClusterAndPointLayers() {
  var style = map.getStyle && map.getStyle();
  if (!style || !Array.isArray(style.layers)) return { clusterLayers: [], pointLayers: [] };

  function filterHasPointCount(filter) {
    if (!Array.isArray(filter)) return false;
    if (filter[0] === "has" && filter[1] === "point_count") return true;
    for (var i = 0; i < filter.length; i++) {
      if (filterHasPointCount(filter[i])) return true;
    }
    return false;
  }

  var clusterLayers = [];
  var pointLayers = [];

  style.layers.forEach(function (lyr) {
    if (!lyr || lyr.source !== SOURCE_ID) return;
    if (SOURCE_LAYER && lyr["source-layer"] && lyr["source-layer"] !== SOURCE_LAYER) return;

    var f = lyr.filter;

    if (filterHasPointCount(f)) clusterLayers.push(lyr.id);

    var filterMentionsPointCount = JSON.stringify(f || "").indexOf("point_count") !== -1;
    if (filterMentionsPointCount && !filterHasPointCount(f)) pointLayers.push(lyr.id);
  });

  // fallback: use LAYER_ID as the point layer if we didn't detect an unclustered layer
  if (!pointLayers.length && map.getLayer(LAYER_ID)) pointLayers = [LAYER_ID];

  return { clusterLayers: clusterLayers, pointLayers: pointLayers };
}

var __hdeClusterLayerIds = null;

// --- Viewport count that works with clusters ---
function updateCountInViewFromClusters() {
  var el = document.getElementById("result-count");
  if (!el) return;

  if (!__hdeClusterLayerIds) {
    __hdeClusterLayerIds = findClusterAndPointLayers();
    console.log("Detected cluster layers:", __hdeClusterLayerIds.clusterLayers);
    console.log("Detected point layers:", __hdeClusterLayerIds.pointLayers);
  }

  var layersToQuery = []
    .concat(__hdeClusterLayerIds.clusterLayers || [])
    .concat(__hdeClusterLayerIds.pointLayers || []);

  if (!layersToQuery.length) return;

  var feats = map.queryRenderedFeatures({ layers: layersToQuery }) || [];

  var count = 0;
  var seen = new Set();

  for (var i = 0; i < feats.length; i++) {
    var p = feats[i].properties || {};

    if (p.cluster === true || p.cluster === "true" || p.point_count != null) {
      count += Number(p.point_count || 0);
      continue;
    }

    var id = p.AirtableID || p.RecordID || (safeText(p.Name) + "|" + safeText(p.Website));
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    count += 1;
  }

  el.textContent = Number(count).toLocaleString();
}

function applyFilters() {
  if (!map.getLayer(LAYER_ID)) return;

  var expr = buildFilterExpression();

  // Apply filter to the point layer
  map.setFilter(LAYER_ID, expr);

  // Apply filter to any cluster/point layers (if you’re using them)
  if (!__hdeClusterLayerIds) __hdeClusterLayerIds = findClusterAndPointLayers();

  (__hdeClusterLayerIds.clusterLayers || []).forEach(function (id) {
    if (map.getLayer(id)) map.setFilter(id, expr);
  });

  (__hdeClusterLayerIds.pointLayers || []).forEach(function (id) {
    if (map.getLayer(id)) map.setFilter(id, expr);
  });

  // IMPORTANT: wait until Mapbox finishes re-rendering, then rebuild UI
  map.once("idle", function () {
    updateCountInViewFromClusters();
    renderListFromMap();              // ✅ list updates AFTER filters actually render
    rebuildNetworkOptionsDynamic();   // ✅ network counts/options update too
  });

  // Backup in case idle is delayed
  if (window.__hdeRenderTimer) clearTimeout(window.__hdeRenderTimer);
  window.__hdeRenderTimer = setTimeout(function () {
    updateCountInViewFromClusters();
    renderListFromMap();
    rebuildNetworkOptionsDynamic();
  }, 200);
}
function initInfoTooltipsOnce() {
  if (window.__hdeInfoTooltipsOnce) return;
  window.__hdeInfoTooltipsOnce = true;

  // Create one global tooltip
  const tip = document.createElement('div');
  tip.id = 'hde-global-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.style.position = 'fixed';
  tip.style.zIndex = '99999';
  tip.style.maxWidth = '260px';
  tip.style.pointerEvents = 'none';
  tip.style.display = 'none';
  tip.style.opacity = '0';
  tip.style.transition = 'opacity 120ms ease';
  document.body.appendChild(tip);

  // Normalize markup: store text on the icon wrapper
document.querySelectorAll('.hde-info').forEach((icon) => {
  if (icon.dataset.tooltipReady) return;
  const inner = icon.querySelector('.hde-tooltip');
  if (inner) {
    icon.dataset.tooltip = (inner.textContent || '').trim();
    inner.remove(); // ✅ remove the legacy tooltip node entirely
  }
  icon.dataset.tooltipReady = '1';
});

  let activeEl = null;
  let hideTimer = null;

  function isEl(x) {
    return x && x.nodeType === 1; // ELEMENT_NODE
  }

  function showFor(el) {
    const text = (el && el.dataset && el.dataset.tooltip) ? el.dataset.tooltip : '';
    if (!text) return;

    activeEl = el;
    tip.textContent = text;

    // Force visibility regardless of theme CSS
    tip.style.setProperty('display', 'block', 'important');
    tip.style.setProperty('visibility', 'visible', 'important');
    tip.style.setProperty('opacity', '1', 'important');

    positionTip(el);
  }

  function hide() {
    activeEl = null;
    tip.style.opacity = '0';
    // Delay display:none so fade works
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!activeEl) tip.style.display = 'none';
    }, 140);
  }

  function positionTip(el) {
    const r = el.getBoundingClientRect();
    const padding = 10;
    const offset = 8;

    // Default: right of icon, vertically centered
    let left = r.right + offset;
    let top = r.top + (r.height / 2);

    // Measure after text set
    tip.style.left = '0px';
    tip.style.top = '0px';
    const tr = tip.getBoundingClientRect();

    top = top - (tr.height / 2);

    // Clamp within viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (left + tr.width + padding > vw) left = r.left - tr.width - offset;
    if (left < padding) left = padding;

    if (top + tr.height + padding > vh) top = vh - tr.height - padding;
    if (top < padding) top = padding;

    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  }

  // Delegated pointer events (work well across mouse/touch/pen)
  document.addEventListener('pointerover', (e) => {
    const t = e.target;
    if (!isEl(t)) return;
    const icon = t.closest('.hde-info');
    if (!icon) return;
    showFor(icon);
  }, true);

  document.addEventListener('pointerout', (e) => {
    const t = e.target;
    if (!isEl(t)) return;
    const icon = t.closest('.hde-info');
    if (!icon) return;
    hide();
  }, true);

  // Keyboard accessibility
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (!isEl(t)) return;
    const icon = t.closest('.hde-info');
    if (!icon) return;
    showFor(icon);
  });

  document.addEventListener('focusout', (e) => {
    const t = e.target;
    if (!isEl(t)) return;
    const icon = t.closest('.hde-info');
    if (!icon) return;
    hide();
  });

  // Reposition on scroll/resize if one is open
  window.addEventListener('scroll', () => activeEl && positionTip(activeEl), { passive: true });
  window.addEventListener('resize', () => activeEl && positionTip(activeEl));
}
	
function showGlobalTooltipForEl(el, text) {
  var tip = document.getElementById("hde-global-tooltip");
  if (!tip || !el || !text) return;

  tip.textContent = text;

  // Force visibility (wins against WP/theme CSS)
  tip.style.setProperty("display", "block", "important");
  tip.style.setProperty("visibility", "visible", "important");
  tip.style.setProperty("opacity", "1", "important");

  // Position near the hovered element
  var r = el.getBoundingClientRect();
  var padding = 10;
  var offset = 8;

  // default: to the right
  tip.style.left = "0px";
  tip.style.top = "0px";
  var tr = tip.getBoundingClientRect();

  var left = r.right + offset;
  var top  = r.top + (r.height / 2) - (tr.height / 2);

  var vw = window.innerWidth;
  var vh = window.innerHeight;

  if (left + tr.width + padding > vw) left = r.left - tr.width - offset;
  if (left < padding) left = padding;

  if (top + tr.height + padding > vh) top = vh - tr.height - padding;
  if (top < padding) top = padding;

  tip.style.left = Math.round(left) + "px";
  tip.style.top  = Math.round(top) + "px";
}

function hideGlobalTooltip() {
  var tip = document.getElementById("hde-global-tooltip");
  if (!tip) return;

  tip.style.opacity = "0";
  // allow fade, then hide
  window.clearTimeout(tip.__hideTimer);
  tip.__hideTimer = window.setTimeout(function () {
    tip.style.display = "none";
  }, 140);
}

function initCategoryHoverDescriptionsOnce() {
  if (window.__hdeCategoryHoverOnce) return;
  window.__hdeCategoryHoverOnce = true;

  // Create fixed-position tooltip container (like network tooltips)
  let wrap = document.getElementById("category-desc-wrap");
  
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "category-desc-wrap";
    wrap.className = "hde-network-desc"; // reuse network tooltip styling
    document.body.appendChild(wrap);
  }

  function hide() {
    wrap.style.display = "none";
  }

  function showAt(text, x, y) {
    if (!text) return hide();

    wrap.innerHTML = `<div class="hde-network-desc__text">${text}</div>`;
    wrap.style.display = "block";
    wrap.style.left = (x + 14) + "px";
    wrap.style.top = (y + 14) + "px";

    // Adjust if off-screen
    requestAnimationFrame(() => {
      const r = wrap.getBoundingClientRect();
      const pad = 12;
      let left = x + 14;
      let top = y + 14;

      if (left + r.width > window.innerWidth - pad) {
        left = window.innerWidth - r.width - pad;
      }
      if (top + r.height > window.innerHeight - pad) {
        top = window.innerHeight - r.height - pad;
      }

      wrap.style.left = Math.max(pad, left) + "px";
      wrap.style.top = Math.max(pad, top) + "px";
    });
  }

  // Show tooltip on hover
  document.addEventListener("pointerover", function (e) {
    const t = e.target;
    if (!t || t.nodeType !== 1) return;

    const item = t.closest(".hde-cat-ui__item");
    if (!item) return;

    const value = item.getAttribute("data-value") || "";
    const meta = window.CATEGORY_META && window.CATEGORY_META[value];
    if (!meta || !meta.desc) return;

    showAt(meta.desc, e.clientX, e.clientY);
  }, true);

  // Follow cursor while hovering
  document.addEventListener("pointermove", function (e) {
    if (wrap.style.display === "none") return;
    
    const t = e.target;
    if (!t || t.nodeType !== 1) return;
    
    const item = t.closest(".hde-cat-ui__item");
    if (!item) return;

    wrap.style.left = (e.clientX + 14) + "px";
    wrap.style.top = (e.clientY + 14) + "px";
  }, true);

  // Hide when leaving item
  document.addEventListener("pointerout", function (e) {
    const t = e.target;
    if (!t || t.nodeType !== 1) return;

    const item = t.closest(".hde-cat-ui__item");
    if (!item) return;

    hide();
  }, true);

  // Hide on click
  document.addEventListener("click", function (e) {
    const t = e.target;
    if (t && t.closest(".hde-cat-ui__item")) {
      hide();
    }
  }, true);

  // Hide on scroll/resize
  window.addEventListener("scroll", hide, true);
  window.addEventListener("resize", hide);

  hide(); // start hidden
}
	
function initCategoryMultiSelect() {
  const select = document.getElementById("filter-category"); // hidden native select
  const ui = document.getElementById("cat-ui");
  const btn = document.getElementById("cat-ui-btn");
  const menu = document.getElementById("cat-ui-menu");
  const label = document.getElementById("cat-ui-label");

  if (!select || !ui || !btn || !menu || !label) return;

  // Make native select multi (even though it's hidden)
  select.multiple = true;

  // Helper: get selected values
  const getSelectedValues = () =>
    Array.from(select.options)
      .filter(o => o.value && o.selected)
      .map(o => o.value);

  // Helper: find option by value
  const getOption = (value) =>
    Array.from(select.options).find(o => o.value === value);

  // OPTIONAL: if you already have a category->color map in your code, wire it here.
  // If not, we'll gracefully fall back to a neutral dot.
 const getCatColor = (value) => {
  return (window.CATEGORY_COLORS && window.CATEGORY_COLORS[value]) 
    ? window.CATEGORY_COLORS[value]
    : "#cfcfcf";
};

function renderButtonChips() {
  const values = getSelectedValues();

  label.innerHTML = "";

  if (!values.length) {
    label.textContent = "All categories";
    return;
  }

  const count = values.length;
  if (count === 1) {
    const opt = getOption(values[0]);
    if (opt) {
      const text = opt.text;
      // ✅ Truncate long category names
      label.textContent = text.length > 28 ? text.substring(0, 25) + "..." : text;
    } else {
      label.textContent = "1 category";
    }
  } else {
    label.textContent = `${count} categories`;
  }
}
	
  // Build the menu list (with dots + selected state)
  function renderMenu() {
    menu.innerHTML = "";

    // "Clear" item
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "hde-cat-ui__item";
    clearBtn.innerHTML = `<span class="hde-cat-ui__dot" style="background:#cfcfcf"></span><span>All categories</span>`;
    clearBtn.addEventListener("click", () => {
      Array.from(select.options).forEach(o => (o.selected = false));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      renderMenu();
      renderButtonChips();
      closeMenu();
    });
    menu.appendChild(clearBtn);

    // Actual category options (skip blank)
    Array.from(select.options)
      .filter(o => o.value)
      .forEach((opt) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "hde-cat-ui__item";
        item.dataset.value = opt.value;

        // show selected state
        if (opt.selected) item.setAttribute("aria-pressed", "true");
        else item.setAttribute("aria-pressed", "false");

        const dot = getCatColor(opt.value);
        item.innerHTML = `
          <span class="hde-cat-ui__dot" style="background:${dot}"></span>
          <span>${opt.text}</span>
          <span style="margin-left:auto;opacity:${opt.selected ? "1" : "0"}">✓</span>
        `;

		  // ✅ Tooltip for category descriptions (uses CATEGORY_META)
const meta = CATEGORY_META[opt.text];
if (meta && meta.desc) {
  item.setAttribute("data-tooltip", meta.desc);
}
		  
        item.addEventListener("click", () => {
          // toggle selection
          opt.selected = !opt.selected;

          // fire change so your existing filtering logic runs
          select.dispatchEvent(new Event("change", { bubbles: true }));

          // re-render UI
          renderMenu();
          renderButtonChips();
        });

        menu.appendChild(item);
      });
  }

  // Open/close helpers
  function openMenu() {
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    renderMenu();
  }

  function closeMenu() {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }

	// Expose a helper so the global Clear Filters button can reset this UI cleanly
window.__HDE_clearCategories = function () {
  Array.from(select.options).forEach(o => (o.selected = false));
  select.dispatchEvent(new Event("change", { bubbles: true }));
  renderMenu();
  renderButtonChips();
  closeMenu();
};
	
btn.addEventListener("click", (e) => {
  const chip = e.target.closest(".hde-chip");

  // If clicking a chip, remove it and don't toggle the menu
  if (chip) {
    e.preventDefault();
    e.stopPropagation();

    const v = chip.dataset.value;
    const opt = getOption(v);
    if (!opt) return;

    opt.selected = false;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    renderMenu();
    renderButtonChips();
    return;
  }

  // Otherwise toggle menu
  e.preventDefault();
  if (menu.hidden) openMenu();
  else closeMenu();
});

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!ui.contains(e.target)) closeMenu();
  });

  // Initial render
  renderButtonChips();
  renderMenu();
  closeMenu();
}

function initStateUIOnce() {
  var sel = document.getElementById("filter-state");         // the real <select multiple>
  var ui = document.getElementById("state-ui");
  var btn = document.getElementById("state-ui-btn");
  var menu = document.getElementById("state-ui-menu");
  var label = document.getElementById("state-ui-label");

  if (!sel || !ui || !btn || !menu || !label) return;
  if (ui.dataset.ready === "1") return;
  ui.dataset.ready = "1";

  function getSelectedValues() {
    return Array.from(sel.selectedOptions || [])
      .map(o => o.value)
      .filter(Boolean);
  }

  function setSelectedValues(values) {
    var set = new Set(values || []);
    Array.from(sel.options).forEach(function (o) {
      o.selected = set.has(o.value);
    });
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function rebuildMenuAndButton() {
    menu.innerHTML = "";

    // Top row: "All states" (clears)
    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "hde-cat-ui__item";
    clearBtn.textContent = "All states";
    clearBtn.addEventListener("click", function () {
      setSelectedValues([]);
      closeMenu();
    });
    menu.appendChild(clearBtn);

    // Options with checkbox-like display
    var selected = new Set(getSelectedValues());

    Array.from(sel.options).forEach(function (opt) {
      if (!opt.value) return;

      var item = document.createElement("button");
      item.type = "button";
      item.className = "hde-cat-ui__item";
      item.innerHTML =
        '<span style="display:inline-block;width:18px;">' + (selected.has(opt.value) ? "✓" : "") + '</span>' +
        '<span>' + opt.value + '</span>';

      item.addEventListener("click", function () {
        // toggle this value
        var next = new Set(getSelectedValues());
        if (next.has(opt.value)) next.delete(opt.value);
        else next.add(opt.value);

        setSelectedValues(Array.from(next));
        // keep menu open for multi-select convenience
        rebuildMenuAndButton();
      });

      menu.appendChild(item);
    });

    // Button label summary
    var vals = getSelectedValues();
    if (!vals.length) label.textContent = "All states";
    else if (vals.length === 1) label.textContent = vals[0];
    else label.textContent = vals.length + " states selected";
  }

  function openMenu() {
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }

  btn.addEventListener("click", function () {
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  document.addEventListener("click", function (e) {
    if (!ui.contains(e.target)) closeMenu();
  });

  sel.addEventListener("change", rebuildMenuAndButton);

  rebuildMenuAndButton();
}

function initSearchableMultiSelect(opts) {
  const select = document.getElementById(opts.selectId);
  const ui     = document.getElementById(opts.uiId);
  const btn    = document.getElementById(opts.btnId);
  const menu   = document.getElementById(opts.menuId);
  const label  = document.getElementById(opts.labelId);
  const search = document.getElementById(opts.searchId);
  const list   = document.getElementById(opts.optionsId);

  if (!select || !ui || !btn || !menu || !label || !search || !list) return;
  if (ui.dataset.ready === "1") return;
  ui.dataset.ready = "1";

  select.multiple = true;

  /* ---------- helpers ---------- */

  const getSelectedValues = () =>
    Array.from(select.options)
      .filter(o => o.value && o.selected)
      .map(o => o.value);

  const getOptionByValue = (v) =>
    Array.from(select.options).find(o => o.value === v);

function renderButton() {
  const values = getSelectedValues();
  label.innerHTML = "";

  if (!values.length) {
    label.textContent = opts.placeholder || "Select…";
    return;
  }

  const maxChips = opts.maxChips ?? 3;

// ✅ COUNT-ONLY MODE (no chips)
if (maxChips === 0) {
  const count = values.length;
  
  if (count === 1) {
    const opt = getOptionByValue(values[0]);
    if (opt) {
      const text = opt.text;
      // ✅ Truncate long names (especially for networks)
      label.textContent = text.length > 28 ? text.substring(0, 25) + "..." : text;
    } else {
      label.textContent = "1 selected";
    }
  } else {
    const word = (opts.placeholder || "items").toLowerCase().replace(/^(all|select)\s*/i, "");
    label.textContent = `${count} ${word}`;
  }
  return;
}

  // ✅ CHIP MODE (existing behavior)
  const shown = values.slice(0, maxChips);
  const remaining = values.length - shown.length;

  const wrap = document.createElement("span");
  wrap.className = "hde-chipwrap";

  shown.forEach(v => {
    const opt = getOptionByValue(v);
    if (!opt) return;

    const chip = document.createElement("span");
    chip.className = "hde-chip";
    chip.dataset.value = v;
    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");
    chip.setAttribute("aria-label", `Remove ${opt.text}`);

    chip.innerHTML = `
      <span class="hde-chip__text" title="${opt.text}">${opt.text}</span>
      <span class="hde-chip__x" aria-hidden="true">×</span>
    `;
    wrap.appendChild(chip);
  });

  if (remaining > 0) {
    const more = document.createElement("span");
    more.className = "hde-chip hde-chip--more";
    more.setAttribute("aria-hidden", "true");
    more.textContent = `+${remaining}`;
    wrap.appendChild(more);
  }

  label.appendChild(wrap);
}

  /* ---------- render dropdown ---------- */

  function renderMenu() {
    const q = (search.value || "").trim().toLowerCase();
    list.innerHTML = "";

    // Clear row
const clear = document.createElement("button");
clear.type = "button";
clear.className = "hde-ms__item";
clear.dataset.value = ""; // ✅ so hover ignores it
clear.innerHTML = `<span>Clear</span><span class="hde-ms__check">✓</span>`;
    clear.addEventListener("click", () => {
      Array.from(select.options).forEach(o => (o.selected = false));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      renderMenu();
      renderButton();
    });
    list.appendChild(clear);

    // Options
    Array.from(select.options)
      .filter(o => o.value)
      .filter(o => !q || o.text.toLowerCase().includes(q))
      .forEach(opt => {
        const item = document.createElement("button");
item.type = "button";
item.className = "hde-ms__item";
item.dataset.value = opt.value; // ✅ THIS is the key
item.setAttribute("aria-pressed", opt.selected ? "true" : "false");
		  
item.innerHTML = `
  <span>${opt.text}</span>
  <span class="hde-ms__check">✓</span>
`;

        item.addEventListener("click", () => {
          opt.selected = !opt.selected;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          renderMenu();
          renderButton();
        });

        list.appendChild(item);
      });
  }

  /* ---------- open / close ---------- */

  function openMenu() {
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    search.value = "";
    renderMenu();
    search.focus();
  }

  function closeMenu() {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }

  /* ---------- events ---------- */

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    menu.hidden ? openMenu() : closeMenu();
  });

  search.addEventListener("input", renderMenu);

  document.addEventListener("click", (e) => {
    if (!ui.contains(e.target)) closeMenu();
  });

  select.addEventListener("change", renderButton);

label.addEventListener("click", function (e) {
  const chip = e.target.closest(".hde-chip");
  if (!chip) return;

  // ignore the +N chip
  if (chip.classList.contains("hde-chip--more")) return;

  e.preventDefault();
  e.stopPropagation();

  const v = chip.dataset.value;
  if (!v) return;

  const opt = Array.from(select.options).find(o => o.value === v);
  if (!opt) return;

  opt.selected = false;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  renderMenu();
  renderButton();
});	
	
  /* ---------- initial ---------- */

  renderButton();
  closeMenu();

  // allow external refresh after option rebuilds
  ui.__rerender = () => {
    renderMenu();
    renderButton();
  };
}
	
	function splitNetworks(raw) {
  // Handles: "Network A, Network B" or "Network A; Network B"
  if (!raw) return [];
  return String(raw)
    .split(/[,;]\s*/)
    .map(s => s.trim())
    .filter(Boolean);
}

// Builds the same filter as buildFilterExpression() BUT WITHOUT network constraints
function buildFilterExpressionNoNetwork() {
var cats = [];
if (categorySelect) {
  cats = Array.from(categorySelect.selectedOptions || [])
    .map(o => o.value)
    .filter(Boolean);
}
var states = [];
if (stateSelect) {
  states = Array.from(stateSelect.selectedOptions || [])
    .map(function (o) { return String(o.value || "").trim(); })
    .filter(Boolean);
}
	var q   = searchInput ? searchInput.value.trim().toLowerCase() : "";

  var expr = ["all"];

if (cats.length) {
  var anyCat = ["any"];
  cats.forEach(function (c) {
    anyCat.push(["==", ["get", FIELD_CATEGORY], c]);
  });
  expr.push(anyCat);
}
	if (states.length) {
  var stField = ["to-string", ["coalesce", ["get", FIELD_STATE], ""]];
  var anySt = ["any"];
  states.forEach(function (s) {
    anySt.push(["==", stField, s]);
  });
  expr.push(anySt);
}
  if (q) {
    var nameExpr    = ["downcase", ["coalesce", ["get", "Name"], ["get", "\uFEFFName"], ["get", "Organization Full Name"], ""]];
    var cityExpr    = ["downcase", ["coalesce", ["get", "City"], ""]];
    var catExpr     = ["downcase", ["coalesce", ["get", FIELD_CATEGORY], ""]];
    var stateExpr   = ["downcase", ["coalesce", ["get", FIELD_STATE], ""]];
    var missionExpr = ["downcase", ["coalesce", ["get", "Mission/Description"], ["get", "Mission"], ["get", "Description"], ""]];

    expr.push(["any",
      ["in", q, nameExpr],
      ["in", q, cityExpr],
      ["in", q, catExpr],
      ["in", q, stateExpr],
      ["in", q, missionExpr]
    ]);
  }

  return expr;
}

function featureMatchesNoNetwork(f) {
  var p = (f && f.properties) ? f.properties : {};

  // Categories (multi)
  var cats = [];
  if (categorySelect) {
    cats = Array.from(categorySelect.selectedOptions || [])
      .map(o => String(o.value || "").trim())
      .filter(Boolean);
  }

  // States (multi)  ✅ FIX: you were using stateSelect.value (single)
  var states = [];
  if (stateSelect) {
    states = Array.from(stateSelect.selectedOptions || [])
      .map(o => String(o.value || "").trim())
      .filter(Boolean);
  }

  // Search
  var q = searchInput ? searchInput.value.trim().toLowerCase() : "";

  // Category filter
  if (cats.length) {
    var fcat = String(p[FIELD_CATEGORY] || "").trim();
    if (cats.indexOf(fcat) === -1) return false;
  }

  // State filter (ANY selected state)
  if (states.length) {
    var fst = String(p[FIELD_STATE] || "").trim();
    if (states.indexOf(fst) === -1) return false;
  }

  // Text search
  if (q) {
    var name    = (safeText(p["Name"]) || safeText(p["\uFEFFName"]) || safeText(p["Organization Full Name"]) || "").toLowerCase();
    var city    = (safeText(p["City"]) || "").toLowerCase();
    var catTxt  = (safeText(p[FIELD_CATEGORY]) || "").toLowerCase();
    var stTxt   = (safeText(p[FIELD_STATE]) || "").toLowerCase();
    var mission = (safeText(p["Mission/Description"]) || safeText(p["Mission"]) || safeText(p["Description"]) || "").toLowerCase();

    if (
      !name.includes(q) &&
      !city.includes(q) &&
      !catTxt.includes(q) &&
      !stTxt.includes(q) &&
      !mission.includes(q)
    ) return false;
  }

  return true;
}

function rebuildNetworkOptionsDynamic() {
  // --- selects ---
  var nationalSel = document.getElementById("filter-network-national");
  var localSel    = document.getElementById("filter-network-local");
  if (!nationalSel && !localSel) return;

  // --- preserve current selections across both ---
  var selected = new Set();
  if (nationalSel) {
    Array.from(nationalSel.selectedOptions || []).forEach(function (o) {
      if (o && o.value) selected.add(o.value);
    });
  }
  if (localSel) {
    Array.from(localSel.selectedOptions || []).forEach(function (o) {
      if (o && o.value) selected.add(o.value);
    });
  }

  // --- index must exist ---
  var idx = window.ORG_INDEX;
  if (!idx || !Array.isArray(idx.records)) return;

  // --- count networks across records matching filters EXCEPT network filters ---
  var counts = new Map(); // networkName -> count

  for (var i = 0; i < idx.records.length; i++) {
    var rec = idx.records[i];
    if (!recordMatchesFiltersNoNetwork(rec)) continue;

    var nets = Array.isArray(rec.networks) ? rec.networks : [];
    for (var j = 0; j < nets.length; j++) {
      var name = String(nets[j] || "").trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }

  // --- meta is FLAT: { "Network Name": { Geography: "National" | "Regional/Local", Description, Website, ... }, ... }
  var meta = window.NETWORK_META || {};
  var hasMeta = meta && Object.keys(meta).length > 0;

  // Case/trim-insensitive lookup so names don't mismatch
  var metaLookup = null;
  if (hasMeta) {
    metaLookup = {};
    Object.keys(meta).forEach(function (k) {
      metaLookup[String(k || "").trim().toLowerCase()] = meta[k];
    });
  }

  function getMetaFor(networkName) {
    if (!metaLookup) return null;
    return metaLookup[String(networkName || "").trim().toLowerCase()] || null;
  }

  // --- networks present in the index for the current non-network filters ---
  var allNames = Array.from(counts.keys());

  // If meta exists, treat it as the allowlist (your sheet is already curated)
  if (hasMeta) {
    allNames = allNames.filter(function (n) {
      return !!getMetaFor(n);
    });
  }

  // --- split into national vs local/regional using Geography ---
  var nationalNames = [];
  var localNames = [];

  allNames.forEach(function (name) {
    var m = getMetaFor(name) || {};
    var geo = String(m.Geography || m.geography || "").toLowerCase().trim();

    // "National" -> national; everything else -> local/regional
    var isNational = (geo === "national") || (geo.indexOf("national") !== -1);

    if (isNational) nationalNames.push(name);
    else localNames.push(name);
  });

  // --- sort ---
  nationalNames.sort(function (a, b) { return String(a).localeCompare(String(b)); });
  localNames.sort(function (a, b) { return String(a).localeCompare(String(b)); });

  function buildOptions(sel, names) {
    if (!sel) return;

    sel.innerHTML = "";

    names.forEach(function (name) {
      var count = counts.get(name) || 0;
      var m = getMetaFor(name) || {};

      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name + " (" + count + ")";

      // tooltip
      if (m.Description) opt.title = String(m.Description);
      else if (m.description) opt.title = String(m.description);

      if (selected.has(name)) opt.selected = true;

      sel.appendChild(opt);
    });

    // Avoid accidental auto-select
    if (selected.size === 0) {
      Array.from(sel.options).forEach(function (o) { o.selected = false; });
      sel.selectedIndex = -1;
    }
  }

  buildOptions(nationalSel, nationalNames);
  buildOptions(localSel, localNames);
}

window.rebuildNetworkOptionsDynamic = rebuildNetworkOptionsDynamic;

function whenExists(id, cb, tries = 50) {
  const el = document.getElementById(id);
  if (el) return cb(el);
  if (tries <= 0) return;
  setTimeout(() => whenExists(id, cb, tries - 1), 50);
}	
	
function loadNetworkMetaOnce() {
  if (window.__hdNetworkMetaLoaded) return;
  window.__hdNetworkMetaLoaded = true;

  fetch("https://cdn.jsdelivr.net/gh/annacncl/healthy-democracy-map@main/networks_meta.json")
    .then(r => r.json())
    .then(data => {
      window.NETWORK_META = data || {};

      console.log(
        "✅ NETWORK META LOADED",
        Object.keys(window.NETWORK_META || {}).length
      );

      // Rebuild network dropdown options (counts + labels)
      if (typeof window.rebuildNetworkOptionsDynamic === "function") {
        window.rebuildNetworkOptionsDynamic();
      }

      // Re-render custom dropdowns if they exist
      const natUI = document.getElementById("network-national-ui");
      const locUI = document.getElementById("network-local-ui");
      if (natUI && natUI.__rerender) natUI.__rerender();
      if (locUI && locUI.__rerender) locUI.__rerender();

      // ✅ ONLY init hover AFTER:
      // 1) meta exists
      // 2) option containers exist
      whenExists("network-national-options", () => {
        whenExists("network-local-options", () => {
          window.__hdeNetHoverDescInit = false;
          if (typeof window.initNetworkHoverDescriptionOnce === "function") {
            window.initNetworkHoverDescriptionOnce();
          }
        });
      });
    })
    .catch(err =>
      console.warn("networks_meta_from_csv.json fetch failed", err)
    );
}
		
function initNetworkHoverDescriptionOnce() {
  if (window.__hdeNetHoverDescInit) return;
  window.__hdeNetHoverDescInit = true;

  const wrap = document.getElementById("network-desc-wrap");
  const box  = document.getElementById("network-desc");
  if (!wrap || !box) return;

  // ensure tooltip escapes transformed parents
  if (wrap.parentElement !== document.body) {
    document.body.appendChild(wrap);
  }
  wrap.style.position = "fixed";
  wrap.style.transform = "none";
  wrap.style.margin = "0";

// Build meta lookup once (from current NETWORK_META)
const __metaRaw = window.NETWORK_META || {};
const __metaLookup = Object.create(null);

// normalize helper: collapse whitespace + trim + lowercase
const norm = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

Object.keys(__metaRaw).forEach((k) => {
  __metaLookup[norm(k)] = __metaRaw[k];
});

function getMeta(name) {
  const key = norm(name);
  return key ? (__metaLookup[key] || null) : null;
}

function hide() {
  // strong hide (wins against non-!important CSS)
  wrap.style.setProperty("display", "none", "important");
  box.innerHTML = "";
}

function showAt(name, x, y) {
  const m = getMeta(name);

  // include m.desc in fallback ✅
  const descRaw = m && (m.Description || m.description || m.desc || "");
  const desc = String(descRaw || "").trim();

  if (!desc) return hide();

  box.innerHTML = `
    <div class="hde-network-desc__item">
      <strong>${name}</strong>
      <div class="hde-network-desc__text">${desc}</div>
    </div>
  `;

  let left = x + 14;
  let top  = y + 14;

  // force visible (wins against most theme rules)
  wrap.style.setProperty("display", "block", "important");
  wrap.style.left = left + "px";
  wrap.style.top  = top + "px";

  requestAnimationFrame(() => {
    const r = wrap.getBoundingClientRect();
    const pad = 12;

    if (left + r.width > window.innerWidth - pad) left = window.innerWidth - r.width - pad;
    if (top + r.height > window.innerHeight - pad) top = window.innerHeight - r.height - pad;

    wrap.style.left = Math.max(pad, left) + "px";
    wrap.style.top  = Math.max(pad, top) + "px";
  });
}

function bind(optionsContainerId) {
  const container = document.getElementById(optionsContainerId);
  if (!container) return;

  let lastName = "";

  // Show when entering an item (less flicker than pointermove-only)
  container.addEventListener("pointerover", (e) => {
    const t = e.target;
    if (!t || t.nodeType !== 1) return;

    const item = t.closest(".hde-ms__item");
    if (!item) return; // don't hide between rows

    const name = (item.dataset.value || "").trim();
    if (!name) return; // ignore "Clear"

    lastName = name;
    showAt(name, e.clientX, e.clientY);
  }, true);

  // Track cursor position while open
  container.addEventListener("pointermove", (e) => {
    // if hidden, ignore
    if (getComputedStyle(wrap).display === "none") return;
    wrap.style.left = (e.clientX + 14) + "px";
    wrap.style.top  = (e.clientY + 14) + "px";
  }, true);

  // Hide only when leaving the whole list
  container.addEventListener("pointerleave", () => {
    lastName = "";
    hide();
  }, true);

  // Hide on click (select)
  container.addEventListener("click", () => {
    lastName = "";
    hide();
  }, true);
}

// ✅ KEEP THESE CALLS
bind("network-national-options");
bind("network-local-options");

// ✅ KEEP THESE GLOBAL HIDES
window.addEventListener("scroll", hide, true);
window.addEventListener("resize", hide);

// ✅ start hidden
hide();
}

window.initNetworkHoverDescriptionOnce = initNetworkHoverDescriptionOnce;
	
	// ---- Attach click + cursor handlers ONCE ----
 function attachMapHandlersOnce() {
  if (window.__hdePopupHandlersAttached) return;
  window.__hdePopupHandlersAttached = true;

  map.on("click", function (e) {
    var features = map.queryRenderedFeatures(e.point, { layers: [LAYER_ID] }) || [];

    // ✅ CLICKED EMPTY MAP → CLOSE POPUP
    if (!features.length) {
      if (window.activePopup) {
        window.activePopup.remove();
        window.activePopup = null;
      }
      return;
    }

    // ✅ CLICKED FEATURE → OPEN POPUP
    openPopup(e.lngLat, features[0].properties || {});
  });

  map.on("mousemove", function (e) {
    var features = map.queryRenderedFeatures(e.point, { layers: [LAYER_ID] }) || [];
    map.getCanvas().style.cursor = features.length ? "pointer" : "";
  });
}

  // ---- Startup ----
  map.on("error", function (e) {
    console.log("MAPBOX ERROR:", e && (e.error || e));
  });

 map.on("load", function () {
  console.log("HD MAP LOADED ✅");
  loadOrgIndexOnce();
	 loadNetworkMetaOnce();
	 
  var tries = 0;
  var timer = setInterval(function () {
    tries++;

    if (map.getLayer(LAYER_ID)) {
      clearInterval(timer);
		
		populateDropdownsOnce();
		rebuildNetworkOptionsDynamic();

// // Build the custom dropdown UIs (these create the -options containers)
	initSearchableMultiSelect({
  selectId: "filter-network-national",
  uiId: "network-national-ui",
  btnId: "network-national-btn",
  menuId: "network-national-menu",
  labelId: "network-national-label",
  searchId: "network-national-search",
  optionsId: "network-national-options",
  placeholder: "National networks",
  maxChips: 0
});
initSearchableMultiSelect({
  selectId: "filter-network-local",
  uiId: "network-local-ui",
  btnId: "network-local-btn",
  menuId: "network-local-menu",
  labelId: "network-local-label",
  searchId: "network-local-search",
  optionsId: "network-local-options",
  placeholder: "Local / Regional networks",
  maxChips: 0
});
initSearchableMultiSelect({
  selectId: "filter-state",
  uiId: "state-ui",
  btnId: "state-btn",
  menuId: "state-menu",
  labelId: "state-label",
  searchId: "state-search",
  optionsId: "state-options",
  placeholder: "All states",
  maxChips: 0
});
initNetworkHoverDescriptionOnce();
initCategoryMultiSelect();
updateNetworkStat();
attachMapHandlersOnce();

      applyFilters();
      renderListFromMap();

map.on("moveend", renderListFromMap);

// CATEGORY
if (categorySelect) {
  categorySelect.addEventListener("change", function () {
    applyFilters();
  });
}

// STATE (multi-select)
if (stateSelect) {
  stateSelect.addEventListener("change", function () {
    var selectedStates = Array.from(stateSelect.selectedOptions || [])
      .map(function (o) { return o.value; })
      .filter(Boolean);

    applyFilters();

    // If one or more states: fit to combined bounds
    if (selectedStates.length) zoomToStates(selectedStates);
  });
}

// NETWORKS (render list AFTER filters apply)
if (networkSelectNational) {
  networkSelectNational.addEventListener("change", function () {
    applyFilters();
    map.once("idle", function () {
      renderListFromMap();
    });
  });
}

if (networkSelectLocal) {
  networkSelectLocal.addEventListener("change", function () {
    applyFilters();
    map.once("idle", function () {
      renderListFromMap();
    });
  });
}

// SEARCH
if (searchInput) {
  searchInput.addEventListener("input", function () {
    applyFilters();
  });
}

// CLEAR
if (clearButton) {
  clearButton.addEventListener("click", function () {

    // Category: use the custom clear hook if it exists (keeps UI in sync)
    if (window.__HDE_clearCategories) {
      window.__HDE_clearCategories();
    } else {
      clearNativeMultiSelect(categorySelect);
    }

    // State + Networks: clear native selects and trigger UI refresh
    clearNativeMultiSelect(stateSelect);
    clearNativeMultiSelect(networkSelectNational);
    clearNativeMultiSelect(networkSelectLocal);

    // Search: clear + trigger any listeners
    if (searchInput) {
      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Close popup on clear
    if (window.activePopup) {
      window.activePopup.remove();
      window.activePopup = null;
    }

    applyFilters();
    map.flyTo({ center: [-98.5, 39.8], zoom: 3, speed: 0.8 });
  });
}

      map.resize();
      setTimeout(function(){ map.resize(); }, 250);
      setTimeout(function(){ map.resize(); }, 1000);

      return;
    }

    if (tries > 60) {
      clearInterval(timer);
      console.warn("Mapbox layer not found:", LAYER_ID);
    }
  }, 100);
});

// 🔧 FORCE MAPBOX TO RESIZE AFTER MOBILE LAYOUT CHANGES
window.addEventListener("orientationchange", function () {
  setTimeout(function () {
    map.resize();
  }, 300);
});

window.addEventListener("resize", function () {
  map.resize();
});

	// Disable legacy tooltip nodes so only data-tooltip (::after) is used
(() => {
  const kill = () => {
	  const ids = ['hde-global-tooltip'];
	  ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  };

  kill();
  new MutationObserver(kill).observe(document.body, { childList: true, subtree: true });
})();
})();
