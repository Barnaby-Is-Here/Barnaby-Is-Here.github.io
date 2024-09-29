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

// Main function to handle page load
async function pageLoad() {
    // Step 1: Read Cache (groups)
    const cachedGroups = getCachedGroups();
    if (cachedGroups) {
        // Step 2: If valid, update UI
        updateUI(cachedGroups);
    }

    // Step 3: Attempt to get new data
    const newRecipes = await fetchNewData();
    if (newRecipes) {
        // Step 4: Group the data
        const newGroupedRecipes = groupRecipes(newRecipes);

        // Step 5: Compare the new data to old
        if (JSON.stringify(newGroupedRecipes) !== JSON.stringify(cachedGroups)) {
            // Step 6: If different, update UI and save to cache
            updateUI(newGroupedRecipes);
            saveGroupsToCache(newGroupedRecipes);
        }
    }
}

// Function to get cached groups
function getCachedGroups() {
    const cachedData = localStorage.getItem('groupedRecipes');
    if (cachedData) {
        const groups = JSON.parse(cachedData);
        console.log('Cached data type:', typeof groups)
        // Ensure it's a valid array
        if (typeof groups === 'object' && groups !== null) {
            console.log('Using cached groups:', groups);
            return groups;
        } else {
            console.warn('Cached groups data is not valid:', groups);
        }
    }
    return null;
}

// Function to fetch new data from the API
async function fetchNewData() {
    try {
        const response = await fetch("https://script.google.com/macros/s/AKfycbwaMrcK-9LiMs6AVmmHKVcV7vBfAP4b380wSQobMg7YGNYDGMlQ0c6197jzURGQAt4L6w/exec");
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const recipes = await response.json();
        console.log('Fetched new recipes:', recipes);
        return recipes;
    } catch (error) {
        console.error('Error fetching new recipes:', error);
        return null; // Return null if there was an error
    }
}

// Function to update UI
function updateUI(groupedRecipes) {
    console.log('Updating UI with:', groupedRecipes);
    // Your logic to update the UI with the grouped recipes goes here
    createNavBar(groupedRecipes); // Example of updating the navbar
}

// Function to save grouped recipes to cache
function saveGroupsToCache(groupedRecipes) {
    localStorage.setItem('groupedRecipes', JSON.stringify(groupedRecipes));
    console.log('Saved grouped recipes to cache:', groupedRecipes);
}

// Function to create a navigation bar based on grouped recipes
function createNavBar(groupedRecipes) {
    const navList = document.getElementById('recipe-nav'); // Ensure you have a <ul> with this ID in your HTML
    
    // Clear the existing list before adding new items
    navList.innerHTML = '';

    for (const path in groupedRecipes) {
        const li = document.createElement('li');
        li.textContent = path; // You can also link to different sections
        navList.appendChild(li);
    }
}


// Call the load function when the page loads
window.onload = pageLoad;
