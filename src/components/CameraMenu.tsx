import { useRef } from 'react';
import './CameraMenu.css';

interface CameraMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
  onMenuStateChange?: (isOpen: boolean) => void;
}

export default function CameraMenu({ isOpen, onClose, onFileSelect, onMenuStateChange }: CameraMenuProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCameraClick() {
    cameraInputRef.current?.click();
  }

  function handleGalleryClick() {
    galleryInputRef.current?.click();
  }

  function handleFileClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      onClose();
    }
    e.target.value = '';
  }

  if (!isOpen) {
    if (onMenuStateChange) onMenuStateChange(false);
    return null;
  }

  if (onMenuStateChange) onMenuStateChange(true);

  return (
    <>
      <div className="camera-menu-overlay" onClick={onClose} />
      <div className="camera-menu">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <button className="camera-menu-item" onClick={handleCameraClick}>
          <span className="camera-menu-icon">📷</span>
          <span className="camera-menu-text">Sacar foto</span>
        </button>

        <button className="camera-menu-item" onClick={handleGalleryClick}>
          <span className="camera-menu-icon">🖼️</span>
          <span className="camera-menu-text">Elegir de galería</span>
        </button>

        <button className="camera-menu-item" onClick={handleFileClick}>
          <span className="camera-menu-icon">📄</span>
          <span className="camera-menu-text">Subir archivo</span>
        </button>
      </div>
    </>
  );
}
