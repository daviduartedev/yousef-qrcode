import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
const dashboardImage = '/assets/dashboard-preview.png';

const steps = [
  {
    number: "01",
    title: "Step 01",
    description: "Log in to the Uniqode dashboard, click on 'Create' and select QR Code.",
    image: dashboardImage
  },
  {
    number: "02",
    title: "Step 02",
    description: "Choose a type of dynamic QR Code such as URL, vCard, PDF, etc.",
    image: dashboardImage
  },
  {
    number: "03",
    title: "Step 03",
    description: "Customize the dynamic QR Code, text, and color palette.",
    image: dashboardImage
  },
  {
    number: "04",
    title: "Step 04",
    description: "Click 'Analytics' on the left side of the dashboard.",
    image: dashboardImage
  },
  {
    number: "05",
    title: "Step 05",
    description: "You can now view and filter data such as number of scans, location, and location.",
    image: dashboardImage
  },
  {
    number: "bonus",
    title: "Bonus Step",
    description: "Tuffler and Export data in CSV or PDF format.",
    image: dashboardImage
  }
];

const HowToCreateQR = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + (100 / 40); // 4000ms / 100ms = 40 steps
      });
    }, 100);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 4000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [currentStep]);

  const handlePrevious = () => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
  };

  const handleNext = () => {
    setCurrentStep((prev) => (prev + 1) % steps.length);
  };

  const { t } = useTranslation();

  return (
    <section className="py-16 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-[38px] font-medium mb-6 text-foreground leading-[1.1] tracking-normal" style={{ fontFamily: 'Inter, sans-serif' }}>
            {t('howToCreate.title')}
          </h2>
          <p className="text-foreground text-lg leading-relaxed max-w-3xl mx-auto">
            {t('howToCreate.description')}
          </p>
        </div>

        {/* Dashboard Preview */}
        <div className="relative mb-8 rounded-xl overflow-hidden shadow-2xl">
          <img
            src={steps[currentStep].image}
            alt={`Step ${currentStep + 1}: ${steps[currentStep].description}`}
            className="w-full h-auto transition-opacity duration-500"
          />
        </div>

        {/* Steps Navigation */}
        <div className="relative">
          {/* Progress Indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-1 transition-all duration-300 ${
                  index === currentStep
                    ? "w-12 bg-primary"
                    : "w-8 bg-border"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Steps Content */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`transition-all duration-500 ${
                  index === currentStep
                    ? "opacity-100 scale-105"
                    : "opacity-60 scale-100"
                }`}
              >
                <div className="text-center">
                  {/* Progress Bar */}
                  <div className="mb-2 h-1 w-full bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-100 ease-linear"
                      style={{
                        width: index === currentStep ? `${progress}%` : '0%'
                      }}
                    />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              className="rounded-full"
              aria-label="Previous step"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="rounded-full"
              aria-label="Next step"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowToCreateQR;
