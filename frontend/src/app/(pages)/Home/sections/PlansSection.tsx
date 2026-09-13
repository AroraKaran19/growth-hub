import { PLANS } from "@/data/plans";
import PlanCard from "../components/PlanCard";

const PlansSection = () => {
  return (
    <section className="bg-secondary py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-tertiary sm:text-4xl lg:text-[40px]">
            Choose the way you want to work
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-tertiary/70 text-pretty">
            Flexible workspace bookings, meeting spaces, and memberships
            designed around your schedule.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3 lg:mt-14">
          {PLANS.map((plan) => (
            <PlanCard key={plan.number} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlansSection;
