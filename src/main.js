const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0a',
    show: false,
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (pythonProcess) {
      pythonProcess.kill();
    }
  });

  Menu.setApplicationMenu(null);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC EVENTLER

ipcMain.handle('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow.close();
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'tiff'] },
      { name: 'Videos', extensions: ['mp4', 'avi', 'mov', 'mkv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

ipcMain.handle('start-detection', async (event, options) => {
  return new Promise((resolve, reject) => {
    try {
      const scriptPath = path.join(__dirname, '../python/detection_service.py');
      pythonProcess = spawn('python', [scriptPath, JSON.stringify(options)]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();

        // stdout çıktısını satırlara ayır (çoklu json olabilir)
        const lines = data.toString().split('\n').filter(l => l.trim() !== '');
        lines.forEach(line => {
          try {
            const json = JSON.parse(line);

            if (json.type === 'annotated_image') {
              const absolutePath = path.resolve(json.path);
              json.path = 'file://' + absolutePath;
              mainWindow.webContents.send('detection-progress', JSON.stringify(json));
            } else {
              mainWindow.webContents.send('detection-progress', JSON.stringify(json));
            }

          } catch (e) {
            // JSON değilse düz metin olarak gönder
            mainWindow.webContents.send('detection-progress', data.toString());
          }
        });
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        mainWindow.webContents.send('detection-error', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          reject({ success: false, error });
        }
      });

    } catch (err) {
      reject({ success: false, error: err.message });
    }
  });
});

ipcMain.handle('stop-detection', () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
    return { success: true };
  }
  return { success: false };
});


const sharp = require('sharp');  // üstte import edilmeli
const { OpenAI } = require('openai');  // üstte import edilmeli
require('dotenv').config(); // üstte çağrılmalı

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

ipcMain.handle('analyze-person-threat', async (event, cropData) => {
  try {
    console.log("📥 [IPC] analyze-person-threat tetiklendi");
    const { x, y, width, height, imagePath } = cropData;
    console.log(`🧩 Kırpma bilgileri: x=${x}, y=${y}, w=${width}, h=${height}, imagePath=${imagePath}`);

    const image = sharp(imagePath);
    const croppedBuffer = await image.extract({ left: x, top: y, width, height })
                                     .jpeg()
                                     .toBuffer();
    console.log("📷 Kırpma işlemi tamamlandı");

    const base64Image = croppedBuffer.toString('base64');
    console.log("🔁 Görsel base64'e dönüştürüldü");

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Bu kişide silah var mı? Sadece "Evet" veya "Hayır" yaz.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      max_tokens: 10,
      temperature: 0.0
    });

    console.log("🤖 OpenAI'dan cevap alındı:", response.choices[0].message.content);

    const answer = response.choices[0].message.content.trim();
    console.log(`✅ Nihai cevap: "${answer}"`);

    return answer;
  } catch (error) {
    console.error("🔴 analyze-person-threat hatası:", error);
    throw new Error("Tehlike analizi sırasında hata oluştu.");
  }
});

ipcMain.handle('get-system-info', () => {
  const os = require('os');
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    memory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    hostname: os.hostname()
  };
});


ipcMain.handle('open-output-folder', () => {
  const { shell } = require('electron');
  const outputPath = path.join(__dirname, '../output');
  shell.openPath(outputPath);
  return { success: true, path: outputPath };
});