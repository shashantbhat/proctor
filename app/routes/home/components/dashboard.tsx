import Orb from "~/components/Orb";



const Dashboard = () => {
    return (
        <section className="relative w-screen h-screen sm:min-h-svh overflow-hidden text-white bg-black">
            {/* Hero Content */}
            <div className="relative w-full h-[600px] mt-16">
                <Orb
                    hoverIntensity={1}
                    rotateOnHover={true}
                    hue={0}
                    forceHoverState={false}
                />
            </div>
            <div className="absolute -top-[15%] sm:top-[27.5%] h-full sm:h-auto w-full flex items-center justify-center z-20 px-4 sm:mt-10 ">
                <div className="text-center">
                    <h1 className="font-medium text-2xl sm:text-3xl">
                        Secure. Smart. Seamless Exams.
                    </h1>
                    <p className="font-extrabold text-4xl sm:text-5xl mt-8">
                        Ensuring Integrity,<br/> Better Learning.
                    </p>
                </div>
            </div>
        </section>
    )
}

export default Dashboard;