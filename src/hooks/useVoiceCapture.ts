import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';

import type { TranscriptResult, VoiceSessionState } from '@/types';

type UseVoiceCaptureOptions = {
  onFinalResult?: (result: TranscriptResult) => void;
};

type UseVoiceCaptureReturn = {
  state: VoiceSessionState;
  transcript: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
  isModuleAvailable: boolean;
  error: string | null;
};

const DEFAULT_LOCALE = Platform.select({
  ios: 'en-US',
  android: 'en-US',
  default: 'en-US',
});

export function useVoiceCapture(options: UseVoiceCaptureOptions = {}): UseVoiceCaptureReturn {
  const { onFinalResult } = options;
  const [state, setState] = useState<VoiceSessionState>('idle');
  const [transcript, setTranscript] = useState('');
  const [isModuleAvailable, setIsModuleAvailable] = useState(() =>
    ExpoSpeechRecognitionModule?.isRecognitionAvailable?.() ?? false,
  );
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
    setState('idle');
  }, []);

  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      if (nextAppState !== 'active' && state === 'listening') {
        ExpoSpeechRecognitionModule?.stop?.();
      }
    },
    [state],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  useSpeechRecognitionEvent('start', () => {
    setState('listening');
    startTimeRef.current = Date.now();
  });

  useSpeechRecognitionEvent('error', (event) => {
    setState('error');
    setError(event?.message ?? 'Speech recognition error');
    ExpoSpeechRecognitionModule.abort();
  });

  useSpeechRecognitionEvent('result', (event) => {
    const [first] = event.results;
    if (!first) {
      return;
    }

    setTranscript(first.transcript.trim());

    if (event.isFinal) {
      setState('processing');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const durationMs = startTimeRef.current ? Date.now() - startTimeRef.current : undefined;
      onFinalResult?.({
        transcript: first.transcript.trim(),
        confidence: first.confidence,
        durationMs,
      });
      startTimeRef.current = null;
      setState('idle');
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (state === 'listening') {
      setState('idle');
    }
  });

  useEffect(() => {
    setIsModuleAvailable(ExpoSpeechRecognitionModule?.isRecognitionAvailable?.() ?? false);
  }, []);

  const ensurePermissions = useCallback(async () => {
    if (!ExpoSpeechRecognitionModule?.getPermissionsAsync) {
      return false;
    }

    const { status } = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (status === 'granted') {
      return true;
    }

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return permission.status === 'granted';
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const permissionsGranted = await ensurePermissions();
    if (!permissionsGranted) {
      setError('Microphone permission is required.');
      setState('error');
      return;
    }

    if (!isModuleAvailable) {
      setError('Speech recognition is not available on this device.');
      setState('error');
      return;
    }

    try {
      if (!ExpoSpeechRecognitionModule?.start) {
        setError('Speech recognition is not supported on this device.');
        setState('error');
        return;
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      ExpoSpeechRecognitionModule.start({
        lang: DEFAULT_LOCALE,
        interimResults: true,
        addsPunctuation: true,
        requiresOnDeviceRecognition: true,
        maxAlternatives: 1,
        volumeChangeEventOptions: {
          enabled: true,
          intervalMillis: 180,
        },
      });
    } catch (startError) {
      console.error(startError);
      setError('Unable to start voice capture.');
      setState('error');
    }
  }, [ensurePermissions, isModuleAvailable]);

  const stop = useCallback(async () => {
    try {
      ExpoSpeechRecognitionModule?.stop?.();
    } catch (stopError) {
      console.error(stopError);
    }
  }, []);

  return {
    state,
    transcript,
    start,
    stop,
    reset,
    isModuleAvailable,
    error,
  };
}

