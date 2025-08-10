// Main Application Logic
const { ipcRenderer } = require('electron');
const path = require('path');

class ThermalDetectionApp {
    constructor() {
        this.isDetectionRunning = false;
        this.currentMedia = null;
        this.detectionResults = [];
        this.systemInfo = null;
        
        this.init();
    }

    async init() {
        await this.loadSystemInfo();
        this.setupEventListeners();
        this.setupIPC();
        this.initializeUI();
        this.startSystemMonitoring();
    }

    async loadSystemInfo() {
        try {
            this.systemInfo = await ipcRenderer.invoke('get-system-info');
            this.updateSystemInfo();
        } catch (error) {
            console.error('Failed to load system info:', error);
        }
    }

    updateSystemInfo() {
        if (!this.systemInfo) return;
        
        document.getElementById('cpuInfo').textContent = `${this.systemInfo.cpus} cores`;
        document.getElementById('memoryInfo').textContent = `${this.systemInfo.memory} GB`;
    }

    setupEventListeners() {
        // Title bar controls
        document.getElementById('minimizeBtn').addEventListener('click', () => {
            ipcRenderer.invoke('minimize-window');
        });

        document.getElementById('maximizeBtn').addEventListener('click', () => {
            ipcRenderer.invoke('maximize-window');
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            ipcRenderer.invoke('close-window');
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchSection(e.currentTarget.dataset.section);
            });
        });

        // File loading
        document.getElementById('loadFileBtn').addEventListener('click', () => {
            this.loadMediaFile();
        });

        // Detection controls
        document.getElementById('startDetectionBtn').addEventListener('click', () => {
            this.startDetection();
        });

        document.getElementById('stopDetectionBtn').addEventListener('click', () => {
            this.stopDetection();
        });

        document.getElementById('analyzeThreatBtn').addEventListener('click', () => {
            this.analyzeThreats();  // ⬅️ Tanımladığın analiz fonksiyonunu çağırır
        });

        // Settings
        document.getElementById('confidenceSlider').addEventListener('input', (e) => {
            document.getElementById('confidenceValue').textContent = e.target.value;
        });

        // Clear logs
        document.getElementById('clearLogsBtn').addEventListener('click', () => {
            this.clearLogs();
        });
    }

    setupIPC() {
        // Detection progress
        ipcRenderer.on('detection-progress', (event, data) => {
            this.handleDetectionProgress(data);
        });

        // Detection errors
        ipcRenderer.on('detection-error', (event, error) => {
            this.handleDetectionError(error);
        });
    }

    initializeUI() {
        this.addLog('System initialized successfully', 'info');
        this.updateDetectionStats();
    }

    startSystemMonitoring() {
        setInterval(() => {
            this.updateSystemStatus();
        }, 5000);
    }

    updateSystemStatus() {
        const statusIndicator = document.getElementById('systemStatus');
        const statusText = document.querySelector('.status-text');
        
        if (this.isDetectionRunning) {
            statusIndicator.className = 'status-indicator processing';
            statusText.textContent = 'DETECTION ACTIVE';
        } else {
            statusIndicator.className = 'status-indicator active';
            statusText.textContent = 'SYSTEM OPERATIONAL';
        }
    }

    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}-section`).classList.add('active');

        this.addLog(`Switched to ${sectionName} section`, 'info');
    }

    async loadMediaFile() {
        try {
            const result = await ipcRenderer.invoke('select-file');
            
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                this.currentMedia = filePath;
                
                this.displayMedia(filePath);
                document.getElementById('startDetectionBtn').disabled = false;
                
                this.addLog(`Media loaded: ${path.basename(filePath)}`, 'info');
            }
        } catch (error) {
            this.addLog(`Failed to load media: ${error.message}`, 'error');
        }
    }

    displayMedia(filePath) {
        const mediaDisplay = document.getElementById('mediaDisplay');
        const fileExtension = path.extname(filePath).toLowerCase();
        
        // Clear previous content
        mediaDisplay.innerHTML = '';
        
        if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff'].includes(fileExtension)) {
            // Display image
            const img = document.createElement('img');
            img.src = filePath;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            mediaDisplay.appendChild(img);
        } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(fileExtension)) {
            // Display video
            const video = document.createElement('video');
            video.src = filePath;
            video.controls = true;
            video.style.width = '100%';
            video.style.height = '100%';
            mediaDisplay.appendChild(video);
        }
    }

    async startDetection() {
        if (!this.currentMedia) {
            this.addLog('No media loaded for detection', 'warning');
            return;
        }

        this.isDetectionRunning = true;
        this.updateDetectionButtons();
        this.showLoadingOverlay('Starting detection...');

        const options = {
            mediaPath: this.currentMedia,
            confidence: parseFloat(document.getElementById('confidenceSlider').value),
            detectPerson: document.getElementById('personCheck').checked,
            detectCar: document.getElementById('carCheck').checked,
            modelType: document.getElementById('modelSelect').value,
            imageSize: parseInt(document.getElementById('imageSizeSelect').value)
        };

        try {
            this.addLog('Detection started', 'info');
            await ipcRenderer.invoke('start-detection', options);
        } catch (error) {
            this.addLog(`Detection failed: ${error.message}`, 'error');
            this.isDetectionRunning = false;
            this.updateDetectionButtons();
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async stopDetection() {
        try {
            await ipcRenderer.invoke('stop-detection');
            this.isDetectionRunning = false;
            this.updateDetectionButtons();
            this.addLog('Detection stopped', 'warning');
        } catch (error) {
            this.addLog(`Failed to stop detection: ${error.message}`, 'error');
        }
    }

    async analyzeThreats() {
        this.showLoadingOverlay("Tehlike analizi yapılıyor...");
        this.addLog('Tehlike analizi başlatıldı.', 'info');

        try {
            const lastDetections = this.detectionResults[this.detectionResults.length - 1];

            if (!lastDetections || lastDetections.detections.length === 0) {
                this.addLog('Tehlike analizi için yeterli veri yok.', 'warning');
                return;
            }

            const personDetections = lastDetections.detections.filter(det => det.class.toLowerCase() === 'person');

            if (personDetections.length === 0) {
                this.addLog('Tehlike analizi için kişi bulunamadı.', 'warning');
                return;
            }

            let anyThreatDetected = false;
            let allClear = true;

            for (let i = 0; i < personDetections.length; i++) {
                const person = personDetections[i];

                const cropData = {
                    x: person.x,
                    y: person.y,
                    width: person.width,
                    height: person.height,
                    imagePath: this.currentMedia
                };

                const result = await ipcRenderer.invoke('analyze-person-threat', cropData);
                const cleanedResult = result.trim().toLowerCase().replace(/\./g, '');

                if (cleanedResult === "evet") {
                    this.addLog(`🔴 Tehlike tespit edildi: ${i + 1}. şahıs silahlı.`, 'error');
                    person.weaponStatus = 'danger'; // 🔴 silahlı
                    anyThreatDetected = true;
                    allClear = false;
                } else if (cleanedResult === "hayır") {
                    this.addLog(`🟢 Güvenli: ${i + 1}. şahıs silahsız.`, 'success');
                    person.weaponStatus = 'safe'; // 🟢 silahsız
                } else {
                    this.addLog(`⚫ Belirsiz: ${i + 1}. kişi analiz edilemedi.`, 'warning');
                    person.weaponStatus = 'unknown'; // ⚫ anlaşılamadı
                    allClear = false;
                }
            }

            // Kutucuklar yeniden çizilsin
            this.drawCanvas(lastDetections.detections); // ✅ DOĞRU

            if (allClear) {
                this.addLog('✅ Tüm şahıslar silahsız olarak değerlendirildi.', 'success');
            } else if (!anyThreatDetected) {
                this.addLog('ℹ️ Şüpheli durum bulunamadı, ancak bazı analizler belirsiz.', 'info');
            }

        } catch (error) {
            this.addLog(`Tehlike analizi sırasında hata oluştu: ${error.message}`, 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }


    updateDetectionButtons() {
        document.getElementById('startDetectionBtn').disabled = this.isDetectionRunning || !this.currentMedia;
        document.getElementById('stopDetectionBtn').disabled = !this.isDetectionRunning;
    }

    handleDetectionProgress(data) {
        try {
            const result = JSON.parse(data);
            
            if (result.type === 'detection_result') {
                this.detectionResults.push(result.results);
                this.updateDetectionResults(result.results);
                this.updateDetectionStats();
                
                this.addLog(`Detected ${result.results.detections.length} objects`, 'info');
            } else if (result.type === 'annotated_image') {
                // OUTPUT RESMİNİ ANA ARAYÜZE KOPYALA
                this.replaceWithOutputImage(result.path);
                this.addLog(`Output resmi ana ekrana yüklendi: ${path.basename(result.path)}`, 'success');
            } else if (result.type === 'log') {
                this.addLog(result.message, result.level);
            }
        } catch (error) {
            // Handle non-JSON progress messages
            this.addLog(data.trim(), 'info');
        }
    }

    // OUTPUT KLASÖRÜNDEN ANA ARAYÜZE COPY-PASTE
    replaceWithOutputImage(imagePath) {
        console.log('🔥 OUTPUT RESMİNİ ANA ARAYÜZE KOPYALIYORUM:', imagePath);
        
        const mediaDisplay = document.getElementById('mediaDisplay');
        const existingImg = mediaDisplay.querySelector('img');
        
        if (existingImg) {
            // Yeni annotated image oluştur
            const newImg = document.createElement('img');
            newImg.src = imagePath + '?t=' + Date.now(); // Cache busting
            newImg.style.width = '100%';
            newImg.style.height = '100%';
            newImg.style.objectFit = 'contain';
            newImg.style.border = '2px solid #00ff41';
            newImg.style.borderRadius = '4px';
            
            // Eski resmi yenisiyle değiştir
            existingImg.replaceWith(newImg);
            
            // Başarı göstergesi ekle
            const indicator = document.createElement('div');
            indicator.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background: #00ff41;
                color: black;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                z-index: 10;
            `;
            indicator.textContent = '✅ DETECTION COMPLETE';
            
            // Eski göstergeyi kaldır
            const oldIndicator = mediaDisplay.querySelector('.detection-indicator');
            if (oldIndicator) oldIndicator.remove();
            
            indicator.classList.add('detection-indicator');
            mediaDisplay.appendChild(indicator);
            
            console.log('✅ OUTPUT RESMİ BAŞARIYLA KOPYALANDI!');
        }
    }

    handleDetectionError(error) {
        this.addLog(`Detection error: ${error}`, 'error');
    }

    updateDetectionResults(result) {
        if (!result.detections) return;

        const detectionList = document.getElementById('detectionList');
        
        // Clear previous results for single image
        if (result.detections.length > 0) {
            detectionList.innerHTML = '';
        }

        result.detections.forEach((detection, index) => {
            const item = document.createElement('div');
            item.className = 'detection-item';

            const colors = {
                person: '#ff6b35',
                car: '#00ff41'
            };
            const color = colors[detection.class] || '#ffffff';

            item.innerHTML = `
                <div class="detection-info">
                    <span class="detection-class" style="color: ${color};">
                        ${detection.class.toUpperCase()}
                    </span>
                    <span class="detection-confidence" style="color: ${color};">
                        ${(detection.confidence * 100).toFixed(1)}%
                    </span>
                </div>
                <div class="detection-coords">
                    <small>Position: [${detection.x}, ${detection.y}] Size: ${detection.width}×${detection.height}</small>
                </div>
            `;

            detectionList.appendChild(item);
        });

        // 👇️ Buraya ekle
        const hasPerson = result.detections.some(d => d.class && d.class.toLowerCase() === 'person');
        if (hasPerson) {
            document.getElementById('analyzeThreatBtn').disabled = false;
            this.addLog('Tehlike tespiti aktif edildi (person bulundu)', 'success');
        }

        detectionList.scrollTop = detectionList.scrollHeight;
    }


    updateDetectionStats() {
        const lastResult = this.detectionResults[this.detectionResults.length - 1];
        if (!lastResult || !lastResult.detections) return;

        const personCount = lastResult.detections.filter(d => d.class === 'person').length;
        const vehicleCount = lastResult.detections.filter(d => d.class === 'car').length;
        const objectCount = lastResult.detections.length;

        document.getElementById('objectCount').textContent = objectCount;
        document.getElementById('personCount').textContent = personCount;
        document.getElementById('vehicleCount').textContent = vehicleCount;
    }


    showLoadingOverlay(text) {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = text;
        overlay.style.display = 'flex';
    }

    hideLoadingOverlay() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    addLog(message, type = 'info') {
        const logTerminal = document.getElementById('logTerminal');
        const timestamp = new Date().toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-message">${message}</span>
        `;
        
        logTerminal.appendChild(logEntry);
        logTerminal.scrollTop = logTerminal.scrollHeight;
    }

    clearLogs() {
        document.getElementById('logTerminal').innerHTML = '';
        this.addLog('Logs cleared', 'info');
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.thermalApp = new ThermalDetectionApp();

});