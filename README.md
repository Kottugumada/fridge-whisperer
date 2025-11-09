# Fridge Whisperer

Voice-first recipe inspiration that works offline after the first launch.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   Update the file with your Spoonacular API key:
   ```env
   EXPO_PUBLIC_SPOONACULAR_KEY=your_key_here
   ```
3. **Run the app**
   ```bash
   npm run start
   ```

## Project Structure

```
src/
  app/              Expo Router routes (tabs, layouts)
  components/       Shared UI primitives
  constants/        Design tokens and twist lists
  lib/              API clients and storage helpers
  types/            Shared TypeScript definitions
```

## Styling

- NativeWind (Tailwind for React Native) powers styling with the project’s neon glass aesthetic.
- Tailwind tokens align with Apple HIG and Material 3 typography, spacing, and motion guidance.

## Voice & Audio

- Speech recognition uses `expo-speech-recognition` and will gracefully fall back when microphones are unavailable.
- Text-to-speech is backed by `expo-speech` and `expo-av` for granular control over playback.

## Native Modules

This project uses Expo SDK 51 with the new architecture enabled. After installing dependencies, run the Expo prebuild if you need native builds:

```bash
npx expo prebuild
```

Then build platform-specific bundles with Expo Application Services:

```bash
npx eas build --profile preview --platform ios
npx eas build --profile preview --platform android
```

