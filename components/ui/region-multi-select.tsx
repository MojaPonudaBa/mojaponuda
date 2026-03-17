import * as React from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { BIH_REGION_GROUPS } from "@/lib/constants/regions"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function RegionMultiSelect({
  selectedRegions,
  onChange,
}: {
  selectedRegions: string[]
  onChange: (regions: string[]) => void
}) {
  const [open, setOpen] = React.useState(false)

  const toggleRegion = (region: string) => {
    if (selectedRegions.includes(region)) {
      onChange(selectedRegions.filter((r) => r !== region))
    } else {
      onChange([...selectedRegions, region])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 px-3 py-2 rounded-xl"
        >
          <div className="flex flex-wrap gap-1">
            {selectedRegions.length > 0 ? (
              selectedRegions.map((region) => (
                <div
                  key={region}
                  className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs"
                >
                  {region}
                  <div
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer hover:text-red-500 rounded-full"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        toggleRegion(region)
                        e.stopPropagation()
                      }
                    }}
                    onClick={(e) => {
                      toggleRegion(region)
                      e.stopPropagation()
                    }}
                  >
                    <X className="size-3" />
                  </div>
                </div>
              ))
            ) : (
              <span className="text-muted-foreground font-normal">Odaberite gradove, općine ili kantone...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[440px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pretraži grad, općinu ili kanton..." />
          <CommandList>
            <CommandEmpty>Regija nije pronađena.</CommandEmpty>
            {BIH_REGION_GROUPS.map((group) => (
              <CommandGroup key={group.label} heading={group.label} className="max-h-64 overflow-auto">
                {group.regions.map((region) => (
                  <CommandItem
                    key={region}
                    onSelect={() => {
                      toggleRegion(region)
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        selectedRegions.includes(region) ? "opacity-100 text-blue-600" : "opacity-0"
                      )}
                    />
                    {region}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
