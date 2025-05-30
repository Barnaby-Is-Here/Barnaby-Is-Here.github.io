import { supabase } from './src/supabaseClient.js';

class RecipeManager {
    #subscribers = [];
    #groupedRecipes = [];

    constructor() {
        if (!RecipeManager.instance) {
            console.log("New Recipe Manager.");
            RecipeManager.instance = this;
            this.init();
        }
        return RecipeManager.instance;
    }

    async getRecipe(path, recipeName) {
        try {
            const { data, error } = await supabase
                .from('recipes')
                .select('*')
                .eq('path', path)
                .eq('name', recipeName)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching recipe:', error);
            return null;
        }
    }

    get groupNames() {
        return Object.keys(this.#groupedRecipes);
    }

    set groupedRecipes(newGroupedRecipes) {
        this.#groupedRecipes = newGroupedRecipes;
        this.notifySubscribers();
    }

    get groupedRecipes() {
        return this.#groupedRecipes;
    }

    subscribeToUpdates(callback) {
        this.#subscribers.push(callback);
    }

    notifySubscribers() {
        this.#subscribers.forEach(callback => callback(this.groupedRecipes));
    }

    async init() {
        await this.fetchRecipes();
    }

    async fetchRecipes() {
        try {
            const { data, error } = await supabase
                .from('recipes')
                .select('*');

            if (error) throw error;

            // Group the recipes by path
            const grouped = data.reduce((acc, recipe) => {
                const path = recipe.path;
                if (!acc[path]) {
                    acc[path] = [];
                }
                acc[path].push(recipe);
                return acc;
            }, {});

            this.groupedRecipes = grouped;
        } catch (error) {
            console.error('Error fetching recipes:', error);
        }
    }

    async addRecipe(recipe) {
        try {
            // Handle image upload first if there's a photo
            let photoUrl = null;
            if (recipe.photo) {
                const { data, error } = await supabase.storage
                    .from('recipe-photos')
                    .upload(`${Date.now()}-${recipe.photo.name}`, recipe.photo);

                if (error) throw error;
                photoUrl = data.path;
            }

            // Insert recipe data
            const { data, error } = await supabase
                .from('recipes')
                .insert([{
                    name: recipe.name,
                    path: recipe.path,
                    ingredients: recipe.ingredients,
                    method: recipe.method,
                    tags: recipe.tags,
                    photo_url: photoUrl
                }]);

            if (error) throw error;

            // Refresh recipes
            await this.fetchRecipes();
            return data;
        } catch (error) {
            console.error('Error adding recipe:', error);
            throw error;
        }
    }

    async updateRecipe(recipe) {
        try {
            const { data, error } = await supabase
                .from('recipes')
                .update({
                    name: recipe.name,
                    path: recipe.path,
                    ingredients: recipe.ingredients,
                    method: recipe.method,
                    tags: recipe.tags
                })
                .eq('name', recipe.name)
                .eq('path', recipe.path);

            if (error) throw error;

            // Refresh recipes
            await this.fetchRecipes();
            return data;
        } catch (error) {
            console.error('Error updating recipe:', error);
            throw error;
        }
    }

    async deleteRecipe(path, name) {
        try {
            const { error } = await supabase
                .from('recipes')
                .delete()
                .eq('path', path)
                .eq('name', name);

            if (error) throw error;

            // Refresh recipes
            await this.fetchRecipes();
        } catch (error) {
            console.error('Error deleting recipe:', error);
            throw error;
        }
    }
}

const recipeManager = new RecipeManager();
Object.freeze(recipeManager);
export default recipeManager;