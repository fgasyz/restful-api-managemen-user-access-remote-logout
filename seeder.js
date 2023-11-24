import connection from "./connection.js";
import fs from "fs";

connection();

//get argument
const args = process.argv;

//folder
const folder = "./seeder";

//limit data
let limit = 10; //default
if (args[3]) {
  limit = parseInt(args[3]);
}

const seederFile = args[2]; //file name
if (!seederFile) {
  //if there's no a seeder file then seed all file in seeder folder
  let i = 0;
  fs.readdirSync(folder).forEach(async (file, idx, array) => {
    const seeder = await import(`./seeder/${file}`);
    await seeder.run(limit); //seed()

    if (idx == parseInt(array.length) - 1) {
      process.exit();
    }
  });
} else {
  //specific seeder
  const seeder = await import(`./seeder/${seederFile}.js`);
  const run = await seeder.run(limit); //seed()

  if (run) {
    process.exit();
  }
}
