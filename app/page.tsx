import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import TickerBar from '@/components/landing/TickerBar';
import HeroSection from '@/components/landing/HeroSection';
import StatsSection, { TrustBar, ComplianceBadges } from '@/components/landing/StatsSection';
import MarketPreview from '@/components/landing/MarketPreview';
import FeaturesSection from '@/components/landing/FeaturesSection';
import SwiftBridgeShowcase from '@/components/landing/SwiftBridgeShowcase';
import PricingPreview from '@/components/landing/PricingPreview';
import {
  TestimonialsSection,
  HowItWorksSection,
  CompanySection,
  CTASection,
} from '@/components/landing/Sections';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-void text-pearl-50 selection:bg-champagne-400/30 selection:text-pearl-50">
      <TickerBar />
      <Navigation />
      <HeroSection />
      <TrustBar />
      <StatsSection />
      <SwiftBridgeShowcase />
      <MarketPreview />
      <FeaturesSection />
      <ComplianceBadges />
      <HowItWorksSection />
      <PricingPreview />
      <TestimonialsSection />
      <CompanySection />
      <CTASection />
      <Footer />
    </div>
  );
}
