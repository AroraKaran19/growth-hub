"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { CircleCheck } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { cn } from "@/utils";

export const CONTACT_TOPICS = [
  { value: "booking", label: "Help with a booking" },
  { value: "membership", label: "Memberships" },
  { value: "billing", label: "Payments and invoices" },
  { value: "partner", label: "List my space" },
  { value: "location", label: "Request a location" },
  { value: "other", label: "Something else" },
];

type Values = {
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
};

type Errors = Partial<Record<keyof Values, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_MESSAGE = 20;

const validate = (values: Values): Errors => {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = "Enter your name.";
  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address, like name@example.com.";
  }
  if (values.phone && values.phone.length !== 10) {
    errors.phone = "Enter a 10-digit mobile number, or leave it blank.";
  }
  if (!values.topic) errors.topic = "Choose what this is about.";
  if (values.message.trim().length < MIN_MESSAGE) {
    errors.message = `Tell us a little more (at least ${MIN_MESSAGE} characters).`;
  }
  return errors;
};

const INPUT =
  "w-full rounded-lg border bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const LABEL = "mb-1.5 block text-sm font-medium text-tertiary";

const ContactForm = () => {
  const searchParams = useSearchParams();
  const requestedTopic = searchParams.get("topic") ?? "";
  const area = searchParams.get("area");

  const [values, setValues] = useState<Values>(() => ({
    name: "",
    email: "",
    phone: "",
    topic: CONTACT_TOPICS.some((topic) => topic.value === requestedTopic)
      ? requestedTopic
      : "",
    message: area ? `I would like a Growth Hub workspace in ${area}. ` : "",
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [reference, setReference] = useState<string | null>(null);

  const set = (key: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    // MOCK: no enquiries API yet, so the message only gets a reference.
    setReference(`GH-${String(Date.now()).slice(-6)}`);
  };

  if (reference) {
    return (
      <div
        role="status"
        className="flex flex-col items-center rounded-2xl border border-tertiary/10 bg-secondary px-6 py-14 text-center"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-green-500/12 text-green-700">
          <CircleCheck aria-hidden="true" className="size-7" />
        </span>
        <h2 className="mt-5 text-xl font-bold text-tertiary">
          Thanks, {values.name.trim().split(" ")[0]}. Message received.
        </h2>
        <p className="mt-2 max-w-sm text-sm text-tertiary/65">
          We reply within one working day at {values.email.trim()}. Your
          reference is <span className="font-mono text-tertiary">{reference}</span>.
        </p>
        <button
          type="button"
          onClick={() => {
            setReference(null);
            setValues({ name: "", email: "", phone: "", topic: "", message: "" });
          }}
          className="mt-6 text-sm font-medium text-primary transition-opacity hover:opacity-75"
        >
          Send another message
        </button>
      </div>
    );
  }

  const fieldClass = (key: keyof Values) =>
    cn(INPUT, errors[key] ? "border-primary" : "border-tertiary/20 hover:border-tertiary/35");

  const errorText = (key: keyof Values) =>
    errors[key] && (
      <p id={`contact-${key}-error`} className="mt-1.5 text-sm text-primary">
        {errors[key]}
      </p>
    );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-tertiary/10 bg-secondary p-5 sm:p-8"
    >
      <h2 className="text-xl font-bold text-tertiary">Send us a message</h2>
      <p className="mt-1 text-sm text-tertiary/60">
        Every field is required except your phone number.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={LABEL}>
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            className={fieldClass("name")}
          />
          {errorText("name")}
        </div>

        <div>
          <label htmlFor="contact-email" className={LABEL}>
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Your email"
            value={values.email}
            onChange={(event) => set("email", event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            className={fieldClass("email")}
          />
          {errorText("email")}
        </div>

        <div>
          <label htmlFor="contact-phone" className={LABEL}>
            Mobile number
            <span className="ml-1.5 font-normal text-tertiary/45">(optional)</span>
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10-digit number"
            value={values.phone}
            onChange={(event) =>
              set("phone", event.target.value.replace(/\D/g, "").slice(0, 10))
            }
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "contact-phone-error" : undefined}
            className={fieldClass("phone")}
          />
          {errorText("phone")}
        </div>

        <div id="contact-topic" tabIndex={-1} className="outline-none">
          <SelectField
            label="Topic"
            value={values.topic}
            onChange={(value) => set("topic", value)}
            options={CONTACT_TOPICS}
            placeholder="Choose a topic"
          />
          {errorText("topic")}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className={LABEL}>
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={5}
            placeholder="How can we help?"
            value={values.message}
            onChange={(event) => set("message", event.target.value)}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
            className={cn(fieldClass("message"), "resize-y")}
          />
          {errorText("message")}
        </div>
      </div>

      <button
        type="submit"
        className="cta-gradient mt-6 w-full rounded-lg px-6 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 sm:w-auto"
      >
        Send message
      </button>
    </form>
  );
};

export default ContactForm;
