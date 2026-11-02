'use client';
import { useTranslation } from 'react-i18next';

import { Button } from "@/components/ui/button";
import LandingHeader from "@/components/LandingHeader";
import LogoCarousel from "@/components/LogoCarousel";
import { StatsSection } from "@/components/StatsSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { IndustriesSection } from "@/components/IndustriesSection";
import { IntegrationsSection } from "@/components/IntegrationsSection";
import { SecuritySection } from "@/components/SecuritySection";
import { PricingSection } from "@/components/PricingSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { FAQSection } from "@/components/FAQSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { useRouter } from 'next/navigation';
const dashboardPreview = '/assets/dashboard-preview.png';

const LandingPage = () => {
  const { t: copy } = useTranslation('copy');
  const navigate = useRouter().push;

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      {/* Hero Section */}
      <section className="py-16 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-foreground">{copy("Modern QR Code &")}</span>
                <br />
                <span className="text-primary">{copy("Digital Business Card")}</span>
                <br />
                <span className="text-foreground">{copy("Platform")}</span>
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                {copy("Create, manage, and track QR codes and digital business cards at scale. Trusted by leading brands worldwide.")}</p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-8 h-12 text-base font-medium"
                  onClick={() => navigate("/app")}
                >
                  {copy("Start Free Trial")}</Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-lg px-8 h-12 text-base font-medium bg-transparent"
                  onClick={() => navigate("/app")}
                >
                  {copy("Book a Demo")}</Button>
              </div>
            </div>

            {/* Right Column - Laptop Image */}
            <div className="relative flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-2xl transform perspective-1000">
                {/* Laptop Frame with slight angle */}
                <div className="relative transform rotate-[-2deg] lg:rotate-0">
                  {/* Laptop Screen */}
                  <div className="bg-gradient-to-b from-muted to-muted/80 rounded-t-lg p-1.5 shadow-2xl">
                    {/* Screen Bezel */}
                    <div className="bg-foreground rounded-t-md overflow-hidden border-2 border-foreground/80">
                      {/* Dashboard Preview */}
                      <img
                        src={dashboardPreview}
                        alt={copy("QRConnect Dashboard")}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  </div>
                  {/* Laptop Base/Keyboard */}
                  <div className="bg-gradient-to-b from-muted to-muted/60 h-3 rounded-b-lg shadow-xl mt-0.5">
                    {/* Trackpad indicator */}
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-muted-foreground/50 rounded-full"></div>
                  </div>
                </div>
                {/* Decorative shadow */}
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-3/4 h-8 bg-foreground/10 blur-2xl rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Carousel */}
      <LogoCarousel />

      {/* Stats Section */}
      <StatsSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* Analytics Section */}
      <AnalyticsSection />

      {/* Industries Section */}
      <IndustriesSection />

      {/* Integrations Section */}
      <IntegrationsSection />

      {/* Security Section */}
      <SecuritySection />

      {/* Pricing Section */}
      <PricingSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;
