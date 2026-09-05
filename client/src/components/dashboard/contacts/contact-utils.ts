import type { Contact, ContactType } from "@/components/dashboard/contacts/contacts-api";

export const contactTypeLabels: Record<ContactType, string> = {
  customer: "Customer",
  vendor: "Vendor",
  both: "Both",
};

export function getContactInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getContactGroups(contacts: Contact[]) {
  return (["customer", "vendor", "both"] as ContactType[]).map((type) => ({
    type,
    title: contactTypeLabels[type],
    contacts: contacts.filter((contact) => contact.type === type),
  }));
}
