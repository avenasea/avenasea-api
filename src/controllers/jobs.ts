class Controller {
  async post(context: any) {
    const db = context.state.db;
    const id = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);
    const { positive, negative, title, type, pay, contact, description } = body;
    const data: any = {};
    const job_id = crypto.randomUUID();

    // insert name of search
    await db.query(
      "INSERT INTO jobs (id, user_id, title, created_at, updated_at, type, pay, contact, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        job_id,
        id,
        title,
        new Date().toISOString(),
        new Date().toISOString(),
        type,
        pay,
        contact,
        description,
      ]
    );

    // add positive keywords
    for (let word of positive) {
      await db.query(
        "INSERT INTO positive (id, search_id, word) VALUES (?, ?, ?)",
        [crypto.randomUUID(), job_id, word.trim().toLowerCase()]
      );
    }

    // add negative keywords
    for (let word of negative) {
      await db.query(
        "INSERT INTO negative (id, search_id, word) VALUES (?, ?, ?)",
        [crypto.randomUUID(), job_id, word.trim().toLowerCase()]
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

  async delete(context: any) {
    const db = context.state.db;
    const id = context.params.id;

    await db.query("DELETE FROM jobs WHERE id = ?", [id]);
    await db.query("DELETE FROM positive WHERE search_id = ?", [id]);
    await db.query("DELETE FROM negative WHERE search_id = ?", [id]);

    context.response.status = 200;
    context.response.body = { message: "Job has been deleted" };
  }

  async getMyJobs(context: any) {
    const db = context.state.db;
    const id = context.state.user.id;
    const all = await db.queryEntries("SELECT * FROM jobs WHERE user_id = ?", [
      id,
    ]);

    context.response.body = all;
  }

  async getAll(context: any) {
    const db = context.state.db;
    const all = await db.queryEntries(`
        SELECT j.*, u.username FROM jobs as j
        INNER JOIN users u ON j.user_id = u.id ORDER BY j.created_at DESC
    `);

    context.response.body = all;
  }

  async getByTag(context: any) {
    const db = context.state.db;
    const tag = context.params.tag.replace(/-+/g, " ");

    const all = await db.queryEntries(
      `
        SELECT j.*, u.username FROM jobs as j
        INNER JOIN users u, positive p ON j.user_id = u.id AND j.id = p.search_id WHERE p.word = ? ORDER BY j.created_at DESC
    `,
      [tag]
    );

    context.response.body = all;
  }

  async getByUsername(context: any) {
    const db = context.state.db;
    const { username } = context.params;

    const all = await db.queryEntries(
      `
        SELECT j.*, u.username FROM jobs as j
        INNER JOIN users u ON j.user_id = u.id  WHERE u.username = ? ORDER BY j.created_at DESC
    `,
      [username.toLowerCase()]
    );

    context.response.body = all;
  }
  async getOne(context: any) {
    const db = context.state.db;
    // const id = context.state.user.id;
    const job_id = context.params.id;
    let data =
      (await db
        .queryEntries(
          "SELECT j.*, u.username FROM jobs as j INNER JOIN users u ON j.user_id = u.id WHERE j.id = ?",
          [job_id]
        )
        .pop()) || {};

    const positive = await db.queryEntries(
      "SELECT word FROM positive WHERE search_id = ?",
      [job_id]
    );

    const negative = await db.queryEntries(
      "SELECT word FROM negative WHERE search_id = ?",
      [job_id]
    );

    data.positive = positive.map((w: any) => w.word);
    data.negative = negative.map((w: any) => w.word);
    context.response.body = data;
  }

  async update(context: any) {
    const db = context.state.db;
    const id = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);
    const { positive, negative, title, type, contact, pay, description } = body;
    const data: any = {};
    const job_id = context.params.id;

    // insert name of search
    await db.query(
      "UPDATE jobs SET title = ?, type = ?, contact = ?, pay = ?, description = ?, updated_at = ? WHERE id = ?",
      [title, type, contact, pay, description, new Date().toISOString(), job_id]
    );

    // add positive keywords
    await db.query("DELETE from positive WHERE search_id = ?", [job_id]);

    for (let word of positive) {
      await db.query(
        "INSERT INTO positive (id, search_id, word) VALUES (?, ?, ?)",
        [crypto.randomUUID(), job_id, word.trim().toLowerCase()]
      );
    }

    // add negative keywords
    await db.query("DELETE from negative WHERE search_id = ?", [job_id]);

    for (let word of negative) {
      await db.query(
        "INSERT INTO negative (id, search_id, word) VALUES (?, ?, ?)",
        [crypto.randomUUID(), job_id, word.trim().toLowerCase()]
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
