import { bcrypt, config } from "../deps.ts";
import { UserModel, Users } from "../models/mongo/users.ts";
import { NewsletterModel } from "../models/mongo/newsletters.ts";
import sendEmail from "../email/send-email.ts";
import type {
  StandardContext,
  AuthorisedContext,
  OptionallyAuthorisedContext,
} from "../types/context.ts";
const ENV = config();

class Controller {
  async register(context: StandardContext) {
    const { mongo } = context.state;
    const users = new Users(mongo);
    const body = JSON.parse(await context.request.body().value);
    const existing = await users.findByEmail(body.email);
    const userNameExisting = await users.findByUsername(body.username);

    if (existing || userNameExisting) {
      context.response.status = 400;
      return (context.response.body = { message: "User already exists" });
    }

    // todo:
    // handle body.affiliate code when present (look up referring user and give credit, also deduct discount from this user when paying)
    const hashedPassword = await users.hashPassword(body.password);
    const newUser: UserModel = {
      id: users.getRandomId(),
      email: body.email.toLowerCase(),
      username: body.username.toLowerCase(),
      hashed_password: hashedPassword,
      created_at: users.getCurrentTime(),
      updated_at: users.getCurrentTime(),
      contactme: body.contactme,
      phone: body.phone,
      location: body.location,
      stripe_customer_id: "",
      password_reset_expiry: 0,
      password_reset_token: "",
    };
    await mongo.collection("users").insertOne(newUser);

    console.log("user registered! ", body.email, users.getCurrentTime());
    context.response.body = { message: "User created" };
  }

  async update(context: AuthorisedContext) {
    const { mongo } = context.state;
    const id = context.state.user.id;
    const users = new Users(mongo);
    const user = await users.find(id);

    if (!user) {
      context.response.status = 400;
      return (context.response.body = { message: "User does not exist" });
    }

    const body = JSON.parse(await context.request.body().value);
    if (body.newEmail) {
      const existing = await users.findByEmail(body.newEmail);

      if (existing) {
        context.response.status = 400;
        return (context.response.body = { message: "User already exists" });
      }
    }

    if (body.newUsername) {
      const userNameExisting = await users.findByUsername(body.newUsername);

      if (userNameExisting) {
        context.response.status = 400;
        return (context.response.body = { message: "User already exists" });
      }
    }

    user.contactme = Number(body.contactme) as 0 | 1;
    user.phone = body.newPhone;
    user.location = body.location;

    if (body.newPassword) {
      // updating password and fields
      if (body.newEmail) {
        user.email = body.newEmail.toLowerCase();
      }

      if (body.newUsername) {
        user.username = body.newUsername.toLowerCase();
      }

      const hashedPassword = await users.hashPassword(body.newPassword);
      await mongo.collection("users").updateOne(
        { id: id },
        {
          $set: {
            hashed_password: hashedPassword,
            email: user.email,
            username: user.username,
            contactme: user.contactme,
            updated_at: users.getCurrentTime(),
            phone: user.phone,
            location: user.location,
          },
        }
      );
    } else {
      // updating fields only
      if (body.newEmail) {
        user.email = body.newEmail.toLowerCase();
      }

      if (body.newUsername) {
        user.username = body.newUsername.toLowerCase();
      }
      await mongo.collection("users").updateOne(
        { id: id },
        {
          $set: {
            email: user.email,
            username: user.username,
            updated_at: users.getCurrentTime(),
            contactme: user.contactme,
            phone: user.phone,
            location: user.location,
          },
        }
      );
    }

    console.log(
      "user updated! ",
      user.email,
      user.username,
      user.phone,
      users.getCurrentTime()
    );

    context.response.body = { message: "User updated" };
  }

