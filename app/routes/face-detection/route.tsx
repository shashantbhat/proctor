// FaceDetection.tsx - Fixed Version
import { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";

interface SuspiciousActivity {
  timestamp: string;
  type: "looking_away" | "face_not_detected" | "multiple_faces" | "looking_down" | "looking_sideways";
  severity: "low" | "medium" | "high";
  details: string;
}

interface FaceDetectionProps {
  testId?: string;
  userId?: string;
  onActivityLogged?: (activity: SuspiciousActivity) => void;
  autoStart?: boolean;
}

export default function FaceDetection({ 
  testId, 
  userId, 
  onActivityLogged,
  autoStart = true 
}: FaceDetectionProps) {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [currentAlert, setCurrentAlert] = useState<string>("");
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<string>("Initializing...");
  const [debugInfo, setDebugInfo] = useState<string>("Starting...");
  const [faceCount, setFaceCount] = useState<number>(0);
  const [detectionCount, setDetectionCount] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();
  const lastAlertTimeRef = useRef<number>(0);
  const isProctoringRef = useRef<boolean>(false); // Use ref instead of state
  const isInitializedRef = useRef<boolean>(false);

  // Load TensorFlow.js Face Detection Model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setDebugInfo("Loading TensorFlow.js...");
        await tf.ready();
        setDebugInfo("TensorFlow ready, loading BlazeFace...");
        
        // Using blazeface for face detection
        const blazeface = await import("@tensorflow-models/blazeface");
        setDebugInfo("BlazeFace imported, initializing model...");
        
        const model = await blazeface.load();
        detectorRef.current = model;
        setIsModelLoaded(true);
        setFaceDetectionStatus("Model loaded ✓");
        setDebugInfo("Model loaded successfully!");
        console.log("✅ Face detection model loaded successfully");
      } catch (error) {
        console.error("Error loading face detection model:", error);
        setFaceDetectionStatus("Error loading model");
        setDebugInfo(`Error: ${error}`);
      }
    };

    loadModel();
  }, []);

  // Auto-start proctoring when model is loaded
  useEffect(() => {
    if (isModelLoaded && autoStart && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setDebugInfo("Auto-starting camera...");
      startProctoring();
    }
  }, [isModelLoaded, autoStart]);

  // Start camera and proctoring
  const startProctoring = async () => {
    if (isProctoringRef.current) {
      setDebugInfo("Already proctoring");
      return;
    }
    
    try {
      setDebugInfo("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: "user"
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              isProctoringRef.current = true;
              setFaceDetectionStatus("Active - Monitoring ✓");
              setDebugInfo("Camera active, detection running...");
              console.log("✅ Starting face detection loop");
              detectFaces();
            }).catch(err => {
              console.error("Error playing video:", err);
              setDebugInfo(`Play error: ${err}`);
            });
          }
        };
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setFaceDetectionStatus("Camera access denied ✗");
      setDebugInfo(`Camera error: ${error}`);
      alert("⚠️ Camera access is required for proctored tests. Please enable camera permissions.");
    }
  };

  // Stop proctoring
  const stopProctoring = () => {
    isProctoringRef.current = false;
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setFaceDetectionStatus("Stopped");
    setDebugInfo("Detection stopped");
  };

  // Face detection loop
  const detectFaces = async () => {
    // Always continue the loop
    animationFrameRef.current = requestAnimationFrame(detectFaces);

    if (!videoRef.current || !detectorRef.current) {
      setDebugInfo("Waiting for video/detector...");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== 4) {
      setDebugInfo(`Video loading... (state: ${video.readyState}/4)`);
      return;
    }

    try {
      // Run face detection
      const predictions = await detectorRef.current.estimateFaces(video, false);
      
      // Update detection counter
      setDetectionCount(prev => prev + 1);
      setFaceCount(predictions.length);
      setDebugInfo(`✓ Detecting - Faces: ${predictions.length} | Scans: ${detectionCount + 1}`);

      // Draw on canvas
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Analyze predictions
          analyzeBehavior(predictions, canvas.width, canvas.height);

          // Draw face boxes with thick, visible lines
          predictions.forEach((prediction: any) => {
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 4;
            ctx.strokeRect(
              prediction.topLeft[0],
              prediction.topLeft[1],
              prediction.bottomRight[0] - prediction.topLeft[0],
              prediction.bottomRight[1] - prediction.topLeft[1]
            );
            
            // Draw center point
            const centerX = (prediction.topLeft[0] + prediction.bottomRight[0]) / 2;
            const centerY = (prediction.topLeft[1] + prediction.bottomRight[1]) / 2;
            ctx.fillStyle = "#ff0000";
            ctx.beginPath();
            ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
            ctx.fill();
          });
        }
      }
    } catch (error) {
      console.error("Error in face detection:", error);
      setDebugInfo(`Detection error: ${error}`);
    }
  };

  // Analyze student behavior
  const analyzeBehavior = (predictions: any[], canvasWidth: number, canvasHeight: number) => {
    const now = Date.now();
    const alertCooldown = 3000; // 3 seconds between alerts

    if (predictions.length === 0) {
      if (now - lastAlertTimeRef.current > alertCooldown) {
        logActivity("face_not_detected", "high", "No face detected in frame");
        setCurrentAlert("⚠️ Face not detected! Please stay in view.");
        lastAlertTimeRef.current = now;
        setTimeout(() => setCurrentAlert(""), 3000);
      }
      return;
    }

    if (predictions.length > 1) {
      if (now - lastAlertTimeRef.current > alertCooldown) {
        logActivity("multiple_faces", "high", `${predictions.length} faces detected`);
        setCurrentAlert("⚠️ Multiple faces detected!");
        lastAlertTimeRef.current = now;
        setTimeout(() => setCurrentAlert(""), 3000);
      }
      return;
    }

    // Analyze face position
    const face = predictions[0];
    const faceCenter = [
      (face.topLeft[0] + face.bottomRight[0]) / 2,
      (face.topLeft[1] + face.bottomRight[1]) / 2
    ];

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const offsetX = Math.abs(faceCenter[0] - centerX);
    const offsetY = faceCenter[1] - centerY;

    // Check if looking sideways (significant horizontal offset)
    if (offsetX > canvasWidth * 0.25) {
      if (now - lastAlertTimeRef.current > alertCooldown) {
        const direction = faceCenter[0] < centerX ? "left" : "right";
        logActivity("looking_sideways", "medium", `Looking ${direction}`);
        setCurrentAlert(`⚠️ Please look at the screen!`);
        lastAlertTimeRef.current = now;
        setTimeout(() => setCurrentAlert(""), 3000);
      }
    }

    // Check if looking down
    if (offsetY > canvasHeight * 0.15) {
      if (now - lastAlertTimeRef.current > alertCooldown) {
        logActivity("looking_down", "medium", "Looking downward");
        setCurrentAlert("⚠️ Keep your eyes on the screen!");
        lastAlertTimeRef.current = now;
        setTimeout(() => setCurrentAlert(""), 3000);
      }
    }
  };

  // Log suspicious activity
  const logActivity = (
    type: SuspiciousActivity["type"],
    severity: SuspiciousActivity["severity"],
    details: string
  ) => {
    const activity: SuspiciousActivity = {
      timestamp: new Date().toISOString(),
      type,
      severity,
      details
    };

    setSuspiciousActivities(prev => [...prev, activity]);

    // Notify parent component
    if (onActivityLogged) {
      onActivityLogged(activity);
    }

    console.log("🚨 Suspicious activity logged:", activity);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProctoring();
    };
  }, []);

  // Expose activities to parent via window object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).getFaceDetectionActivities = () => suspiciousActivities;
    }
  }, [suspiciousActivities]);

  return (
    <>
      {/* Alert Banner */}
      {currentAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl animate-pulse">
            <p className="font-semibold text-center">{currentAlert}</p>
          </div>
        </div>
      )}

      {/* Camera Feed with Debug Info */}
      <div className="fixed bottom-4 right-4 w-80 z-40">
        <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl border-2 border-gray-700">
          <video
            ref={videoRef}
            className="w-full h-auto"
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
          
          {/* Recording indicator */}
          <div className="absolute top-2 left-2 flex items-center gap-2 bg-red-600 text-white text-xs px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-semibold">RECORDING</span>
          </div>

          {/* Debug Panel */}
          <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-90 text-white text-xs px-2 py-2 rounded space-y-1">
            <p className="font-semibold text-green-400">{faceDetectionStatus}</p>
            <p className="text-gray-300">{debugInfo}</p>
            <div className="flex justify-between">
              <span>Faces: <span className="text-yellow-400 font-bold">{faceCount}</span></span>
              <span>Flags: <span className="text-red-400 font-bold">{suspiciousActivities.length}</span></span>
            </div>
            <div className="text-gray-400">
              Model: {isModelLoaded ? '✓' : '⏳'} | Camera: {isProctoringRef.current ? '✓' : '⏳'}
            </div>
          </div>

          {/* Loading overlay */}
          {!isModelLoaded && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
              <div className="text-white text-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-xs mb-2">Loading model...</p>
                <p className="text-xs text-gray-400">{debugInfo}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
