const form = document.getElementById("createRecipeForm");
const ingredientsContainer = document.getElementById("ingredientsContainer");
const addIngredientBtn = document.getElementById("addIngredientBtn");
const message = document.getElementById("message");

// API base (can be overridden by setting localStorage.apiBase)
const API_BASE = (() => {
  try {
    const stored = localStorage.getItem("apiBase");
    if (!stored) return "http://localhost:4000";
    if (stored.includes(":3000")) return "http://localhost:4000";
    return stored;
  } catch (e) {
    return "http://localhost:4000";
  }
})();

// parse id from ?id=<mongoId>
const params = new URLSearchParams(window.location.search);
const recipeId = params.get("id");

// ---------- helpers ----------
function setMessage(text, ok = false) {
  message.textContent = text;
  message.className = ok ? "success-text" : "error-text";
  if (!text) message.className = "";
}

function ensureErrorEl(inputEl) {
  const next = inputEl.nextElementSibling;
  if (next && next.classList.contains("error-text")) return next;

  const err = document.createElement("div");
  err.className = "error-text";
  err.style.display = "none";
  inputEl.insertAdjacentElement("afterend", err);
  return err;
}

function showError(inputEl, msg) {
  inputEl.classList.add("field-error");
  const err = ensureErrorEl(inputEl);
  err.textContent = msg;
  err.style.display = "block";
}

function clearError(inputEl) {
  inputEl.classList.remove("field-error");
  const next = inputEl.nextElementSibling;
  if (next && next.classList.contains("error-text")) {
    next.textContent = "";
    next.style.display = "none";
  }
}

function isPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function isNonNegativeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

// ---------- Ingredient UI ----------
function createIngredientRow(initial = {}) {
  const row = document.createElement("div");
  row.className = "ingredient-row";

  row.innerHTML = `
    <div class="ing-col">
      <input type="text" class="ing-name" placeholder="Ingredient name" />
    </div>
    <div class="ing-col">
      <input type="number" class="ing-qty" placeholder="Qty" min="0" step="0.01" />
    </div>
    <div class="ing-col">
      <input type="text" class="ing-unit" placeholder="Unit (e.g., g, cups)" />
    </div>
    <button type="button" class="remove-btn">Remove</button>
  `;

  const nameInp = row.querySelector(".ing-name");
  const qtyInp = row.querySelector(".ing-qty");
  const unitInp = row.querySelector(".ing-unit");

  if (initial.name) nameInp.value = initial.name;
  if (initial.quantity !== undefined) qtyInp.value = initial.quantity;
  if (initial.unit) unitInp.value = initial.unit;

  row.querySelector(".remove-btn").addEventListener("click", () => {
    row.remove();
    setMessage("");
  });

  row.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", () => clearError(inp));
    inp.addEventListener("blur", () => validateIngredientRow(row));
  });

  return row;
}

function addIngredientRow(initial) {
  ingredientsContainer.appendChild(createIngredientRow(initial));
}

addIngredientBtn.addEventListener("click", () => {
  addIngredientRow();
  setMessage("");
});

// ---------- Validation ----------
function validateRecipeName() {
  const el = document.getElementById("recipeName");
  const v = el.value.trim();
  if (!v) {
    showError(el, "Recipe name is required.");
    return false;
  }
  clearError(el);
  return true;
}

function validatePrepTime() {
  const el = document.getElementById("prepTime");
  const v = el.value;

  if (!v) {
    showError(el, "Preparation time is required.");
    return false;
  }
  if (!isPositiveNumber(v)) {
    showError(el, "Preparation time must be a positive number.");
    return false;
  }
  clearError(el);
  return true;
}

function validatePrepSteps() {
  const el = document.getElementById("prepSteps");
  const v = el.value.trim();
  if (!v) {
    showError(el, "Preparation steps are required.");
    return false;
  }
  clearError(el);
  return true;
}

function validateCost() {
  const el = document.getElementById("cost");
  const v = el.value.trim();

  if (v === "") {
    clearError(el);
    return true;
  }
  if (!isNonNegativeNumber(v)) {
    showError(el, "Cost must be a valid non-negative number.");
    return false;
  }
  clearError(el);
  return true;
}

