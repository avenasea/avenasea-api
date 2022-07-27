import { Mongo } from "../../deps.ts";

export class PositiveModel {
  constructor(
    public id: string,
    public search_id: string,
    public word: string
  ) {}
}
