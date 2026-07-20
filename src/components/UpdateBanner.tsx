interface UpdateBannerProps {
  version: string;
  ready: boolean;
  onInstall: () => void;
}

export default function UpdateBanner({ version, ready, onInstall }: UpdateBannerProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-primary-900/60 border-b border-primary-700">
      <p className="text-sm text-primary-200">
        {ready
          ? `Update v${version} downloaded and ready to install.`
          : `A new version (v${version}) is being downloaded...`}
      </p>
      {ready && (
        <button
          onClick={onInstall}
          className="px-3 py-1 text-xs font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-md transition-colors"
        >
          Restart & Update
        </button>
      )}
    </div>
  );
}
