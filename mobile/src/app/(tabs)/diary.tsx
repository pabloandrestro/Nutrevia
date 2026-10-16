import { useEffect, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react-native';

import { api } from '@/api';
import { DailySummary } from '@/api/types';
import { getLocalMeals, removeLocalMeal, subscribeToLocalMeals, toDateKey } from '@/api/localDiaryStore';
import { AppScreen } from '@/components/app-screen';
import { BrandMark } from '@/components/brand-mark';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { DateNavigator } from '@/components/ui/DateNavigator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatSelectedDate(date: Date) {
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long' }).format(date);
}

// CAMBIO 1: el menú ahora recibe canEdit y onEdit. "Editar comida" solo se
// muestra para comidas registradas por el usuario (las del almacén local).
function MealOptionsMenu({
  canEdit,
  onEdit,
  onDelete,
}: {
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity onPress={() => setOpen((value) => !value)}>
        <MoreVertical color={theme.textSecondary} size={18} />
      </TouchableOpacity>

      {open && (
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 24,
            backgroundColor: theme.backgroundElement,
            borderRadius: Spacing.two,
            borderWidth: 1,
            borderColor: theme.border,
            paddingVertical: Spacing.one,
            minWidth: 160,
            zIndex: 10,
          }}
        >
          {canEdit && (
            <TouchableOpacity
              onPress={() => {
                setOpen(false);
                onEdit();
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three }}
            >
              <Pencil color={theme.text} size={16} />
              <ThemedText type="small">Editar comida</ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => {
              setOpen(false);
              onDelete();
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three }}
          >
            <Trash2 color="#ef4444" size={16} />
            <ThemedText type="small" style={{ color: '#ef4444' }}>Eliminar comida</ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function DiaryScreen() {
  const theme = useTheme();

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allLocalMeals, setAllLocalMeals] = useState(() => getLocalMeals());
  const { saved } = useLocalSearchParams<{ saved?: string }>();

  const loadSummary = async () => {
    setErrorMessage(null);

    try {
      const result = await api.getDailySummary();
      setSummary(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible cargar el diario.');
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    return subscribeToLocalMeals(() => setAllLocalMeals(getLocalMeals()));
  }, []);

  // CAMBIO 2: abre la pantalla de edición de la comida elegida.
  const handleEditMeal = (mealId: string) => {
    router.push({ pathname: '/edit-meal', params: { mealId } });
  };

  const handleDeleteMeal = (mealId: string) => {
    const isLocal = allLocalMeals.some((meal) => meal.id === mealId);

    if (isLocal) {
      removeLocalMeal(mealId);
      return;
    }

    // TODO: reemplazar por api.deleteMeal(mealId) cuando el backend tenga el endpoint.
    setSummary((current) => (current ? { ...current, meals: current.meals.filter((meal) => meal.id !== mealId) } : current));
  };

  const isToday = isSameDay(selectedDate, new Date());
  const selectedDateKey = toDateKey(selectedDate);
  const localMealsForSelectedDate = allLocalMeals.filter((meal) => meal.date === selectedDateKey);

  if (!summary && !errorMessage) {
    return <ActivityIndicator style={{ flex: 1 }} color={theme.accent} />;
  }

  if (!summary) {
    return (
      <ThemedView style={{ flex: 1, padding: Spacing.four, justifyContent: 'center' }}>
        <ThemedText style={{ color: '#ef4444', textAlign: 'center' }}>{errorMessage}</ThemedText>
        <PrimaryButton label="Intentar nuevamente" onPress={loadSummary} style={{ marginTop: Spacing.four }} />
      </ThemedView>
    );
  }

  const localCaloriesForDate = localMealsForSelectedDate.reduce((total, meal) => total + meal.calories, 0);
  const localMacrosForDate = localMealsForSelectedDate.reduce(
    (totals, meal) => ({
      protein: totals.protein + (meal.proteinGrams ?? 0),
      carbs: totals.carbs + (meal.carbGrams ?? 0),
      fat: totals.fat + (meal.fatGrams ?? 0),
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );

  const combinedMeals = isToday ? [...summary.meals, ...localMealsForSelectedDate] : localMealsForSelectedDate;
  const combinedConsumedCalories = isToday ? summary.consumedCalories + localCaloriesForDate : localCaloriesForDate;
  const combinedConsumedMacros = isToday
    ? {
        protein: summary.consumedMacros.protein + localMacrosForDate.protein,
        carbs: summary.consumedMacros.carbs + localMacrosForDate.carbs,
        fat: summary.consumedMacros.fat + localMacrosForDate.fat,
      }
    : localMacrosForDate;

  return (
    <AppScreen scroll>
      <BrandMark compact />

      <ThemedText type="subtitle" style={{ marginTop: Spacing.four }}>
        Diario nutricional
      </ThemedText>

      {saved === '1' && (
        <ThemedView
          type="backgroundElement"
          style={{ borderRadius: Spacing.three, padding: Spacing.three, marginTop: Spacing.three, backgroundColor: theme.accent }}
        >
          <ThemedText style={{ color: '#000', fontWeight: '700', textAlign: 'center' }}>
            ✓ Comida guardada correctamente
          </ThemedText>
        </ThemedView>
      )}

      <View style={{ marginTop: Spacing.four }}>
        <DateNavigator selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </View>

      {!isToday && (
        <ThemedView
          type="backgroundElement"
          style={{ borderRadius: Spacing.three, padding: Spacing.three, marginTop: Spacing.three }}
        >
          <ThemedText themeColor="textSecondary" type="small" style={{ textAlign: 'center' }}>
            Solo se muestran las comidas registradas en este dispositivo para este día. El historial completo desde el servidor aún no está disponible.
          </ThemedText>
        </ThemedView>
      )}

      <ThemedView
        type="backgroundElement"
        style={{
          borderRadius: Spacing.four,
          padding: Spacing.four,
          marginTop: Spacing.four,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <ThemedText>Resumen del día — {formatSelectedDate(selectedDate)}</ThemedText>

        <ThemedText style={{ fontSize: 34, lineHeight: 42, fontWeight: '700', marginTop: Spacing.two }}>
          {combinedConsumedCalories} / {summary.goal.calories} kcal
        </ThemedText>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.three }}>
          <View>
            <ThemedText themeColor="accent" type="small">Proteínas</ThemedText>
            <ThemedText type="small">{combinedConsumedMacros.protein} / {summary.goal.protein} g</ThemedText>
          </View>
          <View>
            <ThemedText themeColor="accent" type="small">Carbohidratos</ThemedText>
            <ThemedText type="small">{combinedConsumedMacros.carbs} / {summary.goal.carbs} g</ThemedText>
          </View>
          <View>
            <ThemedText themeColor="accent" type="small">Grasas</ThemedText>
            <ThemedText type="small">{combinedConsumedMacros.fat} / {summary.goal.fat} g</ThemedText>
          </View>
        </View>
      </ThemedView>

      <ThemedText type="smallBold" style={{ marginTop: Spacing.four }}>Comidas registradas</ThemedText>

      {combinedMeals.length === 0 ? (
        <ThemedView
          type="backgroundElement"
          style={{ borderRadius: Spacing.three, padding: Spacing.four, marginTop: Spacing.two }}
        >
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {isToday ? 'Todavía no has registrado comidas hoy.' : 'No hay comidas registradas en este dispositivo para este día.'}
          </ThemedText>
        </ThemedView>
      ) : (
        combinedMeals.map((meal) => (
          <ThemedView
            key={meal.id}
            type="backgroundElement"
            style={{ borderRadius: Spacing.three, padding: Spacing.three, marginTop: Spacing.two, flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <View>
              <ThemedText type="smallBold" style={{ textTransform: 'capitalize' }}>{meal.type}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{meal.time} · {meal.description}</ThemedText>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <ThemedText type="smallBold">{meal.calories} kcal</ThemedText>
              {/* CAMBIO 3: solo las comidas del almacén local se pueden editar */}
              <MealOptionsMenu
                canEdit={allLocalMeals.some((localMeal) => localMeal.id === meal.id)}
                onEdit={() => handleEditMeal(meal.id)}
                onDelete={() => handleDeleteMeal(meal.id)}
              />
            </View>
          </ThemedView>
        ))
      )}

      {isToday && (
        <PrimaryButton
          label="+ Registrar comida"
          onPress={() => router.push('/camera')}
          style={{ marginTop: Spacing.four }}
        />
      )}
    </AppScreen>
  );
}