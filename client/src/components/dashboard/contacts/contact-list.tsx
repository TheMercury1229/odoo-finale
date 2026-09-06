"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Send,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Contact } from "@/components/dashboard/contacts/contacts-api";
import { inviteContact } from "@/components/dashboard/contacts/contacts-api";
import { ContactAvatar } from "@/components/dashboard/contacts/contact-avatar";
import { contactTypeLabels } from "@/components/dashboard/contacts/contact-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

interface ContactListProps {
  contacts: Contact[];
}

export function ContactList({ contacts }: ContactListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: (contactId: string) => inviteContact(contactId),
    onMutate: (contactId) => {
      setInvitingId(contactId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.add({
        type: "success",
        title: "Invitation sent",
        description: data.message || "Invitation email dispatched to contact.",
      });
    },
    onError: (error: any) => {
      toast.add({
        type: "error",
        title: "Failed to send invitation",
        description:
          error?.response?.data?.error ||
          "Could not send invitation. Please try again.",
      });
    },
    onSettled: () => {
      setInvitingId(null);
    },
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox aria-label="Select all contacts" />
          </TableHead>
          <TableHead className="w-12">Image</TableHead>
          <TableHead className="min-w-[150px]">Name</TableHead>
          <TableHead className="w-24">Type</TableHead>
          <TableHead className="max-w-[180px]">Email</TableHead>
          <TableHead className="max-w-[140px]">Phone</TableHead>
          <TableHead className="w-36">Portal Access</TableHead>
          <TableHead className="w-32 text-right">Actions</TableHead>
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

            <TableCell className="min-w-[150px]">
              <div className="flex items-center gap-2">
                <Link
                  href={`/contacts/${contact.id}`}
                  className="font-medium hover:underline truncate"
                >
                  {contact.name}
                </Link>
                {contact.isArchived ? (
                  <Badge
                    variant="destructive"
                    className="shrink-0 gap-1 text-[10px] leading-none"
                  >
                    <Archive className="size-2.5" />
                    Archived
                  </Badge>
                ) : null}
              </div>
            </TableCell>

            <TableCell className="w-24">
              <Badge variant="secondary" className="text-xs capitalize">
                {contactTypeLabels[contact.type]}
              </Badge>
            </TableCell>

            <TableCell className="max-w-[180px]">
              {contact.email ? (
                <span
                  className="inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground truncate"
                  title={contact.email}
                >
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </TableCell>

            <TableCell className="max-w-[140px]">
              {contact.mobile ? (
                <span
                  className="inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground truncate"
                  title={contact.mobile}
                >
                  <Phone className="size-3.5 shrink-0" />
                  <span className="truncate">{contact.mobile}</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </TableCell>

            <TableCell onClick={(e) => e.stopPropagation()}>
              {contact.userId ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[11px] font-normal text-emerald-700 dark:text-emerald-300"
                >
                  <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                  Active
                </Badge>
              ) : contact.portalStatus === "pending" ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/30 bg-amber-500/10 text-[11px] font-normal text-amber-700 dark:text-amber-300"
                >
                  <Clock className="size-3 text-amber-600 dark:text-amber-400" />
                  Invite Pending
                </Badge>
              ) : contact.email ? (
                <Badge
                  variant="outline"
                  className="text-[11px] font-normal text-muted-foreground"
                >
                  Not Invited
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </TableCell>

            <TableCell
              className="text-right"
              onClick={(e) => e.stopPropagation()}
            >
              {contact.isArchived ? (
                <span className="text-xs text-muted-foreground">Archived</span>
              ) : contact.portalStatus === "pending" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 border-amber-500/40 bg-amber-500/10 px-2.5 text-xs font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                  onClick={() => inviteMutation.mutate(contact.id)}
                  disabled={invitingId === contact.id}
                  title="Resend invitation email"
                >
                  <Send className="size-3 shrink-0" />
                  {invitingId === contact.id ? "Sending..." : "Resend"}
                </Button>
              ) : !contact.userId && contact.email ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2.5 text-xs font-medium text-primary hover:bg-primary/10"
                  onClick={() => inviteMutation.mutate(contact.id)}
                  disabled={invitingId === contact.id}
                  title="Send portal invitation email"
                >
                  <Send className="size-3 shrink-0" />
                  {invitingId === contact.id ? "Sending..." : "Invite"}
                </Button>
              ) : contact.userId ? (
                <span className="inline-flex items-center justify-end gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  Portal Active
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  No email
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
