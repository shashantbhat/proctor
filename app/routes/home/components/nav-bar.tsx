import GlassSurface from "~/components/GlassSurface";
import { useEffect, useState } from "react";
import { Link } from "react-router";

const Navbar = () => {
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        const checkSupport = () => {
            try {
                const el = document.createElement("div");
                setIsSupported(true);
            } catch {
                setIsSupported(false);
            }
        };
        checkSupport();
    }, []);

    if (!isSupported) return null;

    return (
        <div className="fixed top-0 left-0 w-full flex justify-center mt-8 z-50">
            <GlassSurface
                displace={3}
                distortionScale={20} //-150 was by default for the reverse distortion.
                redOffset={5}
                greenOffset={15}
                blueOffset={25}
                brightness={60}
                opacity={0.8}
                mixBlendMode="screen"
                className="!w-[80%] md:!w-[60%] lg:!w-[50%] xl:!w-[30%] !h-14"
            >
                <div className="flex items-center justify-between w-full px-2 sm:px-2.5 py-1 sm:py-1.5 text-white">

                    {/* Left: Brand + Links */}
                    <div className="flex items-center space-x-4 sm:space-x-8">
                        <div className="text-xl font-semibold">
                            Proctor
                        </div>

                        <div className="border-l border-gray-300 h-6"></div>

                        <div className="flex space-x-2 sm:space-x-6 text-xs sm:text-base font-normal">
                            {/* redirect to teacher-auth  */}
                            <span className="cursor-pointer">Take Test</span> 
                            {/* redirect to student-auth */}
                            <span className="cursor-pointer">Upload Test</span>
                        </div>
                    </div>

                    {/* redirect to new user sign up */}
                    <Link
                        to="/sign-up"
                        className="bg-white text-black text-xs sm:text-sm px-2 py-1 rounded-[10px] sm:rounded-lg"
                        >
                        Sign Up
                    </Link>
                </div>
            </GlassSurface>
        </div>
    );
};

export default Navbar;