import Navbar from "~/routes/home/components/nav-bar";
import Dashboard from "~/routes/home/components/dashboard";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "ProctorSync • Home" }   // <-- Your page title
  ];
};

const route = () => {
  return (
      <div className="flex items-center justify-center w-full ">
        <Navbar/>
        <Dashboard/>
      </div>
  )
}

export default route;