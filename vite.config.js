import { defineConfig } from 'vite';

// Rutas relativas: el mismo build sirve en la raíz de un dominio o en la subcarpeta de GitHub Pages
export default defineConfig({
  base: './',
});
