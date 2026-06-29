// Cargamos las variables del archivo .env (URI y nombre de la base).
// Asi no quemamos credenciales dentro del codigo fuente.
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

// Si falta alguna variable cortamos al toque. Mejor fallar aca con un mensaje
// claro que mas adelante con un error raro de conexion.
if (!uri || !dbName) {
  console.error('Faltan variables de entorno. Configura MONGODB_URI y DB_NAME en .env.');
  process.exit(1);
}

const client = new MongoClient(uri);
const db = client.db(dbName);
// Trabajamos siempre sobre la coleccion Productos del sistema de delivery.
const productos = db.collection('Productos');

// --- CREATE ---
// Da de alta un producto nuevo en el catalogo.
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

// --- READ ---
// Solo traemos los productos activos. Filtramos por eliminado: false porque
// los que fueron dados de baja siguen en la base, pero no queremos mostrarlos.
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

// --- UPDATE ---
// Modifica solo los campos que le pasamos. Usamos $set para no pisar el resto
// del documento (sin $set, MongoDB reemplazaria el documento entero).
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

// --- DELETE (baja logica) ---
// No borramos el documento de la base. En su lugar lo marcamos como eliminado.
// Asi conservamos el historial para auditoria y se podria recuperar si hace falta.
async function bajaLogicaProducto(id) {
  try {
    const resultado = await productos.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          eliminado: true,
          disponible: false,
          fecha_eliminacion: new Date()
        }
      }
    );
    console.log('DELETE LOGICO OK -> modificados:', resultado.modifiedCount);
    return resultado;
  } catch (error) {
    console.error('Error en bajaLogicaProducto:', error.message);
    throw error;
  }
}

// Demo que corre las 4 operaciones en orden para mostrar el ciclo completo.
async function ejecutarDemoCRUD() {
  let idCreado;

  try {
    await client.connect();
    console.log('Conectado a MongoDB Atlas.');

    // Producto de ejemplo. Arranca activo (eliminado: false) para que despues
    // lo podamos ver en el READ y darlo de baja al final.
    const productoEjemplo = {
      nombre: 'Pizza Muzzarella',
      descripcion: 'Pizza clasica de muzzarella',
      precio: 8500,
      categoria: 'Pizzas',
      stock: 10,
      disponible: true,
      eliminado: false,
      fecha_creacion: new Date(),
      tags: ['pizza', 'queso', 'delivery']
    };

    idCreado = await crearProducto(productoEjemplo);
    await listarProductosActivos();

    // Actualizamos precio, stock y descripcion del producto recien creado.
    await actualizarProducto(idCreado, {
      precio: 9000,
      stock: 8,
      descripcion: 'Pizza clasica de muzzarella (actualizada)'
    });

    await bajaLogicaProducto(idCreado);

    // Volvemos a listar para comprobar que el producto dado de baja
    // ya no aparece entre los activos. Esa es la prueba de la baja logica.
    console.log('Listado final de activos (el producto dado de baja no debe aparecer):');
    await listarProductosActivos();
  } catch (error) {
    console.error('Error en la demo CRUD:', error.message);
  } finally {
    // Pase lo que pase, cerramos la conexion para no dejar el cliente colgado.
    await client.close();
    console.log('Conexion cerrada.');
  }
}

// Solo arranca la demo si ejecutamos este archivo directamente (node app.js).
// Asi las funciones se podrian importar desde otro modulo sin disparar la demo.
if (require.main === module) {
  ejecutarDemoCRUD();
}
