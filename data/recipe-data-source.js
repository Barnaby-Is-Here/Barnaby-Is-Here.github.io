import { defaultRecipeProviderName } from './supabase-config.js';
import { SupabaseRecipeDataSource } from './sources/supabase-recipe-data-source.js';

const providerFactories = {
  supabase: () => new SupabaseRecipeDataSource()
};

export function createRecipeDataSource(providerName = defaultRecipeProviderName) {
  const createProvider = providerFactories[providerName];

  if (!createProvider) {
    throw new Error(`Unknown recipe data provider: ${providerName}`);
  }

  return createProvider();
}
