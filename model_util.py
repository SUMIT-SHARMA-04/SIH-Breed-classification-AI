import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress TensorFlow INFO and WARNING logs
import logging
logging.getLogger('absl').setLevel(logging.ERROR)
import numpy as np
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.efficientnet import preprocess_input
from tensorflow.keras.models import load_model


model = load_model("best_model.keras")

class_names = ['.ipynb_checkpoints','Alambadi', 'Amritmahal', 'Ayrshire', 'Banni', 'Bargur', 'Bhadawari', 'Brown_Swiss', 'Dangi', 'Deoni', 'Gir',
               'Holstein_Friesian', 'Jaffrabadi', 'Jersey', 'Kangayam', 'Kasargod', 'Kenkatha', 'Kherigarh', 'Krishna_Valley', 'Mehsana', 'Murrah',
               'Nagori', 'Nili_Ravi', 'Nimari', 'Ongole', 'Red_Sindhi', 'Sahiwal', 'Surti', 'Tharparkar', 'Umblachery']


def predict_breed_from_folder(folder_path, target_size=(300, 300)):
    images = []
    
    for img_file in os.listdir(folder_path):
        img_path = os.path.join(folder_path, img_file)
        if img_file.lower().endswith(('.png', '.jpg', '.jpeg')):
            img = image.load_img(img_path, target_size=target_size)
            img_array = image.img_to_array(img)
            img_array = np.expand_dims(img_array, axis=0)
            img_array = preprocess_input(img_array)
            images.append(img_array)

    if not images:
        raise ValueError("No valid images found in the folder!")

    batch = np.vstack(images)
    preds = model.predict(batch)

    avg_pred = np.mean(preds, axis=0)
    top_indices = avg_pred.argsort()[-3:][::-1]
    top_scores = avg_pred[top_indices]
    top_classes = [class_names[i] for i in top_indices]

    return list(zip(top_classes, top_scores))


