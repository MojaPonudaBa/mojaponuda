import * as React from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { BIH_REGION_GROUPS, expandSelectedRegions, getRegionSelectionLabels } from "@/lib/constants/regions"
import { Check, ChevronsUpDown, Minus, X } from "lucide-react"
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
  const expandedSelectedRegions = React.useMemo(
    () => expandSelectedRegions(selectedRegions),
    [selectedRegions]
  )
  const selectionLabels = React.useMemo(
    () => getRegionSelectionLabels(selectedRegions),
    [selectedRegions]
  )

  const toggleMunicipality = (region: string) => {
    if (expandedSelectedRegions.includes(region)) {
      onChange(expandedSelectedRegions.filter((r) => r !== region))
    } else {
      onChange([...expandedSelectedRegions, region])
    }
  }

  const toggleParentRegion = (municipalities: string[]) => {
    const isWholeGroupSelected = municipalities.every((municipality) => expandedSelectedRegions.includes(municipality))

    if (isWholeGroupSelected) {
      onChange(expandedSelectedRegions.filter((region) => !municipalities.includes(region)))
      return
    }

    onChange([...new Set([...expandedSelectedRegions, ...municipalities])])
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
            {selectionLabels.length > 0 ? (
              selectionLabels.map((region) => (
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
                        const group = BIH_REGION_GROUPS.find((item) => item.parentRegion === region)
                        if (group?.parentRegion) {
                          toggleParentRegion(group.municipalities)
                        } else {
                          toggleMunicipality(region)
                        }
                        e.stopPropagation()
                      }
                    }}
                    onClick={(e) => {
                      const group = BIH_REGION_GROUPS.find((item) => item.parentRegion === region)
                      if (group?.parentRegion) {
                        toggleParentRegion(group.municipalities)
                      } else {
                        toggleMunicipality(region)
                      }
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
                {group.parentRegion ? (
                  <CommandItem
                    key={group.parentRegion}
                    onSelect={() => {
                      toggleParentRegion(group.municipalities)
                    }}
                    className="cursor-pointer font-semibold text-slate-900"
                  >
                    {group.municipalities.every((municipality) => expandedSelectedRegions.includes(municipality)) ? (
                      <Check className="mr-2 size-4 text-blue-600" />
                    ) : group.municipalities.some((municipality) => expandedSelectedRegions.includes(municipality)) ? (
                      <Minus className="mr-2 size-4 text-blue-600" />
                    ) : (
                      <Check className="mr-2 size-4 opacity-0" />
                    )}
                    {group.parentRegion}
                    <span className="ml-2 text-xs font-normal text-slate-500">označi cijeli kanton</span>
                  </CommandItem>
                ) : null}
                {group.municipalities.map((region) => (
                  <CommandItem
                    key={region}
                    onSelect={() => {
                      toggleMunicipality(region)
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        expandedSelectedRegions.includes(region) ? "opacity-100 text-blue-600" : "opacity-0"
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
