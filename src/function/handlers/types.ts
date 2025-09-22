export interface CloudHandler {
  handle(context: any): Promise<void>;
}

export interface CloudContext {
  log: any;
  done?: (error?: Error, result?: any) => void;
}

export interface FunctionConfig {
  schedule: string;
  runOnStartup: boolean;
  useMonitor: boolean;
}