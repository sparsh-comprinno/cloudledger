import { useState } from "react";
import { AwsCredentials, AWS_REGIONS } from "../types";
import { VscKey, VscEye, VscEyeClosed, VscPlay } from "react-icons/vsc";

interface CredentialsFormProps {
  onSubmit: (credentials: AwsCredentials) => void;
}

export default function CredentialsForm({ onSubmit }: CredentialsFormProps) {
  const [credentials, setCredentials] = useState<AwsCredentials>({
    access_key_id: "",
    secret_access_key: "",
    session_token: "",
    region: "us-east-1",
    profile: "default",
    use_env_vars: false,
    use_profile: false,
  });
  const [showSecret, setShowSecret] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(credentials);
  };

  const update = (field: keyof AwsCredentials, value: string | boolean) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-2xl space-y-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center">
            <VscKey className="text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              AWS Credentials
            </h2>
            <p className="text-sm text-dark-400">
              Provide your AWS credentials to scan resources
            </p>
          </div>
        </div>

        {/* Auth Method Selection */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="auth_method"
              checked={!credentials.use_env_vars && !credentials.use_profile}
              onChange={() => {
                update("use_env_vars", false);
                update("use_profile", false);
              }}
              className="accent-primary-500"
            />
            <span className="text-sm text-dark-200">Manual Keys</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="auth_method"
              checked={credentials.use_profile}
              onChange={() => {
                update("use_profile", true);
                update("use_env_vars", false);
              }}
              className="accent-primary-500"
            />
            <span className="text-sm text-dark-200">AWS Profile</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="auth_method"
              checked={credentials.use_env_vars}
              onChange={() => {
                update("use_env_vars", true);
                update("use_profile", false);
              }}
              className="accent-primary-500"
            />
            <span className="text-sm text-dark-200">Environment Variables</span>
          </label>
        </div>

        {/* Manual Credentials */}
        {!credentials.use_env_vars && !credentials.use_profile && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Access Key ID
              </label>
              <input
                type="text"
                className="input-field font-mono"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={credentials.access_key_id}
                onChange={(e) => update("access_key_id", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Secret Access Key
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  className="input-field font-mono pr-10"
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  value={credentials.secret_access_key}
                  onChange={(e) => update("secret_access_key", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                >
                  {showSecret ? <VscEyeClosed /> : <VscEye />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Session Token{" "}
                <span className="text-dark-500">(optional)</span>
              </label>
              <input
                type="password"
                className="input-field font-mono"
                placeholder="Temporary session token..."
                value={credentials.session_token}
                onChange={(e) => update("session_token", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Profile Credentials */}
        {credentials.use_profile && (
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Profile Name
            </label>
            <input
              type="text"
              className="input-field font-mono"
              placeholder="default"
              value={credentials.profile}
              onChange={(e) => update("profile", e.target.value)}
            />
            <p className="text-xs text-dark-500 mt-1">
              From ~/.aws/credentials
            </p>
          </div>
        )}

        {/* Environment Variables note */}
        {credentials.use_env_vars && (
          <div className="bg-dark-800 rounded-lg p-3 border border-dark-600">
            <p className="text-sm text-dark-300">
              Will use <code className="text-primary-400">AWS_ACCESS_KEY_ID</code>,{" "}
              <code className="text-primary-400">AWS_SECRET_ACCESS_KEY</code>, and optionally{" "}
              <code className="text-primary-400">AWS_SESSION_TOKEN</code> from your environment.
            </p>
          </div>
        )}

        {/* Region Selector */}
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1">
            AWS Region
          </label>
          <select
            className="input-field"
            value={credentials.region}
            onChange={(e) => update("region", e.target.value)}
          >
            {AWS_REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
        >
          <VscPlay />
          Start Resource Scan
        </button>

        <p className="text-xs text-dark-500 text-center">
          Credentials are never stored. They are used only for the duration of the scan.
        </p>
      </form>
    </div>
  );
}
