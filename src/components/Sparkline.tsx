import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

// Minimal line chart: given an array of numbers, draws a single polyline
// scaled to fit width x height, with optional point dots and a dashed
// horizontal reference line (e.g. a goal/target value).
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  dots?: boolean;
  refValue?: number | null;
  refColor?: string;
  // Marks one point as "selected" (e.g. the day a caption below the chart
  // is currently describing) with a light hollow ring rather than just a
  // bigger same-color dot, so it reads as "this one" instead of "this one
  // matters more". Tapping anywhere on the chart calls onSelectIndex with
  // the nearest point, so the two stay in sync.
  highlightIndex?: number | null;
  highlightFillColor?: string;
  onSelectIndex?: (index: number) => void;
}

export default function Sparkline({
  data,
  width = 120,
  height = 40,
  color = '#000',
  strokeWidth = 2,
  dots = false,
  refValue = null,
  refColor,
  highlightIndex = null,
  highlightFillColor = '#fff',
  onSelectIndex,
}: SparklineProps) {
  if (!data || data.length === 0) return null;

  const values = refValue != null ? [...data, refValue] : data;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  // A single day (e.g. Today/Yesterday) has nothing to draw a line between —
  // stepX would divide by zero for one point anyway — so it's shown as a
  // single centered dot instead of a polyline.
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  // The highlight ring (r=6, its own 2.5px stroke) reaches further from its
  // center than the base line/dots do — reserved whenever the chart can
  // ever show one (interactive or currently highlighted), not just when a
  // point happens to be highlighted right now, so toggling the highlight
  // doesn't rescale/shift every other point on the chart. Without this, a
  // point sitting at the data's min/max value pins the ring right at the
  // chart's edge and half of it gets clipped.
  const highlightPad = onSelectIndex || highlightIndex != null ? 8 : 0;
  const pad = Math.max(strokeWidth + (dots ? 3 : 0), highlightPad);

  const toY = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);

  const points = data.map((v, i) => `${i * stepX},${toY(v)}`).join(' ');

  const handlePress = (e: any) => {
    if (!onSelectIndex) return;
    const x = e.nativeEvent.locationX;
    const index = data.length > 1 ? Math.round(x / stepX) : 0;
    onSelectIndex(Math.max(0, Math.min(data.length - 1, index)));
  };

  const chart = (
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
      {data.length > 1 ? (
        <Polyline points={points} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {data.length === 1 ? (
        <Circle cx={width / 2} cy={toY(data[0])} r={4} fill={color} />
      ) : dots ? (
        data.map((v, i) => <Circle key={i} cx={i * stepX} cy={toY(v)} r={3} fill={color} />)
      ) : null}
      {highlightIndex != null && data[highlightIndex] != null ? (
        <Circle
          cx={data.length > 1 ? highlightIndex * stepX : width / 2}
          cy={toY(data[highlightIndex])}
          r={6}
          fill={highlightFillColor}
          stroke={color}
          strokeWidth={2.5}
        />
      ) : null}
    </Svg>
  );

  return onSelectIndex ? <Pressable onPress={handlePress}>{chart}</Pressable> : chart;
}
