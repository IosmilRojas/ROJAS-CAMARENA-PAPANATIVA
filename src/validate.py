import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import os

def validate_model(model, validation_data_dir, target_size=(224, 224), batch_size=32, min_accuracy=0.85):
    validation_datagen = ImageDataGenerator(rescale=1.0/255)
    
    validation_generator = validation_datagen.flow_from_directory(
        validation_data_dir,
        target_size=target_size,
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=False
    )
    
    loss, accuracy = model.evaluate(validation_generator)
    print(f'Validation Loss: {loss:.4f}')
    print(f'Validation Accuracy: {accuracy:.4f}')
    
    if accuracy >= min_accuracy:
        print(f'Model validation successful. Accuracy meets the requirement of {min_accuracy*100}%.')
    else:
        print(f'Model validation failed. Accuracy is below the requirement of {min_accuracy*100}%.')