const mapImage = '/assets/map-tracking.png';
const phoneImage = '/assets/phone-analytics.png';
import { useTranslation } from "react-i18next";

const TrackingInfo = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-[38px] font-medium text-foreground mb-6 leading-[1.1] tracking-normal" style={{ fontFamily: 'Inter, sans-serif' }}>
            {t('trackingInfo.title')}
          </h2>
          <p className="text-foreground text-lg leading-relaxed max-w-4xl mx-auto">
            {t('trackingInfo.description')}
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1 - Map */}
          <div className="bg-muted/30 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="mb-4">
              <h3 className="text-base font-semibold mb-2">
                Monitor high-performing <br />
                <span className="font-bold">regions, and discover peak<br />activity zones</span> for strategic<br />
                placement optimization.
              </h3>
            </div>
            <div className="rounded-lg overflow-hidden">
              <img
                src={mapImage}
                alt="Geographic tracking map showing QR code scan locations across United States"
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Card 2 - Phone Analytics */}
          <div className="bg-muted/30 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="mb-4">
              <p className="text-base mb-2">
                Real-time data enables marketers<br />
                to optimize, <span className="font-bold">measure campaign<br />effectiveness, and calculate ROI.</span>
              </p>
            </div>
            <div className="rounded-lg overflow-hidden">
              <img
                src={phoneImage}
                alt="Smartphone displaying QR code with analytics showing 28% and 15% conversion rates"
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Card 3 - Donut Chart */}
          <div className="bg-muted/30 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="mb-4">
              <svg viewBox="0 0 200 200" className="w-full h-auto max-w-[200px] mx-auto">
                {/* Donut Chart */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="40"
                  strokeDasharray="301.59 502.65"
                  transform="rotate(-90 100 100)"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="40"
                  strokeDasharray="167.55 502.65"
                  strokeDashoffset="-301.59"
                  transform="rotate(-90 100 100)"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="40"
                  strokeDasharray="33.51 502.65"
                  strokeDashoffset="-469.14"
                  transform="rotate(-90 100 100)"
                />
                <circle cx="100" cy="100" r="45" fill="white" />
              </svg>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                    <span>iOS</span>
                  </div>
                  <span className="text-muted-foreground">58.33%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-slate-800 rounded-sm"></div>
                    <span>Android</span>
                  </div>
                  <span className="text-muted-foreground">33.33%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
                    <span>Others</span>
                  </div>
                  <span className="text-muted-foreground">8.33%</span>
                </div>
              </div>
            </div>

            <p className="text-base font-semibold mt-4">
              <span className="font-bold">Gain deep audience<br />understanding</span> from every offline<br />interaction.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrackingInfo;
