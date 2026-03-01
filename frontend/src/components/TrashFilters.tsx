import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { Principal } from '@icp-sdk/core/principal';
import type { TrashMetadata } from '../backend';

interface TrashFiltersProps {
  trashData: TrashMetadata[];
  onFilteredDataChange: (data: TrashMetadata[]) => void;
  isAdmin: boolean;
  onOwnerFilterChange?: (owner: Principal | null) => void;
}

export default function TrashFilters({
  trashData,
  onFilteredDataChange,
  isAdmin,
  onOwnerFilterChange,
}: TrashFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fileType, setFileType] = useState<string>('all');
  const [ownerString, setOwnerString] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [originalPath, setOriginalPath] = useState('');

  useEffect(() => {
    let filtered = trashData;

    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.metadata.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (fileType !== 'all') {
      filtered = filtered.filter((item) => {
        const extension = item.metadata.name.split('.').pop()?.toLowerCase() || '';
        switch (fileType) {
          case 'document':
            return ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension);
          case 'image':
            return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension);
          case 'video':
            return ['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(extension);
          case 'audio':
            return ['mp3', 'wav', 'ogg', 'flac'].includes(extension);
          default:
            return true;
        }
      });
    }

    if (ownerString !== 'all' && isAdmin) {
      filtered = filtered.filter((item) => item.metadata.owner.toString() === ownerString);
    }

    if (originalPath) {
      filtered = filtered.filter((item) =>
        item.originalPath.toLowerCase().includes(originalPath.toLowerCase())
      );
    }

    onFilteredDataChange(filtered);
  }, [searchTerm, fileType, ownerString, dateRange, originalPath, trashData, isAdmin, onFilteredDataChange]);

  const handleOwnerChange = (value: string) => {
    setOwnerString(value);
    if (onOwnerFilterChange) {
      if (value === 'all') {
        onOwnerFilterChange(null);
      } else {
        try {
          const principal = Principal.fromText(value);
          onOwnerFilterChange(principal);
        } catch (error) {
          onOwnerFilterChange(null);
        }
      }
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFileType('all');
    setOwnerString('all');
    setDateRange({});
    setOriginalPath('');
    if (onOwnerFilterChange) {
      onOwnerFilterChange(null);
    }
  };

  const uniqueOwners = Array.from(
    new Set(trashData.map((item) => item.metadata.owner.toString()))
  );

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          placeholder="Search by filename..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <Select value={fileType} onValueChange={setFileType}>
          <SelectTrigger>
            <SelectValue placeholder="File type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
          </SelectContent>
        </Select>

        {isAdmin && (
          <Select value={ownerString} onValueChange={handleOwnerChange}>
            <SelectTrigger>
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {uniqueOwners.map((ownerPrincipal) => (
                <SelectItem key={ownerPrincipal} value={ownerPrincipal}>
                  {ownerPrincipal.slice(0, 8)}...
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          placeholder="Original path..."
          value={originalPath}
          onChange={(e) => setOriginalPath(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {(searchTerm || fileType !== 'all' || ownerString !== 'all' || dateRange.from || originalPath) && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
