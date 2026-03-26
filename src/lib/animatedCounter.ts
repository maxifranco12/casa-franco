export function animateCounter(
  element: HTMLElement,
  targetValue: number,
  duration: number = 1000,
  prefix: string = '$',
  separator: boolean = true
) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = start + (targetValue - start) * easeOutQuart;

    const formatted = separator
      ? Math.round(current).toLocaleString('es-AR')
      : Math.round(current).toString();

    element.textContent = `${prefix}${formatted}`;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}
