import { db } from "../db.ts";
import Users from "../models/users.ts";

export const checkPerms = async (userID: string, type: string) => {
  const user: any = await Users.find(userID);
  if (!user) return false;

  // check trial
  const trialLength = 2; //weeks
  const trialEnd = new Date(user.created_at);
  trialEnd.setDate(trialEnd.getDate() + trialLength * 7);

  if (Date.now() < trialEnd.getTime()) return true;

  if (user.status != "active") return false;

  const maxProfiles =
    type == "job" ? user.job_search_profiles : user.candidate_search_profiles;

  if (maxProfiles == -1) return true;

  const all = await db.queryEntries(
    "SELECT * FROM searches WHERE user_id = ?",
    [userID]
  );

  const currentCount = all.filter((job) => job.type == type).length;

  if (currentCount + 1 > maxProfiles) return false;
};
