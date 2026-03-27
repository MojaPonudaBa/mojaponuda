"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown } from "lucide-react";

interface ClientSelectorProps {
  clients: Array<{ id: string; name: string }>;
}

export function ClientSelector({ clients }: ClientSelectorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  function handleSelectClient(clientId: string) {
    setIsOpen(false);
    window.open(`/dashboard/client/${clientId}`, "_blank");
  }

  if (clients.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Building2 className="size-4" />
            Odaberi klijenta
          </span>
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        {clients.map((client) => (
          <DropdownMenuItem
            key={client.id}
            onClick={() => handleSelectClient(client.id)}
            className="cursor-pointer"
          >
            <Building2 className="mr-2 size-4" />
            {client.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
