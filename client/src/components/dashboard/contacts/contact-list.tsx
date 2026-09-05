import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Mail, Phone } from "lucide-react";

import type { Contact } from "@/components/dashboard/contacts/contacts-api";
import { ContactAvatar } from "@/components/dashboard/contacts/contact-avatar";
import { contactTypeLabels } from "@/components/dashboard/contacts/contact-utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContactListProps {
  contacts: Contact[];
}

export function ContactList({ contacts }: ContactListProps) {
  const router = useRouter();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox aria-label="Select all contacts" />
          </TableHead>
          <TableHead className="w-14">Image</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((contact) => (
          <TableRow
            key={contact.id}
            className="cursor-pointer"
            tabIndex={0}
            onClick={() => router.push(`/contacts/${contact.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(`/contacts/${contact.id}`);
              }
            }}
          >
            <TableCell onClick={(event) => event.stopPropagation()}>
              <Checkbox aria-label={`Select ${contact.name}`} />
            </TableCell>
            <TableCell>
              <Link
                href={`/contacts/${contact.id}`}
                aria-label={`Open ${contact.name}`}
              >
                <ContactAvatar
                  name={contact.name}
                  imageUrl={contact.profileImageUrl}
                  size="sm"
                />
              </Link>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Link
                  href={`/contacts/${contact.id}`}
                  className="font-medium hover:underline"
                >
                  {contact.name}
                </Link>
                {contact.isArchived ? (
                  <Badge
                    variant="destructive"
                    className="gap-1 text-[10px] leading-none"
                  >
                    <Archive className="size-2.5" />
                    Archived
                  </Badge>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-xs capitalize">
                {contactTypeLabels[contact.type]}
              </Badge>
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4" />
                {contact.email || "-"}
              </span>
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4" />
                {contact.mobile || "-"}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
