import BottomNav from "../components/mobile/BottomNav";
import TopNav from "../components/mobile/TopNav";
import Footer from "../components/layout/Footer";

function MobileLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-mobile-bg text-text-primary">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 bg-mobile-bg pb-20 pt-0 lg:pt-[72px] lg:pb-8">
        {children}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

export default MobileLayout;
