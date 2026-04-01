# 🐄 AI-Powered Livestock Breed Classifier

![SIH Badge](https://img.shields.io/badge/Smart_India_Hackathon-Project-orange?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.8%2B-blue?style=for-the-badge&logo=python)
![Django](https://img.shields.io/badge/Django-Full_Stack-092E20?style=for-the-badge&logo=django)
![Deep Learning](https://img.shields.io/badge/Deep_Learning-CNN-red?style=for-the-badge)

## 📌 Project Overview
Developed for the **Smart India Hackathon (SIH)**, this repository hosts a full-stack web application designed for the accurate, image-based classification of diverse Indian livestock breeds. 

Currently, breed registration relies heavily on manual entry, which is prone to human error and data inconsistencies. This system digitizes and standardizes the identification process. By providing field workers with an intuitive interface to upload images and receive instant, AI-driven predictions, this tool improves data integrity crucial for genetic improvement and national conservation programs.

## ✨ Key Features
* **Instant Breed Identification:** Upload an image of a bovine and receive real-time classification results.
* **High-Accuracy DL Model:** Leverages a Convolutional Neural Network (CNN) with Transfer Learning (ResNet/MobileNet) fine-tuned specifically for Indian bovine breeds.
* **User-Friendly Interface:** A responsive, accessible web frontend designed for field workers operating in varied environments.
* **Standardized Data Collection:** Automatically logs predictions to a centralized database, minimizing manual data entry errors.

## 🛠️ Technology Stack
* **Frontend:** HTML5, CSS3, JavaScript, Bootstrap/Tailwind (for responsive design)
* **Backend:** Django (Python Web Framework)
* **Machine Learning:** TensorFlow / Keras (or PyTorch), OpenCV, NumPy, Pandas
* **Model Architecture:** Convolutional Neural Network (CNN) utilizing Transfer Learning
* **Database:** SQLite (Development) / PostgreSQL (Production)

## 🧠 Core Model Technology
The prediction engine uses state-of-the-art Deep Learning techniques to achieve fine-grained classification:
1. **Preprocessing:** Images are standardized, resized, and augmented to handle varied lighting and angles common in field photography.
2. **Transfer Learning:** We utilize pre-trained base models (such as ResNet50 or MobileNetV2) to extract complex feature representations, drastically reducing training time while boosting accuracy on our specific livestock dataset.
3. **Inference Pipeline:** The trained weights are loaded into the Django backend, where incoming images are processed and passed through the model to return the highest-confidence breed prediction.

## 🚀 Setup & Installation

### Prerequisites
* Python 3.8 or higher
* Git

### Local Development Setup
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/yourusername/livestock-breed-classifier.git](https://github.com/yourusername/livestock-breed-classifier.git)
   cd livestock-breed-classifier
Create and activate a virtual environment:
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
Install the required dependencies:

Bash
pip install -r requirements.txt
Download the pre-trained model weights:

Place your trained .h5 or .pt model file inside the designated directory (e.g., model_assets/). Note: Model files are often too large for GitHub and should be downloaded via a release link.

Run database migrations:

Bash
python manage.py makemigrations
python manage.py migrate
Start the development server:

Bash
python manage.py runserver
The application will now be running at http://127.0.0.1:8000/.

💻 Usage
Navigate to the homepage on your local browser.

Click on the "Upload Image" section.

Select a clear photo of the livestock.

Click "Analyze". The system will process the image and display the predicted breed along with a confidence score.

Authorized users can save the result directly to the unified registry.

🔮 Future Scope
Offline Functionality: Transitioning the web app to a Progressive Web App (PWA) to allow field workers to capture data without an active internet connection, syncing once back online.

Expanded Database: Continuously training the model with new data to include rare and region-specific breeds.

Health Analytics: Integrating secondary models to detect visible signs of common skin diseases or nutritional deficiencies from the uploaded images.

🤝 Contributing
Contributions are welcome! If you'd like to improve the model accuracy, enhance the Django backend, or refine the UI:

Fork the repository.

Create your feature branch (git checkout -b feature/AmazingFeature).

Commit your changes (git commit -m 'Add some AmazingFeature').

Push to the branch (git push origin feature/AmazingFeature).

Open a Pull Request.
