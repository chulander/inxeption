import * as dotenv from "dotenv-safe";
import sqlite3 from "sqlite3";
import { Employee, Activity, Params } from "./types";
sqlite3.verbose();
dotenv.config();

if (!process.env.DB_NAME) {
  console.error("missing DB_NAME");
  process.exit(1);
}
const DB: string = process.env.DB_NAME;

class Database {
  private db: sqlite3.Database;
  constructor(dbFilePath: string) {
    this.db = new sqlite3.Database(dbFilePath, async (err) => {
      if (err) {
        console.error("Could not connect to database", err);
      } else {
        console.info("Connected to database");
        // VERY IMPORTANT
        this.enforceForeignKey();
        this.createTables();
      }
    });
  }
  private enforceForeignKey() {
    return this.run("PRAGMA foreign_keys=on");
  }
  private async createEmployeeTable() {
    return this.run(
      "CREATE TABLE IF NOT EXISTS mordor_worker ( id INTEGER PRIMARY KEY AUTOINCREMENT, NAME TEXT NOT NULL, EMAIL TEXT, ADDRESS TEXT  );"
    );
  }
  private async createActivityTable() {
    return this.run(
      "CREATE TABLE IF NOT EXISTS worker_activity (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id integer, activity_name text, start_time text, end_time text, CONSTRAINT fk_emp_id FOREIGN KEY(employee_id) REFERENCES mordor_worker(id) );"
    );
  }
  private all(sql: string, params: Params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error("Error running sql: " + sql);
          console.error(err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  private run(sql: string, params: Params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          console.error("Error running sql " + sql);
          console.error(err);
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  }
  async createTables() {
    // console.info("Creating Table: mordor_worker");
    await this.createEmployeeTable();
    // console.info("Creating Table: worker_activity");
    await this.createActivityTable();
  }
  async dropTables() {
    await this.run("DROP TABLE IF EXISTS worker_activity");
    await this.run("DROP TABLE IF EXISTS mordor_worker");
  }
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve("db closed");
        }
      });
    });
  }
  activityGetById(id: Activity["id"]) {
    return this.all("SELECT * FROM worker_activity WHERE id = ?", [id]);
  }
  activityOpenedByEmployeeId(employee_id: Employee["id"]) {
    return this.all(
      "SELECT worker_activity.* FROM worker_activity INNER JOIN mordor_worker ON worker_activity.employee_id = mordor_worker.id AND worker_activity.end_time IS NULL WHERE mordor_worker.id=?",
      [employee_id]
    );
  }
  activityGetByEmployeeId(employee_id: number) {
    return this.all("select * from worker_activity where employee_id = ? ORDER BY worker_activity.start_time", [
      employee_id,
    ]);
  }
  activityList() {
    return this.all(
      "SELECT * FROM worker_activity GROUP BY activity_name ORDER BY activity_name"
    );
  }
  async activityStart(
    employee_id: Activity["employee_id"],
    activity_name: Activity["activity_name"],
    start_time: Activity["start_time"] = new Date().toISOString()
  ) {
    return this.run(
      "INSERT INTO worker_activity(employee_id, activity_name, start_time) values(?,?,?)",
      [employee_id, activity_name, start_time]
    );
  }
  activityStop(
    employee_id: Employee["id"],
    end_time: Activity["end_time"] = new Date().toISOString()
  ) {
    return this.run(
      "UPDATE worker_activity set end_time=? where employee_id = ? AND end_time IS NULL",
      [end_time, employee_id]
    );
  }
  async employeeCreate(
    name: Employee["name"],
    email: Employee["email"] = null,
    address: Employee["address"] = null
  ) {
    return this.run(
      "INSERT INTO mordor_worker(name, email, address) values (?, ?, ?)",
      [name, email, address]
    );
  }
  employeeGetById(id: Employee["id"]) {
    return this.all("SELECT * FROM mordor_worker WHERE id = ?", [id]);
  }
  employeeGetByName(name: Employee["name"]) {
    return this.all("SELECT * FROM mordor_worker WHERE name = ?", [name]);
  }
  employeeList(name?: Employee["name"]) {
    return !name
      ? this.all("select * from mordor_worker")
      : this.employeeGetByName(name);
  }
}

const db = new Database(DB);
export default db;
