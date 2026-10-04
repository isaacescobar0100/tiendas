// Cuadrícula de tarjetas que no deja huecos: 1 columna en el celular, 2 en
// tablet y hasta 3 en pantalla grande. Si la última fila queda incompleta, la
// última tarjeta se estira para llenarla. (Clases literales para Tailwind.)
export function fillGrid(n: number): { grid: string; last: string } {
  if (n <= 1) return { grid: "grid grid-cols-[minmax(0,1fr)]", last: "" };
  if (n === 2) return { grid: "grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2", last: "" };
  const sm = n % 2 === 1 ? "sm:col-span-2" : "";
  const lg = ["lg:col-span-1", "lg:col-span-3", "lg:col-span-2"][n % 3];
  return {
    grid: "grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 lg:grid-cols-3",
    last: `${sm} ${lg}`.trim(),
  };
}
