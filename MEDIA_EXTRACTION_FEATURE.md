# Media Extraction Feature

## Overview
This feature allows users to extract media data from completed action nodes and convert it into a standard media-set node format. This is useful for reusing generated media in other parts of the workflow.

## Implementation

### 1. Media Extraction Utility (`src/app/workflow/utils/media-extraction.ts`)
Created utility functions to handle media extraction:

- **`extractMediaFromActionNode(nodeData)`**: Extracts media data from an action node and converts it to the standard media-set format
  - Supports extraction from `media.mediaList` (unified format)
  - Supports extraction from individual lists (`imageList`, `videoList`, `textList`)
  - Returns `ExtractedMediaData` or `null` if no media available

- **`canExtractMedia(nodeData)`**: Checks if an action node has extractable media
  - Only returns `true` if node status is 'success'
  - Checks for presence of any media data

### 2. Action Node UI Update (`src/app/workflow/components/nodes/action-node/action-node-base.tsx`)
Added extraction functionality to the action node UI:

- **New Extract Button**: Added a download icon button in the node header
  - Button is positioned between the refresh and reset buttons
  - Icon is green when enabled, gray when disabled
  - Tooltip shows status: "Extract media to new node" or "Complete execution to extract media"

- **Button State Logic**:
  - Only enabled when `data.status === 'success'` and media data exists
  - Uses `canExtractMedia()` to determine if extraction is possible

- **Extract Handler (`handleExtractMedia`)**:
  1. Extracts media data using `extractMediaFromActionNode()`
  2. Gets current node position to calculate new node position
  3. Creates a new media-set node positioned 100px to the right
  4. Sets the new node with extracted media data
  5. Automatically adds the node to the workflow

### 3. New Node Properties
The created media-set node includes:
- **Title**: "Extracted Media (N)" where N is the count of media items
- **Status**: 'success' (pre-completed state)
- **Media Data**: All extracted media items in `media.mediaList` format
- **Output Mode**: 'integrated' (default for media-set nodes)

## Usage

### For Users:
1. Execute an action node (text-to-image, image-to-image, etc.)
2. Wait for the node to complete (status becomes 'success')
3. Click the download icon button in the action node header
4. A new media-set node will be created with all the extracted media
5. The new node can be connected to other nodes for further processing

### Media Data Structure
The extracted media follows the standard format:
```typescript
{
  mediaList: [
    {
      id: string,           // Unique identifier
      type: 'image' | 'text' | 'video',
      url?: string,         // For images/videos
      content?: string,     // For text
      fileName: string,
      timestamp: number
    }
  ]
}
```

## Benefits
- **Reusability**: Generated media can be easily reused in other workflow branches
- **Organization**: Keep workflow clean by extracting outputs into separate nodes
- **Flexibility**: Extracted media-set nodes can be configured independently
- **Standard Format**: All extracted media uses the same unified format as regular media-set nodes

## Technical Details
- **Dependencies**: Uses existing workflow infrastructure (ReactFlow, Zustand store)
- **Type Safety**: Full TypeScript support with proper type definitions
- **Position Calculation**: New nodes are automatically positioned relative to source node
- **No Breaking Changes**: Existing functionality remains unchanged
