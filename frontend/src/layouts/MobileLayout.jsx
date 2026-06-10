import BottomNav from "../components/mobile/BottomNav";
import TopNav from "../components/mobile/TopNav";

function MobileLayout({ children }) {
  return (
    <div className="min-h-screen bg-mobile-bg text-text-primary">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl bg-mobile-bg pb-20 pt-0 min-h-screen lg:pt-[72px] lg:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export default MobileLayout;
