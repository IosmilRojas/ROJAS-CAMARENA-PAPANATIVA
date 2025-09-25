def display_prediction_examples(model, images, class_names, num_examples=5):
    import numpy as np
    import matplotlib.pyplot as plt

    # Randomly select examples to display
    indices = np.random.choice(len(images), num_examples, replace=False)
    selected_images = images[indices]

    plt.figure(figsize=(15, 5))
    for i, idx in enumerate(indices):
        img = selected_images[i]
        img = np.expand_dims(img, axis=0)  # Add batch dimension
        predictions = model.predict(img)
        predicted_class = class_names[np.argmax(predictions)]
        predicted_prob = np.max(predictions)

        plt.subplot(1, num_examples, i + 1)
        plt.imshow(img[0] / 255.0)  # Normalize for display
        plt.title(f"{predicted_class}\n{predicted_prob:.2f}")
        plt.axis('off')

    plt.show()