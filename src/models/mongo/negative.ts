import { Mongo } from "../../deps.ts";

export class NegativeModel {
  constructor(
    public id: string,
    public search_id: string,
    public word: string
  ) {}
}
