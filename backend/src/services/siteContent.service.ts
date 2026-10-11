import { AppError } from "../middlewares/error.middleware";
import { HomeSection, Testimonial, type HomeSectionDoc, type TestimonialDoc } from "../models";
import type { HomeSection as HomeSectionKey, TestimonialInput } from "../validators/site";

type Byline = { id: string; name: string };

/** Only edited sections; the site fills the rest with its built-in copy. */
export const homeSections = async () => {
  const rows = await HomeSection.find().lean<HomeSectionDoc[]>();
  return { sections: Object.fromEntries(rows.map((row) => [row.section, row.value])) };
};

export const saveHomeSection = async (section: HomeSectionKey, value: Record<string, unknown>, by: Byline) => {
  await HomeSection.updateOne({ section }, { $set: { value, updatedBy: by } }, { upsert: true });
  return homeSections();
};

export const resetHomeSection = async (section: HomeSectionKey) => {
  await HomeSection.deleteOne({ section });
  return homeSections();
};

const notFound = () => new AppError("That testimonial no longer exists.", 404, "TESTIMONIAL_NOT_FOUND");

const toView = (item: TestimonialDoc) => ({
  id: item._id.toString(),
  quote: item.quote,
  name: item.name,
  role: item.role,
  photo: item.photo ?? null,
  visible: item.visible,
});

export const listTestimonials = async (onlyVisible: boolean) =>
  (await Testimonial.find(onlyVisible ? { visible: true } : {}).sort({ sortOrder: 1, createdAt: 1 }).lean<TestimonialDoc[]>()).map(toView);

export const createTestimonial = async (input: TestimonialInput) => {
  const last = await Testimonial.findOne().sort({ sortOrder: -1 }).lean<TestimonialDoc>();
  const created = await Testimonial.create({ ...input, sortOrder: (last?.sortOrder ?? -1) + 1 });
  return toView(created.toObject());
};

export const updateTestimonial = async (id: string, input: TestimonialInput) => {
  const updated = /^[a-f0-9]{24}$/.test(id)
    ? await Testimonial.findByIdAndUpdate(id, { $set: input }, { returnDocument: "after" }).lean<TestimonialDoc>()
    : null;
  if (!updated) throw notFound();
  return toView(updated);
};

export const deleteTestimonial = async (id: string) => {
  const removed = /^[a-f0-9]{24}$/.test(id) ? await Testimonial.findByIdAndDelete(id) : null;
  if (!removed) throw notFound();
};

/** Ids missing from the list keep their place after the listed ones. */
export const reorderTestimonials = async (ids: string[]) => {
  await Testimonial.bulkWrite(ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } } })));
  return listTestimonials(false);
};
