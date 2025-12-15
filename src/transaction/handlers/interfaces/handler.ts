
export interface Handler {
  handle(): Promise<boolean>;
}