import os
import io
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, status, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, Session, declarative_base, relationship

from jose import JWTError, jwt
from passlib.context import CryptContext
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.efficientnet import preprocess_input
from PIL import Image, UnidentifiedImageError

# --- 1. Configuration & Setup ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Security Config
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day token

# Database Config (Defaults to SQLite for local, Postgres in Docker)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bpa_data.db")

# Rate Limiting Config
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="BPA Breed AI API - Enterprise", version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- 2. Database Models (SQLAlchemy) ---
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    predictions = relationship("PredictionRecord", back_populates="owner")

class PredictionRecord(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    predicted_breed = Column(String, index=True)
    confidence = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Allow anonymous requests
    owner = relationship("User", back_populates="predictions")

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 3. Authentication & Security ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
    except JWTError:
        return None
    return db.query(User).filter(User.username == username).first()

# --- 4. Machine Learning Setup ---
MODEL_PATH = os.getenv("MODEL_PATH", "best_model.keras")
TARGET_SIZE = (300, 300)
MAX_FILE_SIZE_MB = 5
MAX_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# FIXED: Added 'Noise/Invalid' at index 0 to map to the `.ipynb_checkpoints` class trained by mistake.
CLASS_NAMES = [
    'Noise/Invalid', 'Alambadi', 'Amritmahal', 'Ayrshire', 'Banni', 'Bargur', 
    'Bhadawari', 'Brown_Swiss', 'Dangi', 'Deoni', 'Gir', 'Holstein_Friesian', 
    'Jaffrabadi', 'Jersey', 'Kangayam', 'Kasargod', 'Kenkatha', 'Kherigarh', 
    'Krishna_Valley', 'Mehsana', 'Murrah', 'Nagori', 'Nili_Ravi', 'Nimari', 
    'Ongole', 'Red_Sindhi', 'Sahiwal', 'Surti', 'Tharparkar', 'Umblachery'
]

try:
    model = load_model(MODEL_PATH)
    logger.info("Model loaded successfully.")
except Exception as e:
    logger.error(f"Error loading model: {e}")
    model = None

def process_image(img_bytes):
    try:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img = img.resize(TARGET_SIZE)
        img_array = image.img_to_array(img)
        return preprocess_input(img_array)
    except UnidentifiedImageError:
        raise ValueError("Invalid image format.")

# --- 5. API Endpoints ---

@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticates an FLW and returns a JWT."""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/predict")
@limiter.limit("5/minute")
async def predict_breeds(
    request: Request, 
    files: list[UploadFile] = File(...), 
    current_user: Optional[User] = Depends(get_current_user_optional), # Allowed unauthenticated demo requests
    db: Session = Depends(get_db)
):
    """Processes a batch of images, predicts breeds, and saves history."""
    if model is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Model unavailable.")

    batch_images, valid_filenames = [], []

    for file in files:
        if not file.content_type.startswith("image/"):
            continue
        contents = await file.read()
        if len(contents) > MAX_BYTES:
            continue
        try:
            batch_images.append(process_image(contents))
            valid_filenames.append(file.filename)
        except Exception:
            continue

    if not batch_images:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid images to process.")

    try:
        batch_tensor = np.array(batch_images)
        batch_preds = model.predict(batch_tensor)

        predictions_response = []
        db_records = []

        for i, preds in enumerate(batch_preds):
            top_index = np.argmax(preds)
            confidence = float(preds[top_index])
            
            # Map index 0 (Noise) to Uncertain, or map low confidence to Uncertain
            if top_index == 0:
                breed = "Uncertain / Noise"
            else:
                breed = CLASS_NAMES[top_index] if confidence > 0.60 else "Uncertain"
            
            predictions_response.append({
                "filename": valid_filenames[i],
                "breed": breed,
                "confidence": confidence
            })

            # Prepare record for database (owner_id handles None automatically)
            db_records.append(PredictionRecord(
                filename=valid_filenames[i],
                predicted_breed=breed,
                confidence=confidence,
                owner_id=current_user.id if current_user else None
            ))
            
        # Bulk save to Database
        db.add_all(db_records)
        db.commit()
            
        return {"predictions": predictions_response}

    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Prediction failed.")

@app.get("/history")
async def get_prediction_history(current_user: User = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    """Fetches the user's past predictions from the database."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required for history.")
        
    history = db.query(PredictionRecord).filter(PredictionRecord.owner_id == current_user.id).order_by(PredictionRecord.timestamp.desc()).limit(50).all()
    return {"history": history}

# --- Development Utility (Remove in Production) ---
@app.post("/dev/create_user")
async def create_test_user(username: str, password: str, db: Session = Depends(get_db)):
    """Creates a test user. REMOVE THIS ENDPOINT IN PRODUCTION."""
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    new_user = User(username=username, hashed_password=get_password_hash(password))
    db.add(new_user)
    db.commit()
    return {"msg": f"User {username} created. You can now login at /token."}