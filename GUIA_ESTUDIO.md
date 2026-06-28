# Apuntes para el coloquio — TPI BDII Parte 2

Estas son mis notas para defender el trabajo. Las armé conectando lo que hice en el
código con los temas que vimos en las unidades, sobre todo la Unidad 6 (copias de
seguridad y restauraciones) y la Unidad 7 (conexión de aplicaciones con MongoDB).
La idea es explicar todo con mis palabras, pero usando los conceptos como los vimos
en clase.

Índice rápido de dónde sale cada cosa:
- Cómo se comunica la app con Mongo, driver, cliente-servidor → Unidad 7, Actividad 1
- Por qué usé driver nativo y no un ODM → Unidad 7, Actividades 2 y 3
- El backup con mongodump y los tipos de backup → Unidad 6, Actividad 2
- La restauración con mongorestore y el RTO/RPO → Unidad 6, Actividad 3

---

## 1. Cómo se comunica mi app con MongoDB (Unidad 7)

### El modelo Cliente-Servidor

Esto es lo primero que tengo que tener claro porque es el tema central de la Unidad 7.
La comunicación entre mi aplicación y MongoDB sigue el clásico modelo Cliente-Servidor:
mi app se comporta como **cliente** y Mongo es quien recibe y responde, actuando como
**servidor**. En mi caso el servidor está en la nube, en MongoDB Atlas.

Lo importante: mi app no toca archivos ni guarda nada en mi disco. Abre un canal de
comunicación con Atlas y le pide las operaciones. Según vimos, una vez establecida la
conexión la aplicación tiene que:

1. Autenticarse y mantener una conexión persistente con la instancia de MongoDB.
2. Construir una solicitud con la información de la operación a realizar.
3. Preparar los datos en el formato que acepta el driver.
4. Esperar la respuesta del servidor con los datos pedidos o el resultado de la operación.

Esos cuatro pasos los hace mi `app.js` cada vez que ejecuta un insert, un find o un update.

### El driver como intermediario (el "traductor")

Un driver es una librería específica para un lenguaje que actúa como traductor entre la
aplicación y MongoDB. Su rol es abstraer la complejidad de la conexión. Concretamente
hace tres cosas:

- **Establece la conexión:** gestiona la conexión y la autenticación.
- **Serialización / deserialización:** convierte las estructuras de datos nativas de mi
  lenguaje (los objetos de JavaScript) al formato de comunicación de MongoDB, que es
  **BSON**, y al revés cuando vuelven las respuestas. Esto es importante: yo escribo un
  objeto JS normal, pero por la red viaja en BSON. El driver hace esa traducción.
- **Ejecuta comandos:** me deja mandar consultas, inserciones, actualizaciones, etc.

En mi proyecto el driver es el paquete oficial `mongodb` para Node.js.

### La cadena de conexión (string de conexión)

El driver necesita que le diga a qué instancia conectarse, a qué base y con qué
credenciales. Eso va en la cadena de conexión. Hay dos formatos:

- `mongodb://usuario:contraseña@host:puerto/` → para conexiones locales o servidores simples.
- `mongodb+srv://usuario:contraseña@host/` → para conexiones gestionadas por MongoDB
  Atlas o clusters con registro DNS SRV.

**Mi proyecto usa el formato `mongodb+srv://`**, porque me conecto a un cluster de Atlas.
Si me preguntan por qué tiene el `+srv`, es porque Atlas usa registro DNS SRV para
resolver las direcciones del cluster. Esa cadena la tengo guardada en el `.env`, en la
variable `MONGODB_URI`, justamente para no escribirla en el código.

---

## 2. Por qué elegí el driver nativo y no un ODM (Unidad 7, Act. 2 y 3)

El trabajo dejaba elegir entre driver nativo o un ODM. Yo usé el **driver nativo**, y
lo puedo defender con lo que vimos.

### Qué es cada uno

- **Driver nativo:** la forma más directa de comunicarse con el motor. No agrega capas
  intermedias. El código que se ejecuta está muy cerca de la API real del servidor.
  Cada consulta se construye manualmente con la sintaxis propia de MongoDB (que es casi
  idéntica a la que usábamos en mongosh).
