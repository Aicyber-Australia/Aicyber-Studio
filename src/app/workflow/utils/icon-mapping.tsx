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
  ImagePlay,
  ArrowRight,
  ArrowBigRightDash,
  ChevronRight,
  FilePen,
  // Import other icons as needed
} from 'lucide-react';
import React from 'react';

// Helper function to calculate size and create icon container
const createCompositeIcon = (
  leftIcon: React.ReactNode,
  rightIcon: React.ReactNode,
  props: React.HTMLAttributes<HTMLDivElement>
) => {
  const { className, style, ...rest } = props;
  
  // Tailwind size mapping: h-5 w-5 = 20px, size-6 = 24px, etc.
  const tailwindSizeMap: Record<number, number> = {
    3: 12,  // h-3 w-3
    4: 16,  // h-4 w-4
    5: 20,  // h-5 w-5
    6: 24,  // size-6 or h-6 w-6
    7: 28,  // h-7 w-7
    8: 32,  // h-8 w-8
  };
  
  // Extract size from className (e.g., "h-5 w-5" or "size-6")
  let size = 24; // Default to 24px
  if (className) {
    const sizeMatch = className.match(/(?:h-|w-|size-)(\d+)/);
    if (sizeMatch) {
      const tailwindSize = parseInt(sizeMatch[1]);
      size = tailwindSizeMap[tailwindSize] || tailwindSize * 4; // Default: multiply by 4 if not in map
      
      // For sidebar (size-6), use larger size
      if (tailwindSize === 6 && className.includes('size-6')) {
        size = 32; // Use size-8 equivalent for sidebar
      }
    }
  }
  
  const iconSize = Math.max(10, Math.floor(size * 0.55)); // Icon size relative to container
  const arrowSize = Math.max(8, Math.floor(size * 0.45)); // Arrow size
  
  return (
    <div 
      className={`${className || ''} flex items-center justify-center flex-shrink-0`}
      style={{ 
        position: 'relative', 
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible', // Allow icons to extend slightly beyond container
        ...style
      }}
      {...rest}
    >
      {leftIcon}
      <ChevronRight className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={arrowSize} style={{ opacity: 0.8 }} />
      {rightIcon}
    </div>
  );
};

// Text to Image composite icon
const TextToImageIcon: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => {
  const { className } = props;
  
  // Tailwind size mapping: h-5 w-5 = 20px, size-6 = 24px, etc.
  const tailwindSizeMap: Record<number, number> = {
    3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32,
  };
  
  let size = 24;
  if (className) {
    const sizeMatch = className.match(/(?:h-|w-|size-)(\d+)/);
    if (sizeMatch) {
      const tailwindSize = parseInt(sizeMatch[1]);
      size = tailwindSizeMap[tailwindSize] || tailwindSize * 4;
      if (tailwindSize === 6 && className.includes('size-6')) {
        size = 32;
      }
    }
  }
  
  const iconSize = Math.max(10, Math.floor(size * 0.55));
  
  return createCompositeIcon(
    <FileText className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" size={iconSize} style={{ left: '10%' }} />,
    <Image className="absolute top-1/2 -translate-y-1/2 translate-x-1/2" size={iconSize} style={{ right: '10%' }} />,
    props
  );
};

// Image to Image composite icon
const ImageToImageIcon: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => {
  const { className, style, ...rest } = props;
  
  const tailwindSizeMap: Record<number, number> = {
    3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32,
  };
  
  let size = 24;
  if (className) {
    const sizeMatch = className.match(/(?:h-|w-|size-)(\d+)/);
    if (sizeMatch) {
      const tailwindSize = parseInt(sizeMatch[1]);
      size = tailwindSizeMap[tailwindSize] || tailwindSize * 4;
      if (tailwindSize === 6 && className.includes('size-6')) {
        size = 32;
      }
    }
  }
  
  const iconSize = Math.max(10, Math.floor(size * 0.45)); // Smaller icons to fit vertically
  const arrowSize = Math.max(8, Math.floor(size * 0.45));
  
  return (
    <div 
      className={`${className || ''} flex items-center justify-center flex-shrink-0`}
      style={{ 
        position: 'relative', 
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        ...style
      }}
      {...rest}
    >
      {/* Left side: Image on top, Text below */}
      <div className="absolute left-[10%] top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
        <Image size={iconSize} />
        <FileText size={iconSize} />
      </div>
      
      {/* Middle: Arrow */}
      <ChevronRight className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={arrowSize} style={{ opacity: 0.8 }} />
      
      {/* Right side: Image */}
      <Image className="absolute top-1/2 -translate-y-1/2 translate-x-1/2" size={iconSize} style={{ right: '10%' }} />
    </div>
  );
};

// Image to Text composite icon
const ImageToTextIcon: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => {
  const { className } = props;
  
  const tailwindSizeMap: Record<number, number> = {
    3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32,
  };
  
  let size = 24;
  if (className) {
    const sizeMatch = className.match(/(?:h-|w-|size-)(\d+)/);
    if (sizeMatch) {
      const tailwindSize = parseInt(sizeMatch[1]);
      size = tailwindSizeMap[tailwindSize] || tailwindSize * 4;
      if (tailwindSize === 6 && className.includes('size-6')) {
        size = 32;
      }
    }
  }
  
  const iconSize = Math.max(10, Math.floor(size * 0.55));
  
  return createCompositeIcon(
    <Image className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" size={iconSize} style={{ left: '10%' }} />,
    <FileText className="absolute top-1/2 -translate-y-1/2 translate-x-1/2" size={iconSize} style={{ right: '10%' }} />,
    props
  );
};

export const iconMapping: Record<
  string,
  React.FC<any>
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
  ImagePlay: ImagePlay,
  TextToImage: TextToImageIcon,
  ImageToImage: ImageToImageIcon,
  ImageToText: ImageToTextIcon,
  FilePen: FilePen,
  // Add other mappings here
};

