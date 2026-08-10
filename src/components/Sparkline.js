import React from 'react';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

// Minimal line chart: given an array of numbers, draws a single polyline
// scaled to fit width x height, with optional point dots and a dashed
// horizontal reference line (e.g. a goal/target value).
export default function Sparkline({
  data,
  width = 120,
  height = 40,
  color = '#000',
  strokeWidth = 2,
  dots = false,
  refValue = null,
  refColor,
}) {
  if (!data || data.length < 2) return null;

  const values = refValue != null ? [...data, refValue] : data;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pad = strokeWidth + (dots ? 3 : 0);

  const toY = (v) => pad + (1 - (v - min) / range) * (height - pad * 2);

  const points = data.map((v, i) => `${i * stepX},${toY(v)}`).join(' ');

  return (
    <Svg width={width} height={height}>
      {refValue != null ? (
        <Line
          x1={0}
          y1={toY(refValue)}
          x2={width}
          y2={toY(refValue)}
          stroke={refColor || color}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      ) : null}
      <Polyline points={points} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {dots
        ? data.map((v, i) => <Circle key={i} cx={i * stepX} cy={toY(v)} r={3} fill={color} />)
        : null}
    </Svg>
  );
}