- **ODM (Object Document Modeling):** es una capa de abstracción que se pone arriba del
  driver nativo. En vez de hablar directo con el motor, trabajás con modelos, esquemas
  y métodos propios de la librería. El más usado en Node es Mongoose. Es el equivalente
  a un ORM (Object Relational Mapping) de las bases relacionales, pero para bases de
  documentos.

### Por qué el driver nativo me convenía acá

Según las situaciones ideales que vimos para el driver nativo, encaja con mi caso:

- Es una **aplicación sencilla**, donde sumar un ODM sería más trabajo que beneficio.
- **No agrega capas de abstracción**, entonces usa menos recursos y las consultas son
  más directas y eficientes.
- El driver lo mantiene **MongoDB Inc.**, la empresa misma, así que está siempre
  actualizado y sin dependencias de terceros.

Para un CRUD chico como el mío, el driver nativo deja ver claramente lo que pasa por
debajo, sin magia escondida. Eso también es bueno para entenderlo y defenderlo.

### Qué hubiera ganado con un ODM (para contestar si me lo preguntan)

No es que el ODM sea peor, resuelve otras necesidades. Con Mongoose hubiera tenido:
esquemas definidos por colección (con tipos, validaciones, valores por defecto, índices),
métodos cómodos como `findByIdAndUpdate(id, actualización)`, y orden forzado para
proyectos grandes con varios equipos. El costo es algo más de rendimiento por la capa
extra. Para reglas de negocio complejas o APIs grandes, conviene el ODM. Para mi caso,
no hacía falta.

---

## 3. app.js explicado de arriba a abajo

### El arranque y la conexión

```js
require('dotenv').config();
```
Carga el archivo `.env` y deja sus variables disponibles. Lo hago así porque las
credenciales (usuario, contraseña, cadena de conexión) no pueden ir escritas en el
código. Las guardo aparte en el `.env` y dotenv las lee.

```js
const { MongoClient, ObjectId } = require('mongodb');
```
Importo dos cosas del driver nativo. `MongoClient` es lo que abre la conexión al cluster.
`ObjectId` es el tipo de dato del `_id`: en Mongo los IDs no son números, son un ObjectId.
Lo voy a necesitar para buscar un producto por su ID.

```js
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
```
Leo la cadena de conexión (la del formato `mongodb+srv://` de Atlas) y el nombre de la base.

```js
if (!uri || !dbName) {
  console.error('Faltan variables de entorno...');
  process.exit(1);
}
```
Si falta alguna, corto al toque. Prefiero que reviente acá con un mensaje claro y no a
la mitad. El `exit(1)` le avisa al sistema que terminó mal (0 sería que terminó bien).

```js
const client = new MongoClient(uri);
const db = client.db(dbName);
const productos = db.collection('Productos');
```
Armo los tres niveles con los que trabaja Mongo, de lo más grande a lo más chico: el
cluster tiene bases de datos, cada base tiene colecciones, y cada colección tiene
documentos. La colección es lo más parecido a una tabla de SQL, y los documentos a las
filas, pero guardados como objetos tipo JSON (en realidad BSON cuando viajan).

Un detalle para que no me agarren: crear el `client` acá NO abre la conexión todavía.
Solo deja el objeto listo. La conexión real se abre más abajo con `client.connect()`.
Esto coincide con el ejemplo del driver que vimos en clase (el archivo driver.js).

### CREATE — crear un producto

```js
async function crearProducto(producto) {
  try {
    const resultado = await productos.insertOne(producto);
    console.log('CREATE OK -> _id:', resultado.insertedId.toString());
    return resultado.insertedId;
  } catch (error) {
    console.error('Error en crearProducto:', error.message);
    throw error;
  }
}
```
Inserta un producto con `insertOne` (en el ejemplo de clase usaban `insertMany` para
varios; es la misma idea con uno solo). Cuando lo inserta, Mongo le genera un `_id`
automáticamente y me lo devuelve; por eso lo retorno, para usarlo después al modificar
y dar de baja ese mismo producto.

El `async/await` está porque hablar con la base lleva tiempo y los datos viajan por la
red; el `await` espera la respuesta antes de seguir, sin congelar el programa. El
`try/catch` es para capturar errores (se cae la red, dato inválido), mostrarlos y
volverlos a tirar con `throw` para que quien llamó se entere. Esa estructura
try/catch/finally es la misma que vimos en el ejemplo del driver.

