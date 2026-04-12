// frontend/mealPlan.js
const API_BASE_CANDIDATES = Array.from(
    new Set([
      'http://127.0.0.1:4000',
      'http://localhost:4000',
      'http://localhost:4001',
      'http://127.0.0.1:4001',
    ]),
);
let activeApiBase = API_BASE_CANDIDATES[0];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

async function fetchWithApiFallback(path, options = {}) {
  const orderedBases = [
    activeApiBase,
    ...API_BASE_CANDIDATES.filter((base) => base !== activeApiBase),
  ];

  let lastNetworkError = null;
  let lastHttpResponse = null;
  for (const base of orderedBases) {
    try {
      const res = await fetch(`${base}${path}`, options);

      // If we hit a static file server (or wrong host), try the next candidate.
      if (res.status === 404 || res.status === 405) {
        lastHttpResponse = res;
        continue;
      }

      activeApiBase = base;
      return res;
    } catch (err) {
      lastNetworkError = err;
    }
  }

  if (lastHttpResponse) {
    return lastHttpResponse;
  }

  throw lastNetworkError || new Error('Backend is unreachable.');
}

// ── State ──
let currentWeekOffset = 0;
let mealPlanData = {}; // "Monday|breakfast" -> entry
let pendingSlot = null;
let editingEntryId = null;

// ── DOM ──
const gridHeader = document.getElementById('gridHeader');
const gridBody = document.getElementById('gridBody');
const weekLabel = document.getElementById('weekLabel');
const toast = document.getElementById('toast');
const modal = document.getElementById('addMealModal');
const modalTitle = document.getElementById('modalTitle');
const modalLabel = document.getElementById('modalSlotLabel');
const recipeSelect = document.getElementById('recipeSelect');
const slotDaySelect = document.getElementById('slotDaySelect');
const slotMealTypeSelect = document.getElementById('slotMealTypeSelect');
const servingsInput = document.getElementById('servingsInput');
const confirmBtn = document.getElementById('confirmAdd');
const cancelBtn = document.getElementById('cancelModal');
const msgEl = document.getElementById('msg');
const errorMsgEl = document.getElementById('errorMsg');
const modalErrorMsgEl = document.getElementById('modalErrorMsg');
const recipeOutputEl = document.getElementById('recipeOutput');

// Populate static selectors once
for (const day of DAYS) {
  const opt = document.createElement('option');
  opt.value = day;
  opt.textContent = day;
  slotDaySelect.appendChild(opt);
}
for (const type of MEAL_TYPES) {
  const opt = document.createElement('option');
  opt.value = type;
  opt.textContent = type.charAt(0).toUpperCase() + type.slice(1);
  slotMealTypeSelect.appendChild(opt);
}

// ── Get userId from localStorage (set during login) ──
function getUserId() {
  const explicitUserId = localStorage.getItem('userId');
  if (explicitUserId) return explicitUserId;

  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    return payload.uid || null;
  } catch (err) {
    return null;
  }
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
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
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
  const fmt = (d) => d.toLocaleDateString('en-CA', {month: 'short', day: 'numeric'});
  return `${fmt(start)} – ${fmt(end)}, ${start.getFullYear()}`;
}

