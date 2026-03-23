// frontend/mealPlan.js
const BASE_URL = "http://localhost:4000";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

// ── State ──
let currentWeekOffset = 0;
let mealPlanData = {}; // "Monday|breakfast" -> entry
let pendingSlot = null;

// ── DOM ──
const gridHeader  = document.getElementById("gridHeader");
const gridBody    = document.getElementById("gridBody");
const weekLabel   = document.getElementById("weekLabel");
const toast       = document.getElementById("toast");
const modal       = document.getElementById("addMealModal");
const modalLabel  = document.getElementById("modalSlotLabel");
const recipeSelect = document.getElementById("recipeSelect");
const confirmBtn  = document.getElementById("confirmAdd");
const cancelBtn   = document.getElementById("cancelModal");
const msgEl       = document.getElementById("msg");
const errorMsgEl  = document.getElementById("errorMsg");

// ── Get userId from localStorage (set during login) ──
function getUserId() {
  return localStorage.getItem("userId");
}

// ── Week helpers ──
function getWeekId(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7) + 1;
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function getWeekStartDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d;
}

function formatWeekLabel(offset) {
  const start = getWeekStartDate(offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}, ${start.getFullYear()}`;
}

// ── Render grid (always shows days/meal types, even with no data) ──
function renderGrid() {
  weekLabel.textContent = formatWeekLabel(currentWeekOffset);

  // Header row
  gridHeader.innerHTML = '<th class="row-label"></th>';
  for (const day of DAYS) {
    const th = document.createElement("th");
    th.textContent = day;
    gridHeader.appendChild(th);
  }

  // Body rows
  gridBody.innerHTML = "";
  for (const mealType of MEAL_TYPES) {
    const tr = document.createElement("tr");

    const rowHeader = document.createElement("td");
    rowHeader.className = "row-label";
    rowHeader.textContent = mealType.charAt(0).toUpperCase() + mealType.slice(1);
    tr.appendChild(rowHeader);

    for (const day of DAYS) {
      const td = document.createElement("td");
      const inner = document.createElement("div");
      inner.className = "cell-inner";

      const entry = mealPlanData[`${day}|${mealType}`];
      if (entry) {
        const chip = document.createElement("div");
        chip.className = "recipe-chip";
        chip.innerHTML = `
          <span>${escapeHtml(entry.recipe.name)}</span>
          <button title="Remove" aria-label="Remove meal">✕</button>
        `;
        chip.querySelector("button").addEventListener("click", () => removeEntry(entry._id));
        inner.appendChild(chip);
      } else {
        const addBtn = document.createElement("button");
        addBtn.className = "add-btn";
        addBtn.textContent = "+ Add";
        addBtn.addEventListener("click", () => openModal(day, mealType));
        inner.appendChild(addBtn);
      }

      td.appendChild(inner);
      tr.appendChild(td);
    }

    gridBody.appendChild(tr);
  }
}

// ── Load meal plan from backend ──
async function loadMealPlan() {
  const userId = getUserId();
  if (!userId) {
    errorMsgEl.textContent = "Not logged in. Please log in first.";
    renderGrid(); // still render the empty grid
    return;
  }

  try {
    const weekId = getWeekId(currentWeekOffset);
    const res = await fetch(`${BASE_URL}/meal-plan?userId=${userId}&weekId=${weekId}`);
    const data = await res.json();

    mealPlanData = {};
    if (data.success) {
      for (const entry of data.data) {
        mealPlanData[`${entry.day}|${entry.mealType}`] = entry;
      }
    }
  } catch (err) {
    errorMsgEl.textContent = "Could not reach backend. Showing empty grid.";
  }

  renderGrid();
}

// ── Load saved recipes into dropdown ──
async function loadRecipes() {
  try {
    const res = await fetch(`${BASE_URL}/recipes`);
    const data = await res.json();
    const recipes = data.data || [];

    recipeSelect.innerHTML = '<option value="">-- Select recipe --</option>';
    for (const r of recipes) {
      const opt = document.createElement("option");
      opt.value = r._id;
      opt.textContent = r.name;
      recipeSelect.appendChild(opt);
    }
  } catch (err) {
    console.error("Could not load recipes:", err);
  }
}

// ── Modal ──
function openModal(day, mealType) {
  pendingSlot = { day, mealType };
  modalLabel.textContent = `${day} · ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`;
  recipeSelect.value = "";
  modal.showModal();
}

cancelBtn.addEventListener("click", () => {
  modal.close();
  pendingSlot = null;
});

confirmBtn.addEventListener("click", async () => {
  const recipeId = recipeSelect.value;
  if (!recipeId) {
    showToast("Please select a recipe.", true);
    return;
  }

  const userId = getUserId();
  if (!userId) {
    showToast("Not logged in.", true);
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/meal-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        recipeId,
        day: pendingSlot.day,
        mealType: pendingSlot.mealType,
        weekId: getWeekId(currentWeekOffset),
      }),
    });
    const data = await res.json();
    modal.close();
    pendingSlot = null;

    if (data.success) {
      showToast(data.message);
      await loadMealPlan();
    } else {
      showToast(data.error, true);
    }
  } catch (err) {
    showToast("Could not reach backend.", true);
  }
});

// ── Remove entry ──
async function removeEntry(entryId) {
  if (!confirm("Remove this meal from your plan?")) return;
  try {
    const res = await fetch(`${BASE_URL}/meal-plan/${entryId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      await loadMealPlan();
    } else {
      showToast(data.error, true);
    }
  } catch (err) {
    showToast("Could not reach backend.", true);
  }
}

// ── Week navigation ──
document.getElementById("prevWeek").addEventListener("click", () => {
  currentWeekOffset--;
  mealPlanData = {};
  loadMealPlan();
});
document.getElementById("nextWeek").addEventListener("click", () => {
  currentWeekOffset++;
  mealPlanData = {};
  loadMealPlan();
});

// ── Toast ──
let toastTimer = null;
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3500);
}

// ── Utility ──
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Init — render grid immediately, then fetch data ──
renderGrid(); // shows the grid skeleton right away
loadRecipes();
loadMealPlan();