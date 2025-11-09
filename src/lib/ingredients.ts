const FILLER_PATTERNS = [
  /my fridge has/gi,
  /there (is|are)/gi,
  /i (have|got)/gi,
  /please make/gi,
  /something with/gi,
  /uh/gi,
  /um/gi,
  /like/gi,
];

const SPLIT_PATTERN = /[,.;\n]| and /gi;

export function parseIngredients(transcript: string): string[] {
  const cleaned = FILLER_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, ' '),
    transcript.toLowerCase(),
  );

  const tokens = cleaned
    .split(SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  const unique = new Set<string>();
  for (const token of tokens) {
    const normalized = token.replace(/[^a-z0-9\s-]/gi, '').trim();
    if (normalized.length > 0) {
      unique.add(normalized);
    }
  }

  return Array.from(unique);
}

