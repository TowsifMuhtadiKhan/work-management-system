const fs = require("fs");
let c = fs.readFileSync("src/features/tasks/TaskSheet.tsx", "utf8");

// Wire caption onChange
c = c.split("onChange={caption => setChanges(v => ({ ...v, caption }))}").join("onChange={caption => handleChange(\"caption\", caption)}");

// Wire select/input onChange  
c = c.split("onChange={e => setChanges(v => ({ ...v, [field]: e.target.value }))}").join("onChange={e => handleChange(field, e.target.value)}");

// Wire textarea onChange (portal)
const taOld = "onChange={e => setChanges(v => ({ ...v, [field]: e.target.value.replace(/[\\r\\n]+/g, field === \"remarks\" ? \"\\n\" : \" \") }))}";
const taNew = "onChange={e => handleChange(field, e.target.value.replace(/[\\r\\n]+/g, field === \"remarks\" ? \"\\n\" : \" \"))}";
if (c.includes(taOld)) {
  c = c.split(taOld).join(taNew);
  console.log("textarea onChange replaced");
} else {
  console.log("WARNING: textarea onChange not found, searching...");
  const idx = c.indexOf("setChanges(v => ({ ...v, [field]: e.target.value.replace");
  if (idx > -1) console.log("Found at idx:", idx, JSON.stringify(c.substring(idx-10, idx+120)));
}

fs.writeFileSync("src/features/tasks/TaskSheet.tsx", c, "utf8");
console.log("done. caption:", c.includes('handleChange("caption"'), "select:", c.includes("handleChange(field, e.target.value)"));
