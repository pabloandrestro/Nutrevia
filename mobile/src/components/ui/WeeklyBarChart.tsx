import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

interface WeeklyBarChartProps {
  values: number[]; // 7 valores, uno por día
  labels: string[]; // 7 etiquetas cortas (L, M, M, J, V, S, D)
  goal?: number; // línea punteada de referencia (ej. meta diaria de calorías)
  height?: number;
}

const CHART_WIDTH = 320;
const PADDING_X = 16;
const PADDING_Y = 16;
const BOTTOM_LABELS_HEIGHT = 18;

export function WeeklyBarChart({ values, labels, goal, height = 140 }: WeeklyBarChartProps) {
  const theme = useTheme();

  const maxValue = Math.max(...values, goal ?? 0, 1);
  const usableWidth = CHART_WIDTH - PADDING_X * 2;
  const usableHeight = height - PADDING_Y * 2 - BOTTOM_LABELS_HEIGHT;
  const barSlot = usableWidth / values.length;
  const barWidth = barSlot * 0.5;

  const goalY = goal !== undefined
    ? PADDING_Y + usableHeight - (goal / maxValue) * usableHeight
    : null;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`}>
        {goalY !== null && (
          <Line
            x1={PADDING_X}
            y1={goalY}
            x2={CHART_WIDTH - PADDING_X}
            y2={goalY}
            stroke={theme.textSecondary}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        )}

        {values.map((value, index) => {
          const barHeight = (value / maxValue) * usableHeight;
          const x = PADDING_X + index * barSlot + (barSlot - barWidth) / 2;
          const y = PADDING_Y + usableHeight - barHeight;

          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, value > 0 ? 2 : 0)}
              rx={3}
              fill={theme.accent}
            />
          );
        })}

        {labels.map((label, index) => (
          <SvgText
            key={`label-${index}`}
            x={PADDING_X + index * barSlot + barSlot / 2}
            y={height - 4}
            fontSize={10}
            fill={theme.textSecondary}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}