import { TWIST_INGREDIENTS } from '@/constants/twists';

export function randomTwist(enableTwist: boolean): string | null {
  if (!enableTwist || TWIST_INGREDIENTS.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * TWIST_INGREDIENTS.length);
  return TWIST_INGREDIENTS[index];
}

export function withRandomTwist(
  sourceIngredients: string[],
  enableTwist: boolean,
): { ingredients: string[]; twist: string | null } {
  const twist = randomTwist(enableTwist);
  if (!twist) {
    return { ingredients: sourceIngredients, twist: null };
  }

  return { ingredients: [...sourceIngredients, twist], twist };
}

