import React, { useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

const FaceDetection: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Start webcam
    const startVideo = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            console.error("Error accessing webcam:", err);
        }
    };

    // Load models
    const loadModels = async () => {
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js/models";
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        console.log("✅ Models loaded");
        startVideo();
    };

    useEffect(() => {
        startVideo(); // 🟢 Start webcam immediately
        loadModels();

        const interval = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current) return;

            const detections = await faceapi
                .detectAllFaces(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions()
                )
                .withFaceLandmarks()
                .withFaceExpressions();

            const displaySize = {
                width: videoRef.current.width,
                height: videoRef.current.height,
            };
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            if (!context) return;

            context.clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
        }, 200);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
            <h2 className="mb-4 text-2xl font-bold">🎥 Face Detection Test</h2>

            <div className="relative">
                <video
                    ref={videoRef}
                    width="720"
                    height="560"
                    autoPlay
                    muted
                    className="rounded-lg border-4 border-gray-700"
                />
                <canvas
                    ref={canvasRef}
                    width="720"
                    height="560"
                    className="absolute top-0 left-0"
                />
            </div>
        </div>
    );
};

export default FaceDetection;