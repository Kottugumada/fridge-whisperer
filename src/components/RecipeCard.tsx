import { memo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { InstructionStep } from '@/lib/spoonacular';

type RecipeCardProps = {
  title: string;
  image?: string;
  description?: string;
  steps?: InstructionStep[];
  onStepPress?: (step: InstructionStep) => void;
  activeStep?: number | null;
};

function RecipeCardComponent({
  title,
  image,
  description,
  steps = [],
  onStepPress,
  activeStep,
}: RecipeCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View className="w-full overflow-hidden rounded-card border border-white/8 bg-bg-surface/90 p-6">
      {image ? (
        <Image
          source={{ uri: image }}
          className="mb-4 h-48 w-full rounded-3xl"
          resizeMode="cover"
        />
      ) : null}
      <Text className="font-title text-2xl text-text-high">{title}</Text>
      {description ? (
        <Text className="mt-3 font-body text-base text-text-mid" numberOfLines={4}>
          {description}
        </Text>
      ) : null}

      {steps.length ? (
        <View className="mt-5">
          <Pressable
            className="flex-row items-center justify-between rounded-card bg-bg-primary/60 px-4 py-3"
            onPress={() => setExpanded((prev) => !prev)}
          >
            <Text className="font-title text-base text-text-high">
              Steps {expanded ? '−' : '+'}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#2CFF7A"
            />
          </Pressable>

          {expanded ? (
            <View className="mt-3 gap-3">
              {steps.map((step) => (
                <Pressable
                  key={`step-${step.number}`}
                  className={`flex-row items-center gap-3 rounded-card border border-white/6 bg-bg-primary/70 px-4 py-3 ${
                    activeStep === step.number ? 'border-accent-primary/60' : ''
                  }`}
                  onPress={() => onStepPress?.(step)}
                >
                  <View className="flex-1 pr-3">
                    <Text className="font-title text-sm text-text-high">
                      Step {step.number}
                    </Text>
                    <Text className="mt-1 font-body text-sm leading-5 text-text-mid">
                      {step.step}
                    </Text>
                  </View>
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-full border ${
                      activeStep === step.number
                        ? 'border-accent-primary bg-accent-primary/25'
                        : 'border-white/12 bg-bg-primary/60'
                    }`}
                  >
                    <Ionicons
                      name={activeStep === step.number ? 'pause' : 'play'}
                      size={16}
                      color="#2CFF7A"
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const RecipeCard = memo(RecipeCardComponent);

