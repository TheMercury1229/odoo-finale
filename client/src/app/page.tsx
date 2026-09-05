"use client";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { toast } from "@/components/ui/toast";

export default function Home() {
  const handleClick = () => {
    toast.add({
      type: "success",
      title: "Hello World",
    });
  };
  return (
    <div>
      <Button onClick={() => handleClick()}>Hello</Button>
      <ModeToggle />
    </div>
  );
}
