import { nowIso } from "./utils.js";

export function getCloudLibraryStatus() {
  return {
    standard: "creator-cloud-library-status-v1",
    createdAt: nowIso(),
    enabled: false,
    mode: "not-configured",
    provider: "user-selected",
    running: false,
    repositories: { metadata: null, assets: null },
    localManifest: null,
    cloudIndex: null,
    rightsGate: {
      defaultRightsStatus: "private-review-required",
      allowedUploadStatuses: [],
      rawAssetsBlockedByDefault: true
    },
    schedule: { installed: false, mode: "not-installed", running: false },
    setupHint: "Configure a project-owned private repository or object store before enabling cloud library sync."
  };
}

export function startCloudLibrarySync() {
  throw new Error("cloud library sync is not configured in the public core");
}
