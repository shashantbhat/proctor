
import { useState, useEffect, useRef } from "react";

interface SuspiciousActivity {
  timestamp: string;
  type: "looking_away" | "face_not_detected" | "multiple_faces" | "looking_down" | "looking_sideways" | "looking_up";
  severity: "low" | "medium" | "high";
  details: string;
  duration?: number; // Duration in seconds
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
  const [fps, setFps] = useState<number>(0);
  const [gazeDirection, setGazeDirection] = useState<string>("center");
  const [gazeMetrics, setGazeMetrics] = useState<{ 
    yaw: number; 
    pitch: number; 
    roll: number;
    confidence: number;
  }>({ yaw: 0, pitch: 0, roll: 0, confidence: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastAlertTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const fpsHistoryRef = useRef<number[]>([]);
  const isProctoringRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);
  const faceapiRef = useRef<any>(null);
  
  // Track start time of current violation state
  const violationStartTimeRef = useRef<{
    lookingDown: number | null;
    lookingLeft: number | null;
    lookingRight: number | null;
    lookingUp: number | null;
    noFace: number | null;
    multipleFaces: number | null;
  }>({
    lookingDown: null,
    lookingLeft: null,
    lookingRight: null,
    lookingUp: null,
    noFace: null,
    multipleFaces: null
  });

  // Track if violation was already logged for current session
  const violationLoggedRef = useRef<{
    lookingDown: boolean;
    lookingLeft: boolean;
    lookingRight: boolean;
    lookingUp: boolean;
    noFace: boolean;
    multipleFaces: boolean;
  }>({
    lookingDown: false,
    lookingLeft: false,
    lookingRight: false,
    lookingUp: false,
    noFace: false,
    multipleFaces: false
  });
  
  const consecutiveViolationsRef = useRef<{
    lookingDown: number;
    lookingLeft: number;
    lookingRight: number;
    lookingUp: number;
    noFace: number;
    multipleFaces: number;
  }>({
    lookingDown: 0,
    lookingLeft: 0,
    lookingRight: 0,
    lookingUp: 0,
    noFace: 0,
    multipleFaces: 0
  });

  // Optimized thresholds for proctoring
  const THRESHOLDS = {
    yaw: { left: 25, right: -25 },        // More lenient for natural movement
    pitch: { up: -15, down: 20 },         // Stricter on down (phone checking)
    consecutive: 5,                        // More frames = fewer false positives
    alertCooldown: 4000,                  // 4 seconds between alerts
    confidenceMin: 0.5,                   // Lower for better detection
    inputSize: 224,                       // Optimal for webcam: 160, 224, or 320
    loggingDuration: 2000                 // Log after 2 seconds of continuous violation
  };

  useEffect(() => {
    const loadModels = async () => {
      try {
        setDebugInfo("Loading face-api.js library...");
        
        // Load face-api.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js';
        script.async = false;
        
        script.onload = async () => {
          const faceapi = (window as any).faceapi;
          faceapiRef.current = faceapi;
          
          setDebugInfo("Loading TinyFaceDetector (optimized for webcam)...");
          const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
          
          // Load only necessary models for performance
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          setDebugInfo("Loading 68-point facial landmarks...");
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
          
          setIsModelLoaded(true);
          setFaceDetectionStatus("Models loaded ✓");
          setDebugInfo("Ready for proctoring!");
          console.log("✅ Face-api.js models loaded (optimized for webcam tracking)");
        };
        
        script.onerror = () => {
          setDebugInfo("Error loading face-api.js script");
          setFaceDetectionStatus("Error loading models");
        };
        
        document.body.appendChild(script);
        
        return () => {
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
        };
      } catch (error) {
        console.error("Error loading face detection models:", error);
        setFaceDetectionStatus("Error loading models");
        setDebugInfo(`Error: ${error}`);
      }
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (isModelLoaded && autoStart && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setDebugInfo("Auto-starting camera...");
      startProctoring();
    }
  }, [isModelLoaded, autoStart]);

  const startProctoring = async () => {
    if (isProctoringRef.current) {
      setDebugInfo("Already proctoring");
      return;
    }
    
    try {
      setDebugInfo("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
          frameRate: { ideal: 30 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current && canvasRef.current) {
            videoRef.current.play().then(() => {
              canvasRef.current!.width = videoRef.current!.videoWidth;
              canvasRef.current!.height = videoRef.current!.videoHeight;
              
              isProctoringRef.current = true;
              setFaceDetectionStatus("🔴 LIVE - Monitoring Active");
              setDebugInfo("Face detection running...");
              console.log("✅ Starting optimized face detection loop");
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

  const detectFaces = async () => {
    if (!isProctoringRef.current) return;
    
    animationFrameRef.current = requestAnimationFrame(detectFaces);

    if (!videoRef.current || !canvasRef.current || !faceapiRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const faceapi = faceapiRef.current;

    if (video.readyState !== 4) {
      return;
    }

    try {
      // Use TinyFaceDetector with optimized settings for webcam tracking
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: THRESHOLDS.inputSize,  // 224 is optimal balance
          scoreThreshold: THRESHOLDS.confidenceMin
        }))
        .withFaceLandmarks();

      // Update FPS
      updateFPS();

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw detections
        if (detections.length > 0) {
          const resizedDetections = faceapi.resizeResults(detections, {
            width: canvas.width,
            height: canvas.height
          });
          
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        }
      }
      
      setFaceCount(detections.length);

      if (detections.length === 0) {
        handleNoFace();
      } else if (detections.length === 1) {
        const detection = detections[0];
        analyzeGaze(detection);
        
        const confidence = Math.round(detection.detection.score * 100);
        setGazeMetrics(prev => ({ ...prev, confidence }));
        
        resetViolations(['noFace', 'multipleFaces']);
      } else {
        handleMultipleFaces(detections.length);
      }

    } catch (error) {
      console.error("Detection error:", error);
    }
  };

  const analyzeGaze = (detection: any) => {
    const landmarks = detection.landmarks.positions;
    
    // Key facial landmarks (68-point model)
    const nose = landmarks[30];        // Nose tip
    const leftEye = landmarks[36];     // Left eye outer corner
    const rightEye = landmarks[45];    // Right eye outer corner
    const leftMouth = landmarks[48];   // Left mouth corner
    const rightMouth = landmarks[54];  // Right mouth corner
    const chin = landmarks[8];         // Chin bottom
    const leftJaw = landmarks[0];      // Left jawline
    const rightJaw = landmarks[16];    // Right jawline
    const leftEyeInner = landmarks[39];
    const rightEyeInner = landmarks[42];

    // Calculate centers
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const mouthCenterY = (leftMouth.y + rightMouth.y) / 2;

    // YAW (left/right rotation) - Enhanced calculation
    const faceWidth = rightJaw.x - leftJaw.x;
    const eyeWidth = rightEyeInner.x - leftEyeInner.x;
    const noseOffsetFromCenter = nose.x - eyeCenterX;
    const normalizedOffset = noseOffsetFromCenter / eyeWidth;
    const yaw = normalizedOffset * 60; // Calibrated multiplier

    // PITCH (up/down rotation) - Enhanced calculation  
    const faceHeight = chin.y - eyeCenterY;
    const eyeToNose = nose.y - eyeCenterY;
    const noseToMouth = mouthCenterY - nose.y;
    const verticalRatio = eyeToNose / (eyeToNose + noseToMouth);
    const pitch = (verticalRatio - 0.42) * 100; // Calibrated for natural head position

    // ROLL (head tilt)
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

    setGazeMetrics(prev => ({ 
      ...prev, 
      yaw: parseFloat(yaw.toFixed(1)), 
      pitch: parseFloat(pitch.toFixed(1)), 
      roll: parseFloat(roll.toFixed(1))
    }));

    // Determine violations with priority
    const violations = consecutiveViolationsRef.current;
    const now = Date.now();
    let currentDirection = 'center';
    let shouldAlert = false;
    let alertMessage = '';
    let activityType: SuspiciousActivity["type"] = "looking_away";
    let activityDetails = '';

    // Priority: Down (most critical) > Up > Left > Right
    if (pitch > THRESHOLDS.pitch.down) {
      violations.lookingDown++;
      
      // Start tracking time if this is the first frame of violation
      if (violationStartTimeRef.current.lookingDown === null) {
        violationStartTimeRef.current.lookingDown = now;
        violationLoggedRef.current.lookingDown = false;
      }
      
      // Check if violation has lasted 2+ seconds and hasn't been logged yet
      const duration = now - violationStartTimeRef.current.lookingDown;
      if (duration >= THRESHOLDS.loggingDuration && !violationLoggedRef.current.lookingDown) {
        logViolationWithDuration("looking_down", "high", `Looking down (pitch: ${pitch.toFixed(1)}°) - High risk`, duration);
        violationLoggedRef.current.lookingDown = true;
      }
      
      resetViolations(['lookingDown']);
      currentDirection = 'down';
      
      if (violations.lookingDown >= THRESHOLDS.consecutive) {
        shouldAlert = true;
        alertMessage = '⚠️ Looking down detected! Possible phone/notes usage.';
        activityType = 'looking_down';
        activityDetails = `Looking down (pitch: ${pitch.toFixed(1)}°) - High risk`;
      }
    } else if (pitch < THRESHOLDS.pitch.up) {
      violations.lookingUp++;
      
      if (violationStartTimeRef.current.lookingUp === null) {
        violationStartTimeRef.current.lookingUp = now;
        violationLoggedRef.current.lookingUp = false;
      }
      
      const duration = now - violationStartTimeRef.current.lookingUp;
      if (duration >= THRESHOLDS.loggingDuration && !violationLoggedRef.current.lookingUp) {
        logViolationWithDuration("looking_up", "medium", `Looking up (pitch: ${pitch.toFixed(1)}°)`, duration);
        violationLoggedRef.current.lookingUp = true;
      }
      
      resetViolations(['lookingUp']);
      currentDirection = 'up';
      
      if (violations.lookingUp >= THRESHOLDS.consecutive) {
        shouldAlert = true;
        alertMessage = '⚠️ Looking up detected! Please focus on screen.';
        activityType = 'looking_up';
        activityDetails = `Looking up (pitch: ${pitch.toFixed(1)}°)`;
      }
    } else if (yaw > THRESHOLDS.yaw.left) {
      violations.lookingLeft++;
      
      if (violationStartTimeRef.current.lookingLeft === null) {
        violationStartTimeRef.current.lookingLeft = now;
        violationLoggedRef.current.lookingLeft = false;
      }
      
      const duration = now - violationStartTimeRef.current.lookingLeft;
      if (duration >= THRESHOLDS.loggingDuration && !violationLoggedRef.current.lookingLeft) {
        logViolationWithDuration("looking_sideways", "medium", `Looking left (yaw: ${yaw.toFixed(1)}°)`, duration);
        violationLoggedRef.current.lookingLeft = true;
      }
      
      resetViolations(['lookingLeft']);
      currentDirection = 'left';
      
      if (violations.lookingLeft >= THRESHOLDS.consecutive) {
        shouldAlert = true;
        alertMessage = '⚠️ Looking left! Please face forward.';
        activityType = 'looking_sideways';
        activityDetails = `Looking left (yaw: ${yaw.toFixed(1)}°)`;
      }
    } else if (yaw < THRESHOLDS.yaw.right) {
      violations.lookingRight++;
      
      if (violationStartTimeRef.current.lookingRight === null) {
        violationStartTimeRef.current.lookingRight = now;
        violationLoggedRef.current.lookingRight = false;
      }
      
      const duration = now - violationStartTimeRef.current.lookingRight;
      if (duration >= THRESHOLDS.loggingDuration && !violationLoggedRef.current.lookingRight) {
        logViolationWithDuration("looking_sideways", "medium", `Looking right (yaw: ${yaw.toFixed(1)}°)`, duration);
        violationLoggedRef.current.lookingRight = true;
      }
      
      resetViolations(['lookingRight']);
      currentDirection = 'right';
      
      if (violations.lookingRight >= THRESHOLDS.consecutive) {
        shouldAlert = true;
        alertMessage = '⚠️ Looking right! Please face forward.';
        activityType = 'looking_sideways';
        activityDetails = `Looking right (yaw: ${yaw.toFixed(1)}°)`;
      }
    } else {
      resetViolations([]);
      currentDirection = 'center';
    }

    setGazeDirection(currentDirection);
    if (currentDirection !== "center") {
      console.log(
        `[GAZE] ${new Date().toLocaleTimeString()} → ${currentDirection.toUpperCase()}`
      );
    }

    if (shouldAlert && now - lastAlertTimeRef.current > THRESHOLDS.alertCooldown) {
      logActivity(activityType, currentDirection === 'down' ? 'high' : 'medium', activityDetails);
      setCurrentAlert(alertMessage);
      lastAlertTimeRef.current = now;
      setTimeout(() => setCurrentAlert(""), 3000);
    }
  };

  const handleNoFace = () => {
    const violations = consecutiveViolationsRef.current;
    violations.noFace++;
    const now = Date.now();
    
    // Start tracking time if this is the first frame of violation
    if (violationStartTimeRef.current.noFace === null) {
      violationStartTimeRef.current.noFace = now;
      violationLoggedRef.current.noFace = false;
    }
    
    // Check if violation has lasted 2+ seconds and hasn't been logged yet
    const duration = now - violationStartTimeRef.current.noFace;
    if (duration >= THRESHOLDS.loggingDuration && !violationLoggedRef.current.noFace) {
      logViolationWithDuration("face_not_detected", "high", "Face left camera view", duration);
      violationLoggedRef.current.noFace = true;
    }
    
    resetViolations(['noFace']);
    
    setGazeDirection('no face');
    setGazeMetrics({ yaw: 0, pitch: 0, roll: 0, confidence: 0 });
    
    // see here is the no face detected coming from

    //here i also need to add the activity logging if left/right/up/down for more than an amount of time.
    if (violations.noFace >= THRESHOLDS.consecutive) {
      if (now - lastAlertTimeRef.current > THRESHOLDS.alertCooldown) {
        logActivity("face_not_detected", "high", "Face left camera view");
        setCurrentAlert("⚠️ No face detected! Stay visible to camera.");
        lastAlertTimeRef.current = now;
        setTimeout(() => setCurrentAlert(""), 3000);
      }
    }
  };

  const handleMultipleFaces = (count: number) => {
    const violations = consecutiveViolationsRef.current;
    violations.multipleFaces++;
    const now = Date.now();
    
    // Start tracking time if this is the first frame of violation
    if (violationStartTimeRef.current.multipleFaces === null) {
      violationStartTimeRef.current.multipleFaces = now;
      violationLoggedRef.current.multipleFaces = false;
    }
    
    // Check if violation has lasted 2+ seconds and hasn't been logged yet
    const duration = now - violationStartTimeRef.current.multipleFaces;
    if (duration >= THRESHOLDS.loggingDuration && !violationLoggedRef.current.multipleFaces) {
      logViolationWithDuration("multiple_faces", "high", `${count} people detected in frame`, duration);
      violationLoggedRef.current.multipleFaces = true;
    }
    
    resetViolations(['multipleFaces']);
    
    setGazeDirection('multiple');
    
    if (violations.multipleFaces >= THRESHOLDS.consecutive) {
      if (now - lastAlertTimeRef.current > THRESHOLDS.alertCooldown) {
        logActivity("multiple_faces", "high", `${count} people detected in frame`);
        setCurrentAlert(`⚠️ ${count} faces detected! Only you should be visible.`);
        lastAlertTimeRef.current = now;
        setTimeout(() => setCurrentAlert(""), 3000);
      }
    }
  };

  const resetViolations = (except: string[]) => {
    const violations = consecutiveViolationsRef.current;
    const startTimes = violationStartTimeRef.current;
    
    Object.keys(violations).forEach(key => {
      if (!except.includes(key)) {
        (violations as any)[key] = 0;
        (startTimes as any)[key] = null;
      }
    });
  };

  const updateFPS = () => {
    const now = Date.now();
    const delta = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    
    const currentFps = Math.round(1000 / delta);
    fpsHistoryRef.current.push(currentFps);
    
    if (fpsHistoryRef.current.length > 30) {
      fpsHistoryRef.current.shift();
    }
    
    const avgFps = Math.round(
      fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length
    );
    setFps(avgFps);
  };

  const logViolationWithDuration = (
    type: SuspiciousActivity["type"],
    severity: SuspiciousActivity["severity"],
    details: string,
    duration: number
  ) => {
    const activity: SuspiciousActivity = {
      timestamp: new Date().toISOString(),
      type,
      severity,
      details,
      duration: Math.round(duration / 1000) // Convert to seconds
    };

    setSuspiciousActivities(prev => [...prev, activity]);

    if (onActivityLogged) {
      onActivityLogged(activity);
    }

    console.log("🚨 VIOLATION LOGGED:", {
      name: type,
      severity: severity,
      timestamp: new Date(activity.timestamp).toLocaleString(),
      details: activity.details,
      duration: `${activity.duration}s continuous`
    });
  };

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

    if (onActivityLogged) {
      onActivityLogged(activity);
    }

    console.log("🚨 Violation logged:", activity);
  };

  useEffect(() => {
    return () => {
      stopProctoring();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).getFaceDetectionActivities = () => suspiciousActivities;
    }
  }, [suspiciousActivities]);

  const getDirectionColor = (dir: string) => {
    switch(dir) {
      case "center": return "bg-green-500";
      case "down": return "bg-red-600";
      case "up": return "bg-orange-500";
      case "left":
      case "right": return "bg-yellow-500";
      case "multiple": return "bg-purple-600";
      case "no face": return "bg-gray-600";
      default: return "bg-blue-500";
    }
  };

  const getDirectionEmoji = (dir: string) => {
    switch(dir) {
      case "center": return "✅";
      case "down": return "⬇️";
      case "up": return "⬆️";
      case "left": return "⬅️";
      case "right": return "➡️";
      case "multiple": return "👥";
      case "no face": return "❌";
      default: return "👁️";
    }
  };

  return (
    <>
      {currentAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full px-4">
          <div className="bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-pulse border-2 border-red-400">
            <p className="font-bold text-center text-lg">{currentAlert}</p>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 w-[420px] z-40">
        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700">
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
          
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-bold">RECORDING</span>
          </div>

          <div className={`absolute top-3 right-3 ${getDirectionColor(gazeDirection)} text-white text-sm px-4 py-1.5 rounded-full font-bold transition-all duration-300 shadow-lg flex items-center gap-2`}>
            <span>{getDirectionEmoji(gazeDirection)}</span>
            <span>{gazeDirection.toUpperCase()}</span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent text-white p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-bold text-green-400 text-sm">{faceDetectionStatus}</p>
              <p className="text-xs bg-gray-800 px-2 py-1 rounded">{fps} FPS</p>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="bg-gray-800/80 p-2 rounded text-center">
                <div className="text-gray-400 text-[10px]">Yaw</div>
                <div className="font-bold text-yellow-400">{gazeMetrics.yaw.toFixed(0)}°</div>
              </div>
              <div className="bg-gray-800/80 p-2 rounded text-center">
                <div className="text-gray-400 text-[10px]">Pitch</div>
                <div className="font-bold text-blue-400">{gazeMetrics.pitch.toFixed(0)}°</div>
              </div>
              <div className="bg-gray-800/80 p-2 rounded text-center">
                <div className="text-gray-400 text-[10px]">Conf</div>
                <div className="font-bold text-green-400">{gazeMetrics.confidence}%</div>
              </div>
              <div className="bg-gray-800/80 p-2 rounded text-center">
                <div className="text-gray-400 text-[10px]">Flags</div>
                <div className="font-bold text-red-400">{suspiciousActivities.length}</div>
              </div>
            </div>

            <div className="text-[10px] text-gray-400">
              Faces: <span className="text-yellow-400 font-bold">{faceCount}</span> | 
              Model: {isModelLoaded ? '✓' : '⏳'} | 
              Camera: {isProctoringRef.current ? '✓' : '⏳'}
            </div>
          </div>

          {!isModelLoaded && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center backdrop-blur-sm">
              <div className="text-white text-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-blue-500 mx-auto mb-3"></div>
                <p className="text-sm font-semibold mb-1">Loading AI Models...</p>
                <p className="text-xs text-gray-400">{debugInfo}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}