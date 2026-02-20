import type { AllItemsViewProps } from "@/components/types";
import { SearchForm } from "@/components/search-form";
import { useState } from "react";

/**
 * Generic wrapper for "All Channels/Movies/Series" views.
 * Provides the header (icon + title + count) and a controlled search input,
 * then renders the virtualized list/grid via the render-prop `children`.
 */
export function AllItemsView({
  icon,
  title,
  itemCount,
  itemLabel,
  searchPlaceholder,
  renderContent,
}: AllItemsViewProps) {
  const [query, setQuery] = useState("");

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {itemCount} {itemLabel}
            </p>
          </div>
        </div>
        <SearchForm
          placeholder={searchPlaceholder}
          className="md:w-70 w-full"
          inputProps={{
            value: query,
            onChange: (event) => setQuery(event.target.value),
          }}
        />
      </div>
      {renderContent(query)}
    </div>
  );
}
