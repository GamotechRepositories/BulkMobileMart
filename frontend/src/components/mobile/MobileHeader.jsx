import { LOGO_URL } from "../layout/Header";
import MobileSearchBar from "./MobileSearchBar";

function MobileHeader({ showSearch = true }) {
  return (
    <header className="bg-white px-4 pt-3 pb-4 sm:px-6 md:px-8 lg:hidden">
      <div className="flex flex-col items-center">
        <img
          src={LOGO_URL}
          alt="BulkMobileMart"
          className="h-12 w-auto object-contain sm:h-14"
        />
      </div>
      {showSearch && <MobileSearchBar className="mx-auto mt-4 w-full max-w-lg" />}
    </header>
  );
}

export default MobileHeader;
