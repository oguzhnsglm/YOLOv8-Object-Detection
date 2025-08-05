# YOLOv8-Object-Detection

# 🔥 Thermal Camera Object Detection

Bu proje, **termal kamera görüntülerinde nesne tespiti (object detection)** yapmak için geliştirilmiştir. 
Klasik RGB kameralar düşük ışıkta yetersiz kalırken, **termal kameralar sıcaklık farklarını algılayarak insan, araç gibi nesneleri gece veya sisli ortamlarda bile net bir şekilde tespit edebilir**.

Bu projede **YOLOv8 modeli** kullanılarak, termal görüntüler üzerinde eğitim yapılmış ve ardından test seti üzerinde nesne tespiti gerçekleştirilmiştir.

---

## 🧠 Teorik Arka Plan

### 📚 Termal Görüntüleme
- Termal kameralar, elektromanyetik spektrumun **kızılötesi (IR)** bandındaki radyasyonu algılar.
- Nesneler arasındaki sıcaklık farklarını yakalayarak görünür ışık olmadan da görüntü üretir.
- Özellikle **savunma sanayi, güvenlik ve gece gözetleme** gibi alanlarda kullanılır.

### 🖼 Nesne Tespiti
- Bu projede kullanılan YOLO (You Only Look Once) modeli, görüntüyü gridlere bölerek her bir grid hücresinde **nesne sınıfını ve bounding box koordinatlarını** aynı anda tahmin eder.
- YOLOv8, önceki sürümlere göre daha hızlı ve daha hassas **anchor-free** mimariye sahiptir.
- Termal görüntülerde RGB’ye göre kontrast yapısı farklı olduğu için, modelin termal görüntülerle eğitilmesi gerekir.

---

## 🚀 Proje Özellikleri
✅ YOLOv8 ile hızlı & hassas object detection  
✅ FLIR ADAS termal görüntü dataset üzerinde test edilmiş yapı  
✅ Annotated (etiketli) görseller ile karşılaştırma  
✅ Kolay kurulum ve çalıştırma


---

# 🔥 Thermal Camera Object Detection

Bu proje, **termal kamera görüntülerinde insan, araç gibi nesneleri tespit etmek için YOLO tabanlı bir derin öğrenme yaklaşımı** uygular.  
Özellikle savunma sanayii, güvenlik ve gece görüş sistemleri gibi düşük ışık koşullarının kritik olduğu uygulamalar için geliştirilmiştir.

---

## 🔧 Kurulum & Ortam Gereksinimleri

Proje Python tabanlı olup aşağıdaki temel paketleri kullanır:

- Python >= 3.8
- torch >= 1.8.0
- torchvision
- ultralytics (YOLOv8 için)
- opencv-python
- numpy, pandas, matplotlib

### 🔥 Örnek pip kurulumu:
```bash
pip install torch torchvision ultralytics opencv-python numpy pandas matplotlib
