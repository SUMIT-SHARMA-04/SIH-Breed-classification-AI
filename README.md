# 🐄 AI-Powered Breed Classifier

![Python](https://img.shields.io/badge/Python-3.9%2B-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?logo=fastapi&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-CPU-FF6F00?logo=tensorflow&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-4.x-646CFF?logo=vite&logoColor=white)

An enterprise-grade, Progressive Web App (PWA) designed for Frontline Workers (FLWs) to instantly identify cattle and buffalo breeds using advanced computer vision. Built with a **React + Vite** frontend and a **FastAPI** backend, powered by a highly accurate **EfficientNetB3** neural network.

---

## ✨ Key Features

* **High-Accuracy AI Inference:** Predicts 50+ indigenous dairy breeds using a fine-tuned EfficientNet deep learning model.
* **Native WebRTC Camera:** Directly capture animal photos using mobile or desktop device cameras within the browser.
* **Batch Processing:** Upload multiple images simultaneously. The frontend handles client-side image compression to bypass heavy bandwidth usage and API limits.
* **Secure Data Syncing:** JSON Web Token (JWT) authentication allows workers to securely log in, save historical prediction data, and track past inferences.
* **CSV Export:** Instantly download prediction reports (Filename, Breed, Confidence Score) into a CSV format for spreadsheet or database logging.
* **Glassmorphism UI:** A stunning, fully responsive interface featuring fluid mesh-gradient backgrounds and hardware-accelerated CSS animations.

---

## 📂 Project Structure

```text
📁 Breed-Classifier-Project/
│
├── 📁 backend/
│   ├── main.py                 # FastAPI server, endpoints, and ML routing
│   ├── best_model.keras        # Compiled ML model (Requires manual placement)
│   └── bpa_data.db             # Auto-generated SQLite database for history
│
└── 📁 frontend/
    ├── package.json            # Node dependencies
    ├── vite.config.js          # Vite configuration
    ├── index.html              # Entry HTML file
    └── 📁 src/
        ├── App.jsx             # Main React application component
        └── App.css             # UI styling and animations
```

---

## 🚀 Installation & Setup

### Prerequisites
1. **Python 3.9 to 3.11** (Do not use Python 3.12+ to ensure TensorFlow compatibility).
2. **Node.js** (LTS Version).
3. **Machine Learning Model:** Ensure your trained `best_model.keras` file is placed directly inside the `backend/` folder.

### 1. Backend Setup (FastAPI)
Open a terminal and navigate to the `backend/` directory.

**A. Create and activate a virtual environment:**
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

**B. Install dependencies:**
*(Note: We use `tensorflow-cpu` for lightweight local inference, which works perfectly for AMD GPUs and systems without NVIDIA CUDA cores).*
```bash
pip install fastapi uvicorn[standard] python-multipart sqlalchemy passlib[bcrypt] python-jose[cryptography] slowapi tensorflow-cpu Pillow numpy
```

**C. Start the server:**
```bash
uvicorn main:app --reload
```
*The backend API will now be accessible at `http://127.0.0.1:8000`.*

### 2. Frontend Setup (React/Vite)
Open a **new, separate terminal** and navigate to the `frontend/` directory.

**A. Install Node modules:**
```bash
npm install
```

**B. Start the development server:**
```bash
npm run dev
```
*The web application will now be accessible at `http://localhost:5173`.*

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/predict` | Upload batch images and return breed confidence scores. | Optional |
| `POST` | `/token` | Exchange username/password for a JWT access token. | No |
| `GET` | `/history` | Retrieve saved historical predictions for the logged-in user. | Yes |
| `POST` | `/dev/create_user` | Utility endpoint to create a test user in the database. | No |

---

## ⚠️ Important Notes
* **File Upload Limits:** The backend enforces a strict `5MB` per-file limit. The frontend mitigates this by applying intelligent client-side canvas compression prior to dispatch.
* **Rate Limiting:** The `/predict` endpoint uses SlowAPI to restrict users to **5 requests per minute per IP** to prevent server overloading.
* **Database:** SQLAlchemy handles database generation. A `bpa_data.db` file will automatically be created in the backend folder upon first execution.

---
*Developed for the STRAWHAT BPA Initiative.*