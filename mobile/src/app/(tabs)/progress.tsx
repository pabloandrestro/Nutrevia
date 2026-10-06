import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { api } from '@/api';
import { formatWeightDate } from '@/api/weightDate';
import { getMondayKey, getWeightTrendMessage, SHORT_DAY_LABELS } from '@/api/weeklySummary';
import { GoalType, ProfileResult, WeightEntry, WellbeingEntry, WeeklyProgress } from '@/api/types';
import { AppScreen } from '@/components/app-screen';
import { BrandMark } from '@/components/brand-mark';
import { Card } from '@/components/ui/Card';
import { OutlineButton } from '@/components/ui/OutlineButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { WeightChart } from '@/components/ui/WeightChart';
import { WeeklyBarChart } from '@/components/ui/WeeklyBarChart';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const goalLabels: Record<GoalType, string> = { lose: 'Bajar', maintain: 'Mantener', gain: 'Subir' };

export default function ProgressScreen() {
  const theme = useTheme();
  const [history, setHistory] = useState<WeightEntry[] | null>(null);
  const [weekly, setWeekly] = useState<WeeklyProgress | null>(null);
  const [wellbeingHistory, setWellbeingHistory] = useState<WellbeingEntry[]>([]);
  const [profile, setProfile] = useState<ProfileResult | null>(null);
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadProgress = useCallback(async () => {
    setErrorMessage(null);
    try {
      const [entries, userProfile, goal, wellbeingEntries, weeklyProgress] = await Promise.all([
        api.getWeightHistory(), api.getProfile(), api.getNutritionGoal(), api.getWellbeingHistory(),
        api.getWeeklyProgress(getMondayKey()),
      ]);
      setHistory(entries.sort((a, b) => a.recordedOn.localeCompare(b.recordedOn)));
      setProfile(userProfile);
      setGoalType(goal.goalType);
      setWellbeingHistory(wellbeingEntries);
      setWeekly(weeklyProgress);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible cargar el progreso.');
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadProgress(); }, [loadProgress]));

  const deleteEntry = async (entry: WeightEntry) => {
    setDeletingId(entry.id);
    setErrorMessage(null);
    try {
      await api.deleteWeightEntry(entry.id);
      await loadProgress();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible eliminar el registro.');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (entry: WeightEntry) => {
    Alert.alert('Eliminar registro', `¿Eliminar el peso del ${formatWeightDate(entry.recordedOn)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void deleteEntry(entry) },
    ]);
  };

  if (!history || !profile || !goalType || !weekly) {
    return (
      <AppScreen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three }}>
          {errorMessage ? (
            <>
              <ThemedText>{errorMessage}</ThemedText>
              <OutlineButton label="Reintentar" onPress={() => void loadProgress()} />
            </>
          ) : <ActivityIndicator color={theme.accent} />}
        </View>
      </AppScreen>
    );
  }

  const currentWeight = history[history.length - 1]?.weightKg ?? profile.currentWeightKg;
  const totalChange = currentWeight - profile.currentWeightKg;
  const recentEntries = [...history].reverse();
  const latestWellbeing = wellbeingHistory.at(-1);

  return (
    <AppScreen scroll>
      <BrandMark compact />
      <ThemedText type="subtitle" style={{ marginTop: Spacing.four }}>Tu semana</ThemedText>
      <ThemedText themeColor="accent" type="small" style={{ marginTop: Spacing.one }}>
        {weekly.daysWithRegistry > 0 ? 'Resumen de tus registros de esta semana.' : 'Registra una comida para empezar tu resumen.'}
      </ThemedText>
      <Card style={{ marginTop: Spacing.four }}>
        <ThemedText type="smallBold">Constancia de registro</ThemedText>
        <ThemedText themeColor="accent" type="small" style={{ marginTop: Spacing.one }}>
          {weekly.daysWithRegistry} de 7 días con comidas registradas
        </ThemedText>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.three }}>
          {weekly.days.map((day, index) => (
            <View key={day.recordedOn} style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: day.hasRegistry ? theme.accent : 'transparent', borderWidth: day.hasRegistry ? 0 : 1, borderColor: theme.border }}>
              <ThemedText type="small" style={{ color: day.hasRegistry ? '#000' : theme.textSecondary }}>
                {SHORT_DAY_LABELS[index]}
              </ThemedText>
            </View>
          ))}
        </View>
      </Card>
      <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText type="small" themeColor="textSecondary">Promedio registrado</ThemedText>
          <ThemedText type="smallBold" style={{ marginTop: Spacing.one }}>{weekly.avgCalories} kcal</ThemedText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText type="small" themeColor="textSecondary">Proteína</ThemedText>
          <ThemedText type="smallBold" style={{ marginTop: Spacing.one }}>
            {weekly.avgProtein} / {weekly.goalProteinGrams} g
          </ThemedText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText type="small" themeColor="textSecondary">Cambio de peso</ThemedText>
          <ThemedText type="smallBold" style={{ marginTop: Spacing.one }}>
            {weekly.weightChange !== null ? `${weekly.weightChange > 0 ? '+' : ''}${weekly.weightChange} kg` : '—'}
          </ThemedText>
        </Card>
      </View>
      <Card style={{ marginTop: Spacing.three }}>
        <ThemedText type="smallBold">Calorías registradas</ThemedText>
        <WeeklyBarChart
          values={weekly.days.map((day) => day.calories)}
          labels={SHORT_DAY_LABELS}
          goal={weekly.goalCalories}
        />
        <ThemedText type="small" themeColor="textSecondary">Línea punteada: objetivo diario.</ThemedText>
      </Card>
      <Card style={{ marginTop: Spacing.three, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.accent }}>
        <ThemedText type="smallBold" themeColor="accent">Resumen del peso</ThemedText>
        <ThemedText type="small" style={{ marginTop: Spacing.one }}>{getWeightTrendMessage(weekly.weightChange)}</ThemedText>
      </Card>
      <ThemedText type="subtitle" style={{ marginTop: Spacing.six }}>Seguimiento del peso</ThemedText>
      <ThemedText themeColor="accent" type="small" style={{ marginTop: Spacing.one }}>
        Observa tu evolución a lo largo del tiempo.
      </ThemedText>
      {errorMessage && <ThemedText style={{ color: '#ef4444', marginTop: Spacing.two }}>{errorMessage}</ThemedText>}

      <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.four }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText type="small" themeColor="textSecondary">Peso actual</ThemedText>
          <ThemedText type="smallBold" style={{ marginTop: Spacing.one }}>{currentWeight} kg</ThemedText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText type="small" themeColor="textSecondary">Cambio total</ThemedText>
          <ThemedText type="smallBold" style={{ marginTop: Spacing.one, color: totalChange <= 0 ? theme.accent : theme.text }}>
            {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} kg
          </ThemedText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText type="small" themeColor="textSecondary">Objetivo</ThemedText>
          <ThemedText type="smallBold" style={{ marginTop: Spacing.one }}>{goalLabels[goalType]}</ThemedText>
        </Card>
      </View>

      <Card style={{ marginTop: Spacing.four }}>
        <ThemedText type="smallBold">Evolución</ThemedText>
        <View style={{ marginTop: Spacing.three }}>
          {history.length > 0 ? <WeightChart entries={history} /> : (
            <ThemedText type="small" themeColor="textSecondary">
              Tu gráfico aparecerá cuando registres tu primer peso.
            </ThemedText>
          )}
        </View>
      </Card>

      <ThemedText type="smallBold" style={{ marginTop: Spacing.four }}>Registros recientes</ThemedText>
      {recentEntries.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
          Aún no hay pesos registrados.
        </ThemedText>
      )}
      {recentEntries.map((entry) => (
        <Card key={entry.id} style={{ marginTop: Spacing.two, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <ThemedText type="small" themeColor="textSecondary" style={{ textTransform: 'capitalize' }}>
              {formatWeightDate(entry.recordedOn)}
            </ThemedText>
            <ThemedText type="smallBold">{entry.weightKg} kg</ThemedText>
          </View>
          <TouchableOpacity
            onPress={() => confirmDelete(entry)}
            disabled={deletingId !== null}
            accessibilityLabel={`Eliminar peso del ${formatWeightDate(entry.recordedOn)}`}
            hitSlop={8}
          >
            {deletingId === entry.id ? <ActivityIndicator color={theme.accent} /> : <Trash2 color="#ef4444" size={18} />}
          </TouchableOpacity>
        </Card>
      ))}

      {latestWellbeing && (
        <>
          <ThemedText type="smallBold" style={{ marginTop: Spacing.four }}>Bienestar</ThemedText>
          <Card style={{ marginTop: Spacing.two }}>
            <ThemedText type="small" themeColor="textSecondary">
              Último registro — {formatWeightDate(latestWellbeing.recordedOn)}
            </ThemedText>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.two }}>
              <View>
                <ThemedText type="small" themeColor="textSecondary">Sueño</ThemedText>
                <ThemedText type="smallBold">
                  {latestWellbeing.sleepHours !== null ? `${latestWellbeing.sleepHours} h` : '—'}
                </ThemedText>
              </View>
              <View>
                <ThemedText type="small" themeColor="textSecondary">Estrés</ThemedText>
                <ThemedText type="smallBold">
                  {latestWellbeing.stressLevel !== null ? `${latestWellbeing.stressLevel}/5` : '—'}
                </ThemedText>
              </View>
              <View>
                <ThemedText type="small" themeColor="textSecondary">Fatiga</ThemedText>
                <ThemedText type="smallBold">
                  {latestWellbeing.fatigueLevel !== null ? `${latestWellbeing.fatigueLevel}/5` : '—'}
                </ThemedText>
              </View>
            </View>
          </Card>
        </>
      )}

      <PrimaryButton label="⚖️ Registrar peso" onPress={() => router.push('/log-weight')} style={{ marginTop: Spacing.five }} />
      <OutlineButton label="📝 Registrar bienestar" tone="accent" onPress={() => router.push('/log-wellbeing')} style={{ marginTop: Spacing.two }} />
      <OutlineButton label="📷 Registrar comida" tone="accent" onPress={() => router.push('/camera')} style={{ marginTop: Spacing.two }} />
    </AppScreen>
  );
}
