from tensorflow.keras.models import load_model

def export_model(model, model_name='potato_variety_classifier.h5'):
    # Save the model in H5 format
    model.save(model_name)
    print(f'Model saved as {model_name}')

    # Convert the model to TensorFlow.js format
    import tensorflowjs as tfjs
    tfjs.converters.save_keras_model(model, 'tfjs_model')
    print('Model converted to TensorFlow.js format and saved in "tfjs_model" directory.')