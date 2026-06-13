import HeroBanner from "../components/mobile/HeroBanner";
import CategoryNav from "../components/mobile/CategoryNav";
import TopBrands from "../components/mobile/TopBrands";
import BestDeals from "../components/mobile/BestDeals";
import WhyChooseUs from "../components/mobile/WhyChooseUs";
import PromoBanner from "../components/mobile/PromoBanner";
import TestimonialsImpact from "../components/home/TestimonialsImpact";

function Home() {
  return (
    <div className="bg-mobile-bg">
      <HeroBanner />
      <CategoryNav />
      <TopBrands />
      <BestDeals />
      <WhyChooseUs />
      <PromoBanner />
      <TestimonialsImpact />
    </div>
  );
}

export default Home;
