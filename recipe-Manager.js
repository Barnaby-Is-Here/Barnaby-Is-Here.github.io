// Handle google api.

// Function to fetch new recipes from the API
async function fetchNewRecipes() {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbwaMrcK-9LiMs6AVmmHKVcV7vBfAP4b380wSQobMg7YGNYDGMlQ0c6197jzURGQAt4L6w/exec?route=recipes');
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

// Function to fetch new images from the API
async function fetchNewImages() {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbwaMrcK-9LiMs6AVmmHKVcV7vBfAP4b380wSQobMg7YGNYDGMlQ0c6197jzURGQAt4L6w/exec?route=images');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const images = await response.json();
        console.log('Fetched new images:', images);

        return images;
    } catch (error) {
        console.error('Error fetching new images:', error);
        return null; // Return null if there was an error
    }
}

async function fetchDataInParallel() {
    try {
        // Start both fetch requests without awaiting
        const recipesPromise = fetchNewRecipes();
        const imagesPromise = fetchNewImages();

        // Wait for both promises to resolve
        const [recipesResponse, imagesResponse] = await Promise.all([recipesPromise, imagesPromise]);

        // Combine
        const combined = combineRecipesWithImages(recipesResponse, imagesResponse)
        console.log('Fetched Data:', combined);
        return combined;

    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// Function to combine recipes and images
function combineRecipesWithImages(recipes, images) {
    // Loop through the recipes and add the "Picture" property if an image is found
    const combinedData = recipes.map(recipe => {
        // Find the matching image (strip the file extension from image name)
        const imageMatch = images.find(image => {
            const imageName = image.name.replace(/\.[^/.]+$/, ""); // Remove file extension
            return imageName === recipe.Name;
        });

        // Add the "Picture" property with the URL if a match is found
        return {
            ...recipe,
            Picture: imageMatch ? imageMatch.url : null // Set to null if no match is found
        };
    });

    return combinedData;
}

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

    // Step 2: Read Cache (groups)
    const cachedGroups = getCachedGroups();
    if (cachedGroups) {
        // Step 3: If valid, update UI
        updateUI(cachedGroups);
    }

    // Step 4: Attempt to get new data
    const newRecipes = await fetchDataInParallel();
    if (newRecipes) {
        // Step 5: Group the data
        const newGroupedRecipes = groupRecipes(newRecipes);

        // Step 6: Compare the new data to old
        if (JSON.stringify(newGroupedRecipes) !== JSON.stringify(cachedGroups)) {
            // Step 7: If different, update UI and save to cache
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

// Function to save grouped recipes to cache
function saveGroupsToCache(groupedRecipes) {
    localStorage.setItem('groupedRecipes', JSON.stringify(groupedRecipes));
    console.log('Saved grouped recipes to cache:', groupedRecipes);
}

// Function to update UI
function updateUI(groupedRecipes, selectedGroup) {

    createNavBar(groupedRecipes);

    // If not given, retrieve the last selected group from local storage
    if (!selectedGroup) {
        selectedGroup = localStorage.getItem('selectedGroup');
    }

    // If still no group, pick the first available.
    if (!selectedGroup) {
        selectedGroup = Object.keys(groupedRecipes)[0];
    }

    // If group is still empty, don't try to fill in.
    if (selectedGroup) {
        displayRecipes(selectedGroup, groupedRecipes);
        refreshRecipeNavHighlight(selectedGroup, groupRecipes);
    }
}

// Function to create a navigation bar based on grouped recipes
function createNavBar(groupedRecipes) {
    const navList = document.getElementById('recipe-nav'); // Ensure you have a <ul> with this ID in your HTML
    
    // Clear the existing list before adding new items
    navList.innerHTML = '';

    for (const path in groupedRecipes) {
        const li = document.createElement('li');
        li.textContent = path; // You can also link to different sections
        li.addEventListener('click', function() { handleGroupClick(this.textContent, groupedRecipes); })
        navList.appendChild(li);
    }
}

// Display the selected recipes in the recipe-container
function displayRecipes(groupName, groupedRecipes) {
    const recipeContainer = document.getElementById('recipe-container');
    recipeContainer.innerHTML = ''; // Clear any previous recipes

    const groupRecipes = groupedRecipes[groupName]; // Assuming `groupedRecipes` holds the grouped data

    groupRecipes.forEach(recipe => {
        const recipeBox = document.createElement('recipe-box');
        recipeBox.setRecipeData(recipe); // Set the recipe data immediately
        recipeContainer.appendChild(recipeBox);
    });
}

// Update nav bar to make the selected one stay lit
function refreshRecipeNavHighlight(groupName, groupedRecipes) {
    const navList = document.getElementById('recipe-nav'); // Ensure you have a <ul> with this ID in your HTML
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
function handleGroupClick(groupName, groupedRecipes) {
    // Save the selected group to local storage
    localStorage.setItem('selectedGroup', groupName);

    // Display the recipes for the selected group
    displayRecipes(groupName, groupedRecipes);
    refreshRecipeNavHighlight(groupName, groupedRecipes);
}


// Call the load function when the page loads
window.onload = pageLoad;
