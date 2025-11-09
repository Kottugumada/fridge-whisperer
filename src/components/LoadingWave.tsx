import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type LoadingWaveProps = {
  tone?: 'accent' | 'neutral';
};

type BarProps = {
  delay: number;
  tone: 'accent' | 'neutral';
};

function WaveBar({ delay, tone }: BarProps) {
  const height = useSharedValue(12);

  useEffect(() => {
    height.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(36, { duration: 320 }),
          withTiming(12, { duration: 320 }),
        ),
        -1,
        true,
      ),
    );
  }, [delay, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      className={`w-3 rounded-full ${tone === 'accent' ? 'bg-accent-primary/90 shadow-glow' : 'bg-text-mid/40'}`}
      style={animatedStyle}
    />
  );
}

function LoadingWaveComponent({ tone = 'accent' }: LoadingWaveProps) {
  return (
    <View className="h-10 flex-row items-end gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <WaveBar key={`wave-${index}`} delay={index * 140} tone={tone} />
      ))}
    </View>
  );
}

export const LoadingWave = memo(LoadingWaveComponent);

