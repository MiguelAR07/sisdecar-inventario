# Sisdecar Inventario (demo)

Propuesta de plataforma de inventario y remisiones digitales para **Sisdecar S.A.S.**, sistemas de carpado para volquetas (Medellín).

Es un prototipo para mostrar la idea. No tiene servidor ni base de datos: los datos viven en el navegador (`localStorage`) y se pueden restablecer desde la barra lateral.

## Qué incluye

- **Panel**: ventas del mes, inventario al costo, piezas bajo mínimo, instalaciones completas posibles con el stock.
- **Inventario**: catálogo de sisdecar.com más las piezas del listado del sistema de carpado, con entradas a bodega.
- **Kit de carpado**: lista de materiales de una instalación; se carga completa en una remisión.
- **Remisiones**: consecutivo, IVA 19 %, control de stock, formato del talonario y resumen para WhatsApp.
- **Clientes y vehículos**: historial por cliente y por placa.

## Origen de los datos

| Dato | Fuente |
|---|---|
| Piezas del kit | Listado de piezas para sistema de carpado (formulario en papel) |
| Resto del catálogo, clientes, contacto, logo | sisdecar.com |
| Remisión 51506 (Volmaco) | Talonario de remisiones |
| Precios, stock, otras remisiones, placas, NIT | Ejemplo |

## Comandos

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

## Estructura

```
index.html            Estructura de la página y barra lateral
public/               Logo y foto tomados de sisdecar.com
src/main.js           Punto de entrada
src/app.js            Estado, vistas y acciones
src/data/catalogo.js  Catálogo y datos de ejemplo
src/utils/format.js   Formato de pesos, cantidades y fechas
src/styles.css        Estilo inspirado en los formularios de Sisdecar
```