  async login(context: StandardContext) {
    const { mongo } = context.state;
    const users = new Users(mongo);
    const body = JSON.parse(await context.request.body().value);
    let user;

    if (!body.email || !body.password) {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
      return;
    }

    try {
      user = (
        await mongo
          .collection("users")
          .aggregate<
            Pick<UserModel, "id" | "email"> & {
              status: string;
              hashed_password?: string;
            }
          >([
            {
              $match: {
                email: body.email.toLowerCase(),
              },
            },
            {
              $lookup: {
                from: "billing",
                localField: "id",
                foreignField: "user_id",
                as: "billing",
                pipeline: [
                  {
                    $project: {
                      status: 1,
                    },
                  },
                ],
              },
            },
            {
              $unwind: {
                path: "$billing",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $replaceRoot: {
                newRoot: {
                  $mergeObjects: ["$$ROOT", "$billing"],
                },
              },
            },
            {
              $project: {
                id: 1,
                email: 1,
                hashed_password: 1,
                status: 1,
              },
            },
          ])
          .toArray()
      )?.[0];
    } catch (err) {
      console.error(err);
      context.response.status = 400;
      context.response.body = { message: "User not found" };
      return;
    }

    if (!user?.email || !user?.hashed_password) {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
      return;
    }

    console.log("user login: ", user.email);
    const comparison = await bcrypt.compare(
      body.password,
      user.hashed_password
    );

    if (comparison) {
      context.response.status = 200;
      const token = await users.generateJwt(user.id);
      delete user.hashed_password;

      await mongo
        .collection("users")
        .updateOne(
          { email: user.email },
          { $set: { updated_at: users.getCurrentTime() } }
        );

      return (context.response.body = {
        user,
        token,
      });
    } else {
      console.error(
        "Incorrect login: ",
        // body.password,
        user.hashed_password,
        comparison
      );
      context.response.status = 400;
      context.response.body = { message: "Incorrect login" };
    }
  }

  async getMe(context: AuthorisedContext) {
    //get user id from jwt
    const { mongo } = context.state;
    const id = context.state.user.id;
    const users = new Users(mongo);
    const user = await users.find(id);
    if (!user) {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
    } else {
      // check subscription expiry
      if (
        user.payment_type == "coinpayments" &&
        user.status == "active" &&
        user.renewal_date <= Math.floor(Date.now() / 1000)
      ) {
        user.status = "canceled";
        await mongo
          .collection("billing")
          .updateOne({ user_id: id }, { $set: { status: user.status } });
      }

      context.response.body = user;
    }
  }

  async getUsername(context: OptionallyAuthorisedContext) {
    const { mongo } = context.state;
    const id = context.state.user?.id;
    const users = new Users(mongo);
    const username = context.params.username;
    const user = await users.findByUsername(username, id || "");

    if (!user) {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
    } else {
      context.response.body = user;
    }
  }

  async getAll(context: AuthorisedContext) {
    const { mongo } = context.state;
    const _users = new Users(mongo);
    const users = await _users.findAll();

    if (!users || !users.length) {
      context.response.status = 400;
      context.response.body = { message: "Users not found" };
    } else {
      context.response.body = users;
    }
  }

  async requestReset(context: StandardContext) {
    const { mongo } = context.state;
    const users = new Users(mongo);
    const body = JSON.parse(await context.request.body().value);

    if (!body.email) {
      context.response.status = 400;
      context.response.body = { message: "invalid email" };
      return;
    }

    context.response.body = { message: "success" };

    const user = await users.findByEmail(body.email);

    if (!user) return;

    const passwordResetData = await users.getPasswordResetData({
      userID: user.id,
    });

    if (
      passwordResetData &&
      passwordResetData.password_reset_expiry &&
      passwordResetData.password_reset_expiry > Date.now()
    ) {
      // token still valid
      return;
    }

    const token = crypto.randomUUID();
    const expiry = Date.now() + 900000;

    users.updatePasswordResetData(user.id, token, expiry);

    const resetUrl = `https://${ENV.HOST_PATH}/password/reset?token=${token}&expiry=${expiry}`;

    await sendEmail({
      to: body.email,
      subject: "Password Reset Request",
      text: `
        You have requested to reset your password.\n
        Paste this link into your browser: ${resetUrl}
      `,
      html: `
        You have requested to reset your password.<br>
        <a href="${resetUrl}">Click here</a> or paste this link into your browser: ${resetUrl}
      `,
    }).catch(console.error);
  }

  async passwordReset(context: StandardContext) {
    const { mongo } = context.state;
    const users = new Users(mongo);
    const body = JSON.parse(await context.request.body().value);

    if (!body.token || !body.password) {
      context.response.status = 400;
      context.response.body = { message: "missing token or password" };
      return;
    }

    const passwordResetData = await users.getPasswordResetData({
      token: body.token,
    });

    if (!passwordResetData) {
      context.response.status = 400;
      context.response.body = { message: "invalid or expired token" };
      return;
    }

    if (
      passwordResetData.password_reset_expiry &&
      passwordResetData.password_reset_expiry < Date.now()
    ) {
      context.response.status = 400;
      context.response.body = { message: "invalid or expired token" };
      return;
    }

    try {
      const hashedPassword = await users.hashPassword(body.password);
      users.updatePassword(passwordResetData.id, hashedPassword);
      context.response.body = { message: "successfully updated password" };
    } catch {
      context.response.status = 500;
      context.response.body = {
        message: "an error occurred whilst updating password",
      };
    }
  }

  async newsletter(context: StandardContext) {
    const { mongo } = context.state;
    const users = new Users(mongo);
    const body = JSON.parse(await context.request.body().value);

    if (body.email.indexOf("@") === -1) {
      context.response.status = 400;
      return (context.response.body = { message: "Invalid email" });
    }

    const existing = (await mongo
      .collection("newsletters")
      .find({ email: body.email }, { projection: { id: 1 } })
      .toArray()) as { id: string }[];

    if (existing.length) {
      context.response.status = 400;
      return (context.response.body = { message: "User already subscribed" });
    }

    // todo:
    // handle body.affiliate code when present (look up referring user and give credit, also deduct discount from this user when paying)
    const newsletterData: NewsletterModel = {
      id: users.getRandomId(),
      email: body.email.toLowerCase(),
      name: body.name?.toLowerCase(),
      created_at: users.getCurrentTime(),
      updated_at: users.getCurrentTime(),
      contactme: body.contactme,
      phone: body.phone,
    };
    await mongo.collection("newsletters").insertOne(newsletterData);

    console.log("user subscribed! ", body.email, users.getCurrentTime());
    context.response.body = { message: "User subscribed" };
  }

  async unsubscribeNewsletter(context: StandardContext) {
    const { mongo } = context.state;
    const { id } = context.params;
    const existing = (await mongo
      .collection("newsletters")
      .find({ id: id }, { projection: { id: 1 } })
      .toArray()) as { id: string }[];

    if (!existing.length) {
      context.response.status = 400;
      return (context.response.body = { message: "User not subscribed" });
    }

    // todo:
    // handle body.affiliate code when present (look up referring user and give credit, also deduct discount from this user when paying)
    await mongo.collection("newsletters").deleteOne({ id: id });

    console.log("user un-subscribed", id);
    context.response.body = { message: "User un-subscribed" };
  }
}

export default new Controller();
