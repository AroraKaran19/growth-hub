import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import Logo from "@/app/components/ui/Logo";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
} from "@/app/components/ui/icons/SocialIcons";
import { CONTACT, FOOTER_COLUMNS, SOCIAL_LINKS } from "@/data/footer";

const SOCIAL_ICONS = {
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
  LinkedIn: LinkedinIcon,
};

const CONTACT_ROW = "flex items-start gap-2.5 text-sm text-tertiary/70";
const CONTACT_ICON = "mt-0.5 size-3.5 shrink-0 text-tertiary/50";

const Footer = () => {
  return (
    <footer className="border-t border-tertiary/10 bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.6fr] lg:gap-8">
          <div>
            <Link href="/" aria-label="Growth Hub home" draggable={false}>
              <Logo className="h-14 w-auto text-tertiary" />
            </Link>
            <p className="mt-5 max-w-70 text-sm leading-relaxed text-tertiary/70">
              Premium coworking spaces, meeting rooms, and private offices
              across Bangalore.
            </p>
            <ul className="mt-6 flex items-center gap-2.5">
              {SOCIAL_LINKS.map((social) => {
                const Icon = SOCIAL_ICONS[social.label];

                return (
                  <li key={social.label}>
                    <Link
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="flex size-8 items-center justify-center rounded-full bg-tertiary/6 text-tertiary/70 transition-colors hover:bg-tertiary/10 hover:text-tertiary"
                    >
                      <Icon className="size-3.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-tertiary">
                {column.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-tertiary/70 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-semibold text-tertiary">
              Contact us
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li className={CONTACT_ROW}>
                <MapPin aria-hidden="true" className={CONTACT_ICON} />
                <span className="leading-relaxed">{CONTACT.address}</span>
              </li>
              <li className={CONTACT_ROW}>
                <Phone aria-hidden="true" className={CONTACT_ICON} />
                <span>
                  {CONTACT.phones.map((phone, index) => (
                    <span key={phone}>
                      {index > 0 && ", "}
                      <a
                        href={`tel:${phone.replace(/\s/g, "")}`}
                        className="transition-colors hover:text-primary"
                      >
                        {phone}
                      </a>
                    </span>
                  ))}
                </span>
              </li>
              <li className={CONTACT_ROW}>
                <Mail aria-hidden="true" className={CONTACT_ICON} />
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="transition-colors hover:text-primary"
                >
                  {CONTACT.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-tertiary/10 pt-6 text-center text-sm text-tertiary/60">
          &copy; {new Date().getFullYear()} Growth Hub
          <span className="mx-2 text-tertiary/30" aria-hidden="true">·</span>
          GSTIN 29IYIPS1653H1ZT
        </div>
      </div>
    </footer>
  );
};

export default Footer;
