import { getSupabaseClient } from '../supabase-client.js';

function mapRecipeRowToAppRecipe(row) {
  return {
    Id: row.id,
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
      .select('id, name, path, ingredients, method, tags, picture_url, created_at, updated_at')
      .order('path', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to load recipes from Supabase: ${error.message}`);
    }

    return Array.isArray(data)
      ? data.map(mapRecipeRowToAppRecipe)
      : [];
  }
}
