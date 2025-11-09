import { Platform } from 'react-native';

const BASE_URL = 'https://api.spoonacular.com';

export type IngredientMatch = {
  id: number;
  title: string;
  image: string;
  missedIngredientCount: number;
};

export type InstructionStep = {
  number: number;
  step: string;
};

export type RecipeInstructions = {
  id: number;
  title: string;
  image: string;
  summary?: string;
  steps: InstructionStep[];
};

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_SPOONACULAR_KEY;
  if (!key) {
    throw new Error('Missing Spoonacular API key. Set EXPO_PUBLIC_SPOONACULAR_KEY in your .env file.');
  }

  return key;
}

type RequestOptions = {
  cacheKey?: string;
  ttlMs?: number;
};

type CachedEntry<T> = {
  value: T;
  expiresAt: number;
};

const responseCache = new Map<string, CachedEntry<unknown>>();
let requestCount = 0;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 800;

function resolveCache<T>(key?: string): T | null {
  if (!key) {
    return null;
  }

  const entry = responseCache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }

  return entry.value as T;
}

function persistCache<T>(key: string | undefined, data: T, ttlMs: number | undefined) {
  if (!key) {
    return;
  }

  responseCache.set(key, {
    value: data,
    expiresAt: Date.now() + (ttlMs ?? 5 * 60 * 1000),
  });
}

async function sleep(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function request<T>(path: string, init?: RequestInit, options: RequestOptions = {}): Promise<T> {
  const apiKey = getApiKey();
  const url = new URL(path, BASE_URL);
  url.searchParams.set('apiKey', apiKey);

  const cached = resolveCache<T>(options.cacheKey);
  if (cached) {
    return cached;
  }

  let attempt = 0;
  let lastError: unknown;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(url.toString(), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `FridgeWhisperer/${Platform.OS}`,
          ...(init?.headers ?? {}),
        },
      });
      requestCount += 1;

      if (response.status === 429) {
        throw new SpoonacularRateLimitError('Rate limit exceeded');
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to fetch Spoonacular data');
      }

      const data = (await response.json()) as T;
      persistCache(options.cacheKey, data, options.ttlMs);
      return data;
    } catch (error) {
      lastError = error;
      if (!(error instanceof SpoonacularRateLimitError)) {
        break;
      }

      const waitTime = BASE_BACKOFF_MS * 2 ** attempt;
      await sleep(waitTime);
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown Spoonacular error');
}

export async function findByIngredients(ingredients: string[]): Promise<IngredientMatch[]> {
  if (ingredients.length === 0) {
    return [];
  }

  const params = new URLSearchParams({
    ingredients: ingredients.join(','),
    number: '5',
    ranking: '1',
  });

  return request<IngredientMatch[]>(
    `/recipes/findByIngredients?${params.toString()}`,
    undefined,
    {
      cacheKey: `ingredients:${params.toString()}`,
      ttlMs: 30 * 1000,
    },
  );
}

type InstructionResponse = Array<{
  steps?: Array<{ number: number; step: string }>;
}>;

export async function getRecipeInstructions(recipeId: number): Promise<RecipeInstructions> {
  const recipe = await request<{
    id: number;
    title: string;
    image: string;
    summary: string;
  }>(`/recipes/${recipeId}/information`, undefined, {
    cacheKey: `information:${recipeId}`,
    ttlMs: 5 * 60 * 1000,
  });

  const instructions = await request<InstructionResponse>(
    `/recipes/${recipeId}/analyzedInstructions`,
    undefined,
    {
      cacheKey: `instructions:${recipeId}`,
      ttlMs: 5 * 60 * 1000,
    },
  );

  const steps =
    instructions?.flatMap(({ steps }) => steps ?? [])?.map((step) => ({
      number: step.number,
      step: step.step,
    })) ?? [];

  return {
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    summary: recipe.summary,
    steps,
  };
}

export class SpoonacularRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpoonacularRateLimitError';
  }
}

export function getRequestCount(): number {
  return requestCount;
}

export function resetRequestCount() {
  requestCount = 0;
  responseCache.clear();
}

