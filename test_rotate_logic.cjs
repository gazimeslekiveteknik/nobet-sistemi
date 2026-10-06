const roles = [
  { id: 'R0', priority: 1, name: 'Bahçe' },
  { id: 'R1', priority: 2, name: '1. Kat' },
  { id: 'R2', priority: 3, name: '2. Kat' }
];

const N = roles.length;

function getRotatedTeacher(targetRoleIndex, weekOffset) {
   let offset = weekOffset % N;
   if (offset < 0) offset += N;
   
   let sourceIndex = (targetRoleIndex - offset) % N;
   if (sourceIndex < 0) sourceIndex += N;
   
   return \`Teacher from \${roles[sourceIndex].name}\`;
}

console.log("Week 0:");
console.log("Who gets Bahçe (R0)?", getRotatedTeacher(0, 0)); // Should be Bahçe
console.log("Who gets 1. Kat (R1)?", getRotatedTeacher(1, 0)); // Should be 1. Kat

console.log("\nWeek 1:");
console.log("Who gets Bahçe (R0)?", getRotatedTeacher(0, 1)); // Should be Teacher from 2. Kat
console.log("Who gets 1. Kat (R1)?", getRotatedTeacher(1, 1)); // Should be Teacher from Bahçe
console.log("Who gets 2. Kat (R2)?", getRotatedTeacher(2, 1)); // Should be Teacher from 1. Kat

