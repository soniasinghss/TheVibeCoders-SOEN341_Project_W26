const API_BASE = "http://localhost:4000"; // change to your Render URL when deployed

async function loadRecipes(search = "") {
  const container = document.getElementById("recipesContainer");
  container.innerHTML = "Loading...";

  const url = search.trim()
    ? `${API_BASE}/recipes?search=${encodeURIComponent(search.trim())}`
    : `${API_BASE}/recipes`;

  try {
    const res = await fetch(url);
    const result = await res.json();

    if (!res.ok || !result.success) {
      container.innerHTML = `<p>Error: ${result.error ?? "Failed to load recipes"}</p>`;
      return;
    }

    renderRecipes(result.data);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p>Error: Could not reach server.</p>`;
  }
}

function renderRecipes(recipes) {
  const container = document.getElementById("recipesContainer");

  if (!recipes || recipes.length === 0) {
    container.innerHTML = "<p>No recipes found.</p>";
    return;
  }

  container.innerHTML = recipes
    .map(
      (r) => `
      <div class="card">
        <h3>${r.name}</h3>
        <p><b>Prep Time:</b> ${r.prepTime} min</p>
        <p><b>Cost:</b> ${r.cost ?? "N/A"}</p>
      </div>
    `
    )
    .join("");
}

document.getElementById("searchBtn").addEventListener("click", () => {
  const q = document.getElementById("searchInput").value;
  loadRecipes(q);
});

document.getElementById("clearBtn").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  loadRecipes("");
});

// load all on page open
window.addEventListener("load", () => loadRecipes(""));