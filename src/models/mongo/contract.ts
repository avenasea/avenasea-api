import { Mongo } from "../../deps.ts";

type dbID = string;
type fieldKey = string;

export default class Contract {
  constructor(
    // TODO: add createdAt
    public name: string,
    public parties: {
      userID: dbID;
      creator: boolean;
    }[],
    public JSONschema: Record<any, any>,
    public currentData: Record<fieldKey, any>,
    public changeHistory?: Record<
      fieldKey,
      {
        timestamp: Date;
        userID: dbID;
        changedFrom: string;
        changedTo: string;
      }[]
    >,
    public comments?: Record<
      string,
      { text: string; timestamp: Date; userID: string }
    >,
    public id?: Mongo.ObjectId
  ) {}
}
