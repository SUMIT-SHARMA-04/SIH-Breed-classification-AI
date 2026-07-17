# AI-Powered Breed Classifier (STRAWHAT BPA)

An enterprise-grade, Progressive Web App (PWA) designed for frontline agricultural workers. This system utilizes a fine-tuned EfficientNetB3 neural network to classify over 29 indigenous Indian cattle and buffalo breeds in real-time.

## ✨ Key Features
* **Real-Time AI Inference:** Identifies dairy breeds instantly using a custom Keras model.
* **WebRTC Camera Integration:** Take photos directly from your device camera without leaving the browser.
* **Batch Processing:** Upload multiple gallery images at once for rapid herd analysis.
* **Secure Authentication:** JWT-based login system for frontline workers.
* **Cloud Sync & History:** Automatically saves prediction history to a local SQLite database.
* **CSV Data Export:** Download analysis reports directly to CSV for database syncing.

## 🛠️ Technology Stack
* **Frontend:** React.js, Vite, Custom CSS (Glassmorphism UI), HTML5 WebRTC.
* **Backend:** Python, FastAPI, SQLAlchemy, SlowAPI (Rate Limiting), JWT (Jose).
* **Machine Learning:** TensorFlow/Keras, NumPy, Pillow (PIL).

---

## 📂 Project Structure
Ensure your project directory looks like this before starting:

```text
📁 Breed-Classifier-Project/
│
├── 📁 backend/
│   ├── main.py
│   ├── best_model.keras    <-- MUST be placed here!
│   └── bpa_data.db         <-- Auto-generated after first run
│
└── 📁 frontend/
    ├── package.json
    ├── index.html
    └── 📁 src/
        ├── App.jsx
        ├── App.css
        └── main.jsx


🚀 Installation & Setup Guide
Prerequisites
Python (v3.9 - v3.11 recommended)

Node.js (LTS version)

1. Backend Setup (FastAPI & Machine Learning)
Open your terminal and navigate to the backend folder.

Create and activate a virtual environment:
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate

Install dependencies:
pip install fastapi uvicorn[standard] python-multipart sqlalchemy passlib[bcrypt] python-jose[cryptography] slowapi tensorflow-cpu Pillow numpy

Start the Backend Server:
uvicorn main:app --reload
The backend API will be available at http://127.0.0.1:8000

2. Frontend Setup (React & Vite)
Open a new, separate terminal and navigate to your frontend folder.

Install Node dependencies:

npm install

The frontend interface will be available at http://localhost:5173 (or the port specified in your terminal).

💻 Usage Instructions
Access the App: Open your browser and go to the frontend URL (e.g., http://localhost:5173).

Create a User (Dev Mode): To use the History features, you need an account. Since the app is in development, you can create a user by sending a POST request to http://127.0.0.1:8000/dev/create_user with a username and password via Postman or Swagger UI (http://127.0.0.1:8000/docs).

Login: Click "Account Login" in the navbar and enter your credentials.

Analyze: Click "Use Live Camera" to snap a photo, or drag-and-drop files into the upload zone. Click "Analyze with AI".

Export: Once results appear, click "Download CSV" to export your data.

⚠️ Important Notes
File Limits: The backend enforces a strict 5MB maximum limit per image.

Rate Limiting: To prevent server overload, the API is limited to 5 prediction requests per minute per IP address.

Model Missing Error: If the backend throws a 503 Service Unavailable, ensure your best_model.keras file is in the exact same directory as your main.py file.
