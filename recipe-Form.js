// Import recipe manager
import recipeManager from './recipe-Manager.js';
import { createRecipeDataSource } from './data/recipe-data-source.js';
import {
  getRecipeEditorState,
  subscribeToRecipeAuthChanges
} from './data/recipe-auth.js';

const recipeDataSource = createRecipeDataSource();

const formElement = document.getElementById('new-recipe-form');
const recipeIdElement = document.getElementById('recipe-id');
const recipeNameElement = document.getElementById('recipe-name');
const recipePathElement = document.getElementById('recipe-path');
const recipePathOptionsElement = document.getElementById('recipe-path-options');
const ingredientsElement = document.getElementById('ingredients');
const methodElement = document.getElementById('method');
const tagsElement = document.getElementById('tags');
const pictureUrlElement = document.getElementById('recipe-photo-url');
const saveRecipeButton = document.getElementById('save-recipe-btn');
const saveStatusElement = document.getElementById('save-status');

const urlParams = new URLSearchParams(window.location.search);
const requestedRecipeName = urlParams.get('name');
const requestedPath = urlParams.get('path');

let currentAuthState = {
  user: null,
  isEditor: false
};
let recipePrefilled = false;
const signInPromptMessage = 'Sign in from the user menu in the top right to save recipe changes.';
const notEditorMessage = 'This signed-in account is not on the recipe editor list.';

// Main function to handle page load
async function pageLoad() {
  recipeManager.subscribeToUpdates(handleRecipeManagerUpdate);
  populatePathOptions();

  await refreshAuthState();
  handleRecipeManagerUpdate();

  subscribeToRecipeAuthChanges(async () => {
    await refreshAuthState();
  });
}

async function refreshAuthState() {
  try {
    currentAuthState = await getRecipeEditorState();
  } catch (error) {
    currentAuthState = {
      user: null,
      isEditor: false
    };
    saveStatusElement.textContent = `Could not load editor status: ${error.message}`;
  }

  updateAuthUi();
}

function updateAuthUi() {
  if (!currentAuthState.user) {
    saveRecipeButton.disabled = true;
    if (!saveStatusElement.textContent) {
      saveStatusElement.textContent = signInPromptMessage;
    }
    return;
  }

  if (currentAuthState.isEditor) {
    saveRecipeButton.disabled = false;
    if (saveStatusElement.textContent === signInPromptMessage || saveStatusElement.textContent === notEditorMessage) {
      saveStatusElement.textContent = '';
    }
  } else {
    saveRecipeButton.disabled = true;
    saveStatusElement.textContent = notEditorMessage;
  }
}

function handleRecipeManagerUpdate() {
  populatePathOptions();

  if (!recipePrefilled && requestedRecipeName && requestedPath) {
    const recipe = recipeManager.getRecipe(requestedPath, requestedRecipeName);
    if (recipe) {
      prefillForm(recipe);
      recipePrefilled = true;
    }
  }
}

function populatePathOptions() {
  const paths = recipeManager.groupNames;
  recipePathOptionsElement.innerHTML = '';

  paths.forEach(path => {
    const option = document.createElement('option');
    option.value = path;
    recipePathOptionsElement.appendChild(option);
  });
}

function prefillForm(recipe) {
  recipeIdElement.value = recipe.Id ?? '';
  recipeNameElement.value = recipe.Name;
  recipePathElement.value = recipe.Path;
  ingredientsElement.value = recipe.Ingredients.split(',').map(item => item.trim()).join('\n');
  methodElement.value = recipe.Method;
  tagsElement.value = recipe.Tags;
  pictureUrlElement.value = recipe.Picture ?? '';
  saveRecipeButton.textContent = 'Update Recipe';
}

function normaliseIngredients(value) {
  return value
    .split('\n')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .join(', ');
}

function normaliseTags(value) {
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .join(', ');
}

formElement.addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent form from submitting the traditional way

    if (!currentAuthState.user || !currentAuthState.isEditor) {
      saveStatusElement.textContent = 'You must sign in as an approved recipe editor before saving.';
      return;
    }

    const recipe = {
      id: recipeIdElement.value ? Number(recipeIdElement.value) : null,
      name: recipeNameElement.value,
      path: recipePathElement.value,
      ingredients: normaliseIngredients(ingredientsElement.value),
      method: methodElement.value.trim(),
      tags: normaliseTags(tagsElement.value),
      pictureUrl: pictureUrlElement.value.trim()
    };

    saveRecipeButton.disabled = true;
    saveStatusElement.textContent = 'Saving recipe...';

    try {
      const savedRecipe = await recipeDataSource.saveRecipe(recipe);
      saveStatusElement.textContent = `Saved ${savedRecipe.Name}. Returning to recipes...`;
      localStorage.removeItem('groupedRecipes');
      window.setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    } catch (error) {
      saveStatusElement.textContent = `Could not save recipe: ${error.message}`;
      updateAuthUi();
    }
  });

// Call the load function when the page loads
window.onload = pageLoad;
  
