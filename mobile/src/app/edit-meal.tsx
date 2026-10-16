import { useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Meal } from '@/api/types';
import { getLocalMealById, updateLocalMeal } from '@/api/localDiaryStore';
import { AppScreen } from '@/components/app-screen';
import { BrandMark } from '@/components/brand-mark';
import { Card } from '@/components/ui/Card';
import { OutlineButton } from '@/components/ui/OutlineButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MEAL_TYPES: Meal['type'][] = ['desayuno', 'almuerzo', 'cena', 'snack'];

function parseNumber(value: string) {
  return Number(value.replace(/[^0-9]/g, '')) || 0;
}

function NumberField({
  label,
  unit,
  value,
  onChangeText,
}: {
  label: string;
  unit: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ marginTop: Spacing.three }}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Card style={{ marginTop: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
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
        <ThemedText themeColor="textSecondary">{unit}</ThemedText>
      </Card>
    </View>
  );
}

function EditMealForm({ meal }: { meal: Meal }) {
  const theme = useTheme();

  const [mealType, setMealType] = useState<Meal['type']>(meal.type);
  const [description, setDescription] = useState(meal.description);
  const [calories, setCalories] = useState(String(meal.calories));
  const [protein, setProtein] = useState(String(meal.proteinGrams ?? 0));
  const [carbs, setCarbs] = useState(String(meal.carbGrams ?? 0));
  const [fat, setFat] = useState(String(meal.fatGrams ?? 0));

  const isValid = description.trim().length > 0 && calories.trim().length > 0;

  const handleSave = () => {
    if (!isValid) return;

    updateLocalMeal(meal.id, {
      type: mealType,
      description: description.trim(),
      calories: parseNumber(calories),
      proteinGrams: parseNumber(protein),
      carbGrams: parseNumber(carbs),
      fatGrams: parseNumber(fat),
    });

    router.back();
  };

  return (
    <AppScreen scroll keyboardShouldPersistTaps="handled">
      <BrandMark centered compact />

      <ThemedText type="title" style={{ marginTop: Spacing.three }}>Editar comida</ThemedText>
      <ThemedText themeColor="textSecondary" type="small" style={{ marginTop: Spacing.one }}>
        Registrada a las {meal.time}. Corrige lo que necesites y guarda los cambios.
      </ThemedText>

      <ThemedText type="smallBold" style={{ marginTop: Spacing.four }}>Tipo de comida</ThemedText>
      <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two }}>
        {MEAL_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setMealType(type)}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: mealType === type ? theme.accent : theme.border,
              backgroundColor: mealType === type ? theme.accent : 'transparent',
              borderRadius: Spacing.two,
              paddingVertical: Spacing.two,
              alignItems: 'center',
            }}
          >
            <ThemedText
              type="small"
              style={{ textTransform: 'capitalize', color: mealType === type ? '#000' : theme.text }}
            >
              {type}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <ThemedText type="smallBold" style={{ marginTop: Spacing.four }}>Descripción</ThemedText>
      <Card style={{ marginTop: Spacing.two }}>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ej: Arroz, pollo y palta"
          placeholderTextColor={theme.textSecondary}
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: Spacing.two,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
            color: theme.text,
          }}
        />
      </Card>

      <NumberField label="Calorías" unit="kcal" value={calories} onChangeText={setCalories} />
      <NumberField label="Proteínas" unit="g" value={protein} onChangeText={setProtein} />
      <NumberField label="Carbohidratos" unit="g" value={carbs} onChangeText={setCarbs} />
      <NumberField label="Grasas" unit="g" value={fat} onChangeText={setFat} />

      <PrimaryButton
        label="Guardar cambios"
        disabled={!isValid}
        onPress={handleSave}
        style={{ marginTop: Spacing.five }}
      />

      <OutlineButton
        label="Cancelar"
        onPress={() => router.back()}
        style={{ marginTop: Spacing.two, borderWidth: 0 }}
      />
    </AppScreen>
  );
}

export default function EditMealScreen() {
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const meal = mealId ? getLocalMealById(mealId) : undefined;

  if (!meal) {
    return (
      <AppScreen>
        <BrandMark centered compact />

        <ThemedText type="subtitle" style={{ marginTop: Spacing.four, textAlign: 'center' }}>
          No encontramos esta comida
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={{ marginTop: Spacing.two, textAlign: 'center' }}>
          Puede que ya se haya eliminado.
        </ThemedText>

        <PrimaryButton
          label="Volver al diario"
          onPress={() => router.back()}
          style={{ marginTop: Spacing.four }}
        />
      </AppScreen>
    );
  }

  // El formulario va en un componente aparte para que sus hooks (useState)
  // no queden dentro de una condición.
  return <EditMealForm meal={meal} />;
}