function validateIngredientRow(row) {
  const nameEl = row.querySelector(".ing-name");
  const qtyEl = row.querySelector(".ing-qty");
  const unitEl = row.querySelector(".ing-unit");

  const name = nameEl.value.trim();
  const qty = qtyEl.value.trim();
  const unit = unitEl.value.trim();

  let ok = true;

  if (!name) {
    showError(nameEl, "Ingredient name is required.");
    ok = false;
  } else {
    clearError(nameEl);
  }

  if (!qty) {
    showError(qtyEl, "Quantity is required.");
    ok = false;
  } else if (!isPositiveNumber(qty)) {
    showError(qtyEl, "Quantity must be a positive number.");
    ok = false;
  } else {
    clearError(qtyEl);
  }

  if (!unit) {
    showError(unitEl, "Unit is required.");
    ok = false;
  } else {
    clearError(unitEl);
  }

  return ok;
}

function validateIngredientsSection() {
  const rows = ingredientsContainer.querySelectorAll(".ingredient-row");
  if (rows.length === 0) {
    setMessage("At least one ingredient is required.", false);
    return false;
  }

  let allOk = true;
  rows.forEach((row) => {
    const rowOk = validateIngredientRow(row);
    if (!rowOk) allOk = false;
  });

  if (!allOk) setMessage("Please fix ingredient errors.", false);
  return allOk;
}

// Clear error messages once the user corrects inputs
["recipeName", "prepTime", "prepSteps", "cost"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", () => {
    clearError(el);
    setMessage("");
  });
});

document.getElementById("recipeName").addEventListener("blur", validateRecipeName);
document.getElementById("prepTime").addEventListener("blur", validatePrepTime);
document.getElementById("prepSteps").addEventListener("blur", validatePrepSteps);
document.getElementById("cost").addEventListener("blur", validateCost);

// ---------- Fetch & Prefill ----------
async function fetchAndPrefill() {
  if (!recipeId) {
    setMessage("Missing recipe id in URL. Use ?id=<recipeId>", false);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/recipes/${recipeId}`);
    if (res.status === 404) {
      setMessage("Recipe not found.", false);
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMessage(j.error || "Failed to load recipe.", false);
      return;
    }

    const j = await res.json();
    const r = j.data;
    if (!r) {
      setMessage("Malformed recipe data.", false);
      return;
    }

    document.getElementById("recipeName").value = r.name ?? "";
    document.getElementById("prepTime").value = r.prepTime ?? "";
    document.getElementById("prepSteps").value = r.steps ?? "";
    document.getElementById("cost").value = r.cost ?? "";

    // clear default rows and fill with recipe ingredients
    ingredientsContainer.innerHTML = "";
    (r.ingredients || []).forEach((ing) => addIngredientRow({ name: ing.name, quantity: ing.quantity, unit: ing.unit }));

    setMessage("");
  } catch (err) {
    console.error(err);
    setMessage("Server error while loading recipe.", false);
  }
}

// ---------- Submit (PUT) ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage("");

  const okName = validateRecipeName();
  const okIngs = validateIngredientsSection();
  const okTime = validatePrepTime();
  const okSteps = validatePrepSteps();
  const okCost = validateCost();

  const allOk = okName && okIngs && okTime && okSteps && okCost;
  if (!allOk) return;

  // collect payload
  const name = document.getElementById("recipeName").value.trim();
  const prepTime = Number(document.getElementById("prepTime").value);
  const steps = document.getElementById("prepSteps").value.trim();
  const costVal = document.getElementById("cost").value.trim();
  const cost = costVal === "" ? null : Number(costVal);

  const rows = ingredientsContainer.querySelectorAll(".ingredient-row");
  const ingredients = Array.from(rows).map((row) => ({
    name: row.querySelector(".ing-name").value.trim(),
    quantity: Number(row.querySelector(".ing-qty").value),
    unit: row.querySelector(".ing-unit").value.trim(),
  }));

  try {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/recipes/${recipeId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ name, ingredients, prepTime, steps, cost }),
    });

    const j = await res.json().catch(() => ({}));

    if (res.status === 404) {
      setMessage(j.error || "Recipe not found.", false);
      return;
    }

    if (res.status === 400) {
      setMessage(j.error || "Invalid input.", false);
      return;
    }

    if (!res.ok) {
      setMessage(j.error || "Failed to update recipe.", false);
      return;
    }

    setMessage(j.message || "Recipe updated successfully.", true);

  } catch (err) {
    console.error(err);
    setMessage("Server error while updating recipe.", false);
  }
});

// Initialize
// Start with 0 rows; prefill will add
fetchAndPrefill();
