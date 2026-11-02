import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef } from 'react';
import { CheckCircle } from 'lucide-react';

const features = [
  'Location tracking',
  'Device analytics',
  'Time patterns',
  'User behavior',
];

export const AnalyticsSection = () => {
  const { t: copy } = useTranslation('copy');
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div
            className={`space-y-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-foreground">{copy("Track Every Scan with")} {" "}</span>
              <br />
              <span className="text-primary">{copy("Real-Time Analytics")}</span>
            </h2>

            <p className="text-muted-foreground text-lg max-w-lg">
              {copy("Get detailed insights into who's scanning your QR codes, when, and where. Make data-driven decisions to optimize your campaigns.")}</p>

            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 text-foreground"
                  style={{ transitionDelay: `${index * 100 + 200}ms` }}
                >
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>{copy(feature)}</span>
                </li>
              ))}
            </ul>

          </div>

          {/* Right Image */}
          <div
            className={`relative transition-all duration-700 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-purple-500 to-blue-500">
              {/* QR Pattern Background */}
              <div className="absolute inset-0 opacity-30">
                <svg className="w-full h-full" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Generate QR-like pattern */}
                  {Array.from({ length: 20 }).map((_, row) =>
                    Array.from({ length: 25 }).map((_, col) => (
                      <rect
                        key={`${row}-${col}`}
                        x={col * 16 + 4}
                        y={row * 16 + 4}
                        width={(row * 17 + col * 13) % 3 === 0 ? 12 : 8}
                        height={(row * 11 + col * 7) % 3 === 0 ? 12 : 8}
                        rx="2"
                        fill="white"
                        opacity={0.3 + ((row * 19 + col * 23) % 50) / 100}
                      />
                    ))
                  )}
                </svg>
              </div>

              {/* Floating Business Cards */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Card 1 */}
                <div className="absolute top-1/4 right-1/4 w-40 h-24 bg-card rounded-lg shadow-2xl transform rotate-[-10deg] hover:rotate-0 transition-transform duration-500">
                  <div className="p-3">
                    <div className="w-8 h-8 bg-primary/20 rounded mb-2"></div>
                    <div className="h-2 bg-muted rounded w-3/4 mb-1"></div>
                    <div className="h-2 bg-muted/50 rounded w-1/2"></div>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="absolute top-1/3 right-1/3 w-44 h-28 bg-card rounded-lg shadow-2xl transform rotate-[5deg] hover:rotate-0 transition-transform duration-500">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-primary rounded"></div>
                      <div className="h-2 bg-muted rounded w-16"></div>
                    </div>
                    <div className="h-2 bg-muted rounded w-full mb-1"></div>
                    <div className="h-2 bg-muted/50 rounded w-2/3"></div>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="absolute bottom-1/4 right-1/4 w-36 h-20 bg-card rounded-lg shadow-2xl transform rotate-[15deg] hover:rotate-0 transition-transform duration-500">
                  <div className="p-3">
                    <div className="h-2 bg-primary/30 rounded w-1/2 mb-2"></div>
                    <div className="h-2 bg-muted rounded w-full mb-1"></div>
                    <div className="h-2 bg-muted/50 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
