import type { StandardContext, AuthorisedContext } from "../types/context.ts";

class Controller {
  async post(context: AuthorisedContext) {
    const db = context.state.db;
    const id = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);
    const { positive, negative, title, type, pay, contact, description } = body;
    const data: any = {};
    const job_id = crypto.randomUUID();

    // insert name of search
    db.queryObject(
      "INSERT INTO jobs (id, user_id, title, created_at, updated_at, type, pay, contact, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      job_id,
      id,
      title,
      new Date().toISOString(),
      new Date().toISOString(),
      type,
      pay,
      contact,
      description
    );

    // add positive keywords
    for (let word of positive) {
      db.queryObject(
        "INSERT INTO positive (id, search_id, word) VALUES (?, ?, ?)",
        crypto.randomUUID(),
        job_id,
        word.trim().toLowerCase()
      );
    }

    // add negative keywords
    for (let word of negative) {
      db.queryObject(
        "INSERT INTO negative (id, search_id, word) VALUES (?, ?, ?)",
        crypto.randomUUID(),
        job_id,
        word.trim().toLowerCase()
      );
    }

    data.positive = positive;
    data.negative = negative;
    data.title = title;
    data.pay = pay;
    data.description = description;
    data.contact = contact;

    context.response.status = 201;
    context.response.body = data;
  }

  delete(context: AuthorisedContext) {
    const db = context.state.db;
    const id = context.params.id;

    db.queryObject("DELETE FROM jobs WHERE id = ?", id);
    db.queryObject("DELETE FROM positive WHERE search_id = ?", id);
    db.queryObject("DELETE FROM negative WHERE search_id = ?", id);

    context.response.status = 200;
    context.response.body = { message: "Job has been deleted" };
  }

  getMyJobs(context: AuthorisedContext) {
    const db = context.state.db;
    const id = context.state.user.id;
    const all = db.queryObject("SELECT * FROM jobs WHERE user_id = ?", id);

    context.response.body = all;
  }

  getAll(context: StandardContext) {
    const db = context.state.db;
    const all = db.queryObject(`
        SELECT j.*, u.username FROM jobs as j
        INNER JOIN users u ON j.user_id = u.id ORDER BY j.created_at DESC
    `);

    context.response.body = all;
  }

  getByTag(context: StandardContext) {
    const db = context.state.db;
    const tag = context.params.tag.replace(/-+/g, " ");

    const all = db.queryObject(
      `
        SELECT j.*, u.username FROM jobs as j
        INNER JOIN users u, positive p ON j.user_id = u.id AND j.id = p.search_id WHERE p.word = ? ORDER BY j.created_at DESC
    `,
      tag
    );

    context.response.body = all;
  }

  getByUsername(context: StandardContext) {
    const db = context.state.db;
    const { username } = context.params;

    const all = db.queryObject(
      `
        SELECT j.*, u.username FROM jobs as j
        INNER JOIN users u ON j.user_id = u.id  WHERE u.username = ? ORDER BY j.created_at DESC
    `,
      username.toLowerCase()
    );

    context.response.body = all;
  }
  getOne(context: StandardContext) {
    const db = context.state.db;
    // const id = context.state.user.id;
    const job_id = context.params.id;
    let data =
      db
        .queryObject(
          "SELECT j.*, u.username FROM jobs as j INNER JOIN users u ON j.user_id = u.id WHERE j.id = ?",
          job_id
        )
        .pop() || {};

    const positive = db.queryObject(
      "SELECT word FROM positive WHERE search_id = ?",
      job_id
    );

    const negative = db.queryObject(
      "SELECT word FROM negative WHERE search_id = ?",
      job_id
    );

    data.positive = positive.map((w: any) => w.word);
    data.negative = negative.map((w: any) => w.word);
    context.response.body = data;
  }

  async update(context: AuthorisedContext) {
    const db = context.state.db;
    const id = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);
    const { positive, negative, title, type, contact, pay, description } = body;
    const data: any = {};
    const job_id = context.params.id;

    // insert name of search
    db.queryObject(
      "UPDATE jobs SET title = ?, type = ?, contact = ?, pay = ?, description = ?, updated_at = ? WHERE id = ?",
      title,
      type,
      contact,
      pay,
      description,
      new Date().toISOString(),
      job_id
    );

    // add positive keywords
    db.queryObject("DELETE from positive WHERE search_id = ?", job_id);

    for (let word of positive) {
      db.queryObject(
        "INSERT INTO positive (id, search_id, word) VALUES (?, ?, ?)",
        crypto.randomUUID(),
        job_id,
        word.trim().toLowerCase()
      );
    }

    // add negative keywords
    db.queryObject("DELETE from negative WHERE search_id = ?", job_id);

    for (let word of negative) {
      db.queryObject(
        "INSERT INTO negative (id, search_id, word) VALUES (?, ?, ?)",
        crypto.randomUUID(),
        job_id,
        word.trim().toLowerCase()
      );
    }

    data.positive = positive;
    data.negative = negative;
    data.title = title;
    data.pay = pay;
    data.description = description;
    data.contact = contact;
    data.type = type;

    context.response.status = 201;
    context.response.body = data;
  }
}

export default new Controller();
