import CategoryCarousel from "../components/CategoryCarousel";

const WorkspaceCategoriesSection = () => {
  return (
    <section className="bg-secondary py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-tertiary sm:text-4xl lg:text-[40px]">
            Workspace Categories
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-tertiary/70 text-pretty">
            Experience a smarter way to book coworking spaces with a seamless,
            real-time booking journey designed for modern professionals.
          </p>
        </div>

        <div className="mt-10 lg:mt-14">
          <CategoryCarousel />
        </div>
      </div>
    </section>
  );
};

export default WorkspaceCategoriesSection;
