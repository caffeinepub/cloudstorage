import React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import type { TrashMetadata } from '../hooks/useQueries';

interface TrashFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: {
    owner?: string;
    minSize?: number;
    maxSize?: number;
  };
  onFilterChange: (filters: TrashFiltersProps['filters']) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

export default function TrashFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  activeFilterCount,
}: TrashFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search trash..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs"
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Filters</h4>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-7 text-xs">
                  <X className="w-3 h-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Owner Principal</Label>
              <Input
                placeholder="Filter by owner..."
                value={filters.owner ?? ''}
                onChange={(e) =>
                  onFilterChange({ ...filters, owner: e.target.value || undefined })
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Min Size (KB)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minSize !== undefined ? filters.minSize / 1024 : ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      minSize: e.target.value ? Number(e.target.value) * 1024 : undefined,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Size (KB)</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={filters.maxSize !== undefined ? filters.maxSize / 1024 : ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      maxSize: e.target.value ? Number(e.target.value) * 1024 : undefined,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
