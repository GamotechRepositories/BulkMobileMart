import { useAuth } from "../context/AuthContext";
import MobileHeader from "../components/mobile/MobileHeader";

function Profile() {
  const { user, logout, openAuthModal } = useAuth();

  return (
    <div className="min-h-screen bg-mobile-bg px-4 pb-24 pt-4 sm:px-6 md:px-8 lg:pb-8 lg:pt-6">
      <MobileHeader showSearch={false} />
      <div className="mx-auto mt-6 max-w-lg sm:mt-8 md:max-w-xl">
        <div className="rounded-2xl border border-border-light bg-white p-6 shadow-sm sm:p-8 md:p-10">
          {user ? (
            <>
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary sm:h-16 sm:w-16 sm:text-2xl">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-text-primary sm:text-xl">
                    Hi, {user.name}
                  </h1>
                  <p className="mt-0.5 text-sm text-text-secondary sm:text-base">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full rounded-lg border border-border-light py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary hover:text-primary sm:py-3 sm:text-base"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <h1 className="text-lg font-bold text-text-primary sm:text-xl md:text-2xl">
                Profile
              </h1>
              <p className="mt-2 text-sm text-text-secondary sm:text-base">
                Sign in to manage your account and orders.
              </p>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="mt-6 w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-white transition hover:brightness-110 sm:py-3 sm:text-base"
              >
                Login / Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
