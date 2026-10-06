import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { api } from '@/api';
import { toLocalDateKey } from '@/api/weightDate';
import { AppScreen } from '@/components/app-screen';
import { BrandMark } from '@/components/brand-mark';
import { Card } from '@/components/ui/Card';
import { OutlineButton } from '@/components/ui/OutlineButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LEVEL_OPTIONS = [1, 2, 3, 4, 5];

function LevelSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (level: number | null) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two }}>
      {LEVEL_OPTIONS.map((level) => {
        const isSelected = value === level;

        return (
          <TouchableOpacity
            key={level}
            onPress={() => onChange(isSelected ? null : level)}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: isSelected ? theme.accent : theme.border,
              backgroundColor: isSelected ? theme.accent : 'transparent',
              borderRadius: Spacing.two,
              paddingVertical: Spacing.three,
              alignItems: 'center',
            }}
          >
            <ThemedText type="smallBold" style={{ color: isSelected ? '#000' : theme.text }}>
              {level}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function LogWellbeingScreen() {
  const theme = useTheme();

  const [sleepHours, setSleepHours] = useState('');
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [fatigueLevel, setFatigueLevel] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadBlocked, setIsLoadBlocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadExisting = useCallback(async () => {
    setIsLoading(true);
    setIsLoadBlocked(false);
    setErrorMessage(null);
    try {
      const entries = await api.getWellbeingHistory();
      const today = entries.find((entry) => entry.recordedOn === toLocalDateKey());
      if (today) {
        setSleepHours(today.sleepHours === null ? '' : String(today.sleepHours));
        setStressLevel(today.stressLevel);
        setFatigueLevel(today.fatigueLevel);
      }
    } catch (error) {
      setIsLoadBlocked(true);
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible cargar el registro.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadExisting(); }, [loadExisting]);

  const parsedSleepHours = sleepHours.trim() ? Number(sleepHours.replace(',', '.')) : null;
  const isSleepValid = parsedSleepHours === null || (
    Number.isFinite(parsedSleepHours) && parsedSleepHours >= 0 && parsedSleepHours <= 24
  );
  const hasAnyValue = parsedSleepHours !== null || stressLevel !== null || fatigueLevel !== null;

  const handleSave = async () => {
    if (!hasAnyValue || !isSleepValid || isLoading || isLoadBlocked) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await api.saveWellbeingEntry(toLocalDateKey(), {
        sleepHours: parsedSleepHours,
        stressLevel,
        fatigueLevel,
      });
      router.replace('/(tabs)/progress');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible guardar el registro.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppScreen scroll keyboardShouldPersistTaps="handled">
      <BrandMark centered compact />

      <ThemedText type="title" style={{ marginTop: Spacing.three }}>Bienestar de hoy</ThemedText>
      <ThemedText themeColor="textSecondary" type="small" style={{ marginTop: Spacing.one }}>
        Completa al menos un campo. Puedes actualizar el registro de hoy más tarde.
      </ThemedText>

      {isLoading && <ActivityIndicator color={theme.accent} style={{ marginTop: Spacing.four }} />}
      {errorMessage && (
        <>
          <ThemedText style={{ color: '#ef4444', marginTop: Spacing.three }}>{errorMessage}</ThemedText>
          {isLoadBlocked && <OutlineButton label="Reintentar" onPress={() => void loadExisting()} style={{ marginTop: Spacing.two }} />}
        </>
      )}

      <ThemedText type="smallBold" style={{ marginTop: Spacing.four }}>Horas de sueño</ThemedText>
      <Card style={{ marginTop: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <TextInput
          value={sleepHours}
          onChangeText={setSleepHours}
          keyboardType="decimal-pad"
          placeholder="Ej: 7.5"
          placeholderTextColor={theme.textSecondary}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: Spacing.two,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
            color: theme.text,
          }}
        />
        <ThemedText themeColor="textSecondary">horas</ThemedText>
      </Card>
      {!isSleepValid && (
        <ThemedText style={{ color: '#ef4444', marginTop: Spacing.one }}>
          Ingresa entre 0 y 24 horas de sueño.
        </ThemedText>
      )}

      <ThemedText type="smallBold" style={{ marginTop: Spacing.four }}>Nivel de estrés</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.one }}>
        1 = muy bajo, 5 = muy alto
      </ThemedText>
      <LevelSelector value={stressLevel} onChange={setStressLevel} />

      <ThemedText type="smallBold" style={{ marginTop: Spacing.four }}>Nivel de fatiga</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.one }}>
        1 = sin fatiga, 5 = muy fatigado
      </ThemedText>
      <LevelSelector value={fatigueLevel} onChange={setFatigueLevel} />

      <PrimaryButton
        label="Guardar registro"
        disabled={!hasAnyValue || !isSleepValid || isLoading || isLoadBlocked || isSaving}
        loading={isSaving}
        onPress={handleSave}
        style={{ marginTop: Spacing.five }}
      />
    </AppScreen>
  );
}
