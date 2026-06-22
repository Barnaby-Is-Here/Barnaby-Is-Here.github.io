// Import recipe manager
import recipeManager from './recipe-Manager.js';

const sharedRecipeRequest = readSharedRecipeRequest();
let sharedRecipeWasRevealed = false;

// Main function to handle page load
async function pageLoad() {
    if (recipeManager.groupedRecipes) {
        updateUI(recipeManager.groupedRecipes);
    }
    recipeManager.subscribeToUpdates(recipesUpdatedCallback);
}

function recipesUpdatedCallback()
{
    updateUI(recipeManager.groupedRecipes);
}

function readSharedRecipeRequest() {
    const searchParams = new URLSearchParams(window.location.search);
    const groupName = searchParams.get('group');
    const recipeName = searchParams.get('recipe');

    if (!groupName || !recipeName) {
        return null;
    }

    return {
        groupName,
        recipeName
    };
}

// Function to update UI
function updateUI(groupedRecipes, selectedGroup) {
    const safeGroupedRecipes = groupedRecipes ?? {};

    if (Object.keys(safeGroupedRecipes).length === 0) {
        createNavBar({});
        displayRecipes(null, {});
        return;
    }

    createNavBar(safeGroupedRecipes);

    if (!selectedGroup && sharedRecipeRequest?.groupName && safeGroupedRecipes[sharedRecipeRequest.groupName]) {
        selectedGroup = sharedRecipeRequest.groupName;
    }

    // If not given, retrieve the last selected group from local storage
    if (!selectedGroup) {
        selectedGroup = localStorage.getItem('selectedGroup');
    }

    // If still no group, pick the first available.
    if (!selectedGroup || !safeGroupedRecipes[selectedGroup]) {
        selectedGroup = Object.keys(safeGroupedRecipes)[0];
    }

    // If group is still empty, don't try to fill in.
    if (selectedGroup) {
        displayRecipes(selectedGroup, safeGroupedRecipes);
        refreshRecipeNavHighlight(selectedGroup, safeGroupedRecipes);
        revealSharedRecipe(selectedGroup);
    }
}

// Function to create a navigation bar based on grouped recipes
function createNavBar(groupedRecipes) {
    const navList = document.getElementById('recipe-nav'); // Ensure you have a <ul> with this ID in your HTML
    if (!navList) {
        return;
    }
    
    // Clear the existing list before adding new items
    navList.innerHTML = '';

    for (const path in groupedRecipes) {
        const li = document.createElement('li');
        li.textContent = path; // You can also link to different sections
        li.addEventListener('click', function() { handleGroupClick(this.textContent); })
        navList.appendChild(li);
    }
}

// Update nav bar to make the selected one stay lit
function refreshRecipeNavHighlight(groupName, groupedRecipes) {
    const navList = document.getElementById('recipe-nav'); // Ensure you have a <ul> with this ID in your HTML
    if (!navList || !groupedRecipes[groupName]) {
        return;
    }
    const children = navList.children;
    
    // Make sure there are any children
    if (!children || children.length === 0) { 
        return; 
    }

    // Loop through each <li> element in the nav list
    for (const li of children) {
        if (li.textContent === groupName) {
            li.classList.add('selected');
        } else {
            li.classList.remove('selected');
        }
    }
}

// Handle interaction
function handleGroupClick(groupName) {
    const curRecipes = recipeManager.groupedRecipes;

    // Save the selected group to local storage
    localStorage.setItem('selectedGroup', groupName);

    // Display the recipes for the selected group
    displayRecipes(groupName, curRecipes);
    refreshRecipeNavHighlight(groupName, curRecipes);
}

// Display the selected recipes in the recipe-container
function displayRecipes(groupName, groupedRecipes) {
    const recipeContainer = document.getElementById('recipe-container');
    if (!recipeContainer) {
        return;
    }

    recipeContainer.innerHTML = ''; // Clear any previous recipes

    if (!groupName) {
        recipeContainer.textContent = 'Recipes are temporarily unavailable.';
        return;
    }

    const groupRecipes = groupedRecipes[groupName]; // Assuming `groupedRecipes` holds the grouped data

    if (!Array.isArray(groupRecipes) || groupRecipes.length === 0) {
        recipeContainer.textContent = 'Recipes are temporarily unavailable.';
        return;
    }

    groupRecipes.forEach(recipe => {
        const recipeBox = document.createElement('recipe-box');
        recipeBox.dataset.recipeName = recipe.Name ?? '';
        recipeBox.dataset.groupName = recipe.Path ?? '';
        recipeBox.tabIndex = -1;
        recipeBox.setRecipeData(recipe); // Set the recipe data immediately
        recipeContainer.appendChild(recipeBox);
    });
}

function revealSharedRecipe(selectedGroup) {
    if (sharedRecipeWasRevealed || !sharedRecipeRequest || sharedRecipeRequest.groupName !== selectedGroup) {
        return;
    }

    const recipeElement = findRecipeElement(sharedRecipeRequest.groupName, sharedRecipeRequest.recipeName);
    if (!recipeElement || recipeElement.childElementCount === 0) {
        return;
    }

    revealRecipeElement(recipeElement);
}

function findRecipeElement(groupName, recipeName) {
    const recipeBoxes = document.querySelectorAll('recipe-box');
    for (const recipeBox of recipeBoxes) {
        if (recipeBox.dataset.groupName === groupName && recipeBox.dataset.recipeName === recipeName) {
            return recipeBox;
        }
    }

    return null;
}

function scrollRecipeToTop(recipeElement) {
    const contentPanel = document.querySelector('.content');
    if (!contentPanel || !recipeElement) {
        return;
    }

    const contentRect = contentPanel.getBoundingClientRect();
    const recipeRect = recipeElement.getBoundingClientRect();
    const nextScrollTop = contentPanel.scrollTop + (recipeRect.top - contentRect.top) - 12;

    contentPanel.scrollTo({
        top: Math.max(0, nextScrollTop),
        behavior: 'smooth'
    });

    recipeElement.focus({ preventScroll: true });
}

function revealRecipeElement(recipeElement) {
    scrollRecipeToTop(recipeElement);
    sharedRecipeWasRevealed = true;
}

document.addEventListener('recipe-box-ready', (event) => {
    const recipeElement = event.target.closest('recipe-box');
    if (!recipeElement || !sharedRecipeRequest || sharedRecipeWasRevealed) {
        return;
    }

    if (
        recipeElement.dataset.groupName === sharedRecipeRequest.groupName &&
        recipeElement.dataset.recipeName === sharedRecipeRequest.recipeName
    ) {
        revealRecipeElement(recipeElement);
    }
});

// Call the load function when the page loads
window.onload = pageLoad;
