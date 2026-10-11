import { Schema, model, type Types } from "mongoose";

export interface TestimonialDoc {
  _id: Types.ObjectId;
  quote: string;
  name: string;
  role: string;
  photo: { src: string; alt: string } | null;
  visible: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const testimonialSchema = new Schema<TestimonialDoc>(
  {
    quote: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: "" },
    photo: { type: new Schema({ src: String, alt: String }, { _id: false }), default: null },
    visible: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

testimonialSchema.index({ visible: 1, sortOrder: 1 });

export const Testimonial = model<TestimonialDoc>("Testimonial", testimonialSchema, "testimonials");
