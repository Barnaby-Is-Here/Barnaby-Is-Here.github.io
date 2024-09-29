// Function to group recipes by their Path
function groupRecipes(recipes) {
    return recipes.reduce((acc, recipe) => {
        const path = recipe.Path;

        // If the path doesn't exist in the accumulator, create an empty array
        if (!acc[path]) {
            acc[path] = [];
        }

        // Push the current recipe into the corresponding path group
        acc[path].push(recipe);
        return acc;
    }, {});
}

async function getData() {
    // Check if cached data exists
    const cachedData = localStorage.getItem('recipes');
    let recipes = [];

    if (cachedData) {
        recipes = JSON.parse(cachedData);

        // Ensure it is a valid array
        if (Array.isArray(recipes) && recipes.length > 0) {
            console.log('Using cached recipes:', recipes);
        } else {
            console.warn('Cached data is not a valid array:', recipes);
        }
    }

    // Fetch new data from the API
    const response = await fetch("https://script.google.com/macros/s/AKfycbwaMrcK-9LiMs6AVmmHKVcV7vBfAP4b380wSQobMg7YGNYDGMlQ0c6197jzURGQAt4L6w/exec");

    // Ensure response is valid before proceeding
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const newRecipes = await response.json();
    console.log('Fetched recipes:', newRecipes);

    // Update cache only if the new recipes are different
    if (JSON.stringify(newRecipes) !== JSON.stringify(recipes)) {
        localStorage.setItem('recipes', JSON.stringify(newRecipes));
        console.log('Updated cached recipes:', newRecipes);
    }

    return recipes.length > 0 ? recipes : newRecipes; // Return cached if exists, else return new
}

// Load function to fetch recipes from the server
async function load() {
    try {
        const recipes = await getData();

        console.log({ recipes });

        // Check if recipes is an array before grouping
        if (!Array.isArray(recipes)) {
            console.error('Recipes is not an array:', recipes);
            return;
        }

        // Call the grouping function and log the result
        const groupedRecipes = groupRecipes(recipes);
        console.log({ groupedRecipes });

        // Create the navigation bar
        createNavBar(groupedRecipes);
        
        // Optionally, fetch and update new data in the background
        fetchNewDataInBackground();
    } catch (error) {
        console.error('Error loading recipes:', error);
    }
}

// Function to fetch new data in the background
async function fetchNewDataInBackground() {
    try {
        const response = await fetch("https://script.google.com/macros/s/AKfycbwaMrcK-9LiMs6AVmmHKVcV7vBfAP4b380wSQobMg7YGNYDGMlQ0c6197jzURGQAt4L6w/exec");

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const newRecipes = await response.json();

        // Compare and update cache if different
        const cachedData = localStorage.getItem('recipes');
        if (cachedData) {
            const cachedRecipes = JSON.parse(cachedData);
            if (JSON.stringify(newRecipes) !== JSON.stringify(cachedRecipes)) {
                localStorage.setItem('recipes', JSON.stringify(newRecipes));
                console.log('Background update: Recipes updated in cache.');
                // Optionally, you could also update the UI here
            }
        }
    } catch (error) {
        console.error('Error fetching new recipes in the background:', error);
    }
}

// Call the load function when the page loads
window.onload = load;

// Function to create a navigation bar based on grouped recipes
function createNavBar(groupedRecipes) {
    const navList = document.getElementById('recipe-nav'); // Ensure you have a <ul> with this ID in your HTML

    for (const path in groupedRecipes) {
        const li = document.createElement('li');
        li.textContent = path; // You can also link to different sections
        navList.appendChild(li);
    }
}