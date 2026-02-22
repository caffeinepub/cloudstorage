import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useCreateFolder } from '../hooks/useFolderQueries';
import { toast } from 'sonner';
import { Principal } from '@dfinity/principal';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolderId: string | null;
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#84cc16', '#10b981', '#14b8a6', '#06b6d4',
];

export default function CreateFolderDialog({ open, onOpenChange, parentFolderId }: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [collaborators, setCollaborators] = useState<Principal[]>([]);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const createFolder = useCreateFolder();

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Folder name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Folder name must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddCollaborator = () => {
    if (!collaboratorInput.trim()) return;

    try {
      const principal = Principal.fromText(collaboratorInput.trim());
      if (!collaborators.some((c) => c.toString() === principal.toString())) {
        setCollaborators([...collaborators, principal]);
      }
      setCollaboratorInput('');
      setErrors({ ...errors, collaborator: '' });
    } catch (error) {
      setErrors({ ...errors, collaborator: 'Invalid Principal ID' });
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await createFolder.mutateAsync({
        name: name.trim(),
        parentFolderId,
        isPublic,
        collaborators,
        color: selectedColor,
        tags,
        description: description.trim(),
      });

      toast.success('Folder created successfully');
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create folder');
    }
  };

  const resetForm = () => {
    setName('');
    setIsPublic(false);
    setCollaborators([]);
    setCollaboratorInput('');
    setSelectedColor(PRESET_COLORS[0]);
    setTags([]);
    setTagInput('');
    setDescription('');
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Folder Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="public">Public Folder</Label>
              <p className="text-sm text-muted-foreground">Allow anyone to view this folder</p>
            </div>
            <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div>
            <Label>Collaborators</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={collaboratorInput}
                onChange={(e) => setCollaboratorInput(e.target.value)}
                placeholder="Enter Principal ID"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCollaborator()}
                className={errors.collaborator ? 'border-destructive' : ''}
              />
              <Button type="button" onClick={handleAddCollaborator} variant="secondary">
                Add
              </Button>
            </div>
            {errors.collaborator && <p className="text-sm text-destructive mt-1">{errors.collaborator}</p>}
            {collaborators.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {collaborators.map((collab) => (
                  <Badge key={collab.toString()} variant="secondary" className="gap-1">
                    {collab.toString().slice(0, 8)}...
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setCollaborators(collaborators.filter((c) => c !== collab))}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Folder Color</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === color ? 'border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tags"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button type="button" onClick={handleAddTag} variant="secondary">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createFolder.isPending}>
            {createFolder.isPending ? 'Creating...' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
