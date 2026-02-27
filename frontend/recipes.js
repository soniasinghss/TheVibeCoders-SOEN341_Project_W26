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