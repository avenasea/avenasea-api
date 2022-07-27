import { Mongo } from "../../deps.ts";

export class NewsletterModel {
  constructor(
    public id: string,
    public email: string,
    public name: string,
    public phone: string,
    public contactme: number = 1,
    public created_at: string,
    public updated_at: string
  ) {}
}