### READ — leer los productos activos (acá vive la baja lógica)

```js
async function listarProductosActivos() {
  try {
    const lista = await productos.find({ eliminado: false }).toArray();
    console.log('READ OK -> productos activos:', lista.length);
    console.log(lista);
    return lista;
  } catch (error) {
    console.error('Error en listarProductosActivos:', error.message);
    throw error;
  }
}
```
Trae los productos que no están dados de baja. La clave es el filtro `{ eliminado: false }`:
le digo a Mongo que me traiga solo los que tienen ese campo en false. El `.toArray()`
está porque `find` devuelve un cursor (un puntero a los resultados), y con `toArray` lo
convierto en una lista normal de JavaScript.

Acá se cumple el requisito de baja lógica del trabajo: "no listar lo que está eliminado".
Si me preguntan cómo evito mostrar lo borrado, la respuesta es este filtro.

### UPDATE — modificar un producto

```js
async function actualizarProducto(id, campos) {
  try {
    const resultado = await productos.updateOne(
      { _id: new ObjectId(id) },
      { $set: campos }
    );
    console.log('UPDATE OK -> modificados:', resultado.modifiedCount);
    return resultado;
  } catch (error) {
    console.error('Error en actualizarProducto:', error.message);
    throw error;
  }
}
```
`updateOne` recibe dos cosas: a quién modifico y qué le cambio.

`{ _id: new ObjectId(id) }` es a quién: busco por ID. El `new ObjectId(id)` está porque
el id me llega como texto pero en la base el `_id` es un ObjectId; si comparo texto contra
ObjectId no encuentra nada, por eso lo convierto.

`{ $set: campos }` es qué le cambio. El `$set` toca solo los campos que le paso y deja el
resto igual. Si pusiera el objeto sin `$set`, Mongo reemplazaría el documento entero y
perdería los campos que no mandé.

### DELETE — la baja lógica

```js
async function bajaLogicaProducto(id) {
  try {
    const resultado = await productos.updateOne(
      { _id: new ObjectId(id) },
      { $set: { eliminado: true, disponible: false, fecha_eliminacion: new Date() } }
    );
    console.log('DELETE LOGICO OK -> modificados:', resultado.modifiedCount);
    return resultado;
  } catch (error) {
    console.error('Error en bajaLogicaProducto:', error.message);
    throw error;
  }
}
```
"Elimina" un producto sin borrarlo de verdad. Fijarse que no uso `deleteOne`, uso
`updateOne` con `$set`: marco `eliminado: true`, pongo `disponible: false` para que quede
coherente, y guardo la fecha de eliminación.

Por qué baja lógica y no borrado físico: el dato queda. Sé qué se eliminó y cuándo, lo
puedo recuperar volviendo a poner `eliminado: false`, y si algo viejo apuntaba a ese
producto no se rompe. El documento sigue en la base; lo que pasa es que la lectura lo
ignora por el filtro `{ eliminado: false }`. Así que la baja lógica es un acuerdo entre
dos funciones: el delete marca y el read filtra.

### La demo que ata todo

```js
await client.connect();   // acá SÍ se abre la conexión real a Atlas
```
Tener el cliente creado no es lo mismo que estar conectado. `connect()` es donde
realmente se autentica y abre el canal con Atlas.

Después la demo hace el ciclo de vida completo: crea el producto, lo lista (aparece), lo
actualiza, le da de baja, y lo vuelve a listar (ya no aparece). Esa última lectura es la
prueba de que la baja lógica funciona.

```js
} finally {
  await client.close();
}
```
El `finally` cierra la conexión pase lo que pase. Dejar conexiones abiertas le consume
recursos al servidor. En el ejemplo del driver de clase también cierran con
`client.close()` en el finally.

```js
if (require.main === module) { ejecutarDemoCRUD(); }
```
Hace que la demo se ejecute solo si corro el archivo directo con `node app.js`.

---

## 4. El backup con mongodump (Unidad 6, Actividad 2)

### Qué es un backup y por qué

Un backup es una copia de la base de datos en un momento específico del tiempo. Incluye
el estado de los datos, los esquemas y otros componentes clave. Se hacen por las dudas:
un ataque de ransomware, una falla de hardware, corrupción del sistema. Es un hábito que
hay que tener de forma periódica.

