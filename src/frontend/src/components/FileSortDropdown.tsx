import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react';
import type { SortBy, SortOrder } from '../hooks/useFileSorting';

interface FileSortDropdownProps {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (option: SortBy) => void;
}

export default function FileSortDropdown({ sortBy, sortOrder, onSortChange }: FileSortDropdownProps) {
  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'name', label: 'Name' },
    { value: 'date', label: 'Date' },
    { value: 'size', label: 'Size' },
    { value: 'type', label: 'Type' },
  ];

  const getSortIcon = (option: SortBy) => {
    if (sortBy !== option) return null;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-auto" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-auto" />
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Sort
          {sortBy && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({sortOptions.find((opt) => opt.value === sortBy)?.label})
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onSortChange(option.value)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{option.label}</span>
            <div className="flex items-center gap-1">
              {sortBy === option.value && <Check className="h-3 w-3" />}
              {getSortIcon(option.value)}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onSortChange('date')}
          className="cursor-pointer text-muted-foreground"
        >
          Reset to Default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
