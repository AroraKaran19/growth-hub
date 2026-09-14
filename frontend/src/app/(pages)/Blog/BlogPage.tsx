import PageHero from "@/app/components/shared/PageHero";
import { CONTAINER } from "@/utils/layout";
import BlogBrowser from "./components/BlogBrowser";

const BlogPage = () => {
  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="Ideas for working better"
        description="Guides to choosing a workspace, habits for productive days, and notes on Bangalore's coworking neighbourhoods."
      />
      <section className="bg-surface py-14 lg:py-20">
        <div className={CONTAINER}>
          <BlogBrowser />
        </div>
      </section>
    </>
  );
};

export default BlogPage;
