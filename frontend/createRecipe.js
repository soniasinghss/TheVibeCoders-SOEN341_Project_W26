const form = document.getElementById("createRecipeForm");
const ingredientsContainer = document.getElementById("ingredientsContainer");
const addIngredientBtn = document.getElementById("addIngredientBtn");
const message = document.getElementById("message");

function addIngredientRow() {
  const row = document.createElement("div");
  row.className = "ingredient-row";

  row.innerHTML = `
    <input type="text" placeholder="Name" required />
    <input type="number" placeholder="Qty" min="0" step="0.01" required />
    <input type="text" placeholder="Unit" required />
    <button type="button">X</button>
  `;

  row.querySelector("button").addEventListener("click", () => {
    row.remove();
  });

  ingredientsContainer.appendChild(row);
}

addIngredientBtn.addEventListener("click", addIngredientRow);

// Add one ingredient by default
addIngredientRow();

form.addEventListener("submit", (e) => {
  e.preventDefault();
const recipeName = document.getElementById("recipeName").value.trim();
if (!recipeName) {
  message.textContent = "Recipe name is required.";
  message.style.color = "red";
  return;
}
  if (!form.checkValidity()) {
    message.textContent = "Please fill in all required fields.";
    message.style.color = "red";
    return;
  }

  message.textContent = "Recipe form ready (backend integration in next task).";
  message.style.color = "green";
});