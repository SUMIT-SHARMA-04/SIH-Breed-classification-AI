import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const API_URL = import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000';

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Client-side image compression to bypass the 5MB backend limit
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Resize to 800px width (plenty for ML model)
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8); // 80% quality JPEG
      };
    };
  });
};

const exportToCSV = (results) => {
  if (!results || results.length === 0) return;
  const headers = "Filename,Predicted Breed,Confidence Score\n";
  const csvData = results.map(r => `"${r.filename}","${r.breed}","${(r.confidence * 100).toFixed(2)}%"`).join("\n");
  const blob = new Blob([headers + csvData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `Breed_Analysis.csv`; a.click();
  window.URL.revokeObjectURL(url);
};


// ==========================================
// COMPONENTS
// ==========================================

const Navbar = ({ token, setLoginModalOpen, fetchHistory, handleLogout, deferredPrompt, handleInstallPWA }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="glass-nav fade-down">
      <div className="container nav-content">
        <a href="#/" className="brand">
          <svg className="brand-logo" viewBox="0 0 100 100" fill="none">
            <path d="M50 5L90 25V60C90 75 75 90 50 95C25 90 10 75 10 60V25L50 5Z" fill="url(#grad1)" stroke="#059669" strokeWidth="4"/>
            <path d="M50 25C35 25 30 40 30 50C30 65 50 75 50 75C50 75 70 65 70 50C70 40 65 25 50 25Z" fill="#ecfdf5" stroke="#047857" strokeWidth="3"/>
            <circle cx="50" cy="45" r="5" fill="#059669"/>
            <defs>
              <linearGradient id="grad1" x1="10" y1="5" x2="90" y2="95" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffffff" stopOpacity="0.9"/><stop offset="1" stopColor="#d1fae5" stopOpacity="0.9"/>
              </linearGradient>
            </defs>
          </svg>
          <h1 className="brand-title">AI BREED CLASSIFIER</h1>
        </a>
        
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path></svg>
        </button>

        <nav className={`desktop-nav ${isMobileMenuOpen ? 'open' : ''}`}>
          <ul>
            <li><a href="#/" onClick={() => setIsMobileMenuOpen(false)}>Analyzer Home</a></li>
            <li><a href="#/contact" onClick={() => setIsMobileMenuOpen(false)}>Contact Support</a></li>
            {token ? (
              <>
                <li><button onClick={() => { fetchHistory(); setIsMobileMenuOpen(false); }} className="nav-link-btn">History</button></li>
                <li><button onClick={handleLogout} className="btn-outline-small">Logout</button></li>
              </>
            ) : (
              <li><button onClick={() => { setLoginModalOpen(true); setIsMobileMenuOpen(false); }} className="nav-cta">Account Login</button></li>
            )}
            {deferredPrompt && <li><button onClick={handleInstallPWA} className="btn-pwa">Install App</button></li>}
          </ul>
        </nav>
      </div>
    </header>
  );
};

const CameraOverlay = ({ setIsCameraOpen, validateAndSetFiles }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch (err) {
        alert("Camera access denied or unavailable.");
        setIsCameraOpen(false);
      }
    };
    initCamera();
    return () => stream && stream.getTracks().forEach(t => t.stop());
    // eslint-disable-next-line
  }, []);

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      validateAndSetFiles([new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })]);
      setIsCameraOpen(false);
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="camera-overlay">
      <div className="camera-container">
        <div className="camera-header">
          <h3>Take Animal Photo</h3>
          <button onClick={() => setIsCameraOpen(false)} className="close-btn">&times;</button>
        </div>
        <video ref={videoRef} autoPlay playsInline className="camera-video"></video>
        <canvas ref={canvasRef} className="hidden"></canvas>
        <div className="camera-controls"><button onClick={takeSnapshot} className="btn-capture"></button></div>
      </div>
    </div>
  );
};

