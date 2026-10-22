const fs = require("fs");
const { randomUUID } = require("crypto");

class DB {
  constructor(file) {
    this.file = file;
    try {
      const data = JSON.parse(fs.readFileSync(this.file, "utf8"));
      if (!data || typeof data.entries !== "object" || !data.entries || Array.isArray(data.entries)) {
        throw new SyntaxError("Invalid cache format");
      }
      this.db = data;
    } catch (error) {
      if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
      this.db = {
        version: 0,
        entries: {},
      };
      this.save();
    }
  }

  save() {
    const temp = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temp, JSON.stringify(this.db, null, 2), { mode: 0o600 });
      fs.renameSync(temp, this.file);
    } catch (error) {
      fs.rmSync(temp, { force: true });
      throw error;
    }
  }

  get(key) {
    const entry = this.db.entries[key];
    if (!entry) return null;
    if (new Date().getTime() > entry.expiry) return null;
    return entry.value;
  }

  set(key, value, expiry = 60 * 1000) {
    const entry = {
      value,
      expiry: new Date().getTime() + expiry,
    };
    this.db.entries[key] = entry;
    this.save();
  }
}

module.exports = DB;
