# Informe Parte 2 - Integracion, CRUD y Backups

## 1. Introduccion
En esta parte se conecto la base de datos MongoDB Atlas del sistema de delivery con una aplicacion backend simple en Node.js.

## 2. Coleccion utilizada
Se eligio la coleccion Productos porque permite demostrar de forma clara las operaciones de alta, lectura, modificacion y baja logica sobre el catalogo del sistema.

## 3. Operaciones CRUD implementadas
- CREATE: inserta un producto en la coleccion Productos.
- READ: consulta productos activos.
- UPDATE: modifica campos especificos usando `$set`.
- DELETE: aplica baja logica en lugar de eliminar fisicamente.

## 4. Baja logica
No se elimina fisicamente el documento. En su lugar se actualizan los campos `eliminado` y `disponible` (junto con `fecha_eliminacion`). Las consultas de lectura filtran por `eliminado: false` para no mostrar productos dados de baja.

## 5. Backup
Se crearon dos scripts:
- `backup.sh` para Mac/Linux.
- `backup.ps1` para Windows.

Ambos crean la carpeta `resguardos_tpi` con una subcarpeta por fecha y usan `mongodump` para respaldar la base de datos desde Atlas.

## 6. RTO/RPO
RPO: depende de la frecuencia del backup. Si se ejecuta una vez por dia, la perdida maxima esperada puede ser de hasta 24 horas.

RTO: es el tiempo necesario para restaurar el backup con `mongorestore`, validar los datos y volver a conectar la aplicacion.

## 7. Conclusion
El mayor aprendizaje fue entender el flujo cliente-servidor: la aplicacion no manipula archivos directamente, sino que se conecta al cluster de Atlas, ejecuta operaciones sobre MongoDB y respeta reglas de negocio como la baja logica.
