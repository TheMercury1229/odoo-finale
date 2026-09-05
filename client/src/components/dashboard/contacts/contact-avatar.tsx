import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getContactInitials } from "@/components/dashboard/contacts/contact-utils";

interface ContactAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: "default" | "sm" | "lg";
}

export function ContactAvatar({
  name,
  imageUrl,
  size = "default",
}: ContactAvatarProps) {
  return (
    <Avatar size={size}>
      <AvatarImage src={imageUrl || undefined} alt={name} />
      <AvatarFallback>{getContactInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
