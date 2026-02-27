const form = document.getElementById("createRecipeForm");
const ingredientsContainer = document.getElementById("ingredientsContainer");
const addIngredientBtn = document.getElementById("addIngredientBtn");
const message = document.getElementById("message");

// ---------- helpers ----------
function setMessage(text, ok = false) {
  message.textContent = text;
  message.className = ok ? "success-text" : "error-text";
  if (!text) message.className = "";
}

function ensureErrorEl(inputEl) {
  // error message element placed right after the input/textarea
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
function createIngredientRow() {
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

  row.querySelector(".remove-btn").addEventListener("click", () => {
    row.remove();
    // If user removes and fixes, clear top message
    setMessage("");
  });

  // Clear inline errors as user types
  row.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", () => clearError(inp));
    inp.addEventListener("blur", () => validateIngredientRow(row)); // optional live validation
  });

  return row;
}

function addIngredientRow() {
  ingredientsContainer.appendChild(createIngredientRow());
}

addIngredientBtn.addEventListener("click", () => {
  addIngredientRow();
  setMessage("");
});

// Start with 1 row
addIngredientRow();

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

  // cost is optional
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

  // Each ingredient must have a name
  if (!name) {
    showError(nameEl, "Ingredient name is required.");
    ok = false;
  } else {
    clearError(nameEl);
  }

  // Each ingredient must have a quantity
  if (!qty) {
    showError(qtyEl, "Quantity is required.");
    ok = false;
  } else if (!isPositiveNumber(qty)) {
    showError(qtyEl, "Quantity must be a positive number.");
    ok = false;
  } else {
    clearError(qtyEl);
  }

  // Unit must not be empty (your issue says if included; since we include it, require it)
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

// Optional: validate on blur for nicer UX
document.getElementById("recipeName").addEventListener("blur", validateRecipeName);
document.getElementById("prepTime").addEventListener("blur", validatePrepTime);
document.getElementById("prepSteps").addEventListener("blur", validatePrepSteps);
document.getElementById("cost").addEventListener("blur", validateCost);

// ---------- Submit ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  setMessage("");

  const okName = validateRecipeName();
  const okIngs = validateIngredientsSection();
  const okTime = validatePrepTime();
  const okSteps = validatePrepSteps();
  const okCost = validateCost();

  const allOk = okName && okIngs && okTime && okSteps && okCost;

  if (!allOk) {
    // Prevent submission
    return;
  }

  // Still frontend-only; backend later
  setMessage("✅ Form is valid (client-side). Ready for backend integration.", true);
});