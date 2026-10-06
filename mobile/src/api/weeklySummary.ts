export const SHORT_DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function getMondayKey(date = new Date()): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const day = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeightTrendMessage(weightChange: number | null): string {
  if (weightChange === null) return 'Registra tu peso en al menos dos días de esta semana para comparar el cambio.';
  if (weightChange < 0) return `Entre el primer y el último registro de esta semana, tu peso bajó ${Math.abs(weightChange)} kg.`;
  if (weightChange > 0) return `Entre el primer y el último registro de esta semana, tu peso subió ${weightChange} kg.`;
  return 'El primer y el último registro de peso de esta semana tienen el mismo valor.';
}
