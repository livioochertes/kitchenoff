import { useTranslation } from "../hooks/useTranslation";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Building2, Users, Truck, HeadphonesIcon, Award, ShieldCheck } from "lucide-react";

export default function About() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Building2,
      title: t('about.features.catalog.title'),
      description: t('about.features.catalog.description')
    },
    {
      icon: Truck,
      title: t('about.features.delivery.title'),
      description: t('about.features.delivery.description')
    },
    {
      icon: HeadphonesIcon,
      title: t('about.features.support.title'),
      description: t('about.features.support.description')
    },
    {
      icon: Award,
      title: t('about.features.pricing.title'),
      description: t('about.features.pricing.description')
    }
  ];

  const values = [
    {
      icon: ShieldCheck,
      title: t('about.values.trust.title'),
      description: t('about.values.trust.description')
    },
    {
      icon: Users,
      title: t('about.values.partnership.title'),
      description: t('about.values.partnership.description')
    },
    {
      icon: Award,
      title: t('about.values.excellence.title'),
      description: t('about.values.excellence.description')
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="kitchen-pro-secondary py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t('about.hero.title')}
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              {t('about.hero.subtitle')}
            </p>
            <Badge variant="secondary" className="bg-white text-secondary px-4 py-2 text-sm font-semibold">
              {t('about.hero.badge')}
            </Badge>
          </div>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-primary mb-8 text-center">
              {t('about.story.title')}
            </h2>
            <div className="prose prose-lg max-w-none text-slate-700 space-y-6">
              <p className="text-lg leading-relaxed">
                {t('about.story.paragraph1')}
              </p>
              <p className="text-lg leading-relaxed">
                {t('about.story.paragraph2')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Platform */}
      <section className="py-16 kitchen-pro-muted">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-primary mb-4 text-center">
              {t('about.platform.title')}
            </h2>
            <p className="text-slate-600 text-center mb-12 max-w-3xl mx-auto">
              {t('about.platform.description')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <feature.icon className="h-8 w-8 text-secondary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-primary mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-primary mb-4 text-center">
              {t('about.values.title')}
            </h2>
            <p className="text-slate-600 text-center mb-12 max-w-3xl mx-auto">
              {t('about.values.description')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {values.map((value, index) => (
                <Card key={index} className="text-center h-full">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <value.icon className="h-12 w-12 text-secondary mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold text-primary mb-3">
                      {value.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 kitchen-pro-secondary">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              {t('about.cta.title')}
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              {t('about.cta.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/products"
                className="bg-white text-secondary px-8 py-3 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
              >
                {t('about.cta.shopNow')}
              </a>
              <a
                href="/ai-assistant"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-secondary transition-colors"
              >
                {t('about.cta.contactUs')}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}