import type { UUID } from "../../utils/randomId.ts";

type FieldKey = string;

export interface Comment {
  id: UUID;
  parentID: UUID | null;
  text: string;
  timestamp: Date;
  userID: UUID;
  field: FieldKey;
}

export interface ChangeHistory {
  timestamp: Date;
  userID: UUID;
  changedFrom: string;
  changedTo: string;
}

export class Contract {
  constructor(
    public id: UUID,
    public name: string,
    public createdAt: Date,
    public parties: {
      userID: UUID;
      creator: boolean;
      fieldsApproved?: {
        [key: FieldKey]: {
          choice: "approved" | "rejected";
        };
      };
    }[],
    public JSONschema: Record<any, any>,
    public currentData: Record<FieldKey, any>,
    public changeHistory: {
      [key: FieldKey]: ChangeHistory[];
    },
    public comments: Comment[] | []
  ) {}
}
