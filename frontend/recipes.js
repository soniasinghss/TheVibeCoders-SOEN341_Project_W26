<<<<<<< HEAD
// frontend/recipes.js
console.log("recipes.js loaded ✅");

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const minPrepTimeInput = document.getElementById("minPrepTime");
  const maxPrepTimeInput = document.getElementById("maxPrepTime");
  const minCostInput = document.getElementById("minCost");
  const maxCostInput = document.getElementById("maxCost");
  const difficultySelect = document.getElementById("difficulty");
  const dietaryTagsInput = document.getElementById("dietaryTags");

  const applyBtn = document.getElementById("applyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const recipesContainer = document.getElementById("recipesContainer");

  // Quick debug: if any are null, your HTML ids/path are wrong
  console.log({ applyBtn, clearBtn, recipesContainer });

  if (!applyBtn || !clearBtn || !recipesContainer) {
    console.error("❌ Missing elements. Check your IDs in recipes.html");
    return;
  }

  // IMPORTANT: change this if your backend URL is different
  const API_BASE = "http://localhost:4000";

  function buildQueryParams() {
    const params = new URLSearchParams();

    const search = searchInput?.value?.trim();
    if (search) params.set("search", search);

    const minPrepTime = minPrepTimeInput?.value?.trim();
    if (minPrepTime) params.set("minPrepTime", minPrepTime);

    const maxPrepTime = maxPrepTimeInput?.value?.trim();
    if (maxPrepTime) params.set("maxPrepTime", maxPrepTime);

    const minCost = minCostInput?.value?.trim();
    if (minCost) params.set("minCost", minCost);

    const maxCost = maxCostInput?.value?.trim();
    if (maxCost) params.set("maxCost", maxCost);

    const difficulty = difficultySelect?.value?.trim();
    if (difficulty) params.set("difficulty", difficulty);

    const dietaryTags = dietaryTagsInput?.value?.trim();
    if (dietaryTags) params.set("dietaryTags", dietaryTags); // comma-separated

    return params.toString();
  }

  function renderRecipes(recipes) {
    recipesContainer.innerHTML = "";

    if (!recipes || recipes.length === 0) {
      recipesContainer.innerHTML = `<p>No recipes found.</p>`;
      return;
    }

    const list = document.createElement("div");
    list.className = "recipe-list";

    recipes.forEach((r) => {
      const card = document.createElement("div");
      card.className = "recipe-card";

      const tags = Array.isArray(r.dietaryTags) ? r.dietaryTags.join(", ") : "";

      card.innerHTML = `
        <h3>${r.name ?? "Untitled"}</h3>
        <p><strong>Prep Time:</strong> ${r.prepTime ?? "-"} min</p>
        <p><strong>Cost:</strong> ${r.cost ?? "-"}</p>
        <p><strong>Difficulty:</strong> ${r.difficulty ?? "-"}</p>
        <p><strong>Tags:</strong> ${tags || "-"}</p>
      `;

      list.appendChild(card);
    });

    recipesContainer.appendChild(list);
  }

  async function fetchRecipes() {
    const qs = buildQueryParams();
    const url = `${API_BASE}/recipes${qs ? `?${qs}` : ""}`;

    console.log("Fetching:", url);

    recipesContainer.innerHTML = "<p>Loading...</p>";

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        console.error("Backend error:", data);
        recipesContainer.innerHTML = `<p style="color:red;">${data?.error || "Request failed"}</p>`;
        return;
      }

      renderRecipes(data.data);
    } catch (err) {
      console.error("Fetch failed:", err);
      recipesContainer.innerHTML = `<p style="color:red;">Could not connect to backend. Is it running on localhost:4000?</p>`;
    }
  }

  // Button events
  applyBtn.addEventListener("click", () => {
    console.log("Apply Filters clicked ✅");
    fetchRecipes();
  });

  clearBtn.addEventListener("click", () => {
    console.log("Clear clicked ✅");

    if (searchInput) searchInput.value = "";
    if (minPrepTimeInput) minPrepTimeInput.value = "";
    if (maxPrepTimeInput) maxPrepTimeInput.value = "";
    if (minCostInput) minCostInput.value = "";
    if (maxCostInput) maxCostInput.value = "";
    if (difficultySelect) difficultySelect.value = "";
    if (dietaryTagsInput) dietaryTagsInput.value = "";

    fetchRecipes();
  });

  // Optional: load all recipes on page load
  fetchRecipes();
});
=======
const recipesList = document.getElementById('recipesList');
const message = document.getElementById('message');

// API base same as other scripts
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

function setMessage(text, ok = false) {
  message.textContent = text;
  message.className = ok ? "success-text" : "error-text";
  if (!text) message.className = "";
}

async function deleteRecipeById(recipeId, listItem) {
  const confirmed = window.confirm("Are you sure you want to delete this recipe?");
  if (!confirmed) return;

  try {
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/recipes/${recipeId}`, {
      method: "DELETE",
      headers,
    });

    const j = await res.json().catch(() => ({}));

    if (res.status === 404) {
      setMessage(j.error || "Recipe not found.", false);
      return;
    }

    if (!res.ok) {
      setMessage(j.error || "Failed to delete recipe.", false);
      return;
    }

    listItem.remove();
    setMessage(j.message || "Recipe deleted successfully.", true);
    setTimeout(() => {
      window.location.href = "protected.html";
    }, 400);
  } catch (err) {
    console.error(err);
    setMessage("Server error while deleting recipe.", false);
  }
}

async function loadRecipes() {
  try {
    let res = await fetch(`${API_BASE}/recipes`);
    let j;
    try {
      j = await res.json();
    } catch (e) {
      // fallback: if apiBase is wrong, try local backend directly
      res = await fetch('http://localhost:4000/recipes');
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
    const arr = Array.isArray(j.data) ? j.data : [];
    recipesList.innerHTML = '';
    if (arr.length === 0) {
      setMessage('No recipes found.', false);
      return;
    }
    arr.forEach((r) => {
      const li = document.createElement('li');
      li.textContent = r.name + ' ';

      const editLink = document.createElement('a');
      editLink.href = `editRecipe.html?id=${r._id}`;
      editLink.textContent = '[Edit]';
      editLink.className = 'btn-primary';
      editLink.style.color = 'white';
      editLink.style.width = 'auto';
      editLink.style.display = 'inline-block';
      editLink.style.textDecoration = 'none';
      editLink.style.padding = '8px 14px';
      editLink.style.marginTop = '0';
      editLink.style.marginLeft = '8px';
      li.appendChild(editLink);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'btn-primary';
      deleteBtn.style.color = 'white';
      deleteBtn.style.width = 'auto';
      deleteBtn.style.display = 'inline-block';
      deleteBtn.style.padding = '8px 14px';
      deleteBtn.style.marginTop = '0';
      deleteBtn.style.marginLeft = '8px';
      deleteBtn.addEventListener('click', () => deleteRecipeById(r._id, li));
      li.appendChild(deleteBtn);

      recipesList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    setMessage('Server error while loading recipes.', false);
  }
}

loadRecipes();
>>>>>>> 3082245 (Implement recipe edit/delete flow, fix create/view recipe UX and protected page labels)
