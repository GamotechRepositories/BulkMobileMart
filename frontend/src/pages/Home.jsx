import MobileHeader from "../components/mobile/MobileHeader";
import HeroBanner from "../components/mobile/HeroBanner";
import CategoryNav from "../components/mobile/CategoryNav";
import ValuePropositions from "../components/mobile/ValuePropositions";
import PromoBanner from "../components/mobile/PromoBanner";
import TopBrands from "../components/mobile/TopBrands";
import BestDeals from "../components/mobile/BestDeals";
import TestimonialsImpact from "../components/home/TestimonialsImpact";

function Home() {
  return (
    <div className="bg-mobile-bg">
      <MobileHeader />
      <HeroBanner />
      <CategoryNav />
      <ValuePropositions />
      <PromoBanner />
      <TopBrands />
      <BestDeals />
      <TestimonialsImpact />
    </div>
  );
}

export default Home;
