import React from 'react';
import { 
  CircleUserRound, 
  CloudUpload, 
  Bolt, 
  LogOut 
} from 'lucide-react';

interface SidebarActionButtonsProps {
  onCloudUploadClick?: () => void;
  onUserClick?: () => void;
  onLogoutClick?: () => void;
}

export function SidebarActionButtons({
  onCloudUploadClick,
  onUserClick,
  onLogoutClick,
}: SidebarActionButtonsProps) {
  return (
    <div className="flex gap-2 px-3 justify-end">
      <button 
        className="w-12 h-12 bg-transparent hover:bg-gray-100 rounded-xl shadow-sm hover:shadow-md flex items-center justify-center transition-all duration-200"
        onClick={onUserClick}
        title="User Profile"
      >
        <CircleUserRound className="size-5 text-gray-700" />
      </button>
      
      <button 
        className="w-12 h-12 bg-transparent hover:bg-gray-100 rounded-xl shadow-sm hover:shadow-md flex items-center justify-center transition-all duration-200"
        onClick={onCloudUploadClick}
        title="Cloud Upload"
      >
        <CloudUpload className="size-5 text-gray-700" />
      </button>
      
      <button 
        className="w-12 h-12 bg-transparent hover:bg-gray-100 rounded-xl shadow-sm hover:shadow-md flex items-center justify-center transition-all duration-200"
        onClick={onLogoutClick}
        title="Logout"
      >
        <LogOut className="size-5 text-gray-700" />
      </button>
    </div>
  );
}
