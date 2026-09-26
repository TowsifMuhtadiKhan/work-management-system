const fs = require("fs");
let c = fs.readFileSync("src/features/tasks/TaskSheet.tsx", "utf8");

// Fix textarea onChange (uses single quotes)
const taOld = "onChange={e => setChanges(v => ({ ...v, [field]: e.target.value.replace(/[\\r\\n]+/g, field === 'remarks' ? '\\n' : ' ') }))}";
const taNew  = "onChange={e => handleChange(field, e.target.value.replace(/[\\r\\n]+/g, field === 'remarks' ? '\\n' : ' '))}";
if (c.includes(taOld)) {
  c = c.split(taOld).join(taNew);
  console.log("textarea replaced");
} else {
  console.log("not found - dumping surrounding text:");
  const idx = c.indexOf("setChanges(v => ({ ...v, [field]: e.target.value.replace");
  if (idx > -1) console.log(JSON.stringify(c.substring(idx-20, idx+200)));
}

fs.writeFileSync("src/features/tasks/TaskSheet.tsx", c, "utf8");
console.log("remaining setChanges count:", (c.match(/setChanges/g) || []).length);
