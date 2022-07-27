import { Mongo } from "../../deps.ts";

export class SearchModel {
  constructor(
    public id: string,
    public user_id: string,
    public name: string,
    public created_at: string,
    public updated_at: string,
    public type: string
  ) {}
}
