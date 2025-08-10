// UI Manager - Handles user interface interactions and animations

class UIManager {
    constructor() {
        this.currentTheme = 'dark';
        this.animationSpeed = 300;
        this.notifications = [];
        
        this.init();
    }

    init() {
        this.setupAnimations();
        this.setupNotifications();
        this.setupTooltips();
        this.setupKeyboardShortcuts();
        this.initializeCharts();
    }

    setupAnimations() {
        // Add CSS animations for thermal effects
        const style = document.createElement('style');
        style.textContent = `
            @keyframes thermalPulse {
                0% { opacity: 0.3; }
                50% { opacity: 0.7; }
                100% { opacity: 0.3; }
            }
            
            @keyframes scanLine {
                0% { transform: translateY(-100%); }
                100% { transform: translateY(100vh); }
            }
            
            @keyframes dataFlow {
                0% { transform: translateX(-100%); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translateX(100%); opacity: 0; }
            }
            
            .scan-line {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, #00ff41, transparent);
                animation: scanLine 3s linear infinite;
                z-index: 1000;
                pointer-events: none;
            }
            
            .data-flow {
                position: absolute;
                width: 100px;
                height: 2px;
                background: linear-gradient(90deg, transparent, #00bfff, transparent);
                animation: dataFlow 2s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }

    setupNotifications() {
        // Create notification container
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(notificationContainer);
    }

    setupTooltips() {
        // Add tooltips to buttons and controls
        const tooltips = {
            'loadFileBtn': 'Load thermal image or video file',
            'startDetectionBtn': 'Start YOLOv8 object detection',
            'stopDetectionBtn': 'Stop detection process',
            'confidenceSlider': 'Adjust detection confidence threshold',
            'clearLogsBtn': 'Clear system logs'
        };

        Object.entries(tooltips).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) {
                element.title = text;
                element.addEventListener('mouseenter', (e) => {
                    this.showTooltip(e.target, text);
                });
                element.addEventListener('mouseleave', () => {
                    this.hideTooltip();
                });
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + O: Open file
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                document.getElementById('loadFileBtn').click();
            }
            
            // Space: Start/Stop detection
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                const startBtn = document.getElementById('startDetectionBtn');
                const stopBtn = document.getElementById('stopDetectionBtn');
                
                if (!startBtn.disabled) {
                    startBtn.click();
                } else if (!stopBtn.disabled) {
                    stopBtn.click();
                }
            }
            
            // F11: Toggle fullscreen
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
            
            // Escape: Close overlays
            if (e.key === 'Escape') {
                this.closeOverlays();
            }
        });
    }

    initializeCharts() {
        // Initialize detection chart if Chart.js is available
        const chartCanvas = document.getElementById('detectionChart');
        if (chartCanvas && typeof Chart !== 'undefined') {
            this.detectionChart = new Chart(chartCanvas, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Detections',
                        data: [],
                        borderColor: '#00ff41',
                        backgroundColor: 'rgba(0, 255, 65, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#ffffff'
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#ffffff' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            ticks: { color: '#ffffff' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 20px;
            margin-bottom: 10px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>${message}</span>
                <button style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px;">&times;</button>
            </div>
        `;

        // Add close functionality
        notification.querySelector('button').addEventListener('click', () => {
            this.removeNotification(notification);
        });

        // Add to container
        document.getElementById('notificationContainer').appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }

