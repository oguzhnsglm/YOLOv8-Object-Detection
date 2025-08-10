// Detection Module - Handles YOLOv8 detection visualization and processing

class DetectionManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.detectionBoxes = [];
        this.colors = {
            person: '#ff6b35',
            car: '#00ff41',
            default: '#ffffff'
        };
        
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupCanvas();
                this.setupDetectionOverlay();
            });
        } else {
            this.setupCanvas();
            this.setupDetectionOverlay();
        }
    }

    setupCanvas() {
        console.log('Setting up canvas...');
        const mediaDisplay = document.getElementById('mediaDisplay');
        if (!mediaDisplay) {
            console.error('Media display not found');
            return;
        }

        // Remove existing canvas if any
        const existingCanvas = document.getElementById('detectionCanvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'detectionCanvas';
        
        // Make mediaDisplay relative for absolute positioning
        mediaDisplay.style.position = 'relative';
        
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 100;
            width: 100%;
            height: 100%;
        `;
        
        this.ctx = this.canvas.getContext('2d');
        mediaDisplay.appendChild(this.canvas);
        
        console.log('Canvas created and added to media display');
        
        // Initial resize
        setTimeout(() => {
            this.resizeCanvas();
        }, 100);
        
        // Resize canvas when window resizes
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    setupDetectionOverlay() {
        const mediaDisplay = document.getElementById('mediaDisplay');
        if (!mediaDisplay) return;
        
        let thermalOverlay = document.getElementById('thermalOverlay');
        if (!thermalOverlay) {
            thermalOverlay = document.createElement('div');
            thermalOverlay.className = 'thermal-overlay';
            thermalOverlay.id = 'thermalOverlay';
            mediaDisplay.appendChild(thermalOverlay);
        }
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        const mediaDisplay = document.getElementById('mediaDisplay');
        if (!mediaDisplay) return;
        
        const rect = mediaDisplay.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        console.log(`Canvas resized to: ${rect.width}x${rect.height}`);
        
        // Redraw detections if any
        if (this.detectionBoxes.length > 0) {
            setTimeout(() => {
                this.redrawDetections();
            }, 50);
        }
    }

    processDetectionResults(results) {
        console.log('Processing detection results:', results);
        
        if (!results || !results.detections) {
            console.log('No detections to process');
            this.clearDetections();
            return;
        }

        // Store detection results
        this.detectionBoxes = results.detections;
        
        console.log(`Number of detections to draw: ${this.detectionBoxes.length}`);
        
        // Make sure canvas is visible
        if (this.canvas) {
            this.canvas.style.display = 'block';
        }
        
        // Draw detections
        this.drawAllDetections();
        this.updateThreatAssessment(results.detections);
        this.triggerThermalEffect();
    }

    drawAllDetections() {
        if (!this.ctx || !this.detectionBoxes.length) {
            console.log('No context or detections to draw');
            return;
        }

        // Clear canvas first
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        console.log(`Drawing ${this.detectionBoxes.length} detections`);
        
        this.detectionBoxes.forEach((detection, index) => {
            this.drawDetectionBox(detection, index);
        });
    }

    drawDetectionBox(detection, index) {
        if (!this.ctx) return;

        const { x, y, width, height, class: className, confidence, weaponStatus } = detection;
        
        // Tehlike durumuna göre renk belirleme
        let color = this.colors[className] || this.colors.default;
        if (className === 'person' && weaponStatus) {
            if (weaponStatus === 'danger') {
                color = '#ff0000'; // Kırmızı - Tehlikeli
            } else if (weaponStatus === 'safe') {
                color = '#00ff00'; // Yeşil - Güvenli
            }
        }

        console.log(`Drawing detection: ${className} at [${x}, ${y}] size: ${width}x${height}, weaponStatus: ${weaponStatus}`);

        // Get media display and current media element
        const mediaDisplay = document.getElementById('mediaDisplay');
        const img = mediaDisplay.querySelector('img');
        const video = mediaDisplay.querySelector('video');
        const mediaElement = img || video;
        
        if (!mediaElement) {
            console.warn('No media element found for scaling');
            // Fallback to simple drawing
            this.drawSimpleBox(x, y, width, height, className, confidence, color, weaponStatus);
            return;
        }

        // Get display container dimensions
        const displayRect = mediaDisplay.getBoundingClientRect();
        
        // Get actual media dimensions
        let mediaWidth, mediaHeight;
        if (img) {
            mediaWidth = img.naturalWidth || img.width || 640;
            mediaHeight = img.naturalHeight || img.height || 480;
        } else if (video) {
            mediaWidth = video.videoWidth || video.width || 640;
            mediaHeight = video.videoHeight || video.height || 480;
        }

        // Calculate the actual displayed size considering object-fit: contain
        let displayedWidth, displayedHeight, offsetX = 0, offsetY = 0;
        
        const mediaAspectRatio = mediaWidth / mediaHeight;
        const containerAspectRatio = displayRect.width / displayRect.height;
        
        if (mediaAspectRatio > containerAspectRatio) {
            // Media is wider - fit to width
            displayedWidth = displayRect.width;
            displayedHeight = displayRect.width / mediaAspectRatio;
            offsetY = (displayRect.height - displayedHeight) / 2;
        } else {
            // Media is taller - fit to height
            displayedHeight = displayRect.height;
            displayedWidth = displayRect.height * mediaAspectRatio;
            offsetX = (displayRect.width - displayedWidth) / 2;
        }

        // Calculate scale factors
        const scaleX = displayedWidth / mediaWidth;
        const scaleY = displayedHeight / mediaHeight;

        // Scale coordinates and add offsets
        const scaledX = (x * scaleX) + offsetX;
        const scaledY = (y * scaleY) + offsetY;
        const scaledWidth = width * scaleX;
        const scaledHeight = height * scaleY;

        // Draw the detection box with enhanced visuals
        this.drawEnhancedBox(scaledX, scaledY, scaledWidth, scaledHeight, className, confidence, color, weaponStatus, index);
    }

    drawSimpleBox(x, y, width, height, className, confidence, color, weaponStatus) {
        // Simple fallback drawing
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);
        
        // Draw label
        const label = this.getLabel(className, weaponStatus);
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(label, x, y - 5);
    }

    drawEnhancedBox(x, y, width, height, className, confidence, color, weaponStatus, index) {
        // Draw main bounding box with glow effect
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 8;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, width, height);

        // Reset shadow
        this.ctx.shadowBlur = 0;

        // Draw semi-transparent fill
        this.ctx.fillStyle = color + '20';
        this.ctx.fillRect(x, y, width, height);

        // Draw corner brackets
        this.drawCornerBrackets(x, y, width, height, color);

        // Draw label with threat status
        this.drawThreatLabel(x, y, width, className, confidence, color, weaponStatus, index);
    }

    drawCornerBrackets(x, y, width, height, color) {
        const bracketSize = Math.min(20, width / 4, height / 4);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;

        // Top-left
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + bracketSize);
        this.ctx.lineTo(x, y);
        this.ctx.lineTo(x + bracketSize, y);
        this.ctx.stroke();

        // Top-right
        this.ctx.beginPath();
        this.ctx.moveTo(x + width - bracketSize, y);
        this.ctx.lineTo(x + width, y);
        this.ctx.lineTo(x + width, y + bracketSize);
        this.ctx.stroke();

        // Bottom-left
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + height - bracketSize);
        this.ctx.lineTo(x, y + height);
        this.ctx.lineTo(x + bracketSize, y + height);
        this.ctx.stroke();

        // Bottom-right
        this.ctx.beginPath();
        this.ctx.moveTo(x + width - bracketSize, y + height);
        this.ctx.lineTo(x + width, y + height);
        this.ctx.lineTo(x + width, y + height - bracketSize);
        this.ctx.stroke();
    }

    drawThreatLabel(x, y, width, className, confidence, color, weaponStatus, index) {
        const classText = className.toUpperCase();
        const confidenceText = `${(confidence * 100).toFixed(1)}%`;
        const targetId = `TGT-${String(index + 1).padStart(2, '0')}`;
        
        // Tehlike durumu metni
        let threatText = '';
        let threatColor = color;
        let threatIcon = '';
        
        if (className === 'person' && weaponStatus) {
            if (weaponStatus === 'danger') {
                threatText = 'TEHLİKELİ';
                threatColor = '#ff0000';
                threatIcon = '⚠️';
            } else if (weaponStatus === 'safe') {
                threatText = 'GÜVENLİ';
                threatColor = '#00ff00';
                threatIcon = '✓';
            }
            // Belirsiz durumda hiçbir şey gösterme
        }
        
        this.ctx.font = 'bold 12px "Courier New", monospace';
        
        // Calculate label dimensions
        const lines = [classText, confidenceText, targetId];
        if (threatText) lines.push(threatText);
        
        const maxWidth = Math.max(...lines.map(text => this.ctx.measureText(text).width));
        const labelHeight = 15 * lines.length + 10;
        const padding = 8;
        const labelX = x;
        const labelY = Math.max(5, y - labelHeight - 5);
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(labelX, labelY, maxWidth + padding * 2 + 20, labelHeight);
        
        // Border
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(labelX, labelY, maxWidth + padding * 2 + 20, labelHeight);
        
        // Top accent
        this.ctx.fillStyle = threatColor || color;
        this.ctx.fillRect(labelX, labelY, maxWidth + padding * 2 + 20, 2);

        // Draw text
        let currentY = labelY + 15;
        
        // Class name
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 11px "Courier New", monospace';
        this.ctx.fillText(classText, labelX + padding, currentY);
        currentY += 15;
        
        // Confidence
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 9px "Courier New", monospace';
        this.ctx.fillText(confidenceText, labelX + padding, currentY);
        currentY += 15;
        
        // Target ID
        this.ctx.fillStyle = '#888888';
        this.ctx.fillText(targetId, labelX + padding, currentY);
        currentY += 15;
        
        // Threat status (if person)
        if (threatText) {
            this.ctx.fillStyle = threatColor;
            this.ctx.font = 'bold 11px "Courier New", monospace';
            this.ctx.fillText(`${threatIcon} ${threatText}`, labelX + padding, currentY);
        }

        // Crosshair icon
        this.drawCrosshair(labelX + maxWidth + padding + 10, labelY + 15, color);
    }

    drawCrosshair(x, y, color) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        
        // Crosshair lines
        this.ctx.beginPath();
        this.ctx.moveTo(x - 5, y);
        this.ctx.lineTo(x + 5, y);
        this.ctx.moveTo(x, y - 5);
        this.ctx.lineTo(x, y + 5);
        this.ctx.stroke();
        
        // Circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    getLabel(className, weaponStatus) {
        if (className === 'person' && weaponStatus) {
            if (weaponStatus === 'danger') return 'TEHLİKELİ';
            if (weaponStatus === 'safe') return 'GÜVENLİ';
        }
        return className.toUpperCase();
    }

    clearDetections() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Remove scanning lines
        document.querySelectorAll('[style*="scanVertical"]').forEach(el => el.remove());
        
        this.detectionBoxes = [];
        console.log('Detections cleared');
    }

    redrawDetections() {
        if (this.detectionBoxes.length > 0) {
            this.drawAllDetections();
        }
    }

    updateDetectionBoxes(updatedDetections) {
        // Update the stored detections with new threat status
        this.detectionBoxes = updatedDetections;
        // Redraw all boxes with updated information
        this.drawAllDetections();
    }

    updateThreatAssessment(detections) {
        const threatLevel = this.calculateThreatLevel(detections);
        const threatMeter = document.getElementById('threatLevel');
        
        if (threatMeter) {
            const threatIndicator = threatMeter.querySelector('.threat-indicator');
            if (threatIndicator) {
                threatIndicator.style.width = `${threatLevel}%`;
                
                if (threatLevel < 25) {
                    threatIndicator.style.background = '#00ff41';
                } else if (threatLevel < 50) {
                    threatIndicator.style.background = '#ffff00';
                } else if (threatLevel < 75) {
                    threatIndicator.style.background = '#ff6b35';
                } else {
                    threatIndicator.style.background = '#190707ff';
                }
            }
        }
    }

    calculateThreatLevel(detections) {
        if (!detections || detections.length === 0) return 0;

        let threatScore = 0;
        const maxDetections = 10;

        // Base score from number of detections
        threatScore += (detections.length / maxDetections) * 30;
        
        // Score from high confidence detections
        const highConfidenceDetections = detections.filter(d => d.confidence > 0.7);
        threatScore += (highConfidenceDetections.length / detections.length) * 20;
        
        // Score from person detections
        const personDetections = detections.filter(d => d.class === 'person');
        threatScore += (personDetections.length / detections.length) * 20;
        
        // Additional score from weapon detection
        const dangerousPersons = detections.filter(d => d.class === 'person' && d.weaponStatus === 'danger');
        if (dangerousPersons.length > 0) {
            threatScore += 30 + (dangerousPersons.length * 10);
        }

        return Math.min(threatScore, 100);
    }

    triggerThermalEffect() {
        const thermalOverlay = document.getElementById('thermalOverlay');
        if (thermalOverlay) {
            thermalOverlay.style.animation = 'none';
            setTimeout(() => {
                thermalOverlay.style.animation = 'thermalPulse 2s ease-in-out';
            }, 10);
        }
    }
}

// Initialize detection manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing DetectionManager...');
    window.detectionManager = new DetectionManager();
});