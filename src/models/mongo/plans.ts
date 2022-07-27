import { Mongo } from "../../deps.ts";

export class PlanModel {
  constructor(
    public id: string,
    public name: string,
    public cost: number,
    public billing_frequency: "once" | "monthly",
    public stripe_price_id: string,
    public job_search_profiles: number,
    public candidate_search_profiles: number,
    public type: "recruiter" | "jobseeker"
  ) {}
}

export class Plans {
  constructor(private db: Mongo.Database) {
    this.db = db;
  }

  async find(id: number | string) {
    id = id.toString();
    const query = await this.db.collection("plans").findOne({ id: id });

    return query;
  }

  async findAll() {
    const query = await this.db.collection<PlanModel>("plans").find().toArray();

    return query;
  }
}
