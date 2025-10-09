const mongoose = require('mongoose');
require('dotenv').config();
const VariedadPapa = require('../modelo/VariedadPapa');

async function verVariedades() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const variedades = await VariedadPapa.find({});
        
        console.log('✅ Variedades encontradas:');
        variedades.forEach((v, index) => {
            console.log(`${index + 1}. Nombre Común: "${v.nombreComun}" | Científico: "${v.nombreCientifico}" | ID: ${v._id}`);
        });
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

verVariedades();