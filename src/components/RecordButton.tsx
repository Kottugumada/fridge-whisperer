import { memo, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type RecordButtonProps = {
  label?: string;
  isRecording?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
};

function RecordButtonComponent({
  label = 'Hold to speak',
  isRecording = false,
  onPressIn,
  onPressOut,
  disabled,
}: RecordButtonProps) {
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.6);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 520 }), withTiming(1.02, { duration: 520 })),
        -1,
        true,
      );
      glow.value = withTiming(1, { duration: 240 });
    } else {
      pulse.value = withTiming(1, { duration: 220 });
      glow.value = withTiming(0.6, { duration: 220 });
    }
  }, [glow, isRecording, pulse]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View className="items-center">
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={[haloStyle, { height: 256, width: 256 }]}
        className="absolute rounded-full bg-accent-primary/20 blur-2xl"
      />
      <Animated.View
        entering={FadeIn.duration(240)}
        exiting={FadeOut.duration(180)}
        style={animatedRingStyle}
        className="h-52 w-52 items-center justify-center rounded-full border border-accent-primary/30 bg-bg-surface/70"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: isRecording }}
          accessibilityLabel={label}
          disabled={disabled}
          className="h-44 w-44 items-center justify-center rounded-full bg-bg-primary/80"
          android_ripple={{ color: 'rgba(44,255,122,0.32)', radius: 200 }}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <View
            className={`h-36 w-36 items-center justify-center rounded-full ${
              isRecording ? 'bg-accent-primary/80' : 'bg-accent-primary/60'
            } shadow-glow`}
          >
            <View className="h-16 w-16 rounded-full bg-bg-primary/80" />
          </View>
        </Pressable>
      </Animated.View>
      <Text className="mt-6 font-body text-base text-text-mid">{label}</Text>
      {!disabled ? null : (
        <View
          className="mt-2 rounded-full bg-status-warning/20 px-4 py-2"
          accessibilityLiveRegion="polite"
        >
          <Text className="font-body text-sm uppercase tracking-wider text-status-warning">
            Enable speech recognition to continue
          </Text>
        </View>
      )}
    </View>
  );
}

export const RecordButton = memo(RecordButtonComponent);

