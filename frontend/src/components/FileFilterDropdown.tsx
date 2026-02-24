import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import type { FileFilters } from '../hooks/useFileFilters';

interface FileFilterDropdownProps {
  filters: FileFilters;
  onNameFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onDateRangeChange: (start: number | null, end: number | null) => void;
  onSizeRangeChange: (min: number | null, max: number | null) => void;
  onClearAll: () => void;
  activeFilterCount: number;
}

export default function FileFilterDropdown({
  filters,
  onNameFilterChange,
  onTypeFilterChange,
  onDateRangeChange,
  onSizeRangeChange,
  onClearAll,
  activeFilterCount,
}: FileFilterDropdownProps) {
  const handleDateStartChange = (value: string) => {
    const timestamp = value ? new Date(value).getTime() : null;
    onDateRangeChange(timestamp, filters.dateRange.end);
  };

  const handleDateEndChange = (value: string) => {
    const timestamp = value ? new Date(value).getTime() : null;
    onDateRangeChange(filters.dateRange.start, timestamp);
  };

  const handleSizeMinChange = (value: string) => {
    const bytes = value ? parseFloat(value) * 1024 * 1024 : null; // Convert MB to bytes
    onSizeRangeChange(bytes, filters.sizeRange.max);
  };

  const handleSizeMaxChange = (value: string) => {
    const bytes = value ? parseFloat(value) * 1024 * 1024 : null; // Convert MB to bytes
    onSizeRangeChange(filters.sizeRange.min, bytes);
  };

  const formatDateForInput = (timestamp: number | null): string => {
    if (!timestamp) return '';
    return new Date(timestamp).toISOString().split('T')[0];
  };

  const formatSizeForInput = (bytes: number | null): string => {
    if (!bytes) return '';
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Filter Files</span>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 px-2">
              Clear All
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="p-3 space-y-4">
          {/* Name Filter */}
          <div className="space-y-2">
            <Label htmlFor="name-filter" className="text-xs font-medium">
              File Name
            </Label>
            <div className="relative">
              <Input
                id="name-filter"
                type="text"
                placeholder="Search by name..."
                value={filters.nameFilter}
                onChange={(e) => onNameFilterChange(e.target.value)}
                className="h-8"
              />
              {filters.nameFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-8 w-8"
                  onClick={() => onNameFilterChange('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="type-filter" className="text-xs font-medium">
              File Type
            </Label>
            <Select value={filters.typeFilter} onValueChange={onTypeFilterChange}>
              <SelectTrigger id="type-filter" className="h-8">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="date-start" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Input
                  id="date-start"
                  type="date"
                  value={formatDateForInput(filters.dateRange.start)}
                  onChange={(e) => handleDateStartChange(e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="date-end" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Input
                  id="date-end"
                  type="date"
                  value={formatDateForInput(filters.dateRange.end)}
                  onChange={(e) => handleDateEndChange(e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
          </div>

          {/* Size Range Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">File Size (MB)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="size-min" className="text-xs text-muted-foreground">
                  Min
                </Label>
                <Input
                  id="size-min"
                  type="number"
                  placeholder="0"
                  step="0.1"
                  min="0"
                  value={formatSizeForInput(filters.sizeRange.min)}
                  onChange={(e) => handleSizeMinChange(e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="size-max" className="text-xs text-muted-foreground">
                  Max
                </Label>
                <Input
                  id="size-max"
                  type="number"
                  placeholder="∞"
                  step="0.1"
                  min="0"
                  value={formatSizeForInput(filters.sizeRange.max)}
                  onChange={(e) => handleSizeMaxChange(e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
