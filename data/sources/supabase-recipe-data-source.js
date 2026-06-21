import { getSupabaseClient } from '../supabase-client.js';

function mapRecipeRowToAppRecipe(row) {
  return {
    Id: row.id,
    AuthorId: row.author_id ?? null,
    Name: row.name,
    Path: row.path,
    Ingredients: row.ingredients,
    Method: row.method,
    Tags: row.tags ?? '',
    Picture: row.picture_url ?? null,
    CreatedAt: row.created_at ?? null,
    UpdatedAt: row.updated_at ?? null
  };
}

export class SupabaseRecipeDataSource {
  async listRecipes() {
    const { data, error } = await getSupabaseClient()
      .from('recipes')
      .select('id, author_id, name, path, ingredients, method, tags, picture_url, created_at, updated_at')
      .order('path', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to load recipes from Supabase: ${error.message}`);
    }

    return Array.isArray(data)
      ? data.map(mapRecipeRowToAppRecipe)
      : [];
  }

  async saveRecipe(recipe) {
    const payload = {
      name: recipe.name.trim(),
      path: recipe.path.trim(),
      ingredients: recipe.ingredients.trim(),
      method: recipe.method.trim(),
      tags: recipe.tags.trim(),
      picture_url: recipe.pictureUrl ? recipe.pictureUrl.trim() : null
    };

    if (recipe.id) {
      const { data, error } = await getSupabaseClient()
        .from('recipes')
        .update(payload)
        .eq('id', recipe.id)
        .select('id, author_id, name, path, ingredients, method, tags, picture_url, created_at, updated_at')
        .single();

      if (error) {
        throw new Error(`Failed to update recipe in Supabase: ${error.message}`);
      }

      return mapRecipeRowToAppRecipe(data);
    }

    const { data, error } = await getSupabaseClient()
      .from('recipes')
      .insert(payload)
      .select('id, author_id, name, path, ingredients, method, tags, picture_url, created_at, updated_at')
      .single();

    if (error) {
      throw new Error(`Failed to create recipe in Supabase: ${error.message}`);
    }

    return mapRecipeRowToAppRecipe(data);
  }

  async deleteRecipe(recipeId) {
    const { error } = await getSupabaseClient()
      .from('recipes')
      .delete()
      .eq('id', recipeId);

    if (error) {
      throw new Error(`Failed to delete recipe from Supabase: ${error.message}`);
    }
  }
}
