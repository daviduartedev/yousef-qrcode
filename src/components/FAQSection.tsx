import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'What is a dynamic QR code?',
    answer: 'A dynamic QR code is a type of QR code that allows you to change the destination URL without reprinting the code. This means you can update where your QR code points to at any time, track scans, and gather analytics.',
  },
  {
    question: 'Can I customize the appearance of my QR codes?',
    answer: 'Yes! You can fully customize your QR codes with your brand colors, logo, and choose from various shapes and patterns. This helps maintain brand consistency across all your marketing materials.',
  },
  {
    question: 'Do you offer a free trial?',
    answer: 'Yes, we offer a 14-day free trial on all plans. No credit card required. You can explore all features and upgrade to a paid plan when you\'re ready.',
  },
  {
    question: 'What kind of analytics do you provide?',
    answer: 'We provide comprehensive analytics including scan location, device type, time of scan, unique vs. repeat scans, and user behavior patterns. All data is available in real-time through your dashboard.',
  },
  {
    question: 'Can I integrate QRConnect with other tools?',
    answer: 'Absolutely! We integrate with popular tools like HubSpot, Salesforce, Zapier, Google Analytics, Mailchimp, Slack, Shopify, and Google Sheets. Custom API integrations are also available.',
  },
  {
    question: 'Is there a limit on the number of scans?',
    answer: 'Scan limits depend on your plan. Starter includes 5,000 scans/month, Professional includes 50,000 scans/month, and Enterprise plans offer unlimited scans.',
  },
];

export const FAQSection = () => {
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
            {copy("Frequently Asked Questions")}</h2>
          <p className="text-muted-foreground text-lg">
            {copy("Everything you need to know about QRConnect")}</p>
        </div>

        {/* FAQ Accordion */}
        <div
          className={`max-w-3xl mx-auto transition-all duration-700 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border/50 rounded-lg px-4 data-[state=open]:bg-muted/30"
              >
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
                  {copy(faq.question)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {copy(faq.answer)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
