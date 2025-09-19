const form = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const fileCountText = document.getElementById('fileCountText');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultDiv = document.getElementById('result');
const resultsList = document.getElementById('resultsList');
const errorDiv = document.getElementById('error');

// Update the UI with the number of selected files
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    fileCountText.textContent = `${fileInput.files.length} file(s) selected.`;
  } else {
    fileCountText.textContent = '';
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Reset previous state
  resultDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');
  resultsList.innerHTML = '';
  loadingIndicator.classList.remove('hidden');

  const formData = new FormData();
  const files = fileInput.files;

  if (files.length === 0) {
    loadingIndicator.classList.add('hidden');
    errorDiv.textContent = 'Please select one or more images to upload.';
    errorDiv.classList.remove('hidden');
    return;
  }

  for (const file of files) {
    formData.append('files', file);
  }

  // Placeholder for your API endpoint. Replace with your actual URL.
  // e.g., 'https://your-api-domain.com/predict'
  const API_URL = '/predict';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'An error occurred during prediction.');
    }

    const data = await response.json();

    loadingIndicator.classList.add('hidden');
    resultDiv.classList.remove('hidden');

    if (data && data.predictions && data.predictions.length > 0) {
      data.predictions.forEach(prediction => {
        const resultItem = document.createElement('li');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `<span class="font-semibold">${prediction.filename}</span>: ${prediction.breed} (${(prediction.confidence * 100).toFixed(2)}%)`;
        resultsList.appendChild(resultItem);
      });
    } else {
      resultsList.innerHTML = '<li class="text-gray-500">No predictions received.</li>';
    }

  } catch (error) {
    loadingIndicator.classList.add('hidden');
    errorDiv.textContent = `Error: ${error.message}`;
    errorDiv.classList.remove('hidden');
  }
});