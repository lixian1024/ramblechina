export function storyLayout(containerWidth: number, cardHeights: number[]) {
  const columns = containerWidth >= 640 ? 2 : 1;
  const gap = 24, width = (containerWidth - (columns - 1) * gap) / columns;
  const heights = Array(columns).fill(0) as number[];
  const positions = cardHeights.map(height => {
    const column = heights.indexOf(Math.min(...heights));
    const position = { left: column * (width + gap), top: heights[column], width };
    heights[column] += height + gap;
    return position;
  });
  return { positions, height: cardHeights.length ? Math.max(...heights) - gap : 0 };
}
