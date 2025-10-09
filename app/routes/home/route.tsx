import Navbar from "~/routes/home/components/nav-bar";
import Dashboard from "~/routes/home/components/dashboard";

const route = () => {
  return (
      <div className="flex items-center justify-center w-full ">
        <Navbar/>
        <Dashboard/>
      </div>
  )
}

export default route;