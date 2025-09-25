import os
import tensorflow as tf
from preprocessing import load_and_preprocess_data
from train import train_model
from validate import validate_model
from export_model import export_trained_model

def main():
    # Load and preprocess the data
    train_data, val_data = load_and_preprocess_data()

    # Train the model
    model = train_model(train_data, val_data)

    # Validate the model
    validate_model(model, val_data)

    # Export the trained model
    export_trained_model(model)

if __name__ == "__main__":
    main()