const AnalyzerForm = ({ token }) => {
  const [fileObjects, setFileObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => fileObjects.forEach(obj => URL.revokeObjectURL(obj.preview));
  }, [fileObjects]);

  const validateAndSetFiles = async (filesArray) => {
    setError(''); setResults(null);
    const validFiles = filesArray.filter(file => file.type.startsWith('image/'));
    
    // Process files through compression
    const processedFiles = await Promise.all(validFiles.map(async file => {
      return file.size > 1024 * 1024 ? await compressImage(file) : file;
    }));

    const newFileObjects = processedFiles.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setFileObjects(prev => [...prev, ...newFileObjects]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileObjects.length === 0) return setError('Please select images.');
    
    setLoading(true); setError('');
    const formData = new FormData();
    fileObjects.forEach(obj => formData.append('files', obj.file));

    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${API_URL}/predict`, { method: 'POST', headers, body: formData });
      
      // Handle Rate Limiting gracefully
      if (res.status === 429) throw new Error("You are analyzing too fast. Please wait 60 seconds.");
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).detail || 'Prediction failed.');
      
      const data = await res.json();
      setResults(data.predictions.map(pred => ({
        ...pred, preview: fileObjects.find(obj => obj.file.name === pred.filename)?.preview 
      })));
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isCameraOpen && <CameraOverlay setIsCameraOpen={setIsCameraOpen} validateAndSetFiles={validateAndSetFiles} />}
      
      <section className="section-padding fade-up delay-2">
        <div className="container">
          <div className="demo-wrapper glass-panel">
            <div className="demo-header">
              <h2>AI Breed Analyzer</h2>
              <p>Upload files or use your mobile camera directly.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="upload-form">
              <div className="camera-actions">
                <button type="button" className="btn btn-camera w-full flex-center shadow-glow" onClick={() => setIsCameraOpen(true)}>
                  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                  Use Live Camera
                </button>
              </div>

              <div className="divider"><span>OR UPLOAD</span></div>

              <div 
                className={`drop-zone ${isDragging ? 'dragging' : ''} ${fileObjects.length > 0 ? 'has-files' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                onDrop={e => { e.preventDefault(); setIsDragging(false); validateAndSetFiles(Array.from(e.dataTransfer.files)); }}
                onClick={() => fileInputRef.current.click()}
              >
                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={e => validateAndSetFiles(Array.from(e.target.files))} />
                {fileObjects.length === 0 ? (
                  <div className="drop-content">
                    <div className="drop-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg></div>
                    <h3>Upload Gallery Images</h3>
                    <p>Supports Batch Processing (Auto-Compressed)</p>
                  </div>
                ) : (
                  <div className="file-preview-container">
                    {fileObjects.map((obj, i) => (
                      <div key={i} className="file-preview fade-in">
                        <img src={obj.preview} alt="preview" />
                        <span className="file-name">{obj.file.name}</span>
                        <div className="crop-badge">Ready</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <div className="error-banner scale-in">{error}</div>}

              <div className="form-actions">
                 {fileObjects.length > 0 && <button type="button" className="btn btn-clear" onClick={() => setFileObjects([])}>Clear List</button>}
                <button type="submit" className={`btn btn-primary submit-btn flex-grow ${loading ? 'loading-state' : ''}`} disabled={loading || fileObjects.length === 0}>
                  {loading ? <span className="spinner"></span> : 'Analyze with AI'}
                </button>
              </div>
            </form>

            {results && !loading && (
              <div className="results-container">
                <div className="flex-between results-header">
                  <h3>Inference Results</h3>
                  <button onClick={() => exportToCSV(results)} className="btn btn-export">
                    <svg className="icon-sm mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download CSV
                  </button>
                </div>
                <div className="results-grid">
                  {results.map((pred, idx) => (
                    <div key={idx} className="result-card slide-right" style={{animationDelay: `${idx * 0.1}s`}}>
                      {pred.preview && <img src={pred.preview} alt="Thumb" className="result-thumb" />}
                      <div className="result-details">
                        <span className="result-filename">{pred.filename}</span>
                        <h4 className={pred.breed.includes('Uncertain') ? 'text-warning' : 'text-success'}>{pred.breed}</h4>
                        <div className="progress-bg">
                          <div className={`progress-fill ${pred.confidence > 0.8 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${pred.confidence * 100}%` }}></div>
                        </div>
                      </div>
                      <div className="result-score"><strong>{(pred.confidence * 100).toFixed(1)}%</strong></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};


// ==========================================
// MAIN APP COMPONENT
// ==========================================

export default function App() {
  // --- Routing ---
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#/');
  
  useEffect(() => {
    const onHashChange = () => setCurrentPath(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // --- Auth State ---
  const [token, setToken] = useState(localStorage.getItem('bpa_token') || null);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  // --- History State ---
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  // --- PWA State ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault(); setAuthError('');
    const formData = new URLSearchParams();
    formData.append('username', loginData.username);
    formData.append('password', loginData.password);
    try {
      const res = await fetch(`${API_URL}/token`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      setToken(data.access_token); localStorage.setItem('bpa_token', data.access_token);
      setLoginModalOpen(false);
    } catch (err) { setAuthError(err.message); }
  };

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/history`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch history');
      setHistoryData((await res.json()).history);
      setHistoryOpen(true);
    } catch (err) { if (err.message.includes('401')) { setToken(null); localStorage.removeItem('bpa_token'); } }
  };

  return (
    <div className="app-wrapper load-animate">
      <div className="global-animated-bg"></div>

      <Navbar 
        token={token} 
        setLoginModalOpen={setLoginModalOpen} 
        fetchHistory={fetchHistory} 
        handleLogout={() => { setToken(null); localStorage.removeItem('bpa_token'); }} 
        deferredPrompt={deferredPrompt}
        handleInstallPWA={() => { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => setDeferredPrompt(null)); }}
      />

      {/* MODALS */}
      {isLoginModalOpen && (
        <div className="modal-overlay" onClick={() => setLoginModalOpen(false)}>
          <div className="modal-content scale-in" onClick={e => e.stopPropagation()}>
            <h3>Account Login</h3>
            <form onSubmit={handleLogin} className="auth-form">
              <input type="text" placeholder="Username" required value={loginData.username} onChange={e => setLoginData({...loginData, username: e.target.value})} />
              <input type="password" placeholder="Password" required value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
              {authError && <p className="text-danger text-sm">{authError}</p>}
              <button type="submit" className="btn btn-primary w-full">Authenticate</button>
            </form>
          </div>
        </div>
      )}

      {isHistoryOpen && (
        <div className="modal-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="modal-content history-modal scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex-between">
              <h3>My Prediction History</h3>
              <button onClick={() => setHistoryOpen(false)} className="close-btn">&times;</button>
            </div>
            <div className="history-list">
              {historyData.length === 0 ? <p>No past predictions found.</p> : historyData.map((record, i) => (
                <div key={i} className="history-item slide-right" style={{animationDelay: `${i * 0.05}s`}}>
                  <div>
                    <strong>{record.predicted_breed}</strong>
                    <span className="history-date">{new Date(record.timestamp).toLocaleString()}</span>
                  </div>
                  <span className={`badge-score ${record.confidence > 0.8 ? 'bg-success' : 'bg-warning'}`}>
                    {(record.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ROUTES */}
      {currentPath === '#/' && (
        <div className="view-container fade-in">
          <section className="hero fade-up">
            <div className="container hero-content text-center">
              <span className="badge">AI Vision System</span>
              <h2 className="hero-title">Identify Dairy Breeds Instantly</h2>
              <p className="hero-subtitle">Equipping field teams with an advanced neural network for real-time cattle classification.</p>
            </div>
          </section>

          <section id="features" className="section-padding fade-up delay-1">
            <div className="container">
              <div className="section-header"><h2>Key Advantages</h2></div>
              <div className="features-grid">
                <div className="feature-card glass-panel">
                  <div className="feature-icon text-agri"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg></div>
                  <h4>High Accuracy AI</h4><p>Powered by EfficientNet trained on 50+ indigenous dairy breeds.</p>
                </div>
                <div className="feature-card glass-panel">
                  <div className="feature-icon text-agri"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div>
                  <h4>Real-Time Processing</h4><p>Achieve lightning-fast inference times with auto-image compression.</p>
                </div>
                <div className="feature-card glass-panel">
                  <div className="feature-icon text-agri"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg></div>
                  <h4>WebRTC Camera</h4><p>Frame and capture images directly utilizing built-in device cameras.</p>
                </div>
              </div>
            </div>
          </section>

          <AnalyzerForm token={token} />
        </div>
      )}

      {currentPath === '#/contact' && (
        <div className="view-container contact-page fade-in">
          <section className="section-padding">
            <div className="container">
              <div className="contact-box glass-panel scale-in">
                <h2>Contact Technical Support</h2>
                <form className="contact-form" action="https://formspree.io/f/your_endpoint_here" method="POST">
                  <div className="input-group">
                    <input type="text" name="name" placeholder="Your Name" required />
                    <input type="email" name="email" placeholder="Your Email Address" required />
                  </div>
                  <textarea name="message" placeholder="How can we help you?" rows="5" required></textarea>
                  <button type="submit" className="btn btn-primary w-full">Send Message</button>
                </form>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* FOOTER */}
      <footer className="glass-panel footer-override">
        <div className="container footer-content flex-between">
          <div className="footer-brand text-agri">
            <strong>AI BREED CLASSIFIER</strong>
            <span className="text-sm ml-2 text-muted">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="footer-contact-info">
            <a href="mailto:support@strawhat.in">support@strawhat.in</a><span>|</span>
            <a href="tel:+9118001234567">+91 1800-123-4567</a>
          </div>
        </div>
      </footer>
    </div>
  );
}