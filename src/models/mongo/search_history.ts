import { Mongo } from "../../deps.ts";

export class SearchHistoryModel {
  constructor(
    public id: string,
    public user_id: string,
    public title: string,
    public url: string,
    public created_at: string,
    public search_id: string
  ) {}
}