### Qué tipo de backup hace mi script

Vimos tres tipos:
- **Completo (full):** copia toda la base cada vez que se ejecuta.
- **Incremental:** copia solo lo que cambió desde el último backup (depende del anterior).
- **Diferencial:** copia lo que cambió desde el último backup completo.

**Mi script hace un backup COMPLETO (full):** cada vez que corre, `mongodump` baja la base
entera. Esto es lo más simple y lo más directo de restaurar, que es justo lo que conviene
para un proyecto de esta escala.

### Dónde se guarda (tipo de almacenamiento)

Sobre el almacenamiento vimos tres opciones: on premise (local), cloud (nube) e híbrido.
Mi script guarda la copia de forma **local**, en la carpeta `resguardos_tpi`, con una
subcarpeta por fecha. La base en sí vive en la nube (Atlas), pero el respaldo lo bajo a
mi máquina.

### La herramienta: mongodump

MongoDB ofrece `mongodump`, una herramienta de la terminal que exporta el contenido de
una base a un conjunto de archivos. Esos archivos después sirven para recuperar la base
en otra instancia. `mongodump` puede exportar colecciones y metadatos, configuración,
índices, una base o varias.

La línea clave de mi script:
```bash
mongodump --uri="$MONGODB_URI" --db="$DB_NAME" --out="$DESTINO"
```
- `--uri` la conecta de forma remota al cluster de Atlas (la misma cadena `mongodb+srv://`).
- `--db` le dice que respalde solo mi base y no todo el cluster.
- `--out` le dice dónde dejar los archivos.

Genera archivos `.bson` con los datos y `.json` con los metadatos.

### Lo que hace el resto del script (backup.sh)

- `set -e`: si cualquier comando falla, el script se frena ahí.
- `cd` a la carpeta del script: así las rutas relativas (`resguardos_tpi`) se crean siempre
  al lado del script, sin importar desde dónde lo ejecute. El trabajo pedía rutas relativas.
- chequeo de que `mongodump` esté instalado antes de usarlo.
- cargo el `.env` para reusar la misma cadena de conexión que la app.
- armo la carpeta con la fecha de hoy con `mkdir -p` (crea todo de una y no falla si existe).

El `backup.ps1` hace exactamente lo mismo en Windows, solo cambia la sintaxis (PowerShell).
Tener los dos es para que ande en cualquier sistema operativo.

### Sobre la ejecución manual o automática

Mi backup hoy se ejecuta de forma **manual** (yo corro el script). Vimos que para
información crítica que cambia seguido conviene la ejecución **automática** (por ejemplo
con una tarea programada / cron). Si me preguntan cómo lo automatizaría, diría: programar
el script con cron en Linux/Mac o el Programador de tareas en Windows.

---

## 5. La restauración y el RTO/RPO (Unidad 6, Actividad 3)

### Restaurar con mongorestore

Una restauración es devolver los datos a un estado estable conocido, el de alguno de los
backups guardados. La herramienta es `mongorestore`, que es la contrapartida de
`mongodump`: mientras dump extrae la información y genera los archivos, restore toma esos
archivos y los vuelve a insertar en una instancia de MongoDB.

```bash
mongorestore --uri="$MONGODB_URI" --db=TFI-BaseDeDatos2 ./resguardos_tpi/<fecha>/TFI-BaseDeDatos2
```

Algo que vimos y conviene mencionar: una copia que no se puede restaurar deja de ser un
respaldo útil. Por eso lo ideal es validar el respaldo y hacer pruebas de restauración
periódicas en un entorno de prueba, para estar seguros de que los datos se recuperan bien.

### RTO y RPO (los dos objetivos de continuidad)

Estos dos términos los vimos en la Unidad 6 y son los que guían las decisiones de
restauración.

**RPO (Recovery Point Objective):** define el punto en el tiempo al que puedo volver, o
sea cuántos datos puedo llegar a perder entre el incidente y el último respaldo válido.
En mi caso, si corro el backup una vez por día, en el peor caso pierdo hasta 24 horas de
datos. Si quiero un RPO más chico, tengo que hacer backups más seguido.

