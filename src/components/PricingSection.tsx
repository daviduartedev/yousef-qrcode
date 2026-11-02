import { useEffect, useState, useRef } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  popular?: boolean;
  highlighted?: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'Perfect for individuals and small teams',
    features: [
      '50 Dynamic QR Codes',
      '5,000 scans/month',
      'Basic analytics',
      'Email support',
      'Custom branding',
      'API access',
    ],
    buttonText: 'Start Free Trial',
  },
  {
    name: 'Professional',
    price: '$79',
    period: '/month',
    description: 'For growing businesses and teams',
    features: [
      'Unlimited QR Codes',
      '50,000 scans/month',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
      'API access',
    ],
    buttonText: 'Start Free Trial',
    popular: true,
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with custom needs',
    features: [
      'Unlimited everything',
      'Unlimited scans',
      'Custom analytics',
      'Dedicated support',
      'White-label solutions',
      'Custom integrations',
    ],
    buttonText: 'Contact Sales',
  },
];


export const PricingSection = () => {
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
    <section ref={sectionRef} className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-lg">
            Choose the plan that&apos;s right for you
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-6 transition-all duration-500 ${
                plan.highlighted
                  ? 'bg-primary text-primary-foreground shadow-xl scale-105 border-0'
                  : 'bg-background border border-border shadow-sm hover:shadow-md'
              } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className={`text-xl font-semibold mb-2 ${plan.highlighted ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-4 ${plan.highlighted ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {plan.description}
                </p>
                <div className="flex items-baseline">
                  <span className={`text-4xl font-bold ${plan.highlighted ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`ml-1 ${plan.highlighted ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2">
                    <Check className={`w-4 h-4 ${plan.highlighted ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className={`text-sm ${plan.highlighted ? 'text-primary-foreground/90' : 'text-foreground'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                className={`w-full ${
                  plan.highlighted
                    ? 'bg-white text-primary hover:bg-white/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {plan.buttonText}
              </Button>
            </div>
          ))}
        </div>

        {/* View Full Pricing */}

      </div>
    </section>
  );
};
