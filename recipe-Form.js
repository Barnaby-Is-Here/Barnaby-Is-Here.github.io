// Import recipe manager
import recipeManager from './recipe-Manager.js';

// Main function to handle page load
async function pageLoad() {
  // Check for Query Strings 
  const urlParams = new URLSearchParams(window.location.search);

  if (!urlParams) { return; } // No parameters, ignore.

  // Get the "name" and "cuisine" parameters
  const recipeName = urlParams.get('name');
  const path = urlParams.get('path');

  const recipe = recipeManager.getRecipe(path, recipeName);

  if (recipe) {
      console.log("Recipe found:", recipe);
      prefillForm(recipe);
  } else {
      console.log("Recipe not found.");
  }
}

function prefillForm(recipe) {
  document.getElementById('recipe-name').value = recipe.Name;
  document.getElementById('recipe-path').value = recipe.Path;
  document.getElementById('ingredients').value = recipe.Ingredients;
  document.getElementById('method').value = recipe.Method;
  document.getElementById('tags').value = recipe.Tags;
}


document.getElementById('new-recipe-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form from submitting the traditional way
  
    const recipe = {
      name: document.getElementById('recipe-name').value,
      path: document.getElementById('recipe-path').value,
      ingredients: document.getElementById('ingredients').value.split('\n'),
      method: document.getElementById('method').value,
      tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()),
      photo: document.getElementById('recipe-photo').files[0]
    };
  
    console.log(recipe); // Do something with the recipe data (e.g., save it to the server)
  });

// Call the load function when the page loads
window.onload = pageLoad;
  