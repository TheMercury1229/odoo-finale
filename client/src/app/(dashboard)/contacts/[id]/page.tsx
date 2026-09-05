"use client";

import { useParams } from "next/navigation";

import { ContactForm } from "@/components/dashboard/contacts/contact-form";
import { useContact } from "@/components/dashboard/contacts/contacts-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function ContactDetailsPage() {
  const params = useParams<{ id: string }>();
  const contactQuery = useContact(params.id);

  if (contactQuery.isPending) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (contactQuery.isError || !contactQuery.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Unable to load this contact.
        </CardContent>
      </Card>
    );
  }

  return <ContactForm contact={contactQuery.data} />;
}
