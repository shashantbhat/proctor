import Orb from "~/components/Orb";



const Dashboard = () => {
    return (
        <section className="relative w-screen h-screen sm:min-h-svh overflow-hidden text-white bg-black">
            <div className="relative w-full h-[600px] mt-16 flex items-center justify-center">
                <Orb
                hoverIntensity={1}
                rotateOnHover={true}
                hue={0}
                forceHoverState={false}
                />
                <div className="absolute text-center z-20">
                <h1 className="font-medium text-2xl sm:text-3xl">
                    Secure. Smart. Seamless Exams.
                </h1>
                <p className="font-extrabold text-4xl sm:text-5xl mt-8">
                    Ensuring Integrity,<br /> Better Learning.
                </p>
                </div>
            </div>
        </section>
    )
}

export default Dashboard;