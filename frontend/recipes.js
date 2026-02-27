const recipesList = document.getElementById('recipesList');
const message = document.getElementById('message');

const searchInput = document.getElementById('searchInput');
const minPrepTimeInput = document.getElementById('minPrepTime');
const maxPrepTimeInput = document.getElementById('maxPrepTime');
const minCostInput = document.getElementById('minCost');
const maxCostInput = document.getElementById('maxCost');
const difficultySelect = document.getElementById('difficulty');
const dietaryTagsInput = document.getElementById('dietaryTags');
const applyBtn = document.getElementById('applyBtn');
const clearBtn = document.getElementById('clearBtn');

const API_BASE = (() => {
  try {
    const stored = localStorage.getItem('apiBase');
    if (!stored) return 'http://localhost:4000';
    if (stored.includes(':3000')) return 'http://localhost:4000';
    return stored;
  } catch (e) {
    return 'http://localhost:4000';
  }
})();

function setMessage(text, ok = false) {
  message.textContent = text;
  message.className = ok ? 'success-text' : 'error-text';
  if (!text) message.className = '';
}

function buildQueryParams() {
  const params = new URLSearchParams();

  const search = searchInput.value.trim();
  if (search) params.set('search', search);

  const minPrepTime = minPrepTimeInput.value.trim();
  if (minPrepTime) params.set('minPrepTime', minPrepTime);

  const maxPrepTime = maxPrepTimeInput.value.trim();
  if (maxPrepTime) params.set('maxPrepTime', maxPrepTime);

  const minCost = minCostInput.value.trim();
  if (minCost) params.set('minCost', minCost);

  const maxCost = maxCostInput.value.trim();
  if (maxCost) params.set('maxCost', maxCost);

  const difficulty = difficultySelect.value.trim();
  if (difficulty) params.set('difficulty', difficulty);

  const dietaryTags = dietaryTagsInput.value.trim();
  if (dietaryTags) params.set('dietaryTags', dietaryTags);

  return params.toString();
}

async function deleteRecipeById(recipeId, listItem) {
  const confirmed = window.confirm('Are you sure you want to delete this recipe?');
  if (!confirmed) return;

  try {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/recipes/${recipeId}`, {
      method: 'DELETE',
      headers,
    });

    const j = await res.json().catch(() => ({}));

    if (res.status === 404) {
      setMessage(j.error || 'Recipe not found.', false);
      return;
    }

    if (!res.ok) {
      setMessage(j.error || 'Failed to delete recipe.', false);
      return;
    }

    listItem.remove();
    setMessage(j.message || 'Recipe deleted successfully.', true);
    setTimeout(() => {
      window.location.href = 'protected.html';
    }, 400);
  } catch (err) {
    console.error(err);
    setMessage('Server error while deleting recipe.', false);
  }
}

function renderRecipes(arr) {
  recipesList.innerHTML = '';

  if (!arr || arr.length === 0) {
    setMessage('No recipes found.', false);
    return;
  }

  setMessage('');
  arr.forEach((r) => {
    const li = document.createElement('li');
    li.className = 'recipe-item';

    const title = document.createElement('div');
    title.className = 'recipe-title';
    title.textContent = r.name || 'Untitled';
    li.appendChild(title);

    const meta = document.createElement('span');
    meta.className = 'recipe-meta';
    meta.textContent = `(Prep: ${r.prepTime ?? '-'} min, Cost: ${r.cost ?? '-'})`;
    li.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'recipe-actions';

    const editLink = document.createElement('a');
    editLink.href = `editRecipe.html?id=${r._id}`;
    editLink.textContent = 'Edit';
    editLink.className = 'btn-primary action-link';
    actions.appendChild(editLink);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'btn-primary action-btn';
    deleteBtn.addEventListener('click', () => deleteRecipeById(r._id, li));
    actions.appendChild(deleteBtn);

    li.appendChild(actions);

    recipesList.appendChild(li);
  });
}

async function loadRecipes() {
  try {
    const qs = buildQueryParams();
    const url = `${API_BASE}/recipes${qs ? `?${qs}` : ''}`;

    let res = await fetch(url);
    let j;

    try {
      j = await res.json();
    } catch (e) {
      res = await fetch(`http://localhost:4000/recipes${qs ? `?${qs}` : ''}`);
      try {
        j = await res.json();
      } catch (e2) {
        setMessage('Backend response is not JSON. Check that backend is running on http://localhost:4000.', false);
        return;
      }
    }

    if (!res.ok || !j.success) {
      setMessage(j && j.error ? j.error : 'Failed to fetch recipes.', false);
      return;
    }

    renderRecipes(Array.isArray(j.data) ? j.data : []);
  } catch (err) {
    console.error(err);
    setMessage('Server error while loading recipes.', false);
  }
}

applyBtn.addEventListener('click', () => {
  loadRecipes();
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  minPrepTimeInput.value = '';
  maxPrepTimeInput.value = '';
  minCostInput.value = '';
  maxCostInput.value = '';
  difficultySelect.value = '';
  dietaryTagsInput.value = '';
  loadRecipes();
});

loadRecipes();
