import { Mongo } from "../../deps.ts";

export class JobModel {
  constructor(
    public id: string,
    public user_id: string,
    public title: string,
    public description: string,
    public type: string,
    public created_at: string,
    public updated_at: string,
    public contact: string,
    public pay?: string
  ) {}
}
