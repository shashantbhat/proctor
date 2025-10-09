import LightRays from "~/components/LightRays";

export interface StudentDashboard {
    name: string;
    enrollmentId: string;
    semester: number;
    department: string;
    totalLabs: number;
    labs: {
        labName: string;
        labCode: string;
        tests: {
            testNo: number;
            points: number;
            flags: number;
            pointsDeducted: number;
            finalPoints: number;
        }[];
    }[];
    totalPoints: number;
    totalFlags: number;
    lastUpdated: string;
}

const sample: StudentDashboard = {
    name: "Shashant Bhat",
    enrollmentId: "CSE2025-071",
    semester: 5,
    department: "Computer Science and Engineering",
    totalLabs: 4,
    labs: [
        {
            labName: "Data Structures Lab",
            labCode: "CSL301",
            tests: [
                { testNo: 1, points: 18, flags: 1, pointsDeducted: 2, finalPoints: 16 },
                { testNo: 2, points: 19, flags: 0, pointsDeducted: 0, finalPoints: 19 },
                { testNo: 3, points: 17, flags: 2, pointsDeducted: 4, finalPoints: 13 },
                { testNo: 4, points: 20, flags: 0, pointsDeducted: 0, finalPoints: 20 },
            ],
        },
        {
            labName: "Operating Systems Lab",
            labCode: "CSL302",
            tests: [
                { testNo: 1, points: 16, flags: 1, pointsDeducted: 2, finalPoints: 14 },
                { testNo: 2, points: 18, flags: 0, pointsDeducted: 0, finalPoints: 18 },
                { testNo: 3, points: 19, flags: 1, pointsDeducted: 2, finalPoints: 17 },
                { testNo: 4, points: 20, flags: 0, pointsDeducted: 0, finalPoints: 20 },
            ],
        },
        {
            labName: "Database Management Systems Lab",
            labCode: "CSL303",
            tests: [
                { testNo: 1, points: 17, flags: 0, pointsDeducted: 0, finalPoints: 17 },
                { testNo: 2, points: 19, flags: 1, pointsDeducted: 2, finalPoints: 17 },
                { testNo: 3, points: 20, flags: 0, pointsDeducted: 0, finalPoints: 20 },
                { testNo: 4, points: 18, flags: 0, pointsDeducted: 0, finalPoints: 18 },
            ],
        },
        {
            labName: "Computer Networks Lab",
            labCode: "CSL304",
            tests: [
                { testNo: 1, points: 15, flags: 2, pointsDeducted: 4, finalPoints: 11 },
                { testNo: 2, points: 17, flags: 0, pointsDeducted: 0, finalPoints: 17 },
                { testNo: 3, points: 19, flags: 1, pointsDeducted: 2, finalPoints: 17 },
                { testNo: 4, points: 20, flags: 0, pointsDeducted: 0, finalPoints: 20 },
            ],
        },
    ],
    totalPoints: 226,
    totalFlags: 8,
    lastUpdated: "2025-10-04T10:00:00Z",
};

const StudentDash = () => {
    return (
        <section className="relative w-screen min-h-screen overflow-hidden text-white bg-black pb-20">
            {/* Background Animation */}
            {/* Background Animation */}
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute', // so it covers the background
                    top: 0,
                    left: 0,
                    zIndex: 30, // increased z-index
                    pointerEvents: 'none', // allows clicking through
                }}
            >
                <LightRays
                    raysOrigin="top-center"
                    raysColor="#ffffff"
                    raysSpeed={1.5}
                    lightSpread={0.8}
                    rayLength={1.2}
                    followMouse={true}
                    mouseInfluence={0.1}
                    noiseAmount={0.1}
                    distortion={0.05}
                    className="custom-rays"
                />
            </div>

            {/* Header Content */}
            <div className="absolute top-[2.5%] w-full flex items-center justify-center z-40 px-4 sm:mt-10">
                <div className="text-center">
                    <h1 className="font-bold text-2xl sm:text-4xl">
                        Hi, {sample.name}
                    </h1>
                    <p className="font-semibold text-xl sm:text-2xl mt-8">
                        Current Sem: {sample.semester} | Total Points: {sample.totalPoints}
                    </p>
                    <button className="bg-white rounded-xl py-1 px-3 text-black text-base mt-8 hover:bg-gray-200 transition-all">
                        Take Test
                    </button>
                </div>
            </div>

            {/* Analytics Section */}
            <div className="relative z-40 mt-70 px-6 sm:px-16">
                <h2 className="text-2xl font-bold mb-6">Your Lab Analytics</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sample.labs.map((lab) => {
                        const totalFinalPoints = lab.tests.reduce((sum, t) => sum + t.finalPoints, 0);
                        const totalFlags = lab.tests.reduce((sum, t) => sum + t.flags, 0);
                        const avgPoints = (totalFinalPoints / lab.tests.length).toFixed(2);

                        return (
                            <div
                                key={lab.labCode}
                                className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-md hover:shadow-lg transition-all p-5"
                            >
                                <h3 className="font-semibold text-lg mb-2">{lab.labName}</h3>
                                <p className="text-gray-400 text-sm mb-4">{lab.labCode}</p>

                                <div className="space-y-1 text-sm">
                                    <p>Total Tests: {lab.tests.length}</p>
                                    <p>Average Points: {avgPoints} / 20</p>
                                    <p>Flags: {totalFlags}</p>
                                    <p>Total Final Points: {totalFinalPoints}</p>
                                </div>

                                <div className="mt-4">
                                    <p className="font-semibold text-gray-300 mb-1">Performance:</p>
                                    <div className="flex gap-2">
                                        {lab.tests.map((test) => (
                                            <div
                                                key={test.testNo}
                                                className={`flex-1 h-2 rounded-full ${
                                                    test.finalPoints >= 18
                                                        ? "bg-green-500"
                                                        : test.finalPoints >= 14
                                                            ? "bg-yellow-400"
                                                            : "bg-red-500"
                                                }`}
                                                title={`Test ${test.testNo}: ${test.finalPoints} pts`}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default StudentDash;