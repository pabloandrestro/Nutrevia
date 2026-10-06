import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import {
  AccountProfile,
  AuthCredentials,
  AuthResponse,
  AuthUser,
  CreateMealInput,
  DailySummary,
  FoodCatalogItem,
  FoodImageResult,
  GoalType,
  NutritionGoalResult,
  ProfileInput,
  ProfileResult,
  WeightEntry,
  WellbeingEntry,
  WellbeingInput,
  Meal,
} from './types';

import {
  getAccessToken,
  removeAccessToken,
  saveAccessToken,
} from './tokenStorage';


const API_URL = process.env.EXPO_PUBLIC_API_URL;


interface BackendUser {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
}


interface BackendAuthResponse {
  access_token: string;
  token_type: string;
  user: BackendUser;
}


interface BackendProfile {
  id: number;
  user_id: number;
  age: number;
  height_cm: number;
  current_weight_kg: number;
  activity_level: ProfileResult['activityLevel'];
  calculation_sex: ProfileResult['calculationSex'];
}


interface BackendNutritionGoal {
  id: number;
  user_id: number;
  goal_type: GoalType;
  daily_calories: number;
  protein_grams: number;
  carbohydrate_grams: number;
  fat_grams: number;
}

interface BackendWeightEntry {
  id: number;
  recorded_on: string;
  weight_kg: number;
}

interface BackendWellbeingEntry {
  id: number;
  recorded_on: string;
  sleep_hours: number | null;
  stress_level: number | null;
  fatigue_level: number | null;
}


interface BackendFoodImageResult {
  filename: string;
  content_type: string;
  size_bytes: number;
  width: number;
  height: number;
  status: string;
  message: string;
  model: string;
  detections: {
    key: string;
    name: string;
    confidence: number;
    bounding_box: {
      x_min: number;
      y_min: number;
      x_max: number;
      y_max: number;
    };
  }[];
}


export type StartupDestination =
  | '/login'
  | '/onboarding/profile-setup'
  | '/onboarding/goal-selection'
  | '/home';


function getApiUrl(): string {
  if (!API_URL) {
    throw new Error(
      'Falta configurar EXPO_PUBLIC_API_URL en mobile/.env',
    );
  }

  return API_URL.replace(/\/$/, '');
}


function mapUser(user: BackendUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    isActive: user.is_active,
    createdAt: user.created_at,
  };
}


function mapProfile(
  profile: BackendProfile,
): ProfileResult {
  return {
    id: profile.id,
    userId: profile.user_id,
    age: profile.age,
    heightCm: profile.height_cm,
    currentWeightKg: profile.current_weight_kg,
    activityLevel: profile.activity_level,
    calculationSex: profile.calculation_sex,
  };
}


function mapNutritionGoal(
  goal: BackendNutritionGoal,
): NutritionGoalResult {
  return {
    id: goal.id,
    userId: goal.user_id,
    goalType: goal.goal_type,
    dailyCalories: goal.daily_calories,
    proteinGrams: goal.protein_grams,
    carbohydrateGrams: goal.carbohydrate_grams,
    fatGrams: goal.fat_grams,
  };
}

interface BackendMeal {
  id: number;
  recorded_on: string;
  meal_type: Meal['type'];
  source: string;
  description: string;
  calories: number;
  protein_grams: number;
  carb_grams: number;
  fat_grams: number;
  created_at: string;
}

interface BackendDailySummary {
  date: string;
  consumed_calories: number;
  consumed_protein: number;
  consumed_carbs: number;
  consumed_fat: number;
  goal_calories: number;
  goal_protein: number;
  goal_carbs: number;
  goal_fat: number;
  meals: BackendMeal[];
}

function mapWeightEntry(entry: BackendWeightEntry): WeightEntry {
  return {
    id: entry.id,
    recordedOn: entry.recorded_on,
    weightKg: entry.weight_kg,
  };
}

function mapWellbeingEntry(entry: BackendWellbeingEntry): WellbeingEntry {
  return {
    id: entry.id,
    recordedOn: entry.recorded_on,
    sleepHours: entry.sleep_hours,
    stressLevel: entry.stress_level,
    fatigueLevel: entry.fatigue_level,
  };
}


async function getErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const body = await response.json();

    if (typeof body.detail === 'string') {
      return body.detail;
    }
  } catch {
    // La respuesta no contenía JSON válido.
  }

  return `La solicitud falló con código ${response.status}.`;
}


