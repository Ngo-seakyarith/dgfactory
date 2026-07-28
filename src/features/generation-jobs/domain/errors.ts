export class GenerationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationInputError";
  }
}
