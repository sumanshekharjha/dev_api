import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Hero from "../components/Hero.jsx";
import Footer from "../components/Footer.jsx";

import WhatIsApi from "../sections/WhatIsApi.jsx";
import ApiRequest from "../sections/ApiRequest.jsx";
import WorkingWithApis from "../sections/WorkingWithApis.jsx";
import ApiVault from "../sections/ApiVault.jsx";
import TestWorkspace from "../sections/TestWorkspace.jsx";
import QuickTest from "../sections/QuickTest.jsx";
import MockApi from "../sections/MockApi.jsx";
import MockConfiguration from "../sections/MockConfiguration.jsx";
import RequestLogs from "../sections/RequestLogs.jsx";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />

      <main>
        <WhatIsApi />
        <ApiRequest />
        <WorkingWithApis />
        <ApiVault />
        <TestWorkspace />
        <QuickTest />
        <MockApi />
        <MockConfiguration />
        <RequestLogs />

        <section className="border-t border-ink/10">
          <div className="mx-auto flex max-w-content flex-col items-center px-6 py-24 text-center sm:px-8 sm:py-32">
            <p className="max-w-xl font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Everything you need to work with APIs in one place.
            </p>
            <Link
              to="/login"
              className="mt-8 inline-block bg-signal px-8 py-3.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 sm:text-base"
            >
              Get Started
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
