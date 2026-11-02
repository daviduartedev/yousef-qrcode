'use client';

import Header from "@/components/Header";
import LogoCarousel from "@/components/LogoCarousel";
import QRGenerator from "@/components/QRGenerator";
import TrackingInfo from "@/components/TrackingInfo";
import DataTrackingAccordion from "@/components/DataTrackingAccordion";
import HowToCreateQR from "@/components/HowToCreateQR";
import GA4Section from "@/components/GA4Section";
import BenefitsSection from "@/components/BenefitsSection";
import SecureBanner from "@/components/SecureBanner";
import ROIDrivesSection from "@/components/ROIDrivesSection";
import AnalyticsIntegration from "@/components/AnalyticsIntegration";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section id="qr-generator" className="py-12 px-6 bg-hero">
        <div className="max-w-7xl mx-auto text-center mb-12">
          <h1 className="text-[38px] font-medium text-hero-foreground mb-6 leading-[1.1] tracking-normal" style={{ fontFamily: 'Inter, sans-serif' }}>
            {t('hero.title')}
          </h1>
          <p className="text-lg text-hero-foreground leading-relaxed max-w-3xl mx-auto">
            {t('hero.description')}
          </p>
        </div>

        {/* QR Generator Component */}
        <QRGenerator />

        {/* Bottom CTA */}
        <div className="flex items-center justify-center gap-4 mt-12 pb-12">
          <Button size="lg" className="px-8">
            {t('header.startFreeTrial')}
          </Button>
          <Button size="lg" variant="outline" className="px-8 bg-transparent border-hero-foreground/30 text-hero-foreground hover:bg-hero-foreground/10">
            {t('viewPricing')}
          </Button>
        </div>
      </section>

      {/* Logo Carousel */}
      <LogoCarousel />

      {/* Tracking Info Section */}
      <section id="tracking-info">
        <TrackingInfo />
      </section>

      {/* Data Tracking Accordion */}
      <DataTrackingAccordion />

      {/* How to Create QR Section */}
      <section id="how-to-create">
        <HowToCreateQR />
      </section>

      {/* GA4 Integration Section */}
      <section id="ga4">
        <GA4Section />
      </section>

      {/* Benefits Section */}
      <section id="benefits">
        <BenefitsSection />
      </section>

      {/* Secure Banner */}
      <SecureBanner />

      {/* ROI Drives Section */}
      <section id="roi">
        <ROIDrivesSection />
      </section>

      {/* Analytics Integration */}
      <AnalyticsIntegration />
    </div>
  );
};

export default Index;
