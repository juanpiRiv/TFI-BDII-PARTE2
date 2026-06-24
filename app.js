require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

if (!uri || !dbName) {
  console.error('Faltan variables de entorno. Configura MONGODB_URI y DB_NAME en .env.');
  process.exit(1);
}

const client = new MongoClient(uri);
const db = client.db(dbName);
const productos = db.collection('productos');

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

async function ejecutarDemoCRUD() {
  let idCreado;

  try {
    await client.connect();
    console.log('Conectado a MongoDB Atlas.');

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

    await actualizarProducto(idCreado, {
      precio: 9000,
      stock: 8,
      descripcion: 'Pizza clasica de muzzarella (actualizada)'
    });

    await bajaLogicaProducto(idCreado);

    console.log('Listado final de activos (el producto dado de baja no debe aparecer):');
    await listarProductosActivos();
  } catch (error) {
    console.error('Error en la demo CRUD:', error.message);
  } finally {
    await client.close();
    console.log('Conexion cerrada.');
  }
}

if (require.main === module) {
  ejecutarDemoCRUD();
}
