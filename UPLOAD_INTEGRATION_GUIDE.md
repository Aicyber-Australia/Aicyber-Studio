# Asset Upload Integration Guide

This document explains how to integrate Supabase storage uploads into workflow nodes.

## Overview

All nodes that allow users to upload assets (images, videos) should first upload those assets to Supabase storage via the `studio-upload-image` edge function, then use the returned public URL instead of blob URLs.

## Utility Functions

A utility module has been created at `src/app/workflow/utils/upload-to-storage.ts` with the following functions:

### `uploadFileToStorage(file: File): Promise<string>`
Uploads a File object to Supabase storage and returns the public URL.

### `uploadBlobUrlToStorage(blobUrl: string, fileName: string): Promise<string>`
Converts a blob URL to a file and uploads it to Supabase storage.

### `uploadDataUrlToStorage(dataUrl: string, fileName: string): Promise<string>`
Converts a data URL to a file and uploads it to Supabase storage.

### Helper Functions
- `isBlobUrl(url: string): boolean` - Check if URL is a blob URL
- `isDataUrl(url: string): boolean` - Check if URL is a data URL
- `needsUpload(url: string): boolean` - Check if URL needs uploading

## Implementation Pattern

### For Single File Upload (image-frame.tsx - COMPLETED ✅)

```typescript
import { uploadFileToStorage } from '@/app/workflow/utils/upload-to-storage';

const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file && file.type.startsWith('image/')) {
    setImageError(false);

    // 1. Show immediate feedback with blob URL
    const blobUrl = URL.createObjectURL(file);
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: { imageList: [{ url: blobUrl, fileName: file.name, timestamp: Date.now() }] },
              status: 'loading'
            }
          }
        : node
    ));

    try {
      // 2. Upload to Supabase
      const uploadedUrl = await uploadFileToStorage(file);

      // 3. Update with Supabase URL
      setNodes(nodes => nodes.map(node =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                media: { imageList: [{ url: uploadedUrl, fileName: file.name, timestamp: Date.now() }] },
                status: 'success'
              }
            }
          : node
      ));

      // 4. Cleanup blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      setNodes(nodes => nodes.map(node =>
        node.id === id ? { ...node, data: { ...node.data, status: 'error' } } : node
      ));
    }
  }
};
```

### For Multiple File Upload (image-set.tsx, video-set.tsx, media-set.tsx)

```typescript
import { uploadFileToStorage } from '@/app/workflow/utils/upload-to-storage';

const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files;
  if (!files) return;

  const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

  // 1. Show immediate feedback with blob URLs
  const blobImages = imageFiles.map(file => ({
    url: URL.createObjectURL(file),
    fileName: file.name,
    timestamp: Date.now(),
    uploading: true // Track upload status
  }));

  setNodes(nodes => nodes.map(node =>
    node.id === id
      ? {
          ...node,
          data: {
            ...node.data,
            media: { imageList: [...imageList, ...blobImages] },
            title: `Image Set (${imageList.length + blobImages.length})`,
            status: 'loading'
          }
        }
      : node
  ));

  // 2. Upload all files to Supabase
  const uploadPromises = imageFiles.map(async (file, index) => {
    try {
      const uploadedUrl = await uploadFileToStorage(file);
      const blobUrl = blobImages[index].url;

      // Update individual image URL
      setNodes(nodes => nodes.map(node => {
        if (node.id === id) {
          const currentImageList = node.data?.media?.imageList || [];
          const updatedImageList = currentImageList.map((img: any) =>
            img.url === blobUrl
              ? { ...img, url: uploadedUrl, uploading: false }
              : img
          );
          return {
            ...node,
            data: {
              ...node.data,
              media: { imageList: updatedImageList }
            }
          };
        }
        return node;
      }));

      // Cleanup blob URL
      URL.revokeObjectURL(blobUrl);

      return uploadedUrl;
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      return null;
    }
  });

  // 3. Wait for all uploads to complete
  await Promise.all(uploadPromises);

  // 4. Update final status
  setNodes(nodes => nodes.map(node =>
    node.id === id
      ? { ...node, data: { ...node.data, status: 'success' } }
      : node
  ));
};
```

### For Edited Images (edit-image.tsx)

```typescript
import { uploadDataUrlToStorage } from '@/app/workflow/utils/upload-to-storage';

const handleSave = async (imageDataUrl: string) => {
  try {
    // Show loading state
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? { ...node, data: { ...node.data, status: 'loading' } }
        : node
    ));

    // Upload data URL to Supabase
    const uploadedUrl = await uploadDataUrlToStorage(imageDataUrl, `edited_${Date.now()}.png`);

    // Update with Supabase URL
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              media: {
                imageList: [{
                  url: uploadedUrl,
                  fileName: `edited_${Date.now()}.png`,
                  timestamp: Date.now()
                }]
              },
              status: 'success'
            }
          }
        : node
    ));
  } catch (error) {
    console.error('Upload failed:', error);
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? { ...node, data: { ...node.data, status: 'error' } }
        : node
    ));
  }
};
```

## Files to Update

### Completed ✅
- [x] `src/app/workflow/components/nodes/image/image-frame.tsx`

### Pending
- [ ] `src/app/workflow/components/nodes/image/image-set.tsx`
- [ ] `src/app/workflow/components/nodes/video/video-frame.tsx`
- [ ] `src/app/workflow/components/nodes/video/video-set.tsx`
- [ ] `src/app/workflow/components/nodes/media-set/media-set.tsx`
- [ ] `src/app/workflow/components/nodes/action-node/edit-image.tsx`

## Benefits

1. **Persistence**: Assets survive page refreshes
2. **Sharing**: Workflows can be shared with assets intact
3. **API Compatibility**: Edge functions require permanent URLs, not blob URLs
4. **Deduplication**: Supabase storage automatically deduplicates identical files
5. **Security**: User-specific storage paths with authentication

## Notes

- Blob URLs (`blob://...`) are temporary and only exist in the current session
- Data URLs (`data:...`) embed the entire file and are inefficient for large files
- Supabase storage provides permanent, public URLs that work across sessions
- The upload function handles authentication automatically via the edge function client
- Failed uploads should show error state and allow retry

## Testing

To test the integration:

1. Upload an image in a node
2. Verify the loading state appears
3. Check console for "Upload successful" message with Supabase URL
4. Verify the image displays correctly with the new URL
5. Refresh the page and verify the image persists
6. Try the workflow execution to ensure edge functions receive the correct URLs
