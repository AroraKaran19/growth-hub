import type { Request, Response } from "express";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { notifyHomeChanged } from "../services/revalidate.service";
import {
  createTestimonial,
  deleteTestimonial,
  homeSections,
  listTestimonials,
  reorderTestimonials,
  resetHomeSection,
  saveHomeSection,
  updateTestimonial,
} from "../services/siteContent.service";
import { parseBody } from "../utils/validate";
import { HOME_SECTION_SCHEMAS, isHomeSection, testimonialOrderSchema, testimonialSchema } from "../validators/site";

const sectionOf = (req: Request) => {
  const section = String(req.params.section);
  if (!isHomeSection(section)) throw new AppError("That section doesn't exist.", 404, "SECTION_UNKNOWN");
  return section;
};

const bylineOf = (req: Request) => {
  const account = req.auth!.account;
  return { id: account.id, name: account.type === "admin" ? account.name : "" };
};

export const getHomeContent = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccessResponse(res, await homeSections(), "Home content");
});

export const putHomeSection = asyncHandler(async (req: Request, res: Response) => {
  const section = sectionOf(req);
  const value = parseBody(HOME_SECTION_SCHEMAS[section], req.body) as Record<string, unknown>;
  const saved = await saveHomeSection(section, value, bylineOf(req));
  notifyHomeChanged();
  sendSuccessResponse(res, saved, "Section saved");
});

export const deleteHomeSection = asyncHandler(async (req: Request, res: Response) => {
  const saved = await resetHomeSection(sectionOf(req));
  notifyHomeChanged();
  sendSuccessResponse(res, saved, "Section reset");
});

export const getPublicTestimonials = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccessResponse(res, { testimonials: await listTestimonials(true) }, "Testimonials");
});

export const getAdminTestimonials = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccessResponse(res, { testimonials: await listTestimonials(false) }, "Testimonials");
});

export const postTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const testimonial = await createTestimonial(parseBody(testimonialSchema, req.body));
  notifyHomeChanged();
  sendSuccessResponse(res, { testimonial }, "Testimonial added", 201);
});

export const putTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const testimonial = await updateTestimonial(String(req.params.id), parseBody(testimonialSchema, req.body));
  notifyHomeChanged();
  sendSuccessResponse(res, { testimonial }, "Testimonial saved");
});

export const removeTestimonial = asyncHandler(async (req: Request, res: Response) => {
  await deleteTestimonial(String(req.params.id));
  notifyHomeChanged();
  sendSuccessResponse(res, { deleted: true }, "Testimonial deleted");
});

export const putTestimonialOrder = asyncHandler(async (req: Request, res: Response) => {
  const testimonials = await reorderTestimonials(parseBody(testimonialOrderSchema, req.body).ids);
  notifyHomeChanged();
  sendSuccessResponse(res, { testimonials }, "Order saved");
});
