import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";

const integrations = [
  {
    id: "01",
    title: "Google Analytics",
    content: "Connect your QR codes to Google Analytics to track user behavior, conversion rates, and engagement metrics in real-time. Gain comprehensive insights into your campaign performance."
  },
  {
    id: "02",
    title: "Google Ads & Meta Pixel",
    content: "Integrate with Google Ads and Meta Pixel to track conversions, optimize ad campaigns, and retarget users who scanned your QR codes across multiple platforms."
  },
  {
    id: "03",
    title: "Google Sheets & Zapier Automations",
    content: "Automatically sync QR code scan data to Google Sheets and trigger custom workflows with Zapier. Create automated reports and connect to thousands of apps."
  },
  {
    id: "04",
    title: "Slack",
    content: "Get instant notifications in Slack when your QR codes are scanned. Keep your team informed about campaign performance and engagement in real-time."
  },
  {
    id: "05",
    title: "Workato",
    content: "Build sophisticated automation workflows with Workato integration. Connect your QR code data to enterprise systems and streamline your operations."
  }
];

const AnalyticsIntegration = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 px-6 bg-muted/20">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Side - Title and Description */}
          <div className="lg:sticky lg:top-8">
            <h2 className="text-[38px] font-medium mb-6 text-foreground leading-[1.1] tracking-normal" style={{ fontFamily: 'Inter, sans-serif' }}>
              {t('analyticsIntegration.title').split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </h2>
            <p className="text-foreground text-lg leading-relaxed">
              {t('analyticsIntegration.description')}
            </p>
          </div>

          {/* Right Side - Accordion */}
          <div>
            <Accordion type="single" collapsible className="w-full">
              {integrations.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border-b border-border/40">
                  <AccordionTrigger className="py-6 hover:no-underline text-left">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground font-normal text-sm">{item.id}.</span>
                      <span className="font-semibold text-base">{item.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 pl-12 text-muted-foreground">
                    {item.content}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnalyticsIntegration;
