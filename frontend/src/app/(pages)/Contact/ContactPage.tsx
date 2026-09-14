import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import PageHero from "@/app/components/shared/PageHero";
import { CONTACT } from "@/data/footer";
import { cn } from "@/utils";
import { CONTAINER } from "@/utils/layout";
import ContactForm from "./components/ContactForm";

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.address)}`;

const CARD = "rounded-2xl border border-tertiary/10 bg-secondary p-5";
const ICON_TILE =
  "bg-icon-tile flex size-10 shrink-0 items-center justify-center rounded-lg text-secondary";

const ContactPage = () => {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We are here to help"
        description="Questions about a booking, a membership or listing your space? Send a message and a real person replies within one working day."
      />

      <section className="bg-surface py-16 lg:py-20">
        <div
          className={cn(
            CONTAINER,
            "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8",
          )}
        >
          {/* useSearchParams needs a Suspense boundary or the production build
              fails on this statically rendered route. */}
          <Suspense
            fallback={
              <div className="h-128 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
            }
          >
            <ContactForm />
          </Suspense>

          <div className="flex flex-col gap-4">
            <div className={CARD}>
              <div className="flex items-start gap-3">
                <span className={ICON_TILE}>
                  <MapPin aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-tertiary">
                    Visit our office
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-tertiary/65">
                    {CONTACT.address}
                  </p>
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-75"
                  >
                    Get directions
                    <ArrowRight aria-hidden="true" className="size-4" />
                    <span className="sr-only"> (opens Google Maps in a new tab)</span>
                  </a>
                </div>
              </div>
            </div>

            <div className={CARD}>
              <div className="flex items-start gap-3">
                <span className={ICON_TILE}>
                  <Phone aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-tertiary">Call us</h2>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {CONTACT.phones.map((phone) => (
                      <li key={phone}>
                        <a
                          href={`tel:${phone.replace(/\s/g, "")}`}
                          className="text-sm text-tertiary/75 transition-colors hover:text-primary"
                        >
                          {phone}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className={CARD}>
              <div className="flex items-start gap-3">
                <span className={ICON_TILE}>
                  <Mail aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-tertiary">Email</h2>
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="mt-1 block text-sm text-tertiary/75 transition-colors hover:text-primary"
                  >
                    {CONTACT.email}
                  </a>
                </div>
              </div>
            </div>

            <div className={CARD}>
              <div className="flex items-start gap-3">
                <span className={ICON_TILE}>
                  <Clock aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-tertiary">
                    Support hours
                  </h2>
                  <p className="mt-1 text-sm text-tertiary/65">
                    Monday to Saturday, 9:00 AM to 7:00 PM
                  </p>
                  <p className="text-xs text-tertiary/50">
                    Messages sent outside these hours are answered next morning.
                  </p>
                </div>
              </div>
            </div>

            <div className="feature-card rounded-2xl border border-primary/25 p-5">
              <h2 className="text-base font-semibold text-tertiary">
                Looking for a quick answer?
              </h2>
              <p className="mt-1 text-sm text-tertiary/65">
                Most questions about bookings, refunds and memberships are
                answered in our Help Center.
              </p>
              <Link
                href="/support"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-75"
              >
                Visit the Help Center
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ContactPage;
