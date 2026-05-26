import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import TickerBar from '@/components/landing/TickerBar';
import HeroSection from '@/components/landing/HeroSection';
import AssetClassCards from '@/components/landing/AssetClassCards';
import SwiftBridgeShowcase from '@/components/landing/SwiftBridgeShowcase';
import { ComplianceBadges } from '@/components/landing/StatsSection';
import { CTASection } from '@/components/landing/Sections';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050713] text-white selection:bg-[#22D3EE]/30 selection:text-white overflow-x-hidden">
      <TickerBar />
      <Navigation />
      <HeroSection />
      <AssetClassCards />
      <SwiftBridgeShowcase />
      <ComplianceBadges />
      <CTASection />
      <Footer />
    </div>
  );
}
