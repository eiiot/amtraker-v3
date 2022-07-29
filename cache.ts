import { Response } from "./amtraker";

export default class cache {
  trains: Response;

  constructor() {
    this.trains = { test: [] };
    return;
  }

  get(key: string) {
    return this[key];
  }

  set(key: string, data: Response) {
    this[key] = data;
  }
}
