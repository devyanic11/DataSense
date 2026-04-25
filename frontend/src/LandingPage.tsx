import Navbar from "./components/landing/Navbar";
import Hero from "./components/landing/Hero";
import Features from "./components/landing/Features";
import Demo from "./components/landing/Demo";
import Testimonials from "./components/landing/Testimonials";
import Footer from "./components/landing/Footer";

type LandingPageProps = {
  onGetStarted?: () => void;
};


export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-transparent text-white font-sans relative z-10">
      <div className="premium-bg">
        <div className="premium-bg__grid" />
        <div className="premium-bg__glow" />
        <div className="premium-bg__vignette" />
        <div className="premium-bg__spotlight" />
        <div className="premium-bg__noise" />
      </div>
      <Navbar />
      <main className="pt-24">
       <Hero onGetStarted={onGetStarted} />
        <Features />
        <Demo />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
}