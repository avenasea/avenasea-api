import { db } from "../db.ts";

class Base {
  constructor() {}

  get db() {
    return db;
  }

  destroy() {
    this.db.close();
  }
}

export default Base;
