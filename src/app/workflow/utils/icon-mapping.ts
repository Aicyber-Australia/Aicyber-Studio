import {
  Rocket,
  Spline,
  Split,
  Merge,
  CheckCheck,
  Ban,
  FileText,
  Image,
  Images,
  Video,
  Layers,
  Pencil,
  Clapperboard,
  FileImage,
  FileVideo,
  ListVideo,
  NotebookText,
  Workflow,
  SquareMousePointer,
  Boxes,
  // Import other icons as needed
} from 'lucide-react';

export const iconMapping: Record<
  string,
  React.FC<React.SVGProps<SVGSVGElement>>
> = {
  Rocket: Rocket,
  Spline: Spline,
  Split: Split,
  Merge: Merge,
  CheckCheck: CheckCheck,
  Ban: Ban,
  FileText: FileText,
  Image: Image,
  Images: Images,
  Video: Video,
  Layers: Layers,
  Pencil: Pencil,
  Clapperboard: Clapperboard,
  FileImage: FileImage,
  FileVideo: FileVideo,
  ListVideo: ListVideo,
  NotebookText: NotebookText,
  Workflow: Workflow,
  SquareMousePointer: SquareMousePointer,
  Boxes: Boxes,
  Media: Images, // Use Images as fallback for Media
  // Add other mappings here
};
