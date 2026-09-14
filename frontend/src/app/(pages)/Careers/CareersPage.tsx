import { Check } from "lucide-react";
import PageHero from "@/app/components/shared/PageHero";
import SectionHeading from "@/app/components/shared/SectionHeading";
import { PERKS } from "@/data/careers";
import { CONTACT } from "@/data/footer";
import { cn } from "@/utils";
import { CONTAINER } from "@/utils/layout";
import RoleList from "./components/RoleList";

const CareersPage = () => {
  return (
    <>
      <PageHero
        eyebrow="Careers"
        title="Help Bangalore find better places to work"
        description="We are a small team building the marketplace for flexible workspaces. If you like hard problems, real customers and walking into the product every morning, come build with us."
      />

      <section className="bg-tertiary py-16 lg:py-24">
        <div className={CONTAINER}>
          <SectionHeading
            tone="dark"
            title="Why join us"
            description="Benefits that match the way we work."
          />
          <ul className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PERKS.map((perk) => (
              <li key={perk.title} className="feature-card flex flex-col rounded-2xl p-5">
                <span className="bg-icon-tile inline-flex size-10 items-center justify-center rounded-xl">
                  <Check aria-hidden="true" className="size-5 text-secondary" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-tertiary">
                  {perk.title}
                </h3>
                <p className="mt-1.5 text-sm text-tertiary/65">{perk.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-surface py-16 lg:py-24">
        <div className={cn(CONTAINER, "max-w-5xl 2xl:max-w-5xl")}>
          <SectionHeading
            align="left"
            title="Open roles"
            description="Choose a role to read more and apply."
          />
          <div className="mt-8">
            <RoleList />
          </div>
          <p className="mt-8 text-sm text-tertiary/60">
            Don&apos;t see your role? Write to{" "}
            <a
              href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Open application")}`}
              className="font-medium text-primary underline underline-offset-2"
            >
              {CONTACT.email}
            </a>{" "}
            and tell us how you would help.
          </p>
        </div>
      </section>
    </>
  );
};

export default CareersPage;
