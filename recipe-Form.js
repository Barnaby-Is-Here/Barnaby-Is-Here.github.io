import recipeManager from './recipe-Manager.js';

async function pageLoad() {
    const paths = recipeManager.groupNames;
    const selectElement = document.getElementById('recipe-path');
    paths.forEach(path => {
        const option = document.createElement('option');
        option.value = path;
        option.textContent = path;
        selectElement.appendChild(option);
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams) return;

    const recipeName = urlParams.get('name');
    const path = urlParams.get('path');

    if (recipeName && path) {
        const recipe = await recipeManager.getRecipe(path, recipeName);
        if (recipe) {
            console.log("Recipe found:", recipe);
            prefillForm(recipe);
        } else {
            console.log("Recipe not found.");
        }
    }
}

function prefillForm(recipe) {
    document.getElementById('recipe-name').value = recipe.name;
    document.getElementById('recipe-path').value = recipe.path;
    document.getElementById('ingredients').value = recipe.ingredients.join('\n');
    document.getElementById('method').value = recipe.method;
    document.getElementById('tags').value = recipe.tags.join(', ');
}

document.getElementById('new-recipe-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const recipe = {
        name: document.getElementById('recipe-name').value,
        path: document.getElementById('recipe-path').value,
        ingredients: document.getElementById('ingredients').value.split('\n'),
        method: document.getElementById('method').value,
        tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()),
        photo: document.getElementById('recipe-photo').files[0]
    };

    try {
        await recipeManager.addRecipe(recipe);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error saving recipe:', error);
        alert('Failed to save recipe. Please try again.');
    }
});

window.onload = pageLoad;