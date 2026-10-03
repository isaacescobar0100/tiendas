import { Inter, Nunito, Playfair_Display, Poppins, Space_Grotesk } from "next/font/google";

// Fuentes de las combinaciones curadas del tema (lib/theme.ts → FONT_PAIRS).
// Sin precarga: el navegador solo descarga la que la tienda realmente usa.
// (Geist, la de "Moderna", ya la carga el layout raíz.)
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", preload: false });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", preload: false });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-playfair",
  preload: false,
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-poppins",
  preload: false,
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  preload: false,
});

/** Clases que definen las variables de todas las fuentes del tema. */
export const themeFontVars = [inter, nunito, playfair, poppins, spaceGrotesk]
  .map((f) => f.variable)
  .join(" ");
