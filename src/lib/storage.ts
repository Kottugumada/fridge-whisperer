import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecipeInstructions } from '@/lib/spoonacular';

const STORAGE_KEYS = {
  RECIPES: '@fridgewhisperer:recipes',
  LAST_SESSION: '@fridgewhisperer:last-session',
};

export type StoredRecipe = {
  id: string;
  title: string;
  image?: string;
  ingredients: string[];
  instructions: string[];
  createdAt: number;
};

export type CachedRecipeSession = {
  recipe: RecipeInstructions;
  ingredients: string[];
  twist: string | null;
  capturedAt: number;
};

export async function getStoredRecipes(): Promise<StoredRecipe[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECIPES);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoredRecipe[];
    return parsed ?? [];
  } catch (error) {
    console.warn('Failed to parse stored recipes', error);
    return [];
  }
}

export async function saveRecipe(recipe: StoredRecipe): Promise<void> {
  const existing = await getStoredRecipes();
  const updated = [recipe, ...existing.filter(({ id }) => id !== recipe.id)];
  await AsyncStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(updated));
}

export async function deleteRecipe(id: string): Promise<void> {
  const existing = await getStoredRecipes();
  const updated = existing.filter((recipe) => recipe.id !== id);
  await AsyncStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(updated));
}

export async function setLastRecipeSession(session: CachedRecipeSession): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_SESSION, JSON.stringify(session));
}

export async function getLastRecipeSession(): Promise<CachedRecipeSession | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SESSION);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CachedRecipeSession;
  } catch (error) {
    console.warn('Failed to parse last recipe session', error);
    return null;
  }
}

