import { Router } from "express";
import {
  deleteHomeSection,
  getAdminTestimonials,
  getHomeContent,
  getPublicTestimonials,
  postTestimonial,
  putHomeSection,
  putTestimonial,
  putTestimonialOrder,
  removeTestimonial,
} from "../controllers/site.controller";
import { panelRateLimit, requireAuth, requirePermission } from "../middlewares";

export const publicSiteRoutes = Router();
publicSiteRoutes.get("/home", getHomeContent);
publicSiteRoutes.get("/testimonials", getPublicTestimonials);

const guarded = () => {
  const router = Router();
  router.use(requireAuth("admin"), panelRateLimit, requirePermission("settings"));
  return router;
};

export const adminSiteRoutes = guarded();
adminSiteRoutes.get("/home", getHomeContent);
adminSiteRoutes.put("/home/:section", putHomeSection);
adminSiteRoutes.delete("/home/:section", deleteHomeSection);

export const adminTestimonialRoutes = guarded();
adminTestimonialRoutes.get("/", getAdminTestimonials);
adminTestimonialRoutes.post("/", postTestimonial);
adminTestimonialRoutes.put("/order", putTestimonialOrder);
adminTestimonialRoutes.put("/:id", putTestimonial);
adminTestimonialRoutes.delete("/:id", removeTestimonial);
