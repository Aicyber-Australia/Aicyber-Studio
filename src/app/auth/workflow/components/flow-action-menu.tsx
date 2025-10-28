import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppNodeType } from '@/app/workflow/components/nodes';
import { FileText, Image, Pencil, Video } from 'lucide-react';

export type ActionItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  nodeType: AppNodeType;
  disabled?: boolean;
  comingSoon?: boolean;
};

export function FlowActionMenu({
  onAddNode,
  actions,
}: {
  onAddNode: (type: AppNodeType) => void;
  actions: ActionItem[];
}) {
  return (
    <DropdownMenu open>
      <DropdownMenuTrigger />
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel className="font-bold">Actions</DropdownMenuLabel>
        {actions.map((action) => (
          <a
            key={action.id}
            onClick={() => !action.disabled && onAddNode(action.nodeType)}
          >
            <DropdownMenuItem
              className="flex items-center space-x-2"
              disabled={action.disabled}
            >
              {action.icon}
              <span>{action.label}</span>
              {action.comingSoon && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Coming Soon
                </span>
              )}
            </DropdownMenuItem>
          </a>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Predefined actions for image-frame
export const imageFrameActions: ActionItem[] = [
  {
    id: 'describe',
    label: 'Describe',
    icon: <FileText className="w-4 h-4" />,
    nodeType: 'image-to-text-node',
  },
  {
    id: 'image-to-image',
    label: 'Image to Image',
    icon: <Image className="w-4 h-4" />,
    nodeType: 'image-to-image-node',
  },
  {
    id: 'edit-image',
    label: 'Edit Image',
    icon: <Pencil className="w-4 h-4" />,
    nodeType: 'edit-image-node',
  },
  {
    id: 'image-to-video',
    label: 'Image to Video',
    icon: <Video className="w-4 h-4" />,
    nodeType: 'image-frame', // Placeholder, will be replaced when implemented
    disabled: true,
    comingSoon: true,
  },
];
