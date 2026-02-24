import FileSearchInput from './FileSearchInput';
import FileFilterDropdown from './FileFilterDropdown';
import FileSortDropdown from './FileSortDropdown';
import { Button } from '@/components/ui/button';
import { Grid3x3, List } from 'lucide-react';
import type { FileFilters } from '../hooks/useFileFilters';
import type { SortBy, SortOrder } from '../hooks/useFileSorting';

interface FileToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: FileFilters;
  onNameFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onDateRangeChange: (start: number | null, end: number | null) => void;
  onSizeRangeChange: (min: number | null, max: number | null) => void;
  onClearAllFilters: () => void;
  activeFilterCount: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (option: SortBy) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export default function FileToolbar({
  searchQuery,
  onSearchChange,
  filters,
  onNameFilterChange,
  onTypeFilterChange,
  onDateRangeChange,
  onSizeRangeChange,
  onClearAllFilters,
  activeFilterCount,
  sortBy,
  sortOrder,
  onSortChange,
  viewMode,
  onViewModeChange,
}: FileToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
      <FileSearchInput value={searchQuery} onChange={onSearchChange} />
      
      <div className="flex items-center gap-2 ml-auto">
        <FileFilterDropdown
          filters={filters}
          onNameFilterChange={onNameFilterChange}
          onTypeFilterChange={onTypeFilterChange}
          onDateRangeChange={onDateRangeChange}
          onSizeRangeChange={onSizeRangeChange}
          onClearAll={onClearAllFilters}
          activeFilterCount={activeFilterCount}
        />
        
        <FileSortDropdown
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={onSortChange}
        />
        
        <div className="flex items-center gap-1 border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="rounded-r-none"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
