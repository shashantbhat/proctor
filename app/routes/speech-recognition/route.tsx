import { useEffect, useRef, useState } from "react";

export default function VoiceMonitor({ 
  testActive, 
  onTranscriptReady 
}: { 
  testActive: boolean; 
  onTranscriptReady: (transcript: string) => void;
}) {
  const [status, setStatus] = useState("Initializing microphone...");
  const [isListening, setIsListening] = useState(false);
  const [liveSpeech, setLiveSpeech] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef<string>(""); // Use ref to avoid stale closure issues
  const listeningLoopRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptLengthRef = useRef(0);

  // Send transcript updates to parent
  const sendTranscriptUpdate = () => {
    const currentTranscript = fullTranscriptRef.current.trim();
    if (currentTranscript && currentTranscript.length > lastTranscriptLengthRef.current) {
      console.log("📤 Sending transcript update:", currentTranscript);
      onTranscriptReady(currentTranscript);
      lastTranscriptLengthRef.current = currentTranscript.length;
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("⚠️ Speech recognition not supported. Use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("🎙️ Listening...");
      console.log("🎤 Voice capture started");
    };

    recognition.onerror = (e: any) => {
      console.error("❌ SpeechRecognition error:", e.error);
      
      // Don't show "no-speech" errors as they're expected during silence
      if (e.error === "no-speech") {
        setStatus("🎙️ Listening... (waiting for speech)");
      } else if (e.error === "aborted") {
        // Ignore aborted errors during normal operation
        setStatus("🎙️ Listening...");
      } else {
        setStatus(`⚠️ Error: ${e.error}`);
      }
      
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      // Clear any existing silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      let interimText = "";
      let hasFinalResults = false;

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          // Append final result to full transcript
          const finalText = transcript.trim();
          if (finalText) {
            // Add space if transcript already has content
            if (fullTranscriptRef.current) {
              fullTranscriptRef.current += " " + finalText;
            } else {
              fullTranscriptRef.current = finalText;
            }
            hasFinalResults = true;
            console.log("📝 Final segment:", finalText);
            console.log("📋 Full transcript so far:", fullTranscriptRef.current);
          }
        } else {
          // Show interim results in UI
          interimText += transcript;
        }
      }

      // Update live speech display
      setLiveSpeech(interimText);

      // If we got final results, send update after brief silence
      if (hasFinalResults) {
        silenceTimerRef.current = setTimeout(() => {
          sendTranscriptUpdate();
        }, 1500); // Wait 1.5 seconds after speech stops
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log("🛑 Speech recognition ended");
      
      // Auto-restart if still active
      if (listeningLoopRef.current) {
        setTimeout(() => {
          if (listeningLoopRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.log("Could not restart recognition:", err);
            }
          }
        }, 300);
      }
    };

    // Cleanup function
    return () => {
      listeningLoopRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.log("Cleanup error:", err);
        }
      }
    };
  }, []); // Only run once on mount

  // Handle test active state changes
  useEffect(() => {
    if (testActive && !listeningLoopRef.current) {
      // Start listening
      listeningLoopRef.current = true;
      fullTranscriptRef.current = ""; // Reset transcript
      lastTranscriptLengthRef.current = 0;
      setStatus("🎙️ Starting voice monitoring...");
      
      console.log("▶️ Test started - beginning speech recognition");
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.error("Failed to start recognition:", err);
          setStatus("⚠️ Failed to start microphone");
        }
      }
    } else if (!testActive && listeningLoopRef.current) {
      // Stop listening and send final transcript
      listeningLoopRef.current = false;
      setStatus("⏹️ Test ended - processing final transcript...");
      
      console.log("⏹️ Test ended - stopping speech recognition");
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.log("Stop error:", err);
        }
      }

      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Send final transcript
      const finalTranscript = fullTranscriptRef.current.trim();
      console.log("✅ Final Transcript Generated:", finalTranscript);
      console.log("📊 Total characters:", finalTranscript.length);
      onTranscriptReady(finalTranscript);
      
      setStatus("✅ Transcript completed");
      setLiveSpeech("");
    }
  }, [testActive, onTranscriptReady]);

  return (
    <div className="fixed top-4 right-4 w-80 bg-gray-900 border border-gray-700 rounded-lg p-4 text-white text-sm shadow-lg z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">🎤 Voice Monitor</span>
        <span
          className={`w-3 h-3 rounded-full ${
            isListening ? "bg-green-500 animate-pulse" : "bg-gray-500"
          }`}
          title={isListening ? "Listening" : "Not listening"}
        ></span>
      </div>
      
      <p className="text-gray-400 mb-2 text-xs">{status}</p>
      
      {liveSpeech && (
        <div className="p-2 bg-gray-800 rounded text-xs text-gray-200 mb-2">
          <p className="text-gray-400 text-[10px] mb-1">Live speech:</p>
          <p className="italic">{liveSpeech}</p>
        </div>
      )}
      
      {fullTranscriptRef.current && (
        <div className="p-2 bg-gray-800 rounded text-xs">
          <p className="text-gray-400 text-[10px] mb-1">Captured so far:</p>
          <p className="text-gray-300 max-h-20 overflow-y-auto">
            {fullTranscriptRef.current.length > 100 
              ? fullTranscriptRef.current.substring(0, 100) + "..." 
              : fullTranscriptRef.current}
          </p>
          <p className="text-gray-500 text-[10px] mt-1">
            {fullTranscriptRef.current.length} characters
          </p>
        </div>
      )}
    </div>
  );
}