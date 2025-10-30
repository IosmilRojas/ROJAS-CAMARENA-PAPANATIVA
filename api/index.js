const serverless = require('serverless-http');
const app = require('../PMV1/app'); // ruta relativa a tu app
const { connectToMongo } = require('../PMV1/db');

module.exports = async (req, res) => {
  // Conectar a Mongo (reutiliza si ya está conectado)
  try {
    await connectToMongo();
  } catch (err) {
    console.error('Error conectando a MongoDB:', err);
    // devolver 500 si la BD falla
    res.statusCode = 500;
    res.end('Database connection error');
    return;
  }

  // Delegar a serverless wrapper
  const handler = serverless(app);
  return handler(req, res);
};