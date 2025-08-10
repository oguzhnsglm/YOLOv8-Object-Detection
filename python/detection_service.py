#!/usr/bin/env python3
"""
Thermal Object Detection Service
YOLOv8 based thermal camera object detection for defense applications
"""

import sys
import json
import cv2
import numpy as np
from ultralytics import YOLO
import time
import os
from pathlib import Path

class ThermalDetectionService:
    def __init__(self, options):
        self.options = options
        self.model = None
        self.class_names = {0: 'person', 1: 'car'}
        self.colors = {
            'person': (255, 107, 53),  # Orange
            'car': (0, 255, 65)        # Green
        }
        
        self.load_model()
    
    def load_model(self):
        """Load YOLOv8 model"""
        try:
            model_path = self.get_model_path()
            if os.path.exists(model_path):
                self.model = YOLO(model_path)
                self.log_info(f"Loaded custom thermal model: {model_path}")
            else:
                # Use pre-trained model
                model_type = self.options.get('modelType', 'yolov8m')
                self.model = YOLO(f'{model_type}.pt')
                self.log_info(f"Loaded pre-trained model: {model_type}")
                
        except Exception as e:
            self.log_error(f"Failed to load model: {str(e)}")
            sys.exit(1)
    
    def get_model_path(self):
        """Get path to custom thermal model"""
        script_dir = Path(__file__).parent.parent
        return script_dir / "termal_model.pt"
    
    def process_media(self):
        """Process image or video file"""
        media_path = self.options['mediaPath']
        
        if not os.path.exists(media_path):
            self.log_error(f"Media file not found: {media_path}")
            return
        
        file_ext = Path(media_path).suffix.lower()
        
        if file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
            self.process_image(media_path)
        elif file_ext in ['.mp4', '.avi', '.mov', '.mkv']:
            self.process_video(media_path)
        else:
            self.log_error(f"Unsupported file format: {file_ext}")
    
    def process_image(self, image_path):
        """Process single image"""
        try:
            self.log_info(f"Processing image: {os.path.basename(image_path)}")
            
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                self.log_error("Failed to load image")
                return
            
            self.log_info(f"Image loaded successfully: {image.shape}")
            
            # Run detection
            results = self.detect_objects(image)
            
            # ALWAYS draw detection boxes and save, even if no detections
            annotated_image = self.draw_detection_boxes(image.copy(), results['detections'])
            self.save_annotated_image(annotated_image, image_path)
            
            # Send results
            self.send_results(results, 0)
            
            self.log_info("Image processing completed")
            
        except Exception as e:
            self.log_error(f"Error processing image: {str(e)}")
    
    def process_video(self, video_path):
        """Process video file"""
        try:
            self.log_info(f"Processing video: {os.path.basename(video_path)}")
            
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                self.log_error("Failed to open video")
                return
            
            frame_count = 0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process every nth frame to improve performance
                if frame_count % 5 == 0:  # Process every 5th frame
                    results = self.detect_objects(frame)
                    self.send_results(results, frame_count / fps)
                
                frame_count += 1
                
                # Update progress
                progress = (frame_count / total_frames) * 100
                self.log_info(f"Progress: {progress:.1f}% ({frame_count}/{total_frames})")
                
                # Small delay to prevent overwhelming the UI
                time.sleep(0.01)
            
            cap.release()
            self.log_info("Video processing completed")
            
        except Exception as e:
            self.log_error(f"Error processing video: {str(e)}")
    
    def detect_objects(self, image):
        """Run YOLOv8 detection on image - exactly like your code structure"""
        try:
            # Get detection parameters
            confidence = self.options.get('confidence', 0.25)
            image_size = self.options.get('imageSize', 640)
            
            # YOLO tahmin - exactly like your code
            results = self.model.predict(image, imgsz=image_size, conf=confidence, verbose=False)
            preds = results[0].boxes
            
            detections = []
            
            if preds is not None:
                # Get class names from model - like your code
                class_map = self.model.names
                
                # Kutuları işle - exactly like your code structure
                for box, cls_id in zip(preds.xywh, preds.cls):
                    xc, yc, bw, bh = box.tolist()
                    x1, y1 = int(xc - bw/2), int(yc - bh/2)
                    x2, y2 = int(xc + bw/2), int(yc + bh/2)
                    
                    # Get class info
                    class_id = int(cls_id)
                    class_name = self.get_class_name(class_id)
                    confidence_val = float(preds.conf[len(detections)])
                    
                    # Filter by enabled classes
                    if not self.is_class_enabled(class_name):
                        continue
                    
                    detection = {
                        'x': x1,
                        'y': y1,
                        'width': x2 - x1,
                        'height': y2 - y1,
                        'confidence': confidence_val,
                        'class': class_name,
                        'class_id': class_id,
                        'center_x': int(xc),
                        'center_y': int(yc)
                    }
                    
                    detections.append(detection)
            
            return {
                'detections': detections,
                'image_shape': image.shape,
                'timestamp': time.time()
            }
            
        except Exception as e:
            self.log_error(f"Detection error: {str(e)}")
            return {'detections': [], 'error': str(e)}
    
    def get_class_name(self, class_id):
        """Get class name from ID"""
        # Map COCO classes to our thermal classes
        coco_to_thermal = {
            0: 'person',  # person
            2: 'car',     # car
            3: 'car',     # motorcycle -> car
            5: 'car',     # bus -> car
            7: 'car',     # truck -> car
        }
        
        return coco_to_thermal.get(class_id, 'unknown')
    
    def is_class_enabled(self, class_name):
        """Check if detection class is enabled"""
        if class_name == 'person':
            return self.options.get('detectPerson', True)
        elif class_name == 'car':
            return self.options.get('detectCar', True)
        return False
    
    def draw_detection_boxes(self, image, detections):
        """Draw detection boxes using OpenCV - simple and effective like your code"""
        self.log_info(f"Drawing {len(detections)} detection boxes on image")
        
        for i, detection in enumerate(detections):
            x = detection['x']
            y = detection['y']
            width = detection['width']
            height = detection['height']
            confidence = detection['confidence']
            class_name = detection['class']
            
            # Calculate coordinates (same as your code structure)
            x1, y1 = x, y
            x2, y2 = x + width, y + height
            
            self.log_info(f"Detection {i+1}: {class_name} at ({x1},{y1}) to ({x2},{y2}) conf={confidence:.2f}")
            
            # Get color for class (BGR format for OpenCV)
            if class_name == 'person':
                color = (53, 107, 255)  # Orange in BGR
            elif class_name == 'car':
                color = (65, 255, 0)    # Green in BGR
            else:
                color = (255, 140, 0)   # Default blue-orange in BGR
            
            # Draw rectangle (main detection box) - exactly like your code
            cv2.rectangle(image, (x1, y1), (x2, y2), color, 3)  # Thicker line for visibility
            
            # Create label text - exactly like your code
            label = f"{class_name.upper()} {confidence*100:.1f}%"
            
            # Draw label background for better visibility
            (text_width, text_height), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(image, (x1, y1-text_height-10), (x1+text_width, y1), (0, 0, 0), -1)
            
            # Draw label text - exactly like your code
            cv2.putText(image, label, (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 
                       0.6, color, 2, cv2.LINE_AA)
        
        self.log_info("Detection boxes drawn successfully")
        return image
    
    def save_annotated_image(self, annotated_image, original_path):
        """Save annotated image"""
        try:
            # Create output directory
            output_dir = Path(__file__).parent.parent / "output"
            output_dir.mkdir(exist_ok=True)
            
            # Generate output filename
            original_name = Path(original_path).stem
            output_path = output_dir / f"{original_name}_detected.jpg"
            
            # Save image
            cv2.imwrite(str(output_path), annotated_image)
            self.log_info(f"Annotated image saved: {output_path}")
            
            # Also send the annotated image path to frontend
            self.send_annotated_image_path(str(output_path))
            
        except Exception as e:
            self.log_error(f"Failed to save annotated image: {str(e)}")
    
    def send_annotated_image_path(self, image_path):
        """Send annotated image path to frontend"""
        output = {
            'type': 'annotated_image',
            'path': image_path,
            'timestamp': time.time()
        }
        print(json.dumps(output), flush=True)
    
    def send_results(self, results, timestamp):
        """Send detection results to main process"""
        output = {
            'type': 'detection_result',
            'timestamp': timestamp,
            'results': results
        }
        
        print(json.dumps(output), flush=True)
    
    def log_info(self, message):
        """Log info message"""
        log_entry = {
            'type': 'log',
            'level': 'info',
            'message': message,
            'timestamp': time.time()
        }
        print(json.dumps(log_entry), flush=True)
    
    def log_error(self, message):
        """Log error message"""
        log_entry = {
            'type': 'log',
            'level': 'error',
            'message': message,
            'timestamp': time.time()
        }
        print(json.dumps(log_entry), flush=True)
    
    def log_warning(self, message):
        """Log warning message"""
        log_entry = {
            'type': 'log',
            'level': 'warning',
            'message': message,
            'timestamp': time.time()
        }
        print(json.dumps(log_entry), flush=True)

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python detection_service.py <options_json>")
        sys.exit(1)
    
    try:
        options = json.loads(sys.argv[1])
        service = ThermalDetectionService(options)
        service.process_media()
        
    except json.JSONDecodeError:
        print("Error: Invalid JSON options")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
