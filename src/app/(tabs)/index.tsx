import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, Switch, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

import { LoadingWave } from '@/components/LoadingWave';
import { RecipeCard } from '@/components/RecipeCard';
import { RecordButton } from '@/components/RecordButton';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { parseIngredients } from '@/lib/ingredients';
import { withRandomTwist } from '@/lib/randomTwist';
import {
  SpoonacularRateLimitError,
  findByIngredients,
  getRecipeInstructions,
  getRequestCount,
  type InstructionStep,
  type RecipeInstructions,
} from '@/lib/spoonacular';
import {
  getLastRecipeSession,
  getStoredRecipes,
  saveRecipe,
  setLastRecipeSession,
  type StoredRecipe,
} from '@/lib/storage';
import type { TranscriptResult } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const [lastCapture, setLastCapture] = useState<TranscriptResult | null>(null);
  const [twistEnabled, setTwistEnabled] = useState(false);
  const [twistPhrase, setTwistPhrase] = useState<string | null>(null);
  const [parsedIngredients, setParsedIngredients] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeInstructions | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitState, setRateLimitState] = useState<'ok' | 'warning' | 'limit'>('ok');
  const [requestsUsed, setRequestsUsed] = useState(0);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const speakRecipe = useCallback((recipe: RecipeInstructions) => {
    setActiveStep(null);
    const introSteps = recipe.steps.slice(0, 2).map((step) => step.step).join('. ');
    const narration = introSteps.length > 0 ? `${recipe.title}. ${introSteps}` : recipe.title;
    Speech.stop();
    Speech.speak(narration, {
      rate: 0.94,
      pitch: 0.98,
      language: 'en-US',
    });
  }, []);

  const updateRateLimitState = useCallback(() => {
    const count = getRequestCount();
    setRequestsUsed(count);
    if (count >= 50) {
      setRateLimitState('limit');
    } else if (count >= 40) {
      setRateLimitState('warning');
    } else {
      setRateLimitState('ok');
    }
  }, []);

  const handleFinalResult = useCallback(
    async (result: TranscriptResult) => {
      setLastCapture(result);
      setErrorMessage(null);
      setSaveError(null);
      setSaveBanner(null);
      const normalizedIngredients = parseIngredients(result.transcript);

      if (normalizedIngredients.length === 0) {
        setParsedIngredients([]);
        setSelectedRecipe(null);
        setTwistPhrase(null);
        setErrorMessage('We didn’t catch any ingredients. Try again a little slower.');
        return;
      }

      const { ingredients, twist } = withRandomTwist(normalizedIngredients, twistEnabled);
      setParsedIngredients(ingredients);
      setTwistPhrase(twist);
      setIsGenerating(true);
      setSelectedRecipe(null);

      const startedAt = Date.now();

      try {
        const matches = await findByIngredients(ingredients);
        updateRateLimitState();

        if (!matches.length) {
          setErrorMessage('No recipes matched those ingredients. Add one or two more items.');
          return;
        }

        const recipe = await getRecipeInstructions(matches[0].id);
        updateRateLimitState();

        const sanitizedSummary = recipe.summary
          ? recipe.summary.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
          : undefined;

        const normalizedRecipe = {
          ...recipe,
          summary: sanitizedSummary,
        };

        await setLastRecipeSession({
          recipe: normalizedRecipe,
          ingredients,
          twist,
          capturedAt: Date.now(),
        });

        setSelectedRecipe(normalizedRecipe);
        setActiveStep(null);
        setLastLatency(Date.now() - startedAt);
        speakRecipe(normalizedRecipe);
      } catch (err) {
        console.error(err);
        if (err instanceof SpoonacularRateLimitError) {
          setRateLimitState('limit');
          setErrorMessage('We maxed out today’s recipe quota. Try again tomorrow!');
        } else {
          setErrorMessage('Unable to reach Spoonacular right now. Check your connection and retry.');
        }
      } finally {
        setIsGenerating(false);
        updateRateLimitState();
      }
    },
    [speakRecipe, twistEnabled, updateRateLimitState],
  );

  const { state, transcript, start, stop, reset, error, isModuleAvailable } = useVoiceCapture({
    onFinalResult: handleFinalResult,
  });

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    updateRateLimitState();
  }, [updateRateLimitState]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const recipes = await getStoredRecipes();
        if (isMounted) {
          setSavedRecipeIds(recipes.map((recipe) => recipe.id));
        }
      } catch (loadError) {
        console.warn('Failed to load saved recipes', loadError);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const session = await getLastRecipeSession();
        if (session && isActive) {
          setSelectedRecipe(session.recipe);
          setParsedIngredients(session.ingredients);
          setTwistPhrase(session.twist);
          setActiveStep(null);
        }
      } catch (sessionError) {
        console.warn('Unable to restore last recipe session', sessionError);
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!saveBanner) {
      return;
    }

    const timeout = setTimeout(() => {
      setSaveBanner(null);
    }, 2600);

    return () => clearTimeout(timeout);
  }, [saveBanner]);

  const isListening = state === 'listening';
  const isBusy = isListening || isGenerating;

  const promptLabel = useMemo(() => {
    if (!isModuleAvailable) {
      return 'Speech recognition unavailable';
    }

    if (isGenerating) {
      return 'Crafting your recipe...';
    }

    switch (state) {
      case 'listening':
        return 'Listening... release to finish';
      case 'error':
        return 'Tap and hold to try again';
      default:
        return 'Hold to speak';
    }
  }, [isModuleAvailable, state]);

  const handlePressIn = () => {
    if (state === 'listening' || isGenerating) {
      return;
    }
    if (state === 'error' || state === 'processing') {
      reset();
    }
    void start();
  };

  const handlePressOut = () => {
    if (isListening) {
      void stop();
    }
  };

  const currentRecipeId = selectedRecipe ? String(selectedRecipe.id) : null;
  const isCurrentRecipeSaved = currentRecipeId ? savedRecipeIds.includes(currentRecipeId) : false;

  const handleSaveRecipe = useCallback(async () => {
    if (!selectedRecipe || !currentRecipeId) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const payload: StoredRecipe = {
      id: currentRecipeId,
      title: selectedRecipe.title,
      image: selectedRecipe.image,
      ingredients: parsedIngredients,
      instructions: selectedRecipe.steps.map((step) => step.step),
      createdAt: Date.now(),
    };

    try {
      await saveRecipe(payload);
      setSavedRecipeIds((previous) =>
        previous.includes(currentRecipeId) ? previous : [currentRecipeId, ...previous],
      );
      setSaveBanner('Saved to your cookbook');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (saveErr) {
      console.error(saveErr);
      setSaveError('Could not save recipe. Please retry.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  }, [currentRecipeId, parsedIngredients, selectedRecipe]);

  const handleStepSpeak = useCallback(
    (step: InstructionStep) => {
      if (activeStep === step.number) {
        Speech.stop();
        setActiveStep(null);
        return;
      }

      Speech.stop();
      setActiveStep(step.number);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Speech.speak(step.step, {
        rate: 0.96,
        pitch: 1,
        onDone: () => setActiveStep(null),
      });
    },
    [activeStep],
  );

  const requestsRemaining = Math.max(50 - requestsUsed, 0);
  const rateLabel = {
    ok: `${requestsRemaining} recipe calls left today`,
    warning: `Heads up: ${requestsRemaining} calls before we max out`,
    limit: 'Daily Spoonacular limit reached',
  }[rateLimitState];

  const rateToneClass = {
    ok: 'text-text-mid',
    warning: 'text-status-warning',
    limit: 'text-status-danger',
  }[rateLimitState];

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView
        className="flex-1 px-6"
        contentContainerClassName="flex-1 gap-10 py-12"
        bounces={false}
      >
        <View className="w-full items-start gap-6">
          <View className="w-full flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="font-display text-3xl text-text-high">Fridge Whisperer</Text>
              <Text className="mt-2 font-body text-base text-text-mid">
            Tell us what&apos;s inside your fridge. We&apos;ll craft a recipe in seconds.
              </Text>
            </View>
            <View className="items-end">
              <Text className={`font-body text-xs uppercase tracking-[0.14em] ${rateToneClass}`}>
                {rateLabel}
              </Text>
              {lastLatency ? (
                <Text className="mt-1 font-body text-xs text-text-low">
                  {Math.round(lastLatency / 100) / 10}s last fetch
                </Text>
              ) : null}
            </View>
          </View>

          <View className="w-full flex-row items-center justify-between rounded-card border border-white/6 bg-bg-surface/50 px-5 py-4">
            <View className="flex-1 pr-3">
              <Text className="font-title text-lg text-text-high">Chaos Mode</Text>
              <Text className="mt-1 font-body text-sm text-text-mid">
                Toss in a random twist ingredient for a chef’s-kiss surprise.
              </Text>
            </View>
            <Switch
              value={twistEnabled}
              onValueChange={setTwistEnabled}
              thumbColor={twistEnabled ? '#2CFF7A' : '#6E778A'}
              trackColor={{ true: 'rgba(44,255,122,0.45)', false: 'rgba(110,119,138,0.4)' }}
              ios_backgroundColor="rgba(110,119,138,0.4)"
            />
          </View>
        </View>

        <RecordButton
          disabled={!isModuleAvailable}
          isRecording={isListening}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          label={promptLabel}
        />

        <View className="w-full items-stretch gap-6">
          {isBusy ? (
            <LoadingWave />
          ) : (
            <View className="w-full min-h-[120px] rounded-card border border-white/6 bg-bg-surface/60 p-5">
              {transcript ? (
                <Text className="font-body text-lg text-text-high">{transcript}</Text>
              ) : (
                <Text className="font-body text-base text-text-mid">
                  Hold the mic and list ingredients like “chicken, rice, sad broccoli”.
                </Text>
              )}
            </View>
          )}
          {lastCapture ? (
            <View className="w-full rounded-card border border-accent-primary/20 bg-bg-surface/70 p-5">
              <Text className="font-title text-xl text-text-high">Latest capture</Text>
              <Text className="mt-2 font-body text-base text-text-mid">{lastCapture.transcript}</Text>
              {twistPhrase ? (
                <Text className="mt-4 font-body text-sm text-accent-secondary">
                  Twist unlocked: {twistPhrase}
                </Text>
              ) : null}
            </View>
          ) : null}

          {parsedIngredients.length ? (
            <View className="rounded-card border border-white/4 bg-bg-surface/40 p-5">
              <Text className="font-title text-lg text-text-high">Ingredient lineup</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {parsedIngredients.map((item) => (
                  <View key={item} className="rounded-chip bg-bg-primary/80 px-4 py-2">
                    <Text className="font-body text-sm text-text-high">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {selectedRecipe ? (
            <View className="gap-4">
              <RecipeCard
                title={selectedRecipe.title}
                image={selectedRecipe.image}
                description={selectedRecipe.summary}
                steps={selectedRecipe.steps}
                activeStep={activeStep}
                onStepPress={handleStepSpeak}
              />
              <View className="flex-row flex-wrap items-center gap-3">
                <Pressable
                  disabled={isCurrentRecipeSaved || isSaving}
                  onPress={handleSaveRecipe}
                  className={`rounded-full px-6 py-3 ${
                    isCurrentRecipeSaved
                      ? 'bg-accent-primary/20'
                      : 'bg-accent-primary'
                  } ${isSaving ? 'opacity-70' : ''}`}
                >
                  <Text
                    className={`font-title text-sm uppercase tracking-[0.2em] ${
                      isCurrentRecipeSaved ? 'text-accent-primary' : 'text-bg-primary'
                    }`}
                  >
                    {isCurrentRecipeSaved ? 'Saved' : isSaving ? 'Saving...' : 'Save to Cookbook'}
                  </Text>
                </Pressable>
                <Pressable
                  className="rounded-full border border-white/12 px-6 py-3"
                  onPress={() => router.push('/(tabs)/cookbook')}
                >
                  <Text className="font-body text-sm uppercase tracking-[0.18em] text-text-mid">
                    Open Cookbook
                  </Text>
                </Pressable>
              </View>
              {saveBanner ? (
                <Text className="font-body text-sm text-status-success">{saveBanner}</Text>
              ) : null}
              {saveError ? (
                <Text className="font-body text-sm text-status-danger">{saveError}</Text>
              ) : null}
            </View>
          ) : null}

          {error || errorMessage ? (
            <Text className="font-body text-sm text-status-danger">
              {errorMessage ?? error} Tap and hold the mic to retry.
            </Text>
          ) : null}

          {!selectedRecipe ? (
            <Pressable
              className="mt-2 self-center rounded-full border border-white/12 px-6 py-3"
              onPress={() => router.push('/(tabs)/cookbook')}
            >
              <Text className="font-body text-sm uppercase tracking-[0.18em] text-text-mid">
                Open Cookbook
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

