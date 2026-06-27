export type DatabaseClient = {
  connected: boolean;
};

export function getDatabaseClient(): DatabaseClient {
  return {
    connected: false,
  };
}
