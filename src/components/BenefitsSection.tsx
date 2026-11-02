import { BarChart3, MapPin, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const benefits = [
  {
    icon: BarChart3,
    title: "Save what works, instantly.",
    description: "Align with your users and improve user acquisition with data-driven QR code campaigns. Measure what works by comparing different campaigns.",
  },
  {
    icon: Target,
    title: "Expand only on what converts.",
    description: "Lighten the cost of increasing offline campaigns and generate more ROI in your most effective locations.",
  },
  {
    icon: MapPin,
    title: "Open markets before their prime.",
    description: "Use real-time data to find out which markets, age, or city have the most scans to capture the best opportunities ahead of time.",
  },
  {
    icon: Zap,
    title: "Transform offline channels to ROI.",
    description: "Track and understand which physical campaigns perform best, compare them, and allocate resources only to effective tactics.",
  },
];

const BenefitsSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-[38px] font-medium text-white mb-6 leading-[1.1] tracking-normal" style={{ fontFamily: 'Inter, sans-serif' }}>
            {t('benefits.title')}
          </h2>
          <p className="text-white text-lg leading-relaxed max-w-3xl mx-auto">
            {t('benefits.description')}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="bg-primary/90 hover:bg-primary rounded-lg p-6 border border-primary transition-all duration-300 hover:scale-105"
              >
                <div className="mb-4">
                  <Icon className="h-8 w-8 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-white font-bold text-lg mb-3">
                  {benefit.title}
                </h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            className="bg-white text-black hover:bg-white/90 font-semibold px-8"
          >
            {t('benefits.cta')}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
