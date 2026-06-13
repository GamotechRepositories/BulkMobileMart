import HeroBanner from "../components/mobile/HeroBanner";
import CategoryNav from "../components/mobile/CategoryNav";
import TopBrands from "../components/mobile/TopBrands";
import BestDeals from "../components/mobile/BestDeals";
import ValuePropositions from "../components/mobile/ValuePropositions";
import PromoBanner from "../components/mobile/PromoBanner";
import TestimonialsImpact from "../components/home/TestimonialsImpact";

function Home() {
  return (
    <div className="bg-mobile-bg">
      <HeroBanner />
      <CategoryNav />
      <TopBrands />
      <BestDeals />
      <ValuePropositions />
      <PromoBanner />
      <TestimonialsImpact />
    </div>
  );
}

export default Home;
