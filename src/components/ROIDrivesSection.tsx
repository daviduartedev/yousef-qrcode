import { useState } from "react";
import { ChevronLeft, ChevronRight, DollarSign, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const roiSlides = [
  {
    icon: DollarSign,
    title: "Improve conversions with iteration",
    description: "Use real-time scan data to identify drop-offs or spikes immediately. Update CTAs, offers, or landing pages mid-campaign and improve outcomes on the fly.",
  },
  {
    icon: Target,
    title: "Turn offline interest into online leads",
    description: "Capture contact info through low-friction in the funnel and nurture intent prospects who've shown interest.",
  },
  {
    icon: Target,
    title: "Turn offline interest into online leads",
    description: "Capture contact info through low-friction in the funnel and nurture intent prospects who've shown interest.",
  },
  {
    icon: Target,
    title: "Turn offline interest into online leads",
    description: "Capture contact info through low-friction in the funnel and nurture intent prospects who've shown interest.",
  },
  {
    icon: Target,
    title: "Turn offline interest into online leads",
    description: "Capture contact info through low-friction in the funnel and nurture intent prospects who've shown interest.",
  },
  {
    icon: Target,
    title: "Turn offline interest into online leads",
    description: "Capture contact info through low-friction in the funnel and nurture intent prospects who've shown interest.",
  },
];

const ROIDrivesSection = () => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handlePrevious = () => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => Math.min(roiSlides.length - 2, prev + 1));
  };

  // Calculate transform: each card is 50% + gap (0.75rem = 12px)
  const transformValue = `calc(-${currentSlide * 50}% - ${currentSlide * 0.75}rem)`;

  return (
    <section className="relative py-20 px-6 bg-black overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgyVjZoNFY0aC00ek02IDM0di00SDR2NEgwdjJoNHY0aDJ2LTRoNHYtMkg2ek02IDRWMEG0djRIMHYyaDR2NGgyVjZoNFY0SDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-[38px] font-medium text-white mb-6 leading-[1.1] tracking-normal" style={{ fontFamily: 'Inter, sans-serif' }}>
            {t('roi.title')}
          </h2>
          <p className="text-white text-lg leading-relaxed max-w-3xl mx-auto">
            {t('roi.description')}
          </p>
        </div>

        {/* Slider Content */}
        <div className="relative">
          <div className="overflow-hidden">
            <div
              className="flex gap-6 transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(${transformValue})`,
              }}
            >
              {roiSlides.map((slide, index) => {
                const Icon = slide.icon;
                return (
                  <div
                    key={index}
                    className="flex-shrink-0 w-full md:w-[calc(50%-12px)]"
                  >
                    <div className="bg-gradient-to-br from-muted/20 to-muted/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 h-64 flex flex-col">
                      <div className="flex items-start gap-6 flex-1">
                        <div className="flex-shrink-0 w-16 h-16 bg-muted/30 rounded-xl flex items-center justify-center">
                          <Icon className="h-8 w-8 text-white" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-h-0">
                          <h3 className="text-xl font-bold text-white mb-3">
                            {slide.title}
                          </h3>
                          <p className="text-white/80 leading-relaxed">
                            {slide.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-3 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={currentSlide === 0}
              className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentSlide >= roiSlides.length - 2}
              className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ROIDrivesSection;