// ── Render grid (always shows days/meal types, even with no data) ──
function renderGrid() {
  weekLabel.textContent = formatWeekLabel(currentWeekOffset);

  // Header row
  gridHeader.innerHTML = '<th class="row-label"></th>';
  for (const day of DAYS) {
    const th = document.createElement('th');
    th.textContent = day;
    gridHeader.appendChild(th);
  }

  // Body rows
  gridBody.innerHTML = '';
  for (const mealType of MEAL_TYPES) {
    const tr = document.createElement('tr');

    const rowHeader = document.createElement('td');
    rowHeader.className = 'row-label';
    rowHeader.textContent = mealType.charAt(0).toUpperCase() + mealType.slice(1);
    tr.appendChild(rowHeader);

    for (const day of DAYS) {
      const td = document.createElement('td');
      const inner = document.createElement('div');
      inner.className = 'cell-inner';

      const entry = mealPlanData[`${day}|${mealType}`];
      if (entry) {
        const chip = document.createElement('div');
        chip.className = 'recipe-chip';
        const meta = formatEntryMeta(entry);
        chip.innerHTML = `
          <div class="chip-main">
            <span class="chip-title">${escapeHtml(entry.recipe?.name || 'Untitled recipe')}</span>
            <span class="chip-meta">${escapeHtml(meta)}</span>
          </div>
          <div class="chip-actions">
            <button class="edit-btn" type="button" title="Edit" aria-label="Edit meal">Edit</button>
            <button type="button" title="Remove" aria-label="Remove meal">✕</button>
          </div>
        `;
        chip.querySelector('.edit-btn').addEventListener('click', () => openEditModal(entry));
        chip.querySelector('.chip-actions button:last-child').addEventListener('click', () => removeEntry(entry._id));
        inner.appendChild(chip);
      } else {
        const addBtn = document.createElement('button');
        addBtn.className = 'add-btn';
        addBtn.textContent = '+ Add';
        addBtn.addEventListener('click', () => openAddModal(day, mealType));
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
    errorMsgEl.textContent = 'Not logged in. Please log in first.';
    renderGrid(); // still render the empty grid
    return;
  }

  try {
    const weekId = getWeekId(currentWeekOffset);
    const res = await fetchWithApiFallback(`/meal-plan?userId=${userId}&weekId=${weekId}`);
    const data = await res.json();

    mealPlanData = {};
    if (data.success) {
      for (const entry of data.data) {
        mealPlanData[`${entry.day}|${entry.mealType}`] = entry;
      }
    }
  } catch (err) {
    errorMsgEl.textContent = 'Could not reach backend. Showing empty grid.';
  }

  renderGrid();
}

// ── Load saved recipes into dropdown ──
async function loadRecipes() {
  try {
    const res = await fetchWithApiFallback('/recipes');
    const data = await res.json();
    const recipes = data.data || [];

    recipeSelect.innerHTML = '<option value="">-- Select recipe --</option>';
    for (const r of recipes) {
      const opt = document.createElement('option');
      opt.value = r._id;
      opt.textContent = r.name;
      recipeSelect.appendChild(opt);
    }
  } catch (err) {
    console.error('Could not load recipes:', err);
  }
}

// ── Modal ──
function openModal(day, mealType) {
  openAddModal(day, mealType);
}

function formatEntryMeta(entry) {
  const servings = `${entry.servings || 1} serving${Number(entry.servings || 1) > 1 ? 's' : ''}`;
  return servings;
}

function openAddModal(day, mealType) {
  pendingSlot = {day, mealType};
  editingEntryId = null;
  modalTitle.textContent = 'Add a Meal';
  confirmBtn.textContent = 'Add to Plan';
  modalLabel.textContent = `${day} · ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`;
  slotDaySelect.value = day;
  slotMealTypeSelect.value = mealType;
  recipeSelect.value = '';
  servingsInput.value = '1';
  modalErrorMsgEl.textContent = '';
  modal.showModal();
}

function openEditModal(entry) {
  pendingSlot = {day: entry.day, mealType: entry.mealType};
  editingEntryId = entry._id;
  modalTitle.textContent = 'Edit Planned Meal';
  confirmBtn.textContent = 'Save Changes';
  modalLabel.textContent = `${entry.day} · ${entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1)}`;
  slotDaySelect.value = entry.day;
  slotMealTypeSelect.value = entry.mealType;
  recipeSelect.value = entry.recipe?._id || entry.recipeId || '';
  servingsInput.value = String(entry.servings || 1);
  modalErrorMsgEl.textContent = '';
  modal.showModal();
}

cancelBtn.addEventListener('click', () => {
  modal.close();
  pendingSlot = null;
  editingEntryId = null;
  modalErrorMsgEl.textContent = '';
});

recipeSelect.addEventListener('change', () => {
  modalErrorMsgEl.textContent = '';
});

confirmBtn.addEventListener('click', async () => {
  const recipeId = recipeSelect.value;
  const selectedDay = slotDaySelect.value;
  const selectedMealType = slotMealTypeSelect.value;
  const servings = Number(servingsInput.value);

  if (!recipeId) {
    showToast('Please select a recipe.', true);
    return;
  }

  if (!selectedDay || !selectedMealType) {
    showToast('Please select day and meal type.', true);
    return;
  }

  if (!Number.isInteger(servings) || servings < 1) {
    showToast('Servings must be at least 1.', true);
    return;
  }

  const userId = getUserId();
  if (!userId) {
    showToast('Not logged in.', true);
    return;
  }

  try {
    const payload = {
      userId,
      recipeId,
      day: selectedDay,
      mealType: selectedMealType,
      weekId: getWeekId(currentWeekOffset),
      servings,
    };

    const isEditing = Boolean(editingEntryId);
    const endpoint = isEditing ?
      `/meal-plan/${editingEntryId}` :
      '/meal-plan';

    const res = await fetchWithApiFallback(endpoint, {
      method: isEditing ? 'PUT' : 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      modal.close();
      pendingSlot = null;
      editingEntryId = null;
      showToast(data.message || (isEditing ? 'Meal updated successfully.' : 'Meal added to planner.'));
      msgEl.textContent = data.message || (isEditing ? 'Meal updated successfully.' : 'Meal added to planner.');
      errorMsgEl.textContent = '';
      modalErrorMsgEl.textContent = '';
      await loadMealPlan();
    } else {
      modalErrorMsgEl.textContent = data.error || 'Failed to save meal.';
      showToast(data.error || 'Failed to save meal.', true);
    }
  } catch (err) {
    modalErrorMsgEl.textContent = 'Could not reach backend.';
    showToast('Could not reach backend.', true);
  }
});

// ── Remove entry ──
async function removeEntry(entryId) {
  if (!confirm('Remove this meal from your plan?')) return;
  try {
    const res = await fetchWithApiFallback(`/meal-plan/${entryId}`, {method: 'DELETE'});
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      await loadMealPlan();
    } else {
      showToast(data.error, true);
    }
  } catch (err) {
    showToast('Could not reach backend.', true);
  }
}

// ── Week navigation ──
document.getElementById('prevWeek').addEventListener('click', () => {
  currentWeekOffset--;
  mealPlanData = {};
  loadMealPlan();
});
document.getElementById('nextWeek').addEventListener('click', () => {
  currentWeekOffset++;
  mealPlanData = {};
  loadMealPlan();
});

// ── Toast ──
let toastTimer = null;
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ── Utility ──
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Smart AI-powered meal generation ──
async function generateWeeklyPlan() {
  const userId = getUserId();
  if (!userId) {
    showToast('Not logged in.', true);
    return;
  }

  const generateBtn = document.getElementById('generatePlanBtn');
  const generateInput = document.getElementById('generateInput');
  const generateErrorMsg = document.getElementById('generateErrorMsg');
  const generatemsg = document.getElementById('generatemsg');

  const inputText = generateInput?.value?.trim() || '';

  if (!inputText) {
    showToast('Please enter what kind of meals you\'d like to generate.', true);
    generateErrorMsg.textContent = 'Please enter what kind of meals you\'d like to generate.';
    return;
  }

  generateBtn.disabled = true;
  generateInput.disabled = true;
  generateErrorMsg.textContent = '';
  generatemsg.textContent = '';
  if (recipeOutputEl) {
    recipeOutputEl.textContent = '';
    recipeOutputEl.classList.add('hidden');
  }

  try {
    const res = await fetchWithApiFallback('/ai/generate-and-assign', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        userId,
        prompt: inputText,
        weekId: getWeekId(currentWeekOffset),
      }),
    });

    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Failed to generate plan.', true);
      generateErrorMsg.textContent = data.error || 'Failed to generate plan.';
      return;
    }

    if (data.mode === 'recipe_only' && data.recipe) {
      const summary = data.recipe.summary || 'Recipe details unavailable.';
      if (recipeOutputEl) {
        recipeOutputEl.textContent = summary;
        recipeOutputEl.classList.remove('hidden');
      }
      const recipeMessage = data.message || 'Recipe details ready.';
      showToast(recipeMessage);
      generatemsg.textContent = recipeMessage;
      return;
    }

    const message = data.message || 'Meals generated.';
    showToast(message);
    generatemsg.textContent = message;
    generateInput.value = '';
    await loadMealPlan();
  } catch (err) {
    console.error('Generation error:', err);
    showToast('Failed to generate plan.', true);
    generateErrorMsg.textContent = `Failed to generate plan using ${activeApiBase}. Please ensure local backend is running on http://127.0.0.1:4000.`;
  } finally {
    generateBtn.disabled = false;
    generateInput.disabled = false;
  }
}


// ── Init — render grid immediately, then fetch data ──
renderGrid(); // shows the grid skeleton right away
loadRecipes();
loadMealPlan();

const generateBtn = document.getElementById('generatePlanBtn');
const generateInput = document.getElementById('generateInput');

if (generateBtn) {
  generateBtn.addEventListener('click', generateWeeklyPlan);
}

if (generateInput) {
  generateInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateWeeklyPlan();
    }
  });
}
