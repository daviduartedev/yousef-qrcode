const ga4Image = '/assets/ga4-hero.png';
import { useTranslation } from "react-i18next";

const GA4Section = () => {
  const { t } = useTranslation();

  return (
    <section className="relative py-16 px-6 bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-[38px] font-medium text-white mb-6 leading-[1.1] tracking-normal" style={{ fontFamily: 'Inter, sans-serif' }}>
            {t('ga4.title')}
          </h2>
          <div className="max-w-4xl mx-auto">
            <p className="text-white text-lg leading-relaxed mb-2">
              {t('ga4.description1')}
            </p>
            <p className="text-white text-lg leading-relaxed">
              {t('ga4.description2')}
            </p>
          </div>
        </div>

        {/* Hero Image */}
        <div className="relative rounded-2xl overflow-hidden">
          <img
            src={ga4Image}
            alt="Professional using smartphone to scan QR code with Google Analytics tracking integration"
            className="w-full h-auto object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default GA4Section;
