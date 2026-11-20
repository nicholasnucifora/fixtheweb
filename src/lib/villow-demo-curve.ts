// Geometry and default sample ported from disconnect's WatchFreeTimeDemo.tsx.
import { getMonotoneSplineSlopes, interpolateMonotoneSpline } from './villow-monotone-spline';

export const sampleHours = [10, 5, 2, 1, 0, 0, 2, 8, 14, 10, 8, 9, 12, 14, 16, 18, 21, 25, 33, 45, 58, 64, 50, 28];
export const demoScenes = { drag: { start:18, from:18, end:23 }, tap: { start:12, from:13, end:17 } } as const;
const round = (value:number) => Number(value.toFixed(3));
const toY = (value:number) => round(100 - Math.max(0, Math.min(100, value)));

export function demoCurve(hours:number[]) {
  const values = [...hours, hours[0]];
  const slopes = getMonotoneSplineSlopes(values);
  const line = values.slice(1).reduce((path,value,index) => {
    const x = index * 10;
    return `${path} C ${round(x + 10/3)} ${toY(values[index] + slopes[index]/3)}, ${round(x + 20/3)} ${toY(value - slopes[index+1]/3)}, ${x+10} ${toY(value)}`;
  }, `M 0 ${toY(values[0])}`);
  return { line, area:`${line} L 240 100 L 0 100 Z`, point:(hour:number) => ({x:round(hour/24*100),y:toY(interpolateMonotoneSpline(values,slopes,hour))}) };
}

// Fictional weekday patterns. The default is the app's original demo curve.
export function hoursForDays(days:Set<number>) {
  if (!days.size) return sampleHours;
  const patterns = [...days].map(day => sampleHours.map((value,hour) => {
    const shift = day > 4 ? 3 : day % 3 - 1;
    const shifted = sampleHours[(hour - shift + 24) % 24];
    return Math.min(90, Math.max(0, shifted * (.72 + day*.07) + (day>4 && hour>=10 && hour<16 ? 14 : 0)));
  }));
  return sampleHours.map((_,hour)=>patterns.reduce((sum,pattern)=>sum+pattern[hour],0)/patterns.length);
}
