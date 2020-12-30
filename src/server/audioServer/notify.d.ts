interface NodeNotifiedOptions {
  title?: string;
  subtitle?: string;
  message?: string;
  sound?: boolean; // Case Sensitive string for location of sound file, or use one of macOS' native sounds (see below)
  icon?: string; // Absolute Path to Triggering Icon
  contentImage?: string; // Absolute Path to Attached Image (Content Image)
  open?: string; // URL to open on Click
  wait?: boolean; // Wait for User Action against Notification or times out. Same as timeout = 5 seconds

  // New in latest version. See `example/macInput.js` for usage
  timeout?: number; // Takes precedence over wait if both are defined.
  closeLabel?: string; // String. Label for cancel button
  actions?: string | string[]; // String | Array<String>. Action label or list of labels in case of dropdown
  dropdownLabel?: string; // String. Label to be used if multiple actions
  reply?: boolean; // Boolean. If notification should take input. Value passed as third argument in callback and event emitter.
}

interface NotificationCenterOptions {
  withFallback?: boolean;
  customPath?: string;
}

interface NotifyCallbackMetadata {
  action: string;
  notificationId: string;
  pipe: string;
  button: string;
  version: string;
  activationType: string;
}
type NotifyCallBack = (error: any, response: string, metadata: NotifyCallbackMetadata) => void;

declare module "node-notifier" {
  export class NotificationCenter {
    constructor(optoons: NotificationCenterOptions);
    notify(options, NodeNotifiedOptions, NotifyCallBack): void;
  }
  export function notify(options: NodeNotifiedOptions, callback?: NotifyCallBack): void;
}
