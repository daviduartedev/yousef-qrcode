import { useEffect, useState, useRef } from 'react';
import { Zap, BarChart3, Smartphone, Globe } from 'lucide-react';

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
}

const features: Feature[] = [
  {
    icon: Zap,
    title: 'Dynamic QR Codes',
    description: 'Create editable QR codes that update in real-time without reprinting. Track scans and modify destination URLs anytime.',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Get detailed insights into scan location, device type, time, and user behavior to optimize your campaigns.',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    icon: Smartphone,
    title: 'Digital Business Cards',
    description: 'Modern contactless business cards that can be shared instantly via QR code, NFC, or link. Update anytime.',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    icon: Globe,
    title: 'Custom Branding',
    description: 'Add your logo, colors, and custom domains to QR codes. White-label solutions available for enterprises.',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
];

export const FeaturesSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 bg-secondary"
    >
      <div className="container mx-auto px-4">
        {/* Header */}
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Powerful features designed for modern marketing teams
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className={`bg-background rounded-xl p-6 shadow-sm border border-border/50 transition-all duration-500 hover:shadow-lg hover:-translate-y-2 hover:border-primary/20 cursor-pointer group ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110`}>
                  <IconComponent className={`w-6 h-6 ${feature.iconColor}`} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Link */}
                <a
                  href="#"
                  className="inline-flex items-center text-primary text-sm font-medium hover:underline transition-colors"
                >
                  Learn More →
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
