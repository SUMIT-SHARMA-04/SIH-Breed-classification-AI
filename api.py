# main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import shutil
import tempfile
from model_util import predict_breed_from_folder  # Assuming model_util.py is in the same directory

# Initialize the FastAPI app
app = FastAPI()

@app.post("/predict")
async def predict_breed_from_images(files: list[UploadFile] = File(...)):
    """
    Predicts the breed of cattle from a batch of uploaded images.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No images uploaded.")

    # Create a temporary directory to save the uploaded files
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Save each uploaded file to the temporary directory
        for file in files:
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        
        # Use the ML utility function to get predictions from the temporary folder
        predictions = predict_breed_from_folder(temp_dir)
        
        # Prepare the response data as a list of dictionaries
        response_predictions = []
        for filename, pred in zip([file.filename for file in files], predictions):
            response_predictions.append({
                "filename": filename,
                "breed": pred[0],
                "confidence": pred[1]
            })
            
        return JSONResponse(content={"predictions": response_predictions})

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {str(e)}")
    finally:
        # Clean up the temporary directory after processing
        shutil.rmtree(temp_dir)