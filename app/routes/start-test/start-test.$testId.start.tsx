import { useState } from "react";

export default function StartTest() {
  const [started, setStarted] = useState(false);

  const handleStart = async () => {
    try {
      // Fullscreen request must be triggered by a user action
      if (document.fullscreenEnabled) {
        await document.documentElement.requestFullscreen();
      }

      // Ask for camera + microphone
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      // Once both permissions are granted
      setStarted(true);
    } catch (err) {
      console.error("Permission denied:", err);
      alert("You must allow camera, microphone, and fullscreen access to continue.");
    }
  };

  if (!started) {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-6">Ready to Start Your Test?</h1>
        <p className="text-lg mb-4 text-center px-4">
          Please allow fullscreen, camera, and microphone access to begin.
        </p>
        <button
          onClick={handleStart}
          className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-gray-300 transition-all"
        >
          Start Test
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-6">Your Test Has Started</h1>
      <p className="text-lg">Stay focused! The test will auto-end after the duration expires.</p>
    </div>
  );
}