import { bcrypt, config } from "../deps.ts";
import Users from "../models/users.ts";
import sendEmail from "../email/send-email.ts";
const ENV = config();

class Controller {
  async register(context: any) {
    const { db, mongo } = context.state;
    const users = new Users(db, mongo);
    const body = JSON.parse(await context.request.body().value);
    const existing = await db.query("SELECT * FROM users WHERE email = ?", [
      body.email,
    ]);

    const userNameExisting = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [body.username]
    );

    if (existing.length || userNameExisting.length) {
      context.response.status = 400;
      return (context.response.body = { message: "User already exists" });
    }

    // todo:
    // handle body.affiliate code when present (look up referring user and give credit, also deduct discount from this user when paying)
    const hashedPassword = await users.hashPassword(body.password);
    const user = await db.query(
      "INSERT INTO users (id, email, username, hashed_password, created_at, updated_at, contactme, phone, location) VALUES (?,?,?,?,?,?,?,?, ?)",
      [
        users.getRandomId(),
        body.email.toLowerCase(),
        body.username.toLowerCase(),
        hashedPassword,
        users.getCurrentTime(),
        users.getCurrentTime(),
        body.contactme,
        body.phone,
        body.location,
      ]
    );

    console.log("user registered! ", body.email, users.getCurrentTime());
    context.response.body = { message: "User created" };
  }

  async update(context: any) {
    const { db, mongo } = context.state;
    const id = context.state.user.id;
    const users = new Users(db, mongo);
    const user = await users.find(id);

    if (!user) {
      context.response.status = 400;
      return (context.response.body = { message: "User does not exist" });
    }

    const body = JSON.parse(await context.request.body().value);
    if (body.newEmail) {
      const existing = await db.query("SELECT * FROM users WHERE email = ?", [
        body.newEmail,
      ]);

      if (existing.length) {
        context.response.status = 400;
        return (context.response.body = { message: "User already exists" });
      }
    }

    if (body.newUsername) {
      const userNameExisting = await db.query(
        "SELECT * FROM users WHERE username = ?",
        [body.newUsername]
      );

      if (userNameExisting.length) {
        context.response.status = 400;
        return (context.response.body = { message: "User already exists" });
      }
    }

    user.contactme = Number(body.contactme);
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
      await db.query(
        "UPDATE users SET hashed_password = ?, email = ?, username = ?, updated_at = ?, contactme = ?, phone = ?, location = ? WHERE id = ?",
        [
          hashedPassword,
          user.email,
          user.username,
          user.contactme,
          users.getCurrentTime(),
          user.phone,
          user.location,
          id,
        ]
      );
    } else {
      // updating fields only
      if (body.newEmail) {
        user.email = body.newEmail.toLowerCase();
      }

      if (body.newUsername) {
        user.username = body.newUsername.toLowerCase();
      }

      await db.query(
        `UPDATE users
           SET email = ?,
           username = ?,
           updated_at = ?,
           contactme = ?,
           phone = ?,
           location = ?
        WHERE id = ?`,
        [
          user.email,
          user.username,
          users.getCurrentTime(),
          user.contactme,
          user.phone,
          user.location,
          id,
        ]
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

  async login(context: any) {
    const { db, mongo } = context.state;
    const users = new Users(db, mongo);
    const body = JSON.parse(await context.request.body().value);
    let user: any;

    if (!body.email || !body.password) {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
      return;
    }

    try {
      const query = db.prepareQuery(
        `SELECT
        id,
        email,
        hashed_password,
        billing.status
        FROM users
        LEFT JOIN billing ON billing.user_id = users.id
        WHERE email = :email`
      );
      user = query.oneEntry({ email: body.email.toLowerCase() });
      query.finalize();
    } catch (err) {
      console.error(err);
      context.response.status = 400;
      context.response.body = { message: "User not found" };
      return;
    }

    if (!user.email) {
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

      await db.query("UPDATE users SET updated_at = ? WHERE email = ?", [
        users.getCurrentTime(),
        user.email,
      ]);

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

  async getMe(context: any) {
    //get user id from jwt
    const { db, mongo } = context.state;
    const id = context.state.user.id;
    const users = new Users(db, mongo);
    const user: any = await users.find(id);
    if (typeof user === "undefined") {
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
        db.query("UPDATE billing SET status = ? WHERE user_id = ?", [
          user.status,
          id,
        ]);
      }
      delete user.hashedPassword;
      context.response.body = user;
    }
  }

  async getUsername(context: any) {
    const { db, mongo } = context.state;
    const id = context.state.user?.id;
    const users = new Users(db, mongo);
    const username = context.params.username;
    const user = await users.findByUsername(username, id);

    if (!user) {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
    } else {
      context.response.body = user;
    }
  }

  async getAll(context: any) {
    const { db, mongo } = context.state;
    const _users = new Users(db, mongo);
    const users = await _users.findAll();

    if (!users.length) {
      context.response.status = 400;
      context.response.body = { message: "Users not found" };
    } else {
      context.response.body = users;
    }
  }

  async requestReset(context: any) {
    const { db, mongo } = context.state;
    const users = new Users(db, mongo);
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
      parseInt(passwordResetData.password_reset_expiry) > Date.now()
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

  async passwordReset(context: any) {
    const { db, mongo } = context.state;
    const users = new Users(db, mongo);
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

    if (parseInt(passwordResetData.password_reset_expiry) < Date.now()) {
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
}

export default new Controller();
