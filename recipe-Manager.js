import { createRecipeDataSource } from './data/recipe-data-source.js';

class RecipeManager {

    #subscribers = [];
    #recipes = [];
    #groupedRecipes = {};
    #recipeDataSource = createRecipeDataSource();

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
        return Object.keys(this.#groupedRecipes);
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
        this.groupedRecipes = this.getCachedGroups() ?? {};

        const latestRecipes = await this.fetchRecipes();
        if (latestRecipes === null) {
            return;
        }

        const nextGroupedRecipes = this.groupRecipes(latestRecipes);
        if (JSON.stringify(nextGroupedRecipes) !== JSON.stringify(this.groupedRecipes)) {
            this.groupedRecipes = nextGroupedRecipes;
            this.saveGroupsToCache();
        }
    }

    async fetchRecipes() {
        try {
            this.#recipes = await this.#recipeDataSource.listRecipes();
            console.log('Fetched recipes from provider:', this.#recipes);
            return this.#recipes;
        } catch (error) {
            console.error('Error fetching recipes from provider:', error);
            this.#recipes = [];
            return null;
        }
    }

    // Function to group recipes by their Path
    groupRecipes(recipes) {
        if (!Array.isArray(recipes) || recipes.length === 0) {
            return {};
        }

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
