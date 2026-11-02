import { useEffect, useRef, useState } from "react";

const logos = [
  "FutureWave",
  "TechCorp",
  "InnovateX",
  "DataFlow",
  "CloudSync",
  "NextGen",
  "Quantum",
  "SkyNet",
  "NovaTech",
  "Vertex",
];

const LogoCarousel = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    // Check if element is already in view
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setIsVisible(true);
      return;
    }

    setIsVisible(false);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className={`bg-secondary py-16 overflow-hidden transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="text-center mb-8">
        <span className="text-muted-foreground text-xs tracking-[0.2em] uppercase">
          TRUSTED BY LEADING BRANDS WORLDWIDE
        </span>
      </div>
      <div className="relative">
        <div className="flex animate-scroll">
          {[...Array(3)].map((_, setIndex) =>
            logos.map((logo, index) => (
              <div
                key={`logo-${setIndex}-${index}`}
                className="flex-shrink-0 px-12 flex items-center justify-center min-w-[180px]"
              >
                <span className="text-muted-foreground text-xl font-semibold italic hover:text-foreground transition-colors cursor-default">
                  {logo}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LogoCarousel;
