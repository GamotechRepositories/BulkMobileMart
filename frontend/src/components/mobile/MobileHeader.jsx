import { Link } from "react-router-dom";
import { LOGO_URL } from "../layout/Header";
import MobileSearchBar from "./MobileSearchBar";

function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-light bg-white px-4 pt-3 pb-4 shadow-sm sm:px-6 md:px-8 lg:hidden">
      <Link to="/" className="mx-auto flex w-fit flex-col items-center">
        <img
          src={LOGO_URL}
          alt="BulkMobileMart"
          className="h-12 w-auto object-contain sm:h-14"
        />
      </Link>
      <MobileSearchBar className="mx-auto mt-4 w-full max-w-lg" />
    </header>
  );
}

export default MobileHeader;
