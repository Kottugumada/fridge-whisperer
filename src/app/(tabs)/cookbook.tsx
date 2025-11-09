import { useCallback, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

import { LoadingWave } from '@/components/LoadingWave';
import { deleteRecipe, getStoredRecipes, type StoredRecipe } from '@/lib/storage';

function formatSavedDate(timestamp: number): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    return formatter.format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

export default function CookbookScreen() {
  const [recipes, setRecipes] = useState<StoredRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadRecipes = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await getStoredRecipes();
          if (isActive) {
            setRecipes(data);
          }
        } catch (loadError) {
          console.error(loadError);
          if (isActive) {
            setError('Could not load your cookbook. Pull down to refresh.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      void loadRecipes();

      return () => {
        isActive = false;
        Speech.stop();
      };
    }, []),
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteRecipe(id);
      setRecipes((current) => current.filter((recipe) => recipe.id !== id));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (deleteError) {
      console.error(deleteError);
      setError('Failed to remove recipe. Try again.');
    }
  }, []);

  const handlePlay = useCallback(
    (recipe: StoredRecipe) => {
      if (playingId === recipe.id) {
        Speech.stop();
        setPlayingId(null);
        return;
      }

      Speech.stop();
      setPlayingId(recipe.id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Speech.speak(
        `${recipe.title}. ${recipe.instructions.slice(0, 3).join('. ')}`,
        {
          rate: 0.92,
          pitch: 1,
          onDone: () => setPlayingId(null),
        },
      );
    },
    [playingId],
  );

  const renderItem = ({ item }: { item: StoredRecipe }) => (
    <View className="rounded-card border border-white/8 bg-bg-surface/70 p-5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="font-title text-xl text-text-high">{item.title}</Text>
          <Text className="mt-1 font-body text-xs uppercase tracking-[0.18em] text-text-low">
            Saved {formatSavedDate(item.createdAt)}
          </Text>
        </View>
        <Pressable
          onPress={() => handlePlay(item)}
          className={`rounded-full px-4 py-2 ${
            playingId === item.id ? 'bg-accent-secondary/30' : 'bg-accent-primary/20'
          }`}
        >
          <Text className="font-body text-xs uppercase tracking-[0.2em] text-accent-primary">
            {playingId === item.id ? 'Stop' : 'Play'}
          </Text>
        </Pressable>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {item.ingredients.map((ingredient) => (
          <View key={`${item.id}-${ingredient}`} className="rounded-chip bg-bg-primary/80 px-3 py-2">
            <Text className="font-body text-xs text-text-high">{ingredient}</Text>
          </View>
        ))}
      </View>

      <View className="mt-4 flex-row justify-end">
        <Pressable
          onPress={() => handleDelete(item.id)}
          className="rounded-full border border-status-warning/40 px-4 py-2"
        >
          <Text className="font-body text-xs uppercase tracking-[0.2em] text-status-warning">
            Remove
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-primary px-6 py-10">
      <Text className="font-display text-3xl text-text-high">Cookbook</Text>
      <Text className="mt-2 font-body text-base text-text-mid">
        Replay saved recipes anytime, even offline.
      </Text>

      {isLoading ? (
        <View className="mt-16 items-center justify-center">
          <LoadingWave />
          <Text className="mt-4 font-body text-sm text-text-mid">Loading your saved magic...</Text>
        </View>
      ) : (
        <FlatList
          className="mt-6"
          data={recipes}
          keyExtractor={(item) => item.id}
          contentContainerClassName={recipes.length ? 'pb-24' : 'flex-1 justify-center'}
          ItemSeparatorComponent={() => <View className="h-4" />}
          renderItem={renderItem}
          ListEmptyComponent={
            <View className="items-center gap-3">
              <Text className="font-title text-xl text-text-high">Nothing here yet</Text>
              <Text className="max-w-xs text-center font-body text-base text-text-mid">
                Capture a recipe on the Mic tab and tap “Save to Cookbook”.
              </Text>
            </View>
          }
        />
      )}

      {error ? (
        <Text className="mt-4 text-center font-body text-sm text-status-danger">{error}</Text>
      ) : null}
    </SafeAreaView>
  );
}

