export interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  type: 'desayuno' | 'almuerzo' | 'cena' | 'snack';
  time: string;
  calories: number;
  description: string;
  proteinGrams?: number;
  carbGrams?: number;
  fatGrams?: number;
  date?: string;
}

export interface DailySummary {
  date: string;
  consumedCalories: number;
  goal: DailyGoal;
  consumedMacros: { protein: number; carbs: number; fat: number };
  meals: Meal[];
}

export interface MealItemInput {
  barcode?: string;
  detectionKey?: string;
  name?: string;
  grams: number;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
}

export interface CreateMealInput {
  recordedOn: string;
  mealType: Meal['type'];
  source: 'manual' | 'barcode' | 'photo';
  items: MealItemInput[];
}

export interface WeightEntry {
  id: number;
  recordedOn: string;
  weightKg: number;
}

export interface WellbeingEntry {
  id: number;
  recordedOn: string;
  sleepHours: number | null;
  stressLevel: number | null;
  fatigueLevel: number | null;
}

export interface WellbeingInput {
  sleepHours: number | null;
  stressLevel: number | null;
  fatigueLevel: number | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
}

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type CalculationSex = 'male' | 'female';

export interface ProfileInput {
  age: number;
  heightCm: number;
  currentWeightKg: number;
  activityLevel: ActivityLevel;
  calculationSex: CalculationSex;
}

export interface ProfileResult extends ProfileInput {
  id: number;
  userId: number;
}

export type GoalType = 'lose' | 'maintain' | 'gain';

export interface NutritionGoalResult {
  id: number;
  userId: number;
  goalType: GoalType;
  dailyCalories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
}

export interface AccountProfile {
  email: string;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  activityLevel: ActivityLevel;
  calculationSex: CalculationSex;
}

export interface FoodImageResult {
  filename: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
  status: string;
  message: string;
  model: string;
  detections: FoodDetection[];
}

export interface FoodDetection {
  key: string;
  name: string;
  confidence: number;
  boundingBox: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };
}

export interface DetectedFood {
  id: string;
  key: string;
  name: string;
  grams: number;
  kcal: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  confidence: 'alta' | 'media' | 'baja';
  confidenceScore: number;
}

export interface FoodCatalogItem {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}
