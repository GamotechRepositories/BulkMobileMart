import MobileHeader from "../components/mobile/MobileHeader";

function Orders() {
  return (
    <div className="min-h-screen bg-mobile-bg px-4 pb-24 pt-4 sm:px-6 md:px-8 lg:pb-8 lg:pt-6">
      <MobileHeader showSearch={false} />
      <div className="mx-auto mt-6 max-w-2xl text-center sm:mt-8">
        <div className="rounded-2xl border border-border-light bg-white p-8 shadow-sm sm:p-10 md:p-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-20 sm:w-20">
            <svg className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-text-primary sm:text-xl md:text-2xl">
            My Orders
          </h1>
          <p className="mt-2 text-sm text-text-secondary sm:text-base">
            Your order history will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Orders;
