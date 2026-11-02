import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef } from 'react';

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  { value: 10, suffix: 'M+', label: 'QR Codes Created' },
  { value: 50, suffix: 'K+', label: 'Active Users' },
  { value: 99, suffix: '%', label: 'Uptime SLA' },
  { value: 150, suffix: '+', label: 'Countries' },
];

const AnimatedNumber = ({ value, suffix, isVisible }: { value: number; suffix: string; isVisible: boolean }) => {
  const { t: copy } = useTranslation('copy');
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    let start = 0;
    const duration = 2000;
    const increment = value / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  return (
    <span className="text-5xl md:text-6xl font-bold text-primary">
      {count}{copy(suffix)}
    </span>
  );
};

export const StatsSection = () => {
  const { t: copy } = useTranslation('copy');
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 bg-background"
    >
      <div className="container mx-auto px-4">
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <AnimatedNumber value={stat.value} suffix={stat.suffix} isVisible={isVisible} />
              <p className="mt-2 text-muted-foreground text-sm md:text-base">{copy(stat.label)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
