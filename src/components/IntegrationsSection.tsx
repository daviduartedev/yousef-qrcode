import { useEffect, useState, useRef } from 'react';

const integrations = [
  ['HubSpot', 'Salesforce', 'Zapier', 'Google Analytics'],
  ['Mailchimp', 'Slack', 'Shopify', 'Google Sheets'],
];

export const IntegrationsSection = () => {
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
        {/* Header */}
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Seamless Integrations
          </h2>
          <p className="text-muted-foreground text-lg">
            Connect with the tools you already use
          </p>
        </div>

        {/* Integration Badges */}
        <div
          className={`flex flex-col items-center gap-4 mb-10 transition-all duration-700 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {integrations.map((row, rowIndex) => (
            <div key={rowIndex} className="flex flex-wrap justify-center gap-4">
              {row.map((integration, index) => (
                <div
                  key={integration}
                  className="px-8 py-3 bg-background border border-border rounded-lg text-foreground font-medium text-sm hover:border-primary/50 hover:shadow-md transition-all duration-300 cursor-pointer"
                  style={{ transitionDelay: `${(rowIndex * 4 + index) * 50}ms` }}
                >
                  {integration}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div
          className={`text-center transition-all duration-700 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
        </div>
      </div>
    </section>
  );
};
