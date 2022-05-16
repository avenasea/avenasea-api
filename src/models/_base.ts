import DB from "../db.ts";

class Base {
  constructor() {}

  get db() {
    return new DB("database.sqlite");
  }

  destroy() {
    this.db.close();
  }
}

export default Base;
