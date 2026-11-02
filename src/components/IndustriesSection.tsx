import { useEffect, useState, useRef } from 'react';
import { TrendingUp, Users, CalendarDays, ShoppingCart } from 'lucide-react';

interface Industry {
  icon: React.ElementType;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
}

const industries: Industry[] = [
  {
    icon: TrendingUp,
    title: 'Marketing',
    description: 'Drive traffic and track campaign performance with scannable codes across print and digital media.',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    icon: Users,
    title: 'Sales',
    description: 'Share digital business cards instantly and follow up with prospects effortlessly.',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    icon: CalendarDays,
    title: 'Events',
    description: 'Streamline check-ins, share schedules, and collect attendee data seamlessly.',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    icon: ShoppingCart,
    title: 'Retail',
    description: 'Connect physical products to digital experiences with product information and promotions.',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
];

export const IndustriesSection = () => {
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
    <section ref={sectionRef} className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Built for Every Industry
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From marketing to retail, our platform adapts to your needs
          </p>
        </div>

        {/* Industry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {industries.map((industry, index) => {
            const IconComponent = industry.icon;
            return (
              <div
                key={index}
                className={`bg-background rounded-xl p-6 shadow-sm border border-border/50 transition-all duration-500 hover:shadow-lg hover:-translate-y-2 hover:border-primary/20 cursor-pointer group ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl ${industry.iconBg} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110`}
                >
                  <IconComponent className={`w-6 h-6 ${industry.iconColor}`} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {industry.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {industry.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
