// Import recipe manager
import recipeManager from './recipe-Manager.js';
import { createRecipeDataSource } from './data/recipe-data-source.js';
import {
  completeRecipeAuthRedirect,
  getRecipeEditorState,
  sendRecipeEditorMagicLink,
  signOutRecipeEditor,
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
const authSummaryElement = document.getElementById('auth-summary');
const authStatusElement = document.getElementById('auth-status');
const editorEmailElement = document.getElementById('editor-email');
const sendMagicLinkButton = document.getElementById('send-magic-link');
const signOutButton = document.getElementById('sign-out-editor');

const urlParams = new URLSearchParams(window.location.search);
const requestedRecipeName = urlParams.get('name');
const requestedPath = urlParams.get('path');

let currentAuthState = {
  user: null,
  isEditor: false
};
let recipePrefilled = false;

// Main function to handle page load
async function pageLoad() {
  recipeManager.subscribeToUpdates(handleRecipeManagerUpdate);
  populatePathOptions();

  try {
    const authRedirectCompleted = await completeRecipeAuthRedirect();
    if (authRedirectCompleted) {
      authStatusElement.textContent = 'Magic link sign-in completed.';
    }
  } catch (error) {
    authStatusElement.textContent = `Sign-in failed: ${error.message}`;
  }

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
    authStatusElement.textContent = `Could not load editor status: ${error.message}`;
  }

  updateAuthUi();
}

function updateAuthUi() {
  if (!currentAuthState.user) {
    authSummaryElement.textContent = 'Sign in with a magic link to add or edit recipes.';
    saveRecipeButton.disabled = true;
    signOutButton.style.display = 'none';
    return;
  }

  signOutButton.style.display = 'inline-block';

  if (currentAuthState.isEditor) {
    authSummaryElement.textContent = `Signed in as ${currentAuthState.user.email}. You can save recipe changes.`;
    saveRecipeButton.disabled = false;
  } else {
    authSummaryElement.textContent = `Signed in as ${currentAuthState.user.email}, but this account is not in the recipe editor list yet.`;
    saveRecipeButton.disabled = true;
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

sendMagicLinkButton.addEventListener('click', async function() {
  const emailAddress = editorEmailElement.value.trim();
  if (!emailAddress) {
    authStatusElement.textContent = 'Enter an email address before requesting a magic link.';
    return;
  }

  sendMagicLinkButton.disabled = true;
  authStatusElement.textContent = 'Sending magic link...';

  try {
    await sendRecipeEditorMagicLink(emailAddress);
    authStatusElement.textContent = `Magic link sent to ${emailAddress}. Open the email on this device to finish signing in.`;
  } catch (error) {
    authStatusElement.textContent = `Could not send magic link: ${error.message}`;
  } finally {
    sendMagicLinkButton.disabled = false;
  }
});

signOutButton.addEventListener('click', async function() {
  try {
    await signOutRecipeEditor();
    authStatusElement.textContent = 'Signed out.';
    await refreshAuthState();
  } catch (error) {
    authStatusElement.textContent = `Could not sign out: ${error.message}`;
  }
});

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
  
