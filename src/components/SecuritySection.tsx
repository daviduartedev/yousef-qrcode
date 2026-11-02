import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef } from 'react';
import { Shield, Lock, FileCheck, Award } from 'lucide-react';

interface SecurityFeature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const securityFeatures: SecurityFeature[] = [
  {
    icon: Shield,
    title: 'SOC 2 Compliant',
    description: 'Enterprise-grade security standards',
  },
  {
    icon: Lock,
    title: 'GDPR Ready',
    description: 'Full compliance with data protection regulations',
  },
  {
    icon: FileCheck,
    title: '256-bit Encryption',
    description: 'Bank-level data encryption',
  },
  {
    icon: Award,
    title: 'ISO 27001',
    description: 'Certified information security management',
  },
];

export const SecuritySection = () => {
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
    <section ref={sectionRef} className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {copy("Enterprise-Grade Security")}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {copy("Your data is protected with industry-leading security standards")}</p>
        </div>

        {/* Security Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {securityFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className={`text-center transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconComponent className="w-7 h-7 text-primary" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">
                  {copy(feature.title)}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {copy(feature.description)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
