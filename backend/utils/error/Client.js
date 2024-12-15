export class ClientError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClientError';
    this.clienteMessage = message;
  }
}