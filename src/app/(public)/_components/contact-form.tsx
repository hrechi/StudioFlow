"use client";

import { Send } from "lucide-react";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Landing page contact form (sending will be wired later: email / notifications). */
export function ContactForm() {
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        comingSoon("Send the message to the studio");
      }}
    >
      <FormField id="contact-nom" label="Full name" required>
        <Input id="contact-nom" autoComplete="name" className="h-11 bg-white" />
      </FormField>
      <FormField id="contact-email" label="Email" required>
        <Input id="contact-email" type="email" autoComplete="email" className="h-11 bg-white" />
      </FormField>
      <FormField id="contact-message" label="Your shoot" required className="sm:col-span-2">
        <Textarea
          id="contact-message"
          rows={5}
          placeholder="Session type, preferred date, location…"
          className="bg-white"
        />
      </FormField>
      <Button type="submit" size="lg" className="sm:col-span-2 sm:justify-self-start">
        <Send aria-hidden />
        Send message
      </Button>
    </form>
  );
}
