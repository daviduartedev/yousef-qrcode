import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const SecureBanner = () => {
  const { t } = useTranslation();

  return (
    <section className="relative py-20 px-6 bg-primary overflow-hidden">
      {/* Pattern Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Content */}
      <div className="relative max-w-5xl mx-auto text-center">
        <h2 className="text-[38px] font-medium text-white mb-6 leading-[1.1] tracking-normal" style={{ fontFamily: 'Inter, sans-serif' }}>
          {t('secureBanner.title').split('\n').map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
        </h2>
        <p className="text-white text-lg max-w-4xl mx-auto mb-8 leading-relaxed">
          {t('secureBanner.description')}
        </p>
        <Button
          size="lg"
          className="bg-white text-primary hover:bg-white/90 font-semibold px-8"
        >
          {t('secureBanner.learnMore')}
        </Button>
      </div>
    </section>
  );
};

export default SecureBanner;
