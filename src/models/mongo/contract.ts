import { Mongo } from "../../deps.ts";

type DbID = string;
type FieldKey = string;

export default class Contract {
  constructor(
    public name: string,
    public createdAt: Date,
    public parties: {
      userID: DbID;
      creator: boolean;
    }[],
    public JSONschema: Record<any, any>,
    public currentData: Record<FieldKey, any>,
    public changeHistory: {
      [key: FieldKey]: Array<{
        timestamp: Date;
        userID: DbID;
        changedFrom: string;
        changedTo: string;
      }>;
    },
    public comments?: Record<
      FieldKey,
      { text: string; timestamp: Date; userID: string }[]
    >,
    public id?: Mongo.ObjectId
  ) {}
}
