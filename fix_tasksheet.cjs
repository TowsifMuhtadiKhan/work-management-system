const fs = require('fs');
let c = fs.readFileSync('src/features/tasks/TaskSheet.tsx', 'utf8');

// 1. Add autoAddTriggered state + handleChange after [error, setError]
const anchor1 = "  const [error, setError] = useState('')";
const insert1 = "\n  const [autoAddTriggered, setAutoAddTriggered] = useState(false)\n  const handleChange = (field, value) => {\n    setChanges(v => ({ ...v, [field]: value }))\n    if (!task && !autoAddTriggered && onAutoAddRow) { setAutoAddTriggered(true); onAutoAddRow() }\n  }";
if (!c.includes(anchor1)) { console.error('anchor1 not found'); process.exit(1); }
c = c.split(anchor1).join(anchor1 + insert1);

// 2. In the section render: add default draft row logic
// Change: if (!slot && !rows.length && !pending.length) return null
// To also consider canCreateTask
const anchor2 = "      if (!slot && !rows.length && !pending.length) return null";
const replace2 = "      const canCreate = permissions.canCreateTask()\n      if (!slot && !rows.length && !pending.length && !canCreate) return null\n      if (!slot && !rows.length && !pending.length) return null";
if (!c.includes(anchor2)) { console.error('anchor2 not found'); process.exit(1); }
c = c.split(anchor2).join(replace2);

// 3. Update pending.map to pass onAutoAddRow to the last draft row
const anchor3 = "            {pending.map(d => <SheetRow key={d.id} slot={slot} profile={profile} workDate={workDate} mine={mine} catalogs={catalogs} editable onRemove={() => setDrafts(rows => rows.filter(row => row.id !== d.id))} />)}</tbody>";
const replace3 = "            {pending.map((d, i) => <SheetRow key={d.id} slot={slot} profile={profile} workDate={workDate} mine={mine} catalogs={catalogs} editable onRemove={() => setDrafts(rows => rows.filter(row => row.id !== d.id))} onAutoAddRow={i === pending.length - 1 && canCreate ? addDraft : undefined} />)}</tbody>";
if (!c.includes(anchor3)) { console.error('anchor3 not found'); console.log(c.substring(c.indexOf('pending.map'), c.indexOf('pending.map') + 300)); process.exit(1); }
c = c.split(anchor3).join(replace3);

// 4. Extract addDraft to variable in the slot render
const anchor4 = "      return <section key={slot}";
const replace4 = "      const addDraft = () => { setCollapsed(previous => ({ ...previous, [slot]: false })); setDrafts(d => [...d, { id: crypto.randomUUID(), slot }]) }\n      return <section key={slot}";
if (!c.includes(anchor4)) { console.error('anchor4 not found'); process.exit(1); }
// only replace first occurrence
const idx4 = c.indexOf(anchor4);
c = c.substring(0, idx4) + replace4 + c.substring(idx4 + anchor4.length);

// 5. Replace the add-row button onClick to use addDraft
const anchor5 = "onClick={() => { setCollapsed(previous => ({ ...previous, [slot]: false })); setDrafts(d => [...d, { id: crypto.randomUUID(), slot }]) }}";
if (!c.includes(anchor5)) { console.error('anchor5 not found'); process.exit(1); }
c = c.split(anchor5).join("onClick={addDraft}");

// 6. Replace the empty state with default draft row
const anchor6 = "        {rows.length || pending.length ? <div className=\"overflow-x-auto\"><table className=\"w-full text-xs\">";
const replace6_before = "        {(rows.length || pending.length || canCreate) ? <div className=\"overflow-x-auto\"><table className=\"w-full text-xs\">";
if (!c.includes(anchor6)) { console.error('anchor6 not found'); process.exit(1); }
c = c.split(anchor6).join(replace6_before);

// 7. Replace the fallback: currently shows "No tasks in this section." - add default draft row instead
const anchor7 = "        </table></div> : <p className=\"px-4 py-3 text-xs text-muted-foreground\">No tasks in this section.</p>}";
const replace7 = "        </table></div> : <p className=\"px-4 py-3 text-xs text-muted-foreground\">No tasks in this section.</p>}";
// Actually the fallback needs to show a draft row OR an empty message
// The tbody needs a default row when no rows/pending but canCreate
// Let's inject a default SheetRow AFTER the pending rows inside tbody
const anchor7b = "{pending.map((d, i) => <SheetRow key={d.id}";
const insertAfterPending = "\n            {!rows.length && !pending.length && canCreate && <SheetRow key=\"default-draft\" slot={slot} profile={profile} workDate={workDate} mine={mine} catalogs={catalogs} editable onRemove={() => {}} onAutoAddRow={addDraft} />}";
if (!c.includes(anchor7b)) { console.error('anchor7b not found'); process.exit(1); }
// Insert after the pending.map closing
const afterPendingIdx = c.indexOf(anchor7b);
const afterPendingCloseIdx = c.indexOf('/>)}</tbody>', afterPendingIdx);
if (afterPendingCloseIdx === -1) { console.error('pending close not found'); process.exit(1); }
const closeStr = '/>)}</tbody>';
c = c.substring(0, afterPendingCloseIdx + closeStr.length) + insertAfterPending + c.substring(afterPendingCloseIdx + closeStr.length);

fs.writeFileSync('src/features/tasks/TaskSheet.tsx', c, 'utf8');
console.log('All changes applied successfully');

// Part 2 - wire onChange to handleChange
const fs2 = require('fs');
let c2 = fs2.readFileSync('src/features/tasks/TaskSheet.tsx', 'utf8');
c2 = c2.split('onChange={caption => setChanges(v => ({ ...v, caption }))}').join("onChange={caption => handleChange('caption', caption)}");
c2 = c2.split('onChange={e => setChanges(v => ({ ...v, [field]: e.target.value }))}').join('onChange={e => handleChange(field, e.target.value)}');
c2 = c2.split("onChange={e => setChanges(v => ({ ...v, [field]: e.target.value.replace(/[\\r\\n]+/g, field === 'remarks' ? '\\n' : ' ') }))}").join("onChange={e => handleChange(field, e.target.value.replace(/[\\r\\n]+/g, field === 'remarks' ? '\\n' : ' '))}");
fs2.writeFileSync('src/features/tasks/TaskSheet.tsx', c2, 'utf8');
console.log('Part 2 done. caption:', c2.includes("handleChange('caption'"), 'select:', c2.includes('handleChange(field, e.target.value)'));
