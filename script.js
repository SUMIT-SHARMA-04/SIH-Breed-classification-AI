function predictBreed() {
  const input = document.getElementById('imageUpload');
  const resultDiv = document.getElementById('result');

  if (!input.files || input.files.length === 0) {
    resultDiv.innerText = "Please upload an image of an animal.";
    return;
  }

  // Simulated prediction (you can integrate real model via API later)
  const breeds = ["Gir", "Murrah", "Sahiwal", "Red Sindhi", "Jersey Cross"];
  const randomBreed = breeds[Math.floor(Math.random() * breeds.length)];
  const confidence = (Math.random() * 20 + 80).toFixed(2);

  resultDiv.innerHTML = `
    <p>Predicted Breed: <strong>${randomBreed}</strong></p>
    <p>Confidence: ${confidence}%</p>
  `;
}