async function sendAuthenticationRequest(
  path: string,
  credentials: unknown,
): Promise<AuthResponse> {
  const response = await fetch(
    `${getApiUrl()}${path}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result: BackendAuthResponse =
    await response.json();

  await saveAccessToken(result.access_token);

  return {
    accessToken: result.access_token,
    tokenType: result.token_type,
    user: mapUser(result.user),
  };
}


export async function register(
  credentials: AuthCredentials,
): Promise<AuthResponse> {
  return sendAuthenticationRequest(
    '/auth/register',
    credentials,
  );
}


export async function login(
  credentials: AuthCredentials,
): Promise<AuthResponse> {
  return sendAuthenticationRequest(
    '/auth/login',
    credentials,
  );
}

export async function loginWithGoogle(
  idToken: string,
): Promise<AuthResponse> {
  return sendAuthenticationRequest(
    '/auth/google',
    {
      id_token: idToken,
    },
  );
}


export async function getCurrentUser(): Promise<AuthUser> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('No existe una sesión iniciada.');
  }

  const response = await fetch(
    `${getApiUrl()}/auth/me`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      await removeAccessToken();
    }

    throw new Error(await getErrorMessage(response));
  }

  const user: BackendUser = await response.json();

  return mapUser(user);
}


export async function logout(): Promise<void> {
  await removeAccessToken();
}


export async function saveProfile(
  profile: ProfileInput,
): Promise<ProfileResult> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Debes iniciar sesión nuevamente.');
  }

  const body = {
    age: profile.age,
    height_cm: profile.heightCm,
    current_weight_kg: profile.currentWeightKg,
    activity_level: profile.activityLevel,
    calculation_sex: profile.calculationSex,
  };

  let response = await fetch(
    `${getApiUrl()}/profile`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (response.status === 409) {
    response = await fetch(
      `${getApiUrl()}/profile/me`,
      {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result: BackendProfile =
    await response.json();

  return mapProfile(result);
}


export async function getProfile(): Promise<ProfileResult> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Debes iniciar sesión nuevamente.');
  }

  const response = await fetch(
    `${getApiUrl()}/profile/me`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result: BackendProfile =
    await response.json();

  return mapProfile(result);
}


export async function getAccountProfile(): Promise<AccountProfile> {
  const [user, profile, weights] = await Promise.all([
    getCurrentUser(),
    getProfile(),
    getWeightHistory(),
  ]);

  return {
    email: user.email,
    age: profile.age,
    heightCm: profile.heightCm,
    currentWeightKg: weights.at(-1)?.weightKg ?? profile.currentWeightKg,
    activityLevel: profile.activityLevel,
    calculationSex: profile.calculationSex,
  };
}


export async function saveNutritionGoal(
  goalType: GoalType,
): Promise<NutritionGoalResult> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Debes iniciar sesión nuevamente.');
  }

  const response = await fetch(
    `${getApiUrl()}/nutrition-goal/me`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        goal_type: goalType,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result: BackendNutritionGoal =
    await response.json();

  return mapNutritionGoal(result);
}


export async function getNutritionGoal(): Promise<NutritionGoalResult> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Debes iniciar sesión nuevamente.');
  }

  const response = await fetch(
    `${getApiUrl()}/nutrition-goal/me`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result: BackendNutritionGoal =
    await response.json();

  return mapNutritionGoal(result);
}

function mapMeal(entry: BackendMeal): Meal {
  return {
    id: String(entry.id),
    date: entry.recorded_on,
    type: entry.meal_type,
    time: new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(new Date(entry.created_at)),
    calories: entry.calories,
    description: entry.description,
    proteinGrams: entry.protein_grams,
    carbGrams: entry.carb_grams,
    fatGrams: entry.fat_grams,
  };
}

export async function getWeightHistory(): Promise<WeightEntry[]> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Debes iniciar sesión nuevamente.');
  }

  const response = await fetch(`${getApiUrl()}/weights`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const entries: BackendWeightEntry[] = await response.json();
  return entries.map(mapWeightEntry);
}

export async function saveWeightEntry(
  recordedOn: string,
  weightKg: number,
): Promise<WeightEntry> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Debes iniciar sesión nuevamente.');
  }

  const response = await fetch(`${getApiUrl()}/weights`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recorded_on: recordedOn, weight_kg: weightKg }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const entry: BackendWeightEntry = await response.json();
  return mapWeightEntry(entry);
}

export async function deleteWeightEntry(entryId: number): Promise<void> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Debes iniciar sesión nuevamente.');
  }

  const response = await fetch(`${getApiUrl()}/weights/${entryId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
}

export async function getWellbeingHistory(): Promise<WellbeingEntry[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Debes iniciar sesión nuevamente.');
  const response = await fetch(`${getApiUrl()}/wellbeing`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const entries: BackendWellbeingEntry[] = await response.json();
  return entries.map(mapWellbeingEntry);
}

export async function saveWellbeingEntry(
  recordedOn: string,
  input: WellbeingInput,
): Promise<WellbeingEntry> {
  const token = await getAccessToken();
  if (!token) throw new Error('Debes iniciar sesión nuevamente.');
  const response = await fetch(`${getApiUrl()}/wellbeing`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recorded_on: recordedOn,
      sleep_hours: input.sleepHours,
      stress_level: input.stressLevel,
      fatigue_level: input.fatigueLevel,
    }),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return mapWellbeingEntry(await response.json());
}

export async function deleteWellbeingEntry(entryId: number): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Debes iniciar sesión nuevamente.');
  const response = await fetch(`${getApiUrl()}/wellbeing/${entryId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
}


export async function getDailySummary(date: string): Promise<DailySummary> {
  const token = await getAccessToken();
  if (!token) throw new Error('Debes iniciar sesión nuevamente.');
  const response = await fetch(`${getApiUrl()}/meals/summary?date=${encodeURIComponent(date)}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const data: BackendDailySummary = await response.json();
  return {
    date: data.date,
    consumedCalories: data.consumed_calories,
    goal: {
      calories: data.goal_calories,
      protein: data.goal_protein,
      carbs: data.goal_carbs,
      fat: data.goal_fat,
    },
    consumedMacros: {
      protein: data.consumed_protein,
      carbs: data.consumed_carbs,
      fat: data.consumed_fat,
    },
    meals: data.meals.map(mapMeal),
  };
}

export async function createMeal(data: CreateMealInput): Promise<Meal> {
  const token = await getAccessToken();
  if (!token) throw new Error('Debes iniciar sesión nuevamente.');
  const response = await fetch(`${getApiUrl()}/meals`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recorded_on: data.recordedOn,
      meal_type: data.mealType,
      source: data.source,
      items: data.items.map((item) => ({
        barcode: item.barcode,
        detection_key: item.detectionKey,
        name: item.name,
        grams: item.grams,
        calories_per_100g: item.caloriesPer100g,
        protein_per_100g: item.proteinPer100g,
        carbs_per_100g: item.carbsPer100g,
        fat_per_100g: item.fatPer100g,
      })),
    }),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return mapMeal(await response.json());
}

export async function deleteMeal(mealId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Debes iniciar sesión nuevamente.');
  const response = await fetch(`${getApiUrl()}/meals/${encodeURIComponent(mealId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
}

export async function searchFoods(query: string): Promise<FoodCatalogItem[]> {
  const response = await fetch(`${getApiUrl()}/foods/search?q=${encodeURIComponent(query.trim())}`);
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const products: Array<{
    barcode: string; name: string; calories_per_100g: number;
    protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number;
  }> = await response.json();
  return products.map((product) => ({
    id: product.barcode,
    name: product.name,
    caloriesPer100g: product.calories_per_100g,
    proteinPer100g: product.protein_per_100g,
    carbsPer100g: product.carbs_per_100g,
    fatPer100g: product.fat_per_100g,
  }));
}


export async function getStartupDestination(): Promise<StartupDestination> {
  const token = await getAccessToken();

  if (!token) {
    return '/login';
  }

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const userResponse = await fetch(
    `${getApiUrl()}/auth/me`,
    { headers },
  );

  if (userResponse.status === 401) {
    await removeAccessToken();
    return '/login';
  }

  if (!userResponse.ok) {
    throw new Error(
      await getErrorMessage(userResponse),
    );
  }

  const profileResponse = await fetch(
    `${getApiUrl()}/profile/me`,
    { headers },
  );

  if (profileResponse.status === 401) {
    await removeAccessToken();
    return '/login';
  }

  if (profileResponse.status === 404) {
    return '/onboarding/profile-setup';
  }

  if (!profileResponse.ok) {
    throw new Error(
      await getErrorMessage(profileResponse),
    );
  }

  const goalResponse = await fetch(
    `${getApiUrl()}/nutrition-goal/me`,
    { headers },
  );

  if (goalResponse.status === 401) {
    await removeAccessToken();
    return '/login';
  }

  if (goalResponse.status === 404) {
    return '/onboarding/goal-selection';
  }

  if (!goalResponse.ok) {
    throw new Error(
      await getErrorMessage(goalResponse),
    );
  }

  return '/home';
}


export async function analyzeFoodImage(
  photoUri: string,
): Promise<FoodImageResult> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Debes iniciar sesión nuevamente.');
  }

  const imageFile = new File(photoUri);
  const formData = new FormData();

  formData.append('file', imageFile);

  const response = await expoFetch(
    `${getApiUrl()}/food-images/analyze`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result: BackendFoodImageResult =
    await response.json();

  return {
    filename: result.filename,
    contentType: result.content_type,
    sizeBytes: result.size_bytes,
    width: result.width,
    height: result.height,
    status: result.status,
    message: result.message,
    model: result.model,
    detections: result.detections.map((detection) => ({
      key: detection.key,
      name: detection.name,
      confidence: detection.confidence,
      boundingBox: {
        xMin: detection.bounding_box.x_min,
        yMin: detection.bounding_box.y_min,
        xMax: detection.bounding_box.x_max,
        yMax: detection.bounding_box.y_max,
      },
    })),
  };
}

export interface BarcodeFood {
  barcode: string;
  name: string;
  brand: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

export async function getFoodByBarcode(code: string): Promise<BarcodeFood> {
  const response = await fetch(
    `${getApiUrl()}/foods/barcode/${encodeURIComponent(code)}`,
    { headers: { Accept: 'application/json' } },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
}
