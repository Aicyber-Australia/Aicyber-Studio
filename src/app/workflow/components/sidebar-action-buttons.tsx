import React from 'react';
import { 
  CircleUserRound, 
  Save, 
  CloudUpload, 
  Bolt, 
  LogOut 
} from 'lucide-react';

interface SidebarActionButtonsProps {
  onSettingsClick: () => void;
  onSaveClick?: () => void;
  onCloudUploadClick?: () => void;
  onUserClick?: () => void;
  onLogoutClick?: () => void;
}

export function SidebarActionButtons({
  onSettingsClick,
  onSaveClick,
  onCloudUploadClick,
  onUserClick,
  onLogoutClick,
}: SidebarActionButtonsProps) {
  return (
    <div className="flex gap-1.5 px-3">
      <button 
        className="flex-1 aspect-square bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md flex items-center justify-center transition-colors duration-200"
        onClick={onUserClick}
        title="User Profile"
      >
        <CircleUserRound className="size-3.5 text-gray-600" />
      </button>
      
      <button 
        className="flex-1 aspect-square bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md flex items-center justify-center transition-colors duration-200"
        onClick={onSaveClick}
        title="Save"
      >
        <Save className="size-3.5 text-gray-600" />
      </button>
      
      <button 
        className="flex-1 aspect-square bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md flex items-center justify-center transition-colors duration-200"
        onClick={onCloudUploadClick}
        title="Cloud Upload"
      >
        <CloudUpload className="size-3.5 text-gray-600" />
      </button>
      
      <button 
        className="flex-1 aspect-square bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md flex items-center justify-center transition-colors duration-200"
        onClick={onSettingsClick}
        title="Settings"
      >
        <Bolt className="size-3.5 text-gray-600" />
      </button>
      
      <button 
        className="flex-1 aspect-square bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md flex items-center justify-center transition-colors duration-200"
        onClick={onLogoutClick}
        title="Logout"
      >
        <LogOut className="size-3.5 text-gray-600" />
      </button>
    </div>
  );
}
