import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";

const DataTrackingAccordion = () => {
  const { t } = useTranslation();

  const trackingData = [
    {
      id: "01",
      title: t('dataTracking.items.scans'),
      content: "Track the total number of times your QR Code has been scanned, giving you insights into engagement levels and campaign reach."
    },
    {
      id: "02",
      title: t('dataTracking.items.timeOfDay'),
      content: "Understand when your audience is most active by analyzing scan patterns throughout different times of the day and week."
    },
    {
      id: "03",
      title: t('dataTracking.items.location'),
      content: "Get detailed geographic data about where your QR Codes are being scanned, from country-level down to specific GPS coordinates."
    },
    {
      id: "04",
      title: t('dataTracking.items.device'),
      content: "See what devices your audience uses - iOS, Android, or other platforms - to optimize your content accordingly."
    },
    {
      id: "05",
      title: t('dataTracking.items.performance'),
      content: "Compare performance across different campaigns and QR Codes to identify which strategies drive the best results."
    }
  ];

  return (
    <section className="py-16 px-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-[38px] font-medium text-center mb-12 text-foreground leading-[1.1] tracking-normal" style={{ fontFamily: 'Inter, sans-serif' }}>
          {t('dataTracking.title')}
        </h2>

        <Accordion type="single" collapsible className="w-full">
          {trackingData.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="border-b border-border/40">
              <AccordionTrigger className="py-6 hover:no-underline">
                <div className="flex items-center gap-4 text-left">
                  <span className="text-muted-foreground font-normal">{item.id}.</span>
                  <span className="font-normal">{item.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pl-12 text-muted-foreground">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default DataTrackingAccordion;