**RTO (Recovery Time Objective):** define cuánto tiempo puede estar el sistema fuera de
servicio antes de afectar seriamente a la organización. En mi caso sería el tiempo de:
bajar el backup, correr `mongorestore`, validar los datos y reconectar la app. Para una
base chica como la del trabajo lo estimo en unos 15 a 30 minutos.

También vimos que el tipo de backup afecta la restauración: con backups completos (como el
mío) la restauración es más directa, basta con aplicar el último respaldo. Con
incrementales o diferenciales hay que aplicar una secuencia en orden, lo que puede hacerla
más lenta y compleja.

Forma fácil de no confundirlos: el RPO mira para atrás (cuántos datos perdí) y el RTO mira
para adelante (cuánto tardo en volver).

---

## 6. Repaso final: lo que tengo que poder decir sin leer

Si puedo explicar esto de memoria, estoy listo para la cámara:

- El modelo Cliente-Servidor y los 4 pasos de la comunicación (autenticarse, construir la
  solicitud, preparar los datos, esperar la respuesta).
- Qué es el driver, que es un traductor y que hace serialización/deserialización a BSON.
- Que mi cadena de conexión es `mongodb+srv://` porque es un cluster de Atlas (DNS SRV).
- Por qué elegí driver nativo (app sencilla, sin capas, más directo) y qué me daría un ODM.
- La jerarquía cluster → base → colección → documento.
- Que `client.connect()` y `client.close()` están separados de crear el cliente.
- El filtro `{ eliminado: false }` en la lectura y por qué ahí vive la baja lógica.
- Qué hace `$set` y qué pasaría sin él.
- Por qué convierto el id con `new ObjectId(id)`.
- Baja lógica vs física, con un par de razones.
- Que mi backup es de tipo FULL (completo) y almacenamiento local.
- Qué hace cada flag de `mongodump` y por qué uso rutas relativas.
- Que `mongorestore` es la contrapartida de `mongodump`.
- La definición de RTO y RPO con un número concreto para cada uno en mi proyecto.
- Que una copia que no se puede restaurar no sirve, por eso hay que validar.

La mejor forma de repasar es decirlo en voz alta, como si se lo explicara a un compañero.
Ahí me doy cuenta si lo entendí de verdad o lo estoy repitiendo de memoria.

---

## 7. Posibles preguntas y cómo las contesto

- **¿Qué modelo de comunicación usás?** Cliente-servidor: mi app es el cliente, Atlas es
  el servidor en la nube.

- **¿Qué hace el driver?** Es el traductor entre mi app y Mongo. Gestiona la conexión y la
  autenticación, serializa mis objetos JS a BSON y deserializa las respuestas, y ejecuta
  los comandos.

- **¿Por qué tu URI tiene `+srv`?** Porque me conecto a un cluster de Atlas, que usa
  registro DNS SRV. El formato `mongodb+srv://` es justamente para eso.

- **¿Por qué driver nativo y no Mongoose?** Porque es una app sencilla; el ODM sumaría una
  capa de abstracción que no necesito. El nativo es más directo y eficiente, y lo mantiene
  MongoDB Inc.

- **¿Dónde está la baja lógica?** En dos lados: el delete marca `eliminado: true` en vez de
  borrar, y el read filtra `{ eliminado: false }` para no mostrarlo.

- **¿Por qué `$set`?** Para cambiar solo los campos que paso. Sin él, Mongo reemplazaría el
  documento entero y perdería el resto.

- **¿Por qué `new ObjectId(id)`?** Porque el `_id` está guardado como ObjectId y el id llega
  como texto; si no lo convierto, no matchea.

- **¿Qué tipo de backup hacés?** Completo (full): cada corrida baja la base entera con
  mongodump. Almacenamiento local, ejecución manual.

- **¿Qué hace mongodump y mongorestore?** mongodump exporta la base a archivos; mongorestore
  es la contrapartida, toma esos archivos y los vuelve a cargar en una instancia.

- **¿Qué es RTO y RPO?** RPO: cuántos datos puedo perder (mira atrás), en mi caso hasta 24h
  si el backup es diario. RTO: cuánto tardo en volver a estar operativo (mira adelante), en
  mi caso unos 15 a 30 minutos.

- **¿Por qué no entregás el `.env`?** Porque tiene las credenciales reales de la base.
  Entrego el `.env.example`, que es la plantilla sin datos.
