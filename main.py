import os
import io
import logging
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.efficientnet import preprocess_input
from PIL import Image

# Initialize the App
app = FastAPI()

# --- CORS Configuration ---
# This allows your webpage (running on a different port/domain) to talk to this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace "*" with your specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration & Model Loading ---
MODEL_PATH = "best_model.keras"
TARGET_SIZE = (300, 300)

# Class names from your model_util.py
CLASS_NAMES = [
    '.ipynb_checkpoints', 'Alambadi', 'Amritmahal', 'Ayrshire', 'Banni', 'Bargur', 
    'Bhadawari', 'Brown_Swiss', 'Dangi', 'Deoni', 'Gir', 'Holstein_Friesian', 
    'Jaffrabadi', 'Jersey', 'Kangayam', 'Kasargod', 'Kenkatha', 'Kherigarh', 
    'Krishna_Valley', 'Mehsana', 'Murrah', 'Nagori', 'Nili_Ravi', 'Nimari', 
    'Ongole', 'Red_Sindhi', 'Sahiwal', 'Surti', 'Tharparkar', 'Umblachery'
]

# Load model once at startup to save time per request
try:
    model = load_model(MODEL_PATH)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# --- Helper Function ---
def process_image(img_bytes):
    """Converts uploaded bytes to a preprocessed numpy array."""
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img = img.resize(TARGET_SIZE)
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)
    return img_array

# --- API Endpoint ---
@app.post("/predict")
async def predict_breeds(files: list[UploadFile] = File(...)):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded.")

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    predictions_response = []

    try:
        for file in files:
            # Read file content
            contents = await file.read()
            
            # Preprocess
            processed_img = process_image(contents)
            
            # Predict
            preds = model.predict(processed_img)
            
            # Get top prediction (taking the highest score)
            top_index = np.argmax(preds[0])
            breed = CLASS_NAMES[top_index]
            confidence = float(preds[0][top_index])
            
            # Append to results
            predictions_response.append({
                "filename": file.filename,
                "breed": breed,
                "confidence": confidence
            })
            
        return {"predictions": predictions_response}

    except Exception as e:
        logging.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)