import { Link } from "react-router-dom";

const BANNER_IMAGE =
  "https://res.cloudinary.com/dsafvwkrf/image/upload/v1781347425/Untitled_design_9_lqyd8e.png";

const WHATSAPP_HREF =
  "https://wa.me/917400222233?text=Hi%2C%20I%20am%20interested%20in%20bulk%20mobile%20accessories%20from%20Bulk%20Mobile%20Mart.";

function PromoBanner() {
  return (
    <section className="bg-white px-4 py-4 sm:px-6 md:px-8">
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl">
        <img
          src={BANNER_IMAGE}
          alt="Mobile accessories wholesale"
          className="h-[200px] w-full object-cover object-center sm:h-[240px] md:h-[300px] lg:h-[340px]"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10" />

        <div className="absolute inset-0 flex flex-col justify-center px-4 sm:px-8 md:px-10 lg:px-12">
          <p className="max-w-md text-lg font-bold leading-snug text-white sm:text-xl md:text-2xl lg:text-3xl">
            Bulk Mobile Accessories at{" "}
            <span className="text-primary">Wholesale Prices</span>
          </p>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/90 sm:text-sm md:text-base">
            MOQ 10 pieces · Pan-India delivery · Best deals for retailers & distributors
          </p>

          <div className="mt-4 flex flex-wrap gap-2 sm:mt-5 sm:gap-3">
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              <svg className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>

            <Link
              to="/support"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-white bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white hover:text-text-primary sm:px-5 sm:py-2.5 sm:text-sm"
            >
              <svg className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              Support
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PromoBanner;
