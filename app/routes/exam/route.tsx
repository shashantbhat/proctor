import { useEffect } from "react";

export default function Exam() {
    useEffect(() => {
        const handleVisibilityChange = () => {
            console.log("Tab visibility:", document.visibilityState);
        };

        const handleBlur = () => {
            console.log("Window blurred");
        };

        const handleFocus = () => {
            console.log("Window focused");
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("focus", handleFocus);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("focus", handleFocus);
        };
    }, []);

    return (
        <div>
            <h1>Exam Page</h1>
            <p>Monitoring started...</p>
        </div>
    );
}