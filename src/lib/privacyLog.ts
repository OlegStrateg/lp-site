// Shared same-page event bus between a converter widget and the privacy
// terminal panel (NetworkGuard.astro): the widget calls logPrivacyEvent()
// when a real, verifiable local-processing milestone happens, the panel
// renders it as a log line. No network call, no persistence — just a
// CustomEvent on window.
export const PRIVACY_LOG_EVENT = 'lp:privacy-log';

export interface PrivacyLogDetail {
  message: string;
}

export function logPrivacyEvent(message: string) {
  window.dispatchEvent(new CustomEvent<PrivacyLogDetail>(PRIVACY_LOG_EVENT, { detail: { message } }));
}

// Rejection line for the terminal: without this, an error leaves the log
// dangling at "file selected locally" as if nothing happened. Maps the
// widgets' track() reason codes to a short human label; called from every
// widget's showError so the log always closes the story.
const REJECTION_LABELS: Record<string, string> = {
  unsupported_format: 'unsupported file type',
  not_pptx: 'unsupported file type',
  too_large: 'file too large',
  too_large_dimensions: 'file too large',
  too_many_files: 'file too large',
  too_many_pages: 'file too large',
  corrupt: 'corrupt file',
  invalid_zip: 'corrupt file',
};

export function logRejection(reason: string) {
  logPrivacyEvent(`rejected: ${REJECTION_LABELS[reason] ?? 'could not process file'}`);
}
