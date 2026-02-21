"use client";
import { Label } from "@/components/ui/label";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarInput,
} from "@/components/ui/sidebar";
import { SearchIcon } from "lucide-react";

export function SearchForm({
	placeholder,
	inputName = "q",
	defaultValue,
	inputProps,
	...props
}: React.ComponentProps<"form"> & {
	placeholder?: string;
	inputName?: string;
	defaultValue?: string;
	inputProps?: React.ComponentProps<"input">;
}) {
	return (
		<form {...props}>
			<SidebarGroup className="py-0">
				<SidebarGroupContent className="relative">
					<Label htmlFor="search" className="sr-only">
						Search
					</Label>
					<SidebarInput
						id="search"
						name={inputName}
						defaultValue={defaultValue}
						{...inputProps}
						placeholder={placeholder || "Search the docs..."}
						className="pl-8"
					/>
					<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
				</SidebarGroupContent>
			</SidebarGroup>
		</form>
	);
}
