# TPI BDII - Parte 2

Aplicacion backend minima en Node.js para demostrar CRUD sobre la coleccion `Productos` de MongoDB Atlas usando el driver nativo.

## Que hace este proyecto

- Se conecta a MongoDB Atlas con `MONGODB_URI`.
- Usa la base indicada por `DB_NAME`.
- Trabaja sobre la coleccion `Productos`.
- Ejecuta una demo CRUD completa en `app.js`:
	- CREATE de un producto de ejemplo.
	- READ de productos activos (`eliminado: false`).
	- UPDATE de campos especificos con `$set`.
	- DELETE logico (sin borrado fisico).

## Instalacion

```bash
npm install
```

## Variables de entorno

Crear el archivo `.env` a partir de `.env.example` y completar valores reales:

```bash
cp .env.example .env
```

Contenido esperado:

```env
MONGODB_URI=mongodb+srv://USUARIO:PASSWORD@CLUSTER.mongodb.net/
DB_NAME=TFI-BaseDeDatos2
```

En Windows PowerShell podes usar:

```powershell
Copy-Item .env.example .env
```

## Ejecutar CRUD

```bash
npm start
```

## Ejecutar backup en Mac/Linux

```bash
npm run backup:mac
```

## Ejecutar backup en Windows

```powershell
npm run backup:win
```

## Archivos que no deben subirse o entregarse

- `node_modules/`
- `.env`
- `resguardos_tpi/` (si pesa mucho)
