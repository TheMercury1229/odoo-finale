import Link from "next/link";
import { Archive, Mail, Phone, Users } from "lucide-react";

import type { Contact } from "@/components/dashboard/contacts/contacts-api";
import { ContactAvatar } from "@/components/dashboard/contacts/contact-avatar";
import { contactTypeLabels } from "@/components/dashboard/contacts/contact-utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ContactKanbanProps {
  contacts: Contact[];
}

export function ContactKanban({ contacts }: ContactKanbanProps) {
  const groups = (["customer", "vendor", "both"] as const).map((type) => ({
    type,
    title: contactTypeLabels[type],
    contacts: contacts.filter((contact) => contact.type === type),
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {groups.map((group) => (
        <section
          key={group.type}
          className="min-w-0 rounded-xl border border-border/50 bg-muted/30 p-3"
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">{group.title}</h2>
            <Badge variant="secondary" className="text-xs">
              {group.contacts.length}
            </Badge>
          </div>

          {group.contacts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/40 py-8 text-center">
              <Users className="size-5 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">
                No {group.title.toLowerCase()} contacts
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {group.contacts.map((contact) => (
                <Link key={contact.id} href={`/contacts/${contact.id}`}>
                  <Card className="transition-shadow hover:shadow-md hover:bg-muted/60">
                    <CardHeader className="flex flex-row items-center gap-3">
                      <ContactAvatar
                        name={contact.name}
                        imageUrl={contact.profileImageUrl}
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <CardTitle className="truncate">
                          {contact.name}
                        </CardTitle>
                        {contact.isArchived ? (
                          <Badge
                            variant="destructive"
                            className="mt-1 w-fit gap-1 text-[10px] leading-none"
                          >
                            <Archive className="size-2.5" />
                            Archived
                          </Badge>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex min-w-0 items-center gap-2 truncate">
                        <Mail className="size-4 shrink-0" />
                        {contact.email || "-"}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Phone className="size-4 shrink-0" />
                        {contact.mobile || "-"}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