        this.notifications.push(notification);
        return notification;
    }

    removeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    getNotificationColor(type) {
        const colors = {
            info: '#00bfff',
            success: '#00ff41',
            warning: '#ff6b35',
            error: '#ff3333'
        };
        return colors[type] || colors.info;
    }

    showTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.id = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10001;
            pointer-events: none;
            white-space: nowrap;
            border: 1px solid #00ff41;
        `;

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
    }

    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    addScanLine() {
        const scanLine = document.createElement('div');
        scanLine.className = 'scan-line';
        document.body.appendChild(scanLine);

        setTimeout(() => {
            if (scanLine.parentNode) {
                scanLine.parentNode.removeChild(scanLine);
            }
        }, 3000);
    }

    addDataFlow(container) {
        const dataFlow = document.createElement('div');
        dataFlow.className = 'data-flow';
        container.appendChild(dataFlow);

        setTimeout(() => {
            if (dataFlow.parentNode) {
                dataFlow.parentNode.removeChild(dataFlow);
            }
        }, 2000);
    }

    updateDetectionChart(detectionCount) {
        if (!this.detectionChart) return;

        const now = new Date().toLocaleTimeString();
        const data = this.detectionChart.data;

        data.labels.push(now);
        data.datasets[0].data.push(detectionCount);

        // Keep only last 20 data points
        if (data.labels.length > 20) {
            data.labels.shift();
            data.datasets[0].data.shift();
        }

        this.detectionChart.update();
    }

    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }

    closeOverlays() {
        // Close loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay && loadingOverlay.style.display !== 'none') {
            loadingOverlay.style.display = 'none';
        }

        // Close any open modals or popups
        document.querySelectorAll('.modal, .popup').forEach(element => {
            element.style.display = 'none';
        });
    }

    showLoadingSpinner(container) {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.style.margin = '20px auto';
        container.appendChild(spinner);
        return spinner;
    }

    removeLoadingSpinner(spinner) {
        if (spinner && spinner.parentNode) {
            spinner.parentNode.removeChild(spinner);
        }
    }

    animateValue(element, start, end, duration = 1000) {
        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (end - start) * progress;
            element.textContent = Math.round(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    highlightElement(element, duration = 2000) {
        const originalBackground = element.style.backgroundColor;
        element.style.backgroundColor = 'rgba(0, 255, 65, 0.3)';
        element.style.transition = 'background-color 0.3s ease';
        
        setTimeout(() => {
            element.style.backgroundColor = originalBackground;
        }, duration);
    }

    // Thermal-specific UI effects
    triggerThermalAlert() {
        this.addScanLine();
        this.showNotification('Thermal signature detected!', 'warning');
        
        // Flash the system status
        const statusIndicator = document.getElementById('systemStatus');
        if (statusIndicator) {
            statusIndicator.style.animation = 'pulse 0.5s ease-in-out 3';
        }
    }

    updateSystemMetrics(metrics) {
        // Animate CPU usage
        const cpuElement = document.getElementById('cpuInfo');
        if (cpuElement && metrics.cpu) {
            this.animateValue(cpuElement, 0, metrics.cpu);
        }

        // Animate memory usage
        const memoryElement = document.getElementById('memoryInfo');
        if (memoryElement && metrics.memory) {
            this.animateValue(memoryElement, 0, metrics.memory);
        }
    }
    drawDetections(canvas, detections) {
        if (!canvas || !detections) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        detections.forEach(det => {
            const { x, y, width, height, class: label, confidence, weaponStatus } = det;

            // Kutu rengi
            let boxColor = 'cyan';
            if (label === 'person') {
                if (weaponStatus === 'danger') boxColor = 'red';
                else if (weaponStatus === 'safe') boxColor = 'lime';
            }

            // Kutu çizimi
            ctx.strokeStyle = boxColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            // Etiket yazısı
            let tag = label;
            if (label === 'person') {
                if (weaponStatus === 'danger') tag = '🔴 Tehlikeli';
                else if (weaponStatus === 'safe') tag = '🟢 Güvenli';
                else return; // Belirsizse hiç yazı yazma
            }

            // Yazı arka planı
            ctx.font = 'bold 14px Arial';
            const textWidth = ctx.measureText(tag).width;
            ctx.fillStyle = boxColor;
            ctx.fillRect(x, y - 18, textWidth + 10, 18);

            // Yazı metni
            ctx.fillStyle = 'black';
            ctx.fillText(tag, x + 5, y - 5);
        });
    }
    updateCanvas(detections) {
        const canvas = document.getElementById('detectionCanvas'); // <canvas id="detectionCanvas"> olmalı
        if (canvas) {
            this.drawDetections(canvas, detections);
        }
    }
    
}

// Initialize UI manager
document.addEventListener('DOMContentLoaded', () => {
    window.uiManager = new UIManager();
    
    // Show welcome notification
    setTimeout(() => {
        window.uiManager.showNotification('Thermal Defense Detection System initialized', 'success');
    }, 1000);
});