class RecipeManager {

    #subscribers = [];
    #recipes = []; // Store all recipe data
    #recipePhotoLinks = [];
    #combinedRecipes = [];
    #groupedRecipes = [];
    #newGroupedRecipes = [];

    constructor() {
      if (!RecipeManager.instance) {
        console.log("New Recipe Manager.");
        RecipeManager.instance = this;

        this.init();
      }
      return RecipeManager.instance;
    }

    // Function to find recipe
    getRecipe(path, recipeName) {
        const recipesInPath = this.#groupedRecipes[path]; // Get the array for the specified path (e.g., "Japanese")

        if (recipesInPath) {
            // Find the recipe by name
            const recipe = recipesInPath.find(r => r.Name === recipeName);
            return recipe || null; // Return the recipe or null if not found
        }
        
        return null; // Return null if path doesn't exist
    }

    get groupNames()
    {
        return 
    }

    set groupedRecipes(newGroupedRecipes)
    {
        this.#groupedRecipes = newGroupedRecipes;
        this.notifySubscribers();
    }

    get groupedRecipes()
    {
        return this.#groupedRecipes;
    }

    subscribeToUpdates(callback)
    {
        this.#subscribers.push(callback);
    }

    notifySubscribers()
    {
        this.#subscribers.forEach(callback => callback(this.groupedRecipes))
    }

    async init() {
        this.groupedRecipes = this.getCachedGroups();
        await this.fetchDataInParallel();
        if (this.#combinedRecipes) {
            this.#newGroupedRecipes = this.groupRecipes(this.#combinedRecipes);
    
            // Step 6: Compare the new data to old
            if (JSON.stringify(this.#newGroupedRecipes) !== JSON.stringify(this.groupedRecipes)) {
                this.groupedRecipes = this.#newGroupedRecipes;
                this.saveGroupsToCache();
            }
        }
    }

    // Handle google api.
    // Function to fetch new recipes from the API
    async fetchNewRecipes() {
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
    async fetchNewImages() {
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

    async fetchDataInParallel() {
        try {
            // Start both fetch requests without awaiting
            const recipesPromise = this.fetchNewRecipes();
            const imagesPromise = this.fetchNewImages();

            // Wait for both promises to resolve
            [this.#recipes, this.#recipePhotoLinks] = await Promise.all([recipesPromise, imagesPromise]);

            // Combine
            this.#combinedRecipes = this.combineRecipesWithImages(this.#recipes, this.#recipePhotoLinks)
            console.log('Fetched Data:', this.#combinedRecipes);

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // Function to combine recipes and images
    combineRecipesWithImages(recipes, images) {
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
    groupRecipes(recipes) {
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

    // Function to get cached groups
    getCachedGroups() {
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
    saveGroupsToCache() {
        localStorage.setItem('groupedRecipes', JSON.stringify(this.groupedRecipes));
        console.log('Saved grouped recipes to cache:', this.groupedRecipes);
    }
}

// Class end
const recipeManager = new RecipeManager();
Object.freeze(recipeManager);
export default recipeManager;