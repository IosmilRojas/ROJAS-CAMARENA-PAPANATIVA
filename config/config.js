const path = require('path');

module.exports = {
    mongodb: {
        uri: process.env.MONGODB_URI,
        localUri: process.env.MONGODB_LOCAL
    },
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    uploads: {
        directory: path.join(__dirname, '..', process.env.UPLOAD_DIR),
        maxSize: parseInt(process.env.MAX_FILE_SIZE),
        allowedTypes: process.env.ALLOWED_FILE_TYPES.split(',')
    },
    model: {
        path: path.join(__dirname, '..', process.env.MODEL_PATH),
        inputSize: parseInt(process.env.MODEL_INPUT_SIZE),
        classes: process.env.MODEL_CLASSES.split(',')
    }
};