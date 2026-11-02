import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Sarah Johnson',
    role: 'Marketing Director',
    company: 'TechFlow Inc',
    content: '"QRConnect transformed our marketing campaigns. We saw a 300% increase in engagement within the first month."',
    avatar: 'SJ',
  },
  {
    name: 'Michael Chen',
    role: 'Sales Manager',
    company: 'InnovateCore',
    content: '"The digital business cards are game-changing. Our team closed 40% more deals using QRConnect."',
    avatar: 'MC',
  },
  {
    name: 'Emma Rodriguez',
    role: 'Event Coordinator',
    company: 'EventPro',
    content: '"Managing events has never been easier. The analytics help us understand attendee behavior like never before."',
    avatar: 'ER',
  },
];

export const TestimonialsSection = () => {
  const { t: copy } = useTranslation('copy');
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

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
            {copy("Loved by Thousands of Teams")}</h2>
          <p className="text-muted-foreground text-lg">
            {copy("See what our customers have to say")}</p>
        </div>

        {/* Testimonials Carousel */}
        <div
          className={`relative max-w-4xl mx-auto transition-all duration-700 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 w-10 h-10 rounded-full bg-background shadow-md flex items-center justify-center hover:bg-muted transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 w-10 h-10 rounded-full bg-background shadow-md flex items-center justify-center hover:bg-muted transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>

          {/* Cards */}
          <div className="flex gap-6 overflow-hidden justify-center">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`bg-background rounded-xl p-6 shadow-sm border border-border/50 min-w-[280px] max-w-[320px] transition-all duration-500 ${
                  index === currentIndex ? 'scale-100 opacity-100' : 'scale-95 opacity-70'
                }`}
              >
                {/* Avatar and Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {copy(testimonial.avatar)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{copy(testimonial.name)}</h4>
                    <p className="text-xs text-muted-foreground">{copy(testimonial.role)}</p>
                    <p className="text-xs text-primary">{copy(testimonial.company)}</p>
                  </div>
                </div>

                {/* Quote */}
                <p className="text-muted-foreground text-sm italic leading-relaxed">
                  {copy(testimonial.content)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
