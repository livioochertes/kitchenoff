import { useEffect } from "react";
import { useTranslation } from "../hooks/useTranslation";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Link } from "wouter";
import ContactModal from "../components/contact-modal";
import { 
  Building2, 
  Users, 
  Truck, 
  MapPin, 
  UserCheck, 
  Settings, 
  ShoppingCart,
  DollarSign,
  Clock,
  Network,
  Headphones,
  Zap
} from "lucide-react";

export default function B2B() {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    {
      icon: ShoppingCart,
      title: t('b2b.features.centralized.title'),
      description: t('b2b.features.centralized.description')
    },
    {
      icon: DollarSign,
      title: t('b2b.features.pricing.title'),
      description: t('b2b.features.pricing.description')
    },
    {
      icon: Clock,
      title: t('b2b.features.delivery.title'),
      description: t('b2b.features.delivery.description')
    },
    {
      icon: Network,
      title: t('b2b.features.multiLocation.title'),
      description: t('b2b.features.multiLocation.description')
    },
    {
      icon: UserCheck,
      title: t('b2b.features.accountManagement.title'),
      description: t('b2b.features.accountManagement.description')
    },
    {
      icon: Settings,
      title: t('b2b.features.integration.title'),
      description: t('b2b.features.integration.description')
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: t('b2b.benefits.efficiency.title'),
      description: t('b2b.benefits.efficiency.description')
    },
    {
      icon: DollarSign,
      title: t('b2b.benefits.savings.title'),
      description: t('b2b.benefits.savings.description')
    },
    {
      icon: Users,
      title: t('b2b.benefits.support.title'),
      description: t('b2b.benefits.support.description')
    },
    {
      icon: Building2,
      title: t('b2b.benefits.scalability.title'),
      description: t('b2b.benefits.scalability.description')
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="kitchen-pro-secondary py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t('b2b.hero.title')}
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              {t('b2b.hero.subtitle')}
            </p>
            <Badge variant="secondary" className="bg-white text-secondary px-4 py-2 text-sm font-semibold">
              {t('b2b.hero.badge')}
            </Badge>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-primary mb-8">
              {t('b2b.intro.title')}
            </h2>
            <p className="text-lg text-slate-700 leading-relaxed mb-8">
              {t('b2b.intro.description')}
            </p>
            <p className="text-lg text-slate-700 leading-relaxed">
              {t('b2b.intro.platform')}
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 kitchen-pro-muted">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-primary mb-4 text-center">
              {t('b2b.features.title')}
            </h2>
            <p className="text-slate-600 text-center mb-12 max-w-3xl mx-auto">
              {t('b2b.features.description')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                        <feature.icon className="h-6 w-6 text-secondary" />
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

      {/* Benefits */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-primary mb-4 text-center">
              {t('b2b.benefits.title')}
            </h2>
            <p className="text-slate-600 text-center mb-12 max-w-3xl mx-auto">
              {t('b2b.benefits.description')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => (
                <Card key={index} className="text-center h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <benefit.icon className="h-12 w-12 text-secondary mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold text-primary mb-3">
                      {benefit.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {benefit.description}
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
              {t('b2b.cta.title')}
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              {t('b2b.cta.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <ContactModal>
                <Button className="bg-white text-secondary hover:bg-slate-100 px-8 py-3 text-lg">
                  {t('b2b.cta.getQuote')}
                </Button>
              </ContactModal>
              <Link href="/products">
                <Button 
                  className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-secondary px-8 py-3 text-lg"
                >
                  {t('b2b.cta.viewProducts')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}